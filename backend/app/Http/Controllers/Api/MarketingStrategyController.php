<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Strategies\StoreMarketingStrategyRequest;
use App\Http\Requests\Strategies\UpdateMarketingStrategyRequest;
use App\Http\Resources\Api\MarketingStrategyResource;
use App\Models\MarketingStrategy;
use App\Services\MarketingModuleAccessService;
use App\Services\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MarketingStrategyController extends Controller
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
            'status' => ['sometimes', 'string', Rule::in(MarketingStrategy::STATUSES)],
            'project_id' => ['sometimes', 'uuid', Rule::exists('projects', 'id')->where('workspace_id', $workspaceId)],
            'campaign_id' => ['sometimes', 'uuid', Rule::exists('campaigns', 'id')->where('workspace_id', $workspaceId)],
            'audience_id' => ['sometimes', 'uuid', Rule::exists('audiences', 'id')->where('workspace_id', $workspaceId)],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $strategies = MarketingStrategy::query()
            ->with([
                'audiences' => fn ($query) => $query->where('audiences.workspace_id', $workspaceId),
                'project:id,name',
                'campaign:id,name',
            ])
            ->where('workspace_id', $workspaceId)
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('name', 'like', '%'.$search.'%')
                        ->orWhere('description', 'like', '%'.$search.'%');
                });
            })
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['project_id'] ?? null, fn ($query, string $id) => $query->where('project_id', $id))
            ->when($filters['campaign_id'] ?? null, fn ($query, string $id) => $query->where('campaign_id', $id))
            ->when($filters['audience_id'] ?? null, fn ($query, string $id) => $query->whereHas('audiences', fn ($audiences) => $audiences->whereKey($id)))
            ->orderByDesc('updated_at')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return MarketingStrategyResource::collection($strategies);
    }

    public function store(StoreMarketingStrategyRequest $request)
    {
        $this->access->authorize($request->user(), true);
        $attributes = $request->safe()->except(['audience_ids', 'progress']);
        $strategy = new MarketingStrategy($attributes);
        $strategy->created_by = $request->user()->id;
        $strategy->save();
        $this->syncAudiences($strategy, $request->validated('audience_ids'));

        return (new MarketingStrategyResource($strategy->load(['audiences', 'project:id,name', 'campaign:id,name'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, string $strategy)
    {
        $this->access->authorize($request->user());

        return new MarketingStrategyResource($this->findStrategy($strategy)->load(['audiences', 'project:id,name', 'campaign:id,name']));
    }

    public function update(UpdateMarketingStrategyRequest $request, string $strategy)
    {
        $this->access->authorize($request->user(), true);
        $record = $this->findStrategy($strategy);
        $record->fill($request->safe()->except(['audience_ids', 'progress']));
        $record->save();
        if ($request->exists('audience_ids')) {
            $this->syncAudiences($record, $request->validated('audience_ids'));
        }

        return new MarketingStrategyResource($record->refresh()->load(['audiences', 'project:id,name', 'campaign:id,name']));
    }

    public function destroy(Request $request, string $strategy)
    {
        $this->access->authorize($request->user(), true);
        $this->findStrategy($strategy)->delete();

        return response()->json(['message' => 'Marketing strategy deleted successfully.']);
    }

    private function findStrategy(string $id): MarketingStrategy
    {
        return MarketingStrategy::query()->where('workspace_id', $this->tenantContext->getWorkspaceId())->findOrFail($id);
    }

    private function syncAudiences(MarketingStrategy $strategy, ?array $audienceIds): void
    {
        if ($audienceIds !== null) {
            $strategy->audiences()->syncWithPivotValues($audienceIds, [
                'workspace_id' => $strategy->workspace_id,
            ]);
        }
    }
}
