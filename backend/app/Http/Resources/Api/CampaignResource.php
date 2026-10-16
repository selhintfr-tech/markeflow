<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CampaignResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'workspace_id' => $this->workspace_id,
            'project_id' => $this->project_id,
            'created_by' => $this->created_by,
            'name' => $this->name,
            'description' => $this->description,
            'status' => $this->status,
            'platform' => $this->platform,
            'channel' => $this->channel,
            'objective' => $this->objective,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'budget' => $this->budget,
            'spend' => $this->spend,
            'leads' => $this->leads,
            'customers' => $this->customers,
            'revenue' => $this->revenue,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
