<?php

namespace App\Models\Crm;

use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class CrmPipeline extends Model
{
    use BelongsToWorkspace, HasUuids;

    protected $table = 'crm_pipelines';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'is_default',
        'display_order',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'display_order' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $pipeline): void {
            if (empty($pipeline->slug) && ! empty($pipeline->name)) {
                $pipeline->slug = Str::slug($pipeline->name);
            }
        });
    }

    public function stages(): HasMany
    {
        return $this->hasMany(CrmPipelineStage::class, 'pipeline_id')->orderBy('display_order');
    }

    public function leads(): HasMany
    {
        return $this->hasMany(CrmLead::class, 'pipeline_id');
    }
}