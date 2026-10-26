<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\StoreReportRequest;
use App\Http\Requests\Reports\UpdateReportRequest;
use App\Http\Resources\Api\SavedReportResource;
use App\Models\SavedReport;
use App\Services\Reports\ReportGenerationService;
use App\Services\TenantContext;
use App\Services\WorkspaceModuleAccessService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly WorkspaceModuleAccessService $access,
        private readonly ReportGenerationService $generation,
    ) {}

    public function index(Request $request)
    {
        $this->access->authorize($request->user());
        $filters = $request->validate([
            'type' => ['sometimes', 'string', 'in:overview,campaigns,tasks,crm,finance,timeseries,projects'],
            'status' => ['sometimes', 'string', 'in:Ready,In Review,Draft,Archived,Unassigned'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        return SavedReportResource::collection(
            SavedReport::query()
                ->with('creator:id,name')
                ->where('workspace_id', $this->tenantContext->getWorkspaceId())
                ->when($filters['type'] ?? null, fn ($query, string $type) => $query->where('type', $type))
                ->when($filters['status'] ?? null, function ($query, string $status): void {
                    if ($status === 'Unassigned') {
                        $query->whereNull('status');

                        return;
                    }

                    $query->where('status', $status);
                })
                ->orderByDesc('updated_at')
                ->paginate($filters['per_page'] ?? 15)
                ->withQueryString()
        );
    }

    public function store(StoreReportRequest $request)
    {
        $this->access->authorize($request->user(), true);
        $report = new SavedReport($request->validated());
        $report->workspace_id = $this->tenantContext->getWorkspaceId();
        $report->created_by = $request->user()->id;
        $report->status ??= 'Draft';
        $report->save();

        return (new SavedReportResource($report->load('creator:id,name')))->response()->setStatusCode(201);
    }

    public function show(Request $request, string $report)
    {
        $this->access->authorize($request->user());

        return new SavedReportResource($this->findReport($report)->load('creator:id,name'));
    }

    public function update(UpdateReportRequest $request, string $report)
    {
        $this->access->authorize($request->user(), true);
        $record = $this->findReport($report);
        $attributes = $request->validated();
        $from = $attributes['from_date'] ?? $record->from_date?->toDateString();
        $to = $attributes['to_date'] ?? $record->to_date?->toDateString();
        if ($from !== null && $to !== null && $to < $from) {
            throw ValidationException::withMessages([
                'to_date' => 'The to date must be on or after the from date.',
            ]);
        }
        $record->fill($attributes);
        $record->save();

        return new SavedReportResource($record->refresh()->load('creator:id,name'));
    }

    public function destroy(Request $request, string $report)
    {
        $this->access->authorize($request->user(), true);
        $this->findReport($report)->delete();

        return response()->json(['message' => 'Saved report deleted successfully.']);
    }

    public function run(Request $request, string $report)
    {
        $this->access->authorize($request->user());

        return response()->json(['data' => $this->generation->generate($this->findReport($report))]);
    }

    public function export(Request $request, string $report): StreamedResponse
    {
        $this->access->authorize($request->user());
        $definition = $this->findReport($report);
        $result = $this->generation->generate($definition);
        $rows = $this->csvRows($result['data']);

        return response()->streamDownload(function () use ($rows): void {
            $output = fopen('php://output', 'w');
            if ($output === false) {
                throw new \RuntimeException('Unable to open CSV output stream.');
            }
            fputcsv($output, ['metric', 'value']);
            foreach ($rows as [$metric, $value]) {
                fputcsv($output, [$metric, $value]);
            }
            fclose($output);
        }, 'report-'.$definition->id.'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function findReport(string $id): SavedReport
    {
        return SavedReport::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->findOrFail($id);
    }

    /**
     * @param  array<mixed>  $data
     * @return list<array{0: string, 1: string|int|float|null}>
     */
    private function csvRows(array $data, string $prefix = ''): array
    {
        $rows = [];
        foreach ($data as $key => $value) {
            $label = $prefix === '' ? (string) $key : $prefix.'.'.$key;
            if (is_array($value)) {
                if (array_is_list($value)) {
                    foreach ($value as $index => $item) {
                        if (is_array($item)) {
                            foreach ($item as $itemKey => $itemValue) {
                                $rows[] = [$label.'.'.$index.'.'.$itemKey, is_scalar($itemValue) || $itemValue === null ? $itemValue : json_encode($itemValue)];
                            }
                        } else {
                            $rows[] = [$label.'.'.$index, is_scalar($item) || $item === null ? $item : json_encode($item)];
                        }
                    }
                } else {
                    $rows = [...$rows, ...$this->csvRows($value, $label)];
                }
            } else {
                $rows[] = [$label, is_scalar($value) || $value === null ? $value : json_encode($value)];
            }
        }

        return $rows;
    }
}
