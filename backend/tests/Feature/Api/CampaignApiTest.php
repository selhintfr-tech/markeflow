<?php

namespace Tests\Feature\Api;

use App\Http\Controllers\Api\CampaignController;
use App\Http\Middleware\EnsureTenantContext;
use App\Http\Middleware\SetTenantContext;
use App\Models\Campaign;
use App\Models\Project;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class CampaignApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(TenantContext::class)->clear();

        Route::middleware(['auth', SetTenantContext::class, EnsureTenantContext::class])
            ->prefix('test-api/campaigns')
            ->group(function (): void {
                Route::get('/', [CampaignController::class, 'index']);
                Route::post('/', [CampaignController::class, 'store']);
                Route::get('/{campaign}', [CampaignController::class, 'show']);
                Route::put('/{campaign}', [CampaignController::class, 'update']);
                Route::delete('/{campaign}', [CampaignController::class, 'destroy']);
            });
    }

    public function test_owner_can_create_read_update_and_delete_campaign(): void
    {
        $owner = $this->createUser('campaign-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $project = $this->createProject($workspace, $owner, 'Campaign project');

        $created = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/campaigns/', $this->campaignPayload($project))
            ->assertCreated()
            ->assertJsonPath('data.workspace_id', $workspace->id)
            ->assertJsonPath('data.project_id', $project->id)
            ->assertJsonPath('data.created_by', $owner->id)
            ->assertJsonPath('data.budget', '1250.50')
            ->assertJsonPath('data.spend', '840.25')
            ->assertJsonPath('data.revenue', '3400.00');

        $campaignId = $created->json('data.id');

        $this->getJson('/test-api/campaigns/'.$campaignId)
            ->assertOk()
            ->assertJsonPath('data.name', 'Autumn conversion push');

        $this->putJson('/test-api/campaigns/'.$campaignId, [
            'status' => Campaign::STATUS_COMPLETED,
            'spend' => '900.75',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', Campaign::STATUS_COMPLETED)
            ->assertJsonPath('data.spend', '900.75');

        $this->deleteJson('/test-api/campaigns/'.$campaignId)
            ->assertOk()
            ->assertJsonPath('message', 'Campaign deleted successfully.');

        $this->assertDatabaseMissing('campaigns', ['id' => $campaignId]);
    }

    public function test_index_filters_by_search_project_status_platform_and_paginates(): void
    {
        $owner = $this->createUser('campaign-filter@example.test');
        $workspace = $this->createWorkspace($owner);
        $project = $this->createProject($workspace, $owner, 'Spring project');
        $secondProject = $this->createProject($workspace, $owner, 'Winter project');
        $this->createCampaign($workspace, $project, $owner, 'Spring social', Campaign::PLATFORM_META);
        $this->createCampaign($workspace, $project, $owner, 'Spring email', Campaign::PLATFORM_EMAIL);
        $this->createCampaign($workspace, $secondProject, $owner, 'Winter social', Campaign::PLATFORM_META);

        $response = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/test-api/campaigns/?search=Spring&project_id='.$project->id.'&status=Active&platform=Meta%20Ads&per_page=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('meta.per_page', 1);

        $this->assertSame('Spring social', $response->json('data.0.name'));
    }

    public function test_invalid_values_and_client_supplied_ownership_fields_are_rejected(): void
    {
        $owner = $this->createUser('campaign-validation@example.test');
        $workspace = $this->createWorkspace($owner);
        $project = $this->createProject($workspace, $owner, 'Validation project');
        $otherWorkspace = $this->createWorkspace($this->createUser('campaign-other@example.test'));
        $otherProject = $this->createProject($otherWorkspace, $otherWorkspace->members()->first()->user, 'Foreign project');

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/campaigns/', array_merge($this->campaignPayload($project), [
                'status' => 'Unknown',
                'platform' => 'Unknown',
                'end_date' => '2026-09-01',
                'budget' => '-1',
                'spend' => '10.999',
                'leads' => -1,
            ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status', 'platform', 'end_date', 'budget', 'spend', 'leads']);

        $this->postJson('/test-api/campaigns/', array_merge($this->campaignPayload($project), [
            'workspace_id' => $otherWorkspace->id,
            'created_by' => $otherWorkspace->members()->value('user_id'),
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['workspace_id', 'created_by']);

        $this->postJson('/test-api/campaigns/', array_merge($this->campaignPayload($otherProject), [
            'project_id' => $otherProject->id,
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['project_id']);

        $this->assertDatabaseCount('campaigns', 0);
    }

    public function test_cross_workspace_project_reference_cannot_be_assigned_on_update(): void
    {
        $owner = $this->createUser('cross-project-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $project = $this->createProject($workspace, $owner, 'Local project');
        $campaign = $this->createCampaign($workspace, $project, $owner, 'Local campaign');

        $otherOwner = $this->createUser('cross-project-other@example.test');
        $otherWorkspace = $this->createWorkspace($otherOwner);
        $foreignProject = $this->createProject($otherWorkspace, $otherOwner, 'Foreign project');

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->putJson('/test-api/campaigns/'.$campaign->id, [
                'project_id' => $foreignProject->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['project_id']);

        $this->assertSame($project->id, $campaign->fresh()->project_id);
    }

    public function test_campaign_model_rejects_foreign_workspace_project_references(): void
    {
        $owner = $this->createUser('campaign-model-guard-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $foreignOwner = $this->createUser('campaign-model-guard-foreign@example.test');
        $foreignWorkspace = $this->createWorkspace($foreignOwner);
        $foreignProject = $this->createProject($foreignWorkspace, $foreignOwner, 'Foreign model project');

        try {
            app(TenantContext::class)->runInContext($workspace, function () use ($foreignProject, $owner): void {
                $campaign = new Campaign([
                    'project_id' => $foreignProject->id,
                    'name' => 'Invalid project association',
                    'status' => Campaign::STATUS_ACTIVE,
                    'platform' => Campaign::PLATFORM_META,
                    'channel' => 'Paid social',
                    'start_date' => '2026-10-01',
                    'end_date' => '2026-10-31',
                ]);
                $campaign->created_by = $owner->id;
                $campaign->save();
            });
            $this->fail('The campaign model accepted a project from another workspace.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('project_id', $exception->errors());
            $this->assertDatabaseCount('campaigns', 0);
        }
    }

    public function test_viewers_can_read_but_cannot_create_update_or_delete_campaigns(): void
    {
        $owner = $this->createUser('campaign-viewer-owner@example.test');
        $viewer = $this->createUser('campaign-viewer@example.test');
        $workspace = $this->createWorkspace($owner);
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $viewer->id,
            'role' => WorkspaceUser::ROLE_VIEWER,
        ]);
        $project = $this->createProject($workspace, $owner, 'Viewer project');
        $campaign = $this->createCampaign($workspace, $project, $owner, 'Viewer campaign');

        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/test-api/campaigns/'.$campaign->id)
            ->assertOk();

        $this->postJson('/test-api/campaigns/', $this->campaignPayload($project))->assertForbidden();
        $this->putJson('/test-api/campaigns/'.$campaign->id, ['name' => 'Forbidden'])->assertForbidden();
        $this->deleteJson('/test-api/campaigns/'.$campaign->id)->assertForbidden();

        $this->assertSame('Viewer campaign', $campaign->fresh()->name);
    }

    public function test_admin_and_member_can_write_and_non_members_cannot_read(): void
    {
        $owner = $this->createUser('campaign-role-owner@example.test');
        $admin = $this->createUser('campaign-admin@example.test');
        $member = $this->createUser('campaign-member@example.test');
        $outsider = $this->createUser('campaign-outsider@example.test');
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
        $project = $this->createProject($workspace, $owner, 'Role project');

        $this->actingAs($admin)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/campaigns/', $this->campaignPayload($project))
            ->assertCreated();
        $this->actingAs($member)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/campaigns/', $this->campaignPayload($project))
            ->assertCreated();

        $this->actingAs($outsider)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/test-api/campaigns/')
            ->assertForbidden();
    }

    public function test_campaigns_are_not_visible_or_mutable_across_workspaces(): void
    {
        $owner = $this->createUser('campaign-first-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $project = $this->createProject($workspace, $owner, 'First project');
        $foreignOwner = $this->createUser('campaign-second-owner@example.test');
        $foreignWorkspace = $this->createWorkspace($foreignOwner);
        $foreignProject = $this->createProject($foreignWorkspace, $foreignOwner, 'Second project');
        $foreignCampaign = $this->createCampaign($foreignWorkspace, $foreignProject, $foreignOwner, 'Private campaign');

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/test-api/campaigns/'.$foreignCampaign->id)
            ->assertNotFound();
        $this->putJson('/test-api/campaigns/'.$foreignCampaign->id, ['name' => 'Stolen'])
            ->assertNotFound();
        $this->deleteJson('/test-api/campaigns/'.$foreignCampaign->id)
            ->assertNotFound();

        $this->assertSame('Private campaign', $foreignCampaign->fresh()->name);
        $this->assertSame($project->id, $project->fresh()->id);
    }

    public function test_unauthenticated_and_missing_workspace_context_requests_fail_closed(): void
    {
        $this->getJson('/test-api/campaigns/')->assertUnauthorized();

        $owner = $this->createUser('campaign-no-context@example.test');
        $this->createWorkspace($owner);

        $this->actingAs($owner)->getJson('/test-api/campaigns/')->assertForbidden();
    }

    private function campaignPayload(Project $project): array
    {
        return [
            'project_id' => $project->id,
            'name' => 'Autumn conversion push',
            'description' => 'A multi-channel autumn campaign.',
            'status' => Campaign::STATUS_ACTIVE,
            'platform' => Campaign::PLATFORM_META,
            'channel' => 'Paid social',
            'objective' => 'Increase conversions',
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-31',
            'budget' => '1250.50',
            'spend' => '840.25',
            'leads' => 180,
            'customers' => 42,
            'revenue' => '3400.00',
        ];
    }

    private function createUser(string $email): User
    {
        return User::create([
            'name' => 'Campaign Test User',
            'email' => $email,
            'password' => 'password',
        ]);
    }

    private function createWorkspace(User $owner): Workspace
    {
        return Workspace::createWithInitialOwner($owner, [
            'name' => 'Campaign workspace '.$owner->id,
            'slug' => 'campaign-workspace-'.$owner->id,
        ]);
    }

    private function createProject(Workspace $workspace, User $owner, string $name): Project
    {
        return app(TenantContext::class)->runInContext($workspace, function () use ($owner, $name): Project {
            $project = new Project([
                'name' => $name,
                'status' => Project::STATUS_ACTIVE,
                'start_date' => '2026-10-01',
                'end_date' => '2026-11-01',
            ]);
            $project->owner_id = $owner->id;
            $project->save();

            return $project;
        });
    }

    private function createCampaign(
        Workspace $workspace,
        Project $project,
        User $creator,
        string $name,
        string $platform = Campaign::PLATFORM_META,
        string $status = Campaign::STATUS_ACTIVE,
    ): Campaign {
        return app(TenantContext::class)->runInContext($workspace, function () use ($project, $creator, $name, $platform, $status): Campaign {
            $campaign = new Campaign([
                'project_id' => $project->id,
                'name' => $name,
                'status' => $status,
                'platform' => $platform,
                'channel' => $platform,
                'start_date' => '2026-10-01',
                'end_date' => '2026-10-31',
                'budget' => '100.00',
                'spend' => '25.50',
                'leads' => 3,
                'customers' => 1,
                'revenue' => '300.00',
            ]);
            $campaign->created_by = $creator->id;
            $campaign->save();

            return $campaign;
        });
    }
}
