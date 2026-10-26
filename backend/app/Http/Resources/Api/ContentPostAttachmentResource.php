<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContentPostAttachmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'content_post_id' => $this->content_post_id,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'size' => $this->size,
            'download_url' => '/api/content/posts/'.$this->content_post_id.'/attachments/'.$this->id,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
