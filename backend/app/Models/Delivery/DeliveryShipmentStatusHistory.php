<?php

namespace App\Models\Delivery;

use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryShipmentStatusHistory extends Model
{
    use BelongsToWorkspace, HasUuids;

    protected $table = 'delivery_shipment_status_history';

    protected $fillable = ['shipment_id', 'status', 'raw_status', 'occurred_at', 'source'];

    protected function casts(): array
    {
        return ['occurred_at' => 'datetime'];
    }

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(DeliveryShipment::class, 'shipment_id');
    }
}
