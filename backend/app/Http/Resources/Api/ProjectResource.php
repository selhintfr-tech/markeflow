<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'workspace_id' => $this->workspace_id,
            'owner_id' => $this->owner_id,
            'owner' => $this->whenLoaded('owner', fn () => $this->owner ? [
                'id' => $this->owner->id,
                'name' => $this->owner->name,
            ] : null),
            'name' => $this->name,
            'description' => $this->description,
            'objectives' => $this->objectives ?? [],
            'status' => $this->status,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'progress' => $this->progress,
            'milestones' => $this->whenLoaded('milestones'),
            'activities' => $this->whenLoaded('activities', fn () => $this->activities->map(fn ($activity) => [
                'id' => $activity->id,
                'action' => $activity->action,
                'summary' => $activity->payload['summary'] ?? $activity->action,
                'user' => $activity->user?->name,
                'created_at' => $activity->created_at?->toIso8601String(),
            ])->values()),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
