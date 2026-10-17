<?php

namespace App\Http\Resources\Api\Crm;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PipelineStageResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'pipeline_id' => $this->pipeline_id,
            'name' => $this->name,
            'code' => $this->code,
            'color' => $this->color,
            'probability' => $this->probability,
            'display_order' => $this->display_order,
            'is_won' => $this->is_won,
            'is_lost' => $this->is_lost,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}