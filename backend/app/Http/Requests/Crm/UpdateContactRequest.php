<?php

namespace App\Http\Requests\Crm;

use App\Models\Crm\CrmContact;
use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateContactRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $workspaceId = app(TenantContext::class)->getWorkspaceId();

        return [
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'job_title' => ['nullable', 'string', 'max:255'],
            'preferred_contact' => ['nullable', 'string', 'max:50'],
            'location' => ['nullable', 'string', 'max:255'],
            'lifecycle_stage' => ['sometimes', 'string', Rule::in(CrmContact::LIFECYCLES)],
            'status' => ['sometimes', 'string', Rule::in(CrmContact::STATUSES)],
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