<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MarketResearchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'workspace_id' => $this->workspace_id,
            'created_by' => $this->created_by,
            'name' => $this->name,
            'category' => $this->category,
            'status' => $this->status,
            'description' => $this->description,
            'starts_on' => $this->starts_on?->toDateString(),
            'ends_on' => $this->ends_on?->toDateString(),
            'competitor_profiles' => $this->competitor_profiles ?? [],
            'opportunities' => $this->opportunities ?? [],
            'threats' => $this->threats ?? [],
            'findings' => $this->findings ?? [],
            'swot' => $this->swot ?? [],
            'sources' => $this->sources ?? [],
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
