<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Research\StoreMarketResearchRequest;
use App\Http\Requests\Research\UpdateMarketResearchRequest;
use App\Http\Resources\Api\MarketResearchResource;
use App\Models\MarketResearchProject;
use App\Services\MarketingModuleAccessService;
use App\Services\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MarketResearchController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly MarketingModuleAccessService $access,
    ) {}

    public function index(Request $request)
    {
        $this->access->authorize($request->user());
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'category' => ['sometimes', 'string', 'max:100'],
            'status' => ['sometimes', 'string', Rule::in(MarketResearchProject::STATUSES)],
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $research = MarketResearchProject::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('name', 'like', '%'.$search.'%')
                        ->orWhere('description', 'like', '%'.$search.'%')
                        ->orWhere('category', 'like', '%'.$search.'%');
                });
            })
            ->when($filters['category'] ?? null, fn ($query, string $category) => $query->where('category', $category))
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['from'] ?? null, fn ($query, string $from) => $query->where(function ($query) use ($from): void {
                $query->whereNull('ends_on')->orWhereDate('ends_on', '>=', $from);
            }))
            ->when($filters['to'] ?? null, fn ($query, string $to) => $query->where(function ($query) use ($to): void {
                $query->whereNull('starts_on')->orWhereDate('starts_on', '<=', $to);
            }))
            ->orderByDesc('updated_at')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return MarketResearchResource::collection($research);
    }

    public function store(StoreMarketResearchRequest $request)
    {
        $this->access->authorize($request->user(), true);
        $research = new MarketResearchProject($request->validated());
        $research->created_by = $request->user()->id;
        $research->save();

        return (new MarketResearchResource($research))->response()->setStatusCode(201);
    }

    public function show(Request $request, string $research)
    {
        $this->access->authorize($request->user());

        return new MarketResearchResource($this->findResearch($research));
    }

    public function update(UpdateMarketResearchRequest $request, string $research)
    {
        $this->access->authorize($request->user(), true);
        $record = $this->findResearch($research);
        $record->fill($request->validated());
        $record->save();

        return new MarketResearchResource($record->refresh());
    }

    public function destroy(Request $request, string $research)
    {
        $this->access->authorize($request->user(), true);
        $this->findResearch($research)->delete();

        return response()->json(['message' => 'Market research project deleted successfully.']);
    }

    private function findResearch(string $id): MarketResearchProject
    {
        return MarketResearchProject::query()->where('workspace_id', $this->tenantContext->getWorkspaceId())->findOrFail($id);
    }
}
