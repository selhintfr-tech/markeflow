<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\ConvertLeadRequest;
use App\Http\Requests\Crm\StoreLeadRequest;
use App\Http\Requests\Crm\UpdateLeadRequest;
use App\Http\Resources\Api\Crm\CustomerResource;
use App\Http\Resources\Api\Crm\LeadResource;
use App\Models\Crm\CrmActivity;
use App\Models\Crm\CrmLead;
use App\Services\Crm\CrmService;
use App\Services\TenantContext;
use App\Services\WorkspaceNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeadController extends Controller
{
    use AuthorizesCrmAccess;

    public function __construct(
        protected TenantContext $tenantContext,
        protected CrmService $crmService,
        protected WorkspaceNotificationService $notifications,
    ) {}

    public function index(Request $request)
    {
        $this->authorizeCrmAccess($request->user());

        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', 'string'],
            'leadStatus' => ['sometimes', 'string'],
            'pipeline_id' => ['sometimes', 'uuid'],
            'stage_id' => ['sometimes', 'uuid'],
            'source' => ['sometimes', 'string'],
            'sourceCampaign' => ['sometimes', 'string'],
            'source_campaign_id' => ['sometimes', 'uuid'],
            'related_project_id' => ['sometimes', 'uuid'],
            'owner_id' => ['sometimes', 'integer'],
            'sort_by' => ['sometimes', 'string', 'in:recent,oldest,name,company,value'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $statusFilter = $filters['status'] ?? $filters['leadStatus'] ?? null;
        if ($statusFilter === 'All') {
            $statusFilter = null;
        }

        $campaignFilter = $filters['sourceCampaign'] ?? null;
        if ($campaignFilter === 'All') {
            $campaignFilter = null;
        }

        $query = CrmLead::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->with(['owner', 'stage', 'pipeline', 'campaign', 'project'])
            ->when($filters['search'] ?? null, function ($q, string $search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('name', 'like', '%'.$search.'%')
                        ->orWhere('company', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%')
                        ->orWhere('phone', 'like', '%'.$search.'%');
                });
            })
            ->when($statusFilter, fn ($q, $status) => $q->where('status', $status))
            ->when($filters['pipeline_id'] ?? null, fn ($q, $pId) => $q->where('pipeline_id', $pId))
            ->when($filters['stage_id'] ?? null, fn ($q, $sId) => $q->where('stage_id', $sId))
            ->when($filters['source'] ?? null, fn ($q, $src) => $q->where('source', $src))
            ->when($filters['source_campaign_id'] ?? null, fn ($q, $cId) => $q->where('source_campaign_id', $cId))
            ->when($campaignFilter, fn ($q, $cName) => $q->where('source_campaign_name', $cName))
            ->when($filters['related_project_id'] ?? null, fn ($q, $prId) => $q->where('related_project_id', $prId))
            ->when($filters['owner_id'] ?? null, fn ($q, $ownerId) => $q->where('owner_id', $ownerId));

        $sortBy = $filters['sort_by'] ?? 'recent';
        match ($sortBy) {
            'oldest' => $query->orderBy('created_at', 'asc'),
            'name' => $query->orderBy('name', 'asc'),
            'company' => $query->orderBy('company', 'asc'),
            'value' => $query->orderByDesc('estimated_value'),
            default => $query->orderByDesc('created_at'),
        };

        $leads = $query->paginate($filters['per_page'] ?? 15)->withQueryString();

        return LeadResource::collection($leads);
    }

    public function store(StoreLeadRequest $request)
    {
        $this->authorizeCrmAccess($request->user(), true);

        $data = $request->validated();
        $workspace = $this->tenantContext->getWorkspace();

        if (empty($data['owner_id'])) {
            $data['owner_id'] = $request->user()->id;
        }

        if (empty($data['status'])) {
            $data['status'] = CrmLead::STATUS_NEW;
        }

        // Auto-assign default pipeline and stage if omitted
        if (empty($data['pipeline_id'])) {
            $defaultPipeline = $this->crmService->ensureDefaultPipeline($workspace);
            $data['pipeline_id'] = $defaultPipeline->id;
            if (empty($data['stage_id'])) {
                $firstStage = $defaultPipeline->stages->first();
                $data['stage_id'] = $firstStage?->id;
            }
        }

        $lead = new CrmLead($data);
        $lead->workspace_id = $workspace->id;
        DB::transaction(function () use ($lead, $request, $workspace): void {
            $lead->save();

            $activity = new CrmActivity([
                'lead_id' => $lead->id,
                'contact_id' => $lead->contact_id,
                'user_id' => $request->user()->id,
                'type' => CrmActivity::TYPE_CREATE,
                'title' => 'Lead Created',
                'description' => 'Lead record created for ['.$lead->name.']'.($lead->company ? ' at ['.$lead->company.']' : '').'.',
                'activity_date' => now(),
            ]);
            $activity->workspace_id = $workspace->id;
            $activity->save();
            $this->notifications->leadCreated($lead);
        });

        return (new LeadResource($lead->load(['owner', 'stage', 'pipeline', 'activities'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, string $id)
    {
        $this->authorizeCrmAccess($request->user());

        $lead = $this->findLead($id);

        return new LeadResource($lead->load(['owner', 'stage', 'pipeline', 'campaign', 'project', 'activities.user', 'notes.user']));
    }

    public function update(UpdateLeadRequest $request, string $id)
    {
        $this->authorizeCrmAccess($request->user(), true);

        $lead = $this->findLead($id);
        $oldStatus = $lead->status;
        $data = $request->validated();

        $lead->fill($data);
        $lead->save();

        // If status changed, record status_change activity
        if (! empty($data['status']) && $data['status'] !== $oldStatus) {
            $activity = new CrmActivity([
                'lead_id' => $lead->id,
                'contact_id' => $lead->contact_id,
                'user_id' => $request->user()->id,
                'type' => CrmActivity::TYPE_STATUS_CHANGE,
                'title' => 'Lead Status Updated',
                'description' => 'Lead status transitioned from ['.$oldStatus.'] to ['.$data['status'].'].',
                'activity_date' => now(),
                'metadata' => [
                    'from' => $oldStatus,
                    'to' => $data['status'],
                ],
            ]);
            $activity->workspace_id = $lead->workspace_id;
            $activity->save();
        }

        return new LeadResource($lead->load(['owner', 'stage', 'pipeline', 'activities.user']));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->authorizeCrmAccess($request->user(), true);

        $lead = $this->findLead($id);
        $lead->delete();

        return response()->json([
            'message' => 'Lead deleted successfully.',
        ]);
    }

    public function convert(ConvertLeadRequest $request, string $id)
    {
        $this->authorizeCrmAccess($request->user(), true);

        $lead = $this->findLead($id);

        if ($lead->status === CrmLead::STATUS_CONVERTED && $lead->converted_to_customer_id) {
            return response()->json([
                'message' => 'This lead has already been converted to a customer.',
            ], 422);
        }

        $customer = $this->crmService->convertLeadToCustomer($lead, $request->validated(), $request->user());

        return (new CustomerResource($customer->load(['owner', 'contact', 'lead'])))
            ->response()
            ->setStatusCode(201);
    }

    public function funnel(Request $request): JsonResponse
    {
        $this->authorizeCrmAccess($request->user());

        $workspace = $this->tenantContext->getWorkspace();
        $stats = $this->crmService->getFunnelStats($workspace);

        return response()->json([
            'data' => $stats,
        ]);
    }

    protected function findLead(string $id): CrmLead
    {
        return CrmLead::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->findOrFail($id);
    }
}