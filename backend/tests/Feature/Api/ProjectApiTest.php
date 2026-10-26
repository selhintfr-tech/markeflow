<?php

namespace Tests\Feature\Api;

use App\Http\Controllers\Api\ProjectController;
use App\Http\Middleware\EnsureTenantContext;
use App\Http\Middleware\SetTenantContext;
use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ProjectApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(TenantContext::class)->clear();

        Route::middleware(['auth', SetTenantContext::class, EnsureTenantContext::class])
            ->prefix('test-api/projects')
            ->group(function (): void {
                Route::get('/', [ProjectController::class, 'index']);
                Route::post('/', [ProjectController::class, 'store']);
                Route::get('/{project}', [ProjectController::class, 'show']);
                Route::put('/{project}', [ProjectController::class, 'update']);
                Route::delete('/{project}', [ProjectController::class, 'destroy']);
                Route::get('/{project}/milestones', [ProjectController::class, 'milestones']);
                Route::post('/{project}/milestones', [ProjectController::class, 'storeMilestone']);
                Route::patch('/{project}/milestones/{milestone}', [ProjectController::class, 'updateMilestone']);
                Route::delete('/{project}/milestones/{milestone}', [ProjectController::class, 'destroyMilestone']);
            });
    }

    public function test_owner_can_create_read_update_and_delete_a_project(): void
    {
        $owner = $this->createUser('owner@example.test');
        $workspace = $this->createWorkspace($owner);

        $created = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/projects/', [
                'name' => 'Launch planning',
                'description' => 'Plan the launch.',
                'status' => Project::STATUS_ACTIVE,
                'start_date' => '2026-10-01',
                'end_date' => '2026-11-01',
                'progress' => 20,
            ])
            ->assertCreated()
            ->assertJsonPath('data.workspace_id', $workspace->id)
            ->assertJsonPath('data.owner_id', $owner->id)
            ->assertJsonPath('data.progress', 20);

        $projectId = $created->json('data.id');

        $this->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/test-api/projects/'.$projectId)
            ->assertOk()
            ->assertJsonPath('data.name', 'Launch planning')
            ->assertJsonPath('data.owner.id', $owner->id)
            ->assertJsonPath('data.owner.name', $owner->name);

        $this->putJson('/test-api/projects/'.$projectId, [
            'end_date' => '2026-09-30',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['end_date']);

        $this->putJson('/test-api/projects/'.$projectId, [
            'owner_id' => $this->createUser('attempted-owner@example.test')->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['owner_id']);

        $this->putJson('/test-api/projects/'.$projectId, [
            'name' => 'Launch plan',
            'progress' => 45,
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Launch plan')
            ->assertJsonPath('data.progress', 45);

        $this->deleteJson('/test-api/projects/'.$projectId)
            ->assertOk()
            ->assertJsonPath('message', 'Project deleted successfully.');

        $this->assertDatabaseMissing('projects', ['id' => $projectId]);
    }

    public function test_index_supports_search_status_and_pagination(): void
    {
        $owner = $this->createUser('filters@example.test');
        $workspace = $this->createWorkspace($owner);
        $this->createProject($workspace, $owner, 'Spring campaign', Project::STATUS_ACTIVE);
        $this->createProject($workspace, $owner, 'Winter report', Project::STATUS_DRAFT);
        $this->createProject($workspace, $owner, 'Summer campaign', Project::STATUS_ACTIVE);

        $response = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/test-api/projects/?search=campaign&status=Active&per_page=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('meta.per_page', 1);

        $this->assertStringContainsString('campaign', strtolower($response->json('data.0.name')));
    }

    public function test_invalid_project_data_and_client_supplied_ownership_are_rejected(): void
    {
        $owner = $this->createUser('validation@example.test');
        $workspace = $this->createWorkspace($owner);
        $otherWorkspace = $this->createWorkspace($this->createUser('other-validation@example.test'));

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/projects/', [
                'name' => '',
                'status' => 'Unknown',
                'start_date' => '2026-12-02',
                'end_date' => '2026-12-01',
                'progress' => 101,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'status', 'end_date', 'progress']);

        $this->postJson('/test-api/projects/', [
            'name' => 'Forged ownership',
            'start_date' => '2026-10-01',
            'end_date' => '2026-11-01',
            'workspace_id' => $otherWorkspace->id,
            'owner_id' => $otherWorkspace->members()->value('user_id'),
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['workspace_id', 'owner_id']);
    }

    public function test_viewers_can_read_but_cannot_create_update_or_delete_projects(): void
    {
        $owner = $this->createUser('viewer-owner@example.test');
        $viewer = $this->createUser('viewer@example.test');
        $workspace = $this->createWorkspace($owner);
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $viewer->id,
            'role' => WorkspaceUser::ROLE_VIEWER,
        ]);
        $project = $this->createProject($workspace, $owner, 'Read only project');

        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/test-api/projects/'.$project->id)
            ->assertOk();

        $this->postJson('/test-api/projects/', [
            'name' => 'Forbidden project',
            'start_date' => '2026-10-01',
            'end_date' => '2026-11-01',
        ])->assertForbidden();
        $this->postJson('/test-api/projects/'.$project->id.'/milestones', [
            'title' => 'Forbidden milestone',
        ])->assertForbidden();

        $this->putJson('/test-api/projects/'.$project->id, ['name' => 'Forbidden update'])
            ->assertForbidden();
        $this->deleteJson('/test-api/projects/'.$project->id)->assertForbidden();

        $this->assertSame('Read only project', $project->fresh()->name);
    }

    public function test_admin_and_member_can_modify_projects_but_non_members_cannot_access_them(): void
    {
        $owner = $this->createUser('member-owner@example.test');
        $admin = $this->createUser('admin@example.test');
        $member = $this->createUser('member@example.test');
        $outsider = $this->createUser('outsider@example.test');
        $workspace = $this->createWorkspace($owner);
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $admin->id,
            'role' => WorkspaceUser::ROLE_ADMIN,
        ]);
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $member->id,
            'role' => WorkspaceUser::ROLE_MEMBER,
        ]);

        $this->actingAs($admin)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/projects/', [
                'name' => 'Admin project',
                'start_date' => '2026-10-01',
                'end_date' => '2026-11-01',
            ])
            ->assertCreated();

        $this->actingAs($member)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/projects/', [
                'name' => 'Member project',
                'start_date' => '2026-10-01',
                'end_date' => '2026-11-01',
            ])
            ->assertCreated();

        $this->actingAs($outsider)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/test-api/projects/')
            ->assertForbidden();
    }

    public function test_project_objectives_milestones_and_activity_are_persisted_and_workspace_scoped(): void
    {
        $owner = $this->createUser('project-details-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $otherOwner = $this->createUser('project-details-other@example.test');
        $otherWorkspace = $this->createWorkspace($otherOwner);
        $foreignProject = $this->createProject($otherWorkspace, $otherOwner, 'Foreign project');
        $foreignMilestone = app(TenantContext::class)->runInContext($otherWorkspace, function () use ($otherWorkspace, $foreignProject, $otherOwner): ProjectMilestone {
            $milestone = new ProjectMilestone([
                'title' => 'Foreign milestone',
                'status' => ProjectMilestone::STATUS_PLANNED,
            ]);
            $milestone->workspace_id = $otherWorkspace->id;
            $milestone->project_id = $foreignProject->id;
            $milestone->created_by = $otherOwner->id;
            $milestone->save();

            return $milestone;
        });

        $projectId = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/projects/', [
                'name' => 'Project with milestones',
                'start_date' => '2026-10-01',
                'end_date' => '2026-11-01',
                'objectives' => ['Increase qualified leads', 'Deliver launch assets'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.objectives.0', 'Increase qualified leads')
            ->json('data.id');

        $milestoneId = $this->postJson('/test-api/projects/'.$projectId.'/milestones', [
            'title' => 'Complete campaign brief',
            'due_date' => '2026-10-25',
        ])
            ->assertCreated()
            ->assertJsonPath('data.workspace_id', $workspace->id)
            ->assertJsonPath('data.project_id', $projectId)
            ->assertJsonPath('data.status', ProjectMilestone::STATUS_PLANNED)
            ->json('data.id');

        $this->patchJson('/test-api/projects/'.$projectId.'/milestones/'.$milestoneId, [
            'status' => ProjectMilestone::STATUS_COMPLETED,
        ])
            ->assertOk()
            ->assertJsonPath('data.status', ProjectMilestone::STATUS_COMPLETED);

        $this->getJson('/test-api/projects/'.$projectId)
            ->assertOk()
            ->assertJsonPath('data.objectives.1', 'Deliver launch assets')
            ->assertJsonCount(1, 'data.milestones')
            ->assertJsonPath('data.milestones.0.status', ProjectMilestone::STATUS_COMPLETED)
            ->assertJsonPath('data.activities.0.action', 'project.milestone_updated');

        $this->patchJson('/test-api/projects/'.$projectId.'/milestones/'.$foreignMilestone->id, [
            'title' => 'Cross-tenant update',
        ])->assertNotFound();

        $this->assertDatabaseHas('project_milestones', [
            'id' => $milestoneId,
            'workspace_id' => $workspace->id,
            'project_id' => $projectId,
        ]);
        $this->assertDatabaseHas('workspace_audit_logs', [
            'workspace_id' => $workspace->id,
            'entity_type' => 'project',
            'entity_id' => $projectId,
            'action' => 'project.milestone_updated',
        ]);
    }

    public function test_cross_workspace_projects_are_not_visible_or_mutable(): void
    {
        $firstOwner = $this->createUser('first-owner@example.test');
        $secondOwner = $this->createUser('second-owner@example.test');
        $firstWorkspace = $this->createWorkspace($firstOwner);
        $secondWorkspace = $this->createWorkspace($secondOwner);
        $foreignProject = $this->createProject($secondWorkspace, $secondOwner, 'Private project');

        $this->actingAs($firstOwner)
            ->withHeader('X-Workspace-Id', $firstWorkspace->id)
            ->getJson('/test-api/projects/'.$foreignProject->id)
            ->assertNotFound();

        $this->putJson('/test-api/projects/'.$foreignProject->id, ['name' => 'Stolen'])
            ->assertNotFound();
        $this->deleteJson('/test-api/projects/'.$foreignProject->id)
            ->assertNotFound();

        $this->assertSame('Private project', $foreignProject->fresh()->name);
    }

    public function test_unauthenticated_requests_and_missing_workspace_context_fail_closed(): void
    {
        $this->getJson('/test-api/projects/')->assertUnauthorized();

        $owner = $this->createUser('no-context@example.test');
        $workspace = $this->createWorkspace($owner);

        $this->actingAs($owner)
            ->getJson('/test-api/projects/')
            ->assertForbidden();

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/projects/', [
                'name' => 'Assigned owner',
                'start_date' => '2026-10-01',
                'end_date' => '2026-11-01',
                'owner_id' => $this->createUser('forged-owner@example.test')->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['owner_id']);
    }

    public function test_deletion_blocked_when_project_has_linked_tasks_or_campaigns(): void
    {
        $owner = $this->createUser('protect-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $project = $this->createProject($workspace, $owner, 'Linked project', Project::STATUS_ACTIVE);

        // Add a linked task
        \Illuminate\Support\Facades\DB::table('tasks')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'workspace_id' => $workspace->id,
            'project_id' => $project->id,
            'title' => 'Critical marketing task',
            'status' => 'Pending',
            'created_by' => $owner->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->deleteJson('/test-api/projects/'.$project->id)
            ->assertStatus(422)
            ->assertJsonPath('code', 'PROJECT_HAS_LINKED_RECORDS')
            ->assertJsonPath('dependencies.tasks', 1);

        $this->assertDatabaseHas('projects', ['id' => $project->id]);
    }

    public function test_viewer_cannot_delete_project(): void
    {
        $owner = $this->createUser('owner-del@example.test');
        $viewer = $this->createUser('viewer-del@example.test');
        $workspace = $this->createWorkspace($owner);
        $project = $this->createProject($workspace, $owner, 'Safe Project');

        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $viewer->id,
            'role' => WorkspaceUser::ROLE_VIEWER,
        ]);

        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->deleteJson('/test-api/projects/'.$project->id)
            ->assertForbidden();

        $this->assertDatabaseHas('projects', ['id' => $project->id]);
    }

    private function createUser(string $email): User
    {
        return User::create([
            'name' => 'Test User',
            'email' => $email,
            'password' => 'password',
        ]);
    }

    private function createWorkspace(User $owner): Workspace
    {
        return Workspace::createWithInitialOwner($owner, [
            'name' => 'Workspace '.$owner->id,
            'slug' => 'workspace-'.$owner->id,
        ]);
    }

    private function createProject(
        Workspace $workspace,
        User $owner,
        string $name,
        string $status = Project::STATUS_DRAFT,
    ): Project {
        return app(TenantContext::class)->runInContext($workspace, function () use ($owner, $name, $status): Project {
            $project = new Project([
                'name' => $name,
                'status' => $status,
                'start_date' => '2026-10-01',
                'end_date' => '2026-11-01',
            ]);
            $project->owner_id = $owner->id;
            $project->save();

            return $project;
        });
    }
}
