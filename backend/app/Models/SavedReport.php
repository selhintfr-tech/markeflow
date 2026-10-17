<?php

namespace App\Models;

use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavedReport extends Model
{
    use BelongsToWorkspace, HasUuids;

    public const TYPES = ['overview', 'campaigns', 'tasks', 'crm', 'finance', 'timeseries'];

    protected $fillable = ['name', 'type', 'from_date', 'to_date', 'filters', 'configuration'];

    protected function casts(): array
    {
        return [
            'from_date' => 'date',
            'to_date' => 'date',
            'filters' => 'array',
            'configuration' => 'array',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
