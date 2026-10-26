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
use Illuminate\Validation\Rule;

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
        $campaignId = $filters['campaign_id'] ?? null;
        $channel = $filters['channel'] ?? null;
        $current = $this->analytics->overview($workspaceId, $from->toDateString(), $to->toDateString(), $campaignId, $channel);
        $previous = $this->analytics->overview($workspaceId, $previousFrom->toDateString(), $previousTo->toDateString(), $campaignId, $channel);
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

    public function campaignPerformance(Request $request)
    {
        $this->access->authorize($request->user());
        $workspaceId = $this->tenantContext->getWorkspaceId();
        $filters = $request->validate([
            'campaign_a' => ['required', 'uuid', Rule::exists('campaigns', 'id')->where('workspace_id', $workspaceId)],
            'campaign_b' => ['required', 'uuid', 'different:campaign_a', Rule::exists('campaigns', 'id')->where('workspace_id', $workspaceId)],
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
        ]);
        $campaigns = DB::table('campaigns')
            ->where('workspace_id', $workspaceId)
            ->whereIn('id', [$filters['campaign_a'], $filters['campaign_b']])
            ->get(['id', 'name'])
            ->keyBy('id');
        abort_unless($campaigns->count() === 2, 404, 'One or more campaigns were not found in the active workspace.');

        $ids = [$filters['campaign_a'], $filters['campaign_b']];
        $transactions = DB::table('finance_transactions')
            ->where('workspace_id', $workspaceId)
            ->whereIn('campaign_id', $ids)
            ->whereBetween('occurred_on', [$filters['from'], $filters['to']])
            ->select('campaign_id', 'type')
            ->selectRaw('SUM(amount) as total')
            ->groupBy('campaign_id', 'type')
            ->get()
            ->keyBy(fn (object $row): string => $row->campaign_id.':'.$row->type);
        $leadCounts = DB::table('crm_leads')
            ->where('workspace_id', $workspaceId)
            ->whereIn('source_campaign_id', $ids)
            ->whereBetween(DB::raw('DATE(created_at)'), [$filters['from'], $filters['to']])
            ->select('source_campaign_id')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('source_campaign_id')
            ->pluck('total', 'source_campaign_id');

        $metricValues = [];
        foreach (['revenue' => 'income', 'costs' => 'expense'] as $metric => $type) {
            foreach ($ids as $id) {
                $metricValues[$metric][$id] = (float) ($transactions->get($id.':'.$type)?->total ?? 0);
            }
        }
        foreach ($ids as $id) {
            $metricValues['profit'][$id] = $metricValues['revenue'][$id] - $metricValues['costs'][$id];
            $metricValues['leads'][$id] = (int) ($leadCounts->get($id) ?? 0);
        }

        $metrics = [];
        foreach ($metricValues as $name => $values) {
            $left = $values[$filters['campaign_a']];
            $right = $values[$filters['campaign_b']];
            $change = round($left - $right, 2);
            $metrics[$name] = [
                'campaign_a' => $left,
                'campaign_b' => $right,
                'change' => $change,
                'percent_change' => $right == 0 ? null : round($change / $right * 100, 2),
            ];
        }

        return response()->json([
            'data' => [
                'period' => ['from' => $filters['from'], 'to' => $filters['to']],
                'currency' => $this->tenantContext->getWorkspace()->currency,
                'campaign_a' => [
                    'id' => $filters['campaign_a'],
                    'name' => $campaigns->get($filters['campaign_a'])->name,
                ],
                'campaign_b' => [
                    'id' => $filters['campaign_b'],
                    'name' => $campaigns->get($filters['campaign_b'])->name,
                ],
                'definition' => 'Revenue is posted finance-ledger income; total recorded costs are posted finance-ledger expenses; estimated profit is revenue minus recorded costs; leads are CRM records linked to each campaign and created in the selected period. No campaign budgets, uncollected orders, or Meta reporting values are included.',
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
        foreach ([
            'tasks' => ['total', 'completed', 'completion_rate'],
            'crm' => ['leads', 'converted_leads', 'conversion_rate', 'customers'],
            'campaign_financials' => ['budget', 'spend', 'revenue', 'return_on_spend'],
            'finance' => ['income', 'expenses', 'profit', 'budgeted_expenses'],
            'advertising' => ['spend', 'budget', 'attributed_spend', 'unattributed_spend'],
            'sales' => ['total_orders', 'delivered_orders', 'pending_orders', 'sales_revenue', 'realized_net_profit'],
        ] as $section => $keys) {
            foreach ($keys as $key) {
                $metrics[$section.'.'.$key] = $overview[$section][$key] ?? null;
            }
        }

        return array_map(static fn ($value) => $value === null ? null : (is_numeric($value) ? (float) $value : null), $metrics);
    }
}
