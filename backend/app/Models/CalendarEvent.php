<?php

namespace App\Models;

use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Validation\ValidationException;

class CalendarEvent extends Model
{
    use BelongsToWorkspace, HasUuids;

    protected $fillable = ['project_id', 'task_id', 'title', 'description', 'starts_at', 'ends_at', 'timezone'];

    protected function casts(): array
    {
        return [
            'starts_at' => 'immutable_datetime',
            'ends_at' => 'immutable_datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (self $event): void {
            if ($event->project_id !== null) {
                $projectExists = Project::query()
                    ->where('workspace_id', $event->workspace_id)
                    ->whereKey($event->project_id)
                    ->exists();

                if (! $projectExists) {
                    throw ValidationException::withMessages([
                        'project_id' => 'The selected project must belong to the active workspace.',
                    ]);
                }
            }

            if ($event->task_id !== null) {
                $task = Task::query()
                    ->where('workspace_id', $event->workspace_id)
                    ->find($event->task_id);

                if (! $task) {
                    throw ValidationException::withMessages([
                        'task_id' => 'The selected task must belong to the active workspace.',
                    ]);
                }

                if ($event->project_id !== null && $task->project_id !== $event->project_id) {
                    throw ValidationException::withMessages([
                        'task_id' => 'The selected task must belong to the selected project.',
                    ]);
                }
            }
        });
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }
}
