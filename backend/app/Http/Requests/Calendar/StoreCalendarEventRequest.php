<?php

namespace App\Http\Requests\Calendar;

use App\Models\Task;
use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCalendarEventRequest extends FormRequest
{
    public function rules(): array
    {
        $workspaceId = app(TenantContext::class)->getWorkspaceId();

        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'starts_at' => ['required', 'date', $this->hasExplicitOffset('starts_at')],
            'ends_at' => ['required', 'date', 'after:starts_at', $this->hasExplicitOffset('ends_at')],
            'timezone' => ['required', 'timezone'],
            'project_id' => ['nullable', 'uuid', Rule::exists('projects', 'id')->where('workspace_id', $workspaceId)],
            'task_id' => [
                'nullable',
                'uuid',
                Rule::exists('tasks', 'id')->where('workspace_id', $workspaceId),
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $projectId = $this->input('project_id');
                    if ($value !== null && $projectId !== null
                        && ! Task::query()->where('workspace_id', app(TenantContext::class)->getWorkspaceId())
                            ->whereKey($value)->where('project_id', $projectId)->exists()) {
                        $fail('The selected task must belong to the selected project.');
                    }
                },
            ],
            'workspace_id' => ['prohibited'],
            'created_by' => ['prohibited'],
        ];
    }

    private function hasExplicitOffset(string $attribute): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail): void {
            if (! is_string($value) || ! preg_match('/(?:Z|[+-]\d{2}:\d{2})$/i', $value)) {
                $fail("The {$attribute} field must include a UTC offset.");
            }
        };
    }
}
