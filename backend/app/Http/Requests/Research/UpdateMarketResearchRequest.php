<?php

namespace App\Http\Requests\Research;

use App\Models\MarketResearchProject;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMarketResearchRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'category' => ['sometimes', 'required', 'string', 'max:100'],
            'status' => ['sometimes', 'required', 'string', Rule::in(MarketResearchProject::STATUSES)],
            'description' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'starts_on' => [
                'sometimes',
                'nullable',
                'date_format:Y-m-d',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $endsOn = $this->input('ends_on') ?? $this->currentResearch()?->ends_on?->toDateString();
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
                    $startsOn = $this->input('starts_on') ?? $this->currentResearch()?->starts_on?->toDateString();
                    if (is_string($value) && is_string($startsOn) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) && $value < $startsOn) {
                        $fail('The end date must be on or after the start date.');
                    }
                },
            ],
            'competitor_profiles' => ['sometimes', 'nullable', 'array', 'max:100'],
            'competitor_profiles.*' => ['array'],
            'competitor_profiles.*.id' => ['sometimes', 'string', 'max:100'],
            'competitor_profiles.*.name' => ['required_with:competitor_profiles.*', 'string', 'max:255'],
            'competitor_profiles.*.website' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'competitor_profiles.*.description' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'competitor_profiles.*.positioning' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'competitor_profiles.*.price_level' => ['sometimes', 'nullable', 'string', Rule::in(['Low', 'Medium', 'High'])],
            'competitor_profiles.*.price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'competitor_profiles.*.currency' => ['sometimes', 'nullable', 'string', 'size:3'],
            'competitor_profiles.*.main_offer' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'competitor_profiles.*.region' => ['sometimes', 'nullable', 'string', 'max:255'],
            'competitor_profiles.*.city' => ['sometimes', 'nullable', 'string', 'max:255'],
            'competitor_profiles.*.reviewed_on' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'competitor_profiles.*.evidence' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'competitor_profiles.*.strengths' => ['sometimes', 'array', 'max:50'],
            'competitor_profiles.*.strengths.*' => ['string', 'max:1000'],
            'competitor_profiles.*.weaknesses' => ['sometimes', 'array', 'max:50'],
            'competitor_profiles.*.weaknesses.*' => ['string', 'max:1000'],
            'opportunities' => ['sometimes', 'nullable', 'array', 'max:100'],
            'opportunities.*' => ['array'],
            'opportunities.*.id' => ['sometimes', 'string', 'max:100'],
            'opportunities.*.title' => ['required_with:opportunities.*', 'string', 'max:255'],
            'opportunities.*.description' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'opportunities.*.region' => ['sometimes', 'nullable', 'string', 'max:255'],
            'opportunities.*.confidence' => ['sometimes', 'nullable', 'string', Rule::in(['High', 'Medium', 'Low'])],
            'opportunities.*.recorded_on' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'threats' => ['sometimes', 'nullable', 'array', 'max:100'],
            'threats.*' => ['array'],
            'threats.*.id' => ['sometimes', 'string', 'max:100'],
            'threats.*.title' => ['required_with:threats.*', 'string', 'max:255'],
            'threats.*.description' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'threats.*.region' => ['sometimes', 'nullable', 'string', 'max:255'],
            'threats.*.confidence' => ['sometimes', 'nullable', 'string', Rule::in(['High', 'Medium', 'Low'])],
            'threats.*.recorded_on' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'findings' => ['sometimes', 'nullable', 'array', 'max:200'],
            'findings.*' => ['array'],
            'findings.*.title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'findings.*.insight' => ['required_with:findings.*', 'string', 'max:5000'],
            'findings.*.status' => ['sometimes', 'required', 'string', Rule::in(['New', 'Reviewed', 'Ready', 'Archived'])],
            'swot' => ['sometimes', 'nullable', 'array', 'max:200'],
            'swot.*' => ['array'],
            'swot.*.category' => ['required_with:swot.*', Rule::in(['strength', 'weakness', 'opportunity', 'threat'])],
            'swot.*.item' => ['required_with:swot.*', 'string', 'max:2000'],
            'swot.*.notes' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'sources' => ['sometimes', 'nullable', 'array', 'max:200'],
            'sources.*' => ['array'],
            'sources.*.id' => ['sometimes', 'string', 'max:100'],
            'sources.*.title' => ['required_with:sources.*', 'string', 'max:255'],
            'sources.*.url' => ['required_with:sources.*', 'url', 'max:2048'],
            'sources.*.accessed_on' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'sources.*.type' => ['sometimes', 'nullable', 'string', 'max:100'],
            'sources.*.notes' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'sources.*.reliability' => ['sometimes', 'nullable', 'string', Rule::in(['High', 'Medium', 'Low'])],
            'notes' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'workspace_id' => ['prohibited'],
            'created_by' => ['prohibited'],
        ];
    }

    private function currentResearch(): ?MarketResearchProject
    {
        $id = $this->route('research');

        return is_string($id) ? MarketResearchProject::query()->find($id) : null;
    }
}
