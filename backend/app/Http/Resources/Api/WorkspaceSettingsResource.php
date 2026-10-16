<?php

namespace App\Http\Resources\Api;

use App\Models\WorkspaceSetting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin WorkspaceSetting
 */
class WorkspaceSettingsResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'workspace_id' => $this->workspace_id,
            'settings' => $this->settings ?? [],
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
