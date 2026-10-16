<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Campaigns\StoreCampaignRequest;
use App\Http\Requests\Campaigns\UpdateCampaignRequest;
use App\Http\Resources\Api\CampaignResource;
use App\Models\Campaign;
use App\Models\User;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;
use App\Services\WorkspaceAuthorizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class CampaignController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly WorkspaceAuthorizationService $authorizationService,
    ) {}

    public function index(Request $request)
    {
        $this->authorizeCampaignAccess($request->user());

        $workspaceId = $this->tenantContext->getWorkspaceId();
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'project_id' => ['sometimes', 'required', 'uuid', Rule::exists('projects', 'id')->where('workspace_id', $workspaceId)],
            'status' => ['sometimes', 'string', Rule::in(Campaign::STATUSES)],
            'platform' => ['sometimes', 'string', Rule::in(Campaign::PLATFORMS)],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $campaigns = Campaign::query()
            ->where('workspace_id', $workspaceId)
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('name', 'like', '%'.$search.'%')
                        ->orWhere('description', 'like', '%'.$search.'%')
                        ->orWhere('objective', 'like', '%'.$search.'%');
                });
            })
            ->when($filters['project_id'] ?? null, fn ($query, string $projectId) => $query->where('project_id', $projectId))
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['platform'] ?? null, fn ($query, string $platform) => $query->where('platform', $platform))
            ->orderByDesc('created_at')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return CampaignResource::collection($campaigns);
    }

    public function store(StoreCampaignRequest $request)
    {
        $this->authorizeCampaignAccess($request->user(), true);

        $campaign = new Campaign($request->validated());
        $campaign->created_by = $request->user()->id;
        $campaign->save();

        return (new CampaignResource($campaign))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, string $campaign)
    {
        $this->authorizeCampaignAccess($request->user());

        return new CampaignResource($this->findCampaign($campaign));
    }

    public function update(UpdateCampaignRequest $request, string $campaign)
    {
        $this->authorizeCampaignAccess($request->user(), true);

        $record = $this->findCampaign($campaign);
        $record->fill($request->validated());
        $record->save();

        return new CampaignResource($record->refresh());
    }

    public function destroy(Request $request, string $campaign)
    {
        $this->authorizeCampaignAccess($request->user(), true);

        $this->findCampaign($campaign)->delete();

        return response()->json(['message' => 'Campaign deleted successfully.']);
    }

    private function findCampaign(string $campaignId): Campaign
    {
        return Campaign::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->findOrFail($campaignId);
    }

    private function authorizeCampaignAccess(?User $user, bool $write = false): void
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
            'Your workspace role cannot access campaigns.'
        );

        if ($write) {
            abort_unless(
                in_array($membership->role, [
                    WorkspaceUser::ROLE_OWNER,
                    WorkspaceUser::ROLE_ADMIN,
                    WorkspaceUser::ROLE_MEMBER,
                ], true),
                403,
                'Viewers cannot modify campaigns.'
            );

            if (in_array($membership->role, [WorkspaceUser::ROLE_OWNER, WorkspaceUser::ROLE_ADMIN], true)) {
                Gate::authorize('update', $workspace);
            }
        } else {
            Gate::authorize('view', $workspace);
        }
    }
}
