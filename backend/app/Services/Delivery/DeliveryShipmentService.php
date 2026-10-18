<?php

namespace App\Services\Delivery;

use App\Models\Delivery\DeliveryShipment;
use App\Models\Delivery\DeliveryShipmentStatusHistory;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeliveryShipmentService
{
    public const STATUSES = [
        'pending',
        'label_created',
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'failed',
        'returned',
        'cancelled',
        'unknown',
    ];

    public function updateStatus(
        DeliveryShipment $shipment,
        string $status,
        ?string $rawStatus,
        string $source,
        ?string $occurredAt = null,
        ?bool $codCollected = null
    ): void {
        if (! in_array($status, self::STATUSES, true)) {
            throw ValidationException::withMessages(['status' => 'The provider returned an unsupported normalized status.']);
        }

        $timestamp = $occurredAt ? CarbonImmutable::parse($occurredAt) : CarbonImmutable::now();

        DB::transaction(function () use ($shipment, $status, $rawStatus, $source, $timestamp, $codCollected): void {
            $shipment->status = $status;
            $shipment->raw_status = $rawStatus;
            $shipment->status_updated_at = $timestamp;
            $shipment->last_error = null;
            if ($codCollected !== null) {
                $shipment->cod_collected = $codCollected;
            }
            $shipment->save();

            DeliveryShipmentStatusHistory::create([
                'shipment_id' => $shipment->id,
                'status' => $status,
                'raw_status' => $rawStatus,
                'occurred_at' => $timestamp,
                'source' => $source,
            ]);
        });
    }
}
