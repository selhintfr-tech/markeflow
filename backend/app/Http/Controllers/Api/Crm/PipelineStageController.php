<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crm\StorePipelineStageRequest;
use App\Http\Requests\Crm\UpdatePipelineStageRequest;
use App\Http\Resources\Api\Crm\PipelineStageResource;
use App\Models\Crm\CrmPipelineStage;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PipelineStageController extends Controller
{
    use AuthorizesCrmAccess;

    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    public function store(StorePipelineStageRequest $request)
    {
        $this->authorizeCrmAccess($request->user(), true);

        $data = $request->validated();
        $stage = new CrmPipelineStage($data);
        $stage->workspace_id = $this->tenantContext->getWorkspaceId();
        $stage->save();

        return (new PipelineStageResource($stage))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdatePipelineStageRequest $request, string $id)
    {
        $this->authorizeCrmAccess($request->user(), true);

        $stage = $this->findStage($id);
        $stage->fill($request->validated());
        $stage->save();

        return new PipelineStageResource($stage);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->authorizeCrmAccess($request->user(), true);

        $stage = $this->findStage($id);
        $stage->delete();

        return response()->json([
            'message' => 'Pipeline stage deleted successfully.',
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $this->authorizeCrmAccess($request->user(), true);

        $data = $request->validate([
            'stages' => ['required', 'array'],
            'stages.*.id' => ['required', 'uuid'],
            'stages.*.display_order' => ['required', 'integer'],
        ]);

        $workspaceId = $this->tenantContext->getWorkspaceId();

        foreach ($data['stages'] as $item) {
            CrmPipelineStage::query()
                ->where('workspace_id', $workspaceId)
                ->where('id', $item['id'])
                ->update(['display_order' => $item['display_order']]);
        }

        return response()->json([
            'message' => 'Stages reordered successfully.',
        ]);
    }

    protected function findStage(string $id): CrmPipelineStage
    {
        return CrmPipelineStage::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->findOrFail($id);
    }
}