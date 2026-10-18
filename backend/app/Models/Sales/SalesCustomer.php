<?php

namespace App\Models\Sales;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalesCustomer extends Model
{
    use HasUuids;

    protected $table = 'sales_customers';

    protected $fillable = ['workspace_id', 'first_name', 'last_name', 'email', 'phone', 'address'];

    public function orders(): HasMany
    {
        return $this->hasMany(SalesOrder::class, 'customer_id');
    }
}
