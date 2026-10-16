<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\UpdateWorkspaceSettingsRequest;
use App\Http\Resources\Api\WorkspaceSettingsResource;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceAuditLog;
use App\Models\WorkspaceSetting;
use App\Services\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WorkspaceSettingsController extends Controller
{
    public function show(Request $request, Workspace $workspace): WorkspaceSettingsResource
    {
        /** @var User $user */
        $user = $request->user();
        abort_unless($user && $user->can('view', $workspace), 403, 'You are not authorized to view this workspace.');

        $setting = app(TenantContext::class)->runInContext($workspace, function () use ($workspace) {
            return $workspace->settings()->first()
                ?? new WorkspaceSetting([
                    'workspace_id' => $workspace->id,
                    'settings' => [],
                ]);
        });

        return new WorkspaceSettingsResource($setting);
    }

    public function update(UpdateWorkspaceSettingsRequest $request, Workspace $workspace): WorkspaceSettingsResource
    {
        /** @var User $user */
        $user = $request->user();
        $changes = $request->validated('settings');

        $setting = DB::transaction(function () use ($workspace, $user, $changes) {
            return app(TenantContext::class)->runInContext($workspace, function () use ($workspace, $user, $changes) {
                $setting = $workspace->settings()->first()
                    ?? new WorkspaceSetting(['workspace_id' => $workspace->id, 'settings' => []]);
                $setting->settings = array_replace_recursive($setting->settings ?? [], $changes);
                $setting->save();

                WorkspaceAuditLog::log(
                    $workspace,
                    'workspace.settings_updated',
                    'WorkspaceSetting',
                    $setting->id,
                    ['sections' => array_keys($changes)],
                    $user->id
                );

                return $setting->fresh();
            });
        });

        return new WorkspaceSettingsResource($setting);
    }
}
