<?php

namespace App\Http\Controllers\Api\Delivery;

use App\Http\Controllers\Controller;
use App\Models\Delivery\DeliveryProviderConnection;
use App\Models\Delivery\DeliveryShipment;
use App\Models\Delivery\DeliveryWebhookEvent;
use App\Models\Delivery\DeliveryShipmentStatusHistory;
use App\Models\Scopes\WorkspaceScope;
use App\Services\Delivery\DeliveryProviderRegistry;
use App\Services\Delivery\DeliveryShipmentService;
use App\Services\TenantContext;
use App\Services\WorkspaceModuleAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class DeliveryController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly WorkspaceModuleAccessService $access,
        private readonly DeliveryProviderRegistry $providers,
        private readonly DeliveryShipmentService $shipments,
    ) {}

    public function connections(Request $request): JsonResponse
    {
        $this->access->authorize($request->user());
        $data = DeliveryProviderConnection::query()->orderBy('provider_key')->get()
            ->map(fn (DeliveryProviderConnection $connection): array => $this->connectionData($connection));

        return response()->json(['data' => $data]);
    }

    public function saveConnection(Request $request): JsonResponse
    {
        $this->access->authorize($request->user(), true);
        $data = $request->validate([
            'provider_key' => ['required', 'string', 'max:80', 'regex:/^[a-z0-9][a-z0-9_-]*$/'],
            'credentials' => ['required', 'array', 'min:1', 'max:20'],
            'credentials.*' => ['required', 'string', 'max:4096'],
        ]);
        $workspaceId = $this->tenantContext->getWorkspaceId();
        $connection = DeliveryProviderConnection::query()->firstOrNew([
            'provider_key' => $data['provider_key'],
        ]);
        $connection->credentials = $data['credentials'];
        $connection->status = 'unverified';
        $connection->last_error = null;
        $connection->last_tested_at = null;
        $connection->workspace_id = $workspaceId;
        $connection->save();

        return response()->json(['data' => $this->connectionData($connection)], $connection->wasRecentlyCreated ? 201 : 200);
    }

    public function disconnect(Request $request, string $id): Response
    {
        $this->access->authorize($request->user(), true);
        $connection = DeliveryProviderConnection::query()->findOrFail($id);
        $connection->delete();

        return response()->noContent();
    }

    public function testConnection(Request $request, string $id): JsonResponse
    {
        $this->access->authorize($request->user(), true);
        $connection = DeliveryProviderConnection::query()->findOrFail($id);
        $adapter = $this->providers->find($connection->provider_key);
        if (! $adapter || ! $adapter->supportsConnectionTest()) {
            return response()->json(['message' => 'Connection testing is not available for this provider adapter.'], 422);
        }

        try {
            $adapter->testConnection($connection->credentials);
        } catch (Throwable $exception) {
            Log::warning('Delivery provider connection test failed.', [
                'provider' => $connection->provider_key,
                'exception' => $exception::class,
            ]);
            $connection->update([
                'status' => 'error',
                'last_error' => 'Provider connection test failed. Verify credentials and retry.',
                'last_tested_at' => now(),
            ]);

            return response()->json(['message' => 'Provider connection test failed. Verify credentials and retry.'], 502);
        }

        $connection->update(['status' => 'connected', 'last_error' => null, 'last_tested_at' => now()]);

        return response()->json(['data' => $this->connectionData($connection)]);
    }

    public function shipments(Request $request): JsonResponse
    {
        $this->access->authorize($request->user());
        $filters = $request->validate(['per_page' => ['sometimes', 'integer', 'between:1,100']]);
        $data = DeliveryShipment::query()
            ->with('statusHistory')
            ->orderByDesc('updated_at')
            ->paginate($filters['per_page'] ?? 25);

        return response()->json([
            'data' => $data->getCollection()->map(fn (DeliveryShipment $shipment): array => $this->shipmentData($shipment)),
            'meta' => [
                'current_page' => $data->currentPage(),
                'last_page' => $data->lastPage(),
                'per_page' => $data->perPage(),
                'total' => $data->total(),
            ],
        ]);
    }

    public function createShipment(Request $request): JsonResponse
    {
        $this->access->authorize($request->user(), true);
        $data = $request->validate([
            'provider_connection_id' => ['nullable', 'uuid'],
            'provider_key' => ['required_without:provider_connection_id', 'nullable', 'string', 'max:80', 'regex:/^[a-z0-9][a-z0-9_-]*$/'],
            'sales_order_id' => ['nullable', 'uuid'],
            'order_reference' => ['nullable', 'string', 'max:120'],
            'tracking_number' => ['nullable', 'string', 'max:160'],
            'delivery_fee' => ['sometimes', 'numeric', 'min:0', 'max:9999999999.99'],
            'cod_amount' => ['sometimes', 'numeric', 'min:0', 'max:9999999999.99'],
            'cod_collected' => ['sometimes', 'boolean'],
            'status' => ['sometimes', Rule::in(DeliveryShipmentService::STATUSES)],
            'shipment_data' => ['sometimes', 'array'],
        ]);

        $connection = isset($data['provider_connection_id'])
            ? DeliveryProviderConnection::query()->findOrFail($data['provider_connection_id'])
            : null;
        $providerKey = $connection?->provider_key ?? $data['provider_key'];
        if ($connection) {
            if (! $this->providers->find($providerKey)) {
                return response()->json(['message' => 'No verified adapter is installed for this provider.'], 422);
            }
            if (empty($data['shipment_data'])) {
                return response()->json(['message' => 'Provider shipment creation requires shipment_data.'], 422);
            }
        }

        $shipment = new DeliveryShipment([
            'provider_connection_id' => $connection?->id,
            'sales_order_id' => $data['sales_order_id'] ?? null,
            'order_reference' => $data['order_reference'] ?? null,
            'provider_key' => $providerKey,
            'tracking_number' => $data['tracking_number'] ?? null,
            'provider_payload' => $connection ? $data['shipment_data'] : null,
            'status' => $data['status'] ?? 'pending',
            'raw_status' => $data['status'] ?? null,
            'delivery_fee' => $data['delivery_fee'] ?? 0,
            'cod_amount' => $data['cod_amount'] ?? 0,
            'cod_collected' => $data['cod_collected'] ?? false,
            'status_updated_at' => now(),
        ]);
        $shipment->save();
        DeliveryShipmentStatusHistory::create([
            'shipment_id' => $shipment->id,
            'status' => $shipment->status,
            'raw_status' => $shipment->raw_status,
            'occurred_at' => $shipment->status_updated_at,
            'source' => 'manual',
        ]);

        if ($connection) {
            return $this->dispatchShipment($shipment, $connection);
        }

        return response()->json(['data' => $this->shipmentData($shipment->load('statusHistory'))], 201);
    }

    public function dispatch(Request $request, string $id): JsonResponse
    {
        $this->access->authorize($request->user(), true);
        $shipment = DeliveryShipment::query()->with('connection')->findOrFail($id);
        if (! $shipment->connection || ! $shipment->provider_payload) {
            return response()->json(['message' => 'This shipment has no provider payload available for dispatch.'], 422);
        }
        if ($shipment->tracking_number) {
            return response()->json(['message' => 'This shipment already has a provider tracking number.'], 409);
        }

        return $this->dispatchShipment($shipment, $shipment->connection);
    }

    public function refreshShipment(Request $request, string $id): JsonResponse
    {
        $this->access->authorize($request->user(), true);
        $shipment = DeliveryShipment::query()->with('connection')->findOrFail($id);
        if (! $shipment->connection || ! $shipment->tracking_number) {
            return response()->json(['message' => 'This shipment cannot be refreshed without a connected provider and tracking number.'], 422);
        }
        $adapter = $this->providers->find($shipment->provider_key);
        if (! $adapter) {
            return response()->json(['message' => 'No verified adapter is installed for this provider.'], 422);
        }

        try {
            $result = $adapter->trackShipment($shipment->connection->credentials, $shipment->tracking_number);
            $normalized = $this->normalize($adapter, $result['status']);
            $this->shipments->updateStatus(
                $shipment,
                $normalized,
                $result['raw_status'] ?? $result['status'],
                'refresh',
                $result['occurred_at'] ?? null,
                $result['cod_collected'] ?? null,
            );
        } catch (Throwable $exception) {
            Log::warning('Delivery shipment refresh failed.', [
                'provider' => $shipment->provider_key,
                'exception' => $exception::class,
            ]);
            $shipment->update(['last_error' => 'Tracking refresh failed. Retry later.']);

            return response()->json(['message' => 'Tracking refresh failed. Retry later.'], 502);
        }

        return response()->json(['data' => $this->shipmentData($shipment->fresh()->load('statusHistory'))]);
    }

    public function webhook(Request $request, string $connectionId): JsonResponse
    {
        // The connection UUID is a locator only; acceptance depends on the adapter's signature check.
        $connection = $this->tenantContext->runWithoutTenantScope(
            fn () => DeliveryProviderConnection::query()
                ->withoutGlobalScope(WorkspaceScope::class)
                ->find($connectionId),
        );
        if (! $connection) {
            return response()->json(['message' => 'Webhook endpoint not found.'], 404);
        }
        $adapter = $this->providers->find($connection->provider_key);
        if (! $adapter) {
            return response()->json(['message' => 'Webhook handling is not configured for this provider.'], 501);
        }

        try {
            if (! $adapter->verifyWebhook($request, $connection->credentials)) {
                return response()->json(['message' => 'Webhook signature verification failed.'], 401);
            }
            $events = $adapter->parseWebhook($request, $connection->credentials);
        } catch (Throwable $exception) {
            Log::warning('Delivery webhook validation failed.', [
                'provider' => $connection->provider_key,
                'exception' => $exception::class,
            ]);
            return response()->json(['message' => 'Webhook could not be validated.'], 400);
        }

        return $this->tenantContext->runInContext($connection->workspace_id, function () use ($connection, $events, $adapter): JsonResponse {
            $processed = 0;
            foreach ($events as $event) {
                if (empty($event['event_id']) || empty($event['tracking_number']) || empty($event['status'])) {
                    return response()->json(['message' => 'Webhook event is missing a required identifier or status.'], 422);
                }

                $eventProcessed = DB::transaction(function () use ($connection, $event, $adapter): bool {
                    $lockedConnection = DeliveryProviderConnection::query()->lockForUpdate()->findOrFail($connection->id);
                    $alreadyProcessed = DeliveryWebhookEvent::query()
                        ->where('provider_connection_id', $lockedConnection->id)
                        ->where('provider_event_id', $event['event_id'])
                        ->exists();
                    if ($alreadyProcessed) {
                        return false;
                    }

                    $shipment = DeliveryShipment::query()
                        ->where('provider_connection_id', $lockedConnection->id)
                        ->where('tracking_number', $event['tracking_number'])
                        ->first();
                    if ($shipment) {
                        $this->shipments->updateStatus(
                            $shipment,
                            $this->normalize($adapter, $event['status']),
                            $event['raw_status'] ?? $event['status'],
                            'webhook',
                            $event['occurred_at'] ?? null,
                            $event['cod_collected'] ?? null,
                        );
                    }

                    DeliveryWebhookEvent::create([
                        'provider_connection_id' => $lockedConnection->id,
                        'provider_event_id' => $event['event_id'],
                        'processed_at' => now(),
                    ]);

                    return true;
                });
                $processed += $eventProcessed ? 1 : 0;
            }

            return response()->json(['accepted' => true, 'processed' => $processed]);
        });
    }

    private function normalize(?\App\Services\Delivery\DeliveryProviderAdapter $adapter, string $status): string
    {
        $normalized = $adapter?->normalizeStatus($status) ?? $status;
        abort_unless(in_array($normalized, DeliveryShipmentService::STATUSES, true), 422, 'Provider returned an unsupported delivery status.');

        return $normalized;
    }

    private function dispatchShipment(DeliveryShipment $shipment, DeliveryProviderConnection $connection): JsonResponse
    {
        $adapter = $this->providers->find($shipment->provider_key);
        if (! $adapter) {
            return response()->json(['message' => 'No verified adapter is installed for this provider.'], 422);
        }

        try {
            $result = $adapter->createShipment(
                $connection->credentials,
                [...$shipment->provider_payload, 'idempotency_key' => $shipment->id],
            );
            if (empty($result['tracking_number'])) {
                $shipment->update(['last_error' => 'Provider response did not include a tracking number.']);
                return response()->json([
                    'message' => 'Provider response did not include a tracking number.',
                    'shipment_id' => $shipment->id,
                ], 502);
            }

            $normalizedStatus = isset($result['status'])
                ? $this->normalize($adapter, $result['status'])
                : 'label_created';
            $shipment->update([
                'tracking_number' => $result['tracking_number'],
                'delivery_fee' => $result['delivery_fee'] ?? $shipment->delivery_fee,
                'cod_amount' => $result['cod_amount'] ?? $shipment->cod_amount,
            ]);
            $this->shipments->updateStatus(
                $shipment,
                $normalizedStatus,
                $result['raw_status'] ?? $result['status'] ?? null,
                'provider',
            );
        } catch (Throwable $exception) {
            Log::warning('Delivery shipment creation failed.', [
                'provider' => $shipment->provider_key,
                'exception' => $exception::class,
            ]);
            $shipment->update(['last_error' => 'Provider shipment creation failed. Retry using the same shipment.']);

            return response()->json([
                'message' => 'Provider shipment creation failed. Retry using the same shipment.',
                'shipment_id' => $shipment->id,
            ], 502);
        }

        $connection->update(['status' => 'connected', 'last_error' => null]);

        return response()->json(['data' => $this->shipmentData($shipment->fresh()->load('statusHistory'))], 201);
    }

    /** @return array<string, mixed> */
    private function connectionData(DeliveryProviderConnection $connection): array
    {
        $adapter = $this->providers->find($connection->provider_key);

        return [
            'id' => $connection->id,
            'provider_key' => $connection->provider_key,
            'status' => $connection->status,
            'has_credentials' => ! empty($connection->credentials),
            'supports_connection_test' => $adapter?->supportsConnectionTest() ?? false,
            'supports_shipment_creation' => $adapter !== null,
            'supports_tracking' => $adapter !== null,
            'last_tested_at' => $connection->last_tested_at?->toISOString(),
            'last_error' => $connection->last_error,
            'created_at' => $connection->created_at?->toISOString(),
        ];
    }

    /** @return array<string, mixed> */
    private function shipmentData(DeliveryShipment $shipment): array
    {
        return [
            'id' => $shipment->id,
            'provider_connection_id' => $shipment->provider_connection_id,
            'provider_key' => $shipment->provider_key,
            'sales_order_id' => $shipment->sales_order_id,
            'order_reference' => $shipment->order_reference,
            'tracking_number' => $shipment->tracking_number,
            'status' => $shipment->status,
            'raw_status' => $shipment->raw_status,
            'delivery_fee' => $shipment->delivery_fee,
            'cod_amount' => $shipment->cod_amount,
            'cod_collected' => $shipment->cod_collected,
            'status_updated_at' => $shipment->status_updated_at?->toISOString(),
            'last_error' => $shipment->last_error,
            'status_history' => $shipment->relationLoaded('statusHistory')
                ? $shipment->statusHistory->map(fn (DeliveryShipmentStatusHistory $history): array => [
                    'status' => $history->status,
                    'raw_status' => $history->raw_status,
                    'occurred_at' => $history->occurred_at?->toISOString(),
                    'source' => $history->source,
                ])->all()
                : [],
        ];
    }
}
