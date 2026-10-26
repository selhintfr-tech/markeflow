<?php

namespace App\Http\Requests\Campaigns;

use App\Models\Campaign;
use App\Services\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateCampaignRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $workspaceId = app(TenantContext::class)->getWorkspaceId();

        return [
            'project_id' => ['sometimes', 'required', 'uuid', Rule::exists('projects', 'id')->where('workspace_id', $workspaceId)],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'status' => ['sometimes', 'required', 'string', Rule::in(Campaign::STATUSES)],
            'platform' => ['sometimes', 'required', 'string', Rule::in(Campaign::PLATFORMS)],
            'channel' => ['sometimes', 'required', 'string', 'max:100'],
            'objective' => ['sometimes', 'nullable', 'string', 'max:255'],
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => ['sometimes', 'nullable', 'date'],
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

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $campaignId = $this->route('campaign');
                if (! is_string($campaignId)) {
                    return;
                }

                $campaign = Campaign::query()->find($campaignId);
                if (! $campaign) {
                    return;
                }

                $startDate = $this->has('start_date') ? $this->input('start_date') : $campaign->start_date?->toDateString();
                $endDate = $this->has('end_date') ? $this->input('end_date') : $campaign->end_date?->toDateString();

                if (
                    is_string($startDate)
                    && is_string($endDate)
                    && ! $validator->errors()->has('start_date')
                    && ! $validator->errors()->has('end_date')
                    && CarbonImmutable::parse($endDate)->lt(CarbonImmutable::parse($startDate))
                ) {
                    $validator->errors()->add('end_date', 'The end date must be on or after the start date.');
                }
            },
        ];
    }
}
