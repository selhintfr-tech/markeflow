<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArchiveEntry extends Model
{
    use HasUuids;

    protected $fillable = [
        'workspace_id',
        'record_type',
        'record_id',
        'name',
        'subtitle',
        'previous_status',
        'description',
        'archived_by',
        'archived_at',
        'restored_at',
    ];

    protected function casts(): array
    {
        return [
            'archived_at' => 'datetime',
            'restored_at' => 'datetime',
        ];
    }

    public function archivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'archived_by');
    }
}