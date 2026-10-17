<?php

namespace App\Models\Crm;

use App\Models\Campaign;
use App\Models\Project;
use App\Models\User;
use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmLead extends Model
{
    use BelongsToWorkspace, HasUuids;

    protected $table = 'crm_leads';

    public const STATUS_NEW = 'New';

    public const STATUS_CONTACTED = 'Contacted';

    public const STATUS_QUALIFIED = 'Qualified';

    public const STATUS_CONVERTED = 'Converted';

    public const STATUS_LOST = 'Lost';

    public const STATUSES = [
        self::STATUS_NEW,
        self::STATUS_CONTACTED,
        self::STATUS_QUALIFIED,
        self::STATUS_CONVERTED,
        self::STATUS_LOST,
    ];

    public const SOURCES = [
        'Meta Ads',
        'Google Ads',
        'TikTok Ads',
        'LinkedIn Ads',
        'Website',
        'Referral',
        'Email',
        'Organic Search',
        'Direct',
        'Event',
        'Other',
    ];

    protected $fillable = [
        'contact_id',
        'pipeline_id',
        'stage_id',
        'name',
        'company',
        'email',
        'phone',
        'status',
        'source',
        'source_campaign_id',
        'source_campaign_name',
        'related_project_id',
        'related_project_name',
        'estimated_value',
        'currency',
        'owner_id',
        'preferred_contact',
        'location',
        'next_follow_up_at',
        'converted_at',
        'converted_to_customer_id',
        'internal_notes',
    ];

    protected $casts = [
        'estimated_value' => 'decimal:2',
        'next_follow_up_at' => 'datetime',
        'converted_at' => 'datetime',
    ];

    public function contact(): BelongsTo
    {
        return $this->belongsTo(CrmContact::class, 'contact_id');
    }

    public function pipeline(): BelongsTo
    {
        return $this->belongsTo(CrmPipeline::class, 'pipeline_id');
    }

    public function stage(): BelongsTo
    {
        return $this->belongsTo(CrmPipelineStage::class, 'stage_id');
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class, 'source_campaign_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'related_project_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(CrmCustomer::class, 'converted_to_customer_id');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(CrmActivity::class, 'lead_id')->orderByDesc('activity_date');
    }

    public function notes(): HasMany
    {
        return $this->hasMany(CrmNote::class, 'lead_id')->orderByDesc('created_at');
    }
}