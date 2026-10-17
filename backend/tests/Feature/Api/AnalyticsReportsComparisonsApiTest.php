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

        $otherCampaign = app(TenantContext::class)->runInContext(
            $workspace,
            fn () => $this->createCampaign($workspace, $owner, spend: '0.00', revenue: '0.00')
        );
        $this->getJson('/api/comparisons/campaigns?campaign_a='.$campaigns['campaign']->id.'&campaign_b='.$otherCampaign->id)
            ->assertOk()
            ->assertJsonPath('data.metrics.spend.percent_change', null)
            ->assertJsonPath('data.metrics.revenue.percent_change', null);

        $this->getJson('/api/comparisons/periods?from=2026-10-10&to=2026-10-12')
            ->assertOk()
            ->assertJsonPath('data.metrics.finance.income.percent_change', null);
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
