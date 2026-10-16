<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\StoreProjectRequest;
use App\Http\Requests\Projects\UpdateProjectRequest;
use App\Http\Resources\Api\ProjectResource;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;
use App\Services\WorkspaceAuthorizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
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

        $project = new Project($request->validated());
        $project->owner_id = $request->user()->id;
        $project->save();

        return (new ProjectResource($project))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, string $project)
    {
        $this->authorizeProjectAccess($request->user());

        return new ProjectResource($this->findProject($project));
    }

    public function update(UpdateProjectRequest $request, string $project)
    {
        $this->authorizeProjectAccess($request->user(), true);

        $record = $this->findProject($project);
        $record->fill($request->validated());
        $record->save();

        return new ProjectResource($record->refresh());
    }

    public function destroy(Request $request, string $project)
    {
        $this->authorizeProjectAccess($request->user(), true);

        $this->findProject($project)->delete();

        return response()->json(['message' => 'Project deleted successfully.']);
    }

    private function findProject(string $projectId): Project
    {
        return Project::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->findOrFail($projectId);
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
