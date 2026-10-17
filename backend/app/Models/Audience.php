<?php

namespace App\Models;

use App\Services\TenantContext;
use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Validation\ValidationException;

class Audience extends Model
{
    use BelongsToWorkspace, HasUuids;

    public const STATUSES = ['Draft', 'Active', 'Archived'];

    protected $fillable = [
        'name',
        'description',
        'demographics',
        'locations',
        'interests',
        'characteristics',
        'segmentation_criteria',
        'estimated_size',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'demographics' => 'array',
            'locations' => 'array',
            'interests' => 'array',
            'characteristics' => 'array',
            'segmentation_criteria' => 'array',
            'estimated_size' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (self $audience): void {
            foreach ($audience->campaigns()->pluck('campaigns.workspace_id')->unique() as $workspaceId) {
                if ($workspaceId !== $audience->workspace_id) {
                    throw ValidationException::withMessages([
                        'campaign_ids' => 'Campaign relationships must belong to the active workspace.',
                    ]);
                }
            }
        });
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function campaigns(): BelongsToMany
    {
        return $this->belongsToMany(Campaign::class, 'audience_campaign')
            ->withPivot('workspace_id')
            ->wherePivot('workspace_id', app(TenantContext::class)->getWorkspaceId());
    }
}
