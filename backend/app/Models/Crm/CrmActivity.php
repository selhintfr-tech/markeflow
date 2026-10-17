<?php

namespace App\Models\Crm;

use App\Models\User;
use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmActivity extends Model
{
    use BelongsToWorkspace, HasUuids;

    protected $table = 'crm_activities';

    public const TYPE_CALL = 'call';

    public const TYPE_EMAIL = 'email';

    public const TYPE_MEETING = 'meeting';

    public const TYPE_NOTE = 'note';

    public const TYPE_CREATE = 'create';

    public const TYPE_CONVERSION = 'conversion';

    public const TYPE_STATUS_CHANGE = 'status_change';

    public const TYPES = [
        self::TYPE_CALL,
        self::TYPE_EMAIL,
        self::TYPE_MEETING,
        self::TYPE_NOTE,
        self::TYPE_CREATE,
        self::TYPE_CONVERSION,
        self::TYPE_STATUS_CHANGE,
    ];

    protected $fillable = [
        'lead_id',
        'contact_id',
        'customer_id',
        'user_id',
        'type',
        'title',
        'description',
        'activity_date',
        'metadata',
    ];

    protected $casts = [
        'activity_date' => 'datetime',
        'metadata' => 'array',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(CrmLead::class, 'lead_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(CrmContact::class, 'contact_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(CrmCustomer::class, 'customer_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}