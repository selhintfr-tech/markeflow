<?php

namespace App\Models;

use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Validation\ValidationException;

class Campaign extends Model
{
    use BelongsToWorkspace, HasUuids;

    public const STATUS_ACTIVE = 'Active';

    public const STATUS_PLANNED = 'Planned';

    public const STATUS_COMPLETED = 'Completed';

    public const STATUS_ARCHIVED = 'Archived';

    public const STATUS_DRAFT = 'Draft';

    public const STATUSES = [
        self::STATUS_ACTIVE,
        self::STATUS_PLANNED,
        self::STATUS_COMPLETED,
        self::STATUS_ARCHIVED,
        self::STATUS_DRAFT,
    ];

    public const PLATFORM_META = 'Meta Ads';

    public const PLATFORM_GOOGLE = 'Google Ads';

    public const PLATFORM_EMAIL = 'Email';

    public const PLATFORM_TIKTOK = 'TikTok Ads';

    public const PLATFORM_LINKEDIN = 'LinkedIn Ads';

    public const PLATFORM_MULTI_CHANNEL = 'Multi-channel';

    public const PLATFORMS = [
        self::PLATFORM_META,
        self::PLATFORM_GOOGLE,
        self::PLATFORM_EMAIL,
        self::PLATFORM_TIKTOK,
        self::PLATFORM_LINKEDIN,
        self::PLATFORM_MULTI_CHANNEL,
    ];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'project_id',
        'name',
        'description',
        'status',
        'platform',
        'channel',
        'objective',
        'start_date',
        'end_date',
        'budget',
        'spend',
        'leads',
        'customers',
        'revenue',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'budget' => 'decimal:2',
            'spend' => 'decimal:2',
            'leads' => 'integer',
            'customers' => 'integer',
            'revenue' => 'decimal:2',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $campaign): void {
            $campaign->assertProjectBelongsToWorkspace();
        });

        static::updating(function (self $campaign): void {
            $campaign->assertProjectBelongsToWorkspace();
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    private function assertProjectBelongsToWorkspace(): void
    {
        $project = Project::query()
            ->where('workspace_id', $this->workspace_id)
            ->find($this->project_id);

        if (! $project) {
            throw ValidationException::withMessages([
                'project_id' => 'The selected project must belong to the active workspace.',
            ]);
        }
    }
}
