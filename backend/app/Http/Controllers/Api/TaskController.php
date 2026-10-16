<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Tasks\StoreTaskRequest;
use App\Http\Requests\Tasks\UpdateTaskRequest;
use App\Http\Resources\Api\TaskResource;
use App\Models\Task;
use App\Models\User;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;
use App\Services\WorkspaceAuthorizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class TaskController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly WorkspaceAuthorizationService $authorizationService,
    ) {}

    public function index(Request $request)
    {
        $this->authorizeTaskAccess($request->user());

        $workspaceId = $this->tenantContext->getWorkspaceId();
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', 'string', Rule::in(Task::STATUSES)],
            'priority' => ['sometimes', 'string', Rule::in(Task::PRIORITIES)],
            'assignee_id' => [
                'sometimes',
                'integer',
                Rule::exists('workspace_users', 'user_id')->where('workspace_id', $workspaceId),
            ],
            'project_id' => ['sometimes', 'uuid', Rule::exists('projects', 'id')->where('workspace_id', $workspaceId)],
            'campaign_id' => ['sometimes', 'uuid', Rule::exists('campaigns', 'id')->where('workspace_id', $workspaceId)],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $tasks = Task::query()
            ->with(['project:id,name', 'campaign:id,name', 'assignee:id,name,email'])
            ->where('workspace_id', $workspaceId)
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('title', 'like', '%'.$search.'%')
                        ->orWhere('description', 'like', '%'.$search.'%');
                });
            })
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['priority'] ?? null, fn ($query, string $priority) => $query->where('priority', $priority))
            ->when($filters['assignee_id'] ?? null, fn ($query, int $assigneeId) => $query->where('assignee_id', $assigneeId))
            ->when($filters['project_id'] ?? null, fn ($query, string $projectId) => $query->where('project_id', $projectId))
            ->when($filters['campaign_id'] ?? null, fn ($query, string $campaignId) => $query->where('campaign_id', $campaignId))
            ->orderBy('due_date')
            ->orderByDesc('created_at')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return TaskResource::collection($tasks);
    }

    public function store(StoreTaskRequest $request)
    {
        $this->authorizeTaskAccess($request->user(), true);

        $task = new Task($request->validated());
        $task->created_by = $request->user()->id;
        $task->save();

        return (new TaskResource($task->load(['project:id,name', 'campaign:id,name', 'assignee:id,name,email'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, string $task)
    {
        $this->authorizeTaskAccess($request->user());

        return new TaskResource($this->findTask($task)->load(['project:id,name', 'campaign:id,name', 'assignee:id,name,email']));
    }

    public function update(UpdateTaskRequest $request, string $task)
    {
        $this->authorizeTaskAccess($request->user(), true);

        $record = $this->findTask($task);
        $record->fill($request->validated());
        $record->save();

        return new TaskResource($record->refresh()->load(['project:id,name', 'campaign:id,name', 'assignee:id,name,email']));
    }

    public function destroy(Request $request, string $task)
    {
        $this->authorizeTaskAccess($request->user(), true);

        $this->findTask($task)->delete();

        return response()->json(['message' => 'Task deleted successfully.']);
    }

    private function findTask(string $taskId): Task
    {
        return Task::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->findOrFail($taskId);
    }

    private function authorizeTaskAccess(?User $user, bool $write = false): void
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
        abort_unless(
            in_array($membership->role, [
                WorkspaceUser::ROLE_OWNER,
                WorkspaceUser::ROLE_ADMIN,
                WorkspaceUser::ROLE_MEMBER,
                WorkspaceUser::ROLE_VIEWER,
            ], true),
            403,
            'Your workspace role cannot access tasks.'
        );

        if ($write) {
            abort_unless(
                in_array($membership->role, [
                    WorkspaceUser::ROLE_OWNER,
                    WorkspaceUser::ROLE_ADMIN,
                    WorkspaceUser::ROLE_MEMBER,
                ], true),
                403,
                'Viewers cannot modify tasks.'
            );

            if (in_array($membership->role, [WorkspaceUser::ROLE_OWNER, WorkspaceUser::ROLE_ADMIN], true)) {
                Gate::authorize('update', $workspace);
            }
        } else {
            Gate::authorize('view', $workspace);
        }
    }
}
