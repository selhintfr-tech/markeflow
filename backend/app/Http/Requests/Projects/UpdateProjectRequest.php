<?php

namespace App\Http\Requests\Projects;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateProjectRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'status' => ['sometimes', 'required', 'string', Rule::in(Project::STATUSES)],
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => ['sometimes', 'required', 'date'],
            'progress' => ['sometimes', 'required', 'integer', 'between:0,100'],
            'workspace_id' => ['prohibited'],
            'owner_id' => ['prohibited'],
            'role' => ['prohibited'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $projectId = $this->route('project');
                if (! is_string($projectId)) {
                    return;
                }

                $project = Project::query()->find($projectId);
                if (! $project) {
                    return;
                }

                $startDate = $this->input('start_date', $project->start_date->toDateString());
                $endDate = $this->input('end_date', $project->end_date->toDateString());

                if (
                    is_string($startDate)
                    && is_string($endDate)
                    && strtotime($startDate) !== false
                    && strtotime($endDate) !== false
                    && $endDate < $startDate
                ) {
                    $validator->errors()->add('end_date', 'The end date must be on or after the start date.');
                }
            },
        ];
    }
}
