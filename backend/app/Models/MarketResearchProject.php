<?php

namespace App\Models;

use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketResearchProject extends Model
{
    use BelongsToWorkspace, HasUuids;

    public const STATUSES = ['Planned', 'In Progress', 'Completed', 'Archived'];

    protected $fillable = [
        'name',
        'category',
        'status',
        'description',
        'starts_on',
        'ends_on',
        'competitor_profiles',
        'opportunities',
        'threats',
        'findings',
        'swot',
        'sources',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'starts_on' => 'date',
            'ends_on' => 'date',
            'competitor_profiles' => 'array',
            'opportunities' => 'array',
            'threats' => 'array',
            'findings' => 'array',
            'swot' => 'array',
            'sources' => 'array',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
