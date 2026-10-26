<?php

namespace App\Models\Sales;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class SalesOrderFinancialRecord extends Model
{
    use HasUuids;

    protected $table = 'sales_order_financial_records';

    protected $fillable = [
        'workspace_id',
        'order_id',
        'campaign_id',
        'product_cost_total',
        'customer_shipping_charge',
        'sales_collected',
        'shipping_collected',
        'courier_cost',
        'other_expenses',
        'refund_return_cost',
        'profit_share_percent',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'product_cost_total' => 'decimal:2',
            'customer_shipping_charge' => 'decimal:2',
            'sales_collected' => 'decimal:2',
            'shipping_collected' => 'decimal:2',
            'courier_cost' => 'decimal:2',
            'other_expenses' => 'decimal:2',
            'refund_return_cost' => 'decimal:2',
            'profit_share_percent' => 'decimal:2',
        ];
    }
}
