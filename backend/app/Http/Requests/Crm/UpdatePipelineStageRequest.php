<?php

namespace App\Http\Requests\Crm;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePipelineStageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'color' => ['nullable', 'string', 'max:50'],
            'probability' => ['sometimes', 'integer', 'between:0,100'],
            'display_order' => ['sometimes', 'integer'],
            'is_won' => ['sometimes', 'boolean'],
            'is_lost' => ['sometimes', 'boolean'],
            'workspace_id' => ['prohibited'],
            'id' => ['prohibited'],
            'pipeline_id' => ['prohibited'],
        ];
    }
}