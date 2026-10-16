<?php

namespace App\Security;

use App\Models\WorkspaceUser;

class WorkspacePermission
{
    // Workspace lifecycle permissions
    public const WORKSPACE_VIEW = 'workspace.view';

    public const WORKSPACE_UPDATE = 'workspace.update';

    public const WORKSPACE_DELETE = 'workspace.delete';

    public const WORKSPACE_TRANSFER = 'workspace.transfer';

    // Settings permissions
    public const SETTINGS_VIEW = 'settings.view';

    public const SETTINGS_UPDATE = 'settings.update';

    // Member management permissions
    public const MEMBERS_VIEW = 'members.view';

    public const MEMBERS_INVITE = 'members.invite';

    public const MEMBERS_UPDATE_ROLE = 'members.update_role';

    public const MEMBERS_REMOVE = 'members.remove';

    // Audit log permissions
    public const AUDIT_VIEW = 'audit.view';

    /**
     * Check if a role possesses a specific permission by default.
     */
    public static function hasPermission(string $role, string $permission): bool
    {
        return in_array($permission, self::permissionsForRole($role), true);
    }

    /**
     * Return all permissions granted by default to a role.
     *
     * @return list<string>
     */
    public static function permissionsForRole(string $role): array
    {
        return match ($role) {
            WorkspaceUser::ROLE_OWNER => [
                self::WORKSPACE_VIEW,
                self::WORKSPACE_UPDATE,
                self::WORKSPACE_DELETE,
                self::WORKSPACE_TRANSFER,
                self::SETTINGS_VIEW,
                self::SETTINGS_UPDATE,
                self::MEMBERS_VIEW,
                self::MEMBERS_INVITE,
                self::MEMBERS_UPDATE_ROLE,
                self::MEMBERS_REMOVE,
                self::AUDIT_VIEW,
            ],
            WorkspaceUser::ROLE_ADMIN => [
                self::WORKSPACE_VIEW,
                self::WORKSPACE_UPDATE,
                self::SETTINGS_VIEW,
                self::SETTINGS_UPDATE,
                self::MEMBERS_VIEW,
                self::MEMBERS_INVITE,
                self::MEMBERS_UPDATE_ROLE,
                self::MEMBERS_REMOVE,
                self::AUDIT_VIEW,
            ],
            WorkspaceUser::ROLE_MEMBER => [
                self::WORKSPACE_VIEW,
                self::MEMBERS_VIEW,
            ],
            WorkspaceUser::ROLE_VIEWER => [
                self::WORKSPACE_VIEW,
                self::MEMBERS_VIEW,
            ],
            default => [],
        };
    }

    /**
     * Hierarchy weight for role comparison (higher weight = greater authority).
     */
    public static function roleWeight(string $role): int
    {
        return match ($role) {
            WorkspaceUser::ROLE_OWNER => 100,
            WorkspaceUser::ROLE_ADMIN => 50,
            WorkspaceUser::ROLE_MEMBER => 20,
            WorkspaceUser::ROLE_VIEWER => 10,
            default => 0,
        };
    }
}
