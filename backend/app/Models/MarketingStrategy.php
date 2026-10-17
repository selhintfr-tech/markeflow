<?php

namespace App\Models;

use App\Services\TenantContext;
use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Validation\ValidationException;

class MarketingStrategy extends Model
{
    use BelongsToWorkspace, HasUuids;

    public const STATUSES = ['Draft', 'Planned', 'Active', 'Completed', 'On Hold', 'Archived'];

    protected $fillable = [
        'project_id',
        'campaign_id',
        'name',
        'description',
        'objectives',
        'success_metrics',
        'channels',
        'budget',
        'starts_on',
        'ends_on',
        'status',
        'progress',
        'action_plan',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'objectives' => 'array',
            'success_metrics' => 'array',
            'channels' => 'array',
            'budget' => 'decimal:2',
            'starts_on' => 'date',
            'ends_on' => 'date',
            'progress' => 'integer',
            'action_plan' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $strategy): void {
            $strategy->assertRelatedRecordsBelongToWorkspace();
        });

        static::updating(function (self $strategy): void {
            $strategy->assertRelatedRecordsBelongToWorkspace();
        });
    }

    private function assertRelatedRecordsBelongToWorkspace(): void
    {
        if ($this->project_id !== null && ! Project::query()
            ->where('workspace_id', $this->workspace_id)
            ->whereKey($this->project_id)
            ->exists()) {
            throw ValidationException::withMessages([
                'project_id' => 'The selected project must belong to the active workspace.',
            ]);
        }

        if ($this->campaign_id !== null) {
            $campaign = Campaign::query()
                ->where('workspace_id', $this->workspace_id)
                ->find($this->campaign_id);
            if (! $campaign || ($this->project_id !== null && $campaign->project_id !== $this->project_id)) {
                throw ValidationException::withMessages([
                    'campaign_id' => 'The selected campaign must belong to the active workspace and selected project.',
                ]);
            }
        }
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function audiences(): BelongsToMany
    {
        return $this->belongsToMany(Audience::class, 'marketing_strategy_audience')
            ->withPivot('workspace_id')
            ->wherePivot('workspace_id', app(TenantContext::class)->getWorkspaceId());
    }
}
