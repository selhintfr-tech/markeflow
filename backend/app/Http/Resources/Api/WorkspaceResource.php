<?php

namespace App\Http\Resources\Api;

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Workspace
 */
class WorkspaceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var User|null $user */
        $user = $request->user();

        $currentUserRole = null;
        if ($user) {
            // If loaded through relationship with pivot
            if ($this->pivot && isset($this->pivot->role)) {
                $currentUserRole = $this->pivot->role;
            } else {
                $currentUserRole = $this->getRoleOf($user);
            }
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'business_type' => $this->business_type,
            'industry' => $this->industry,
            'location' => $this->location,
            'currency' => $this->currency,
            'timezone' => $this->timezone,
            'date_format' => $this->date_format,
            'enabled_modules' => $this->enabled_modules ?? Workspace::defaultModulesForType($this->business_type),
            'status' => $this->status,
            'parent_workspace_id' => $this->parent_workspace_id,
            'current_user_role' => $currentUserRole,
            'is_owner' => $currentUserRole === 'owner',
            'members_count' => $this->whenCounted('members', $this->members_count, fn () => $this->members()->count()),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
