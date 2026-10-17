<?php

namespace App\Models\Crm;

use App\Models\User;
use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmCustomer extends Model
{
    use BelongsToWorkspace, HasUuids;

    protected $table = 'crm_customers';

    public const STATUS_ACTIVE = 'Active';

    public const STATUS_CHURNED = 'Churned';

    public const STATUS_ON_HOLD = 'On Hold';

    public const STATUSES = [
        self::STATUS_ACTIVE,
        self::STATUS_CHURNED,
        self::STATUS_ON_HOLD,
    ];

    public const TIER_STANDARD = 'Standard';

    public const TIER_PREMIUM = 'Premium';

    public const TIER_ENTERPRISE = 'Enterprise';

    public const TIERS = [
        self::TIER_STANDARD,
        self::TIER_PREMIUM,
        self::TIER_ENTERPRISE,
    ];

    protected $fillable = [
        'contact_id',
        'lead_id',
        'company_name',
        'contact_name',
        'email',
        'phone',
        'status',
        'customer_tier',
        'total_revenue',
        'currency',
        'owner_id',
        'converted_at',
        'notes',
    ];

    protected $casts = [
        'total_revenue' => 'decimal:2',
        'converted_at' => 'datetime',
    ];

    public function contact(): BelongsTo
    {
        return $this->belongsTo(CrmContact::class, 'contact_id');
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(CrmLead::class, 'lead_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(CrmActivity::class, 'customer_id')->orderByDesc('activity_date');
    }

    public function notes(): HasMany
    {
        return $this->hasMany(CrmNote::class, 'customer_id')->orderByDesc('created_at');
    }
}