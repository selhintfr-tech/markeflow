<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\StoreCustomerRequest;
use App\Http\Requests\Crm\UpdateCustomerRequest;
use App\Http\Resources\Api\Crm\CustomerResource;
use App\Models\Crm\CrmCustomer;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    use AuthorizesCrmAccess;

    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    public function index(Request $request)
    {
        $this->authorizeCrmAccess($request->user());

        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', 'string'],
            'customer_tier' => ['sometimes', 'string'],
            'owner_id' => ['sometimes', 'integer'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'sort_by' => ['sometimes', 'string', 'in:recent,oldest,name,revenue'],
        ]);

        $query = CrmCustomer::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->with(['owner', 'contact', 'lead'])
            ->when($filters['search'] ?? null, function ($q, string $search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('company_name', 'like', '%'.$search.'%')
                        ->orWhere('contact_name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%')
                        ->orWhere('phone', 'like', '%'.$search.'%');
                });
            })
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($filters['customer_tier'] ?? null, fn ($q, $tier) => $q->where('customer_tier', $tier))
            ->when($filters['owner_id'] ?? null, fn ($q, $ownerId) => $q->where('owner_id', $ownerId));

        $sortBy = $filters['sort_by'] ?? 'recent';
        match ($sortBy) {
            'oldest' => $query->orderBy('created_at', 'asc'),
            'name' => $query->orderBy('company_name', 'asc'),
            'revenue' => $query->orderByDesc('total_revenue'),
            default => $query->orderByDesc('created_at'),
        };

        $customers = $query->paginate($filters['per_page'] ?? 15)->withQueryString();

        return CustomerResource::collection($customers);
    }

    public function store(StoreCustomerRequest $request)
    {
        $this->authorizeCrmAccess($request->user(), true);

        $data = $request->validated();
        if (empty($data['owner_id'])) {
            $data['owner_id'] = $request->user()->id;
        }

        $customer = new CrmCustomer($data);
        $customer->workspace_id = $this->tenantContext->getWorkspaceId();
        $customer->save();

        return (new CustomerResource($customer->load(['owner', 'contact', 'lead'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, string $id)
    {
        $this->authorizeCrmAccess($request->user());

        $customer = $this->findCustomer($id);

        return new CustomerResource($customer->load(['owner', 'contact', 'lead', 'activities.user', 'notes.user']));
    }

    public function update(UpdateCustomerRequest $request, string $id)
    {
        $this->authorizeCrmAccess($request->user(), true);

        $customer = $this->findCustomer($id);
        $customer->fill($request->validated());
        $customer->save();

        return new CustomerResource($customer->load(['owner', 'contact', 'lead']));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->authorizeCrmAccess($request->user(), true);

        $customer = $this->findCustomer($id);
        $customer->delete();

        return response()->json([
            'message' => 'Customer deleted successfully.',
        ]);
    }

    protected function findCustomer(string $id): CrmCustomer
    {
        return CrmCustomer::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->findOrFail($id);
    }
}