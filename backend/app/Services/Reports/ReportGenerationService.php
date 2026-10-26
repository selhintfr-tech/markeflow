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
            'crm' => $this->analytics->overview($workspaceId, $from, $to)['crm'],
            'finance' => $this->financeRows($workspaceId, $from, $to, $report->filters ?? []),
            'projects' => $this->projectRows($workspaceId, $from, $to, $report->filters ?? []),
        };
        $metrics = $report->configuration['metrics'] ?? [];
        if (is_array($metrics) && $metrics !== []) {
            $data = $this->selectMetrics($report->type, $data, $metrics);
        }

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
        if (! $this->supports('campaigns', 'workspace_id', 'id', 'name', 'status', 'platform', 'start_date', 'end_date', 'budget', 'spend', 'leads', 'customers', 'revenue')) {
            return null;
        }

        $query = DB::table('campaigns')->where('workspace_id', $workspaceId);
        if ($from !== null) {
            $query->where(function (Builder $q) use ($from): void {
                $q->whereNull('end_date')->orWhereDate('end_date', '>=', $from);
            });
        }
        if ($to !== null) {
            $query->whereDate('start_date', '<=', $to);
        }
        $query->when($filters['campaign_id'] ?? null, fn ($builder, string $campaignId) => $builder->where('id', $campaignId))
            ->when($filters['status'] ?? null, fn ($builder, string $status) => $builder->where('status', $status))
            ->when($filters['project_id'] ?? null, fn ($builder, string $projectId) => $builder->where('project_id', $projectId));

        return $query->orderBy('start_date')->get([
            'id', 'name', 'status', 'platform', 'start_date', 'end_date', 'budget', 'spend', 'leads', 'customers', 'revenue',
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

    /**
     * @return array<string, mixed>|null
     */
    private function projectRows(string $workspaceId, ?string $from, ?string $to, array $filters): ?array
    {
        if (! $this->supports('projects', 'workspace_id', 'id', 'name', 'status', 'start_date', 'end_date', 'progress')) {
            return null;
        }

        $query = DB::table('projects')->where('workspace_id', $workspaceId);
        $this->dateRange($query, 'start_date', $from, $to);
        $query->when($filters['project_id'] ?? null, fn ($builder, string $projectId) => $builder->where('id', $projectId))
            ->when($filters['status'] ?? null, fn ($builder, string $status) => $builder->where('status', $status));

        return $query->orderBy('start_date')->get([
            'id', 'name', 'status', 'start_date', 'end_date', 'progress',
        ])->map(fn (object $project): array => (array) $project)->all();
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

    /**
     * Known tables and columns defined in repository migrations.
     * Pre-populated to avoid all pg_catalog introspection roundtrips.
     *
     * @var array<string, array<string, int>>
     */
    private static array $knownTableColumns = [
        'campaigns' => ['id' => 1, 'workspace_id' => 1, 'project_id' => 1, 'name' => 1, 'status' => 1, 'platform' => 1, 'start_date' => 1, 'end_date' => 1, 'budget' => 1, 'spend' => 1, 'leads' => 1, 'customers' => 1, 'revenue' => 1],
        'projects' => ['id' => 1, 'workspace_id' => 1, 'name' => 1, 'status' => 1, 'start_date' => 1, 'end_date' => 1, 'progress' => 1],
        'tasks' => ['id' => 1, 'workspace_id' => 1, 'project_id' => 1, 'campaign_id' => 1, 'status' => 1, 'due_date' => 1],
        'finance_transactions' => ['id' => 1, 'workspace_id' => 1, 'occurred_on' => 1, 'type' => 1, 'category' => 1, 'amount' => 1],
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

    /**
     * @param  array<mixed>  $metrics
     * @return array<mixed>|null
     */
    private function selectMetrics(string $type, ?array $data, array $metrics): ?array
    {
        if ($data === null) {
            return null;
        }
        $selected = array_fill_keys(array_filter($metrics, 'is_string'), true);

        if ($type === 'timeseries' && isset($data['series']) && is_array($data['series'])) {
            $data['series'] = array_intersect_key($data['series'], $selected);

            return $data;
        }
        if (array_is_list($data)) {
            $dimensions = ['id', 'name', 'status', 'type', 'category', 'date', 'start_date', 'end_date', 'platform'];

            return array_map(
                fn (array $row): array => array_intersect_key($row, $selected + array_fill_keys($dimensions, true)),
                $data
            );
        }

        return array_intersect_key($data, $selected);
    }
}
