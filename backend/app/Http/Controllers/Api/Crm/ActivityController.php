<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\StoreActivityRequest;
use App\Http\Resources\Api\Crm\ActivityResource;
use App\Models\Crm\CrmActivity;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    use AuthorizesCrmAccess;

    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    public function index(Request $request)
    {
        $this->authorizeCrmAccess($request->user());

        $filters = $request->validate([
            'lead_id' => ['sometimes', 'uuid'],
            'contact_id' => ['sometimes', 'uuid'],
            'customer_id' => ['sometimes', 'uuid'],
            'type' => ['sometimes', 'string'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $query = CrmActivity::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->with(['user'])
            ->when($filters['lead_id'] ?? null, fn ($q, $lId) => $q->where('lead_id', $lId))
            ->when($filters['contact_id'] ?? null, fn ($q, $cId) => $q->where('contact_id', $cId))
            ->when($filters['customer_id'] ?? null, fn ($q, $cuId) => $q->where('customer_id', $cuId))
            ->when($filters['type'] ?? null, fn ($q, $type) => $q->where('type', $type))
            ->orderByDesc('activity_date');

        $activities = $query->paginate($filters['per_page'] ?? 20)->withQueryString();

        return ActivityResource::collection($activities);
    }

    public function store(StoreActivityRequest $request)
    {
        $this->authorizeCrmAccess($request->user(), true);

        $data = $request->validated();
        if (empty($data['activity_date'])) {
            $data['activity_date'] = now();
        }

        $activity = new CrmActivity($data);
        $activity->workspace_id = $this->tenantContext->getWorkspaceId();
        $activity->user_id = $request->user()->id;
        $activity->save();

        return (new ActivityResource($activity->load('user')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, string $id)
    {
        $this->authorizeCrmAccess($request->user());

        $activity = CrmActivity::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->findOrFail($id);

        return new ActivityResource($activity->load('user'));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->authorizeCrmAccess($request->user(), true);

        $activity = CrmActivity::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->findOrFail($id);

        $activity->delete();

        return response()->json([
            'message' => 'Activity deleted successfully.',
        ]);
    }
}