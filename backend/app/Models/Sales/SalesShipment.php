<?php

namespace App\Models\Sales;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesShipment extends Model
{
    use HasUuids;

    public const STATUSES = ['Pending', 'Ready', 'In transit', 'Delivered', 'Returned', 'Failed'];

    public const COLLECTION_STATUSES = ['Pending', 'Collected', 'Failed', 'Not applicable'];

    protected $table = 'sales_shipments';

    protected $fillable = ['workspace_id', 'order_id', 'status', 'delivery_company_id', 'tracking_number', 'shipping_cost', 'cod_amount', 'payment_collection_status'];

    protected $casts = [
        'shipping_cost' => 'decimal:2',
        'cod_amount' => 'decimal:2',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class, 'order_id');
    }
}
