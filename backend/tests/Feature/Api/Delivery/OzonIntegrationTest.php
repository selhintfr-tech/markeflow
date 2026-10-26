<?php

namespace Tests\Feature\Api\Delivery;

use App\Models\Delivery\DeliveryProviderConnection;
use App\Models\Sales\SalesCustomer;
use App\Models\Sales\SalesOrder;
use App\Models\Sales\SalesShipment;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceAuditLog;
use App\Models\WorkspaceUser;
use App\Services\Delivery\DeliveryProviderRegistry;
use App\Services\Delivery\Ozon\OzonApiClient;
use App\Services\Delivery\Ozon\OzonDeliveryAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OzonIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function migrateFreshUsing(): array
    {
        return [
            '--path' => realpath(dirname(__DIR__, 4).'/database/migrations'),
            '--realpath' => true,
        ];
    }

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.key' => 'base64:'.base64_encode(str_repeat('o', 32))]);
        config(['services.ozon.dry_run' => true]);
    }

    public function test_ozon_adapter_is_registered_and_bound_in_registry(): void
    {
        $registry = app(DeliveryProviderRegistry::class);
        $adapter = $registry->find('ozon');

        $this->assertNotNull($adapter);
        $this->assertInstanceOf(OzonDeliveryAdapter::class, $adapter);
        $this->assertSame('ozon', $adapter->key());
        $this->assertTrue($adapter->supportsConnectionTest());
    }

    public function test_ozon_status_mapping_does_not_imply_cod_collection(): void
    {
        $adapter = app(OzonDeliveryAdapter::class);

        // Normalize various Moroccan French statuses
        $this->assertSame('delivered', $adapter->normalizeStatus('Colis livré'));
        $this->assertSame('in_transit', $adapter->normalizeStatus('En cours de livraison'));
        $this->assertSame('out_for_delivery', $adapter->normalizeStatus('En cours de distribution'));
        $this->assertSame('picked_up', $adapter->normalizeStatus('Colis ramassé'));
        $this->assertSame('returned', $adapter->normalizeStatus('Retourné à l\'expéditeur'));
        $this->assertSame('failed', $adapter->normalizeStatus('Injoignable'));
        $this->assertSame('pending', $adapter->normalizeStatus('Nouveau'));

        // Tracking shipment trackShipment never sets cod_collected = true
        $trackingResult = $adapter->trackShipment(['dry_run' => true], 'TEST-123');
        $this->assertFalse($trackingResult['cod_collected'], 'Tracking must never automatically declare COD as collected.');
    }

    public function test_send_to_ozon_workflow_and_idempotency_protection(): void
    {
        $owner = User::create(['name' => 'Owner', 'email' => 'ozon-owner@test.com', 'password' => 'secret']);
        $workspace = Workspace::createWithInitialOwner($owner, ['name' => 'Matbaa Workspace', 'slug' => 'matbaa-ozon']);

        $customer = SalesCustomer::create([
            'workspace_id' => $workspace->id,
            'first_name' => 'Karim',
            'last_name' => 'Bennani',
            'phone' => '0612345678',
            'address' => 'Avenue Mohammed V, Marrakech',
        ]);

        $order = SalesOrder::create([
            'workspace_id' => $workspace->id,
            'customer_id' => $customer->id,
            'order_number' => 'ORD-OZON-001',
            'status' => 'Confirmed',
            'payment_status' => 'Pending',
            'subtotal' => 250.00,
            'total' => 285.00,
            'currency' => 'MAD',
            'items' => [['name' => 'Business Cards (1000 pcs)', 'quantity' => 1, 'unit_price' => 250.00]],
        ]);

        // 1. Preview
        $previewResponse = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson("/api/sales/orders/{$order->id}/ozon-preview")
            ->assertOk();

        $this->assertTrue($previewResponse->json('can_send'));
        $this->assertSame('Marrakech', $previewResponse->json('preview.city'));
        $this->assertSame(285.0, (float) $previewResponse->json('preview.cod_amount'));

        // 2. Viewer cannot dispatch (authorization check)
        $viewer = User::create(['name' => 'Viewer', 'email' => 'viewer@test.com', 'password' => 'secret']);
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $viewer->id,
            'role' => WorkspaceUser::ROLE_VIEWER,
        ]);

        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson("/api/sales/orders/{$order->id}/send-to-ozon")
            ->assertForbidden();

        // 3. Owner dispatches to Ozon
        $dispatchResponse = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson("/api/sales/orders/{$order->id}/send-to-ozon")
            ->assertCreated();

        $tracking = $dispatchResponse->json('data.shipments.0.tracking_number');
        $this->assertNotEmpty($tracking);
        $this->assertStringStartsWith('OZN-DRY-', $tracking);

        // Verify order status transitioned to Shipping, payment status remained Pending
        $refreshedOrder = $order->fresh(['shipments']);
        $this->assertSame('Shipping', $refreshedOrder->status);
        $this->assertSame('Pending', $refreshedOrder->payment_status, 'Order payment status must remain Pending until explicit payment receipt.');

        $shipment = $refreshedOrder->shipments->first();
        $this->assertSame('ozon', $shipment->delivery_company_id);
        $this->assertSame('Pending', $shipment->payment_collection_status, 'Courier collection status must remain Pending until remittance reconciliation.');

        // Verify audit log recorded
        $auditExists = app(\App\Services\TenantContext::class)->runInContext($workspace, fn () =>
            WorkspaceAuditLog::query()
                ->where('action', 'sales.order_sent_to_ozon')
                ->where('entity_id', $order->id)
                ->exists()
        );
        $this->assertTrue($auditExists);

        // 4. Duplicate send protection (idempotency check)
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson("/api/sales/orders/{$order->id}/send-to-ozon")
            ->assertStatus(409);
    }

    public function test_dry_run_sync_tracking_preserves_shipments_unmodified(): void
    {
        $owner = User::create(['name' => 'Sync Owner', 'email' => 'sync-owner@test.com', 'password' => 'secret']);
        $workspace = Workspace::createWithInitialOwner($owner, ['name' => 'Sync Workspace', 'slug' => 'sync-workspace']);

        $customer = SalesCustomer::create([
            'workspace_id' => $workspace->id,
            'first_name' => 'Adil',
            'phone' => '0699887766',
            'address' => 'Agadir',
        ]);

        $order = SalesOrder::create([
            'workspace_id' => $workspace->id,
            'customer_id' => $customer->id,
            'order_number' => 'ORD-SYNC-002',
            'status' => 'Confirmed',
            'payment_status' => 'Pending',
            'subtotal' => 400.00,
            'total' => 400.00,
            'currency' => 'MAD',
        ]);

        $shipment = SalesShipment::create([
            'workspace_id' => $workspace->id,
            'order_id' => $order->id,
            'delivery_company_id' => 'ozon',
            'tracking_number' => 'CRN-TEST-99',
            'status' => 'Ready',
            'cod_amount' => 400.00,
            'payment_collection_status' => 'Pending',
        ]);

        // In dry-run mode, sync tracking must NOT modify real database records!
        $response = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/sales/orders/sync-ozon-tracking', [
                'order_id' => $order->id,
            ])
            ->assertOk();

        $this->assertTrue($response->json('is_dry_run'));
        $this->assertSame(0, $response->json('updated_count'), 'Dry-run tracking sync must never modify real database records.');

        $refreshedShipment = $shipment->fresh();
        $this->assertSame('Ready', $refreshedShipment->status, 'Shipment status must remain unmodified in dry-run.');
        $this->assertSame('Pending', $refreshedShipment->payment_collection_status);
    }

    public function test_terminal_status_protection_never_downgrades_delivered_shipment(): void
    {
        $owner = User::create(['name' => 'Terminal Owner', 'email' => 'term-owner@test.com', 'password' => 'secret']);
        $workspace = Workspace::createWithInitialOwner($owner, ['name' => 'Terminal Workspace', 'slug' => 'terminal-workspace']);

        $customer = SalesCustomer::create([
            'workspace_id' => $workspace->id,
            'first_name' => 'Rachid',
            'phone' => '0611223344',
            'address' => 'Casablanca',
        ]);

        $order = SalesOrder::create([
            'workspace_id' => $workspace->id,
            'customer_id' => $customer->id,
            'order_number' => 'ORD-TERM-001',
            'status' => 'Delivered',
            'payment_status' => 'Paid',
            'subtotal' => 500.00,
            'total' => 500.00,
            'currency' => 'MAD',
        ]);

        $shipment = SalesShipment::create([
            'workspace_id' => $workspace->id,
            'order_id' => $order->id,
            'delivery_company_id' => 'ozon',
            'tracking_number' => 'CRN-TERM-88',
            'status' => 'Delivered',
            'cod_amount' => 500.00,
            'payment_collection_status' => 'Collected',
        ]);

        // Mock live sync
        $syncService = app(\App\Services\Delivery\Ozon\OzonTrackingSyncService::class);
        $result = $syncService->syncWorkspaceTracking($workspace->id, $order->id, $owner, true);

        $this->assertSame(1, $result['preserved_terminal_count']);
        $this->assertSame(0, $result['updated_count']);

        $this->assertSame('Delivered', $shipment->fresh()->status, 'Delivered shipment must never be downgraded.');
        $this->assertSame('Delivered', $order->fresh()->status, 'Delivered order must never be downgraded.');
    }

    public function test_ozon_sync_tracking_artisan_command(): void
    {
        $owner = User::create(['name' => 'Cmd Owner', 'email' => 'cmd-owner@test.com', 'password' => 'secret']);
        $workspace = Workspace::createWithInitialOwner($owner, ['name' => 'Cmd Workspace', 'slug' => 'cmd-workspace']);

        $this->artisan('ozon:sync-tracking', ['--workspace' => $workspace->id])
            ->assertSuccessful();
    }

    public function test_ozon_csv_import_preview_and_execute(): void
    {
        $owner = User::create(['name' => 'CSV Owner', 'email' => 'csv-owner@test.com', 'password' => 'secret']);
        $workspace = Workspace::createWithInitialOwner($owner, ['name' => 'CSV Workspace', 'slug' => 'csv-workspace']);

        $customer = SalesCustomer::create([
            'workspace_id' => $workspace->id,
            'first_name' => 'Hassan',
            'phone' => '0655443322',
            'address' => 'Rabat',
        ]);

        $order = SalesOrder::create([
            'workspace_id' => $workspace->id,
            'customer_id' => $customer->id,
            'order_number' => 'ORD-CSV-100',
            'status' => 'Confirmed',
            'payment_status' => 'Pending',
            'subtotal' => 300.00,
            'total' => 300.00,
            'currency' => 'MAD',
        ]);

        $csvData = implode("\n", [
            'Code Suivi,Destinataire,Telephone,Ville,CRBT,Statut,Reference',
            'OZON-CSV-001,Hassan,0655443322,Rabat,300,Mise en distribution,ORD-CSV-100',
            'OZON-CSV-002,Unknown Customer,0600000000,Tanger,150,Nouveau,REF-UNKNOWN',
        ]);

        // 1. Preview
        $previewResponse = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/sales/ozon/import-preview', [
                'csv_content' => $csvData,
            ])
            ->assertOk();

        $this->assertTrue($previewResponse->json('success'));
        $this->assertSame(2, $previewResponse->json('total_rows'));
        $this->assertSame(1, $previewResponse->json('matched_order_count'));
        $this->assertSame(1, $previewResponse->json('review_queue_count'));

        // 2. Execute
        $executeResponse = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/sales/ozon/import-execute', [
                'rows' => $previewResponse->json('rows'),
            ])
            ->assertOk();

        $this->assertTrue($executeResponse->json('success'));
        $this->assertSame(1, $executeResponse->json('linked_orders'));
        $this->assertSame(1, $executeResponse->json('created_in_review_queue'));

        // Verify order is now linked to OZON-CSV-001 and transitioned to Shipping
        $refreshedOrder = $order->fresh(['shipments']);
        $this->assertSame('Shipping', $refreshedOrder->status);
        $this->assertSame('OZON-CSV-001', $refreshedOrder->shipments->first()?->tracking_number);

        // Verify review queue item created in DeliveryShipment without fake sales order
        $reviewShipment = app(\App\Services\TenantContext::class)->runInContext($workspace, fn () =>
            \App\Models\Delivery\DeliveryShipment::where('tracking_number', 'OZON-CSV-002')->first()
        );
        $this->assertNotNull($reviewShipment);
        $this->assertNull($reviewShipment->sales_order_id, 'Review queue shipment must NOT invent fake sales order.');
    }

    public function test_pdf_status_verification(): void
    {
        $owner = User::create(['name' => 'PDF Owner', 'email' => 'pdf-owner@test.com', 'password' => 'secret']);
        $workspace = Workspace::createWithInitialOwner($owner, ['name' => 'PDF Workspace', 'slug' => 'pdf-workspace']);

        $response = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/sales/ozon/pdf-status')
            ->assertOk();

        $this->assertFalse($response->json('data.ready'));
        $this->assertTrue($response->json('data.requires_live_session'));
    }

    public function test_ozon_api_client_builds_official_path_and_uses_cities_for_connection_test(): void
    {
        $client = app(OzonApiClient::class);

        $credentials = [
            'customer_id' => 'CUST-12345',
            'api_key' => 'SECRET-KEY-999',
            'base_url' => 'https://api.ozonexpress.ma',
            'dry_run' => true,
        ];

        $url = $client->getEndpointUrl($credentials, 'cities');
        $this->assertSame('https://api.ozonexpress.ma/customers/CUST-12345/SECRET-KEY-999/cities', $url);

        // Connection test in dry-run mode completes without throwing exception
        $client->testConnection($credentials);
        $this->assertTrue(true, 'Connection test should pass without exception in dry-run mode.');

        // Live endpoint test with cities method
        $cities = $client->getCities($credentials);
        $this->assertNotEmpty($cities);
        $this->assertSame('Casablanca', $cities[0]['name']);
    }

    public function test_sync_delivery_module_does_not_collide_orders_sharing_same_tracking_or_reference(): void
    {
        $owner = User::create(['name' => 'Carrier Test Owner', 'email' => 'carrier-owner@test.com', 'password' => 'secret']);
        $workspace = Workspace::createWithInitialOwner($owner, ['name' => 'Carrier Test Workspace', 'slug' => 'carrier-test-workspace']);

        $custSoulaiman = SalesCustomer::create([
            'workspace_id' => $workspace->id,
            'first_name' => 'Soulaiman',
            'phone' => '0611111111',
            'address' => 'Marrakech',
        ]);

        $orderSoulaiman = SalesOrder::create([
            'workspace_id' => $workspace->id,
            'customer_id' => $custSoulaiman->id,
            'order_number' => 'ORD-315CE7B9',
            'status' => 'Delivered',
            'payment_status' => 'Paid',
            'subtotal' => 900.00,
            'total' => 900.00,
            'currency' => 'MAD',
        ]);

        $shipmentSoulaiman = SalesShipment::create([
            'workspace_id' => $workspace->id,
            'order_id' => $orderSoulaiman->id,
            'delivery_company_id' => 'Khalid Nait Lmouden',
            'tracking_number' => 'CRN-005',
            'status' => 'Delivered',
            'shipping_cost' => 0.00,
            'cod_amount' => 0.00,
            'payment_collection_status' => 'Collected',
        ]);

        $custMotozone = SalesCustomer::create([
            'workspace_id' => $workspace->id,
            'first_name' => 'MOTOZONE',
            'phone' => '0622222222',
            'address' => 'Casablanca',
        ]);

        $orderMotozone = SalesOrder::create([
            'workspace_id' => $workspace->id,
            'customer_id' => $custMotozone->id,
            'order_number' => 'ORD-544C56F5',
            'status' => 'Delivered',
            'payment_status' => 'Paid',
            'subtotal' => 985.00,
            'total' => 985.00,
            'currency' => 'MAD',
        ]);

        $shipmentMotozone = SalesShipment::create([
            'workspace_id' => $workspace->id,
            'order_id' => $orderMotozone->id,
            'delivery_company_id' => 'ozon',
            'tracking_number' => 'CRN-005',
            'status' => 'Delivered',
            'shipping_cost' => 45.00,
            'cod_amount' => 985.00,
            'payment_collection_status' => 'Collected',
        ]);

        $syncService = app(\App\Services\Delivery\Ozon\OzonTrackingSyncService::class);

        // Sync Soulaiman
        $syncService->syncSalesShipmentsToDeliveryModule($workspace->id, $shipmentSoulaiman);
        // Sync Motozone
        $syncService->syncSalesShipmentsToDeliveryModule($workspace->id, $shipmentMotozone);

        // Verify Soulaiman delivery shipment record
        $soulaimanDelivery = app(\App\Services\TenantContext::class)->runInContext($workspace, fn () =>
            \App\Models\Delivery\DeliveryShipment::where('sales_order_id', $orderSoulaiman->id)->first()
        );
        $this->assertNotNull($soulaimanDelivery);
        $this->assertSame('khalid_nait_lmouden', $soulaimanDelivery->provider_key, 'Soulaiman must stay assigned to Khalid Nait Lmouden');
        $this->assertSame('0.00', (string) $soulaimanDelivery->delivery_fee, 'Soulaiman delivery fee must be 0 MAD');
        $this->assertSame('0.00', (string) $soulaimanDelivery->cod_amount, 'Soulaiman COD amount must be 0 MAD');

        // Verify Motozone delivery shipment record
        $motozoneDelivery = app(\App\Services\TenantContext::class)->runInContext($workspace, fn () =>
            \App\Models\Delivery\DeliveryShipment::where('sales_order_id', $orderMotozone->id)->first()
        );
        $this->assertNotNull($motozoneDelivery);
        $this->assertSame('ozon', $motozoneDelivery->provider_key, 'MOTOZONE must remain assigned to ozon');
        $this->assertSame('45.00', (string) $motozoneDelivery->delivery_fee);
        $this->assertSame('985.00', (string) $motozoneDelivery->cod_amount);
    }

    public function test_ozon_sync_status_endpoint(): void
    {
        $owner = User::create(['name' => 'Status Owner', 'email' => 'status-owner@test.com', 'password' => 'secret']);
        $workspace = Workspace::createWithInitialOwner($owner, ['name' => 'Status Workspace', 'slug' => 'status-workspace']);

        $customer = SalesCustomer::create([
            'workspace_id' => $workspace->id,
            'first_name' => 'Hassan',
            'phone' => '0611223344',
            'address' => 'Rabat',
        ]);

        $order = SalesOrder::create([
            'workspace_id' => $workspace->id,
            'customer_id' => $customer->id,
            'order_number' => 'ORD-STAT-001',
            'status' => 'Shipping',
            'payment_status' => 'Pending',
            'subtotal' => 600.00,
            'total' => 600.00,
            'currency' => 'MAD',
        ]);

        SalesShipment::create([
            'workspace_id' => $workspace->id,
            'order_id' => $order->id,
            'delivery_company_id' => 'ozon',
            'tracking_number' => 'OZN-STAT-99',
            'status' => 'In transit',
            'shipping_cost' => 35.00,
            'cod_amount' => 600.00,
            'payment_collection_status' => 'Pending',
        ]);

        $response = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/sales/ozon/sync-status')
            ->assertOk();

        $response->assertJsonStructure([
            'data' => [
                'summary' => [
                    'total_ozon_shipments',
                    'pending_pickup',
                    'in_transit',
                    'delivered',
                    'returned_refused',
                    'collected_pending_remittance',
                    'remitted_verified',
                    'total_expected_cod',
                    'total_delivery_fees',
                    'unmatched_review_queue',
                    'private_courier_count',
                ],
                'is_dry_run',
            ],
        ]);

        $this->assertSame(1, $response->json('data.summary.total_ozon_shipments'));
        $this->assertSame(1, $response->json('data.summary.in_transit'));
        $this->assertSame(600.0, (float) $response->json('data.summary.total_expected_cod'));
        $this->assertSame(35.0, (float) $response->json('data.summary.total_delivery_fees'));
    }

    public function test_ozon_review_queue_and_linking(): void
    {
        $owner = User::create(['name' => 'Queue Owner', 'email' => 'queue-owner@test.com', 'password' => 'secret']);
        $workspace = Workspace::createWithInitialOwner($owner, ['name' => 'Queue Workspace', 'slug' => 'queue-workspace']);

        // Create an unlinked DeliveryShipment directly (as imported from CSV or discovered)
        $deliveryShipment = app(\App\Services\TenantContext::class)->runInContext($workspace, fn () =>
            \App\Models\Delivery\DeliveryShipment::create([
                'workspace_id' => $workspace->id,
                'sales_order_id' => null,
                'provider_key' => 'ozon',
                'tracking_number' => 'OZN-REV-001',
                'status' => 'In transit',
                'delivery_fee' => 40.00,
                'cod_amount' => 500.00,
                'source_type' => 'Imported',
            ])
        );

        // Verify it appears in review queue
        $queueResponse = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/sales/ozon/review-queue')
            ->assertOk();

        $this->assertCount(1, $queueResponse->json('data'));
        $this->assertSame('OZN-REV-001', $queueResponse->json('data.0.tracking_number'));

        // Create a customer and sales order to link to
        $customer = SalesCustomer::create([
            'workspace_id' => $workspace->id,
            'first_name' => 'Nadia',
            'phone' => '0622334455',
            'address' => 'Tangier',
        ]);

        $order = SalesOrder::create([
            'workspace_id' => $workspace->id,
            'customer_id' => $customer->id,
            'order_number' => 'ORD-REV-LINK',
            'status' => 'Confirmed',
            'payment_status' => 'Pending',
            'subtotal' => 500.00,
            'total' => 500.00,
            'currency' => 'MAD',
        ]);

        // Link the parcel to the sales order
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson("/api/sales/ozon/review-queue/{$deliveryShipment->id}/link", [
                'order_id' => $order->id,
            ])
            ->assertOk();

        // Verify review queue is now empty
        $queueResponseAfter = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/sales/ozon/review-queue')
            ->assertOk();

        $this->assertCount(0, $queueResponseAfter->json('data'));

        // Verify sales shipment created with Ozon tracking
        $linkedShipment = SalesShipment::where('order_id', $order->id)->first();
        $this->assertNotNull($linkedShipment);
        $this->assertSame('OZN-REV-001', $linkedShipment->tracking_number);
        $this->assertSame('ozon', $linkedShipment->delivery_company_id);
    }

    public function test_ozon_import_stages_parcels_without_modifying_sales_or_finance(): void
    {
        $owner = User::create(['name' => 'Import Owner', 'email' => 'import-owner@test.com', 'password' => 'secret']);
        $workspace = Workspace::createWithInitialOwner($owner, ['name' => 'Import Workspace', 'slug' => 'import-workspace']);

        $csv = "Code d'envoi,Destinataire,Téléphone,Ville,Prix,Frais,Statut\n"
             . "OZN-STG-001,Karim Alami,0611223344,Rabat,450.00,35.00,Livré\n"
             . "OZN-STG-002,Samira Bennani,0655667788,Casablanca,300.00,35.00,Nouveau Colis\n";

        $response = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/delivery/ozon/import', [
                'csv_content' => $csv,
            ])
            ->assertOk();

        $this->assertTrue($response->json('success'));
        $this->assertSame(2, $response->json('imported_count'));

        // Set tenant context for assertion queries
        app(\App\Services\TenantContext::class)->setWorkspace($workspace);

        // Verify DeliveryShipment records were created in staging
        $shipments = \App\Models\Delivery\DeliveryShipment::where('workspace_id', $workspace->id)->where('provider_key', 'ozon')->get();
        $this->assertCount(2, $shipments);
        $this->assertNull($shipments[0]->sales_order_id);
        $this->assertNull($shipments[1]->sales_order_id);

        // Verify duplicate prevention
        $duplicateResponse = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/delivery/ozon/import', [
                'csv_content' => $csv,
            ])
            ->assertOk();

        $this->assertSame(0, $duplicateResponse->json('imported_count'));
        $this->assertSame(2, $duplicateResponse->json('updated_count'));

        app(\App\Services\TenantContext::class)->setWorkspace($workspace);
        $this->assertCount(2, \App\Models\Delivery\DeliveryShipment::where('workspace_id', $workspace->id)->get());

        // STRICT VERIFICATION: Zero sales orders or finance records created
        $this->assertSame(0, SalesOrder::where('workspace_id', $workspace->id)->count());
        $this->assertSame(0, \App\Models\FinanceTransaction::where('workspace_id', $workspace->id)->count());
    }

    public function test_ozon_dashboard_excludes_private_couriers_and_supports_return_shipments(): void
    {
        $owner = User::create(['name' => 'Dash Owner', 'email' => 'dash-owner@test.com', 'password' => 'secret']);
        $workspace = Workspace::createWithInitialOwner($owner, ['name' => 'Dash Workspace', 'slug' => 'dash-workspace']);

        $response = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/delivery/ozon/dashboard')
            ->assertOk();

        $this->assertTrue($response->json('summary.total_ozon_parcels') > 0);
        $parcels = collect($response->json('parcels'));

        // Verify CRN-003-R return shipment is included and marked as return
        $returnParcel = $parcels->firstWhere('tracking_number', 'CRN-003-R');
        $this->assertNotNull($returnParcel, 'Return shipment CRN-003-R must be present');
        $this->assertTrue($returnParcel['is_return']);

        // Verify private couriers are excluded
        $privateCourierParcels = $parcels->filter(fn ($p) => str_contains(strtolower($p['tracking_number'] ?? ''), 'achraf') || str_contains(strtolower($p['tracking_number'] ?? ''), 'khalid'));
        $this->assertCount(0, $privateCourierParcels);
    }
}


