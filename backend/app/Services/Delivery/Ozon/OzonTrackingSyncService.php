<?php

namespace App\Services\Delivery\Ozon;

use App\Models\Delivery\DeliveryProviderConnection;
use App\Models\Delivery\DeliveryShipment;
use App\Models\Delivery\DeliveryShipmentStatusHistory;
use App\Models\Sales\SalesOrder;
use App\Models\Sales\SalesShipment;
use App\Models\User;
use App\Models\WorkspaceAuditLog;
use App\Services\Sales\OrderLifecycle;
use App\Services\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OzonTrackingSyncService
{
    /**
     * Terminal shipment statuses that must NEVER be downgraded.
     */
    public const TERMINAL_STATUSES = ['Delivered', 'Returned', 'Cancelled'];

    public function __construct(
        private readonly OzonApiClient $client,
        private readonly OzonDeliveryAdapter $adapter,
        private readonly OrderLifecycle $orderLifecycle,
        private readonly TenantContext $tenantContext,
    ) {}

    /**
     * Synchronize tracking for Ozon shipments in a workspace safely.
     *
     * @param string $workspaceId
     * @param string|null $orderId
     * @param User|null $actor
     * @param bool $forceLive
     * @return array{
     *     message: string,
     *     synced_count: int,
     *     updated_count: int,
     *     preserved_terminal_count: int,
     *     is_dry_run: bool,
     *     details: list<array<string, mixed>>
     * }
     */
    public function syncWorkspaceTracking(
        string $workspaceId,
        ?string $orderId = null,
        ?User $actor = null,
        bool $forceLive = false,
    ): array {
        return $this->tenantContext->runInContext($workspaceId, function () use ($workspaceId, $orderId, $actor, $forceLive): array {
            $credentials = $this->resolveCredentials($workspaceId);
            $isDryRun = $this->client->isDryRun($credentials);

            $query = SalesShipment::query()
                ->where('workspace_id', $workspaceId)
                ->whereRaw('LOWER(delivery_company_id) = ?', ['ozon'])
                ->whereNotNull('tracking_number')
                ->where('tracking_number', '!=', '')
            ->with(['order']);

        if ($orderId) {
            $query->where('order_id', $orderId);
        }

        $shipments = $query->get();

        if ($shipments->isEmpty()) {
            return [
                'message' => 'No Ozon shipments found to synchronize.',
                'synced_count' => 0,
                'updated_count' => 0,
                'preserved_terminal_count' => 0,
                'is_dry_run' => $isDryRun,
                'details' => [],
            ];
        }

        // SAFEGUARD 1: In dry-run mode, NEVER modify real shipment or order statuses in database
        if ($isDryRun && ! $forceLive) {
            return [
                'message' => "Simulation mode (dry-run): {$shipments->count()} Ozon shipment(s) checked. Real database records were preserved without modifications.",
                'synced_count' => $shipments->count(),
                'updated_count' => 0,
                'preserved_terminal_count' => $shipments->whereIn('status', self::TERMINAL_STATUSES)->count(),
                'is_dry_run' => true,
                'details' => $shipments->map(fn (SalesShipment $s) => [
                    'order_id' => $s->order_id,
                    'tracking_number' => $s->tracking_number,
                    'current_status' => $s->status,
                    'simulated_status' => 'In transit',
                    'action' => 'preserved_unmodified_dry_run',
                ])->values()->all(),
            ];
        }

        // Filter tracking numbers: skip internal dummy numbers or empty strings
        $validShipments = $shipments->filter(fn (SalesShipment $s) => ! empty(trim((string) $s->tracking_number)));
        $trackingNumbers = $validShipments->pluck('tracking_number')->filter()->unique()->values()->all();

        if (empty($trackingNumbers)) {
            return [
                'message' => 'No valid Ozon tracking numbers to query.',
                'synced_count' => 0,
                'updated_count' => 0,
                'preserved_terminal_count' => 0,
                'is_dry_run' => false,
                'details' => [],
            ];
        }

        // Batch tracking requests to respect API rate limits
        $batches = array_chunk($trackingNumbers, 50);
        $trackingMap = [];

        foreach ($batches as $batch) {
            try {
                $batchResult = $this->client->tracking($credentials, $batch);
                $trackingMap = array_merge($trackingMap, $batchResult);
            } catch (\Throwable $e) {
                Log::warning('Ozon bulk tracking request error during synchronization', [
                    'workspace_id' => $workspaceId,
                    'batch_count' => count($batch),
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $updatedCount = 0;
        $preservedTerminalCount = 0;
        $details = [];

        DB::transaction(function () use (
            $validShipments,
            $trackingMap,
            &$updatedCount,
            &$preservedTerminalCount,
            &$details,
            $workspaceId,
            $actor,
            $orderId
        ): void {
            foreach ($validShipments as $shipment) {
                $tn = trim((string) $shipment->tracking_number);

                if (! isset($trackingMap[$tn])) {
                    $details[] = [
                        'order_id' => $shipment->order_id,
                        'tracking_number' => $tn,
                        'current_status' => $shipment->status,
                        'action' => 'no_provider_response',
                    ];
                    continue;
                }

                $event = $trackingMap[$tn];
                $rawStatus = (string) ($event['raw_status'] ?? $event['status'] ?? '');
                $normalizedDeliveryStatus = $this->adapter->normalizeStatus($rawStatus);

                // Map to SalesShipment status
                $candidateStatus = match ($normalizedDeliveryStatus) {
                    'delivered' => 'Delivered',
                    'returned' => 'Returned',
                    'cancelled' => 'Cancelled',
                    'picked_up', 'in_transit', 'out_for_delivery' => 'In transit',
                    'label_created', 'ready' => 'Ready',
                    'pending' => 'Pending',
                    'failed' => 'Failed',
                    default => $shipment->status,
                };

                // SAFEGUARD 2: Terminal State Protection
                // Never downgrade already Delivered or Returned shipments!
                if (in_array($shipment->status, self::TERMINAL_STATUSES, true) && $candidateStatus !== $shipment->status) {
                    $preservedTerminalCount++;
                    $details[] = [
                        'order_id' => $shipment->order_id,
                        'tracking_number' => $tn,
                        'current_status' => $shipment->status,
                        'provider_status' => $rawStatus,
                        'action' => 'preserved_terminal_state',
                    ];
                    continue;
                }

                // If candidate status is unknown or identical, do not update
                if ($candidateStatus === 'unknown' || $candidateStatus === $shipment->status) {
                    $details[] = [
                        'order_id' => $shipment->order_id,
                        'tracking_number' => $tn,
                        'current_status' => $shipment->status,
                        'action' => 'unchanged',
                    ];
                    continue;
                }

                // Capture courier fee and cod amount if available from tracking event
                $feeUpdates = [];
                if (isset($event['delivered_fee']) && $event['delivered_fee'] !== null) {
                    $shipment->shipping_cost = (float) $event['delivered_fee'];
                    $feeUpdates['delivery_fee'] = (float) $event['delivered_fee'];
                } elseif ($candidateStatus === 'Returned' && isset($event['returned_fee']) && $event['returned_fee'] !== null) {
                    $shipment->shipping_cost = (float) $event['returned_fee'];
                    $feeUpdates['delivery_fee'] = (float) $event['returned_fee'];
                }

                if (isset($event['cod_amount']) && $event['cod_amount'] !== null && (float) $event['cod_amount'] > 0) {
                    $shipment->cod_amount = (float) $event['cod_amount'];
                    $feeUpdates['cod_amount'] = (float) $event['cod_amount'];
                }

                // Apply update
                $oldStatus = $shipment->status;
                $shipment->status = $candidateStatus;
                // CRITICAL: Delivery status update NEVER marks payment collection status as Collected!
                $shipment->save();
                $updatedCount++;

                // Propagate to SalesOrder lifecycle safely
                if ($shipment->order) {
                    $this->orderLifecycle->syncOrderFromShipment($shipment);
                }

                // Synchronize with Delivery module shipment record
                $deliveryShipment = DeliveryShipment::query()
                    ->where('workspace_id', $workspaceId)
                    ->where('tracking_number', $tn)
                    ->first();

                if (! $deliveryShipment) {
                    // Backfill DeliveryShipment if it didn't exist yet
                    $deliveryShipment = DeliveryShipment::create([
                        'workspace_id' => $workspaceId,
                        'sales_order_id' => $shipment->order_id,
                        'order_reference' => $shipment->order?->order_number,
                        'provider_key' => 'ozon',
                        'tracking_number' => $tn,
                        'status' => $normalizedDeliveryStatus,
                        'raw_status' => $rawStatus,
                        'delivery_fee' => (float) ($shipment->shipping_cost ?? 0),
                        'cod_amount' => (float) ($shipment->cod_amount ?? 0),
                        'cod_collected' => false,
                        'status_updated_at' => now(),
                    ]);
                } else {
                    $updatePayload = array_merge([
                        'status' => $normalizedDeliveryStatus,
                        'raw_status' => $rawStatus,
                        'status_updated_at' => now(),
                    ], $feeUpdates);
                    $deliveryShipment->update($updatePayload);
                }

                DeliveryShipmentStatusHistory::create([
                    'shipment_id' => $deliveryShipment->id,
                    'status' => $normalizedDeliveryStatus,
                    'raw_status' => $rawStatus,
                    'occurred_at' => now(),
                    'source' => 'ozon_tracking_sync',
                ]);

                $details[] = [
                    'order_id' => $shipment->order_id,
                    'tracking_number' => $tn,
                    'old_status' => $oldStatus,
                    'new_status' => $candidateStatus,
                    'action' => 'updated',
                ];
            }

            WorkspaceAuditLog::log(
                $workspaceId,
                'delivery.ozon_tracking_synchronized',
                'sales_shipment',
                $orderId ?: $workspaceId,
                [
                    'synced_count' => $validShipments->count(),
                    'updated_count' => $updatedCount,
                    'preserved_terminal_count' => $preservedTerminalCount,
                ],
                $actor?->id
            );
        });

        $resultPayload = [
            'message' => "Ozon tracking synchronized. {$validShipments->count()} shipment(s) checked, {$updatedCount} updated, {$preservedTerminalCount} terminal status(es) preserved.",
            'synced_count' => $validShipments->count(),
            'updated_count' => $updatedCount,
            'preserved_terminal_count' => $preservedTerminalCount,
            'is_dry_run' => false,
            'last_sync_at' => now()->toIso8601String(),
            'next_planned_sync_at' => now()->addHour()->toIso8601String(),
            'details' => $details,
        ];

        \Illuminate\Support\Facades\Cache::put("ozon_sync_status_{$workspaceId}", $resultPayload, now()->addDays(30));

        return $resultPayload;
        });
    }

    /**
     * Get comprehensive synchronization metrics and Ozon dashboard summary.
     *
     * @param string $workspaceId
     * @return array<string, mixed>
     */
    public function getSyncStatus(string $workspaceId): array
    {
        return $this->tenantContext->runInContext($workspaceId, function () use ($workspaceId): array {
            $cached = \Illuminate\Support\Facades\Cache::get("ozon_sync_status_{$workspaceId}");
            $credentials = $this->resolveCredentials($workspaceId);
            $isDryRun = $this->client->isDryRun($credentials);

            $ozonShipmentsQuery = SalesShipment::query()
                ->where('workspace_id', $workspaceId)
                ->whereRaw('LOWER(delivery_company_id) = ?', ['ozon']);

            $totalOzon = (clone $ozonShipmentsQuery)->count();
            $pendingPickup = (clone $ozonShipmentsQuery)->whereIn('status', ['Pending', 'Ready'])->count();
            $inTransit = (clone $ozonShipmentsQuery)->where('status', 'In transit')->count();
            $delivered = (clone $ozonShipmentsQuery)->where('status', 'Delivered')->count();
            $returnedRefused = (clone $ozonShipmentsQuery)->where('status', 'Returned')->count();
            $collectedPendingRemittance = (clone $ozonShipmentsQuery)
                ->where('status', 'Delivered')
                ->where('payment_collection_status', 'Pending')
                ->count();
            $remittedVerified = (clone $ozonShipmentsQuery)
                ->where('payment_collection_status', 'Collected')
                ->count();

            $totalExpectedCod = (float) ((clone $ozonShipmentsQuery)->sum('cod_amount') ?? 0);
            $totalDeliveryFees = (float) ((clone $ozonShipmentsQuery)->sum('shipping_cost') ?? 0);

            $unmatchedReviewQueue = DeliveryShipment::query()
                ->where('workspace_id', $workspaceId)
                ->where('provider_key', 'ozon')
                ->whereNull('sales_order_id')
                ->count();

            $privateCourierCount = SalesShipment::query()
                ->where('workspace_id', $workspaceId)
                ->whereRaw('LOWER(delivery_company_id) != ?', ['ozon'])
                ->count();

            return [
                'is_dry_run' => $isDryRun,
                'last_successful_sync' => $cached['last_sync_at'] ?? null,
                'last_sync_message' => $cached['message'] ?? 'No sync run yet.',
                'parcels_checked_count' => $cached['synced_count'] ?? $totalOzon,
                'updated_count' => $cached['updated_count'] ?? 0,
                'preserved_terminal_count' => $cached['preserved_terminal_count'] ?? 0,
                'unmatched_parcels_count' => $unmatchedReviewQueue,
                'failed_requests_count' => 0,
                'next_planned_sync_at' => $cached['next_planned_sync_at'] ?? now()->addHour()->toIso8601String(),
                'summary' => [
                    'total_ozon_shipments' => $totalOzon,
                    'pending_pickup' => $pendingPickup,
                    'in_transit' => $inTransit,
                    'delivered' => $delivered,
                    'returned_refused' => $returnedRefused,
                    'collected_pending_remittance' => $collectedPendingRemittance,
                    'remitted_verified' => $remittedVerified,
                    'total_expected_cod' => $totalExpectedCod,
                    'total_delivery_fees' => $totalDeliveryFees,
                    'unmatched_review_queue' => $unmatchedReviewQueue,
                    'private_courier_count' => $privateCourierCount,
                ],
            ];
        });
    }

    /**
     * Resolve carrier credentials for a given workspace.
     *
     * @param string $workspaceId
     * @return array<string, mixed>
     */
    public function resolveCredentials(string $workspaceId): array
    {
        $connection = DeliveryProviderConnection::query()
            ->where('workspace_id', $workspaceId)
            ->where('provider_key', 'ozon')
            ->first();

        $credentials = $connection?->credentials ?? [];

        if (empty($credentials['api_key']) && config('services.ozon.api_key')) {
            $credentials['api_key'] = config('services.ozon.api_key');
        }
        if (empty($credentials['customer_id']) && config('services.ozon.customer_id')) {
            $credentials['customer_id'] = config('services.ozon.customer_id');
        }

        return $credentials;
    }

    /**
     * Synchronize and mirror all SalesShipments into DeliveryShipments for unified visibility.
     */
    public function syncSalesShipmentsToDeliveryModule(string $workspaceId): int
    {
        return $this->tenantContext->runInContext($workspaceId, function () use ($workspaceId): int {
            $salesShipments = SalesShipment::query()
                ->where('workspace_id', $workspaceId)
                ->with(['order'])
                ->get();

        $synced = 0;

        foreach ($salesShipments as $shipment) {
            $tn = $shipment->tracking_number ? trim((string) $shipment->tracking_number) : null;

            // Format provider_key cleanly (e.g. "Khalid Nait Lmouden" -> "khalid_nait_lmouden", "ozon" -> "ozon")
            $rawCompany = trim((string) ($shipment->delivery_company_id ?: 'local'));
            $providerKey = strtolower(preg_replace('/[^a-zA-Z0-9_-]+/', '_', $rawCompany));

            // CRITICAL SAFEGUARD: Match strictly by sales_order_id.
            // NEVER use orWhere('tracking_number', $tn) which causes cross-matching between
            // different orders that happen to share internal references like CRN-005.
            $deliveryShipment = DeliveryShipment::query()
                ->where('workspace_id', $workspaceId)
                ->where('sales_order_id', $shipment->order_id)
                ->first();

            $normalizedStatus = match (strtolower(trim((string) $shipment->status))) {
                'delivered' => 'delivered',
                'returned' => 'returned',
                'cancelled' => 'cancelled',
                'in transit', 'shipping' => 'in_transit',
                'ready' => 'label_created',
                'failed' => 'failed',
                default => 'pending',
            };

            $deliveryFee = (float) ($shipment->shipping_cost ?? 0);
            $codAmount = (float) ($shipment->cod_amount ?? 0);

            if (! $deliveryShipment) {
                $deliveryShipment = DeliveryShipment::create([
                    'workspace_id' => $workspaceId,
                    'sales_order_id' => $shipment->order_id,
                    'order_reference' => $shipment->order?->order_number,
                    'provider_key' => $providerKey,
                    'tracking_number' => $tn,
                    'status' => $normalizedStatus,
                    'raw_status' => $shipment->status,
                    'delivery_fee' => $deliveryFee,
                    'cod_amount' => $codAmount,
                    'cod_collected' => false,
                    'status_updated_at' => $shipment->updated_at ?? now(),
                ]);

                DeliveryShipmentStatusHistory::create([
                    'shipment_id' => $deliveryShipment->id,
                    'status' => $normalizedStatus,
                    'raw_status' => $shipment->status,
                    'occurred_at' => $shipment->updated_at ?? now(),
                    'source' => 'sales_shipment_sync',
                ]);

                $synced++;
            } else {
                $updates = [];
                if ($deliveryShipment->provider_key !== $providerKey) {
                    $updates['provider_key'] = $providerKey;
                }
                if ($deliveryShipment->tracking_number !== $tn) {
                    $updates['tracking_number'] = $tn;
                }
                if ($deliveryShipment->delivery_fee != $deliveryFee) {
                    $updates['delivery_fee'] = $deliveryFee;
                }
                if ($deliveryShipment->cod_amount != $codAmount) {
                    $updates['cod_amount'] = $codAmount;
                }
                if ($deliveryShipment->status !== $normalizedStatus && ! in_array($deliveryShipment->status, ['delivered', 'returned'], true)) {
                    $updates['status'] = $normalizedStatus;
                    $updates['raw_status'] = $shipment->status;
                }
                if (! empty($updates)) {
                    $deliveryShipment->update($updates);
                    $synced++;
                }
            }
        }

            return $synced;
        });
    }
}


