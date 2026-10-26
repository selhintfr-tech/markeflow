<?php

namespace Tests\Feature\Api;

use App\Models\Campaign;
use App\Models\Crm\CrmCustomer;
use App\Models\Crm\CrmLead;
use App\Models\FinanceBudget;
use App\Models\FinanceTransaction;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class AnalyticsReportsComparisonsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Route::prefix('api')->group(base_path('routes/analytics.php'));
        Route::prefix('api')->group(base_path('routes/reports.php'));
        Route::prefix('api')->group(base_path('routes/comparisons.php'));
    }

    public function test_analytics_aggregates_real_workspace_records_and_excludes_other_tenants(): void
    {
        $owner = $this->createUser('analytics-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $otherOwner = $this->createUser('analytics-other@example.test');
        $otherWorkspace = $this->createWorkspace($otherOwner);

        $this->seedRecords($workspace, $owner, spend: '0.00', revenue: '100.00');
        $this->seedRecords($otherWorkspace, $otherOwner, spend: '999.00', revenue: '9999.00');

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/analytics/overview')
            ->assertOk()
            ->assertJsonPath('data.projects', 1)
            ->assertJsonPath('data.campaigns', 1)
            ->assertJsonPath('data.tasks.total', 2)
            ->assertJsonPath('data.tasks.completed', 1)
            ->assertJsonPath('data.tasks.completion_rate', 50)
            ->assertJsonPath('data.crm.leads', 2)
            ->assertJsonPath('data.crm.converted_leads', 1)
            ->assertJsonPath('data.crm.conversion_rate', 50)
            ->assertJsonPath('data.crm.customers', 1)
            ->assertJsonPath('data.campaign_financials.spend', 0)
            ->assertJsonPath('data.finance.income', 100)
            ->assertJsonPath('data.finance.expenses', 25.5)
            ->assertJsonPath('data.finance.budgeted_expenses', 200)
            ->assertJsonPath('data.finance.profit', 74.5);

        $this->getJson('/api/analytics/timeseries')
            ->assertOk()
            ->assertJsonCount(1, 'data.series.campaigns')
            ->assertJsonPath('data.series.expenses.0.value', 25.5);

        $this->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/analytics/overview?from=not-a-date')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['from']);
    }

    public function test_analytics_overview_includes_ongoing_campaign_financials_in_period_filter(): void
    {
        $owner = $this->createUser('ongoing-analytics@example.test');
        $workspace = $this->createWorkspace($owner);

        app(TenantContext::class)->runInContext($workspace, function () use ($workspace, $owner): void {
            $project = new Project([
                'name' => 'Marketing Project',
                'status' => 'Active',
                'start_date' => '2026-01-01',
                'end_date' => '2026-12-31',
            ]);
            $project->workspace_id = $workspace->id;
            $project->owner_id = $owner->id;
            $project->save();

            $campaign = new Campaign([
                'project_id' => $project->id,
                'name' => 'Ongoing Meta Ads Campaign',
                'status' => 'Planned',
                'platform' => 'Meta',
                'channel' => 'Meta Ads',
                'start_date' => '2026-01-11',
                'end_date' => null,
                'budget' => '1000.00',
                'spend' => '0.00',
                'leads' => 0,
                'customers' => 0,
                'revenue' => '0.00',
            ]);
            $campaign->workspace_id = $workspace->id;
            $campaign->created_by = $owner->id;
            $campaign->save();

            $budget = new FinanceBudget([
                'name' => 'Advertising Budget',
                'category' => 'Advertising',
                'amount' => '1000.00',
                'starts_on' => '2026-10-01',
                'ends_on' => '2026-10-31',
            ]);
            $budget->workspace_id = $workspace->id;
            $budget->created_by = $owner->id;
            $budget->save();

            $tx1 = new FinanceTransaction([
                'type' => 'expense',
                'category' => 'Advertising / Marketing',
                'amount' => '262.42',
                'occurred_on' => '2026-10-19',
                'description' => 'Meta ad spend #1',
            ]);
            $tx1->workspace_id = $workspace->id;
            $tx1->created_by = $owner->id;
            $tx1->save();

            $tx2 = new FinanceTransaction([
                'type' => 'expense',
                'category' => 'Advertising / Marketing',
                'amount' => '60.77',
                'occurred_on' => '2026-10-20',
                'description' => 'Meta ad spend #2',
            ]);
            $tx2->workspace_id = $workspace->id;
            $tx2->created_by = $owner->id;
            $tx2->save();
        });

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/analytics/overview?from=2026-10-01&to=2026-10-31')
            ->assertOk()
            ->assertJsonPath('data.campaign_financials.budget', 1000)
            ->assertJsonPath('data.campaign_financials.spend', 0)
            ->assertJsonPath('data.advertising.workspace_total_spend', 323.19)
            ->assertJsonPath('data.advertising.unattributed_spend', 323.19)
            ->assertJsonPath('data.advertising.attributed_spend', 0)
            ->assertJsonPath('data.advertising.budget', 1000)
            ->assertJsonPath('data.advertising.transaction_count', 2)
            ->assertJsonPath('data.finance.expenses', 323.19)
            ->assertJsonPath('data.finance.budgeted_expenses', 1000);
    }

    public function test_comparisons_handle_zero_baselines_and_reject_cross_workspace_campaigns(): void
    {
        $owner = $this->createUser('comparison-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $foreignOwner = $this->createUser('comparison-foreign@example.test');
        $foreignWorkspace = $this->createWorkspace($foreignOwner);
        $campaigns = $this->seedRecords($workspace, $owner, spend: '0.00', revenue: '40.00');
        $foreignCampaign = $this->seedRecords($foreignWorkspace, $foreignOwner, spend: '1.00', revenue: '2.00');

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/comparisons/campaigns?campaign_a='.$campaigns['campaign']->id.'&campaign_b='.$foreignCampaign['campaign']->id)
            ->assertNotFound();
        $this->getJson('/api/comparisons/campaign-performance?campaign_a='.$campaigns['campaign']->id.'&campaign_b='.$foreignCampaign['campaign']->id.'&from=2026-10-01&to=2026-10-31')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['campaign_b']);

        $otherCampaign = app(TenantContext::class)->runInContext(
            $workspace,
            fn () => $this->createCampaign($workspace, $owner, spend: '0.00', revenue: '0.00')
        );
        $this->getJson('/api/comparisons/campaigns?campaign_a='.$campaigns['campaign']->id.'&campaign_b='.$otherCampaign->id)
            ->assertOk()
            ->assertJsonPath('data.metrics.spend.percent_change', null)
            ->assertJsonPath('data.metrics.revenue.percent_change', null);
        $this->getJson('/api/comparisons/campaign-performance?campaign_a='.$campaigns['campaign']->id.'&campaign_b='.$otherCampaign->id.'&from=2026-10-01&to=2026-10-31')
            ->assertOk()
            ->assertJsonPath('data.metrics.revenue.campaign_a', 0)
            ->assertJsonPath('data.metrics.costs.campaign_a', 0)
            ->assertJsonPath('data.metrics.profit.campaign_a', 0)
            ->assertJsonPath('data.metrics.leads.campaign_a', 0)
            ->assertJsonPath('data.metrics.revenue.percent_change', null);

        $this->getJson('/api/comparisons/periods?from=2026-10-10&to=2026-10-12')
            ->assertOk()
            ->assertJsonPath('data.metrics.finance.income.percent_change', null);
    }

    public function test_campaign_performance_comparison_uses_period_ledger_and_linked_crm_data(): void
    {
        $owner = $this->createUser('campaign-performance-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $records = $this->seedRecords($workspace, $owner, spend: '900.00', revenue: '5000.00');
        $campaignA = $records['campaign'];
        $campaignB = app(TenantContext::class)->runInContext(
            $workspace,
            fn () => $this->createCampaign($workspace, $owner, spend: '700.00', revenue: '4000.00', project: $records['project'])
        );

        app(TenantContext::class)->runInContext($workspace, function () use ($workspace, $owner, $campaignA, $campaignB): void {
            foreach ([
                [$campaignA, 'income', '100.00', '2026-10-10'],
                [$campaignA, 'expense', '20.00', '2026-10-11'],
                [$campaignB, 'income', '75.00', '2026-10-10'],
                [$campaignB, 'expense', '10.00', '2026-10-12'],
                [$campaignA, 'income', '500.00', '2026-09-30'],
            ] as [$campaign, $type, $amount, $date]) {
                $transaction = new FinanceTransaction([
                    'campaign_id' => $campaign->id,
                    'type' => $type,
                    'category' => 'Campaign test',
                    'amount' => $amount,
                    'occurred_on' => $date,
                ]);
                $transaction->workspace_id = $workspace->id;
                $transaction->created_by = $owner->id;
                $transaction->save();
            }

            foreach ([[$campaignA, 'A lead'], [$campaignA, 'Another A lead'], [$campaignB, 'B lead']] as [$campaign, $name]) {
                $lead = new CrmLead([
                    'source_campaign_id' => $campaign->id,
                    'name' => $name,
                    'status' => 'New',
                ]);
                $lead->workspace_id = $workspace->id;
                $lead->created_at = '2026-10-10 09:00:00';
                $lead->updated_at = '2026-10-10 09:00:00';
                $lead->save();
            }
            $outOfRangeLead = new CrmLead([
                'source_campaign_id' => $campaignA->id,
                'name' => 'Out of range lead',
                'status' => 'New',
            ]);
            $outOfRangeLead->workspace_id = $workspace->id;
            $outOfRangeLead->created_at = '2026-09-30 09:00:00';
            $outOfRangeLead->updated_at = '2026-09-30 09:00:00';
            $outOfRangeLead->save();
        });

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/comparisons/campaign-performance?campaign_a='.$campaignA->id.'&campaign_b='.$campaignB->id.'&from=2026-10-01&to=2026-10-31')
            ->assertOk()
            ->assertJsonPath('data.period.from', '2026-10-01')
            ->assertJsonPath('data.campaign_a.id', $campaignA->id)
            ->assertJsonPath('data.metrics.revenue.campaign_a', 100)
            ->assertJsonPath('data.metrics.revenue.campaign_b', 75)
            ->assertJsonPath('data.metrics.costs.campaign_a', 20)
            ->assertJsonPath('data.metrics.costs.campaign_b', 10)
            ->assertJsonPath('data.metrics.profit.campaign_a', 80)
            ->assertJsonPath('data.metrics.profit.campaign_b', 65)
            ->assertJsonPath('data.metrics.profit.change', 15)
            ->assertJsonPath('data.metrics.leads.campaign_a', 2)
            ->assertJsonPath('data.metrics.leads.campaign_b', 1);

        $this->getJson('/api/comparisons/campaign-performance?campaign_a='.$campaignA->id.'&campaign_b='.$campaignA->id.'&from=2026-10-01&to=2026-10-31')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['campaign_b']);
        $this->getJson('/api/comparisons/campaign-performance?campaign_a='.$campaignA->id.'&campaign_b='.$campaignB->id.'&from=2026-11-01&to=2026-10-31')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['to']);
    }

    public function test_saved_reports_support_crud_generation_csv_and_tenant_isolation(): void
    {
        $owner = $this->createUser('reports-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $this->seedRecords($workspace, $owner, spend: '0.00', revenue: '100.00');
        $otherOwner = $this->createUser('reports-other@example.test');
        $otherWorkspace = $this->createWorkspace($otherOwner);

        $createdReport = $this->actingAs($owner)->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/reports', [
                'name' => 'October finance',
                'type' => 'finance',
                'from_date' => '2026-10-01',
                'to_date' => '2026-10-31',
            ])->assertCreated()
            ->assertJsonPath('data.workspace_id', $workspace->id)
            ->assertJsonPath('data.created_by', $owner->id)
            ->assertJsonPath('data.type', 'finance');
        $reportId = $createdReport->json('data.id');
        $this->assertSame('Draft', $createdReport->json('data.status'));
        $this->assertSame($owner->name, $createdReport->json('data.created_by_name'));

        $viewer = $this->createUser('reports-viewer@example.test');
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $viewer->id,
            'role' => WorkspaceUser::ROLE_VIEWER,
        ]);
        $this->actingAs($viewer)->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/reports')
            ->assertOk()
            ->assertJsonCount(1, 'data');
        $this->postJson('/api/reports', ['name' => 'Viewer report', 'type' => 'overview'])
            ->assertForbidden();
        $this->actingAs($owner)->withHeader('X-Workspace-Id', $workspace->id);

        $this->postJson('/api/reports/'.$reportId.'/run')
            ->assertOk()
            ->assertJsonPath('data.report.id', $reportId)
            ->assertJsonPath('data.data.0.type', 'expense')
            ->assertJsonPath('data.data.0.total', 25.5);
        $this->get('/api/reports/'.$reportId.'/export.csv')
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');

        $this->patchJson('/api/reports/'.$reportId, ['name' => 'Updated October finance'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Updated October finance');
        $this->patchJson('/api/reports/'.$reportId, ['status' => 'Ready'])
            ->assertOk()
            ->assertJsonPath('data.status', 'Ready');
        $this->getJson('/api/reports?status=Ready')
            ->assertOk()
            ->assertJsonCount(1, 'data');
        $this->getJson('/api/reports?status=Invalid')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);
        $this->getJson('/api/reports?status=Unassigned')
            ->assertOk()
            ->assertJsonCount(0, 'data');
        $this->actingAs($otherOwner)->withHeader('X-Workspace-Id', $otherWorkspace->id)
            ->getJson('/api/reports/'.$reportId)
            ->assertNotFound();
        $this->actingAs($owner)->withHeader('X-Workspace-Id', $workspace->id);
        $this->deleteJson('/api/reports/'.$reportId)->assertOk();
        $this->assertDatabaseMissing('saved_reports', ['id' => $reportId]);

        $this->postJson('/api/reports', ['name' => '', 'type' => 'unknown'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'type']);
    }

    public function test_project_reports_are_workspace_scoped_and_respect_selected_metrics(): void
    {
        $owner = $this->createUser('project-reports-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $records = $this->seedRecords($workspace, $owner, spend: '0.00', revenue: '0.00');

        $this->actingAs($owner)->withHeader('X-Workspace-Id', $workspace->id);
        $reportId = $this->postJson('/api/reports', [
            'name' => 'Project progress report',
            'type' => 'projects',
            'from_date' => '2026-10-01',
            'to_date' => '2026-10-31',
            'filters' => ['project_id' => $records['project']->id],
            'configuration' => ['metrics' => ['progress']],
        ])->assertCreated()
            ->assertJsonPath('data.type', 'projects')
            ->json('data.id');

        $this->postJson('/api/reports/'.$reportId.'/run')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $records['project']->id)
            ->assertJsonPath('data.data.0.name', 'Project')
            ->assertJsonStructure(['data' => ['data' => [['progress']]]]);
    }

    private function createUser(string $email): User
    {
        return User::create(['name' => 'Analytics User', 'email' => $email, 'password' => 'password']);
    }

    private function createWorkspace(User $owner): Workspace
    {
        return Workspace::createWithInitialOwner($owner, [
            'name' => 'Analytics '.$owner->id,
            'slug' => 'analytics-'.$owner->id,
        ]);
    }

    /**
     * @return array{project: Project, campaign: Campaign}
     */
    private function seedRecords(Workspace $workspace, User $owner, string $spend, string $revenue): array
    {
        return app(TenantContext::class)->runInContext($workspace, function () use ($workspace, $owner, $spend, $revenue): array {
            $project = new Project([
                'name' => 'Project',
                'status' => 'Active',
                'start_date' => '2026-10-01',
                'end_date' => '2026-10-31',
            ]);
            $project->workspace_id = $workspace->id;
            $project->owner_id = $owner->id;
            $project->save();

            $campaign = $this->createCampaign($workspace, $owner, $spend, $revenue, $project);
            $budget = new FinanceBudget([
                'name' => 'Marketing budget',
                'category' => 'Marketing',
                'amount' => '200.00',
                'starts_on' => '2026-10-01',
                'ends_on' => '2026-10-31',
            ]);
            $budget->workspace_id = $workspace->id;
            $budget->created_by = $owner->id;
            $budget->save();

            foreach (['Completed', 'To Do'] as $status) {
                $task = new Task([
                    'title' => 'Task '.$status,
                    'status' => $status,
                    'priority' => 'Medium',
                    'due_date' => '2026-10-20',
                ]);
                $task->workspace_id = $workspace->id;
                $task->created_by = $owner->id;
                $task->project_id = $project->id;
                $task->campaign_id = $campaign->id;
                $task->save();
            }

            foreach ([['New', null], ['Converted', now()]] as [$status, $convertedAt]) {
                $lead = new CrmLead(['name' => 'Lead '.$status, 'status' => $status, 'converted_at' => $convertedAt]);
                $lead->workspace_id = $workspace->id;
                $lead->save();
            }

            $customer = new CrmCustomer([
                'company_name' => 'Customer',
                'contact_name' => 'Customer Contact',
                'total_revenue' => '10.00',
            ]);
            $customer->workspace_id = $workspace->id;
            $customer->save();

            foreach ([['expense', '25.50'], ['income', '100.00']] as [$type, $amount]) {
                $transaction = new FinanceTransaction([
                    'type' => $type,
                    'category' => 'Marketing',
                    'amount' => $amount,
                    'occurred_on' => '2026-10-10',
                ]);
                $transaction->workspace_id = $workspace->id;
                $transaction->created_by = $owner->id;
                $transaction->save();
            }

            return compact('project', 'campaign');
        });
    }

    private function createCampaign(Workspace $workspace, User $owner, string $spend, string $revenue, ?Project $project = null): Campaign
    {
        if (! $project) {
            $project = new Project([
                'name' => 'Comparison Project',
                'status' => 'Active',
                'start_date' => '2026-10-01',
                'end_date' => '2026-10-31',
            ]);
            $project->workspace_id = $workspace->id;
            $project->owner_id = $owner->id;
            $project->save();
        }

        $campaign = new Campaign([
            'project_id' => $project->id,
            'name' => 'Campaign',
            'status' => 'Active',
            'platform' => 'Email',
            'channel' => 'Email',
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-31',
            'budget' => '200.00',
            'spend' => $spend,
            'leads' => 1,
            'customers' => 1,
            'revenue' => $revenue,
        ]);
        $campaign->workspace_id = $workspace->id;
        $campaign->created_by = $owner->id;
        $campaign->save();

        return $campaign;
    }
}
