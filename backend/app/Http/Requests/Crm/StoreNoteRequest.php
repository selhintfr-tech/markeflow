<?php

namespace App\Http\Requests\Crm;

use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreNoteRequest extends FormRequest
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
            'content' => ['required', 'string', 'max:10000'],
            'is_pinned' => ['sometimes', 'boolean'],
            'workspace_id' => ['prohibited'],
            'id' => ['prohibited'],
        ];
    }
}