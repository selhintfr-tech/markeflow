<?php

namespace App\Models;

use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;

class Workspace extends Model
{
    use HasFactory, HasUuids;

    // Supported business types
    public const TYPE_SOLO = 'solo_freelancer';

    public const TYPE_AGENCY = 'agency';

    public const TYPE_ECOMMERCE = 'ecommerce';

    public const TYPE_GENERAL = 'general_business';

    public const TYPE_BRANCH = 'branch';

    protected $fillable = [
        'name',
        'slug',
        'business_type',
        'industry',
        'location',
        'currency',
        'timezone',
        'date_format',
        'enabled_modules',
        'status',
        'parent_workspace_id',
    ];

    protected $casts = [
        'enabled_modules' => 'array',
    ];

    /**
     * Default modules per business type.
     */
    public static function defaultModulesForType(string $type): array
    {
        return match ($type) {
            self::TYPE_SOLO => ['campaigns', 'projects', 'tasks', 'finance', 'calendar'],
            self::TYPE_AGENCY => ['campaigns', 'projects', 'tasks', 'crm', 'finance', 'analytics', 'reports', 'calendar', 'workspaces'],
            self::TYPE_ECOMMERCE => ['campaigns', 'crm', 'finance', 'analytics', 'reports', 'calendar'],
            self::TYPE_BRANCH => ['campaigns', 'projects', 'tasks', 'crm', 'calendar'],
            default => ['campaigns', 'projects', 'tasks', 'crm', 'finance', 'analytics', 'reports', 'calendar'],
        };
    }

    /**
     * All users belonging to this workspace.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'workspace_users', 'workspace_id', 'user_id')
            ->using(WorkspaceUser::class)
            ->withPivot(['id', 'role', 'job_title', 'custom_permissions', 'joined_at'])
            ->withTimestamps();
    }

    /**
     * Membership records for this workspace.
     */
    public function members(): HasMany
    {
        return $this->hasMany(WorkspaceUser::class, 'workspace_id');
    }

    /**
     * Pending invitations for this workspace.
     */
    public function invitations(): HasMany
    {
        return $this->hasMany(WorkspaceInvitation::class, 'workspace_id');
    }

    /**
     * Workspace configuration settings (1:1).
     */
    public function settings(): HasOne
    {
        return $this->hasOne(WorkspaceSetting::class, 'workspace_id');
    }

    /**
     * Audit log records for this workspace.
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(WorkspaceAuditLog::class, 'workspace_id');
    }

    /**
     * Parent workspace for branch/agency relationships.
     */
    public function parentWorkspace(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_workspace_id');
    }

    /**
     * Child branch workspaces.
     */
    public function childBranches(): HasMany
    {
        return $this->hasMany(self::class, 'parent_workspace_id');
    }

    /**
     * Check if a user belongs to this workspace.
     */
    public function hasUser(int|User $user): bool
    {
        $userId = $user instanceof User ? $user->id : $user;

        return $this->members()->where('user_id', $userId)->exists();
    }

    /**
     * Check if a module is enabled for this workspace.
     */
    public function hasModule(string $module): bool
    {
        $modules = $this->enabled_modules ?? self::defaultModulesForType($this->business_type);

        return in_array($module, $modules, true);
    }

    /**
     * Get the role of a user in this workspace.
     */
    public function getRoleOf(int|User $user): ?string
    {
        $userId = $user instanceof User ? $user->id : $user;

        return $this->members()->where('user_id', $userId)->value('role');
    }

    /**
     * Atomically create a workspace with an initial owner, default settings, and audit log.
     *
     * @param  array<string, mixed>  $attributes
     */
    public static function createWithInitialOwner(User $owner, array $attributes): self
    {
        return DB::transaction(function () use ($owner, $attributes) {
            /** @var self $workspace */
            $workspace = static::create($attributes);

            WorkspaceUser::create([
                'workspace_id' => $workspace->id,
                'user_id' => $owner->id,
                'role' => WorkspaceUser::ROLE_OWNER,
                'joined_at' => now(),
            ]);

            app(TenantContext::class)->runInContext($workspace, function () use ($workspace, $owner) {
                WorkspaceSetting::create([
                    'workspace_id' => $workspace->id,
                    'settings' => [],
                ]);

                WorkspaceAuditLog::log(
                    $workspace,
                    'workspace.created',
                    'Workspace',
                    $workspace->id,
                    ['name' => $workspace->name, 'owner_id' => $owner->id],
                    $owner->id
                );
            });

            return $workspace;
        });
    }
}
