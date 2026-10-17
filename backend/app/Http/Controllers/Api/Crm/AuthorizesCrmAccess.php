<?php

namespace App\Http\Controllers\Api\Crm;

use App\Models\User;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;
use App\Services\WorkspaceAuthorizationService;
use Illuminate\Support\Facades\Gate;

trait AuthorizesCrmAccess
{
    protected function authorizeCrmAccess(?User $user, bool $write = false): void
    {
        /** @var TenantContext $tenantContext */
        $tenantContext = app(TenantContext::class);
        $workspace = $tenantContext->getWorkspace();
        $membership = $tenantContext->getMembership();

        abort_unless($user, 401, 'Authentication is required.');
        abort_unless($workspace && $workspace->status === 'Active', 403, 'A valid active workspace is required.');
        abort_unless(
            $membership
                && $membership->workspace_id === $workspace->id
                && $membership->user_id === $user->id,
            403,
            'Verified workspace membership is required.'
        );

        $allowedReadRoles = [
            WorkspaceUser::ROLE_OWNER,
            WorkspaceUser::ROLE_ADMIN,
            WorkspaceUser::ROLE_MEMBER,
            WorkspaceUser::ROLE_VIEWER,
        ];

        abort_unless(
            in_array($membership->role, $allowedReadRoles, true),
            403,
            'Your workspace role cannot access CRM records.'
        );

        if ($write) {
            abort_if(
                $membership->role === WorkspaceUser::ROLE_VIEWER,
                403,
                'Viewers cannot modify CRM records.'
            );

            if (in_array($membership->role, [WorkspaceUser::ROLE_OWNER, WorkspaceUser::ROLE_ADMIN], true)) {
                Gate::authorize('update', $workspace);
            }
        } else {
            Gate::authorize('view', $workspace);
        }
    }
}