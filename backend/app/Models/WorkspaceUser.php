<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

class WorkspaceUser extends Pivot
{
    use HasUuids;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'workspace_users';

    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * The data type of the primary key.
     *
     * @var string
     */
    protected $keyType = 'string';

    // Standard workspace roles
    public const ROLE_OWNER = 'owner';

    public const ROLE_ADMIN = 'admin';

    public const ROLE_MEMBER = 'member';

    public const ROLE_VIEWER = 'viewer';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'workspace_id',
        'user_id',
        'role',
        'job_title',
        'custom_permissions',
        'joined_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'custom_permissions' => 'array',
            'joined_at' => 'datetime',
        ];
    }

    /**
     * The workspace that this membership belongs to.
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }

    /**
     * The user that this membership belongs to.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Check if membership is owner.
     */
    public function isOwner(): bool
    {
        return $this->role === self::ROLE_OWNER;
    }

    /**
     * Check if membership is admin.
     */
    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    /**
     * Check if membership is owner or admin.
     */
    public function isOwnerOrAdmin(): bool
    {
        return in_array($this->role, [self::ROLE_OWNER, self::ROLE_ADMIN], true);
    }

    /**
     * Check if membership has a specific custom permission.
     */
    public function hasPermission(string $permission): bool
    {
        if ($this->isOwner()) {
            return true;
        }

        $permissions = $this->custom_permissions ?? [];

        return in_array($permission, $permissions, true);
    }
}
