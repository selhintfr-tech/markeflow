<?php

namespace App\Http\Resources\Api\Crm;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeadResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        $owner = $this->relationLoaded('owner') ? $this->owner : null;
        $initials = 'MF';
        if ($owner && $owner->name) {
            $words = explode(' ', trim($owner->name));
            $initials = strtoupper(substr($words[0], 0, 1).(isset($words[1]) ? substr($words[1], 0, 1) : ''));
        }

        return [
            'id' => $this->id,
            'workspace_id' => $this->workspace_id,
            'name' => $this->name,
            'company' => $this->company ?? '',
            'email' => $this->email ?? '',
            'phone' => $this->phone ?? '',
            'source' => $this->source,
            'sourceCampaign' => $this->source_campaign_name ?? ($this->relationLoaded('campaign') ? $this->campaign?->name : null),
            'source_campaign_id' => $this->source_campaign_id,
            'relatedProject' => $this->related_project_name ?? ($this->relationLoaded('project') ? $this->project?->name : null),
            'related_project_id' => $this->related_project_id,
            'status' => $this->status,
            'leadStatus' => $this->status,
            'pipeline_id' => $this->pipeline_id,
            'stage_id' => $this->stage_id,
            'pipeline' => $this->whenLoaded('pipeline', fn () => $this->pipeline ? [
                'id' => $this->pipeline->id,
                'name' => $this->pipeline->name,
            ] : null),
            'stage' => $this->whenLoaded('stage', fn () => $this->stage ? [
                'id' => $this->stage->id,
                'name' => $this->stage->name,
                'code' => $this->stage->code,
                'color' => $this->stage->color,
            ] : null),
            'estimated_value' => $this->estimated_value !== null ? (float) $this->estimated_value : null,
            'currency' => $this->currency,
            'preferredContact' => $this->preferred_contact,
            'location' => $this->location,
            'nextFollowUp' => $this->next_follow_up_at?->format('d M Y, h:i A'),
            'next_follow_up_at' => $this->next_follow_up_at?->toIso8601String(),
            'converted_at' => $this->converted_at?->toIso8601String(),
            'converted_to_customer_id' => $this->converted_to_customer_id,
            'internalNotes' => $this->internal_notes,
            'assignedTo' => $owner ? [
                'id' => $owner->id,
                'name' => $owner->name,
                'email' => $owner->email,
                'initials' => $initials,
            ] : null,
            'createdDate' => $this->created_at?->format('d M Y'),
            'activities' => ActivityResource::collection($this->whenLoaded('activities')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}