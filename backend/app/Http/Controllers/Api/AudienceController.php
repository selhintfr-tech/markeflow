<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Audiences\StoreAudienceRequest;
use App\Http\Requests\Audiences\UpdateAudienceRequest;
use App\Http\Resources\Api\AudienceResource;
use App\Models\Audience;
use App\Services\MarketingModuleAccessService;
use App\Services\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AudienceController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly MarketingModuleAccessService $access,
    ) {}

    public function index(Request $request)
    {
        $this->access->authorize($request->user());
        $workspaceId = $this->tenantContext->getWorkspaceId();
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', 'string', Rule::in(Audience::STATUSES)],
            'campaign_id' => ['sometimes', 'uuid', Rule::exists('campaigns', 'id')->where('workspace_id', $workspaceId)],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $audiences = Audience::query()
            ->with(['campaigns' => fn ($query) => $query->where('campaigns.workspace_id', $workspaceId)])
            ->where('workspace_id', $workspaceId)
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('name', 'like', '%'.$search.'%')
                        ->orWhere('description', 'like', '%'.$search.'%');
                });
            })
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['campaign_id'] ?? null, fn ($query, string $campaignId) => $query->whereHas('campaigns', fn ($campaigns) => $campaigns->whereKey($campaignId)))
            ->orderBy('name')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return AudienceResource::collection($audiences);
    }

    public function store(StoreAudienceRequest $request)
    {
        $this->access->authorize($request->user(), true);
        $attributes = $request->safe()->except('campaign_ids');
        $audience = new Audience($attributes);
        $audience->created_by = $request->user()->id;
        $audience->save();
        $this->syncCampaigns($audience, $request->validated('campaign_ids'));

        return (new AudienceResource($audience->load(['campaigns' => fn ($query) => $query->where('campaigns.workspace_id', $audience->workspace_id)])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, string $audience)
    {
        $this->access->authorize($request->user());

        return new AudienceResource($this->findAudience($audience)->load('campaigns'));
    }

    public function update(UpdateAudienceRequest $request, string $audience)
    {
        $this->access->authorize($request->user(), true);
        $record = $this->findAudience($audience);
        $record->fill($request->safe()->except('campaign_ids'));
        $record->save();
        if ($request->exists('campaign_ids')) {
            $this->syncCampaigns($record, $request->validated('campaign_ids'));
        }

        return new AudienceResource($record->refresh()->load('campaigns'));
    }

    public function destroy(Request $request, string $audience)
    {
        $this->access->authorize($request->user(), true);
        $this->findAudience($audience)->delete();

        return response()->json(['message' => 'Audience deleted successfully.']);
    }

    private function findAudience(string $id): Audience
    {
        return Audience::query()->where('workspace_id', $this->tenantContext->getWorkspaceId())->findOrFail($id);
    }

    private function syncCampaigns(Audience $audience, ?array $campaignIds): void
    {
        if ($campaignIds !== null) {
            $audience->campaigns()->syncWithPivotValues($campaignIds, [
                'workspace_id' => $audience->workspace_id,
            ]);
        }
    }
}
