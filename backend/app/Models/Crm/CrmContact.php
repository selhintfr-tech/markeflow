<?php

namespace App\Models\Crm;

use App\Models\User;
use App\Models\Workspace;
use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmContact extends Model
{
    use BelongsToWorkspace, HasUuids;

    protected $table = 'crm_contacts';

    public const STATUS_ACTIVE = 'Active';

    public const STATUS_INACTIVE = 'Inactive';

    public const STATUS_ARCHIVED = 'Archived';

    public const STATUSES = [
        self::STATUS_ACTIVE,
        self::STATUS_INACTIVE,
        self::STATUS_ARCHIVED,
    ];

    public const LIFECYCLE_LEAD = 'lead';

    public const LIFECYCLE_CUSTOMER = 'customer';

    public const LIFECYCLE_PARTNER = 'partner';

    public const LIFECYCLE_OTHER = 'other';

    public const LIFECYCLES = [
        self::LIFECYCLE_LEAD,
        self::LIFECYCLE_CUSTOMER,
        self::LIFECYCLE_PARTNER,
        self::LIFECYCLE_OTHER,
    ];

    protected $fillable = [
        'first_name',
        'last_name',
        'company_name',
        'email',
        'phone',
        'job_title',
        'preferred_contact',
        'location',
        'lifecycle_stage',
        'status',
        'owner_id',
        'notes',
    ];

    protected function name(): Attribute
    {
        return Attribute::make(
            get: fn (): string => trim($this->first_name.' '.($this->last_name ?? ''))
        );
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function leads(): HasMany
    {
        return $this->hasMany(CrmLead::class, 'contact_id');
    }

    public function customers(): HasMany
    {
        return $this->hasMany(CrmCustomer::class, 'contact_id');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(CrmActivity::class, 'contact_id')->orderByDesc('activity_date');
    }

    public function notes(): HasMany
    {
        return $this->hasMany(CrmNote::class, 'contact_id')->orderByDesc('created_at');
    }
}