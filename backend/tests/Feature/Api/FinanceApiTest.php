<?php

namespace Tests\Feature\Api;

use App\Models\FinanceTransaction;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class FinanceApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Route::prefix('api')->group(base_path('routes/finance.php'));
    }

    public function test_owner_can_manage_budgets_and_finance_transactions(): void
    {
        $owner = $this->createUser('finance-owner@example.test');
        $workspace = $this->createWorkspace($owner);

        $budget = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/finance/budgets', [
                'name' => 'Marketing budget',
                'category' => 'Marketing',
                'amount' => '1250.50',
                'starts_on' => '2026-10-01',
                'ends_on' => '2026-10-31',
            ])
            ->assertCreated()
            ->assertJsonPath('data.workspace_id', $workspace->id)
            ->assertJsonPath('data.created_by', $owner->id)
            ->assertJsonPath('data.amount', '1250.50');
        $budgetId = $budget->json('data.id');

        $expense = $this->postJson('/api/finance/transactions', [
            'type' => FinanceTransaction::TYPE_EXPENSE,
            'category' => 'Marketing',
            'description' => 'Search ads',
            'amount' => '125.25',
            'occurred_on' => '2026-10-10',
            'workspace_id' => $this->createWorkspace($this->createUser('forged-workspace@example.test'))->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['workspace_id']);

        $expense = $this->postJson('/api/finance/transactions', [
            'type' => FinanceTransaction::TYPE_EXPENSE,
            'category' => 'Marketing',
            'description' => 'Search ads',
            'amount' => '125.25',
            'occurred_on' => '2026-10-10',
        ])->assertCreated()
            ->assertJsonPath('data.workspace_id', $workspace->id)
            ->assertJsonPath('data.created_by', $owner->id)
            ->assertJsonPath('data.amount', '125.25');

        $this->postJson('/api/finance/transactions', [
            'type' => FinanceTransaction::TYPE_INCOME,
            'category' => 'Sales',
            'amount' => '500.00',
            'occurred_on' => '2026-10-11',
        ])->assertCreated();

        $this->getJson('/api/finance/transactions?type=expense&category=Marketing&from=2026-10-01&to=2026-10-31')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 1);

        $this->getJson('/api/finance/summary?from=2026-10-01&to=2026-10-31')
            ->assertOk()
            ->assertJsonPath('data.income', 500)
            ->assertJsonPath('data.expenses', 125.25)
            ->assertJsonPath('data.budgets.0.budget', '1250.50')
            ->assertJsonPath('data.budgets.0.actual', 125.25)
            ->assertJsonPath('data.budgets.0.variance', 1125.25);

        $this->putJson('/api/finance/budgets/'.$budgetId, ['name' => 'Updated marketing budget'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Updated marketing budget');
        $this->patchJson('/api/finance/transactions/'.$expense->json('data.id'), [
            'amount' => '130.00',
        ])->assertOk()
            ->assertJsonPath('data.amount', '130.00');
        $this->deleteJson('/api/finance/transactions/'.$expense->json('data.id'))
            ->assertOk();
        $this->deleteJson('/api/finance/budgets/'.$budgetId)
            ->assertOk();

        $this->assertDatabaseCount('finance_budgets', 0);
        $this->assertDatabaseCount('finance_transactions', 1);
    }

    public function test_viewers_can_read_but_cannot_write_finance_records(): void
    {
        $owner = $this->createUser('finance-role-owner@example.test');
        $viewer = $this->createUser('finance-viewer@example.test');
        $member = $this->createUser('finance-member@example.test');
        $workspace = $this->createWorkspace($owner);
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $viewer->id,
            'role' => WorkspaceUser::ROLE_VIEWER,
        ]);
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $member->id,
            'role' => WorkspaceUser::ROLE_MEMBER,
        ]);
        $this->createTransaction($workspace, $owner);

        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/finance/transactions')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->postJson('/api/finance/transactions', [
            'type' => FinanceTransaction::TYPE_EXPENSE,
            'category' => 'Supplies',
            'amount' => '10.00',
            'occurred_on' => '2026-10-10',
        ])->assertForbidden();

        $this->actingAs($member)
            ->postJson('/api/finance/transactions', [
                'type' => FinanceTransaction::TYPE_INCOME,
                'category' => 'Services',
                'amount' => '50.00',
                'occurred_on' => '2026-10-10',
            ])->assertCreated();
    }

    public function test_finance_records_are_isolated_and_missing_context_fails_closed(): void
    {
        $owner = $this->createUser('finance-first-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $foreignOwner = $this->createUser('finance-second-owner@example.test');
        $foreignWorkspace = $this->createWorkspace($foreignOwner);
        $foreignTransaction = $this->createTransaction($foreignWorkspace, $foreignOwner);

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/finance/transactions/'.$foreignTransaction->id)
            ->assertNotFound();
        $this->putJson('/api/finance/transactions/'.$foreignTransaction->id, ['category' => 'Stolen'])
            ->assertNotFound();
        $this->deleteJson('/api/finance/transactions/'.$foreignTransaction->id)
            ->assertNotFound();

        $this->withoutHeader('X-Workspace-Id')
            ->actingAs($owner)
            ->getJson('/api/finance/transactions')
            ->assertForbidden();
        $this->assertSame('General', $foreignTransaction->fresh()->category);
    }

    private function createUser(string $email): User
    {
        return User::create(['name' => 'Finance User', 'email' => $email, 'password' => 'password']);
    }

    private function createWorkspace(User $owner): Workspace
    {
        return Workspace::createWithInitialOwner($owner, [
            'name' => 'Finance '.$owner->id,
            'slug' => 'finance-'.$owner->id,
        ]);
    }

    private function createTransaction(Workspace $workspace, User $creator): FinanceTransaction
    {
        return app(TenantContext::class)->runInContext($workspace, function () use ($creator): FinanceTransaction {
            $transaction = new FinanceTransaction([
                'type' => FinanceTransaction::TYPE_EXPENSE,
                'category' => 'General',
                'amount' => '15.00',
                'occurred_on' => '2026-10-10',
            ]);
            $transaction->created_by = $creator->id;
            $transaction->save();

            return $transaction;
        });
    }
}
