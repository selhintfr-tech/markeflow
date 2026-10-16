<?php

namespace App\Models;

use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Validation\ValidationException;

class Task extends Model
{
    use BelongsToWorkspace, HasUuids;

    public const STATUS_IN_PROGRESS = 'In Progress';

    public const STATUS_TO_DO = 'To Do';

    public const STATUS_COMPLETED = 'Completed';

    public const STATUS_OVERDUE = 'Overdue';

    public const STATUS_IN_REVIEW = 'In Review';

    public const STATUSES = [
        self::STATUS_IN_PROGRESS,
        self::STATUS_TO_DO,
        self::STATUS_COMPLETED,
        self::STATUS_OVERDUE,
        self::STATUS_IN_REVIEW,
    ];

    public const PRIORITY_HIGH = 'High';

    public const PRIORITY_MEDIUM = 'Medium';

    public const PRIORITY_LOW = 'Low';

    public const PRIORITIES = [
        self::PRIORITY_HIGH,
        self::PRIORITY_MEDIUM,
        self::PRIORITY_LOW,
    ];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'project_id',
        'campaign_id',
        'assignee_id',
        'title',
        'description',
        'status',
        'priority',
        'due_date',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'due_date' => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $task): void {
            $task->assertRelatedRecordsBelongToWorkspace();
        });

        static::updating(function (self $task): void {
            $task->assertRelatedRecordsBelongToWorkspace();
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
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
        return $this->belongsTo(User::class, 'assignee_id');
    }

    private function assertRelatedRecordsBelongToWorkspace(): void
    {
        $project = null;

        if ($this->project_id !== null) {
            $project = Project::query()
                ->where('workspace_id', $this->workspace_id)
                ->find($this->project_id);

            if (! $project) {
                throw ValidationException::withMessages([
                    'project_id' => 'The selected project must belong to the active workspace.',
                ]);
            }
        }

        if ($this->campaign_id !== null) {
            $campaign = Campaign::query()
                ->where('workspace_id', $this->workspace_id)
                ->find($this->campaign_id);

            if (! $campaign) {
                throw ValidationException::withMessages([
                    'campaign_id' => 'The selected campaign must belong to the active workspace.',
                ]);
            }

            if ($project && $campaign->project_id !== $project->id) {
                throw ValidationException::withMessages([
                    'campaign_id' => 'The selected campaign must belong to the selected project.',
                ]);
            }
        }

        if ($this->assignee_id !== null) {
            $isWorkspaceMember = WorkspaceUser::query()
                ->where('workspace_id', $this->workspace_id)
                ->where('user_id', $this->assignee_id)
                ->exists();

            if (! $isWorkspaceMember) {
                throw ValidationException::withMessages([
                    'assignee_id' => 'The assignee must be a member of the active workspace.',
                ]);
            }
        }
    }
}
