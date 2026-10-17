<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\StorePipelineRequest;
use App\Http\Requests\Crm\UpdatePipelineRequest;
use App\Http\Resources\Api\Crm\PipelineResource;
use App\Models\Crm\CrmPipeline;
use App\Services\Crm\CrmService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PipelineController extends Controller
{
    use AuthorizesCrmAccess;

    public function __construct(
        protected TenantContext $tenantContext,
        protected CrmService $crmService
    ) {}

    public function index(Request $request)
    {
        $this->authorizeCrmAccess($request->user());

        $workspace = $this->tenantContext->getWorkspace();
        $this->crmService->ensureDefaultPipeline($workspace);

        $pipelines = CrmPipeline::query()
            ->where('workspace_id', $workspace->id)
            ->with(['stages'])
            ->orderBy('display_order')
            ->get();

        return PipelineResource::collection($pipelines);
    }

    public function store(StorePipelineRequest $request)
    {
        $this->authorizeCrmAccess($request->user(), true);

        $data = $request->validated();
        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $pipeline = new CrmPipeline($data);
        $pipeline->workspace_id = $this->tenantContext->getWorkspaceId();
        $pipeline->save();

        return (new PipelineResource($pipeline->load('stages')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, string $id)
    {
        $this->authorizeCrmAccess($request->user());

        $pipeline = $this->findPipeline($id);

        return new PipelineResource($pipeline->load('stages'));
    }

    public function update(UpdatePipelineRequest $request, string $id)
    {
        $this->authorizeCrmAccess($request->user(), true);

        $pipeline = $this->findPipeline($id);
        $data = $request->validated();
        if (! empty($data['name']) && empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $pipeline->fill($data);
        $pipeline->save();

        return new PipelineResource($pipeline->load('stages'));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->authorizeCrmAccess($request->user(), true);

        $pipeline = $this->findPipeline($id);

        if ($pipeline->is_default) {
            return response()->json([
                'message' => 'Cannot delete the workspace default sales pipeline.',
            ], 422);
        }

        $pipeline->delete();

        return response()->json([
            'message' => 'Pipeline deleted successfully.',
        ]);
    }

    protected function findPipeline(string $id): CrmPipeline
    {
        return CrmPipeline::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->findOrFail($id);
    }
}