<?php

namespace App\Models\Delivery;

use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeliveryShipment extends Model
{
    use BelongsToWorkspace, HasUuids;

    protected $fillable = [
        'provider_connection_id',
        'sales_order_id',
        'order_reference',
        'provider_key',
        'tracking_number',
        'provider_payload',
        'status',
        'raw_status',
        'delivery_fee',
        'cod_amount',
        'cod_collected',
        'status_updated_at',
        'last_error',
    ];

    protected function casts(): array
    {
        return [
            'delivery_fee' => 'decimal:2',
            'cod_amount' => 'decimal:2',
            'cod_collected' => 'boolean',
            'status_updated_at' => 'datetime',
            'provider_payload' => 'encrypted:array',
        ];
    }

    public function connection(): BelongsTo
    {
        return $this->belongsTo(DeliveryProviderConnection::class, 'provider_connection_id');
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(DeliveryShipmentStatusHistory::class, 'shipment_id')
            ->orderBy('occurred_at');
    }
}
