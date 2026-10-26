<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FinanceTransaction;
use App\Models\Sales\SalesOrder;
use App\Models\Sales\SalesOrderFinancialRecord;
use App\Services\TenantContext;
use App\Services\WorkspaceModuleAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FinanceOrderAccountingController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly WorkspaceModuleAccessService $access,
    ) {}

    public function index(Request $request)
    {
        $this->access->authorize($request->user());
        $workspaceId = $this->tenantContext->getWorkspaceId();
        $filters = $request->validate([
            'campaign_id' => [
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('campaigns', 'id')->where('workspace_id', $workspaceId),
            ],
            'status' => [
                'sometimes',
                'nullable',
                Rule::in(SalesOrder::STATUSES),
            ],
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from'],
        ]);
        $orders = SalesOrder::query()
            ->where('workspace_id', $workspaceId)
            ->with(['shipments', 'financialRecord', 'financeTransactions', 'customer'])
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($nested) use ($search): void {
                    $nested->where('order_number', 'like', '%'.$search.'%')
                        ->orWhereHas('customer', function ($customerQuery) use ($search): void {
                            $customerQuery->where('first_name', 'like', '%'.$search.'%')
                                ->orWhere('last_name', 'like', '%'.$search.'%')
                                ->orWhere('email', 'like', '%'.$search.'%');
                        });
                });
            })
            ->when($filters['from'] ?? null, fn ($query, string $date) => $query->whereDate('created_at', '>=', $date))
            ->when($filters['to'] ?? null, fn ($query, string $date) => $query->whereDate('created_at', '<=', $date))
            ->when($filters['campaign_id'] ?? null, fn ($query, string $id) => $query->whereHas(
                'financialRecord',
                fn ($recordQuery) => $recordQuery->where('campaign_id', $id),
            ))
            ->orderByDesc('created_at')
            ->paginate($filters['per_page'] ?? 100);

        $orders->getCollection()->transform(fn (SalesOrder $order): array => $this->presentOrder($order));

        return response()->json([
            'data' => $orders->items(),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    public function update(Request $request, string $order)
    {
        $this->access->authorize($request->user(), true);
        $workspaceId = $this->tenantContext->getWorkspaceId();
        $orderRecord = SalesOrder::query()->where('workspace_id', $workspaceId)->findOrFail($order);
        $data = $request->validate([
            'campaign_id' => [
                'present',
                'nullable',
                'uuid',
                Rule::exists('campaigns', 'id')->where('workspace_id', $workspaceId),
            ],
            'product_cost_total' => ['present', 'nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:999999999999.99'],
            'customer_shipping_charge' => ['sometimes', 'nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:999999999999.99'],
            'sales_collected' => ['present', 'nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:999999999999.99'],
            'shipping_collected' => ['present', 'nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:999999999999.99'],
            'courier_cost' => ['sometimes', 'nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:999999999999.99'],
            'other_expenses' => ['present', 'nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:999999999999.99'],
            'refund_return_cost' => ['present', 'nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:999999999999.99'],
            'profit_share_percent' => ['present', 'nullable', 'numeric', 'decimal:0,2', 'between:0,100'],
            'post_to_ledger' => ['sometimes', 'boolean'],
            'workspace_id' => ['prohibited'],
            'order_id' => ['prohibited'],
            'updated_by' => ['prohibited'],
        ]);

        $postToLedger = $request->has('post_to_ledger') ? $request->boolean('post_to_ledger') : null;
        unset($data['post_to_ledger']);

        $record = SalesOrderFinancialRecord::query()->updateOrCreate(
            ['workspace_id' => $workspaceId, 'order_id' => $orderRecord->id],
            [...$data, 'updated_by' => $request->user()->id],
        );

        $orderRecord->load(['shipments', 'financialRecord', 'financeTransactions']);

        if ($postToLedger === true) {
            $this->syncLedgerTransactions($orderRecord, $record, (int) $request->user()->id);
            $orderRecord->load(['financeTransactions']);
        } elseif ($postToLedger === false) {
            $this->removeLedgerTransactions($orderRecord);
            $orderRecord->load(['financeTransactions']);
        }

        return response()->json(['data' => $this->presentOrder($orderRecord)]);
    }

    public function postToLedger(Request $request, string $order): JsonResponse
    {
        $this->access->authorize($request->user(), true);
        $workspaceId = $this->tenantContext->getWorkspaceId();
        $orderRecord = SalesOrder::query()
            ->where('workspace_id', $workspaceId)
            ->with(['shipments', 'financialRecord', 'financeTransactions'])
            ->findOrFail($order);

        $record = $orderRecord->financialRecord;
        $paymentCanBeCollected = in_array($orderRecord->payment_status, ['Paid', 'Partially Paid'], true)
            && ! in_array($orderRecord->status, ['Returned', 'Rejected', 'Cancelled'], true);

        if (! $record || ! $paymentCanBeCollected || $record->sales_collected === null || $record->shipping_collected === null) {
            return response()->json([
                'message' => 'Cannot post to ledger: Verified collection has not been recorded for this order. Expected COD is not verified revenue.',
                'code' => 'COLLECTION_NOT_VERIFIED',
            ], 422);
        }

        $this->syncLedgerTransactions($orderRecord, $record, (int) $request->user()->id);
        $orderRecord->load(['financeTransactions']);

        return response()->json([
            'message' => "Order {$orderRecord->order_number} transactions successfully posted to Finance Ledger.",
            'data' => $this->presentOrder($orderRecord),
        ]);
    }

    public function removeFromLedger(Request $request, string $order): JsonResponse
    {
        $this->access->authorize($request->user(), true);
        $workspaceId = $this->tenantContext->getWorkspaceId();
        $orderRecord = SalesOrder::query()
            ->where('workspace_id', $workspaceId)
            ->with(['shipments', 'financialRecord', 'financeTransactions'])
            ->findOrFail($order);

        $this->removeLedgerTransactions($orderRecord);
        $orderRecord->load(['financeTransactions']);

        return response()->json([
            'message' => "Order {$orderRecord->order_number} transactions removed from Finance Ledger.",
            'data' => $this->presentOrder($orderRecord),
        ]);
    }

    private function syncLedgerTransactions(SalesOrder $order, SalesOrderFinancialRecord $record, int $userId): void
    {
        $workspaceId = $order->workspace_id;
        $orderId = $order->id;
        $date = $order->created_at ? $order->created_at->toDateString() : now()->toDateString();
        $campaignId = $record->campaign_id;
        $shipment = $order->shipments->first();

        $paymentCanBeCollected = in_array($order->payment_status, ['Paid', 'Partially Paid'], true)
            && ! in_array($order->status, ['Returned', 'Rejected', 'Cancelled'], true);

        $salesCollected = $paymentCanBeCollected && $record->sales_collected !== null
            ? (float) $record->sales_collected
            : 0.0;
        $shippingCollected = $paymentCanBeCollected && $record->shipping_collected !== null
            ? (float) $record->shipping_collected
            : 0.0;
        $totalCollected = $salesCollected + $shippingCollected;

        $courierCost = (float) ($record->courier_cost ?? $shipment?->shipping_cost ?? 0.0);
        $productCost = (float) ($record->product_cost_total ?? 0.0);
        $otherExpenses = (float) ($record->other_expenses ?? 0.0);
        $refundCost = (float) ($record->refund_return_cost ?? 0.0);

        DB::transaction(function () use (
            $workspaceId,
            $orderId,
            $order,
            $date,
            $campaignId,
            $userId,
            $totalCollected,
            $courierCost,
            $productCost,
            $otherExpenses,
            $refundCost
        ): void {
            // Delete existing transactions for this order to guarantee single posting and idempotency
            FinanceTransaction::query()
                ->where('workspace_id', $workspaceId)
                ->where('order_id', $orderId)
                ->delete();

            if ($totalCollected > 0) {
                FinanceTransaction::create([
                    'workspace_id' => $workspaceId,
                    'order_id' => $orderId,
                    'campaign_id' => $campaignId,
                    'type' => FinanceTransaction::TYPE_INCOME,
                    'category' => 'Sales Revenue',
                    'description' => "Order {$order->order_number} - Verified COD collection",
                    'amount' => number_format($totalCollected, 2, '.', ''),
                    'occurred_on' => $date,
                    'created_by' => $userId,
                ]);
            }

            if ($courierCost > 0) {
                FinanceTransaction::create([
                    'workspace_id' => $workspaceId,
                    'order_id' => $orderId,
                    'campaign_id' => $campaignId,
                    'type' => FinanceTransaction::TYPE_EXPENSE,
                    'category' => 'Delivery & Shipping',
                    'description' => "Order {$order->order_number} - Courier delivery fee",
                    'amount' => number_format($courierCost, 2, '.', ''),
                    'occurred_on' => $date,
                    'created_by' => $userId,
                ]);
            }

            if ($productCost > 0) {
                FinanceTransaction::create([
                    'workspace_id' => $workspaceId,
                    'order_id' => $orderId,
                    'campaign_id' => $campaignId,
                    'type' => FinanceTransaction::TYPE_EXPENSE,
                    'category' => 'Cost of Goods Sold',
                    'description' => "Order {$order->order_number} - Production / product cost",
                    'amount' => number_format($productCost, 2, '.', ''),
                    'occurred_on' => $date,
                    'created_by' => $userId,
                ]);
            }

            if ($otherExpenses > 0) {
                FinanceTransaction::create([
                    'workspace_id' => $workspaceId,
                    'order_id' => $orderId,
                    'campaign_id' => $campaignId,
                    'type' => FinanceTransaction::TYPE_EXPENSE,
                    'category' => 'Other Expenses',
                    'description' => "Order {$order->order_number} - Other order expenses",
                    'amount' => number_format($otherExpenses, 2, '.', ''),
                    'occurred_on' => $date,
                    'created_by' => $userId,
                ]);
            }

            if ($refundCost > 0) {
                FinanceTransaction::create([
                    'workspace_id' => $workspaceId,
                    'order_id' => $orderId,
                    'campaign_id' => $campaignId,
                    'type' => FinanceTransaction::TYPE_EXPENSE,
                    'category' => 'Refunds & Returns',
                    'description' => "Order {$order->order_number} - Refund / return cost",
                    'amount' => number_format($refundCost, 2, '.', ''),
                    'occurred_on' => $date,
                    'created_by' => $userId,
                ]);
            }
        });
    }

    private function removeLedgerTransactions(SalesOrder $order): void
    {
        FinanceTransaction::query()
            ->where('workspace_id', $order->workspace_id)
            ->where('order_id', $order->id)
            ->delete();
    }

    private function presentOrder(SalesOrder $order): array
    {
        $record = $order->financialRecord;
        $shipment = $order->shipments->first();
        $ledgerTransactions = $order->relationLoaded('financeTransactions')
            ? $order->financeTransactions
            : $order->financeTransactions()->get();

        $paymentCanBeCollected = in_array($order->payment_status, ['Paid', 'Partially Paid'], true)
            && ! in_array($order->status, ['Returned', 'Rejected', 'Cancelled'], true);

        // Fallbacks: reuse shipment customer_shipping_charge and shipping_cost as default courier cost
        $customerShippingCharge = $record?->customer_shipping_charge
            ?? $shipment?->customer_shipping_charge;
        $courierCost = $record?->courier_cost
            ?? $shipment?->shipping_cost;

        $salesCollected = $paymentCanBeCollected ? $record?->sales_collected : null;
        $shippingCollected = $paymentCanBeCollected ? $record?->shipping_collected : null;

        $isComplete = (bool) $record
            && $paymentCanBeCollected
            && $salesCollected !== null
            && $shippingCollected !== null
            && $record->product_cost_total !== null
            && $courierCost !== null
            && $record->other_expenses !== null
            && $record->refund_return_cost !== null;

        $netProfit = $isComplete
            ? (float) $salesCollected
                + (float) $shippingCollected
                - (float) $record->product_cost_total
                - (float) $courierCost
                - (float) $record->other_expenses
                - (float) $record->refund_return_cost
            : null;
        $sharePercent = $record?->profit_share_percent;

        // Ozon flow calculations
        $expectedCod = $shipment?->cod_amount ?? $order->total;
        $expectedCourierCost = $shipment?->shipping_cost;
        $expectedNetRemittance = $expectedCod !== null && $expectedCourierCost !== null
            ? (float) $expectedCod - (float) $expectedCourierCost
            : null;

        $verifiedCollected = $salesCollected !== null && $shippingCollected !== null
            ? (float) $salesCollected + (float) $shippingCollected
            : null;
        $verifiedNetRemittance = $verifiedCollected !== null && $courierCost !== null
            ? (float) $verifiedCollected - (float) $courierCost
            : null;

        $isPostedToLedger = $ledgerTransactions->isNotEmpty();
        $postedRevenue = (float) $ledgerTransactions->where('type', FinanceTransaction::TYPE_INCOME)->sum('amount');
        $postedExpenses = (float) $ledgerTransactions->where('type', FinanceTransaction::TYPE_EXPENSE)->sum('amount');

        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'status' => $order->status,
            'payment_status' => $order->payment_status,
            'subtotal' => $order->subtotal,
            'total' => $order->total,
            'currency' => $order->currency,
            'items' => $order->items ?? [],
            'shipment' => $shipment ? [
                'status' => $shipment->status,
                'shipping_cost' => $shipment->shipping_cost,
                'customer_shipping_charge' => $shipment->customer_shipping_charge,
                'cod_amount' => $shipment->cod_amount,
                'payment_collection_status' => $shipment->payment_collection_status,
                'delivery_company_id' => $shipment->delivery_company_id,
                'tracking_number' => $shipment->tracking_number,
            ] : null,
            'ozon_flow' => [
                'carrier' => $shipment?->delivery_company_id ?: 'Courier',
                'tracking_number' => $shipment?->tracking_number,
                'product_subtotal' => (float) $order->subtotal,
                'customer_shipping_charge' => $customerShippingCharge !== null ? (float) $customerShippingCharge : null,
                'expected_cod' => $expectedCod !== null ? (float) $expectedCod : null,
                'courier_cost' => $courierCost !== null ? (float) $courierCost : null,
                'expected_net_remittance' => $expectedNetRemittance,
                'verified_collected' => $verifiedCollected,
                'verified_net_remittance' => $verifiedNetRemittance,
            ],
            'financials' => [
                'has_record' => (bool) $record,
                'campaign_id' => $record?->campaign_id,
                'product_cost_total' => $record?->product_cost_total,
                'customer_shipping_charge' => $customerShippingCharge,
                'sales_collected' => $salesCollected,
                'shipping_collected' => $shippingCollected,
                'courier_cost' => $courierCost,
                'other_expenses' => $record?->other_expenses,
                'refund_return_cost' => $record?->refund_return_cost,
                'profit_share_percent' => $sharePercent,
                'partner_profit_share' => $netProfit !== null && $sharePercent !== null
                    ? max($netProfit, 0) * (float) $sharePercent / 100
                    : null,
                'net_order_profit' => $netProfit,
                'is_complete' => $isComplete,
            ],
            'ledger' => [
                'is_posted' => $isPostedToLedger,
                'transaction_count' => $ledgerTransactions->count(),
                'posted_revenue' => $postedRevenue,
                'posted_expenses' => $postedExpenses,
                'transactions' => $ledgerTransactions->map(fn ($t) => [
                    'id' => $t->id,
                    'type' => $t->type,
                    'category' => $t->category,
                    'amount' => $t->amount,
                    'occurred_on' => $t->occurred_on?->toDateString(),
                    'description' => $t->description,
                ])->values(),
            ],
            'realized_collected' => $verifiedCollected,
            'created_at' => $order->created_at,
        ];
    }
}

