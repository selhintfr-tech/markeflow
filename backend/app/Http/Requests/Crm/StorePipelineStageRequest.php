<?php

namespace App\Http\Requests\Crm;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePipelineStageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $workspaceId = app(TenantContext::class)->getWorkspaceId();

        return [
            'pipeline_id' => ['required', 'uuid', Rule::exists('crm_pipelines', 'id')->where('workspace_id', $workspaceId)],
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'color' => ['nullable', 'string', 'max:50'],
            'probability' => ['sometimes', 'integer', 'between:0,100'],
            'display_order' => ['sometimes', 'integer'],
            'is_won' => ['sometimes', 'boolean'],
            'is_lost' => ['sometimes', 'boolean'],
            'workspace_id' => ['prohibited'],
            'id' => ['prohibited'],
        ];
    }
}