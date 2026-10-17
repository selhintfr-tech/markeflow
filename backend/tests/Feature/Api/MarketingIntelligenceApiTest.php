<?php

namespace Tests\Feature\Api;

use App\Models\Audience;
use App\Models\Campaign;
use App\Models\MarketingStrategy;
use App\Models\MarketResearchProject;
use App\Models\Project;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class MarketingIntelligenceApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(TenantContext::class)->clear();
        Route::prefix('test-api')->group(function (): void {
            require base_path('routes/audiences.php');
            require base_path('routes/strategies.php');
            require base_path('routes/research.php');
        });
    }

    public function test_owner_can_manage_audience_segmentation_and_campaign_relationships(): void
    {
        $owner = $this->createUser('intel-audience-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $project = $this->createProject($workspace, $owner);
        $campaign = $this->createCampaign($workspace, $owner, $project);

        $created = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/audiences/', [
                'name' => 'Urban outdoor shoppers',
                'description' => 'Prospective seasonal customers.',
                'demographics' => ['age_range' => '25-44', 'household_income' => 'mid'],
                'locations' => ['New York', 'Chicago'],
                'interests' => ['Hiking', 'Sustainable products'],
                'characteristics' => ['Mobile-first'],
                'segmentation_criteria' => ['purchase_frequency' => ['min' => 2]],
                'estimated_size' => 150000,
                'status' => 'Active',
                'campaign_ids' => [$campaign->id],
            ])
            ->assertCreated()
            ->assertJsonPath('data.workspace_id', $workspace->id)
            ->assertJsonPath('data.created_by', $owner->id)
            ->assertJsonPath('data.estimated_size', 150000)
            ->assertJsonPath('data.campaign_ids.0', $campaign->id);
        $audienceId = $created->json('data.id');

        $this->getJson('/test-api/audiences?search=outdoor&status=Active&campaign_id='.$campaign->id.'&per_page=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.locations.0', 'New York');

        $this->patchJson('/test-api/audiences/'.$audienceId, [
            'name' => 'Urban adventure shoppers',
            'campaign_ids' => [],
        ])->assertOk()
            ->assertJsonPath('data.name', 'Urban adventure shoppers')
            ->assertJsonCount(0, 'data.campaign_ids');

        $this->deleteJson('/test-api/audiences/'.$audienceId)->assertOk();
        $this->assertDatabaseMissing('audiences', ['id' => $audienceId]);
    }

    public function test_audience_validates_fields_and_rejects_cross_workspace_campaign_associations(): void
    {
        $owner = $this->createUser('intel-audience-validation@example.test');
        $workspace = $this->createWorkspace($owner);
        $otherOwner = $this->createUser('intel-audience-other@example.test');
        $otherWorkspace = $this->createWorkspace($otherOwner);
        $foreignCampaign = $this->createCampaign($otherWorkspace, $otherOwner, $this->createProject($otherWorkspace, $otherOwner));

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/audiences/', [
                'name' => '',
                'estimated_size' => -1,
                'status' => 'Unknown',
                'campaign_ids' => [$foreignCampaign->id],
                'workspace_id' => $otherWorkspace->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'estimated_size', 'status', 'campaign_ids.0', 'workspace_id']);
        $this->assertDatabaseCount('audiences', 0);
    }

    public function test_marketing_strategy_crud_filters_and_same_workspace_relationships(): void
    {
        $owner = $this->createUser('intel-strategy-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $project = $this->createProject($workspace, $owner);
        $campaign = $this->createCampaign($workspace, $owner, $project);
        $audience = $this->createAudience($workspace, $owner);

        $created = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/strategies/', [
                'name' => 'Q4 growth strategy',
                'objectives' => ['Increase qualified demand'],
                'success_metrics' => ['Qualified leads +20%'],
                'channels' => ['Email', 'Paid search'],
                'budget' => '25000.50',
                'starts_on' => '2026-10-01',
                'ends_on' => '2026-12-31',
                'status' => 'Planned',
                'progress' => 10,
                'action_plan' => [['title' => 'Launch landing page', 'due_date' => '2026-10-30']],
                'project_id' => $project->id,
                'campaign_id' => $campaign->id,
                'audience_ids' => [$audience->id],
            ])
            ->assertCreated()
            ->assertJsonPath('data.workspace_id', $workspace->id)
            ->assertJsonPath('data.created_by', $owner->id)
            ->assertJsonPath('data.budget', '25000.50')
            ->assertJsonPath('data.audience_ids.0', $audience->id);
        $strategyId = $created->json('data.id');

        $this->getJson('/test-api/strategies?search=growth&status=Planned&project_id='.$project->id.'&audience_id='.$audience->id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 1);

        $this->putJson('/test-api/strategies/'.$strategyId, [
            'name' => 'Q4 demand strategy',
            'progress' => 45,
        ])->assertOk()
            ->assertJsonPath('data.name', 'Q4 demand strategy')
            ->assertJsonPath('data.progress', 45);
        $this->patchJson('/test-api/strategies/'.$strategyId, ['ends_on' => '2026-09-30'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['ends_on']);

        $foreignOwner = $this->createUser('intel-strategy-foreign@example.test');
        $foreignWorkspace = $this->createWorkspace($foreignOwner);
        $foreignProject = $this->createProject($foreignWorkspace, $foreignOwner);
        $this->patchJson('/test-api/strategies/'.$strategyId, ['project_id' => $foreignProject->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['project_id']);

        $this->deleteJson('/test-api/strategies/'.$strategyId)->assertOk();
        $this->assertDatabaseMissing('marketing_strategies', ['id' => $strategyId]);
    }

    public function test_research_crud_filters_and_persists_competitor_findings_swot_and_sources(): void
    {
        $owner = $this->createUser('intel-research-owner@example.test');
        $workspace = $this->createWorkspace($owner);

        $created = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/research/', [
                'name' => 'Sustainable apparel landscape',
                'category' => 'Competitor analysis',
                'status' => 'In Progress',
                'starts_on' => '2026-10-01',
                'ends_on' => '2026-11-30',
                'competitor_profiles' => [[
                    'name' => 'Northwind Apparel',
                    'website' => 'https://northwind.example',
                    'strengths' => ['Strong brand'],
                    'weaknesses' => ['Limited sizing'],
                ]],
                'opportunities' => [['title' => 'Demand growth', 'description' => 'Category growth']],
                'threats' => [['title' => 'Price pressure']],
                'findings' => [['title' => 'Buyer preference', 'insight' => 'Buyers prefer verified sourcing.']],
                'swot' => [['category' => 'strength', 'item' => 'Direct customer relationships']],
                'sources' => [['title' => 'Industry report', 'url' => 'https://example.test/report', 'accessed_on' => '2026-10-10']],
                'notes' => 'Review quarterly.',
            ])
            ->assertCreated()
            ->assertJsonPath('data.workspace_id', $workspace->id)
            ->assertJsonPath('data.created_by', $owner->id)
            ->assertJsonPath('data.competitor_profiles.0.name', 'Northwind Apparel')
            ->assertJsonPath('data.swot.0.category', 'strength')
            ->assertJsonPath('data.sources.0.url', 'https://example.test/report');
        $researchId = $created->json('data.id');

        $this->getJson('/test-api/research?search=apparel&category=Competitor%20analysis&status=In%20Progress&from=2026-10-15&to=2026-12-01')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 1);

        $this->patchJson('/test-api/research/'.$researchId, [
            'status' => 'Completed',
            'findings' => [['title' => 'Validated insight', 'insight' => 'Research confirms demand.']],
        ])->assertOk()
            ->assertJsonPath('data.status', 'Completed')
            ->assertJsonPath('data.findings.0.title', 'Validated insight');
        $this->patchJson('/test-api/research/'.$researchId, ['ends_on' => '2026-09-30'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['ends_on']);

        $this->deleteJson('/test-api/research/'.$researchId)->assertOk();
        $this->assertDatabaseMissing('market_research_projects', ['id' => $researchId]);
    }

    public function test_viewers_can_read_but_cannot_write_and_other_workspaces_are_isolated(): void
    {
        $owner = $this->createUser('intel-isolation-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $audience = $this->createAudience($workspace, $owner);
        $strategy = $this->createStrategy($workspace, $owner, $audience);
        $research = $this->createResearch($workspace, $owner);
        $viewer = $this->createUser('intel-isolation-viewer@example.test');
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $viewer->id,
            'role' => WorkspaceUser::ROLE_VIEWER,
        ]);

        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/test-api/audiences/'.$audience->id)
            ->assertOk();
        $this->postJson('/test-api/audiences/', ['name' => 'Denied'])->assertForbidden();
        $this->postJson('/test-api/strategies/', ['name' => 'Denied'])->assertForbidden();
        $this->postJson('/test-api/research/', ['name' => 'Denied', 'category' => 'Market'])->assertForbidden();

        $member = $this->createUser('intel-isolation-member@example.test');
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $member->id,
            'role' => WorkspaceUser::ROLE_MEMBER,
        ]);
        $this->actingAs($member)
            ->postJson('/test-api/audiences/', ['name' => 'Member audience'])
            ->assertCreated();

        $outsider = $this->createUser('intel-isolation-outsider@example.test');
        $this->actingAs($outsider)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/test-api/audiences')
            ->assertForbidden();

        $otherOwner = $this->createUser('intel-isolation-other@example.test');
        $otherWorkspace = $this->createWorkspace($otherOwner);
        $otherAudience = $this->createAudience($otherWorkspace, $otherOwner);
        $otherStrategy = $this->createStrategy($otherWorkspace, $otherOwner);
        $otherResearch = $this->createResearch($otherWorkspace, $otherOwner);

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/test-api/audiences/'.$otherAudience->id)
            ->assertNotFound();
        $this->getJson('/test-api/strategies/'.$otherStrategy->id)->assertNotFound();
        $this->getJson('/test-api/research/'.$otherResearch->id)->assertNotFound();
        $this->deleteJson('/test-api/audiences/'.$otherAudience->id)->assertNotFound();

        $this->actingAs($owner)
            ->withoutHeader('X-Workspace-Id')
            ->getJson('/test-api/research')
            ->assertForbidden();
    }

    public function test_research_nested_data_and_strategy_amount_validation_reject_invalid_inputs(): void
    {
        $owner = $this->createUser('intel-invalid-owner@example.test');
        $workspace = $this->createWorkspace($owner);

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/research/', [
                'name' => 'Invalid research',
                'category' => 'Market',
                'status' => 'Unknown',
                'starts_on' => '2026-12-01',
                'ends_on' => '2026-11-01',
                'competitor_profiles' => [['website' => 'not-a-url']],
                'swot' => [['category' => 'other', 'item' => 'Invalid category']],
                'sources' => [['title' => 'Source', 'url' => 'not-a-url']],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'status',
                'ends_on',
                'competitor_profiles.0.name',
                'competitor_profiles.0.website',
                'swot.0.category',
                'sources.0.url',
            ]);

        $this->postJson('/test-api/strategies/', [
            'name' => 'Invalid strategy',
            'budget' => '-1.00',
            'progress' => 101,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['budget', 'progress']);
        $this->assertDatabaseCount('market_research_projects', 0);
        $this->assertDatabaseCount('marketing_strategies', 0);
    }

    private function createUser(string $email): User
    {
        return User::create([
            'name' => 'Marketing Intelligence User',
            'email' => $email,
            'password' => 'password',
        ]);
    }

    private function createWorkspace(User $owner): Workspace
    {
        return Workspace::createWithInitialOwner($owner, [
            'name' => 'Intelligence '.$owner->id,
            'slug' => 'intelligence-'.$owner->id,
        ]);
    }

    private function createProject(Workspace $workspace, User $owner): Project
    {
        return app(TenantContext::class)->runInContext($workspace, function () use ($owner): Project {
            $project = new Project([
                'name' => 'Intelligence project',
                'status' => Project::STATUS_ACTIVE,
                'start_date' => '2026-10-01',
                'end_date' => '2026-12-31',
            ]);
            $project->owner_id = $owner->id;
            $project->save();

            return $project;
        });
    }

    private function createCampaign(Workspace $workspace, User $owner, Project $project): Campaign
    {
        return app(TenantContext::class)->runInContext($workspace, function () use ($owner, $project): Campaign {
            $campaign = new Campaign([
                'project_id' => $project->id,
                'name' => 'Intelligence campaign',
                'status' => Campaign::STATUS_ACTIVE,
                'platform' => Campaign::PLATFORM_META,
                'channel' => 'Paid social',
                'start_date' => '2026-10-01',
                'end_date' => '2026-12-31',
            ]);
            $campaign->created_by = $owner->id;
            $campaign->save();

            return $campaign;
        });
    }

    private function createAudience(Workspace $workspace, User $creator): Audience
    {
        return app(TenantContext::class)->runInContext($workspace, function () use ($creator): Audience {
            $audience = new Audience([
                'name' => 'Test target audience',
                'status' => 'Active',
            ]);
            $audience->created_by = $creator->id;
            $audience->save();

            return $audience;
        });
    }

    private function createStrategy(Workspace $workspace, User $creator, ?Audience $audience = null): MarketingStrategy
    {
        return app(TenantContext::class)->runInContext($workspace, function () use ($workspace, $creator, $audience): MarketingStrategy {
            $strategy = new MarketingStrategy([
                'name' => 'Test strategy',
                'status' => 'Planned',
            ]);
            $strategy->created_by = $creator->id;
            $strategy->save();
            if ($audience) {
                $strategy->audiences()->syncWithPivotValues([$audience->id], [
                    'workspace_id' => $workspace->id,
                ]);
            }

            return $strategy;
        });
    }

    private function createResearch(Workspace $workspace, User $creator): MarketResearchProject
    {
        return app(TenantContext::class)->runInContext($workspace, function () use ($creator): MarketResearchProject {
            $research = new MarketResearchProject([
                'name' => 'Private research',
                'category' => 'Market',
                'status' => 'Planned',
            ]);
            $research->created_by = $creator->id;
            $research->save();

            return $research;
        });
    }
}
