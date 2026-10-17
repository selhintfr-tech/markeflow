<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegisteredCrudRoutesTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_workspace_list_and_create_do_not_require_active_workspace(): void
    {
        $user = $this->createUser('workspace-crud@example.test');

        $this->getJson('/api/workspaces')->assertUnauthorized();
        $this->actingAs($user)->getJson('/api/workspaces')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $created = $this->postJson('/api/workspaces', [
            'name' => 'Route-created workspace',
            'slug' => 'route-created-workspace',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Route-created workspace')
            ->assertJsonPath('data.current_user_role', WorkspaceUser::ROLE_OWNER);

        $workspaceId = $created->json('data.id');
        $this->assertDatabaseHas('workspace_users', [
            'workspace_id' => $workspaceId,
            'user_id' => $user->id,
            'role' => WorkspaceUser::ROLE_OWNER,
        ]);

        $this->getJson('/api/workspaces')
            ->assertOk()
            ->assertJsonPath('data.0.id', $workspaceId);

        $this->getJson("/api/workspaces/{$workspaceId}")
            ->assertOk()
            ->assertJsonPath('data.id', $workspaceId);

        $this->patchJson("/api/workspaces/{$workspaceId}", ['name' => 'Renamed workspace'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Renamed workspace');

        $this->deleteJson("/api/workspaces/{$workspaceId}")
            ->assertOk()
            ->assertJsonPath('message', 'Workspace deleted successfully.');
        $this->assertDatabaseMissing('workspaces', ['id' => $workspaceId]);
    }

    public function test_registered_project_campaign_and_task_routes_support_crud(): void
    {
        $owner = $this->createUser('nested-crud@example.test');
        $workspace = $this->createWorkspace($owner);
        $base = '/api';
        $this->actingAs($owner);

        $project = $this->withHeader('X-Workspace-Id', $workspace->id)->postJson("{$base}/projects", [
            'name' => 'Route project',
            'status' => 'Active',
            'start_date' => '2026-10-01',
            'end_date' => '2026-11-01',
            'progress' => 10,
        ])->assertCreated()
            ->assertJsonPath('data.workspace_id', $workspace->id)
            ->assertJsonPath('data.owner_id', $owner->id);
        $projectId = $project->json('data.id');

        $this->assertDatabaseHas('projects', ['id' => $projectId, 'workspace_id' => $workspace->id]);
        $this->withHeader('X-Workspace-Id', $workspace->id)->getJson("{$base}/projects")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $projectId);
        $this->withHeader('X-Workspace-Id', $workspace->id)->getJson("{$base}/projects/{$projectId}")->assertOk()->assertJsonPath('data.name', 'Route project');
        $this->withHeader('X-Workspace-Id', $workspace->id)->patchJson("{$base}/projects/{$projectId}", ['progress' => 30])
            ->assertOk()
            ->assertJsonPath('data.progress', 30);

        $campaign = $this->withHeader('X-Workspace-Id', $workspace->id)->postJson("{$base}/campaigns", [
            'project_id' => $projectId,
            'name' => 'Route campaign',
            'status' => 'Active',
            'platform' => 'Meta Ads',
            'channel' => 'Paid social',
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-31',
            'budget' => '1000.00',
            'spend' => '250.00',
            'leads' => 10,
            'customers' => 2,
            'revenue' => '500.00',
        ])->assertCreated()
            ->assertJsonPath('data.workspace_id', $workspace->id)
            ->assertJsonPath('data.project_id', $projectId);
        $campaignId = $campaign->json('data.id');

        $this->withHeader('X-Workspace-Id', $workspace->id)->getJson("{$base}/campaigns")->assertOk()->assertJsonCount(1, 'data');
        $this->withHeader('X-Workspace-Id', $workspace->id)->getJson("{$base}/campaigns/{$campaignId}")->assertOk()->assertJsonPath('data.name', 'Route campaign');
        $this->withHeader('X-Workspace-Id', $workspace->id)->patchJson("{$base}/campaigns/{$campaignId}", ['status' => 'Completed'])
            ->assertOk()
            ->assertJsonPath('data.status', 'Completed');

        $task = $this->withHeader('X-Workspace-Id', $workspace->id)->postJson("{$base}/tasks", [
            'project_id' => $projectId,
            'campaign_id' => $campaignId,
            'title' => 'Route task',
            'status' => 'To Do',
            'priority' => 'High',
            'due_date' => '2026-10-30',
        ])->assertCreated()
            ->assertJsonPath('data.workspace_id', $workspace->id)
            ->assertJsonPath('data.created_by', $owner->id);
        $taskId = $task->json('data.id');

        $this->withHeader('X-Workspace-Id', $workspace->id)->getJson("{$base}/tasks")->assertOk()->assertJsonCount(1, 'data');
        $this->withHeader('X-Workspace-Id', $workspace->id)->getJson("{$base}/tasks/{$taskId}")->assertOk()->assertJsonPath('data.title', 'Route task');
        $this->withHeader('X-Workspace-Id', $workspace->id)->patchJson("{$base}/tasks/{$taskId}", ['title' => 'Updated route task'])
            ->assertOk()
            ->assertJsonPath('data.title', 'Updated route task');

        $this->withHeader('X-Workspace-Id', $workspace->id)->deleteJson("{$base}/tasks/{$taskId}")->assertOk();
        $this->withHeader('X-Workspace-Id', $workspace->id)->deleteJson("{$base}/campaigns/{$campaignId}")->assertOk();
        $this->withHeader('X-Workspace-Id', $workspace->id)->deleteJson("{$base}/projects/{$projectId}")->assertOk();
    }

    public function test_tenant_routes_require_authentication_membership_and_workspace_scoping(): void
    {
        $owner = $this->createUser('route-isolation-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $outsider = $this->createUser('route-isolation-outsider@example.test');
        $foreignOwner = $this->createUser('route-foreign-owner@example.test');
        $foreignWorkspace = $this->createWorkspace($foreignOwner);
        $this->getJson('/api/projects')->assertUnauthorized();

        $foreignProject = $this->actingAs($foreignOwner)
            ->withHeader('X-Workspace-Id', $foreignWorkspace->id)
            ->postJson('/api/projects', [
                'name' => 'Foreign project',
                'start_date' => '2026-10-01',
                'end_date' => '2026-11-01',
            ])
            ->assertCreated();

        $this->actingAs($outsider)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/projects')
            ->assertForbidden();
        $this->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/campaigns')
            ->assertForbidden();
        $this->getJson('/api/tasks')->assertForbidden();

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/projects/'.$foreignProject->json('data.id'))
            ->assertNotFound();
        $this->withoutHeader('X-Workspace-Id')
            ->actingAs($owner)
            ->getJson('/api/projects')
            ->assertForbidden();

        $viewer = $this->createUser('route-viewer@example.test');
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $viewer->id,
            'role' => WorkspaceUser::ROLE_VIEWER,
            'joined_at' => now(),
        ]);

        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/projects')
            ->assertOk();
        $this->withHeader('X-Workspace-Id', $workspace->id)->postJson('/api/projects', [
            'name' => 'Viewer write attempt',
            'start_date' => '2026-10-01',
            'end_date' => '2026-11-01',
        ])->assertForbidden();

        $this->assertDatabaseMissing('projects', ['name' => 'Viewer write attempt']);
    }

    public function test_workspace_crud_routes_reject_nonmembers(): void
    {
        $owner = $this->createUser('route-workspace-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $outsider = $this->createUser('route-workspace-outsider@example.test');

        $this->actingAs($outsider)
            ->getJson("/api/workspaces/{$workspace->id}")
            ->assertForbidden();
        $this->patchJson("/api/workspaces/{$workspace->id}", ['name' => 'Unauthorized change'])
            ->assertForbidden();

        $this->assertSame('Workspace '.$owner->id, $workspace->fresh()->name);
    }

    private function createUser(string $email): User
    {
        return User::create([
            'name' => 'API Route User',
            'email' => $email,
            'password' => 'Password123!',
        ]);
    }

    private function createWorkspace(User $owner): Workspace
    {
        return Workspace::createWithInitialOwner($owner, [
            'name' => 'Workspace '.$owner->id,
            'slug' => 'workspace-'.$owner->id,
        ]);
    }
}
