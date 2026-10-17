<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AudienceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'workspace_id' => $this->workspace_id,
            'created_by' => $this->created_by,
            'name' => $this->name,
            'description' => $this->description,
            'demographics' => $this->demographics,
            'locations' => $this->locations,
            'interests' => $this->interests,
            'characteristics' => $this->characteristics,
            'segmentation_criteria' => $this->segmentation_criteria,
            'estimated_size' => $this->estimated_size,
            'status' => $this->status,
            'notes' => $this->notes,
            'campaign_ids' => $this->whenLoaded('campaigns', fn () => $this->campaigns->pluck('id')->values()),
            'campaigns' => $this->whenLoaded('campaigns', fn () => CampaignResource::collection($this->campaigns)),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
