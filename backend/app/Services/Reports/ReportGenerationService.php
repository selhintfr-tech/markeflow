<?php

namespace App\Services\Reports;

use App\Models\SavedReport;
use App\Services\Analytics\WorkspaceAnalyticsService;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ReportGenerationService
{
    public function __construct(private readonly WorkspaceAnalyticsService $analytics) {}

    /**
     * Generate a current JSON result from persisted workspace data; no result is stored in the definition.
     *
     * @return array<string, mixed>
     */
    public function generate(SavedReport $report): array
    {
        $workspaceId = $report->workspace_id;
        $from = $report->from_date?->toDateString();
        $to = $report->to_date?->toDateString();

        $data = match ($report->type) {
            'overview' => $this->analytics->overview($workspaceId, $from, $to),
            'timeseries' => $this->analytics->timeSeries($workspaceId, $from, $to),
            'campaigns' => $this->campaignRows($workspaceId, $from, $to, $report->filters ?? []),
            'tasks' => $this->groupedRows('tasks', $workspaceId, 'status', 'due_date', $from, $to, $report->filters ?? []),
            'crm' => $this->groupedRows('crm_leads', $workspaceId, 'status', 'created_at', $from, $to, $report->filters ?? []),
            'finance' => $this->financeRows($workspaceId, $from, $to, $report->filters ?? []),
        };

        return [
            'report' => ['id' => $report->id, 'name' => $report->name, 'type' => $report->type],
            'period' => ['from' => $from, 'to' => $to],
            'generated_at' => now()->toIso8601String(),
            'data' => $data,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function campaignRows(string $workspaceId, ?string $from, ?string $to, array $filters): ?array
    {
        if (! $this->supports('campaigns', 'workspace_id', 'id', 'name', 'status', 'start_date', 'end_date', 'budget', 'spend', 'leads', 'customers', 'revenue')) {
            return null;
        }

        $query = DB::table('campaigns')->where('workspace_id', $workspaceId);
        $this->dateRange($query, 'start_date', $from, $to);
        $query->when($filters['status'] ?? null, fn ($builder, string $status) => $builder->where('status', $status))
            ->when($filters['project_id'] ?? null, fn ($builder, string $projectId) => $builder->where('project_id', $projectId));

        return $query->orderBy('start_date')->get([
            'id', 'name', 'status', 'start_date', 'end_date', 'budget', 'spend', 'leads', 'customers', 'revenue',
        ])->map(fn (object $campaign): array => (array) $campaign)->all();
    }

    /**
     * @return array<string, mixed>|null
     */
    private function groupedRows(string $table, string $workspaceId, string $groupColumn, string $dateColumn, ?string $from, ?string $to, array $filters): ?array
    {
        if (! $this->supports($table, 'workspace_id', $groupColumn, $dateColumn)) {
            return null;
        }

        $query = DB::table($table)->where('workspace_id', $workspaceId);
        $this->dateRange($query, $dateColumn, $from, $to);
        $query->when($filters['status'] ?? null, fn ($builder, string $status) => $builder->where($groupColumn, $status));

        return $query->select($groupColumn)->selectRaw('COUNT(*) as count')
            ->groupBy($groupColumn)->orderBy($groupColumn)->get()
            ->map(fn (object $row): array => [$groupColumn => $row->{$groupColumn}, 'count' => (int) $row->count])
            ->all();
    }

    /**
     * @return array<string, mixed>|null
     */
    private function financeRows(string $workspaceId, ?string $from, ?string $to, array $filters): ?array
    {
        if (! $this->supports('finance_transactions', 'workspace_id', 'occurred_on', 'type', 'category', 'amount')) {
            return null;
        }
        $query = DB::table('finance_transactions')->where('workspace_id', $workspaceId);
        $this->dateRange($query, 'occurred_on', $from, $to);
        $query->when($filters['type'] ?? null, fn ($builder, string $type) => $builder->where('type', $type))
            ->when($filters['category'] ?? null, fn ($builder, string $category) => $builder->where('category', $category));

        return $query->select('type', 'category')
            ->selectRaw('COUNT(*) as transactions, SUM(amount) as total')
            ->groupBy('type', 'category')
            ->orderBy('type')->orderBy('category')
            ->get()
            ->map(fn (object $row): array => [
                'type' => $row->type,
                'category' => $row->category,
                'transactions' => (int) $row->transactions,
                'total' => $row->total,
            ])->all();
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
}
