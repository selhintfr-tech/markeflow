<?php

namespace App\Services\Analytics;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class WorkspaceAnalyticsService
{
    /**
     * Short-lived in-process memoization cache (30-second TTL) for expensive aggregations.
     *
     * @var array<string, array{expires_at: float, data: array<string, mixed>}>
     */
    private static array $memoCache = [];

    public static function clearMemoCache(): void
    {
        self::$memoCache = [];
    }

    public static function getWorkspaceVersion(string $workspaceId): int
    {
        return (int) Cache::get("analytics:v:{$workspaceId}", 1);
    }

    public static function invalidateWorkspaceCache(?string $workspaceId): void
    {
        if (!$workspaceId) {
            return;
        }
        self::$memoCache = [];
        $current = (int) Cache::get("analytics:v:{$workspaceId}", 1);
        Cache::put("analytics:v:{$workspaceId}", $current + 1, 86400);
    }

    /**
     * Aggregate workspace records by their source date, avoiding application-side row loading.
     *
     * @return array<string, mixed>
     */
    public function overview(
        string $workspaceId,
        ?string $from = null,
        ?string $to = null,
        ?string $campaignId = null,
        ?string $channel = null,
    ): array {
        $v = self::getWorkspaceVersion($workspaceId);
        $cacheKey = "overview:v{$v}:{$workspaceId}:{$from}:{$to}:{$campaignId}:{$channel}";
        $now = microtime(true);
        if (isset(self::$memoCache[$cacheKey]) && self::$memoCache[$cacheKey]['expires_at'] > $now) {
            return self::$memoCache[$cacheKey]['data'];
        }

        $result = Cache::remember("analytics:overview:v{$v}:{$workspaceId}:{$from}:{$to}:{$campaignId}:{$channel}", 30, function () use ($workspaceId, $from, $to, $campaignId, $channel): array {
            return [
                'projects' => $this->countMetric('projects', $workspaceId, 'created_at', $from, $to),
                'campaigns' => $this->countMetric('campaigns', $workspaceId, 'start_date', $from, $to),
                'tasks' => $this->taskMetrics($workspaceId, $from, $to),
                'crm' => $this->crmMetrics($workspaceId, $from, $to, $campaignId),
                'campaign_financials' => $this->campaignFinancials($workspaceId, $from, $to),
                'finance' => $this->financeMetrics($workspaceId, $from, $to),
                'advertising' => $this->advertisingMetrics($workspaceId, $from, $to, $campaignId, $channel),
                'sales' => $this->salesMetrics($workspaceId, $from, $to, $campaignId),
                'definitions' => [
                    'date_filter' => 'Each source is filtered using its documented event date: project created_at, campaign start_date, task due_date, CRM created_at/converted_at, finance occurred_on.',
                    'task_completion' => 'Completed tasks are tasks whose status is exactly Completed.',
                    'lead_conversion' => 'Converted leads are leads whose status is Converted or whose converted_at timestamp is set.',
                    'financial_profit' => 'Profit is recorded income minus recorded expenses; campaign revenue/spend are stored campaign fields and are separate from finance transactions.',
                    'advertising_spend' => 'Ad spend is calculated from verified finance transactions categorized as Advertising or Marketing.',
                    'e_commerce_sales' => 'Operational order totals reflect order records; realized revenue reflects confirmed ledger income.',
                ],
            ];
        });

        self::$memoCache[$cacheKey] = ['expires_at' => $now + 30.0, 'data' => $result];

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    public function timeSeries(
        string $workspaceId,
        ?string $from = null,
        ?string $to = null,
        ?string $campaignId = null,
        ?string $channel = null,
    ): array {
        $v = self::getWorkspaceVersion($workspaceId);
        $cacheKey = "timeseries:v{$v}:{$workspaceId}:{$from}:{$to}:{$campaignId}:{$channel}";
        $now = microtime(true);
        if (isset(self::$memoCache[$cacheKey]) && self::$memoCache[$cacheKey]['expires_at'] > $now) {
            return self::$memoCache[$cacheKey]['data'];
        }

        $result = Cache::remember("analytics:timeseries:v{$v}:{$workspaceId}:{$from}:{$to}:{$campaignId}:{$channel}", 30, function () use ($workspaceId, $from, $to, $campaignId, $channel): array {
            $series = [];
            $definitions = [
                'projects' => ['projects', 'created_at'],
                'campaigns' => ['campaigns', 'start_date'],
                'tasks' => ['tasks', 'due_date'],
                'leads' => ['crm_leads', 'created_at'],
                'income' => ['finance_transactions', 'occurred_on'],
                'expenses' => ['finance_transactions', 'occurred_on'],
                'spend' => ['finance_transactions', 'occurred_on'],
                'customers' => ['crm_customers', 'created_at'],
                'orders' => ['sales_orders', 'created_at'],
            ];

            foreach ($definitions as $name => [$table, $dateColumn]) {
                $hasAdTx = false;
                if ($name === 'spend') {
                    $hasAdTx = $this->supports('finance_transactions', 'workspace_id', 'occurred_on', 'type', 'category', 'amount') &&
                        DB::table('finance_transactions')
                            ->where('workspace_id', $workspaceId)
                            ->where('type', 'expense')
                            ->where(function (Builder $q): void {
                                $q->where('category', 'like', '%Advertising%')
                                    ->orWhere('category', 'like', '%Marketing%');
                            })->exists();

                    if (! $hasAdTx) {
                        $table = 'campaigns';
                        $dateColumn = 'start_date';
                    }
                }

                if ($name === 'customers') {
                    $hasCrm = $this->supports('crm_customers', 'workspace_id', 'created_at') &&
                        DB::table('crm_customers')->where('workspace_id', $workspaceId)->exists();
                    if (! $hasCrm && $this->supports('sales_customers', 'workspace_id', 'created_at')) {
                        $table = 'sales_customers';
                        $dateColumn = 'created_at';
                    }
                }

                $requiredColumns = [$table, 'workspace_id', $dateColumn];
                if ($name === 'spend' && ! $hasAdTx) {
                    $requiredColumns[] = 'spend';
                }
                if (! $this->supports(...$requiredColumns)) {
                    $series[$name] = null;

                    continue;
                }

                $query = DB::table($table)->where('workspace_id', $workspaceId);
                $this->dateRange($query, $dateColumn, $from, $to);

                if ($name === 'income' || $name === 'expenses') {
                    $query->where('type', $name === 'income' ? 'income' : 'expense');
                } elseif ($name === 'spend') {
                    if ($hasAdTx) {
                        $query->where('type', 'expense')
                            ->where(function (Builder $q): void {
                                $q->where('category', 'like', '%Advertising%')
                                    ->orWhere('category', 'like', '%Marketing%');
                            });
                        if (! empty($campaignId) && $campaignId !== 'all') {
                            $query->where('campaign_id', $campaignId);
                        }
                    }
                } elseif ($name === 'leads') {
                    if (! empty($campaignId) && $campaignId !== 'all' && $this->supports('crm_leads', 'source_campaign_id')) {
                        $query->where('source_campaign_id', $campaignId);
                    }
                }

                $select = [$table.'.workspace_id'];
                $select[] = DB::raw('DATE('.$dateColumn.') as period');
                if ($name === 'income' || $name === 'expenses') {
                    $select[] = DB::raw('SUM(amount) as value');
                } elseif ($name === 'spend') {
                    $select[] = DB::raw($hasAdTx ? 'SUM(amount) as value' : 'SUM(spend) as value');
                } else {
                    $select[] = DB::raw('COUNT(*) as value');
                }

                $series[$name] = $query->select($select)
                    ->groupBy($table.'.workspace_id', DB::raw('DATE('.$dateColumn.')'))
                    ->orderBy('period')
                    ->get()
                    ->map(fn (object $row): array => [
                        'date' => (string) $row->period,
                        'value' => (float) $row->value,
                    ])->values()->all();
            }

            return ['series' => $series];
        });

        self::$memoCache[$cacheKey] = ['expires_at' => $now + 30.0, 'data' => $result];

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    private function taskMetrics(string $workspaceId, ?string $from, ?string $to): ?array
    {
        if (! $this->supports('tasks', 'workspace_id', 'due_date', 'status')) {
            return null;
        }

        $query = DB::table('tasks')->where('workspace_id', $workspaceId);
        $this->dateRange($query, 'due_date', $from, $to);
        $totals = $query->selectRaw(
            'COUNT(*) as total, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed',
            ['Completed']
        )->first();

        $total = (int) ($totals->total ?? 0);
        $completed = (int) ($totals->completed ?? 0);

        return [
            'total' => $total,
            'completed' => $completed,
            'incomplete' => $total - $completed,
            'completion_rate' => $total === 0 ? null : round($completed / $total * 100, 2),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function crmMetrics(string $workspaceId, ?string $from, ?string $to, ?string $campaignId = null): ?array
    {
        if (! $this->supports('crm_leads', 'workspace_id', 'created_at', 'status')) {
            return null;
        }

        $leads = DB::table('crm_leads')->where('workspace_id', $workspaceId);
        $this->dateRange($leads, 'created_at', $from, $to);
        if (! empty($campaignId) && $campaignId !== 'all' && $this->supports('crm_leads', 'source_campaign_id')) {
            $leads->where('source_campaign_id', $campaignId);
        }
        $leadCounts = (clone $leads)->selectRaw(
            'COUNT(*) as total, SUM(CASE WHEN status = ? OR converted_at IS NOT NULL THEN 1 ELSE 0 END) as converted',
            ['Converted']
        )->first();
        $total = (int) ($leadCounts->total ?? 0);
        $converted = (int) ($leadCounts->converted ?? 0);
        $funnel = (clone $leads)
            ->select('status')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('status')
            ->orderBy('status')
            ->get()
            ->map(fn (object $row): array => ['status' => $row->status, 'count' => (int) $row->total])
            ->values()->all();

        $customers = null;
        if ($this->supports('crm_customers', 'workspace_id', 'created_at')) {
            $customerQuery = DB::table('crm_customers')->where('workspace_id', $workspaceId);
            $this->dateRange($customerQuery, 'created_at', $from, $to);
            if (! empty($campaignId) && $campaignId !== 'all' && $this->supports('crm_customers', 'lead_id') && $this->supports('crm_leads', 'source_campaign_id')) {
                $customerQuery->whereIn('lead_id', function (Builder $q) use ($workspaceId, $campaignId): void {
                    $q->select('id')->from('crm_leads')->where('workspace_id', $workspaceId)->where('source_campaign_id', $campaignId);
                });
            }
            $customers = (int) $customerQuery->count();
        }

        return [
            'leads' => $total,
            'converted_leads' => $converted,
            'conversion_rate' => $total === 0 ? null : round($converted / $total * 100, 2),
            'funnel' => $funnel,
            'customers' => $customers,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function campaignFinancials(string $workspaceId, ?string $from, ?string $to): ?array
    {
        if (! $this->supports('campaigns', 'workspace_id', 'budget', 'spend', 'revenue', 'start_date')) {
            return null;
        }

        $query = DB::table('campaigns')->where('workspace_id', $workspaceId);
        if ($this->supports('campaigns', 'end_date')) {
            if ($from !== null) {
                $query->where(function (Builder $q) use ($from): void {
                    $q->whereNull('end_date')->orWhereDate('end_date', '>=', $from);
                });
            }
            if ($to !== null) {
                $query->whereDate('start_date', '<=', $to);
            }
        } else {
            $this->dateRange($query, 'start_date', $from, $to);
        }
        $totals = $query->selectRaw('COALESCE(SUM(budget), 0) as budget, COALESCE(SUM(spend), 0) as spend, COALESCE(SUM(revenue), 0) as revenue')->first();

        return [
            'budget' => $totals->budget,
            'spend' => $totals->spend,
            'revenue' => $totals->revenue,
            'return_on_spend' => (float) $totals->spend === 0.0 ? null : round((float) $totals->revenue / (float) $totals->spend, 4),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function financeMetrics(string $workspaceId, ?string $from, ?string $to): ?array
    {
        if (! $this->supports('finance_transactions', 'workspace_id', 'type', 'amount', 'occurred_on')) {
            return null;
        }

        $query = DB::table('finance_transactions')->where('workspace_id', $workspaceId);
        $this->dateRange($query, 'occurred_on', $from, $to);
        $totals = $query->selectRaw(
            'COALESCE(SUM(CASE WHEN type = ? THEN amount ELSE 0 END), 0) as income, COALESCE(SUM(CASE WHEN type = ? THEN amount ELSE 0 END), 0) as expenses',
            ['income', 'expense']
        )->first();
        $income = (float) $totals->income;
        $expenses = (float) $totals->expenses;
        $budgetedExpenses = null;

        if ($this->supports('finance_budgets', 'workspace_id', 'amount', 'starts_on', 'ends_on')) {
            $budgets = DB::table('finance_budgets')->where('workspace_id', $workspaceId);
            if ($from !== null) {
                $budgets->whereDate('ends_on', '>=', $from);
            }
            if ($to !== null) {
                $budgets->whereDate('starts_on', '<=', $to);
            }
            $budgetedExpenses = $budgets->sum('amount');
        }

        return [
            'income' => $totals->income,
            'expenses' => $totals->expenses,
            'profit' => round($income - $expenses, 2),
            'budgeted_expenses' => $budgetedExpenses,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function advertisingMetrics(
        string $workspaceId,
        ?string $from,
        ?string $to,
        ?string $campaignId = null,
        ?string $channel = null,
    ): ?array {
        if (! $this->supports('finance_transactions', 'workspace_id', 'type', 'category', 'amount', 'occurred_on')) {
            return null;
        }

        $query = DB::table('finance_transactions')
            ->where('workspace_id', $workspaceId)
            ->where('type', 'expense')
            ->where(function (Builder $q): void {
                $q->where('category', 'like', '%Advertising%')
                    ->orWhere('category', 'like', '%Marketing%');
            });

        $this->dateRange($query, 'occurred_on', $from, $to);
        $allTransactions = (clone $query)->get(['amount', 'campaign_id', 'description']);

        $totalSpend = 0.0;
        $attributedSpend = 0.0;
        $unattributedSpend = 0.0;
        $filteredSpend = 0.0;
        $channelBreakdown = [];

        foreach ($allTransactions as $tx) {
            $amount = (float) $tx->amount;
            $txCampaignId = $tx->campaign_id ?? null;
            $desc = (string) ($tx->description ?? '');

            $txChannel = 'Unspecified';
            if (stripos($desc, 'meta') !== false || stripos($desc, 'facebook') !== false || stripos($desc, 'instagram') !== false) {
                $txChannel = 'Meta Ads';
            } elseif (stripos($desc, 'google') !== false) {
                $txChannel = 'Google Ads';
            } elseif (stripos($desc, 'tiktok') !== false) {
                $txChannel = 'TikTok Ads';
            }

            $isAttributed = ! empty($txCampaignId);
            $totalSpend += $amount;
            if ($isAttributed) {
                $attributedSpend += $amount;
            } else {
                $unattributedSpend += $amount;
            }

            $matchesCampaign = empty($campaignId) || $campaignId === 'all' || $txCampaignId === $campaignId;
            $matchesChannel = empty($channel) || $channel === 'all' || strcasecmp($txChannel, $channel) === 0;

            if ($matchesCampaign && $matchesChannel) {
                // When filtering by a specific campaign, only transactions with matching campaign_id count
                if (! empty($campaignId) && $campaignId !== 'all' && ! $isAttributed) {
                    // Unattributed does not count towards a specific campaign
                } else {
                    $filteredSpend += $amount;
                }
            }

            if (! isset($channelBreakdown[$txChannel])) {
                $channelBreakdown[$txChannel] = [
                    'channel' => $txChannel,
                    'spend' => 0.0,
                    'attributed_spend' => 0.0,
                    'unattributed_spend' => 0.0,
                    'transaction_count' => 0,
                ];
            }
            $channelBreakdown[$txChannel]['spend'] += $amount;
            if ($isAttributed) {
                $channelBreakdown[$txChannel]['attributed_spend'] += $amount;
            } else {
                $channelBreakdown[$txChannel]['unattributed_spend'] += $amount;
            }
            $channelBreakdown[$txChannel]['transaction_count']++;
        }

        $plannedBudget = null;
        if ($this->supports('finance_budgets', 'workspace_id', 'amount', 'category', 'starts_on', 'ends_on')) {
            $budgetQuery = DB::table('finance_budgets')
                ->where('workspace_id', $workspaceId)
                ->where(function (Builder $q): void {
                    $q->where('category', 'like', '%Advertising%')
                        ->orWhere('category', 'like', '%Marketing%');
                });
            if ($from !== null) {
                $budgetQuery->whereDate('ends_on', '>=', $from);
            }
            if ($to !== null) {
                $budgetQuery->whereDate('starts_on', '<=', $to);
            }
            $plannedBudget = (float) ($budgetQuery->sum('amount') ?? 0);
        }

        return [
            'spend' => round($filteredSpend, 2),
            'workspace_total_spend' => round($totalSpend, 2),
            'attributed_spend' => round($attributedSpend, 2),
            'unattributed_spend' => round($unattributedSpend, 2),
            'budget' => $plannedBudget,
            'transaction_count' => count($allTransactions),
            'channel_breakdown' => array_values($channelBreakdown),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function salesMetrics(
        string $workspaceId,
        ?string $from,
        ?string $to,
        ?string $campaignId = null,
    ): ?array {
        $hasOrders = $this->supports('sales_orders', 'workspace_id', 'status', 'total', 'created_at');
        $hasFinance = $this->supports('finance_transactions', 'workspace_id', 'type', 'category', 'amount', 'occurred_on');

        if (! $hasOrders && ! $hasFinance) {
            return null;
        }

        $totalOrders = 0;
        $deliveredOrders = 0;
        $pendingOrders = 0;
        $operationalOrderTotal = 0.0;
        $deliveredOrderTotal = 0.0;
        $pendingOrderTotal = 0.0;

        if ($hasOrders) {
            $orderQuery = DB::table('sales_orders')->where('workspace_id', $workspaceId);
            $this->dateRange($orderQuery, 'created_at', $from, $to);
            $orders = $orderQuery->get(['id', 'status', 'total']);
            $totalOrders = $orders->count();
            foreach ($orders as $o) {
                $val = (float) $o->total;
                $operationalOrderTotal += $val;
                if (strcasecmp((string) $o->status, 'Delivered') === 0) {
                    $deliveredOrders++;
                    $deliveredOrderTotal += $val;
                } elseif (strcasecmp((string) $o->status, 'Pending') === 0) {
                    $pendingOrders++;
                    $pendingOrderTotal += $val;
                }
            }
        }

        $salesRevenue = 0.0;
        $productionCosts = 0.0;
        $deliveryCosts = 0.0;
        $returnsCosts = 0.0;

        if ($hasFinance) {
            $financeQuery = DB::table('finance_transactions')->where('workspace_id', $workspaceId);
            $this->dateRange($financeQuery, 'occurred_on', $from, $to);
            $transactions = $financeQuery->get(['type', 'category', 'amount']);
            foreach ($transactions as $tx) {
                $amount = (float) $tx->amount;
                $cat = (string) $tx->category;
                $type = (string) $tx->type;
                if ($type === 'income' && strcasecmp($cat, 'Sales Revenue') === 0) {
                    $salesRevenue += $amount;
                } elseif ($type === 'expense') {
                    if (stripos($cat, 'Cost of Goods') !== false || stripos($cat, 'Production') !== false) {
                        $productionCosts += $amount;
                    } elseif (stripos($cat, 'Delivery') !== false || stripos($cat, 'Shipping') !== false) {
                        $deliveryCosts += $amount;
                    } elseif (stripos($cat, 'Return') !== false || stripos($cat, 'Adjustment') !== false) {
                        $returnsCosts += $amount;
                    }
                }
            }
        }

        $customersCount = 0;
        if ($this->supports('sales_customers', 'workspace_id', 'created_at')) {
            $custQuery = DB::table('sales_customers')->where('workspace_id', $workspaceId);
            $this->dateRange($custQuery, 'created_at', $from, $to);
            $customersCount = $custQuery->count();
        }

        $totalExpenses = $productionCosts + $deliveryCosts + $returnsCosts;
        $realizedNetProfit = round($salesRevenue - $totalExpenses, 2);

        return [
            'total_orders' => $totalOrders,
            'delivered_orders' => $deliveredOrders,
            'pending_orders' => $pendingOrders,
            'operational_order_total' => round($operationalOrderTotal, 2),
            'delivered_order_total' => round($deliveredOrderTotal, 2),
            'pending_order_total' => round($pendingOrderTotal, 2),
            'sales_revenue' => round($salesRevenue, 2),
            'production_costs' => round($productionCosts, 2),
            'delivery_costs' => round($deliveryCosts, 2),
            'returns_costs' => round($returnsCosts, 2),
            'realized_net_profit' => $realizedNetProfit,
            'customers_count' => $customersCount,
        ];
    }

    private function countMetric(string $table, string $workspaceId, string $dateColumn, ?string $from, ?string $to): ?int
    {
        if (! $this->supports($table, 'workspace_id', $dateColumn)) {
            return null;
        }

        $query = DB::table($table)->where('workspace_id', $workspaceId);
        $this->dateRange($query, $dateColumn, $from, $to);

        return (int) $query->count();
    }

    /**
     * Known tables and columns defined in repository migrations.
     * Pre-populated to avoid all pg_catalog introspection roundtrips.
     *
     * @var array<string, array<string, int>>
     */
    private static array $knownTableColumns = [
        'projects' => ['id' => 1, 'workspace_id' => 1, 'created_by' => 1, 'name' => 1, 'description' => 1, 'status' => 1, 'start_date' => 1, 'end_date' => 1, 'progress' => 1, 'created_at' => 1, 'updated_at' => 1],
        'campaigns' => ['id' => 1, 'workspace_id' => 1, 'project_id' => 1, 'created_by' => 1, 'name' => 1, 'description' => 1, 'status' => 1, 'platform' => 1, 'channel' => 1, 'objective' => 1, 'start_date' => 1, 'end_date' => 1, 'budget' => 1, 'spend' => 1, 'leads' => 1, 'customers' => 1, 'revenue' => 1, 'created_at' => 1, 'updated_at' => 1],
        'tasks' => ['id' => 1, 'workspace_id' => 1, 'project_id' => 1, 'campaign_id' => 1, 'created_by' => 1, 'assignee_id' => 1, 'title' => 1, 'description' => 1, 'status' => 1, 'priority' => 1, 'due_date' => 1, 'created_at' => 1, 'updated_at' => 1],
        'crm_leads' => ['id' => 1, 'workspace_id' => 1, 'contact_id' => 1, 'pipeline_id' => 1, 'stage_id' => 1, 'name' => 1, 'company' => 1, 'email' => 1, 'phone' => 1, 'status' => 1, 'source' => 1, 'source_campaign_id' => 1, 'source_campaign_name' => 1, 'related_project_id' => 1, 'related_project_name' => 1, 'estimated_value' => 1, 'currency' => 1, 'owner_id' => 1, 'preferred_contact' => 1, 'location' => 1, 'next_follow_up_at' => 1, 'converted_at' => 1, 'converted_to_customer_id' => 1, 'internal_notes' => 1, 'created_at' => 1, 'updated_at' => 1],
        'crm_customers' => ['id' => 1, 'workspace_id' => 1, 'contact_id' => 1, 'lead_id' => 1, 'company_name' => 1, 'contact_name' => 1, 'email' => 1, 'phone' => 1, 'status' => 1, 'customer_tier' => 1, 'total_revenue' => 1, 'currency' => 1, 'owner_id' => 1, 'converted_at' => 1, 'notes' => 1, 'created_at' => 1, 'updated_at' => 1],
        'finance_transactions' => ['id' => 1, 'workspace_id' => 1, 'created_by' => 1, 'type' => 1, 'category' => 1, 'description' => 1, 'amount' => 1, 'occurred_on' => 1, 'campaign_id' => 1, 'order_id' => 1, 'created_at' => 1, 'updated_at' => 1],
        'finance_budgets' => ['id' => 1, 'workspace_id' => 1, 'created_by' => 1, 'name' => 1, 'category' => 1, 'amount' => 1, 'starts_on' => 1, 'ends_on' => 1, 'notes' => 1, 'created_at' => 1, 'updated_at' => 1],
        'sales_orders' => ['id' => 1, 'workspace_id' => 1, 'customer_id' => 1, 'order_number' => 1, 'status' => 1, 'payment_status' => 1, 'subtotal' => 1, 'total' => 1, 'currency' => 1, 'items' => 1, 'source' => 1, 'notes' => 1, 'created_at' => 1, 'updated_at' => 1],
        'sales_customers' => ['id' => 1, 'workspace_id' => 1, 'first_name' => 1, 'last_name' => 1, 'email' => 1, 'phone' => 1, 'address' => 1, 'created_at' => 1, 'updated_at' => 1],
        'sales_shipments' => ['id' => 1, 'workspace_id' => 1, 'order_id' => 1, 'delivery_company_id' => 1, 'tracking_number' => 1, 'shipping_cost' => 1, 'customer_shipping_charge' => 1, 'cod_amount' => 1, 'status' => 1, 'payment_collection_status' => 1, 'created_at' => 1, 'updated_at' => 1],
    ];

    /**
     * In-memory cache for dynamic table columns.
     *
     * @var array<string, array<string, int>|null>
     */
    private static array $tableColumnsCache = [];

    public static function clearSchemaCache(): void
    {
        self::$tableColumnsCache = [];
        self::$memoCache = [];
    }

    private function supports(string $table, string ...$columns): bool
    {
        if (isset(self::$knownTableColumns[$table])) {
            $tableCols = self::$knownTableColumns[$table];
            foreach ($columns as $column) {
                if (! isset($tableCols[$column])) {
                    return false;
                }
            }

            return true;
        }

        if (! array_key_exists($table, self::$tableColumnsCache)) {
            if (! Schema::hasTable($table)) {
                self::$tableColumnsCache[$table] = null;
            } else {
                self::$tableColumnsCache[$table] = array_flip(Schema::getColumnListing($table));
            }
        }

        $tableCols = self::$tableColumnsCache[$table];
        if ($tableCols === null) {
            return false;
        }

        foreach ($columns as $column) {
            if (! isset($tableCols[$column])) {
                return false;
            }
        }

        return true;
    }

    private function dateRange(Builder $query, string $column, ?string $from, ?string $to): void
    {
        if ($from !== null) {
            $fromValue = (strlen($from) === 10 && $this->isTimestampColumn($column)) ? $from.' 00:00:00' : $from;
            $query->where($column, '>=', $fromValue);
        }
        if ($to !== null) {
            $toValue = (strlen($to) === 10 && $this->isTimestampColumn($column)) ? $to.' 23:59:59.999999' : $to;
            $query->where($column, '<=', $toValue);
        }
    }

    private function isTimestampColumn(string $column): bool
    {
        return in_array($column, ['created_at', 'updated_at', 'converted_at', 'read_at'], true);
    }
}
