<?php

namespace App\Http\Requests\Campaigns;

use App\Models\Campaign;
use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCampaignRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $workspaceId = app(TenantContext::class)->getWorkspaceId();

        return [
            'project_id' => ['required', 'uuid', Rule::exists('projects', 'id')->where('workspace_id', $workspaceId)],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'status' => ['sometimes', 'required', 'string', Rule::in(Campaign::STATUSES)],
            'platform' => ['required', 'string', Rule::in(Campaign::PLATFORMS)],
            'channel' => ['required', 'string', 'max:100'],
            'objective' => ['nullable', 'string', 'max:255'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'budget' => ['sometimes', 'required', 'numeric', 'decimal:0,2', 'min:0', 'max:9999999999.99'],
            'spend' => ['sometimes', 'required', 'numeric', 'decimal:0,2', 'min:0', 'max:9999999999.99'],
            'leads' => ['sometimes', 'required', 'integer', 'min:0', 'max:4294967295'],
            'customers' => ['sometimes', 'required', 'integer', 'min:0', 'max:4294967295'],
            'revenue' => ['sometimes', 'required', 'numeric', 'decimal:0,2', 'min:0', 'max:9999999999.99'],
            'workspace_id' => ['prohibited'],
            'created_by' => ['prohibited'],
            'owner_id' => ['prohibited'],
            'role' => ['prohibited'],
        ];
    }
}
