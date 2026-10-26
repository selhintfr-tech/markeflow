<?php

namespace App\Services;

use App\Exceptions\CannotRemoveLastOwnerException;
use App\Exceptions\UnauthorizedWorkspaceActionException;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Security\WorkspacePermission;

class WorkspaceAuthorizationService
{
    /**
     * Check if a user has a specific permission in a workspace.
     */
    public function can(User $user, Workspace $workspace, string $permission): bool
    {
        $membership = $this->getMembership($user, $workspace);

        if (! $membership) {
            return false;
        }

        // Owners possess all permissions
        if ($membership->isOwner()) {
            return true;
        }

        // Check default role permissions
        $rolePermissions = WorkspacePermission::permissionsForRole($membership->role);
        if (in_array($permission, $rolePermissions, true)) {
            return true;
        }

        // Check custom permissions assigned on the pivot
        $custom = $membership->custom_permissions ?? [];

        return in_array($permission, $custom, true);
    }

    /**
     * Assert that a user has a permission, throwing an exception if unauthorized.
     */
    public function authorize(User $user, Workspace $workspace, string $permission): void
    {
        if (! $this->can($user, $workspace, $permission)) {
            throw new UnauthorizedWorkspaceActionException(
                "User [{$user->id}] does not possess the [{$permission}] permission in workspace [{$workspace->id}]."
            );
        }
    }

    /**
     * Check if actor can assign, promote, or demote a specific role.
     */
    public function canManageRole(User $actor, Workspace $workspace, string $targetRole, ?WorkspaceUser $targetMember = null): bool
    {
        $actorMembership = $this->getMembership($actor, $workspace);
        if (! $actorMembership) {
            return false;
        }

        $actorWeight = WorkspacePermission::roleWeight($actorMembership->role);
        $targetRoleWeight = WorkspacePermission::roleWeight($targetRole);

        // Non-owners can never assign the owner role
        if ($targetRole === WorkspaceUser::ROLE_OWNER && ! $actorMembership->isOwner()) {
            return false;
        }

        // Actor cannot assign a role higher or equal to their own unless they are owner
        if (! $actorMembership->isOwner() && $targetRoleWeight >= $actorWeight) {
            return false;
        }

        // If managing an existing member, actor must have strictly higher role than the member
        if ($targetMember) {
            $memberWeight = WorkspacePermission::roleWeight($targetMember->role);
            if (! $actorMembership->isOwner() && $memberWeight >= $actorWeight) {
                return false;
            }

            // Guard against demoting the last owner
            if ($targetMember->role === WorkspaceUser::ROLE_OWNER && $targetRole !== WorkspaceUser::ROLE_OWNER) {
                $this->guardNotLastOwner($workspace, $targetMember);
            }
        }

        return true;
    }

    /**
     * Check if actor is authorized to remove a member from the workspace.
     */
    public function canRemoveMember(User $actor, Workspace $workspace, WorkspaceUser $targetMember): bool
    {
        // Users can always remove themselves (leave workspace) unless they are the last owner
        if ($actor->id === $targetMember->user_id) {
            if ($targetMember->role === WorkspaceUser::ROLE_OWNER) {
                $this->guardNotLastOwner($workspace, $targetMember);
            }

            return true;
        }

        $actorMembership = $this->getMembership($actor, $workspace);
        if (! $actorMembership) {
            return false;
        }

        // Must have members.remove permission
        if (! $this->can($actor, $workspace, WorkspacePermission::MEMBERS_REMOVE)) {
            return false;
        }

        // Cannot remove someone with equal or higher role unless actor is owner
        $actorWeight = WorkspacePermission::roleWeight($actorMembership->role);
        $targetWeight = WorkspacePermission::roleWeight($targetMember->role);

        if (! $actorMembership->isOwner() && $targetWeight >= $actorWeight) {
            return false;
        }

        // Guard against removing the last owner
        if ($targetMember->role === WorkspaceUser::ROLE_OWNER) {
            $this->guardNotLastOwner($workspace, $targetMember);
        }

        return true;
    }

    /**
     * Enforce that a workspace retains at least one owner.
     */
    public function guardNotLastOwner(Workspace $workspace, WorkspaceUser $targetMember): void
    {
        if ($targetMember->role !== WorkspaceUser::ROLE_OWNER) {
            return;
        }

        $ownerCount = WorkspaceUser::query()
            ->where('workspace_id', $workspace->id)
            ->where('role', WorkspaceUser::ROLE_OWNER)
            ->lockForUpdate()
            ->count();

        if ($ownerCount <= 1) {
            throw new CannotRemoveLastOwnerException(
                "Cannot remove or demote the last owner of workspace [{$workspace->id}]. Promote another member to owner first."
            );
        }
    }

    /**
     * In-memory cache for user memberships in workspaces within the request lifecycle.
     *
     * @var array<string, ?WorkspaceUser>
     */
    private array $memberships = [];

    /**
     * Retrieve the user's membership in a workspace.
     */
    public function getMembership(User $user, Workspace $workspace): ?WorkspaceUser
    {
        $key = "{$user->id}:{$workspace->id}";
        if (array_key_exists($key, $this->memberships)) {
            return $this->memberships[$key];
        }

        if (app()->bound(TenantContext::class)) {
            $contextMembership = app(TenantContext::class)->getMembership();
            if (
                $contextMembership
                && $contextMembership->user_id === $user->id
                && $contextMembership->workspace_id === $workspace->id
            ) {
                return $this->memberships[$key] = $contextMembership;
            }
        }

        return $this->memberships[$key] = WorkspaceUser::query()
            ->where('workspace_id', $workspace->id)
            ->where('user_id', $user->id)
            ->first();
    }

    /**
     * Clear the memoized membership cache.
     */
    public function clearCache(): void
    {
        $this->memberships = [];
    }
}
