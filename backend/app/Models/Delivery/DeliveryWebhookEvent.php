<?php

namespace App\Models\Delivery;

use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class DeliveryWebhookEvent extends Model
{
    use BelongsToWorkspace, HasUuids;

    protected $table = 'delivery_webhook_events';

    protected $fillable = ['provider_connection_id', 'provider_event_id', 'processed_at'];

    protected function casts(): array
    {
        return ['processed_at' => 'datetime'];
    }
}
