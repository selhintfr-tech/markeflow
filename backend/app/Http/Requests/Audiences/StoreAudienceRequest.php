<?php

namespace App\Http\Requests\Audiences;

use App\Models\Audience;
use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAudienceRequest extends FormRequest
{
    public function rules(): array
    {
        $workspaceId = app(TenantContext::class)->getWorkspaceId();

        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'demographics' => ['sometimes', 'nullable', 'array', 'max:50'],
            'locations' => ['sometimes', 'nullable', 'array', 'max:100'],
            'locations.*' => ['string', 'max:255'],
            'interests' => ['sometimes', 'nullable', 'array', 'max:100'],
            'interests.*' => ['string', 'max:255'],
            'characteristics' => ['sometimes', 'nullable', 'array', 'max:100'],
            'characteristics.*' => ['string', 'max:255'],
            'segmentation_criteria' => ['sometimes', 'nullable', 'array', 'max:100'],
            'estimated_size' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:9223372036854775807'],
            'status' => ['sometimes', 'required', 'string', Rule::in(Audience::STATUSES)],
            'notes' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'campaign_ids' => ['sometimes', 'array', 'max:100'],
            'campaign_ids.*' => ['required', 'uuid', 'distinct', Rule::exists('campaigns', 'id')->where('workspace_id', $workspaceId)],
            'workspace_id' => ['prohibited'],
            'created_by' => ['prohibited'],
            'owner_id' => ['prohibited'],
        ];
    }
}
