<?php

namespace App\Models;

use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Validation\ValidationException;

class ContentPost extends Model
{
    use BelongsToWorkspace, HasUuids;

    public const STATUS_DRAFT = 'Draft';

    public const STATUS_IN_REVIEW = 'In Review';

    public const STATUS_APPROVED = 'Approved';

    public const STATUS_SCHEDULED = 'Scheduled';

    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_IN_REVIEW,
        self::STATUS_APPROVED,
        self::STATUS_SCHEDULED,
    ];

    public const PLATFORMS = [
        'Instagram',
        'Facebook',
        'TikTok',
        'Email',
        'Meta Ads',
        'X',
        'LinkedIn',
        'YouTube',
        'Video',
        'Media',
        'Blog',
        'Website',
    ];

    protected $fillable = [
        'campaign_id',
        'assigned_to',
        'title',
        'platform',
        'content_type',
        'caption',
        'internal_notes',
        'scheduled_at',
        'timezone',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'immutable_datetime',
            'approved_at' => 'immutable_datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (self $post): void {
            if ($post->campaign_id !== null && ! Campaign::query()
                ->where('workspace_id', $post->workspace_id)
                ->whereKey($post->campaign_id)
                ->exists()) {
                throw ValidationException::withMessages([
                    'campaign_id' => 'The selected campaign must belong to the active workspace.',
                ]);
            }

            if ($post->assigned_to !== null && ! WorkspaceUser::query()
                ->where('workspace_id', $post->workspace_id)
                ->where('user_id', $post->assigned_to)
                ->exists()) {
                throw ValidationException::withMessages([
                    'assigned_to' => 'The assignee must be a member of the active workspace.',
                ]);
            }
        });
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ContentPostAttachment::class)->orderBy('created_at');
    }
}
