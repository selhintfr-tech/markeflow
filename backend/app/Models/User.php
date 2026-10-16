<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'job_title',
        'avatar_url',
        'timezone',
        'locale',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Workspaces the user belongs to.
     */
    public function workspaces(): BelongsToMany
    {
        return $this->belongsToMany(Workspace::class, 'workspace_users', 'user_id', 'workspace_id')
            ->using(WorkspaceUser::class)
            ->withPivot(['id', 'role', 'job_title', 'custom_permissions', 'joined_at'])
            ->withTimestamps();
    }

    /**
     * Workspace memberships pivot records.
     */
    public function workspaceMemberships(): HasMany
    {
        return $this->hasMany(WorkspaceUser::class, 'user_id');
    }

    /**
     * Workspaces where the user is an owner.
     */
    public function ownedWorkspaces(): BelongsToMany
    {
        return $this->workspaces()->wherePivot('role', WorkspaceUser::ROLE_OWNER);
    }

    /**
     * Invitations sent by this user.
     */
    public function sentInvitations(): HasMany
    {
        return $this->hasMany(WorkspaceInvitation::class, 'invited_by');
    }

    /**
     * Audit log entries initiated by this user.
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(WorkspaceAuditLog::class, 'user_id');
    }

    /**
     * Check if user is a member of a given workspace.
     */
    public function belongsToWorkspace(string|Workspace $workspace): bool
    {
        $workspaceId = $workspace instanceof Workspace ? $workspace->id : $workspace;

        return $this->workspaceMemberships()->where('workspace_id', $workspaceId)->exists();
    }

    /**
     * Get the user's role in a given workspace.
     */
    public function roleInWorkspace(string|Workspace $workspace): ?string
    {
        $workspaceId = $workspace instanceof Workspace ? $workspace->id : $workspace;

        return $this->workspaceMemberships()
            ->where('workspace_id', $workspaceId)
            ->value('role');
    }

    /**
     * Check if user is the owner of a given workspace.
     */
    public function isOwnerOf(string|Workspace $workspace): bool
    {
        return $this->roleInWorkspace($workspace) === WorkspaceUser::ROLE_OWNER;
    }

    /**
     * Check if user is an owner or admin of a given workspace.
     */
    public function isAdminOf(string|Workspace $workspace): bool
    {
        $role = $this->roleInWorkspace($workspace);

        return in_array($role, [WorkspaceUser::ROLE_OWNER, WorkspaceUser::ROLE_ADMIN], true);
    }

    /**
     * Format user payload for authentication API responses matching React AuthUser contract.
     *
     * @return array<string, mixed>
     */
    public function toAuthPayload(): array
    {
        $primaryMembership = $this->workspaceMemberships()->first();

        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'job_title' => $this->job_title,
            'avatar_url' => $this->avatar_url,
            'timezone' => $this->timezone ?? 'Africa/Casablanca',
            'locale' => $this->locale ?? 'en',
            'role' => $primaryMembership?->role,
            'workspaceId' => $primaryMembership?->workspace_id,
        ];
    }
}
