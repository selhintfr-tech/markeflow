<?php

namespace App\Services;

use App\Exceptions\UnauthorizedWorkspaceActionException;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceAuditLog;
use App\Models\WorkspaceUser;
use App\Security\WorkspacePermission;
use Illuminate\Support\Facades\DB;

class WorkspaceMemberService
{
    public function __construct(
        protected WorkspaceAuthorizationService $authorizationService,
        protected TenantContext $tenantContext
    ) {}

    /**
     * Update a workspace member's role within an atomic transaction and tenant context.
     */
    public function updateRole(User $actor, Workspace $workspace, WorkspaceUser $targetMember, string $newRole): WorkspaceUser
    {
        return DB::transaction(function () use ($actor, $workspace, $targetMember, $newRole) {
            // 1. Authorize caller
            $this->authorizationService->authorize($actor, $workspace, WorkspacePermission::MEMBERS_UPDATE_ROLE);

            // 2. Validate role management permissions and last owner guard (with row lock)
            if (! $this->authorizationService->canManageRole($actor, $workspace, $newRole, $targetMember)) {
                throw new UnauthorizedWorkspaceActionException("You are not authorized to update member [{$targetMember->id}] to role [{$newRole}].");
            }

            $oldRole = $targetMember->role;
            $targetMember->role = $newRole;
            $targetMember->save();

            // 3. Record audit log within tenant context
            $this->tenantContext->runInContext($workspace, function () use ($workspace, $targetMember, $oldRole, $newRole, $actor) {
                WorkspaceAuditLog::log(
                    $workspace,
                    'member.role_updated',
                    'WorkspaceUser',
                    $targetMember->id,
                    ['user_id' => $targetMember->user_id, 'old_role' => $oldRole, 'new_role' => $newRole, 'updated_by' => $actor->id],
                    $actor->id
                );
            });

            return $targetMember;
        });
    }

    /**
     * Remove a member from the workspace within an atomic transaction and tenant context.
     */
    public function removeMember(User $actor, Workspace $workspace, WorkspaceUser $targetMember): void
    {
        DB::transaction(function () use ($actor, $workspace, $targetMember) {
            // 1. Validate removal authorization and last owner guard (with row lock)
            if (! $this->authorizationService->canRemoveMember($actor, $workspace, $targetMember)) {
                throw new UnauthorizedWorkspaceActionException("You are not authorized to remove member [{$targetMember->id}] from workspace [{$workspace->id}].");
            }

            $removedUserId = $targetMember->user_id;
            $targetMemberId = $targetMember->id;

            $targetMember->delete();

            // 2. Record audit log within tenant context
            $this->tenantContext->runInContext($workspace, function () use ($workspace, $targetMemberId, $removedUserId, $actor) {
                WorkspaceAuditLog::log(
                    $workspace,
                    'member.removed',
                    'WorkspaceUser',
                    $targetMemberId,
                    ['removed_user_id' => $removedUserId, 'removed_by' => $actor->id],
                    $actor->id
                );
            });
        });
    }
}
