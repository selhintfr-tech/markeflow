<?php

namespace App\Http\Requests\Crm;

use App\Models\Crm\CrmActivity;
use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreActivityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $workspaceId = app(TenantContext::class)->getWorkspaceId();

        return [
            'lead_id' => ['nullable', 'uuid', Rule::exists('crm_leads', 'id')->where('workspace_id', $workspaceId)],
            'contact_id' => ['nullable', 'uuid', Rule::exists('crm_contacts', 'id')->where('workspace_id', $workspaceId)],
            'customer_id' => ['nullable', 'uuid', Rule::exists('crm_customers', 'id')->where('workspace_id', $workspaceId)],
            'type' => ['required', 'string', Rule::in(CrmActivity::TYPES)],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'activity_date' => ['nullable', 'date'],
            'metadata' => ['nullable', 'array'],
            'workspace_id' => ['prohibited'],
            'id' => ['prohibited'],
        ];
    }
}