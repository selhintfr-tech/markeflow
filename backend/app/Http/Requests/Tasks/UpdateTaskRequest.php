<?php

namespace App\Http\Requests\Tasks;

use App\Models\Campaign;
use App\Models\Task;
use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateTaskRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $workspaceId = app(TenantContext::class)->getWorkspaceId();

        return [
            'project_id' => ['sometimes', 'nullable', 'uuid', Rule::exists('projects', 'id')->where('workspace_id', $workspaceId)],
            'campaign_id' => [
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('campaigns', 'id')->where('workspace_id', $workspaceId),
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $task = $this->currentTask();
                    if ($value === null || ! $task) {
                        return;
                    }

                    $effectiveProjectId = $this->input('project_id', $task->project_id);
                    if ($effectiveProjectId === null) {
                        return;
                    }

                    $belongsToProject = Campaign::query()
                        ->where('workspace_id', app(TenantContext::class)->getWorkspaceId())
                        ->whereKey($value)
                        ->where('project_id', $effectiveProjectId)
                        ->exists();

                    if (! $belongsToProject) {
                        $fail('The selected campaign must belong to the selected project.');
                    }
                },
            ],
            'assignee_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('workspace_users', 'user_id')->where('workspace_id', $workspaceId),
            ],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'status' => [
                'sometimes',
                'required',
                'string',
                Rule::in(Task::STATUSES),
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $task = $this->currentTask();
                    $effectiveDueDate = $this->has('due_date')
                        ? $this->input('due_date')
                        : $task?->due_date?->toDateString();

                    if ($value === Task::STATUS_OVERDUE && empty($effectiveDueDate)) {
                        $fail('A task without a due date cannot be classified as Overdue.');
                    }
                },
            ],
            'priority' => ['sometimes', 'required', 'string', Rule::in(Task::PRIORITIES)],
            'due_date' => ['sometimes', 'nullable', 'date'],
            'workspace_id' => ['prohibited'],
            'created_by' => ['prohibited'],
            'owner_id' => ['prohibited'],
            'role' => ['prohibited'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $task = $this->currentTask();
                if (! $task) {
                    return;
                }

                $effectiveDueDate = $this->has('due_date')
                    ? $this->input('due_date')
                    : $task->due_date?->toDateString();

                $effectiveStatus = $this->has('status')
                    ? $this->input('status')
                    : $task->status;

                if (empty($effectiveDueDate) && $effectiveStatus === Task::STATUS_OVERDUE) {
                    $errorKey = $this->has('due_date') ? 'due_date' : 'status';
                    $validator->errors()->add($errorKey, 'A task without a due date cannot be classified as Overdue.');
                }

                $projectId = $this->input('project_id', $task->project_id);
                $campaignId = $this->input('campaign_id', $task->campaign_id);

                if ($projectId !== null && $campaignId !== null && ! $validator->errors()->has('campaign_id')) {
                    $matches = Campaign::query()
                        ->where('workspace_id', app(TenantContext::class)->getWorkspaceId())
                        ->whereKey($campaignId)
                        ->where('project_id', $projectId)
                        ->exists();

                    if (! $matches) {
                        $validator->errors()->add('campaign_id', 'The selected campaign must belong to the selected project.');
                    }
                }
            },
        ];
    }

    private function currentTask(): ?Task
    {
        $task = $this->route('task');

        if ($task instanceof Task) {
            return $task;
        }

        return is_string($task)
            ? Task::query()->where('workspace_id', app(TenantContext::class)->getWorkspaceId())->find($task)
            : null;
    }
}
