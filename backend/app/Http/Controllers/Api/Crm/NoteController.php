<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\StoreNoteRequest;
use App\Http\Requests\Crm\UpdateNoteRequest;
use App\Http\Resources\Api\Crm\NoteResource;
use App\Models\Crm\CrmNote;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NoteController extends Controller
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
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $query = CrmNote::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->with(['user'])
            ->when($filters['lead_id'] ?? null, fn ($q, $lId) => $q->where('lead_id', $lId))
            ->when($filters['contact_id'] ?? null, fn ($q, $cId) => $q->where('contact_id', $cId))
            ->when($filters['customer_id'] ?? null, fn ($q, $cuId) => $q->where('customer_id', $cuId))
            ->orderByDesc('is_pinned')
            ->orderByDesc('created_at');

        $notes = $query->paginate($filters['per_page'] ?? 20)->withQueryString();

        return NoteResource::collection($notes);
    }

    public function store(StoreNoteRequest $request)
    {
        $this->authorizeCrmAccess($request->user(), true);

        $data = $request->validated();
        $note = new CrmNote($data);
        $note->workspace_id = $this->tenantContext->getWorkspaceId();
        $note->user_id = $request->user()->id;
        $note->save();

        return (new NoteResource($note->load('user')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, string $id)
    {
        $this->authorizeCrmAccess($request->user());

        $note = CrmNote::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->findOrFail($id);

        return new NoteResource($note->load('user'));
    }

    public function update(UpdateNoteRequest $request, string $id)
    {
        $this->authorizeCrmAccess($request->user(), true);

        $note = CrmNote::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->findOrFail($id);

        $note->fill($request->validated());
        $note->save();

        return new NoteResource($note->load('user'));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->authorizeCrmAccess($request->user(), true);

        $note = CrmNote::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->findOrFail($id);

        $note->delete();

        return response()->json([
            'message' => 'Note deleted successfully.',
        ]);
    }
}