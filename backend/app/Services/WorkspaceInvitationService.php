<?php

namespace App\Services;

use App\Exceptions\InvalidInvitationException;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceAuditLog;
use App\Models\WorkspaceInvitation;
use App\Models\WorkspaceUser;
use App\Security\WorkspacePermission;
use Illuminate\Support\Facades\DB;

class WorkspaceInvitationService
{
    public function __construct(
        protected WorkspaceAuthorizationService $authorizationService,
        protected TenantContext $tenantContext
    ) {}

    /**
     * Create and issue a secure workspace invitation within an atomic transaction and tenant context.
     *
     * @return array{invitation: WorkspaceInvitation, plain_token: string}
     */
    public function invite(User $inviter, Workspace $workspace, string $email, string $role = WorkspaceUser::ROLE_MEMBER): array
    {
        return DB::transaction(function () use ($inviter, $workspace, $email, $role) {
            // 1. Authorize caller
            $this->authorizationService->authorize($inviter, $workspace, WorkspacePermission::MEMBERS_INVITE);

            // 2. Validate role assignment capability
            if (! $this->authorizationService->canManageRole($inviter, $workspace, $role)) {
                throw new InvalidInvitationException("You are not authorized to invite members with the role [{$role}].");
            }

            // 3. Normalize email
            $cleanEmail = strtolower(trim($email));
            if (! filter_var($cleanEmail, FILTER_VALIDATE_EMAIL)) {
                throw new InvalidInvitationException("Invalid email address [{$email}].");
            }

            // 4. Prevent duplicate invitation if user is already an active member
            $existingUser = User::query()->where('email', $cleanEmail)->first();
            if ($existingUser) {
                $alreadyMember = WorkspaceUser::query()
                    ->where('workspace_id', $workspace->id)
                    ->where('user_id', $existingUser->id)
                    ->exists();

                if ($alreadyMember) {
                    throw new InvalidInvitationException("User [{$cleanEmail}] is already an active member of this workspace.");
                }
            }

            // 5. Generate cryptographically secure token (256-bit entropy)
            $plainToken = bin2hex(random_bytes(32)); // 64 hex characters
            $tokenHash = hash('sha256', $plainToken);

            // Run creation within the target workspace's tenant context
            return $this->tenantContext->runInContext($workspace, function () use ($workspace, $cleanEmail, $role, $tokenHash, $inviter, $plainToken) {
                // 6. Invalidate any previous unaccepted invitations for this email in this workspace
                WorkspaceInvitation::query()
                    ->where('workspace_id', $workspace->id)
                    ->where('email', $cleanEmail)
                    ->whereNull('accepted_at')
                    ->delete();

                // 7. Persist invitation with token hash (plain token is never stored)
                /** @var WorkspaceInvitation $invitation */
                $invitation = WorkspaceInvitation::create([
                    'workspace_id' => $workspace->id,
                    'email' => $cleanEmail,
                    'role' => $role,
                    'token_hash' => $tokenHash,
                    'invited_by' => $inviter->id,
                    'accepted_at' => null,
                    'expires_at' => now()->addDays(7),
                ]);

                // 8. Record audit log (payload sanitized of token hashes)
                WorkspaceAuditLog::log(
                    $workspace,
                    'invitation.created',
                    'WorkspaceInvitation',
                    $invitation->id,
                    ['email' => $cleanEmail, 'role' => $role, 'invited_by' => $inviter->id],
                    $inviter->id
                );

                return [
                    'invitation' => $invitation,
                    'plain_token' => $plainToken,
                ];
            });
        });
    }

    /**
     * Accept a workspace invitation with atomic row-level locking to prevent concurrent replay.
     */
    public function accept(string $plainToken, User $user): WorkspaceUser
    {
        return DB::transaction(function () use ($plainToken, $user) {
            $tokenHash = hash('sha256', $plainToken);

            // An invitee accepting a link does not have an active workspace context yet.
            // Bypassing tenant scope is required to verify the token hash across workspaces.
            /** @var WorkspaceInvitation|null $invitation */
            $invitation = $this->tenantContext->runWithoutTenantScope(function () use ($tokenHash) {
                return WorkspaceInvitation::query()
                    ->where('token_hash', $tokenHash)
                    ->lockForUpdate()
                    ->first();
            });

            if (! $invitation) {
                throw new InvalidInvitationException('Invalid or unknown invitation token.');
            }

            if ($invitation->accepted_at !== null) {
                throw new InvalidInvitationException('This invitation has already been accepted.');
            }

            if ($invitation->expires_at->isPast()) {
                throw new InvalidInvitationException('This invitation has expired.');
            }

            // Validate intended invitee identity: accepting user email must match invitation email
            if (strtolower(trim($user->email)) !== strtolower(trim($invitation->email))) {
                throw new InvalidInvitationException(
                    "This invitation was sent to [{$invitation->email}], but you are authenticated as [{$user->email}]."
                );
            }

            $workspace = Workspace::query()->find($invitation->workspace_id);
            if (! $workspace || $workspace->status !== 'Active') {
                throw new InvalidInvitationException('The workspace associated with this invitation is inactive or suspended.');
            }

            // Execute the membership creation and audit logging within the workspace's context
            return $this->tenantContext->runInContext($workspace, function () use ($workspace, $user, $invitation) {
                // Safe existing membership handling: if already a member, mark accepted and return existing
                $existingMembership = WorkspaceUser::query()
                    ->where('workspace_id', $workspace->id)
                    ->where('user_id', $user->id)
                    ->first();

                if ($existingMembership) {
                    $invitation->update(['accepted_at' => now()]);

                    return $existingMembership;
                }

                // Create workspace membership
                /** @var WorkspaceUser $membership */
                $membership = WorkspaceUser::create([
                    'workspace_id' => $workspace->id,
                    'user_id' => $user->id,
                    'role' => $invitation->role,
                    'joined_at' => now(),
                ]);

                // Mark invitation as accepted (single-use enforcement)
                $invitation->update(['accepted_at' => now()]);

                // Record audit log
                WorkspaceAuditLog::log(
                    $workspace,
                    'invitation.accepted',
                    'WorkspaceInvitation',
                    $invitation->id,
                    ['user_id' => $user->id, 'email' => $user->email, 'role' => $invitation->role],
                    $user->id
                );

                return $membership;
            });
        });
    }

    /**
     * Cancel an active pending invitation within an atomic transaction.
     */
    public function cancel(User $actor, WorkspaceInvitation $invitation): void
    {
        DB::transaction(function () use ($actor, $invitation) {
            $workspace = $invitation->workspace;

            $this->authorizationService->authorize($actor, $workspace, WorkspacePermission::MEMBERS_INVITE);

            $this->tenantContext->runInContext($workspace, function () use ($workspace, $invitation, $actor) {
                $invitationId = $invitation->id;
                $email = $invitation->email;

                $invitation->delete();

                WorkspaceAuditLog::log(
                    $workspace,
                    'invitation.cancelled',
                    'WorkspaceInvitation',
                    $invitationId,
                    ['cancelled_by' => $actor->id, 'email' => $email],
                    $actor->id
                );
            });
        });
    }
}
