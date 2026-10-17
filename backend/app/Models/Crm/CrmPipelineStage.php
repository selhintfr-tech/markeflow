<?php

namespace App\Models\Crm;

use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmPipelineStage extends Model
{
    use BelongsToWorkspace, HasUuids;

    protected $table = 'crm_pipeline_stages';

    protected $fillable = [
        'pipeline_id',
        'name',
        'code',
        'color',
        'probability',
        'display_order',
        'is_won',
        'is_lost',
    ];

    protected $casts = [
        'probability' => 'integer',
        'display_order' => 'integer',
        'is_won' => 'boolean',
        'is_lost' => 'boolean',
    ];

    public function pipeline(): BelongsTo
    {
        return $this->belongsTo(CrmPipeline::class, 'pipeline_id');
    }

    public function leads(): HasMany
    {
        return $this->hasMany(CrmLead::class, 'stage_id');
    }
}