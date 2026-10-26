<?php

namespace App\Http\Requests\Strategies;

use App\Models\Campaign;
use App\Models\MarketingStrategy;
use App\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMarketingStrategyRequest extends FormRequest
{
    public function rules(): array
    {
        $workspaceId = app(TenantContext::class)->getWorkspaceId();

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'objectives' => ['sometimes', 'nullable', 'array', 'max:50'],
            'objectives.*' => ['string', 'max:1000'],
            'success_metrics' => ['sometimes', 'nullable', 'array', 'max:50'],
            'success_metrics.*' => ['string', 'max:1000'],
            'channels' => ['sometimes', 'nullable', 'array', 'max:50'],
            'channels.*' => ['string', 'max:100'],
            'budget' => ['sometimes', 'nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:999999999999.99'],
            'starts_on' => [
                'sometimes',
                'nullable',
                'date_format:Y-m-d',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $endsOn = $this->input('ends_on') ?? $this->currentStrategy()?->ends_on?->toDateString();
                    if (is_string($value) && is_string($endsOn) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) && $value > $endsOn) {
                        $fail('The start date must be on or before the end date.');
                    }
                },
            ],
            'ends_on' => [
                'sometimes',
                'nullable',
                'date_format:Y-m-d',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $startsOn = $this->input('starts_on') ?? $this->currentStrategy()?->starts_on?->toDateString();
                    if (is_string($value) && is_string($startsOn) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) && $value < $startsOn) {
                        $fail('The end date must be on or after the start date.');
                    }
                },
            ],
            'status' => ['sometimes', 'required', 'string', Rule::in(MarketingStrategy::STATUSES)],
            'progress' => ['prohibited'],
            'action_plan' => ['sometimes', 'nullable', 'array', 'max:100'],
            'action_plan.*' => ['array'],
            'action_plan.*.title' => ['required_with:action_plan.*', 'string', 'max:255'],
            'action_plan.*.description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'action_plan.*.due_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'action_plan.*.status' => ['sometimes', 'string', Rule::in(['Pending', 'In Progress', 'Completed'])],
            'notes' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'project_id' => ['sometimes', 'nullable', 'uuid', Rule::exists('projects', 'id')->where('workspace_id', $workspaceId)],
            'campaign_id' => [
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('campaigns', 'id')->where('workspace_id', $workspaceId),
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $projectId = $this->input('project_id');
                    if ($value !== null && $projectId !== null
                        && ! Campaign::query()->where('workspace_id', app(TenantContext::class)->getWorkspaceId())
                            ->whereKey($value)->where('project_id', $projectId)->exists()) {
                        $fail('The selected campaign must belong to the selected project.');
                    }
                },
            ],
            'audience_ids' => ['sometimes', 'array', 'max:100'],
            'audience_ids.*' => ['required', 'uuid', 'distinct', Rule::exists('audiences', 'id')->where('workspace_id', $workspaceId)],
            'workspace_id' => ['prohibited'],
            'created_by' => ['prohibited'],
            'owner_id' => ['prohibited'],
        ];
    }

    private function currentStrategy(): ?MarketingStrategy
    {
        $id = $this->route('strategy');

        return is_string($id) ? MarketingStrategy::query()->find($id) : null;
    }
}
