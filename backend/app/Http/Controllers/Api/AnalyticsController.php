<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Analytics\AnalyticsRangeRequest;
use App\Services\Analytics\WorkspaceAnalyticsService;
use App\Services\TenantContext;
use App\Services\WorkspaceModuleAccessService;

class AnalyticsController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly WorkspaceModuleAccessService $access,
        private readonly WorkspaceAnalyticsService $analytics,
    ) {}

    public function overview(AnalyticsRangeRequest $request)
    {
        $this->access->authorize($request->user());

        return response()->json([
            'data' => $this->analytics->overview(
                $this->tenantContext->getWorkspaceId(),
                $request->validated('from'),
                $request->validated('to'),
                $request->validated('campaign_id'),
                $request->validated('channel'),
            ),
        ]);
    }

    public function timeSeries(AnalyticsRangeRequest $request)
    {
        $this->access->authorize($request->user());

        return response()->json([
            'data' => $this->analytics->timeSeries(
                $this->tenantContext->getWorkspaceId(),
                $request->validated('from'),
                $request->validated('to'),
                $request->validated('campaign_id'),
                $request->validated('channel'),
            ),
        ]);
    }
}
