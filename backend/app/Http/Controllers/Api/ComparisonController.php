<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Comparisons\ComparePeriodsRequest;
use App\Services\Analytics\WorkspaceAnalyticsService;
use App\Services\TenantContext;
use App\Services\WorkspaceModuleAccessService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ComparisonController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly WorkspaceModuleAccessService $access,
        private readonly WorkspaceAnalyticsService $analytics,
    ) {}

    public function periods(ComparePeriodsRequest $request)
    {
        $this->access->authorize($request->user());
        $filters = $request->validated();
        $from = CarbonImmutable::parse($filters['from']);
        $to = CarbonImmutable::parse($filters['to']);
        $length = $from->diffInDays($to) + 1;
        $previousFrom = isset($filters['previous_from'])
            ? CarbonImmutable::parse($filters['previous_from'])
            : $from->subDays($length);
        $previousTo = isset($filters['previous_to'])
            ? CarbonImmutable::parse($filters['previous_to'])
            : $from->subDay();
        $hasPreviousFrom = array_key_exists('previous_from', $filters);
        $hasPreviousTo = array_key_exists('previous_to', $filters);
        abort_if($hasPreviousFrom !== $hasPreviousTo, 422, 'Both previous_from and previous_to must be provided together.');
        abort_if($previousTo->lessThan($previousFrom), 422, 'The previous range end must be on or after its start.');

        $workspaceId = $this->tenantContext->getWorkspaceId();
        $current = $this->analytics->overview($workspaceId, $from->toDateString(), $to->toDateString());
        $previous = $this->analytics->overview($workspaceId, $previousFrom->toDateString(), $previousTo->toDateString());
        $currentMetrics = $this->flattenMetrics($current);
        $previousMetrics = $this->flattenMetrics($previous);
        $metrics = [];
        foreach ($currentMetrics as $name => $currentValue) {
            $previousValue = $previousMetrics[$name] ?? null;
            $delta = $currentValue === null || $previousValue === null ? null : round($currentValue - $previousValue, 2);
            $metrics[$name] = [
                'current' => $currentValue,
                'previous' => $previousValue,
                'change' => $delta,
                'percent_change' => $delta === null || $previousValue == 0
                    ? null
                    : round(($delta / $previousValue) * 100, 2),
            ];
        }

        return response()->json([
            'data' => [
                'current_period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
                'previous_period' => ['from' => $previousFrom->toDateString(), 'to' => $previousTo->toDateString()],
                'definition' => 'Change is current minus previous. Percent change is null when either source is unavailable or the previous value is zero. Completion and conversion rates are percentage points.',
                'metrics' => $metrics,
            ],
        ]);
    }

    public function campaigns(Request $request)
    {
        $this->access->authorize($request->user());
        $filters = $request->validate([
            'campaign_a' => ['required', 'uuid'],
            'campaign_b' => ['required', 'uuid', 'different:campaign_a'],
        ]);
        $workspaceId = $this->tenantContext->getWorkspaceId();
        $campaigns = DB::table('campaigns')
            ->where('workspace_id', $workspaceId)
            ->whereIn('id', [$filters['campaign_a'], $filters['campaign_b']])
            ->get(['id', 'name', 'budget', 'spend', 'revenue', 'leads', 'customers'])
            ->keyBy('id');
        abort_unless($campaigns->count() === 2, 404, 'One or more campaigns were not found in the active workspace.');

        $a = $campaigns->get($filters['campaign_a']);
        $b = $campaigns->get($filters['campaign_b']);
        $metrics = [];
        foreach (['budget', 'spend', 'revenue', 'leads', 'customers'] as $metric) {
            $left = (float) $a->{$metric};
            $right = (float) $b->{$metric};
            $change = round($left - $right, 2);
            $metrics[$metric] = [
                'campaign_a' => $left,
                'campaign_b' => $right,
                'change' => $change,
                'percent_change' => $right == 0 ? null : round($change / $right * 100, 2),
            ];
        }

        return response()->json([
            'data' => [
                'campaign_a' => ['id' => $a->id, 'name' => $a->name],
                'campaign_b' => ['id' => $b->id, 'name' => $b->name],
                'definition' => 'Change is campaign A minus campaign B; percent change uses campaign B as the baseline and is null when that value is zero.',
                'metrics' => $metrics,
            ],
        ]);
    }

    /**
     * @param  array<string, mixed>  $overview
     * @return array<string, float|int|null>
     */
    private function flattenMetrics(array $overview): array
    {
        $metrics = [
            'projects' => $overview['projects'],
            'campaigns' => $overview['campaigns'],
        ];
        foreach (['tasks' => ['total', 'completed', 'completion_rate'], 'crm' => ['leads', 'converted_leads', 'conversion_rate', 'customers'], 'campaign_financials' => ['budget', 'spend', 'revenue', 'return_on_spend'], 'finance' => ['income', 'expenses', 'profit', 'budgeted_expenses']] as $section => $keys) {
            foreach ($keys as $key) {
                $metrics[$section.'.'.$key] = $overview[$section][$key] ?? null;
            }
        }

        return array_map(static fn ($value) => $value === null ? null : (is_numeric($value) ? (float) $value : null), $metrics);
    }
}
