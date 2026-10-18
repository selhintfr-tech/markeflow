<?php

namespace App\Services\Sales;

use App\Models\Sales\SalesOrder;
use App\Models\Sales\SalesOrderStatusHistory;
use App\Models\Sales\SalesShipment;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderLifecycle
{
    public function transition(
        SalesOrder $order,
        string $status,
        string $source = 'manual',
        ?int $actorId = null,
        array $metadata = [],
    ): SalesOrder {
        if (! in_array($status, SalesOrder::STATUSES, true)) {
            throw ValidationException::withMessages(['status' => 'The selected order status is invalid.']);
        }

        return DB::transaction(function () use ($order, $status, $source, $actorId, $metadata): SalesOrder {
            $lockedOrder = SalesOrder::query()
                ->where('workspace_id', $order->workspace_id)
                ->lockForUpdate()
                ->findOrFail($order->id);

            if ($lockedOrder->status === $status) {
                return $lockedOrder;
            }

            $fromStatus = $lockedOrder->status;
            $lockedOrder->status = $status;
            $lockedOrder->save();

            SalesOrderStatusHistory::create([
                'workspace_id' => $lockedOrder->workspace_id,
                'order_id' => $lockedOrder->id,
                'from_status' => $fromStatus,
                'to_status' => $status,
                'source' => $source,
                'changed_by' => $actorId,
                'metadata' => $metadata ?: null,
            ]);

            return $lockedOrder;
        });
    }

    public function syncOrderFromShipment(SalesShipment $shipment): ?SalesOrder
    {
        $status = match ($shipment->status) {
            'In transit' => 'Shipping',
            'Delivered' => 'Delivered',
            'Returned' => 'Returned',
            default => null,
        };

        if ($status === null) {
            return null;
        }

        $order = $shipment->order;

        return $this->transition($order, $status, 'shipment', null, [
            'shipment_id' => $shipment->id,
            'shipment_status' => $shipment->status,
        ]);
    }
}
