<?php

namespace Tests\Feature\Api;

use App\Http\Controllers\Api\TaskController;
use App\Http\Middleware\EnsureTenantContext;
use App\Http\Middleware\SetTenantContext;
use App\Models\Campaign;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class TaskApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(TenantContext::class)->clear();

        Route::middleware(['auth', SetTenantContext::class, EnsureTenantContext::class])
            ->prefix('test-api/tasks')
            ->group(function (): void {
                Route::get('/', [TaskController::class, 'index']);
                Route::post('/', [TaskController::class, 'store']);
                Route::get('/{task}', [TaskController::class, 'show']);
                Route::put('/{task}', [TaskController::class, 'update']);
                Route::delete('/{task}', [TaskController::class, 'destroy']);
            });
    }

    public function test_owner_can_create_read_update_and_delete_a_task(): void
    {
        $owner = $this->createUser('task-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $project = $this->createProject($workspace, $owner, 'Task project');
        $campaign = $this->createCampaign($workspace, $project, $owner, 'Task campaign');
        $assignee = $this->createUser('task-assignee@example.test');
        $this->addMember($workspace, $assignee);

        $created = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/tasks/', $this->taskPayload($project, $campaign, $assignee))
            ->assertCreated()
            ->assertJsonPath('data.workspace_id', $workspace->id)
            ->assertJsonPath('data.created_by', $owner->id)
            ->assertJsonPath('data.assignee_id', $assignee->id)
            ->assertJsonPath('data.project.id', $project->id)
            ->assertJsonPath('data.campaign.id', $campaign->id)
            ->assertJsonPath('data.status', Task::STATUS_IN_PROGRESS);

        $taskId = $created->json('data.id');

        $this->getJson('/test-api/tasks/'.$taskId)
            ->assertOk()
            ->assertJsonPath('data.title', 'Review campaign creative');

        $this->putJson('/test-api/tasks/'.$taskId, [
            'title' => 'Approve campaign creative',
            'priority' => Task::PRIORITY_HIGH,
            'status' => Task::STATUS_IN_REVIEW,
        ])
            ->assertOk()
            ->assertJsonPath('data.title', 'Approve campaign creative')
            ->assertJsonPath('data.priority', Task::PRIORITY_HIGH)
            ->assertJsonPath('data.status', Task::STATUS_IN_REVIEW);

        $this->deleteJson('/test-api/tasks/'.$taskId)
            ->assertOk()
            ->assertJsonPath('message', 'Task deleted successfully.');

        $this->assertDatabaseMissing('tasks', ['id' => $taskId]);
    }

    public function test_index_supports_search_status_priority_assignee_project_campaign_and_pagination(): void
    {
        $owner = $this->createUser('task-filter-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $project = $this->createProject($workspace, $owner, 'Filter project');
        $campaign = $this->createCampaign($workspace, $project, $owner, 'Filter campaign');
        $assignee = $this->createUser('task-filter-assignee@example.test');
        $this->addMember($workspace, $assignee);
        $this->createTask($workspace, $owner, $project, $campaign, $assignee, 'Creative review one');
        $this->createTask($workspace, $owner, $project, $campaign, $assignee, 'Creative review two', Task::STATUS_IN_PROGRESS);
        $this->createTask($workspace, $owner, $project, $campaign, $owner, 'Other assignee task');

        $response = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/test-api/tasks/?search=Creative&status=To%20Do&priority=Medium&assignee_id='.$assignee->id.'&project_id='.$project->id.'&campaign_id='.$campaign->id.'&per_page=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('meta.per_page', 1);

        $this->assertSame('Creative review one', $response->json('data.0.title'));
    }

    public function test_invalid_fields_foreign_references_and_forged_ownership_are_rejected(): void
    {
        $owner = $this->createUser('task-validation-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $project = $this->createProject($workspace, $owner, 'Validation project');
        $campaign = $this->createCampaign($workspace, $project, $owner, 'Validation campaign');
        $foreignOwner = $this->createUser('task-validation-foreign@example.test');
        $foreignWorkspace = $this->createWorkspace($foreignOwner);
        $foreignProject = $this->createProject($foreignWorkspace, $foreignOwner, 'Foreign project');
        $foreignCampaign = $this->createCampaign($foreignWorkspace, $foreignProject, $foreignOwner, 'Foreign campaign');
        $notMember = $this->createUser('task-not-member@example.test');

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/tasks/', array_merge($this->taskPayload($project, $campaign), [
                'title' => '',
                'status' => 'Unknown',
                'priority' => 'Urgent',
                'due_date' => 'not-a-date',
            ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'status', 'priority', 'due_date']);

        $this->postJson('/test-api/tasks/', array_merge($this->taskPayload($project, $campaign), [
            'workspace_id' => $foreignWorkspace->id,
            'created_by' => $foreignOwner->id,
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['workspace_id', 'created_by']);

        $this->postJson('/test-api/tasks/', array_merge($this->taskPayload($project, $campaign), [
            'project_id' => $foreignProject->id,
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['project_id']);

        $this->postJson('/test-api/tasks/', array_merge($this->taskPayload($project, $campaign), [
            'campaign_id' => $foreignCampaign->id,
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['campaign_id']);

        $this->postJson('/test-api/tasks/', array_merge($this->taskPayload($project, $campaign), [
            'assignee_id' => $notMember->id,
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['assignee_id']);

        $this->assertDatabaseCount('tasks', 0);
    }

    public function test_project_and_campaign_relationship_must_be_consistent_on_create_and_update(): void
    {
        $owner = $this->createUser('task-consistency-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $project = $this->createProject($workspace, $owner, 'Primary project');
        $otherProject = $this->createProject($workspace, $owner, 'Other project');
        $campaign = $this->createCampaign($workspace, $project, $owner, 'Primary campaign');
        $task = $this->createTask($workspace, $owner, $project, $campaign, null, 'Relationship task');

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/tasks/', $this->taskPayload($otherProject, $campaign))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['campaign_id']);

        $this->putJson('/test-api/tasks/'.$task->id, ['project_id' => $otherProject->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['campaign_id']);

        $notMember = $this->createUser('task-update-nonmember@example.test');
        $this->putJson('/test-api/tasks/'.$task->id, ['assignee_id' => $notMember->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['assignee_id']);

        $this->putJson('/test-api/tasks/'.$task->id, ['campaign_id' => null])
            ->assertOk()
            ->assertJsonPath('data.campaign_id', null);
    }

    public function test_task_model_rejects_foreign_workspace_relationships_and_nonmember_assignee(): void
    {
        $owner = $this->createUser('task-model-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $foreignOwner = $this->createUser('task-model-foreign@example.test');
        $foreignWorkspace = $this->createWorkspace($foreignOwner);
        $foreignProject = $this->createProject($foreignWorkspace, $foreignOwner, 'Model foreign project');
        $notMember = $this->createUser('task-model-outsider@example.test');

        foreach ([
            ['project_id' => $foreignProject->id, 'assignee_id' => null],
            ['project_id' => null, 'assignee_id' => $notMember->id],
        ] as $attributes) {
            try {
                app(TenantContext::class)->runInContext($workspace, function () use ($attributes, $owner): void {
                    $task = new Task(array_merge([
                        'title' => 'Invalid model task',
                        'status' => Task::STATUS_TO_DO,
                        'priority' => Task::PRIORITY_MEDIUM,
                        'due_date' => '2026-10-31',
                    ], $attributes));
                    $task->created_by = $owner->id;
                    $task->save();
                });
                $this->fail('The task model accepted an invalid cross-workspace relationship.');
            } catch (ValidationException) {
                $this->assertDatabaseCount('tasks', 0);
            }
        }
    }

    public function test_viewers_can_read_but_cannot_create_update_or_delete_tasks(): void
    {
        $owner = $this->createUser('task-viewer-owner@example.test');
        $viewer = $this->createUser('task-viewer@example.test');
        $workspace = $this->createWorkspace($owner);
        $this->addMember($workspace, $viewer, WorkspaceUser::ROLE_VIEWER);
        $project = $this->createProject($workspace, $owner, 'Viewer project');
        $task = $this->createTask($workspace, $owner, $project, null, null, 'Read only task');

        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/test-api/tasks/'.$task->id)
            ->assertOk();

        $this->postJson('/test-api/tasks/', $this->taskPayload($project))->assertForbidden();
        $this->putJson('/test-api/tasks/'.$task->id, ['title' => 'Forbidden update'])->assertForbidden();
        $this->deleteJson('/test-api/tasks/'.$task->id)->assertForbidden();

        $this->assertSame('Read only task', $task->fresh()->title);
    }

    public function test_admin_and_member_can_write_but_nonmembers_cannot_access_tasks(): void
    {
        $owner = $this->createUser('task-role-owner@example.test');
        $admin = $this->createUser('task-admin@example.test');
        $member = $this->createUser('task-member@example.test');
        $outsider = $this->createUser('task-outsider@example.test');
        $workspace = $this->createWorkspace($owner);
        $this->addMember($workspace, $admin, WorkspaceUser::ROLE_ADMIN);
        $this->addMember($workspace, $member, WorkspaceUser::ROLE_MEMBER);
        $project = $this->createProject($workspace, $owner, 'Role project');

        $this->actingAs($admin)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/tasks/', $this->taskPayload($project))
            ->assertCreated();
        $this->actingAs($member)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/tasks/', $this->taskPayload($project))
            ->assertCreated();
        $this->actingAs($outsider)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/test-api/tasks/')
            ->assertForbidden();
    }

    public function test_cross_workspace_tasks_are_hidden_and_requests_fail_without_membership_or_context(): void
    {
        $this->getJson('/test-api/tasks/')->assertUnauthorized();

        $owner = $this->createUser('task-first-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $project = $this->createProject($workspace, $owner, 'First project');

        $foreignOwner = $this->createUser('task-second-owner@example.test');
        $foreignWorkspace = $this->createWorkspace($foreignOwner);
        $foreignProject = $this->createProject($foreignWorkspace, $foreignOwner, 'Second project');
        $foreignTask = $this->createTask($foreignWorkspace, $foreignOwner, $foreignProject, null, null, 'Private task');

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/test-api/tasks/')
            ->assertOk()
            ->assertJsonCount(0, 'data');
        $this->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/test-api/tasks/'.$foreignTask->id)
            ->assertNotFound();
        $this->putJson('/test-api/tasks/'.$foreignTask->id, ['title' => 'Stolen'])
            ->assertNotFound();
        $this->deleteJson('/test-api/tasks/'.$foreignTask->id)
            ->assertNotFound();

        $this->assertSame('Private task', $foreignTask->fresh()->title);
        $this->withoutHeader('X-Workspace-Id')
            ->actingAs($owner)
            ->getJson('/test-api/tasks/')
            ->assertForbidden();
    }

    private function taskPayload(Project $project, ?Campaign $campaign = null, ?User $assignee = null): array
    {
        return [
            'project_id' => $project->id,
            'campaign_id' => $campaign?->id,
            'assignee_id' => $assignee?->id,
            'title' => 'Review campaign creative',
            'description' => 'Review the campaign asset and approve its copy.',
            'status' => Task::STATUS_IN_PROGRESS,
            'priority' => Task::PRIORITY_MEDIUM,
            'due_date' => '2026-10-30',
        ];
    }

    private function createUser(string $email): User
    {
        return User::create([
            'name' => 'Task Test User',
            'email' => $email,
            'password' => 'password',
        ]);
    }

    private function createWorkspace(User $owner): Workspace
    {
        return Workspace::createWithInitialOwner($owner, [
            'name' => 'Task workspace '.$owner->id,
            'slug' => 'task-workspace-'.$owner->id,
        ]);
    }

    private function addMember(
        Workspace $workspace,
        User $user,
        string $role = WorkspaceUser::ROLE_MEMBER,
    ): void {
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'role' => $role,
        ]);
    }

    private function createProject(Workspace $workspace, User $owner, string $name): Project
    {
        return app(TenantContext::class)->runInContext($workspace, function () use ($owner, $name): Project {
            $project = new Project([
                'name' => $name,
                'status' => Project::STATUS_ACTIVE,
                'start_date' => '2026-10-01',
                'end_date' => '2026-12-31',
            ]);
            $project->owner_id = $owner->id;
            $project->save();

            return $project;
        });
    }

    private function createCampaign(Workspace $workspace, Project $project, User $creator, string $name): Campaign
    {
        return app(TenantContext::class)->runInContext($workspace, function () use ($project, $creator, $name): Campaign {
            $campaign = new Campaign([
                'project_id' => $project->id,
                'name' => $name,
                'status' => Campaign::STATUS_ACTIVE,
                'platform' => Campaign::PLATFORM_META,
                'channel' => 'Paid social',
                'start_date' => '2026-10-01',
                'end_date' => '2026-12-31',
                'budget' => '100.00',
                'spend' => '25.00',
                'leads' => 1,
                'customers' => 1,
                'revenue' => '150.00',
            ]);
            $campaign->created_by = $creator->id;
            $campaign->save();

            return $campaign;
        });
    }

    private function createTask(
        Workspace $workspace,
        User $creator,
        ?Project $project,
        ?Campaign $campaign,
        ?User $assignee,
        string $title,
        string $status = Task::STATUS_TO_DO,
        string $priority = Task::PRIORITY_MEDIUM,
    ): Task {
        return app(TenantContext::class)->runInContext($workspace, function () use ($creator, $project, $campaign, $assignee, $title, $status, $priority): Task {
            $task = new Task([
                'project_id' => $project?->id,
                'campaign_id' => $campaign?->id,
                'assignee_id' => $assignee?->id,
                'title' => $title,
                'status' => $status,
                'priority' => $priority,
                'due_date' => '2026-10-30',
            ]);
            $task->created_by = $creator->id;
            $task->save();

            return $task;
        });
    }
}
