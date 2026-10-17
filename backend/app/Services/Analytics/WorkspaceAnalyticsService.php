<?php

namespace App\Services\Analytics;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class WorkspaceAnalyticsService
{
    /**
     * Aggregate workspace records by their source date, avoiding application-side row loading.
     *
     * @return array<string, mixed>
     */
    public function overview(string $workspaceId, ?string $from = null, ?string $to = null): array
    {
        return [
            'projects' => $this->countMetric('projects', $workspaceId, 'created_at', $from, $to),
            'campaigns' => $this->countMetric('campaigns', $workspaceId, 'start_date', $from, $to),
            'tasks' => $this->taskMetrics($workspaceId, $from, $to),
            'crm' => $this->crmMetrics($workspaceId, $from, $to),
            'campaign_financials' => $this->campaignFinancials($workspaceId, $from, $to),
            'finance' => $this->financeMetrics($workspaceId, $from, $to),
            'definitions' => [
                'date_filter' => 'Each source is filtered using its documented event date: project created_at, campaign start_date, task due_date, CRM created_at/converted_at, finance occurred_on.',
                'task_completion' => 'Completed tasks are tasks whose status is exactly Completed.',
                'lead_conversion' => 'Converted leads are leads whose status is Converted or whose converted_at timestamp is set.',
                'financial_profit' => 'Profit is recorded income minus recorded expenses; campaign revenue/spend are stored campaign fields and are separate from finance transactions.',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function timeSeries(string $workspaceId, ?string $from = null, ?string $to = null): array
    {
        $series = [];
        foreach ([
            'projects' => ['projects', 'created_at'],
            'campaigns' => ['campaigns', 'start_date'],
            'tasks' => ['tasks', 'due_date'],
            'leads' => ['crm_leads', 'created_at'],
            'income' => ['finance_transactions', 'occurred_on'],
            'expenses' => ['finance_transactions', 'occurred_on'],
        ] as $name => [$table, $dateColumn]) {
            if (! $this->supports($table, 'workspace_id', $dateColumn)) {
                $series[$name] = null;

                continue;
            }

            $query = DB::table($table)->where('workspace_id', $workspaceId);
            $this->dateRange($query, $dateColumn, $from, $to);
            if ($name === 'income' || $name === 'expenses') {
                $query->where('type', $name === 'income' ? 'income' : 'expense');
            }

            $select = [$table.'.workspace_id'];
            $select[] = DB::raw('DATE('.$dateColumn.') as period');
            if ($name === 'income' || $name === 'expenses') {
                $select[] = DB::raw('SUM(amount) as value');
            } else {
                $select[] = DB::raw('COUNT(*) as value');
            }
            $series[$name] = $query->select($select)
                ->groupBy($table.'.workspace_id', DB::raw('DATE('.$dateColumn.')'))
                ->orderBy('period')
                ->get()
                ->map(fn (object $row): array => [
                    'date' => (string) $row->period,
                    'value' => $row->value,
                ])->values()->all();
        }

        return ['series' => $series];
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
    private function crmMetrics(string $workspaceId, ?string $from, ?string $to): ?array
    {
        if (! $this->supports('crm_leads', 'workspace_id', 'created_at', 'status')) {
            return null;
        }

        $leads = DB::table('crm_leads')->where('workspace_id', $workspaceId);
        $this->dateRange($leads, 'created_at', $from, $to);
        $total = (clone $leads)->count();
        $converted = (clone $leads)
            ->where(function (Builder $query): void {
                $query->where('status', 'Converted')->orWhereNotNull('converted_at');
            })->count();
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
        $this->dateRange($query, 'start_date', $from, $to);
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

    private function countMetric(string $table, string $workspaceId, string $dateColumn, ?string $from, ?string $to): ?int
    {
        if (! $this->supports($table, 'workspace_id', $dateColumn)) {
            return null;
        }

        $query = DB::table($table)->where('workspace_id', $workspaceId);
        $this->dateRange($query, $dateColumn, $from, $to);

        return (int) $query->count();
    }

    private function supports(string $table, string ...$columns): bool
    {
        if (! Schema::hasTable($table)) {
            return false;
        }

        foreach ($columns as $column) {
            if (! Schema::hasColumn($table, $column)) {
                return false;
            }
        }

        return true;
    }

    private function dateRange(Builder $query, string $column, ?string $from, ?string $to): void
    {
        if ($from !== null) {
            $query->whereDate($column, '>=', $from);
        }
        if ($to !== null) {
            $query->whereDate($column, '<=', $to);
        }
    }
}
