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
            'status' => ['sometimes', 'required', 'string', Rule::in(Task::STATUSES)],
            'priority' => ['sometimes', 'required', 'string', Rule::in(Task::PRIORITIES)],
            'due_date' => ['sometimes', 'required', 'date'],
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
        $taskId = $this->route('task');

        return is_string($taskId) ? Task::query()->find($taskId) : null;
    }
}
