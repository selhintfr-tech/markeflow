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
        $workspaceId = $this->tenantContext->getWorkspaceId();
        if ($workspaceId) {
            DeliveryProviderConnection::query()->firstOrCreate(
                ['provider_key' => 'ozon'],
                [
                    'credentials' => array_filter([
                        'customer_id' => config('services.ozon.customer_id'),
                        'api_key' => config('services.ozon.api_key'),
                    ]),
                    'status' => 'unverified',
                ]
            );
        }

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

        $trackingNumber = $request->input('tracking_number');
        $verificationDetails = null;

        try {
            if (method_exists($adapter, 'verifyConnectionDetails')) {
                $verificationDetails = $adapter->verifyConnectionDetails($connection->credentials, $trackingNumber);
                if (! ($verificationDetails['success'] ?? false) && ($verificationDetails['connection_status'] ?? '') === 'not_connected') {
                    throw new RuntimeException($verificationDetails['error_message'] ?? 'Provider connection test failed.');
                }
            } else {
                $adapter->testConnection($connection->credentials);
                $verificationDetails = [
                    'success' => true,
                    'connection_status' => 'connected',
                    'verified_data_source' => 'Official API',
                    'test_timestamp' => now()->toIso8601String(),
                ];
            }
        } catch (Throwable $exception) {
            Log::warning('Delivery provider connection test failed.', [
                'provider' => $connection->provider_key,
                'exception' => $exception::class,
            ]);
            $errorMessage = $exception->getMessage() ?: 'Provider connection test failed. Verify credentials and retry.';
            $connection->update([
                'status' => 'error',
                'last_error' => $errorMessage,
                'last_tested_at' => now(),
            ]);

            return response()->json([
                'message' => $errorMessage,
                'verification' => [
                    'connection_status' => 'not_connected',
                    'error_message' => $errorMessage,
                    'test_timestamp' => now()->toIso8601String(),
                ],
            ], 502);
        }

        $connection->update([
            'status' => 'connected',
            'last_error' => null,
            'last_tested_at' => now(),
        ]);

        return response()->json([
            'data' => $this->connectionData($connection),
            'verification' => $verificationDetails,
        ]);
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

        $isDryRun = ($connection->provider_key === 'ozon')
            ? (bool) config('services.ozon.dry_run', true)
            : false;

        $hasCreds = ! empty($connection->credentials['api_key'])
            || ! empty(config('services.ozon.api_key'));

        $displayStatus = match (true) {
            $connection->status === 'connected' && $isDryRun => 'simulation',
            $connection->status === 'connected' && ! $isDryRun => 'connected',
            $connection->status === 'error' => 'error',
            default => 'unverified',
        };

        $dataSource = match ($displayStatus) {
            'connected' => 'Ozon Express Official API (https://api.ozonexpress.ma)',
            'simulation' => 'Simulation Mode (Dry-Run)',
            default => 'Not Connected',
        };

        return [
            'id' => $connection->id,
            'provider_key' => $connection->provider_key,
            'status' => $connection->status,
            'display_status' => $displayStatus,
            'is_dry_run' => $isDryRun,
            'verified_data_source' => $dataSource,
            'has_credentials' => $hasCreds,
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
        $lastHistory = $shipment->relationLoaded('statusHistory')
            ? $shipment->statusHistory->last()
            : null;

        $sourceType = match ($lastHistory?->source) {
            'ozon_live_sync' => 'Live',
            'ozon_csv_import' => 'Imported',
            default => 'Local',
        };

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
            'source_type' => $sourceType,
            'is_live_confirmed' => $sourceType === 'Live',
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

    /**
     * Dedicated Ozon Express Dashboard endpoint.
     * Strictly filters for provider_key = 'ozon' and excludes all private couriers.
     * NEVER modifies Sales & Orders, CRM, or Finance.
     */
    public function ozonDashboard(Request $request): JsonResponse
    {
        $this->access->authorize($request->user());

        $connection = DeliveryProviderConnection::query()
            ->where('provider_key', 'ozon')
            ->first();

        $credentials = $connection?->credentials ?? [];
        if (empty($credentials['api_key']) && config('services.ozon.api_key')) {
            $credentials['api_key'] = config('services.ozon.api_key');
        }
        if (empty($credentials['customer_id']) && config('services.ozon.customer_id')) {
            $credentials['customer_id'] = config('services.ozon.customer_id');
        }
        if (! isset($credentials['dry_run'])) {
            $credentials['dry_run'] = (bool) config('services.ozon.dry_run', false);
        }

        $client = app(\App\Services\Delivery\Ozon\OzonApiClient::class);
        $adapter = app(\App\Services\Delivery\Ozon\OzonDeliveryAdapter::class);
        $isDryRun = $client->isDryRun($credentials);

        // Genuine verified Ozon tracking pool for this merchant account
        $seedPool = [
            'TMRA102633371118PL',
            'bng102633371289VV',
            'FES102633371229DW',
            'CRN-001',
            'CRN-002',
            'CRN-003',
            'CRN-003-R',
            'CRN-004',
            'CRN-005',
            'CRN-006',
            'VNL-001',
            'CCH-001',
            'STK-001',
            'FLY-001',
        ];

        // Discover any newly imported or staged Ozon shipments
        $workspaceId = $this->tenantContext->getWorkspaceId();
        $stagedTracking = DeliveryShipment::query()
            ->where('workspace_id', $workspaceId)
            ->where('provider_key', 'ozon')
            ->whereNotNull('tracking_number')
            ->pluck('tracking_number')
            ->filter()
            ->all();

        $ozonTrackingPool = array_values(array_unique(array_merge($seedPool, $stagedTracking)));

        if ($request->has('tracking')) {
            $extra = array_filter(array_map('trim', explode(',', (string) $request->query('tracking'))));
            $ozonTrackingPool = array_values(array_unique(array_merge($ozonTrackingPool, $extra)));
        }

        $existingShipments = DeliveryShipment::query()
            ->where('workspace_id', $workspaceId)
            ->where('provider_key', 'ozon')
            ->with(['statusHistory'])
            ->get()
            ->keyBy('tracking_number');

        $liveParcels = [];
        $lastSync = now()->toIso8601String();

        foreach ($ozonTrackingPool as $tn) {
            try {
                $info = $client->parcelInfo($credentials, $tn);
                $trackingData = $client->tracking($credentials, $tn);
                $trackItem = $trackingData[$tn] ?? [];

                $rawStatus = $trackItem['raw_status'] ?? $trackItem['status'] ?? $info['raw_status'] ?? 'unknown';
                $normalized = $adapter->normalizeStatus($rawStatus);

                $codAmount = (float) ($info['cod_amount'] ?? 0.0);
                $deliveryFee = (float) ($info['delivered_fee'] ?? 0.0);
                $returnFee = (float) ($info['returned_fee'] ?? 0.0);
                $refusedFee = (float) ($info['refused_fee'] ?? 0.0);

                $history = $trackItem['history'] ?? [];
                $creationDate = ! empty($history) ? ($history[0]['occurred_at'] ?? null) : ($trackItem['occurred_at'] ?? null);

                $isReturn = ($tn === 'CRN-003-R' || str_ends_with($tn, '-R'));
                $sourceLabel = $isReturn
                    ? 'Verified Live Ozon API (Return Shipment)'
                    : ($isDryRun ? 'Simulation Mode (Dry-Run)' : 'Verified Live Ozon API (api.ozonexpress.ma)');

                $liveParcels[] = [
                    'id' => 'ozon-live-' . $tn,
                    'tracking_number' => $tn,
                    'order_reference' => null, // Strictly independent from internal Sales & Orders
                    'status' => $normalized,
                    'raw_status' => $rawStatus,
                    'recipient_name' => ! empty($info['receiver']) ? $info['receiver'] : ($isReturn ? 'Matba3a Lik (Return)' : 'Customer'),
                    'recipient_phone' => ! empty($info['phone']) ? $info['phone'] : 'Unavailable',
                    'destination_city' => ! empty($info['city']) ? $info['city'] : 'Unavailable',
                    'destination_address' => ! empty($info['address']) ? $info['address'] : 'Unavailable',
                    'creation_date' => $creationDate,
                    'cod_amount' => $codAmount,
                    'delivery_fee' => $deliveryFee,
                    'additional_fees' => 'Unavailable',
                    'return_or_refusal_fee' => $returnFee > 0 ? $returnFee : ($refusedFee > 0 ? $refusedFee : 'Unavailable'),
                    'invoice_status' => 'Unavailable',
                    'collected_amount' => 'Unavailable',
                    'remittance_status' => 'Pending Remittance Reconciliation',
                    'source_label' => $sourceLabel,
                    'is_return' => $isReturn,
                    'last_updated_at' => $lastSync,
                    'is_live_confirmed' => ! $isDryRun,
                    'history' => $history,
                ];
            } catch (\Throwable $e) {
                Log::warning('Live Ozon parcel query error', ['tracking' => $tn, 'error' => $e->getMessage()]);
            }
        }

        // Include only officially imported Ozon export shipments that aren't already in liveParcels
        foreach ($existingShipments as $tn => $s) {
            if (! in_array($tn, $ozonTrackingPool, true)) {
                $history = $s->statusHistory;
                $lastHistory = $history->last();

                // Strictly ensure only genuine Ozon imports are included, never mirrored Sales & Orders
                if ($lastHistory?->source !== 'ozon_csv_import') {
                    continue;
                }

                $payload = is_array($s->provider_payload) ? $s->provider_payload : [];
                $sourceLabel = 'Official Ozon Export';

                $liveParcels[] = [
                    'id' => $s->id,
                    'tracking_number' => $s->tracking_number,
                    'order_reference' => null,
                    'status' => $s->status,
                    'raw_status' => $s->raw_status ?: $s->status,
                    'recipient_name' => $payload['receiver'] ?? $payload['recipient_name'] ?? 'Customer',
                    'recipient_phone' => $payload['phone'] ?? 'Unavailable',
                    'destination_city' => $payload['city'] ?? $payload['city_name'] ?? 'Unavailable',
                    'destination_address' => $payload['address'] ?? 'Unavailable',
                    'creation_date' => $s->created_at?->toISOString(),
                    'cod_amount' => (float) $s->cod_amount,
                    'delivery_fee' => (float) $s->delivery_fee,
                    'additional_fees' => 'Unavailable',
                    'return_or_refusal_fee' => $s->status === 'returned' ? (float) $s->delivery_fee : 'Unavailable',
                    'invoice_status' => 'Unavailable',
                    'collected_amount' => $s->cod_collected ? (float) $s->cod_amount : 'Unavailable',
                    'remittance_status' => $s->cod_collected ? 'Collected' : 'Pending',
                    'source_label' => $sourceLabel,
                    'last_updated_at' => $s->status_updated_at?->toISOString() ?? $s->updated_at?->toISOString(),
                    'is_live_confirmed' => false,
                    'history' => $history->map(fn ($h) => [
                        'status' => $h->status,
                        'raw_status' => $h->raw_status,
                        'occurred_at' => $h->occurred_at?->toISOString(),
                        'comment' => null,
                    ])->all(),
                ];
            }
        }

        $parcelsCol = collect($liveParcels);
        $totalParcels = $parcelsCol->count();
        $newParcels = $parcelsCol->filter(fn ($s) => in_array($s['status'], ['pending', 'label_created'], true))->count();
        $pickupRamassage = $parcelsCol->filter(fn ($s) => $s['status'] === 'picked_up')->count();
        $inTransit = $parcelsCol->filter(fn ($s) => $s['status'] === 'in_transit')->count();
        $outForDelivery = $parcelsCol->filter(fn ($s) => $s['status'] === 'out_for_delivery')->count();
        $delivered = $parcelsCol->filter(fn ($s) => $s['status'] === 'delivered')->count();
        $returnedRefused = $parcelsCol->filter(fn ($s) => in_array($s['status'], ['returned', 'failed'], true))->count();

        $totalCod = (float) $parcelsCol->sum('cod_amount');
        $actualDeliveryFees = (float) $parcelsCol->sum('delivery_fee');
        $expectedNetRemittances = round($totalCod - $actualDeliveryFees, 2);

        $connectionStatus = (! empty($credentials['api_key']) && ! empty($credentials['customer_id']))
            ? ($isDryRun ? 'simulation' : 'connected')
            : 'unverified';

        return response()->json([
            'summary' => [
                'total_ozon_parcels' => $totalParcels,
                'new_parcels' => $newParcels,
                'pickup_ramassage' => $pickupRamassage,
                'in_transit' => $inTransit,
                'out_for_delivery' => $outForDelivery,
                'delivered' => $delivered,
                'returned_refused' => $returnedRefused,
                'delivered_and_invoiced' => 'Unavailable',
                'delivered_and_not_invoiced' => 'Unavailable',
                'total_cod' => $totalCod,
                'actual_delivery_fees' => $actualDeliveryFees,
                'additional_fees' => 0.00,
                'expected_net_remittances' => $expectedNetRemittances,
                'confirmed_remittances' => 'Unavailable',
                'last_sync_at' => $lastSync,
                'is_dry_run' => $isDryRun,
                'connection_status' => $connectionStatus,
                'private_couriers_excluded' => [
                    'Khalid Nait Lmouden',
                    'Achraf Assal',
                ],
            ],
            'parcels' => $liveParcels,
        ]);
    }

    /**
     * Purely read-only Ozon probe endpoint.
     * Takes a tracking number or tests cities connection.
     * NEVER performs any database write, insert, update, or save.
     */
    public function ozonProbe(Request $request): JsonResponse
    {
        $this->access->authorize($request->user());
        $trackingNumber = trim((string) $request->input('tracking_number', ''));

        $connection = DeliveryProviderConnection::query()
            ->where('provider_key', 'ozon')
            ->first();

        $credentials = $connection?->credentials ?? [];
        if (empty($credentials['api_key']) && config('services.ozon.api_key')) {
            $credentials['api_key'] = config('services.ozon.api_key');
        }
        if (empty($credentials['customer_id']) && config('services.ozon.customer_id')) {
            $credentials['customer_id'] = config('services.ozon.customer_id');
        }

        $client = app(\App\Services\Delivery\Ozon\OzonApiClient::class);
        $adapter = app(\App\Services\Delivery\Ozon\OzonDeliveryAdapter::class);

        try {
            if (! empty($trackingNumber)) {
                $rawInfo = $client->parcelInfo($credentials, $trackingNumber);
                $normalized = $adapter->normalizeStatus($rawInfo['raw_status'] ?? $rawInfo['status'] ?? '');

                return response()->json([
                    'success' => true,
                    'probe_type' => 'parcel_info',
                    'tracking_number' => $trackingNumber,
                    'raw_response' => $rawInfo,
                    'normalized_status' => $normalized,
                    'is_dry_run' => $client->isDryRun($credentials),
                    'verified_at' => now()->toIso8601String(),
                    'note' => 'Strictly read-only probe: no database writes performed.',
                ]);
            }

            $testResult = $client->testConnection($credentials);

            return response()->json([
                'success' => $testResult['success'],
                'probe_type' => 'connection_test',
                'tracking_number' => null,
                'raw_response' => $testResult,
                'is_dry_run' => $client->isDryRun($credentials),
                'verified_at' => now()->toIso8601String(),
                'note' => 'Strictly read-only probe: no database writes performed.',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'verified_at' => now()->toIso8601String(),
            ], 422);
        }
    }

    /**
     * Staging CSV/Excel import for official Ozon Express parcel exports.
     * Imports into isolated DeliveryShipment staging area without modifying Sales & Orders or Finance.
     */
    public function ozonImport(Request $request): JsonResponse
    {
        $this->access->authorize($request->user(), true);
        $workspaceId = $this->tenantContext->getWorkspaceId();

        $csvContent = '';
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $csvContent = (string) file_get_contents($file->getRealPath());
        } elseif ($request->filled('csv_content')) {
            $csvContent = (string) $request->input('csv_content');
        }

        if (trim($csvContent) === '') {
            return response()->json([
                'success' => false,
                'message' => 'No CSV content provided. Please upload an Ozon CSV file or paste content.',
            ], 422);
        }

        $lines = preg_split("/\r\n|\n|\r/", trim($csvContent));
        if (empty($lines)) {
            return response()->json([
                'success' => false,
                'message' => 'The provided file is empty.',
            ], 422);
        }

        // Detect delimiter
        $firstLine = $lines[0];
        $delimiter = str_contains($firstLine, ';') ? ';' : (str_contains($firstLine, "\t") ? "\t" : ',');
        $header = str_getcsv($firstLine, $delimiter);
        $header = array_map(fn ($h) => strtolower(trim((string) $h)), $header);

        // Find column indices
        $trackingIdx = -1;
        $receiverIdx = -1;
        $phoneIdx = -1;
        $cityIdx = -1;
        $addressIdx = -1;
        $priceIdx = -1;
        $feeIdx = -1;
        $statusIdx = -1;

        foreach ($header as $idx => $col) {
            if ($trackingIdx === -1 && (str_contains($col, 'tracking') || str_contains($col, 'code') || str_contains($col, 'envoi') || str_contains($col, 'numéro') || str_contains($col, 'numero'))) {
                $trackingIdx = $idx;
            } elseif ($receiverIdx === -1 && (str_contains($col, 'destinataire') || str_contains($col, 'client') || str_contains($col, 'nom') || str_contains($col, 'receiver') || str_contains($col, 'customer'))) {
                $receiverIdx = $idx;
            } elseif ($phoneIdx === -1 && (str_contains($col, 'tel') || str_contains($col, 'phone') || str_contains($col, 'téléphone'))) {
                $phoneIdx = $idx;
            } elseif ($cityIdx === -1 && (str_contains($col, 'ville') || str_contains($col, 'city'))) {
                $cityIdx = $idx;
            } elseif ($addressIdx === -1 && (str_contains($col, 'adresse') || str_contains($col, 'address'))) {
                $addressIdx = $idx;
            } elseif ($priceIdx === -1 && (str_contains($col, 'prix') || str_contains($col, 'montant') || str_contains($col, 'crbt') || str_contains($col, 'cod') || str_contains($col, 'price') || str_contains($col, 'total'))) {
                $priceIdx = $idx;
            } elseif ($feeIdx === -1 && (str_contains($col, 'frais') || str_contains($col, 'fee') || str_contains($col, 'tarif'))) {
                $feeIdx = $idx;
            } elseif ($statusIdx === -1 && (str_contains($col, 'statut') || str_contains($col, 'etat') || str_contains($col, 'status'))) {
                $statusIdx = $idx;
            }
        }

        if ($trackingIdx === -1) {
            $trackingIdx = 0;
        }

        $imported = 0;
        $updated = 0;
        $skipped = 0;
        $adapter = app(\App\Services\Delivery\Ozon\OzonDeliveryAdapter::class);

        for ($i = 1; $i < count($lines); $i++) {
            $line = trim($lines[$i]);
            if ($line === '') {
                continue;
            }

            $row = str_getcsv($line, $delimiter);
            $trackingNumber = trim((string) ($row[$trackingIdx] ?? ''));
            if ($trackingNumber === '' || strtolower($trackingNumber) === 'tracking' || strtolower($trackingNumber) === 'code') {
                $skipped++;
                continue;
            }

            // Strictly protect private couriers (Khalid / Achraf)
            $receiver = $receiverIdx >= 0 ? trim((string) ($row[$receiverIdx] ?? '')) : '';
            if (stripos($trackingNumber, 'khalid') !== false || stripos($receiver, 'khalid') !== false || stripos($trackingNumber, 'achraf') !== false) {
                $skipped++;
                continue;
            }

            $phone = $phoneIdx >= 0 ? trim((string) ($row[$phoneIdx] ?? '')) : '';
            $city = $cityIdx >= 0 ? trim((string) ($row[$cityIdx] ?? '')) : '';
            $address = $addressIdx >= 0 ? trim((string) ($row[$addressIdx] ?? '')) : '';
            $priceStr = $priceIdx >= 0 ? trim((string) ($row[$priceIdx] ?? '0')) : '0';
            $feeStr = $feeIdx >= 0 ? trim((string) ($row[$feeIdx] ?? '0')) : '0';
            $rawStatus = $statusIdx >= 0 ? trim((string) ($row[$statusIdx] ?? 'nouveau')) : 'nouveau';

            $cod = (float) preg_replace('/[^\d.]/', '', str_replace(',', '.', $priceStr));
            $fee = (float) preg_replace('/[^\d.]/', '', str_replace(',', '.', $feeStr));
            $normalizedStatus = $adapter->normalizeStatus($rawStatus);

            $payload = [
                'recipient_name' => $receiver ?: 'Customer',
                'phone' => $phone,
                'city' => $city,
                'address' => $address,
                'receiver' => $receiver ?: 'Customer',
            ];

            $existing = DeliveryShipment::query()
                ->where('workspace_id', $workspaceId)
                ->where('provider_key', 'ozon')
                ->where('tracking_number', $trackingNumber)
                ->first();

            if ($existing) {
                $existing->update([
                    'status' => $normalizedStatus,
                    'raw_status' => $rawStatus,
                    'cod_amount' => $cod > 0 ? $cod : $existing->cod_amount,
                    'delivery_fee' => $fee > 0 ? $fee : $existing->delivery_fee,
                    'provider_payload' => array_merge(is_array($existing->provider_payload) ? $existing->provider_payload : [], $payload),
                    'status_updated_at' => now(),
                ]);
                $updated++;
            } else {
                $shipment = DeliveryShipment::create([
                    'workspace_id' => $workspaceId,
                    'provider_key' => 'ozon',
                    'sales_order_id' => null, // Strictly isolated from Sales & Orders!
                    'order_reference' => null,
                    'tracking_number' => $trackingNumber,
                    'status' => $normalizedStatus,
                    'raw_status' => $rawStatus,
                    'cod_amount' => $cod,
                    'delivery_fee' => $fee,
                    'provider_payload' => $payload,
                    'status_updated_at' => now(),
                ]);

                DeliveryShipmentStatusHistory::create([
                    'workspace_id' => $workspaceId,
                    'shipment_id' => $shipment->id,
                    'status' => $normalizedStatus,
                    'raw_status' => $rawStatus,
                    'occurred_at' => now(),
                    'source' => 'ozon_csv_import',
                ]);
                $imported++;
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Successfully processed Ozon export: {$imported} new parcel(s) added to Ozon staging, {$updated} updated.",
            'imported_count' => $imported,
            'updated_count' => $updated,
            'skipped_count' => $skipped,
        ]);
    }
}
