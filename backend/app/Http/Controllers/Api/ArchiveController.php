<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ArchiveEntry;
use App\Models\Campaign;
use App\Models\Project;
use App\Services\TenantContext;
use App\Services\WorkspaceModuleAccessService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ArchiveController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly WorkspaceModuleAccessService $access,
    ) {}

    public function index(Request $request)
    {
        $this->access->authorize($request->user());
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'type' => ['sometimes', 'string', Rule::in(['Project', 'Campaign'])],
            'status' => ['sometimes', 'string', 'max:30'],
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $workspaceId = $this->tenantContext->getWorkspaceId();
        $archivedEntries = ArchiveEntry::query()
            ->where('workspace_id', $workspaceId)
            ->whereNull('restored_at')
            ->orderByDesc('archived_at')
            ->get()
            ->keyBy(fn (ArchiveEntry $entry): string => $entry->record_type.':'.$entry->record_id);

        $records = collect();
        if (! isset($filters['type']) || $filters['type'] === 'Project') {
            Project::query()->where('workspace_id', $workspaceId)->where('status', Project::STATUS_ARCHIVED)
                ->when($filters['search'] ?? null, fn ($query, string $search) => $query->where(fn ($nested) => $nested->where('name', 'like', '%'.$search.'%')->orWhere('description', 'like', '%'.$search.'%')))
                ->get()
                ->each(function (Project $project) use ($records, $archivedEntries): void {
                    $records->push($this->projectData($project, $archivedEntries->get('Project:'.$project->id)));
                });
        }
        if (! isset($filters['type']) || $filters['type'] === 'Campaign') {
            Campaign::query()->where('workspace_id', $workspaceId)->where('status', Campaign::STATUS_ARCHIVED)
                ->when($filters['search'] ?? null, fn ($query, string $search) => $query->where(fn ($nested) => $nested->where('name', 'like', '%'.$search.'%')->orWhere('description', 'like', '%'.$search.'%')))
                ->get()
                ->each(function (Campaign $campaign) use ($records, $archivedEntries): void {
                    $records->push($this->campaignData($campaign, $archivedEntries->get('Campaign:'.$campaign->id)));
                });
        }

        $records = $records->filter(function (array $record) use ($filters): bool {
            $archivedDate = substr($record['archivedAt'], 0, 10);

            return (! isset($filters['status']) || $record['previousStatus'] === $filters['status'])
                && (! isset($filters['from']) || $archivedDate >= $filters['from'])
                && (! isset($filters['to']) || $archivedDate <= $filters['to']);
        })->sortByDesc('archivedAt')->values();

        $page = $filters['page'] ?? 1;
        $perPage = $filters['per_page'] ?? 20;

        return response()->json([
            'data' => $records->forPage($page, $perPage)->values(),
            'meta' => [
                'current_page' => $page,
                'last_page' => max(1, (int) ceil($records->count() / $perPage)),
                'per_page' => $perPage,
                'total' => $records->count(),
            ],
        ]);
    }

    public function archive(Request $request, string $type, string $record)
    {
        $this->access->authorize($request->user(), true);
        $model = $this->findRecord($type, $record);
        abort_if($model->status === 'Archived', 409, 'This record is already archived.');

        $entry = DB::transaction(function () use ($model, $type, $record, $request): ArchiveEntry {
            $entry = ArchiveEntry::create([
                'workspace_id' => $this->tenantContext->getWorkspaceId(),
                'record_type' => $type,
                'record_id' => $record,
                'name' => $model->name,
                'subtitle' => $type === 'Project' ? ($model->description ?? '') : ($model->channel ?? ''),
                'previous_status' => $model->status,
                'description' => $model->description,
                'archived_by' => $request->user()->id,
                'archived_at' => now(),
            ]);
            $model->status = 'Archived';
            $model->save();

            return $entry;
        });

        return response()->json(['data' => ['id' => $entry->id, 'record_type' => $type, 'record_id' => $record]], 201);
    }

    public function restore(Request $request, string $type, string $record)
    {
        $this->access->authorize($request->user(), true);

        $restored = DB::transaction(function () use ($type, $record, $request): array {
            $model = $this->findRecord($type, $record, true);
            $entry = ArchiveEntry::query()
                ->where('workspace_id', $this->tenantContext->getWorkspaceId())
                ->where('record_type', $type)
                ->where('record_id', $record)
                ->whereNull('restored_at')
                ->orderByDesc('archived_at')
                ->lockForUpdate()
                ->first();
            $allowedStatuses = $type === 'Project'
                ? array_diff(Project::STATUSES, [Project::STATUS_ARCHIVED])
                : array_diff(Campaign::STATUSES, [Campaign::STATUS_ARCHIVED]);
            $previousStatus = $entry?->previous_status;
            if (! in_array($previousStatus, $allowedStatuses, true)) {
                $previousStatus = $type === 'Project' ? Project::STATUS_ACTIVE : Campaign::STATUS_ACTIVE;
            }
            $model->status = $previousStatus;
            $model->save();
            $entry?->forceFill(['restored_at' => now()])->save();

            return ['id' => $record, 'type' => $type, 'status' => $model->status, 'restored_by' => $request->user()->id];
        });

        return response()->json(['data' => $restored]);
    }

    private function findRecord(string $type, string $id, bool $mustBeArchived = false): Project|Campaign
    {
        abort_unless(in_array($type, ['Project', 'Campaign'], true), 404, 'Unsupported archive record type.');
        $modelClass = $type === 'Project' ? Project::class : Campaign::class;
        $query = $modelClass::query()->where('workspace_id', $this->tenantContext->getWorkspaceId());
        if ($mustBeArchived) {
            $query->where('status', 'Archived');
        }

        return $query->findOrFail($id);
    }

    private function projectData(Project $project, ?ArchiveEntry $entry): array
    {
        return [
            'id' => 'Project:'.$project->id,
            'recordId' => $project->id,
            'recordType' => 'Project',
            'name' => $project->name,
            'subtitle' => $project->description ?? '',
            'type' => 'Project',
            'category' => 'Projects',
            'workspace' => $this->tenantContext->getWorkspace()?->name ?? '',
            'archivedAt' => ($entry?->archived_at ?? $project->updated_at)->toIso8601String(),
            'archivedDate' => ($entry?->archived_at ?? $project->updated_at)->format('d M Y'),
            'archivedTime' => ($entry?->archived_at ?? $project->updated_at)->format('H:i'),
            'archivedBy' => $entry?->archivedBy?->name ?? 'Unknown',
            'previousStatus' => $entry?->previous_status ?? Project::STATUS_ACTIVE,
            'destination' => 'Projects',
            'description' => $entry?->description ?? $project->description,
        ];
    }

    private function campaignData(Campaign $campaign, ?ArchiveEntry $entry): array
    {
        return [
            'id' => 'Campaign:'.$campaign->id,
            'recordId' => $campaign->id,
            'recordType' => 'Campaign',
            'name' => $campaign->name,
            'subtitle' => $campaign->channel,
            'type' => 'Campaign',
            'category' => 'Campaigns',
            'workspace' => $this->tenantContext->getWorkspace()?->name ?? '',
            'archivedAt' => ($entry?->archived_at ?? $campaign->updated_at)->toIso8601String(),
            'archivedDate' => ($entry?->archived_at ?? $campaign->updated_at)->format('d M Y'),
            'archivedTime' => ($entry?->archived_at ?? $campaign->updated_at)->format('H:i'),
            'archivedBy' => $entry?->archivedBy?->name ?? 'Unknown',
            'previousStatus' => $entry?->previous_status ?? Campaign::STATUS_ACTIVE,
            'destination' => 'Campaigns',
            'description' => $entry?->description ?? $campaign->description,
        ];
    }
}