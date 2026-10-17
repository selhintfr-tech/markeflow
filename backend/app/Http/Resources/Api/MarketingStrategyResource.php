<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MarketingStrategyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'workspace_id' => $this->workspace_id,
            'created_by' => $this->created_by,
            'project_id' => $this->project_id,
            'campaign_id' => $this->campaign_id,
            'name' => $this->name,
            'description' => $this->description,
            'objectives' => $this->objectives,
            'success_metrics' => $this->success_metrics,
            'channels' => $this->channels,
            'budget' => $this->budget,
            'starts_on' => $this->starts_on?->toDateString(),
            'ends_on' => $this->ends_on?->toDateString(),
            'status' => $this->status,
            'progress' => $this->progress,
            'action_plan' => $this->action_plan,
            'notes' => $this->notes,
            'audience_ids' => $this->whenLoaded('audiences', fn () => $this->audiences->pluck('id')->values()),
            'audiences' => AudienceResource::collection($this->whenLoaded('audiences')),
            'project' => $this->whenLoaded('project', fn () => $this->project ? [
                'id' => $this->project->id,
                'name' => $this->project->name,
            ] : null),
            'campaign' => $this->whenLoaded('campaign', fn () => $this->campaign ? [
                'id' => $this->campaign->id,
                'name' => $this->campaign->name,
            ] : null),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
