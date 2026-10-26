<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\Sales\SalesCustomer;
use App\Models\Sales\SalesOrder;
use App\Models\Sales\SalesOrderStatusHistory;
use App\Models\Sales\SalesShipment;
use App\Models\User;
use App\Models\WorkspaceUser;
use App\Services\Sales\OrderLifecycle;
use App\Services\TenantContext;
use App\Services\WorkspaceAuthorizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class SalesController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly WorkspaceAuthorizationService $authorizationService,
        private readonly OrderLifecycle $orderLifecycle,
    ) {}

    public function customers(Request $request): JsonResponse
    {
        $this->authorizeSalesAccess($request->user());
        $search = $request->validate(['search' => ['sometimes', 'string', 'max:255']])['search'] ?? null;
        $customers = SalesCustomer::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->withCount('orders')
            ->when($search, fn ($query) => $query->where(function ($query) use ($search): void {
                $query->where('first_name', 'like', '%'.$search.'%')
                    ->orWhere('last_name', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%')
                    ->orWhere('phone', 'like', '%'.$search.'%');
            }))
            ->orderBy('first_name')
            ->get();

        return response()->json(['data' => $customers]);
    }

    public function storeCustomer(Request $request): JsonResponse
    {
        $this->authorizeSalesAccess($request->user(), true);
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:64'],
            'address' => ['nullable', 'string', 'max:2000'],
        ]);
        $customer = new SalesCustomer($data);
        $customer->workspace_id = $this->tenantContext->getWorkspaceId();
        $customer->save();

        return response()->json(['data' => $customer->loadCount('orders')], 201);
    }

    public function updateCustomer(Request $request, string $customer): JsonResponse
    {
        $this->authorizeSalesAccess($request->user(), true);
        $record = SalesCustomer::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->findOrFail($customer);

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:64'],
            'address' => ['nullable', 'string', 'max:2000'],
        ]);

        $record->fill($data);
        $record->save();

        return response()->json(['data' => $record->loadCount('orders')]);
    }

    public function destroyCustomer(Request $request, string $customer): JsonResponse
    {
        $this->authorizeSalesAccess($request->user(), true);
        $record = SalesCustomer::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->withCount('orders')
            ->findOrFail($customer);

        if ($record->orders_count > 0) {
            return response()->json([
                'message' => "This customer cannot be deleted because they have {$record->orders_count} linked order(s). Customer records with sales history must be preserved for audit integrity.",
                'code' => 'CUSTOMER_HAS_ORDERS',
                'orders_count' => $record->orders_count,
            ], 422);
        }

        $hasFinancialRecords = DB::table('sales_order_financial_records')
            ->whereIn('order_id', function ($query) use ($record): void {
                $query->select('id')->from('sales_orders')->where('customer_id', $record->id);
            })->exists();

        if ($hasFinancialRecords) {
            return response()->json([
                'message' => 'This customer cannot be deleted because linked financial records exist.',
                'code' => 'CUSTOMER_HAS_FINANCIAL_RECORDS',
            ], 422);
        }

        $deleted = [
            'id' => $record->id,
            'first_name' => $record->first_name,
            'last_name' => $record->last_name,
        ];

        DB::transaction(function () use ($record): void {
            $record->delete();
        });

        return response()->json([
            'message' => 'Customer deleted successfully.',
            'data' => $deleted,
        ]);
    }

    public function orders(Request $request): JsonResponse
    {
        $this->authorizeSalesAccess($request->user());
        $filters = $request->validate([
            'status' => ['sometimes', Rule::in(SalesOrder::STATUSES)],
            'search' => ['sometimes', 'string', 'max:255'],
        ]);
        $orders = SalesOrder::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->with(['customer', 'shipments', 'statusHistory'])
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('order_number', 'like', '%'.$search.'%')
                        ->orWhereHas('customer', function ($customerQuery) use ($search): void {
                            $customerQuery->where('first_name', 'like', '%'.$search.'%')
                                ->orWhere('last_name', 'like', '%'.$search.'%')
                                ->orWhere('email', 'like', '%'.$search.'%');
                        });
                });
            })
            ->latest()
            ->get();

        return response()->json(['data' => $orders]);
    }

    public function storeOrder(Request $request): JsonResponse
    {
        $this->authorizeSalesAccess($request->user(), true);
        $workspaceId = $this->tenantContext->getWorkspaceId();
        $data = $request->validate([
            'customer_id' => ['required', 'uuid', Rule::exists('sales_customers', 'id')->where('workspace_id', $workspaceId)],
            'order_number' => ['nullable', 'string', 'max:64'],
            'payment_status' => ['sometimes', Rule::in(SalesOrder::PAYMENT_STATUSES)],
            'subtotal' => ['required', 'numeric', 'min:0', 'max:9999999999.99'],
            'total' => ['required', 'numeric', 'min:0', 'max:9999999999.99'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'items' => ['sometimes', 'array', 'max:100'],
            'items.*.name' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0', 'max:9999999999.99'],
            'source' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'shipment' => ['sometimes', 'array'],
            'shipment.delivery_company_id' => ['nullable', 'string', 'max:255'],
            'shipment.tracking_number' => ['nullable', 'string', 'max:255'],
            'shipment.shipping_cost' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'shipment.customer_shipping_charge' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'shipment.cod_amount' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'shipment.payment_collection_status' => ['sometimes', Rule::in(SalesShipment::COLLECTION_STATUSES)],
        ]);
        if (array_key_exists('customer_shipping_charge', $data['shipment'] ?? [])) {
            $data['total'] = round(
                (float) $data['subtotal'] + (float) ($data['shipment']['customer_shipping_charge'] ?? 0),
                2,
            );
        }

        $order = DB::transaction(function () use ($data, $workspaceId, $request): SalesOrder {
            $order = new SalesOrder([
                'customer_id' => $data['customer_id'],
                'order_number' => $data['order_number'] ?? 'ORD-'.strtoupper(bin2hex(random_bytes(4))),
                'status' => 'Pending',
                'payment_status' => $data['payment_status'] ?? 'Pending',
                'subtotal' => $data['subtotal'],
                'total' => $data['total'],
                'currency' => $data['currency'] ?? 'USD',
                'items' => $data['items'] ?? [],
                'source' => $data['source'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);
            $order->workspace_id = $workspaceId;
            $order->save();

            SalesOrderStatusHistory::create([
                'workspace_id' => $workspaceId,
                'order_id' => $order->id,
                'from_status' => null,
                'to_status' => $order->status,
                'source' => 'created',
                'changed_by' => $request->user()->id,
            ]);

            if (isset($data['shipment'])) {
                $shipment = new SalesShipment($data['shipment']);
                $shipment->workspace_id = $workspaceId;
                $order->shipments()->save($shipment);
            }

            return $order;
        });

        return response()->json(['data' => $order->load(['customer', 'shipments', 'statusHistory'])], 201);
    }

    public function updateStatus(Request $request, string $order): JsonResponse
    {
        $this->authorizeSalesAccess($request->user(), true);
        $data = $request->validate([
            'status' => ['required', Rule::in(SalesOrder::STATUSES)],
            'sync_shipment' => ['sometimes', 'boolean'],
        ]);
        $record = $this->findOrder($order);

        $metadata = [];
        if (! empty($data['sync_shipment']) && $data['status'] === 'Delivered') {
            $record->load('shipments');
            $syncedShipmentIds = [];
            foreach ($record->shipments as $shipment) {
                if ($shipment->status !== 'Delivered') {
                    $shipment->status = 'Delivered';
                    $shipment->save();
                    $syncedShipmentIds[] = $shipment->id;
                }
            }
            if (! empty($syncedShipmentIds)) {
                $metadata['synced_shipment_ids'] = $syncedShipmentIds;
                $metadata['synced_shipment_status'] = 'Delivered';
            }
        }

        $updated = $this->orderLifecycle->transition($record, $data['status'], 'manual', $request->user()->id, $metadata);

        return response()->json(['data' => $updated->load(['customer', 'shipments', 'statusHistory'])]);
    }

    public function updatePaymentStatus(Request $request, string $order): JsonResponse
    {
        $this->authorizeSalesAccess($request->user(), true);
        $data = $request->validate(['payment_status' => ['required', Rule::in(SalesOrder::PAYMENT_STATUSES)]]);
        $record = $this->findOrder($order);
        $record->payment_status = $data['payment_status'];
        $record->save();

        return response()->json(['data' => $record->load(['customer', 'shipments', 'statusHistory'])]);
    }

    public function destroyOrder(Request $request, string $order): JsonResponse
    {
        $this->authorizeSalesAccess($request->user(), true);
        $record = $this->findOrder($order);

        $hasFinanceTransactions = DB::table('finance_transactions')
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->where('order_id', $record->id)
            ->exists();

        if ($hasFinanceTransactions) {
            return response()->json([
                'message' => 'This order cannot be deleted because it is linked to recorded financial ledger transactions. Please cancel the order instead to preserve accounting history.',
                'code' => 'ORDER_HAS_TRANSACTIONS',
            ], 422);
        }

        if (in_array($record->payment_status, ['Paid', 'Partially Paid'], true)) {
            return response()->json([
                'message' => 'This order cannot be deleted because payment has already been recorded. Please cancel or refund the order instead.',
                'code' => 'ORDER_PAYMENT_REALIZED',
            ], 422);
        }

        $record->load(['shipments', 'financialRecord']);

        if ($record->financialRecord && ($record->financialRecord->sales_collected !== null || $record->financialRecord->shipping_collected !== null)) {
            return response()->json([
                'message' => 'This order cannot be deleted because revenue collection has already been recorded. Please cancel the order instead.',
                'code' => 'ORDER_REVENUE_COLLECTED',
            ], 422);
        }

        $hasActiveShipment = $record->shipments->contains(function (SalesShipment $shipment): bool {
            return in_array($shipment->status, ['In transit', 'Delivered'], true)
                || $shipment->payment_collection_status === 'Collected';
        });

        if ($hasActiveShipment) {
            return response()->json([
                'message' => 'This order cannot be deleted because a shipment has already been dispatched or delivered. Please mark it returned or cancelled.',
                'code' => 'ORDER_SHIPMENT_DISPATCHED',
            ], 422);
        }

        $deletedOrder = [
            'id' => $record->id,
            'order_number' => $record->order_number,
        ];

        DB::transaction(function () use ($record): void {
            $record->delete();
        });

        return response()->json([
            'message' => 'Order deleted successfully.',
            'data' => $deletedOrder,
        ]);
    }

    public function updateShipment(Request $request, string $shipment): JsonResponse
    {
        $this->authorizeSalesAccess($request->user(), true);
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(SalesShipment::STATUSES)],
            'delivery_company_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'tracking_number' => ['sometimes', 'nullable', 'string', 'max:255'],
            'shipping_cost' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'customer_shipping_charge' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'cod_amount' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'payment_collection_status' => ['sometimes', Rule::in(SalesShipment::COLLECTION_STATUSES)],
        ]);
        $record = SalesShipment::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->with('order')
            ->findOrFail($shipment);
        $record->fill($data);
        $record->save();

        if (array_key_exists('status', $data)) {
            $this->orderLifecycle->syncOrderFromShipment($record);
        }

        return response()->json(['data' => $record->load('order.customer', 'order.shipments', 'order.statusHistory')]);
    }

    private function findOrder(string $id): SalesOrder
    {
        return SalesOrder::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->findOrFail($id);
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
                'Viewers cannot modify sales records.'
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
