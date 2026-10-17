<?php

namespace App\Http\Requests\Crm;

use App\Models\Crm\CrmCustomer;
use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $workspaceId = app(TenantContext::class)->getWorkspaceId();

        return [
            'company_name' => ['sometimes', 'required', 'string', 'max:255'],
            'contact_name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'status' => ['sometimes', 'string', Rule::in(CrmCustomer::STATUSES)],
            'customer_tier' => ['sometimes', 'string', Rule::in(CrmCustomer::TIERS)],
            'total_revenue' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'contact_id' => ['nullable', 'uuid', Rule::exists('crm_contacts', 'id')->where('workspace_id', $workspaceId)],
            'owner_id' => [
                'nullable',
                'integer',
                Rule::exists('workspace_users', 'user_id')->where('workspace_id', $workspaceId),
            ],
            'notes' => ['nullable', 'string', 'max:10000'],
            'workspace_id' => ['prohibited'],
            'id' => ['prohibited'],
        ];
    }
}