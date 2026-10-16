<?php

namespace App\Http\Requests\Tasks;

use App\Models\Campaign;
use App\Models\Task;
use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaskRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $workspaceId = app(TenantContext::class)->getWorkspaceId();

        return [
            'project_id' => ['nullable', 'uuid', Rule::exists('projects', 'id')->where('workspace_id', $workspaceId)],
            'campaign_id' => [
                'nullable',
                'uuid',
                Rule::exists('campaigns', 'id')->where('workspace_id', $workspaceId),
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $projectId = $this->input('project_id');
                    if ($value === null || $projectId === null) {
                        return;
                    }

                    $belongsToProject = Campaign::query()
                        ->where('workspace_id', app(TenantContext::class)->getWorkspaceId())
                        ->whereKey($value)
                        ->where('project_id', $projectId)
                        ->exists();

                    if (! $belongsToProject) {
                        $fail('The selected campaign must belong to the selected project.');
                    }
                },
            ],
            'assignee_id' => [
                'nullable',
                'integer',
                Rule::exists('workspace_users', 'user_id')->where('workspace_id', $workspaceId),
            ],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'status' => ['sometimes', 'required', 'string', Rule::in(Task::STATUSES)],
            'priority' => ['sometimes', 'required', 'string', Rule::in(Task::PRIORITIES)],
            'due_date' => ['required', 'date'],
            'workspace_id' => ['prohibited'],
            'created_by' => ['prohibited'],
            'owner_id' => ['prohibited'],
            'role' => ['prohibited'],
        ];
    }
}
