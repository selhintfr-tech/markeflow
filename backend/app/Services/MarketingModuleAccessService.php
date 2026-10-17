<?php

namespace App\Services;

use App\Models\User;
use App\Models\WorkspaceUser;
use Illuminate\Support\Facades\Gate;

class MarketingModuleAccessService
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly WorkspaceAuthorizationService $authorizationService,
    ) {}

    public function authorize(?User $user, bool $write = false): void
    {
        $workspace = $this->tenantContext->getWorkspace();
        $contextMembership = $this->tenantContext->getMembership();

        abort_unless($user, 401, 'Authentication is required.');
        abort_unless($workspace && $workspace->status === 'Active', 403, 'A valid active workspace is required.');
        abort_unless(
            $contextMembership
                && $contextMembership->workspace_id === $workspace->id
                && $contextMembership->user_id === $user->id,
            403,
            'Verified workspace membership is required.'
        );

        $membership = $this->authorizationService->getMembership($user, $workspace);
        abort_unless($membership, 403, 'Verified workspace membership is required.');
        abort_unless(
            in_array($membership->role, [
                WorkspaceUser::ROLE_OWNER,
                WorkspaceUser::ROLE_ADMIN,
                WorkspaceUser::ROLE_MEMBER,
                WorkspaceUser::ROLE_VIEWER,
            ], true),
            403,
            'Your workspace role cannot access this module.'
        );

        if ($write) {
            abort_unless(
                in_array($membership->role, [
                    WorkspaceUser::ROLE_OWNER,
                    WorkspaceUser::ROLE_ADMIN,
                    WorkspaceUser::ROLE_MEMBER,
                ], true),
                403,
                'Viewers cannot modify this module.'
            );

            if (in_array($membership->role, [WorkspaceUser::ROLE_OWNER, WorkspaceUser::ROLE_ADMIN], true)) {
                Gate::authorize('update', $workspace);
            }

            return;
        }

        Gate::authorize('view', $workspace);
    }
}
