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
}
