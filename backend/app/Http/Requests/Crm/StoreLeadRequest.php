<?php

namespace App\Http\Requests\Crm;

use App\Models\Crm\CrmLead;
use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $workspaceId = app(TenantContext::class)->getWorkspaceId();

        return [
            'name' => ['required', 'string', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'status' => ['sometimes', 'string', Rule::in(CrmLead::STATUSES)],
            'source' => ['nullable', 'string', 'max:100'],
            'source_campaign_id' => ['nullable', 'uuid', Rule::exists('campaigns', 'id')->where('workspace_id', $workspaceId)],
            'source_campaign_name' => ['nullable', 'string', 'max:255'],
            'related_project_id' => ['nullable', 'uuid', Rule::exists('projects', 'id')->where('workspace_id', $workspaceId)],
            'related_project_name' => ['nullable', 'string', 'max:255'],
            'pipeline_id' => ['nullable', 'uuid', Rule::exists('crm_pipelines', 'id')->where('workspace_id', $workspaceId)],
            'stage_id' => ['nullable', 'uuid', Rule::exists('crm_pipeline_stages', 'id')->where('workspace_id', $workspaceId)],
            'contact_id' => ['nullable', 'uuid', Rule::exists('crm_contacts', 'id')->where('workspace_id', $workspaceId)],
            'estimated_value' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'owner_id' => [
                'nullable',
                'integer',
                Rule::exists('workspace_users', 'user_id')->where('workspace_id', $workspaceId),
            ],
            'preferred_contact' => ['nullable', 'string', 'max:50'],
            'location' => ['nullable', 'string', 'max:255'],
            'next_follow_up_at' => ['nullable', 'date'],
            'internal_notes' => ['nullable', 'string', 'max:10000'],
            'workspace_id' => ['prohibited'],
            'id' => ['prohibited'],
            'converted_at' => ['prohibited'],
            'converted_to_customer_id' => ['prohibited'],
        ];
    }
}