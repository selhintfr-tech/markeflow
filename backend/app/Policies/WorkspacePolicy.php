<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Security\WorkspacePermission;
use App\Services\WorkspaceAuthorizationService;

class WorkspacePolicy
{
    public function __construct(
        protected WorkspaceAuthorizationService $authorizationService
    ) {}

    public function view(User $user, Workspace $workspace): bool
    {
        return $this->authorizationService->can($user, $workspace, WorkspacePermission::WORKSPACE_VIEW);
    }

    public function update(User $user, Workspace $workspace): bool
    {
        return $this->authorizationService->can($user, $workspace, WorkspacePermission::WORKSPACE_UPDATE);
    }

    public function delete(User $user, Workspace $workspace): bool
    {
        return $this->authorizationService->can($user, $workspace, WorkspacePermission::WORKSPACE_DELETE);
    }

    public function transfer(User $user, Workspace $workspace): bool
    {
        return $this->authorizationService->can($user, $workspace, WorkspacePermission::WORKSPACE_TRANSFER);
    }

    public function manageSettings(User $user, Workspace $workspace): bool
    {
        return $this->authorizationService->can($user, $workspace, WorkspacePermission::SETTINGS_UPDATE);
    }

    public function viewMembers(User $user, Workspace $workspace): bool
    {
        return $this->authorizationService->can($user, $workspace, WorkspacePermission::MEMBERS_VIEW);
    }

    public function inviteMembers(User $user, Workspace $workspace): bool
    {
        return $this->authorizationService->can($user, $workspace, WorkspacePermission::MEMBERS_INVITE);
    }

    public function updateMemberRole(User $user, Workspace $workspace, WorkspaceUser $targetMember): bool
    {
        if (! $this->authorizationService->can($user, $workspace, WorkspacePermission::MEMBERS_UPDATE_ROLE)) {
            return false;
        }

        return $this->authorizationService->canManageRole($user, $workspace, $targetMember->role, $targetMember);
    }

    public function removeMember(User $user, Workspace $workspace, WorkspaceUser $targetMember): bool
    {
        return $this->authorizationService->canRemoveMember($user, $workspace, $targetMember);
    }

    public function viewAuditLogs(User $user, Workspace $workspace): bool
    {
        return $this->authorizationService->can($user, $workspace, WorkspacePermission::AUDIT_VIEW);
    }
}
