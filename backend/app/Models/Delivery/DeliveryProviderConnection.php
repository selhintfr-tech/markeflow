<?php

namespace App\Models\Delivery;

use App\Models\Workspace;
use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeliveryProviderConnection extends Model
{
    use BelongsToWorkspace, HasUuids;

    protected $table = 'delivery_provider_connections';

    protected $fillable = ['provider_key', 'credentials', 'status', 'last_tested_at', 'last_error'];

    protected function casts(): array
    {
        return [
            'credentials' => 'encrypted:array',
            'last_tested_at' => 'datetime',
        ];
    }

    public function shipments(): HasMany
    {
        return $this->hasMany(DeliveryShipment::class, 'provider_connection_id');
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }
}
