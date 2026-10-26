<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\StoreProjectRequest;
use App\Http\Requests\Projects\UpdateProjectRequest;
use App\Http\Resources\Api\ProjectResource;
use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Models\User;
use App\Models\WorkspaceUser;
use App\Models\WorkspaceAuditLog;
use App\Services\TenantContext;
use App\Services\WorkspaceAuthorizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProjectController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly WorkspaceAuthorizationService $authorizationService,
    ) {}

    public function index(Request $request)
    {
        $this->authorizeProjectAccess($request->user());

        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', 'string', Rule::in(Project::STATUSES)],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $projects = Project::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('name', 'like', '%'.$search.'%')
                        ->orWhere('description', 'like', '%'.$search.'%');
                });
            })
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->orderByDesc('created_at')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return ProjectResource::collection($projects);
    }

    public function store(StoreProjectRequest $request)
    {
        $this->authorizeProjectAccess($request->user(), true);

        $project = DB::transaction(function () use ($request): Project {
            $project = new Project($request->validated());
            $project->owner_id = $request->user()->id;
            $project->save();
            $this->logProjectActivity($request, $project, 'project.created', 'Project created');

            return $project;
        });

        return (new ProjectResource($project))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, string $project)
    {
        $this->authorizeProjectAccess($request->user());

        return new ProjectResource($this->findProject($project)->load(['owner:id,name', 'milestones', 'activities']));
    }

    public function update(UpdateProjectRequest $request, string $project)
    {
        $this->authorizeProjectAccess($request->user(), true);

        $record = $this->findProject($project);
        DB::transaction(function () use ($record, $request): void {
            $record->fill($request->validated());
            $changed = array_keys($record->getDirty());
            $record->save();
            if ($changed !== []) {
                $this->logProjectActivity($request, $record, 'project.updated', 'Project details updated', [
                    'fields' => $changed,
                ]);
            }
        });

        return new ProjectResource($record->refresh()->load(['owner:id,name', 'milestones', 'activities']));
    }

    public function destroy(Request $request, string $project)
    {
        $this->authorizeProjectAccess($request->user(), true);

        $record = $this->findProject($project);

        $tasksCount = DB::table('tasks')->where('project_id', $record->id)->count();
        $campaignsCount = DB::table('campaigns')->where('project_id', $record->id)->count();
        $strategiesCount = DB::table('marketing_strategies')->where('project_id', $record->id)->count();
        $leadsCount = DB::table('crm_leads')->where('related_project_id', $record->id)->count();
        $eventsCount = DB::table('calendar_events')->where('project_id', $record->id)->count();

        $reasons = [];
        if ($tasksCount > 0) {
            $reasons[] = "{$tasksCount} task(s)";
        }
        if ($campaignsCount > 0) {
            $reasons[] = "{$campaignsCount} campaign(s)";
        }
        if ($strategiesCount > 0) {
            $reasons[] = "{$strategiesCount} marketing strategy(ies)";
        }
        if ($leadsCount > 0) {
            $reasons[] = "{$leadsCount} CRM lead(s)";
        }
        if ($eventsCount > 0) {
            $reasons[] = "{$eventsCount} calendar event(s)";
        }

        if ($reasons !== []) {
            return response()->json([
                'message' => 'This project cannot be deleted because it is linked to ' . implode(', ', $reasons) . '. Please archive the project instead to preserve marketing history.',
                'code' => 'PROJECT_HAS_LINKED_RECORDS',
                'dependencies' => [
                    'tasks' => $tasksCount,
                    'campaigns' => $campaignsCount,
                    'strategies' => $strategiesCount,
                    'leads' => $leadsCount,
                    'calendar_events' => $eventsCount,
                ],
            ], 422);
        }

        DB::transaction(function () use ($record, $request): void {
            $this->logProjectActivity($request, $record, 'project.deleted', 'Project deleted');
            $record->delete();
        });

        return response()->json(['message' => 'Project deleted successfully.']);
    }

    public function storeMilestone(Request $request, string $project)
    {
        $this->authorizeProjectAccess($request->user(), true);
        $record = $this->findProject($project);
        $attributes = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'due_date' => ['nullable', 'date'],
            'status' => ['sometimes', Rule::in(ProjectMilestone::STATUSES)],
            'workspace_id' => ['prohibited'],
            'project_id' => ['prohibited'],
            'created_by' => ['prohibited'],
        ]);
        $attributes['status'] ??= ProjectMilestone::STATUS_PLANNED;
        $milestone = DB::transaction(function () use ($attributes, $record, $request): ProjectMilestone {
            $milestone = new ProjectMilestone($attributes);
            $milestone->workspace_id = $record->workspace_id;
            $milestone->created_by = $request->user()->id;
            $record->milestones()->save($milestone);
            $this->logProjectActivity($request, $record, 'project.milestone_created', 'Milestone created: '.$milestone->title);

            return $milestone;
        });

        return (new \App\Http\Resources\Api\ProjectMilestoneResource($milestone))
            ->response()
            ->setStatusCode(201);
    }

    public function updateMilestone(Request $request, string $project, string $milestone)
    {
        $this->authorizeProjectAccess($request->user(), true);
        $record = $this->findProject($project);
        $milestoneRecord = $record->milestones()->whereKey($milestone)->firstOrFail();
        $attributes = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'due_date' => ['sometimes', 'nullable', 'date'],
            'status' => ['sometimes', 'required', Rule::in(ProjectMilestone::STATUSES)],
            'workspace_id' => ['prohibited'],
            'project_id' => ['prohibited'],
            'created_by' => ['prohibited'],
        ]);
        DB::transaction(function () use ($attributes, $milestoneRecord, $record, $request): void {
            $milestoneRecord->fill($attributes);
            if (array_key_exists('status', $attributes)) {
                $milestoneRecord->completed_at = $attributes['status'] === ProjectMilestone::STATUS_COMPLETED
                    ? ($milestoneRecord->completed_at ?? now())
                    : null;
            }
            $milestoneRecord->save();
            $this->logProjectActivity($request, $record, 'project.milestone_updated', 'Milestone updated: '.$milestoneRecord->title);
        });

        return new \App\Http\Resources\Api\ProjectMilestoneResource($milestoneRecord->refresh());
    }

    public function destroyMilestone(Request $request, string $project, string $milestone)
    {
        $this->authorizeProjectAccess($request->user(), true);
        $record = $this->findProject($project);
        $milestoneRecord = $record->milestones()->whereKey($milestone)->firstOrFail();
        DB::transaction(function () use ($milestoneRecord, $record, $request): void {
            $this->logProjectActivity($request, $record, 'project.milestone_deleted', 'Milestone deleted: '.$milestoneRecord->title);
            $milestoneRecord->delete();
        });

        return response()->json(['message' => 'Project milestone deleted successfully.']);
    }

    public function milestones(Request $request, string $project)
    {
        $this->authorizeProjectAccess($request->user());

        return \App\Http\Resources\Api\ProjectMilestoneResource::collection(
            $this->findProject($project)->milestones()->get()
        );
    }

    private function findProject(string $projectId): Project
    {
        return Project::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->findOrFail($projectId);
    }

    private function logProjectActivity(Request $request, Project $project, string $action, string $summary, array $metadata = []): void
    {
        WorkspaceAuditLog::log(
            $project->workspace_id,
            $action,
            'project',
            $project->id,
            ['summary' => $summary] + $metadata,
            $request->user()->id
        );
    }

    private function authorizeProjectAccess(?User $user, bool $write = false): void
    {
        $workspace = $this->tenantContext->getWorkspace();
        $contextMembership = $this->tenantContext->getMembership();

        abort_unless($user, 401, 'Authentication is required.');
        abort_unless($workspace && $workspace->status === 'Active', 403, 'A valid active workspace is required.');
        abort_unless(
            $contextMembership
                && $contextMembership->workspace_id === $workspace->id
                && $contextMembership->user_id === $user->id,
            403,
            'Verified workspace membership is required.'
        );

        $membership = $this->authorizationService->getMembership($user, $workspace);
        abort_unless($membership, 403, 'Verified workspace membership is required.');

        $readRoles = [
            WorkspaceUser::ROLE_OWNER,
            WorkspaceUser::ROLE_ADMIN,
            WorkspaceUser::ROLE_MEMBER,
            WorkspaceUser::ROLE_VIEWER,
        ];
        abort_unless(in_array($membership->role, $readRoles, true), 403, 'Your workspace role cannot access projects.');

        if ($write) {
            abort_unless(
                in_array($membership->role, [
                    WorkspaceUser::ROLE_OWNER,
                    WorkspaceUser::ROLE_ADMIN,
                    WorkspaceUser::ROLE_MEMBER,
                ], true),
                403,
                'Viewers cannot modify projects.'
            );

            if (in_array($membership->role, [WorkspaceUser::ROLE_OWNER, WorkspaceUser::ROLE_ADMIN], true)) {
                Gate::authorize('update', $workspace);
            }
        } else {
            Gate::authorize('view', $workspace);
        }
    }
}
