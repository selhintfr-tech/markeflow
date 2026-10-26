<?php

namespace Tests\Feature\Api\Sales;

use App\Models\Sales\SalesCustomer;
use App\Models\Sales\SalesOrder;
use App\Models\Sales\SalesOrderStatusHistory;
use App\Models\Sales\SalesShipment;
use App\Services\TenantContext;
use Tests\Feature\Api\Crm\CrmTestCase;

class SalesOrdersApiTest extends CrmTestCase
{
    public function test_order_records_are_linked_and_status_transitions_are_idempotent(): void
    {
        $owner = $this->createUser('sales-owner@example.test');
        $workspace = $this->createWorkspace($owner);

        $customer = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/sales/customers', [
                'first_name' => 'Nadia',
                'last_name' => 'Bennani',
                'email' => 'nadia@example.test',
            ])
            ->assertCreated()
            ->assertJsonPath('data.first_name', 'Nadia')
            ->json('data');

        $orderResponse = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/sales/orders', [
                'customer_id' => $customer['id'],
                'subtotal' => 150,
                'total' => 175,
                'currency' => 'MAD',
                'items' => [['name' => 'Bag', 'quantity' => 1, 'unit_price' => 150]],
                'shipment' => [
                    'delivery_company_id' => 'carrier-42',
                    'tracking_number' => 'TRACK-100',
                    'shipping_cost' => 25,
                    'customer_shipping_charge' => 25,
                    'cod_amount' => 175,
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'Pending')
            ->assertJsonPath('data.payment_status', 'Pending')
            ->assertJsonPath('data.customer.id', $customer['id'])
            ->assertJsonPath('data.shipments.0.delivery_company_id', 'carrier-42')
            ->assertJsonPath('data.status_history.0.to_status', 'Pending');

        $orderId = $orderResponse->json('data.id');
        $shipmentId = $orderResponse->json('data.shipments.0.id');

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->patchJson('/api/sales/orders/'.$orderId.'/status', ['status' => 'Confirmed'])
            ->assertOk()
            ->assertJsonPath('data.status', 'Confirmed');

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->patchJson('/api/sales/orders/'.$orderId.'/status', ['status' => 'Confirmed'])
            ->assertOk()
            ->assertJsonCount(2, 'data.status_history');

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->patchJson('/api/sales/shipments/'.$shipmentId, ['status' => 'In transit'])
            ->assertOk()
            ->assertJsonPath('data.order.status', 'Shipping');

        $this->assertDatabaseHas('sales_order_status_history', [
            'order_id' => $orderId,
            'from_status' => 'Confirmed',
            'to_status' => 'Shipping',
            'source' => 'shipment',
        ]);

        $this->assertDatabaseHas('sales_orders', [
            'id' => $orderId,
            'customer_id' => $customer['id'],
            'workspace_id' => $workspace->id,
        ]);
        $this->assertDatabaseHas('sales_shipments', [
            'id' => $shipmentId,
            'order_id' => $orderId,
            'cod_amount' => 175,
        ]);
    }

    public function test_customer_order_total_cod_and_courier_cost_are_separate_values(): void
    {
        $owner = $this->createUser('sales-shipping-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $customer = SalesCustomer::create([
            'workspace_id' => $workspace->id,
            'first_name' => 'Samira',
        ]);

        $response = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/sales/orders', [
                'customer_id' => $customer->id,
                'subtotal' => 450,
                'total' => 999,
                'currency' => 'MAD',
                'items' => [['name' => 'Bag', 'quantity' => 1, 'unit_price' => 450]],
                'shipment' => [
                    'shipping_cost' => 35,
                    'customer_shipping_charge' => 35,
                    'cod_amount' => 450,
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.subtotal', '450.00')
            ->assertJsonPath('data.total', '485.00')
            ->assertJsonPath('data.payment_status', 'Pending')
            ->assertJsonPath('data.shipments.0.shipping_cost', '35.00')
            ->assertJsonPath('data.shipments.0.customer_shipping_charge', '35.00')
            ->assertJsonPath('data.shipments.0.cod_amount', '450.00');

        $this->assertDatabaseHas('sales_orders', [
            'id' => $response->json('data.id'),
            'subtotal' => '450.00',
            'total' => '485.00',
            'payment_status' => 'Pending',
        ]);
    }

    public function test_unknown_shipment_amounts_remain_null_and_explicit_zero_remains_zero(): void
    {
        $owner = $this->createUser('sales-unknown-amounts@example.test');
        $workspace = $this->createWorkspace($owner);
        $customer = SalesCustomer::create([
            'workspace_id' => $workspace->id,
            'first_name' => 'Leila',
        ]);

        $response = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/sales/orders', [
                'customer_id' => $customer->id,
                'subtotal' => 100,
                'total' => 100,
                'currency' => 'MAD',
                'items' => [['name' => 'Item', 'quantity' => 1, 'unit_price' => 100]],
                'shipment' => [
                    'customer_shipping_charge' => 0,
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.total', '100.00')
            ->assertJsonPath('data.shipments.0.shipping_cost', null)
            ->assertJsonPath('data.shipments.0.customer_shipping_charge', '0.00')
            ->assertJsonPath('data.shipments.0.cod_amount', null);

        $shipmentId = $response->json('data.shipments.0.id');
        $this->patchJson('/api/sales/shipments/'.$shipmentId, ['cod_amount' => 0])
            ->assertOk()
            ->assertJsonPath('data.cod_amount', '0.00');
        $this->assertDatabaseHas('sales_shipments', [
            'id' => $shipmentId,
            'shipping_cost' => null,
            'cod_amount' => '0.00',
        ]);
    }

    public function test_status_filter_keeps_order_data_and_payment_status_is_independent(): void
    {
        $owner = $this->createUser('sales-filter@example.test');
        $workspace = $this->createWorkspace($owner);

        [$customer, $order] = app(TenantContext::class)->runInContext($workspace, function () use ($workspace): array {
            $customer = SalesCustomer::create([
                'workspace_id' => $workspace->id,
                'first_name' => 'Amina',
            ]);
            $order = SalesOrder::create([
                'workspace_id' => $workspace->id,
                'customer_id' => $customer->id,
                'order_number' => 'ORD-EXISTING',
                'status' => 'Pending',
                'payment_status' => 'Pending',
                'subtotal' => 40,
                'total' => 40,
                'currency' => 'USD',
            ]);

            return [$customer, $order];
        });

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->patchJson('/api/sales/orders/'.$order->id.'/payment-status', ['payment_status' => 'Paid'])
            ->assertOk()
            ->assertJsonPath('data.status', 'Pending')
            ->assertJsonPath('data.payment_status', 'Paid');

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/sales/orders?status=Pending')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.customer.id', $customer->id);

        $this->assertDatabaseHas('sales_orders', ['id' => $order->id, 'status' => 'Pending', 'payment_status' => 'Paid']);
        $this->assertDatabaseCount('sales_order_status_history', 0);
        $this->assertDatabaseHas('sales_customers', ['id' => $customer->id]);
        $this->assertSame(0, SalesShipment::query()->count());
        $this->assertSame(0, SalesOrderStatusHistory::query()->count());
    }

    public function test_eligible_order_can_be_safely_deleted_without_deleting_customer(): void
    {
        $owner = $this->createUser('delete-owner@example.test');
        $workspace = $this->createWorkspace($owner);

        [$customer, $order, $shipment] = app(TenantContext::class)->runInContext($workspace, function () use ($workspace, $owner): array {
            $customer = SalesCustomer::create([
                'workspace_id' => $workspace->id,
                'first_name' => 'Test',
                'last_name' => 'Customer',
            ]);
            $order = SalesOrder::create([
                'workspace_id' => $workspace->id,
                'customer_id' => $customer->id,
                'order_number' => 'ORD-TEST-DELETE',
                'status' => 'Pending',
                'payment_status' => 'Pending',
                'subtotal' => 100,
                'total' => 100,
                'currency' => 'USD',
            ]);
            $shipment = SalesShipment::create([
                'workspace_id' => $workspace->id,
                'order_id' => $order->id,
                'status' => 'Pending',
                'tracking_number' => 'TRACK-DRAFT',
            ]);
            SalesOrderStatusHistory::create([
                'workspace_id' => $workspace->id,
                'order_id' => $order->id,
                'from_status' => null,
                'to_status' => 'Pending',
                'source' => 'created',
                'changed_by' => $owner->id,
            ]);

            return [$customer, $order, $shipment];
        });

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->deleteJson('/api/sales/orders/'.$order->id)
            ->assertOk()
            ->assertJsonPath('data.id', $order->id)
            ->assertJsonPath('data.order_number', 'ORD-TEST-DELETE');

        // Order and child records deleted
        $this->assertDatabaseMissing('sales_orders', ['id' => $order->id]);
        $this->assertDatabaseMissing('sales_shipments', ['id' => $shipment->id]);
        $this->assertDatabaseMissing('sales_order_status_history', ['order_id' => $order->id]);

        // Customer MUST NOT be deleted
        $this->assertDatabaseHas('sales_customers', ['id' => $customer->id]);
    }

    public function test_deletion_blocked_when_financial_transactions_exist(): void
    {
        $owner = $this->createUser('delete-finance@example.test');
        $workspace = $this->createWorkspace($owner);

        [$order] = app(TenantContext::class)->runInContext($workspace, function () use ($workspace, $owner): array {
            $customer = SalesCustomer::create([
                'workspace_id' => $workspace->id,
                'first_name' => 'Finance',
                'last_name' => 'Customer',
            ]);
            $order = SalesOrder::create([
                'workspace_id' => $workspace->id,
                'customer_id' => $customer->id,
                'order_number' => 'ORD-HAS-TX',
                'status' => 'Pending',
                'payment_status' => 'Pending',
                'subtotal' => 200,
                'total' => 200,
                'currency' => 'USD',
            ]);

            \Illuminate\Support\Facades\DB::table('finance_transactions')->insert([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'workspace_id' => $workspace->id,
                'created_by' => $owner->id,
                'order_id' => $order->id,
                'description' => 'Order deposit',
                'amount' => 200,
                'type' => 'income',
                'category' => 'Sales',
                'occurred_on' => now()->toDateString(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return [$order];
        });

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->deleteJson('/api/sales/orders/'.$order->id)
            ->assertStatus(422)
            ->assertJsonPath('code', 'ORDER_HAS_TRANSACTIONS');

        $this->assertDatabaseHas('sales_orders', ['id' => $order->id]);
    }

    public function test_deletion_blocked_when_payment_collected_or_shipment_in_transit(): void
    {
        $owner = $this->createUser('delete-blocked@example.test');
        $workspace = $this->createWorkspace($owner);

        [$orderPaid, $orderShipped] = app(TenantContext::class)->runInContext($workspace, function () use ($workspace): array {
            $customer = SalesCustomer::create([
                'workspace_id' => $workspace->id,
                'first_name' => 'Blocked',
            ]);
            $orderPaid = SalesOrder::create([
                'workspace_id' => $workspace->id,
                'customer_id' => $customer->id,
                'order_number' => 'ORD-PAID',
                'status' => 'Pending',
                'payment_status' => 'Paid',
                'subtotal' => 100,
                'total' => 100,
                'currency' => 'USD',
            ]);
            $orderShipped = SalesOrder::create([
                'workspace_id' => $workspace->id,
                'customer_id' => $customer->id,
                'order_number' => 'ORD-SHIPPED',
                'status' => 'Shipping',
                'payment_status' => 'Pending',
                'subtotal' => 100,
                'total' => 100,
                'currency' => 'USD',
            ]);
            SalesShipment::create([
                'workspace_id' => $workspace->id,
                'order_id' => $orderShipped->id,
                'status' => 'In transit',
            ]);

            return [$orderPaid, $orderShipped];
        });

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->deleteJson('/api/sales/orders/'.$orderPaid->id)
            ->assertStatus(422)
            ->assertJsonPath('code', 'ORDER_PAYMENT_REALIZED');

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->deleteJson('/api/sales/orders/'.$orderShipped->id)
            ->assertStatus(422)
            ->assertJsonPath('code', 'ORDER_SHIPMENT_DISPATCHED');
    }

    public function test_viewer_cannot_delete_order_and_cross_workspace_is_prevented(): void
    {
        $owner = $this->createUser('perm-owner@example.test');
        $viewer = $this->createUser('perm-viewer@example.test');
        $otherUser = $this->createUser('other-user@example.test');

        $workspace = $this->createWorkspace($owner);
        $this->addMemberToWorkspace($workspace, $viewer, 'viewer');

        $otherWorkspace = $this->createWorkspace($otherUser);

        $order = app(TenantContext::class)->runInContext($workspace, function () use ($workspace): SalesOrder {
            $customer = SalesCustomer::create(['workspace_id' => $workspace->id, 'first_name' => 'Customer']);
            return SalesOrder::create([
                'workspace_id' => $workspace->id,
                'customer_id' => $customer->id,
                'order_number' => 'ORD-PERM',
                'status' => 'Pending',
                'payment_status' => 'Pending',
                'subtotal' => 50,
                'total' => 50,
                'currency' => 'USD',
            ]);
        });

        // Viewer forbidden
        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->deleteJson('/api/sales/orders/'.$order->id)
            ->assertForbidden();

        // Other workspace owner cannot access or delete
        $this->actingAs($otherUser)
            ->withHeader('X-Workspace-Id', $otherWorkspace->id)
            ->deleteJson('/api/sales/orders/'.$order->id)
            ->assertNotFound();

        $this->assertDatabaseHas('sales_orders', ['id' => $order->id]);
    }

    public function test_order_can_be_cancelled_preserving_audit_history(): void
    {
        $owner = $this->createUser('cancel-owner@example.test');
        $workspace = $this->createWorkspace($owner);

        $order = app(TenantContext::class)->runInContext($workspace, function () use ($workspace): SalesOrder {
            $customer = SalesCustomer::create(['workspace_id' => $workspace->id, 'first_name' => 'CancelCustomer']);
            return SalesOrder::create([
                'workspace_id' => $workspace->id,
                'customer_id' => $customer->id,
                'order_number' => 'ORD-TO-CANCEL',
                'status' => 'Pending',
                'payment_status' => 'Pending',
                'subtotal' => 80,
                'total' => 80,
                'currency' => 'USD',
            ]);
        });

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->patchJson('/api/sales/orders/'.$order->id.'/status', ['status' => 'Cancelled'])
            ->assertOk()
            ->assertJsonPath('data.status', 'Cancelled');

        $this->assertDatabaseHas('sales_orders', [
            'id' => $order->id,
            'status' => 'Cancelled',
        ]);
        $this->assertDatabaseHas('sales_order_status_history', [
            'order_id' => $order->id,
            'from_status' => 'Pending',
            'to_status' => 'Cancelled',
        ]);
    }

    public function test_marking_order_delivered_with_sync_shipment_updates_shipment_with_audit_history(): void
    {
        $owner = $this->createUser('sync-owner@example.test');
        $workspace = $this->createWorkspace($owner);

        [$order, $shipment] = app(TenantContext::class)->runInContext($workspace, function () use ($workspace): array {
            $customer = SalesCustomer::create(['workspace_id' => $workspace->id, 'first_name' => 'SyncCust']);
            $order = SalesOrder::create([
                'workspace_id' => $workspace->id,
                'customer_id' => $customer->id,
                'order_number' => 'ORD-SYNC-TEST',
                'status' => 'Shipping',
                'payment_status' => 'Pending',
                'subtotal' => 100,
                'total' => 100,
                'currency' => 'MAD',
            ]);
            $shipment = SalesShipment::create([
                'workspace_id' => $workspace->id,
                'order_id' => $order->id,
                'status' => 'In transit',
                'tracking_number' => 'TRACK-999',
                'payment_collection_status' => 'Pending',
            ]);
            return [$order, $shipment];
        });

        $response = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->patchJson('/api/sales/orders/'.$order->id.'/status', [
                'status' => 'Delivered',
                'sync_shipment' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'Delivered')
            ->assertJsonPath('data.shipments.0.status', 'Delivered');

        $this->assertDatabaseHas('sales_orders', ['id' => $order->id, 'status' => 'Delivered']);
        $this->assertDatabaseHas('sales_shipments', ['id' => $shipment->id, 'status' => 'Delivered']);

        // Verify audit history contains synchronization metadata
        $history = SalesOrderStatusHistory::query()
            ->where('order_id', $order->id)
            ->where('to_status', 'Delivered')
            ->first();

        $this->assertNotNull($history);
        $this->assertSame(['TRACK-999'], array_map(fn () => 'TRACK-999', $history->metadata['synced_shipment_ids'] ?? []));
        $this->assertSame('Delivered', $history->metadata['synced_shipment_status'] ?? null);
    }

    public function test_marking_order_delivered_without_sync_shipment_preserves_shipment_status(): void
    {
        $owner = $this->createUser('no-sync@example.test');
        $workspace = $this->createWorkspace($owner);

        [$order, $shipment] = app(TenantContext::class)->runInContext($workspace, function () use ($workspace): array {
            $customer = SalesCustomer::create(['workspace_id' => $workspace->id, 'first_name' => 'NoSyncCust']);
            $order = SalesOrder::create([
                'workspace_id' => $workspace->id,
                'customer_id' => $customer->id,
                'order_number' => 'ORD-NO-SYNC',
                'status' => 'Pending',
                'payment_status' => 'Pending',
                'subtotal' => 100,
                'total' => 100,
                'currency' => 'MAD',
            ]);
            $shipment = SalesShipment::create([
                'workspace_id' => $workspace->id,
                'order_id' => $order->id,
                'status' => 'Pending',
                'payment_collection_status' => 'Pending',
            ]);
            return [$order, $shipment];
        });

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->patchJson('/api/sales/orders/'.$order->id.'/status', [
                'status' => 'Delivered',
                'sync_shipment' => false,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'Delivered')
            ->assertJsonPath('data.shipments.0.status', 'Pending');

        $this->assertDatabaseHas('sales_orders', ['id' => $order->id, 'status' => 'Delivered']);
        $this->assertDatabaseHas('sales_shipments', ['id' => $shipment->id, 'status' => 'Pending']);
    }

    public function test_marking_payment_paid_never_automatically_marks_courier_remittance_collected(): void
    {
        $owner = $this->createUser('remittance@example.test');
        $workspace = $this->createWorkspace($owner);

        [$order, $shipment] = app(TenantContext::class)->runInContext($workspace, function () use ($workspace): array {
            $customer = SalesCustomer::create(['workspace_id' => $workspace->id, 'first_name' => 'RemitCust']);
            $order = SalesOrder::create([
                'workspace_id' => $workspace->id,
                'customer_id' => $customer->id,
                'order_number' => 'ORD-REMIT-TEST',
                'status' => 'Delivered',
                'payment_status' => 'Pending',
                'subtotal' => 250,
                'total' => 285,
                'currency' => 'MAD',
            ]);
            $shipment = SalesShipment::create([
                'workspace_id' => $workspace->id,
                'order_id' => $order->id,
                'status' => 'Delivered',
                'cod_amount' => 285,
                'payment_collection_status' => 'Pending',
            ]);
            return [$order, $shipment];
        });

        // Updating payment status to Paid
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->patchJson('/api/sales/orders/'.$order->id.'/payment-status', [
                'payment_status' => 'Paid',
            ])
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'Paid')
            ->assertJsonPath('data.shipments.0.payment_collection_status', 'Pending');

        // Courier remittance MUST remain Pending
        $this->assertDatabaseHas('sales_shipments', [
            'id' => $shipment->id,
            'payment_collection_status' => 'Pending',
        ]);
    }

    public function test_sales_customer_can_be_updated_by_authorized_user(): void
    {
        $owner = $this->createUser('customer-update-owner@example.test');
        $workspace = $this->createWorkspace($owner);

        $customer = app(TenantContext::class)->runInContext($workspace, function () use ($workspace) {
            return SalesCustomer::create([
                'workspace_id' => $workspace->id,
                'first_name' => 'Initial',
                'last_name' => 'Name',
                'phone' => '0600000000',
                'address' => 'Old Address',
            ]);
        });

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->patchJson('/api/sales/customers/'.$customer->id, [
                'first_name' => 'Updated',
                'last_name' => 'Customer',
                'email' => 'updated@example.test',
                'phone' => '0612345678',
                'address' => 'New Address 123',
            ])
            ->assertOk()
            ->assertJsonPath('data.first_name', 'Updated')
            ->assertJsonPath('data.last_name', 'Customer')
            ->assertJsonPath('data.email', 'updated@example.test')
            ->assertJsonPath('data.phone', '0612345678')
            ->assertJsonPath('data.address', 'New Address 123')
            ->assertJsonPath('data.orders_count', 0);

        $this->assertDatabaseHas('sales_customers', [
            'id' => $customer->id,
            'first_name' => 'Updated',
            'phone' => '0612345678',
        ]);
    }

    public function test_sales_customer_without_orders_can_be_safely_deleted(): void
    {
        $owner = $this->createUser('customer-delete-owner@example.test');
        $workspace = $this->createWorkspace($owner);

        $customer = app(TenantContext::class)->runInContext($workspace, function () use ($workspace) {
            return SalesCustomer::create([
                'workspace_id' => $workspace->id,
                'first_name' => 'Orphan',
                'last_name' => 'Customer',
                'phone' => '0699999999',
            ]);
        });

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->deleteJson('/api/sales/customers/'.$customer->id)
            ->assertOk()
            ->assertJsonPath('message', 'Customer deleted successfully.')
            ->assertJsonPath('data.id', $customer->id);

        $this->assertDatabaseMissing('sales_customers', [
            'id' => $customer->id,
        ]);
    }

    public function test_sales_customer_with_orders_cannot_be_deleted(): void
    {
        $owner = $this->createUser('customer-protected-owner@example.test');
        $workspace = $this->createWorkspace($owner);

        [$customer, $order] = app(TenantContext::class)->runInContext($workspace, function () use ($workspace) {
            $customer = SalesCustomer::create([
                'workspace_id' => $workspace->id,
                'first_name' => 'Protected',
                'last_name' => 'Customer',
            ]);
            $order = SalesOrder::create([
                'workspace_id' => $workspace->id,
                'customer_id' => $customer->id,
                'order_number' => 'ORD-PROTECT-TEST',
                'status' => 'Delivered',
                'payment_status' => 'Paid',
                'subtotal' => 100,
                'total' => 100,
                'currency' => 'MAD',
            ]);
            return [$customer, $order];
        });

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->deleteJson('/api/sales/customers/'.$customer->id)
            ->assertStatus(422)
            ->assertJsonPath('code', 'CUSTOMER_HAS_ORDERS')
            ->assertJsonPath('orders_count', 1);

        $this->assertDatabaseHas('sales_customers', [
            'id' => $customer->id,
        ]);
        $this->assertDatabaseHas('sales_orders', [
            'id' => $order->id,
        ]);
    }

    public function test_viewer_cannot_update_or_delete_sales_customer(): void
    {
        $owner = $this->createUser('owner-role@example.test');
        $viewer = $this->createUser('viewer-role@example.test');
        $workspace = $this->createWorkspace($owner);
        $this->addMemberToWorkspace($workspace, $viewer, 'viewer');

        $customer = app(TenantContext::class)->runInContext($workspace, function () use ($workspace) {
            return SalesCustomer::create([
                'workspace_id' => $workspace->id,
                'first_name' => 'RoleTest',
            ]);
        });

        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->patchJson('/api/sales/customers/'.$customer->id, ['first_name' => 'Hacked'])
            ->assertForbidden();

        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->deleteJson('/api/sales/customers/'.$customer->id)
            ->assertForbidden();

        $this->assertDatabaseHas('sales_customers', [
            'id' => $customer->id,
            'first_name' => 'RoleTest',
        ]);
    }

    public function test_cross_workspace_customer_operations_are_forbidden(): void
    {
        $ownerA = $this->createUser('ownerA@example.test');
        $ownerB = $this->createUser('ownerB@example.test');
        $workspaceA = $this->createWorkspace($ownerA);
        $workspaceB = $this->createWorkspace($ownerB);

        $customerA = app(TenantContext::class)->runInContext($workspaceA, function () use ($workspaceA) {
            return SalesCustomer::create([
                'workspace_id' => $workspaceA->id,
                'first_name' => 'WorkspaceACustomer',
            ]);
        });

        // Owner B tries to update customer A
        $this->actingAs($ownerB)
            ->withHeader('X-Workspace-Id', $workspaceB->id)
            ->patchJson('/api/sales/customers/'.$customerA->id, ['first_name' => 'Attacked'])
            ->assertNotFound();

        // Owner B tries to delete customer A
        $this->actingAs($ownerB)
            ->withHeader('X-Workspace-Id', $workspaceB->id)
            ->deleteJson('/api/sales/customers/'.$customerA->id)
            ->assertNotFound();

        $this->assertDatabaseHas('sales_customers', [
            'id' => $customerA->id,
            'first_name' => 'WorkspaceACustomer',
        ]);
    }
}
