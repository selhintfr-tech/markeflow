<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\StoreContactRequest;
use App\Http\Requests\Crm\UpdateContactRequest;
use App\Http\Resources\Api\Crm\ContactResource;
use App\Models\Crm\CrmContact;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactController extends Controller
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
            'lifecycle_stage' => ['sometimes', 'string'],
            'status' => ['sometimes', 'string'],
            'owner_id' => ['sometimes', 'integer'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'sort_by' => ['sometimes', 'string', 'in:recent,oldest,name,company'],
        ]);

        $query = CrmContact::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->with(['owner'])
            ->when($filters['search'] ?? null, function ($q, string $search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('first_name', 'like', '%'.$search.'%')
                        ->orWhere('last_name', 'like', '%'.$search.'%')
                        ->orWhere('company_name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%')
                        ->orWhere('phone', 'like', '%'.$search.'%');
                });
            })
            ->when($filters['lifecycle_stage'] ?? null, fn ($q, $stage) => $q->where('lifecycle_stage', $stage))
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($filters['owner_id'] ?? null, fn ($q, $ownerId) => $q->where('owner_id', $ownerId));

        $sortBy = $filters['sort_by'] ?? 'recent';
        match ($sortBy) {
            'oldest' => $query->orderBy('created_at', 'asc'),
            'name' => $query->orderBy('first_name', 'asc')->orderBy('last_name', 'asc'),
            'company' => $query->orderBy('company_name', 'asc'),
            default => $query->orderByDesc('created_at'),
        };

        $contacts = $query->paginate($filters['per_page'] ?? 15)->withQueryString();

        return ContactResource::collection($contacts);
    }

    public function store(StoreContactRequest $request)
    {
        $this->authorizeCrmAccess($request->user(), true);

        $data = $request->validated();
        if (empty($data['owner_id'])) {
            $data['owner_id'] = $request->user()->id;
        }

        $contact = new CrmContact($data);
        $contact->workspace_id = $this->tenantContext->getWorkspaceId();
        $contact->save();

        return (new ContactResource($contact->load('owner')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, string $id)
    {
        $this->authorizeCrmAccess($request->user());

        $contact = $this->findContact($id);

        return new ContactResource($contact->load(['owner', 'activities', 'notes']));
    }

    public function update(UpdateContactRequest $request, string $id)
    {
        $this->authorizeCrmAccess($request->user(), true);

        $contact = $this->findContact($id);
        $contact->fill($request->validated());
        $contact->save();

        return new ContactResource($contact->load('owner'));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->authorizeCrmAccess($request->user(), true);

        $contact = $this->findContact($id);
        $contact->delete();

        return response()->json([
            'message' => 'Contact deleted successfully.',
        ]);
    }

    protected function findContact(string $id): CrmContact
    {
        return CrmContact::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->findOrFail($id);
    }
}