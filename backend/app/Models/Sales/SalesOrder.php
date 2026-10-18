<?php

namespace App\Models\Sales;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalesOrder extends Model
{
    use HasUuids;

    public const STATUSES = ['Pending', 'Confirmed', 'Shipping', 'Delivered', 'Returned', 'Rejected'];

    public const PAYMENT_STATUSES = ['Pending', 'Paid', 'Partially Paid', 'Failed', 'Refunded'];

    protected $table = 'sales_orders';

    protected $fillable = ['workspace_id', 'customer_id', 'order_number', 'status', 'payment_status', 'subtotal', 'total', 'currency', 'items', 'source', 'notes'];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'total' => 'decimal:2',
        'items' => 'array',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(SalesCustomer::class, 'customer_id');
    }

    public function shipments(): HasMany
    {
        return $this->hasMany(SalesShipment::class, 'order_id')->latest();
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(SalesOrderStatusHistory::class, 'order_id')->orderByDesc('created_at');
    }
}
