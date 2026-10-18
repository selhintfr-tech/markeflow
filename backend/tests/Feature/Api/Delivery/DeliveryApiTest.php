<?php

namespace Tests\Feature\Api\Delivery;

use App\Http\Middleware\EnsureTenantContext;
use App\Http\Middleware\SetTenantContext;
use App\Models\Delivery\DeliveryProviderConnection;
use App\Models\Delivery\DeliveryShipment;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\Delivery\DeliveryProviderAdapter;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class DeliveryApiTest extends TestCase
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

        config(['app.key' => 'base64:'.base64_encode(str_repeat('d', 32))]);
        app()->instance(FakeDeliveryAdapter::class, new FakeDeliveryAdapter);
        app()->tag(FakeDeliveryAdapter::class, 'delivery.providers');
        Route::middleware(['auth', SetTenantContext::class, EnsureTenantContext::class])
            ->prefix('api')
            ->group(function (): void {
                require dirname(__DIR__, 4).'/routes/delivery.php';
            });
    }

    public function test_credentials_are_encrypted_never_returned_and_connections_are_workspace_scoped(): void
    {
        $owner = $this->createUser('delivery-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $otherOwner = $this->createUser('delivery-other@example.test');
        $otherWorkspace = $this->createWorkspace($otherOwner);

        $response = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/delivery/connections', [
                'provider_key' => 'test-carrier',
                'credentials' => ['secret_key' => 'very-secret-value'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'unverified')
            ->assertJsonPath('data.has_credentials', true)
            ->assertJsonMissing(['secret_key' => 'very-secret-value']);

        $connection = $this->connectionForWorkspace($workspace, $response->json('data.id'));
        $this->assertNotSame('very-secret-value', $connection->getRawOriginal('credentials'));
        $this->assertSame(['secret_key' => 'very-secret-value'], $connection->credentials);

        $this->actingAs($otherOwner)->withHeader('X-Workspace-Id', $otherWorkspace->id)
            ->getJson('/api/delivery/connections')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_viewer_cannot_write_and_delivery_status_does_not_imply_cod_collection(): void
    {
        $owner = $this->createUser('delivery-owner-viewer@example.test');
        $workspace = $this->createWorkspace($owner);
        $viewer = $this->createUser('delivery-viewer@example.test');
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $viewer->id,
            'role' => WorkspaceUser::ROLE_VIEWER,
        ]);

        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/delivery/shipments', [
                'provider_key' => 'manual',
                'status' => 'delivered',
                'cod_amount' => 250,
            ])
            ->assertForbidden();

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/delivery/shipments', [
                'provider_key' => 'manual',
                'status' => 'delivered',
                'cod_amount' => 250,
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'delivered')
            ->assertJsonPath('data.cod_collected', false)
            ->assertJsonPath('data.cod_amount', '250.00')
            ->assertJsonCount(1, 'data.status_history');
    }

    public function test_signed_webhooks_are_idempotent_and_unverified_signatures_are_rejected(): void
    {
        $owner = $this->createUser('delivery-webhook@example.test');
        $workspace = $this->createWorkspace($owner);
        $this->actingAs($owner)->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/delivery/connections', [
                'provider_key' => 'test-carrier',
                'credentials' => ['secret_key' => 'carrier-secret'],
            ])->assertCreated();
        $connection = $this->connectionForWorkspace($workspace);

        $this->actingAs($owner)->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/delivery/shipments', [
                'provider_connection_id' => $connection->id,
                'sales_order_id' => 'a8e3d58e-0bc1-4a41-a41a-b53a33792d66',
                'cod_amount' => 99,
                'shipment_data' => ['reference' => 'ORD-123'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.tracking_number', 'TEST-TRACK-1')
            ->assertJsonPath('data.status', 'delivered')
            ->assertJsonPath('data.cod_collected', false);

        $adapter = app(FakeDeliveryAdapter::class);
        $adapter->events = [[
            'event_id' => 'evt-unique-1',
            'tracking_number' => 'TEST-TRACK-1',
            'status' => 'delivered',
            'cod_collected' => true,
        ]];

        $this->postJson('/api/delivery/webhooks/'.$connection->id, [], ['X-Test-Signature' => 'invalid'])
            ->assertUnauthorized();
        $this->postJson('/api/delivery/webhooks/'.$connection->id, [], ['X-Test-Signature' => 'valid'])
            ->assertOk()
            ->assertJsonPath('processed', 1);
        $this->postJson('/api/delivery/webhooks/'.$connection->id, [], ['X-Test-Signature' => 'valid'])
            ->assertOk()
            ->assertJsonPath('processed', 0);

        $shipment = app(TenantContext::class)->runInContext(
            $workspace,
            fn () => DeliveryShipment::query()->with('statusHistory')->firstOrFail(),
        );
        $this->assertTrue($shipment->cod_collected);
        $this->assertCount(3, $shipment->statusHistory);
    }

    public function test_failed_provider_create_can_be_retried_with_the_same_idempotency_key(): void
    {
        $owner = $this->createUser('delivery-retry@example.test');
        $workspace = $this->createWorkspace($owner);
        $this->actingAs($owner)->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/delivery/connections', [
                'provider_key' => 'test-carrier',
                'credentials' => ['secret_key' => 'carrier-secret'],
            ])->assertCreated();
        $connection = $this->connectionForWorkspace($workspace);
        $adapter = app(FakeDeliveryAdapter::class);
        $adapter->failCreation = true;

        $failed = $this->actingAs($owner)->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/delivery/shipments', [
                'provider_connection_id' => $connection->id,
                'shipment_data' => ['recipient' => 'Private recipient'],
            ])
            ->assertStatus(502);
        $shipmentId = $failed->json('shipment_id');
        $storedPayload = DB::table('delivery_shipments')->where('id', $shipmentId)->value('provider_payload');
        $this->assertNotFalse($shipmentId);
        $this->assertStringNotContainsString('Private recipient', $storedPayload);

        $adapter->failCreation = false;
        $this->postJson('/api/delivery/shipments/'.$shipmentId.'/dispatch')
            ->assertCreated()
            ->assertJsonPath('data.tracking_number', 'TEST-TRACK-1');

        $this->assertCount(2, $adapter->idempotencyKeys);
        $this->assertSame($adapter->idempotencyKeys[0], $adapter->idempotencyKeys[1]);
    }

    private function createUser(string $email): User
    {
        return User::create(['name' => 'Delivery User', 'email' => $email, 'password' => 'password123']);
    }

    private function createWorkspace(User $owner): Workspace
    {
        return Workspace::createWithInitialOwner($owner, [
            'name' => 'Delivery '.$owner->id,
            'slug' => 'delivery-'.$owner->id,
        ]);
    }

    private function connectionForWorkspace(Workspace $workspace, ?string $id = null): DeliveryProviderConnection
    {
        return app(TenantContext::class)->runInContext($workspace, fn () => DeliveryProviderConnection::query()
            ->when($id, fn ($query) => $query->whereKey($id))
            ->firstOrFail());
    }
}

class FakeDeliveryAdapter implements DeliveryProviderAdapter
{
    /** @var list<array{event_id: string, tracking_number: string, status: string, cod_collected?: bool}> */
    public array $events = [];

    public bool $failCreation = false;

    /** @var list<string> */
    public array $idempotencyKeys = [];

    public function key(): string
    {
        return 'test-carrier';
    }

    public function supportsConnectionTest(): bool
    {
        return true;
    }

    public function testConnection(array $credentials): void {}

    public function createShipment(array $credentials, array $shipment): array
    {
        $this->idempotencyKeys[] = $shipment['idempotency_key'];
        if ($this->failCreation) {
            throw new \RuntimeException('Provider unavailable.');
        }

        return ['tracking_number' => 'TEST-TRACK-1', 'status' => 'delivered', 'cod_amount' => 99];
    }

    public function trackShipment(array $credentials, string $trackingNumber): array
    {
        return ['status' => 'in_transit'];
    }

    public function verifyWebhook(Request $request, array $credentials): bool
    {
        return $request->header('X-Test-Signature') === 'valid';
    }

    public function parseWebhook(Request $request, array $credentials): array
    {
        return $this->events;
    }

    public function normalizeStatus(string $providerStatus): string
    {
        return $providerStatus;
    }
}
