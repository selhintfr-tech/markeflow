<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FinanceTransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'workspace_id' => $this->workspace_id,
            'campaign_id' => $this->campaign_id,
            'order_id' => $this->order_id,
            'created_by' => $this->created_by,
            'creator_name' => $this->creator?->name,
            'type' => $this->type,
            'category' => $this->category,
            'description' => $this->description,
            'amount' => $this->amount,
            'occurred_on' => $this->occurred_on?->toDateString(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
