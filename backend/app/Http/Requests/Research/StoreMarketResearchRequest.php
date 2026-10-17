<?php

namespace App\Http\Requests\Research;

use App\Models\MarketResearchProject;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMarketResearchRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'status' => ['sometimes', 'required', 'string', Rule::in(MarketResearchProject::STATUSES)],
            'description' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'starts_on' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'ends_on' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'after_or_equal:starts_on'],
            'competitor_profiles' => ['sometimes', 'nullable', 'array', 'max:100'],
            'competitor_profiles.*' => ['array'],
            'competitor_profiles.*.name' => ['required_with:competitor_profiles.*', 'string', 'max:255'],
            'competitor_profiles.*.website' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'competitor_profiles.*.description' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'competitor_profiles.*.strengths' => ['sometimes', 'array', 'max:50'],
            'competitor_profiles.*.strengths.*' => ['string', 'max:1000'],
            'competitor_profiles.*.weaknesses' => ['sometimes', 'array', 'max:50'],
            'competitor_profiles.*.weaknesses.*' => ['string', 'max:1000'],
            'opportunities' => ['sometimes', 'nullable', 'array', 'max:100'],
            'opportunities.*' => ['array'],
            'opportunities.*.title' => ['required_with:opportunities.*', 'string', 'max:255'],
            'opportunities.*.description' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'threats' => ['sometimes', 'nullable', 'array', 'max:100'],
            'threats.*' => ['array'],
            'threats.*.title' => ['required_with:threats.*', 'string', 'max:255'],
            'threats.*.description' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'findings' => ['sometimes', 'nullable', 'array', 'max:200'],
            'findings.*' => ['array'],
            'findings.*.title' => ['required_with:findings.*', 'string', 'max:255'],
            'findings.*.insight' => ['required_with:findings.*', 'string', 'max:5000'],
            'swot' => ['sometimes', 'nullable', 'array', 'max:200'],
            'swot.*' => ['array'],
            'swot.*.category' => ['required_with:swot.*', Rule::in(['strength', 'weakness', 'opportunity', 'threat'])],
            'swot.*.item' => ['required_with:swot.*', 'string', 'max:2000'],
            'swot.*.notes' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'sources' => ['sometimes', 'nullable', 'array', 'max:200'],
            'sources.*' => ['array'],
            'sources.*.title' => ['required_with:sources.*', 'string', 'max:255'],
            'sources.*.url' => ['required_with:sources.*', 'url', 'max:2048'],
            'sources.*.accessed_on' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'workspace_id' => ['prohibited'],
            'created_by' => ['prohibited'],
        ];
    }
}
