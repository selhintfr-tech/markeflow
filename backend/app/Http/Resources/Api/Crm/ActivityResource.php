<?php

namespace App\Http\Resources\Api\Crm;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'lead_id' => $this->lead_id,
            'contact_id' => $this->contact_id,
            'customer_id' => $this->customer_id,
            'type' => $this->type,
            'title' => $this->title,
            'description' => $this->description,
            'activity_date' => $this->activity_date?->toIso8601String(),
            'date' => $this->activity_date?->format('d M Y, h:i A'),
            'metadata' => $this->metadata,
            'user' => $this->whenLoaded('user', fn () => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}