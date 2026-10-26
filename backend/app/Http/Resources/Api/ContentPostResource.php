<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContentPostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'workspace_id' => $this->workspace_id,
            'created_by' => $this->created_by,
            'assigned_to' => $this->assigned_to,
            'campaign_id' => $this->campaign_id,
            'approved_by' => $this->approved_by,
            'title' => $this->title,
            'platform' => $this->platform,
            'content_type' => $this->content_type,
            'status' => $this->status,
            'caption' => $this->caption,
            'internal_notes' => $this->internal_notes,
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'timezone' => $this->timezone,
            'approved_at' => $this->approved_at?->toIso8601String(),
            'campaign' => $this->whenLoaded('campaign', fn () => $this->campaign ? [
                'id' => $this->campaign->id,
                'name' => $this->campaign->name,
            ] : null),
            'assignee' => $this->whenLoaded('assignee', fn () => $this->assignee ? [
                'id' => $this->assignee->id,
                'name' => $this->assignee->name,
            ] : null),
            'attachments' => ContentPostAttachmentResource::collection($this->whenLoaded('attachments')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
