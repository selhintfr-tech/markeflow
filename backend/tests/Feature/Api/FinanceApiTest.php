<?php

namespace Tests\Feature\Api;

use App\Models\Campaign;
use App\Models\FinanceTransaction;
use App\Models\Project;
use App\Models\Sales\SalesCustomer;
use App\Models\Sales\SalesOrder;
use App\Models\Sales\SalesShipment;
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
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.creator_name', $owner->name);

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

    public function test_finance_transactions_filter_by_campaign_and_period(): void
    {
        $owner = $this->createUser('finance-campaign-filter-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $campaign = app(TenantContext::class)->runInContext($workspace, function () use ($owner): Campaign {
            $project = new Project([
                'name' => 'Finance filter project',
                'status' => Project::STATUS_ACTIVE,
                'start_date' => '2026-10-01',
                'end_date' => '2026-10-31',
            ]);
            $project->owner_id = $owner->id;
            $project->save();

            $campaign = new Campaign([
                'project_id' => $project->id,
                'name' => 'Finance filter campaign',
                'status' => Campaign::STATUS_ACTIVE,
                'platform' => Campaign::PLATFORM_META,
                'channel' => Campaign::PLATFORM_META,
                'start_date' => '2026-10-01',
                'end_date' => '2026-10-31',
                'budget' => '2000.00',
                'spend' => '0.00',
                'leads' => 0,
                'customers' => 0,
                'revenue' => '0.00',
            ]);
            $campaign->created_by = $owner->id;
            $campaign->save();

            return $campaign;
        });

        $this->actingAs($owner)->withHeader('X-Workspace-Id', $workspace->id);
        $matched = $this->postJson('/api/finance/transactions', [
            'type' => FinanceTransaction::TYPE_EXPENSE,
            'category' => 'Advertising',
            'amount' => '75.00',
            'occurred_on' => '2026-10-15',
            'campaign_id' => $campaign->id,
        ])->assertCreated()->json('data.id');
        $this->postJson('/api/finance/transactions', [
            'type' => FinanceTransaction::TYPE_EXPENSE,
            'category' => 'Advertising',
            'amount' => '25.00',
            'occurred_on' => '2026-10-15',
        ])->assertCreated();

        $this->getJson('/api/finance/transactions?campaign_id='.$campaign->id.'&from=2026-10-01&to=2026-10-31')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $matched)
            ->assertJsonPath('data.0.campaign_id', $campaign->id);
    }

    public function test_order_profitability_excludes_pending_collections_and_calculates_paid_profit(): void
    {
        $owner = $this->createUser('finance-order-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $customer = SalesCustomer::create([
            'workspace_id' => $workspace->id,
            'first_name' => 'Test',
            'last_name' => 'Customer',
        ]);
        $order = SalesOrder::create([
            'workspace_id' => $workspace->id,
            'customer_id' => $customer->id,
            'order_number' => 'ORD-FINANCE-TEST',
            'status' => 'Pending',
            'payment_status' => 'Pending',
            'subtotal' => '450.00',
            'total' => '450.00',
            'currency' => 'MAD',
            'items' => [['name' => 'Product', 'quantity' => 1, 'unit_price' => 450]],
            'notes' => 'Purchase cost 350 MAD',
        ]);
        SalesShipment::create([
            'workspace_id' => $workspace->id,
            'order_id' => $order->id,
            'shipping_cost' => '35.00',
            'customer_shipping_charge' => '35.00',
            'cod_amount' => '450.00',
        ]);

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/finance/order-profitability')
            ->assertOk()
            ->assertJsonPath('data.0.realized_collected', null)
            ->assertJsonPath('data.0.financials.has_record', false)
            ->assertJsonPath('data.0.financials.product_cost_total', null)
            ->assertJsonPath('data.0.financials.customer_shipping_charge', '35.00')
            ->assertJsonPath('data.0.financials.courier_cost', '35.00')
            ->assertJsonPath('data.0.shipment.customer_shipping_charge', '35.00')
            ->assertJsonPath('data.0.shipment.cod_amount', '450.00')
            ->assertJsonPath('data.0.ozon_flow.expected_cod', 450)
            ->assertJsonPath('data.0.ozon_flow.courier_cost', 35)
            ->assertJsonPath('data.0.ozon_flow.expected_net_remittance', 415);

        $viewer = $this->createUser('finance-order-viewer@example.test');
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $viewer->id,
            'role' => WorkspaceUser::ROLE_VIEWER,
        ]);
        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/finance/order-profitability')
            ->assertOk();
        $this->putJson('/api/finance/orders/'.$order->id.'/profitability', [])
            ->assertForbidden();

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id);
        $this->putJson('/api/finance/orders/'.$order->id.'/profitability', [
            'campaign_id' => null,
            'product_cost_total' => '350.00',
            'customer_shipping_charge' => '35.00',
            'sales_collected' => '450.00',
            'shipping_collected' => '0.00',
            'courier_cost' => '35.00',
            'other_expenses' => '0.00',
            'refund_return_cost' => '0.00',
            'profit_share_percent' => '50.00',
        ])->assertOk()
            ->assertJsonPath('data.realized_collected', null)
            ->assertJsonPath('data.financials.net_order_profit', null);

        // Cannot post to ledger while payment is pending / unverified
        $this->postJson('/api/finance/orders/'.$order->id.'/post-to-ledger')
            ->assertStatus(422)
            ->assertJsonPath('code', 'COLLECTION_NOT_VERIFIED');

        $order->update(['payment_status' => 'Paid']);

        $this->getJson('/api/finance/order-profitability')
            ->assertOk()
            ->assertJsonPath('data.0.realized_collected', 450)
            ->assertJsonPath('data.0.financials.net_order_profit', 65)
            ->assertJsonPath('data.0.financials.partner_profit_share', 32.5)
            ->assertJsonPath('data.0.ledger.is_posted', false);

        // Post to ledger once verified
        $this->postJson('/api/finance/orders/'.$order->id.'/post-to-ledger')
            ->assertOk()
            ->assertJsonPath('data.ledger.is_posted', true)
            ->assertJsonPath('data.ledger.posted_revenue', 450)
            ->assertJsonPath('data.ledger.posted_expenses', 385); // 350 product cost + 35 courier fee

        $this->assertDatabaseCount('finance_transactions', 3);

        // Idempotent re-posting does not duplicate transactions
        $this->postJson('/api/finance/orders/'.$order->id.'/post-to-ledger')
            ->assertOk()
            ->assertJsonPath('data.ledger.is_posted', true);
        $this->assertDatabaseCount('finance_transactions', 3);

        // Duplicate manual transaction for same order and category is blocked
        $this->postJson('/api/finance/transactions', [
            'type' => 'income',
            'category' => 'Sales Revenue',
            'amount' => '450.00',
            'occurred_on' => now()->toDateString(),
            'order_id' => $order->id,
        ])->assertStatus(422);

        $order->update(['status' => 'Cancelled']);
        $this->getJson('/api/finance/order-profitability')
            ->assertOk()
            ->assertJsonPath('data.0.realized_collected', null)
            ->assertJsonPath('data.0.financials.net_order_profit', null);

        // Remove from ledger
        $this->deleteJson('/api/finance/orders/'.$order->id.'/post-to-ledger')
            ->assertOk()
            ->assertJsonPath('data.ledger.is_posted', false);
        $this->assertDatabaseCount('finance_transactions', 0);
    }

    public function test_order_profitability_supports_status_filtering_and_excludes_permanently_deleted_orders(): void
    {
        $owner = $this->createUser('profitability-filter@example.test');
        $workspace = $this->createWorkspace($owner);
        $customer = SalesCustomer::create([
            'workspace_id' => $workspace->id,
            'first_name' => 'Test',
            'last_name' => 'Customer',
        ]);

        $deliveredOrder = SalesOrder::create([
            'workspace_id' => $workspace->id,
            'customer_id' => $customer->id,
            'order_number' => 'ORD-DELIV-01',
            'status' => 'Delivered',
            'payment_status' => 'Paid',
            'subtotal' => '200.00',
            'total' => '240.00',
            'currency' => 'MAD',
            'items' => [['name' => 'Delivered Item', 'quantity' => 1, 'unit_price' => 200.00]],
        ]);
        SalesShipment::create([
            'workspace_id' => $workspace->id,
            'order_id' => $deliveredOrder->id,
            'status' => 'Delivered',
            'customer_shipping_charge' => '40.00',
            'shipping_cost' => '35.00',
            'payment_collection_status' => 'Collected',
        ]);

        $pendingOrder = SalesOrder::create([
            'workspace_id' => $workspace->id,
            'customer_id' => $customer->id,
            'order_number' => 'ORD-PEND-02',
            'status' => 'Pending',
            'payment_status' => 'Pending',
            'subtotal' => '450.00',
            'total' => '485.00',
            'currency' => 'MAD',
            'items' => [['name' => 'Pending Item', 'quantity' => 1, 'unit_price' => 450.00]],
        ]);
        SalesShipment::create([
            'workspace_id' => $workspace->id,
            'order_id' => $pendingOrder->id,
            'status' => 'Pending',
            'customer_shipping_charge' => '35.00',
            'shipping_cost' => '35.00',
            'payment_collection_status' => 'Pending',
        ]);

        // Unfiltered returns all orders in workspace
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/finance/order-profitability')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        // Filter by status=Delivered
        $this->getJson('/api/finance/order-profitability?status=Delivered')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.order_number', 'ORD-DELIV-01');

        // Filter by status=Pending
        $this->getJson('/api/finance/order-profitability?status=Pending')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.order_number', 'ORD-PEND-02');

        // Search by order number
        $this->getJson('/api/finance/order-profitability?search=DELIV')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.order_number', 'ORD-DELIV-01');

        // Permanently delete the pending order
        $pendingOrder->delete();

        // After deletion, order never appears in active profitability list
        $this->getJson('/api/finance/order-profitability')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.order_number', 'ORD-DELIV-01');

        $this->getJson('/api/finance/order-profitability?status=Pending')
            ->assertOk()
            ->assertJsonCount(0, 'data');
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
