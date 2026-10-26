<?php

namespace App\Services;

use App\Models\Crm\CrmLead;
use App\Models\Task;
use App\Models\WorkspaceNotification;
use App\Models\WorkspaceUser;
use Illuminate\Support\Facades\DB;

class WorkspaceNotificationService
{
    public function leadCreated(CrmLead $lead): void
    {
        $this->notifyWorkspaceMembers(
            (string) $lead->workspace_id,
            'lead.created:'.$lead->id,
            'lead',
            'New lead added',
            'A new lead, '.$lead->name.', was added to the CRM.',
            '/crm',
        );
    }

    public function taskCompleted(Task $task): void
    {
        $this->notifyWorkspaceMembers(
            (string) $task->workspace_id,
            'task.completed:'.$task->id.':'.$task->updated_at->format('U'),
            'task',
            'Task completed',
            'The task, '.$task->title.', was marked as completed.',
            '/tasks',
        );
    }

    private function notifyWorkspaceMembers(
        string $workspaceId,
        string $eventKey,
        string $type,
        string $title,
        string $description,
        string $actionUrl,
    ): void {
        $now = now();
        $members = WorkspaceUser::query()
            ->where('workspace_id', $workspaceId)
            ->pluck('user_id');

        $rows = $members->map(fn (int|string $userId): array => [
            'user_id' => $userId,
            'workspace_id' => $workspaceId,
            'event_key' => $eventKey,
            'type' => $type,
            'title' => $title,
            'description' => $description,
            'action_url' => $actionUrl,
            'read_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all();

        if ($rows !== []) {
            DB::table('workspace_notifications')->insertOrIgnore($rows);
        }
    }
}
