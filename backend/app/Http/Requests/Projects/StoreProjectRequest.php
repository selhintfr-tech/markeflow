<?php

namespace App\Http\Requests\Projects;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'status' => ['sometimes', 'required', 'string', Rule::in(Project::STATUSES)],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'progress' => ['sometimes', 'required', 'integer', 'between:0,100'],
            'workspace_id' => ['prohibited'],
            'owner_id' => ['prohibited'],
            'role' => ['prohibited'],
        ];
    }
}
