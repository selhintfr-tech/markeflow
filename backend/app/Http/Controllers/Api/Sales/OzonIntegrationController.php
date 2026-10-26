<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\Delivery\DeliveryProviderConnection;
use App\Models\Delivery\DeliveryShipment;
use App\Models\Delivery\DeliveryShipmentStatusHistory;
use App\Models\Sales\SalesOrder;
use App\Models\Sales\SalesShipment;
use App\Models\User;
use App\Models\WorkspaceAuditLog;
use App\Models\WorkspaceUser;
use App\Services\Delivery\Ozon\OzonApiClient;
use App\Services\Delivery\Ozon\OzonDeliveryAdapter;
use App\Services\Sales\OrderLifecycle;
use App\Services\TenantContext;
use App\Services\WorkspaceAuthorizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use RuntimeException;

class OzonIntegrationController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly WorkspaceAuthorizationService $authorizationService,
        private readonly OrderLifecycle $orderLifecycle,
        private readonly OzonApiClient $client,
        private readonly OzonDeliveryAdapter $adapter,
        private readonly \App\Services\Delivery\Ozon\OzonTrackingSyncService $syncService,
    ) {}

    /**
     * Preview an order for Ozon dispatch with validation checks.
     */
    public function preview(Request $request, string $order): JsonResponse
    {
        $this->authorizeSalesAccess($request->user());
        $record = $this->findOrder($order);
        $record->load(['customer', 'shipments']);

        $existingOzonShipment = $record->shipments->first(function (SalesShipment $s): bool {
            return strtolower((string) $s->delivery_company_id) === 'ozon' && ! empty($s->tracking_number);
        });

        $customer = $record->customer;
        $customerName = $customer ? trim("{$customer->first_name} {$customer->last_name}") : '';
        $phone = $customer?->phone ? trim((string) $customer->phone) : '';
        $address = $customer?->address ? trim((string) $customer->address) : '';

        // Extract city from address or customer
        $city = $this->extractCity($address);

        $canSend = true;
        $reasons = [];

        if ($existingOzonShipment) {
            $canSend = false;
            $reasons[] = "Order already has an Ozon tracking number ({$existingOzonShipment->tracking_number}).";
        }

        if (empty($customerName)) {
            $canSend = false;
            $reasons[] = 'Customer name is missing.';
        }

        if (empty($phone)) {
            $canSend = false;
            $reasons[] = 'Customer phone number is required for delivery courier.';
        }

        if (empty($address)) {
            $canSend = false;
            $reasons[] = 'Customer delivery address is required.';
        }

        if (in_array($record->status, ['Delivered', 'Cancelled', 'Returned'], true)) {
            $canSend = false;
            $reasons[] = "Order status is {$record->status} and cannot be sent to courier.";
        }

        $credentials = $this->resolveCredentials();
        $isDryRun = $this->client->isDryRun($credentials);

        $itemsSummary = '';
        if (is_array($record->items)) {
            $itemsSummary = implode(', ', array_map(
                fn ($i) => ($i['name'] ?? 'Item') . ' (x' . ($i['quantity'] ?? 1) . ')',
                $record->items
            ));
        }

        return response()->json([
            'can_send' => $canSend,
            'reasons' => $reasons,
            'is_dry_run' => $isDryRun,
            'preview' => [
                'order_id' => $record->id,
                'order_number' => $record->order_number,
                'recipient_name' => $customerName,
                'phone' => $phone,
                'address' => $address,
                'city' => $city,
                'cod_amount' => (float) $record->total,
                'currency' => $record->currency,
                'items_summary' => $itemsSummary ?: 'Print & Marketing Materials',
            ],
        ]);
    }

    /**
     * Send order to Ozon Express (controlled dispatch workflow with idempotency protection).
     */
    public function sendToOzon(Request $request, string $order): JsonResponse
    {
        $this->authorizeSalesAccess($request->user(), true);
        $workspaceId = $this->tenantContext->getWorkspaceId();

        $record = DB::transaction(function () use ($order, $workspaceId, $request): SalesOrder {
            $lockedOrder = SalesOrder::query()
                ->where('workspace_id', $workspaceId)
                ->lockForUpdate()
                ->with(['customer', 'shipments'])
                ->findOrFail($order);

            $existingOzonShipment = $lockedOrder->shipments->first(function (SalesShipment $s): bool {
                return strtolower((string) $s->delivery_company_id) === 'ozon' && ! empty($s->tracking_number);
            });

            if ($existingOzonShipment) {
                abort(409, "Order already has an Ozon tracking number ({$existingOzonShipment->tracking_number}). Duplicate creation blocked.");
            }

            $customer = $lockedOrder->customer;
            $customerName = $customer ? trim("{$customer->first_name} {$customer->last_name}") : '';
            $phone = $customer?->phone ? trim((string) $customer->phone) : '';
            $address = $customer?->address ? trim((string) $customer->address) : '';

            if (empty($phone) || empty($address)) {
                abort(422, 'Customer phone and delivery address are required to send to Ozon Express.');
            }

            $city = $this->extractCity($address);
            $credentials = $this->resolveCredentials();

            $itemsSummary = '';
            if (is_array($lockedOrder->items)) {
                $itemsSummary = implode(', ', array_map(
                    fn ($i) => ($i['name'] ?? 'Item') . ' (x' . ($i['quantity'] ?? 1) . ')',
                    $lockedOrder->items
                ));
            }

            // Create Ozon parcel
            $result = $this->client->addParcel($credentials, [
                'order_reference' => $lockedOrder->order_number,
                'recipient_name' => $customerName,
                'phone' => $phone,
                'address' => $address,
                'city' => $city,
                'cod_amount' => (float) $lockedOrder->total,
                'goods_description' => $itemsSummary ?: 'Print & Marketing Materials',
                'idempotency_key' => $lockedOrder->id,
            ]);

            $trackingNumber = $result['tracking_number'];

            // Find or initialize SalesShipment
            $shipment = $lockedOrder->shipments->first() ?? new SalesShipment();
            $shipment->workspace_id = $workspaceId;
            $shipment->order_id = $lockedOrder->id;
            $shipment->delivery_company_id = 'ozon';
            $shipment->tracking_number = $trackingNumber;
            $shipment->status = 'Ready';
            $shipment->cod_amount = (float) $lockedOrder->total;
            // CRITICAL: Safe status mapping — payment collection status is Pending until courier remittance
            $shipment->payment_collection_status = 'Pending';
            $shipment->save();

            // Transition order lifecycle status
            if (in_array($lockedOrder->status, ['Pending', 'Confirmed'], true)) {
                $this->orderLifecycle->transition($lockedOrder, 'Shipping', 'ozon_dispatch', $request->user()->id, [
                    'tracking_number' => $trackingNumber,
                    'courier' => 'ozon',
                    'dry_run' => $result['dry_run'] ? 'true' : 'false',
                ]);
            }

            // Sync with Delivery module shipment record for central provider tracking
            $connection = DeliveryProviderConnection::query()
                ->where('workspace_id', $workspaceId)
                ->where('provider_key', 'ozon')
                ->first();

            DeliveryShipment::create([
                'workspace_id' => $workspaceId,
                'provider_connection_id' => $connection?->id,
                'sales_order_id' => $lockedOrder->id,
                'order_reference' => $lockedOrder->order_number,
                'provider_key' => 'ozon',
                'tracking_number' => $trackingNumber,
                'status' => 'label_created',
                'raw_status' => $result['raw_status'],
                'delivery_fee' => (float) ($shipment->shipping_cost ?? 0),
                'cod_amount' => (float) $lockedOrder->total,
                'cod_collected' => false,
                'status_updated_at' => now(),
            ]);

            // Workspace Audit Log
            WorkspaceAuditLog::log(
                $workspaceId,
                'sales.order_sent_to_ozon',
                'sales_order',
                $lockedOrder->id,
                [
                    'order_number' => $lockedOrder->order_number,
                    'tracking_number' => $trackingNumber,
                    'dry_run' => $result['dry_run'],
                ],
                $request->user()->id
            );

            return $lockedOrder->fresh(['customer', 'shipments', 'statusHistory']);
        });

        return response()->json([
            'message' => 'Order successfully registered with Ozon Express.',
            'data' => $record,
        ], 201);
    }

    /**
     * Synchronize tracking for Ozon shipments (supports single or bulk sync).
     */
    public function syncTracking(Request $request): JsonResponse
    {
        $this->authorizeSalesAccess($request->user());
        $workspaceId = $this->tenantContext->getWorkspaceId();
        $orderId = $request->input('order_id');

        $result = $this->syncService->syncWorkspaceTracking(
            $workspaceId,
            $orderId,
            $request->user()
        );

        return response()->json($result);
    }

    /**
     * Check verification status for PDF generation (labels / delivery notes).
     */
    public function pdfStatus(Request $request): JsonResponse
    {
        $this->authorizeSalesAccess($request->user());
        $credentials = $this->resolveCredentials();
        $status = $this->client->verifyPdfAccess($credentials);

        return response()->json(['data' => $status]);
    }

    /**
     * Preview an uploaded Ozon Excel/CSV parcel export with safe matching.
     */
    public function importPreview(Request $request, \App\Services\Delivery\Ozon\OzonParcelImportService $importService): JsonResponse
    {
        $this->authorizeSalesAccess($request->user());
        $workspaceId = $this->tenantContext->getWorkspaceId();

        $content = '';
        if ($request->hasFile('file')) {
            $content = (string) file_get_contents($request->file('file')->getRealPath());
        } elseif ($request->has('csv_content')) {
            $content = (string) $request->input('csv_content');
        } else {
            abort(422, 'Please provide an Ozon export file or CSV content.');
        }

        $result = $importService->preview($workspaceId, $content);

        return response()->json($result);
    }

    /**
     * Execute verified Ozon parcel import into Delivery & Sales modules.
     */
    public function importExecute(Request $request, \App\Services\Delivery\Ozon\OzonParcelImportService $importService): JsonResponse
    {
        $this->authorizeSalesAccess($request->user(), true);
        $workspaceId = $this->tenantContext->getWorkspaceId();

        $rows = $request->input('rows');
        if (! is_array($rows) || empty($rows)) {
            abort(422, 'No parcel rows provided for import.');
        }

        $result = $importService->execute($workspaceId, $rows, $request->user());

        return response()->json($result);
    }

    /**
     * Get detailed synchronization metrics and Ozon dashboard summary.
     */
    public function syncStatus(Request $request): JsonResponse
    {
        $this->authorizeSalesAccess($request->user());
        $workspaceId = $this->tenantContext->getWorkspaceId();

        $status = $this->syncService->getSyncStatus($workspaceId);

        return response()->json(['data' => $status]);
    }

    /**
     * Get unmatched Ozon parcels in the Delivery Review Queue.
     */
    public function reviewQueue(Request $request): JsonResponse
    {
        $this->authorizeSalesAccess($request->user());
        $workspaceId = $this->tenantContext->getWorkspaceId();

        $queue = DeliveryShipment::query()
            ->where('workspace_id', $workspaceId)
            ->where('provider_key', 'ozon')
            ->whereNull('sales_order_id')
            ->with(['statusHistory'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $queue]);
    }

    /**
     * Link an unmatched Ozon review queue parcel to an existing open Sales Order.
     */
    public function linkReviewQueue(Request $request, string $id): JsonResponse
    {
        $this->authorizeSalesAccess($request->user(), true);
        $workspaceId = $this->tenantContext->getWorkspaceId();
        $targetOrderId = $request->validate([
            'order_id' => ['required', 'uuid'],
        ])['order_id'];

        $deliveryShipment = DeliveryShipment::query()
            ->where('workspace_id', $workspaceId)
            ->where('provider_key', 'ozon')
            ->whereNull('sales_order_id')
            ->findOrFail($id);

        $order = SalesOrder::query()
            ->where('workspace_id', $workspaceId)
            ->with(['shipments'])
            ->findOrFail($targetOrderId);

        DB::transaction(function () use ($deliveryShipment, $order, $workspaceId, $request): void {
            $shipment = $order->shipments->first() ?? new SalesShipment();
            $shipment->workspace_id = $workspaceId;
            $shipment->order_id = $order->id;
            $shipment->delivery_company_id = 'ozon';
            $shipment->tracking_number = $deliveryShipment->tracking_number;
            $shipment->status = match ($deliveryShipment->status) {
                'delivered' => 'Delivered',
                'returned' => 'Returned',
                'in_transit', 'out_for_delivery', 'picked_up' => 'In transit',
                default => 'Ready',
            };
            $shipment->cod_amount = (float) $deliveryShipment->cod_amount ?: (float) $order->total;
            $shipment->shipping_cost = (float) $deliveryShipment->delivery_fee;
            $shipment->payment_collection_status = 'Pending';
            $shipment->save();

            $this->orderLifecycle->syncOrderFromShipment($shipment);

            $deliveryShipment->update([
                'sales_order_id' => $order->id,
                'order_reference' => $order->order_number,
                'last_error' => null,
            ]);

            WorkspaceAuditLog::log(
                $workspaceId,
                'delivery.ozon_review_linked',
                'delivery_shipment',
                $deliveryShipment->id,
                [
                    'tracking_number' => $deliveryShipment->tracking_number,
                    'linked_to_order' => $order->order_number,
                ],
                $request->user()->id
            );
        });

        return response()->json([
            'message' => "Parcel {$deliveryShipment->tracking_number} successfully linked to order {$order->order_number}.",
            'data' => $order->fresh(['shipments', 'customer']),
        ]);
    }

    /**
     * Convert an unmatched Ozon review queue parcel into a real sales order.
     */
    public function createOrderFromReviewQueue(Request $request, string $id): JsonResponse
    {
        $this->authorizeSalesAccess($request->user(), true);
        $workspaceId = $this->tenantContext->getWorkspaceId();

        $deliveryShipment = DeliveryShipment::query()
            ->where('workspace_id', $workspaceId)
            ->where('provider_key', 'ozon')
            ->whereNull('sales_order_id')
            ->findOrFail($id);

        $validated = $request->validate([
            'customer_name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:50'],
            'city' => ['nullable', 'string', 'max:80'],
            'address' => ['nullable', 'string', 'max:255'],
            'items' => ['nullable', 'array'],
            'total' => ['nullable', 'numeric', 'min:0'],
        ]);

        $order = DB::transaction(function () use ($deliveryShipment, $validated, $workspaceId, $request): SalesOrder {
            // Find or create customer
            $nameParts = explode(' ', trim($validated['customer_name']), 2);
            $firstName = $nameParts[0];
            $lastName = $nameParts[1] ?? '';

            $customer = \App\Models\Sales\SalesCustomer::create([
                'workspace_id' => $workspaceId,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'phone' => $validated['phone'],
                'address' => trim(($validated['address'] ?? '') . ' ' . ($validated['city'] ?? '')),
            ]);

            $orderNumber = 'ORD-OZN-' . strtoupper(bin2hex(random_bytes(3)));
            $codTotal = isset($validated['total']) ? (float) $validated['total'] : (float) $deliveryShipment->cod_amount;

            $items = ! empty($validated['items']) ? $validated['items'] : [
                ['name' => 'Imported Ozon Parcel Items', 'quantity' => 1, 'unit_price' => $codTotal],
            ];

            $order = SalesOrder::create([
                'workspace_id' => $workspaceId,
                'customer_id' => $customer->id,
                'order_number' => $orderNumber,
                'status' => match ($deliveryShipment->status) {
                    'delivered' => 'Delivered',
                    'returned' => 'Returned',
                    default => 'Shipping',
                },
                'payment_status' => 'Pending',
                'subtotal' => $codTotal,
                'total' => $codTotal,
                'currency' => 'MAD',
                'items' => $items,
                'notes' => "Auto-created from Ozon parcel discovery. Tracking: {$deliveryShipment->tracking_number}",
            ]);

            $shipment = SalesShipment::create([
                'workspace_id' => $workspaceId,
                'order_id' => $order->id,
                'delivery_company_id' => 'ozon',
                'tracking_number' => $deliveryShipment->tracking_number,
                'status' => match ($deliveryShipment->status) {
                    'delivered' => 'Delivered',
                    'returned' => 'Returned',
                    'in_transit', 'out_for_delivery', 'picked_up' => 'In transit',
                    default => 'Ready',
                },
                'cod_amount' => $codTotal,
                'shipping_cost' => (float) $deliveryShipment->delivery_fee,
                'payment_collection_status' => 'Pending',
            ]);

            $deliveryShipment->update([
                'sales_order_id' => $order->id,
                'order_reference' => $order->order_number,
                'last_error' => null,
            ]);

            WorkspaceAuditLog::log(
                $workspaceId,
                'sales.order_created_from_ozon_queue',
                'sales_order',
                $order->id,
                [
                    'tracking_number' => $deliveryShipment->tracking_number,
                    'order_number' => $order->order_number,
                ],
                $request->user()->id
            );

            return $order->fresh(['shipments', 'customer']);
        });

        return response()->json([
            'message' => "New sales order {$order->order_number} successfully created from Ozon parcel {$deliveryShipment->tracking_number}.",
            'data' => $order,
        ], 201);
    }

    /**
     * Resolve carrier credentials for current tenant workspace.
     *
     * @return array<string, mixed>
     */
    private function resolveCredentials(): array
    {
        $workspaceId = $this->tenantContext->getWorkspaceId();
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

    private function findOrder(string $id): SalesOrder
    {
        return SalesOrder::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->findOrFail($id);
    }

    private function extractCity(string $address): string
    {
        // Common Moroccan cities in addresses
        $cities = [
            'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Fes', 'Tanger', 'Agadir', 'Meknès', 'Meknes',
            'Oujda', 'Kenitra', 'Kénitra', 'Tétouan', 'Tetouan', 'Safi', 'Mohammedia', 'Khouribga',
            'El Jadida', 'Béni Mellal', 'Beni Mellal', 'Nador', 'Taza', 'Settat', 'Erfoud',
            'Sidi Kacem', 'Aït Melloul', 'Ait Melloul', 'Oulad Zmam', 'Tamansourt',
        ];

        foreach ($cities as $city) {
            if (stripos($address, $city) !== false) {
                return $city;
            }
        }

        return 'Casablanca';
    }

    /**
     * Get verified Ozon Express connection status, data source, and read-only diagnostics.
     */
    public function connectionStatus(Request $request): JsonResponse
    {
        $this->authorizeSalesAccess($request->user());
        $credentials = $this->resolveCredentials();
        $trackingNumber = $request->query('tracking_number');

        $result = $this->client->testConnection($credentials, $trackingNumber);

        return response()->json([
            'data' => $result,
        ]);
    }

    private function authorizeSalesAccess(?User $user, bool $write = false): void
    {
        $workspace = $this->tenantContext->getWorkspace();
        $membership = $this->tenantContext->getMembership();
        abort_unless($user, 401, 'Authentication is required.');
        abort_unless($workspace && $workspace->status === 'Active', 403, 'A valid active workspace is required.');
        abort_unless(
            $membership && $membership->workspace_id === $workspace->id && $membership->user_id === $user->id,
            403,
            'Verified workspace membership is required.'
        );

        $verifiedMembership = $this->authorizationService->getMembership($user, $workspace);
        abort_unless($verifiedMembership, 403, 'Verified workspace membership is required.');
        if ($write) {
            abort_unless(
                in_array($verifiedMembership->role, [WorkspaceUser::ROLE_OWNER, WorkspaceUser::ROLE_ADMIN, WorkspaceUser::ROLE_MEMBER], true),
                403,
                'Viewers cannot modify sales records or dispatch courier shipments.'
            );
            if (in_array($verifiedMembership->role, [WorkspaceUser::ROLE_OWNER, WorkspaceUser::ROLE_ADMIN], true)) {
                Gate::authorize('update', $workspace);
            }
        } else {
            abort_unless(in_array($verifiedMembership->role, [
                WorkspaceUser::ROLE_OWNER,
                WorkspaceUser::ROLE_ADMIN,
                WorkspaceUser::ROLE_MEMBER,
                WorkspaceUser::ROLE_VIEWER,
            ], true), 403, 'Your workspace role cannot access sales records.');
            Gate::authorize('view', $workspace);
        }
    }
}
