<?php

namespace App\Models;

use App\Services\TenantContext;
use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkspaceAuditLog extends Model
{
    use BelongsToWorkspace, HasUuids;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'workspace_audit_logs';

    /**
     * Indicates if the model should be timestamped.
     * Audit logs are immutable and only track created_at.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'workspace_id',
        'user_id',
        'action',
        'entity_type',
        'entity_id',
        'payload',
        'ip_address',
        'user_agent',
        'created_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     * Never expose sensitive IP address or client agent details by default.
     *
     * @var list<string>
     */
    protected $hidden = [
        'ip_address',
        'user_agent',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * The workspace associated with this audit log.
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }

    /**
     * The user who performed the audited action, if any.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Keys containing sensitive data that must be redacted from audit logs.
     *
     * @var list<string>
     */
    protected static array $sensitiveKeys = [
        'password',
        'password_confirmation',
        'token',
        'plain_token',
        'token_hash',
        'secret',
        'credit_card',
        'api_key',
        'remember_token',
    ];

    /**
     * Recursively sanitize payload to prevent leaking credentials or tokens.
     */
    public static function sanitizePayload(?array $payload): ?array
    {
        if ($payload === null) {
            return null;
        }

        $sanitized = [];
        foreach ($payload as $key => $value) {
            if (in_array(strtolower((string) $key), self::$sensitiveKeys, true)) {
                $sanitized[$key] = '[REDACTED]';
            } elseif (is_array($value)) {
                $sanitized[$key] = self::sanitizePayload($value);
            } else {
                $sanitized[$key] = $value;
            }
        }

        return $sanitized;
    }

    /**
     * Record a new immutable audit log entry.
     */
    public static function log(
        string|Workspace $workspace,
        string $action,
        string $entityType,
        string $entityId,
        ?array $payload = null,
        ?int $userId = null,
        ?string $ipAddress = null,
        ?string $userAgent = null
    ): self {
        $workspaceId = $workspace instanceof Workspace ? $workspace->id : $workspace;

        return app(TenantContext::class)->runInContext($workspaceId, function () use (
            $workspaceId, $action, $entityType, $entityId, $payload, $userId, $ipAddress, $userAgent
        ) {
            return static::create([
                'workspace_id' => $workspaceId,
                'user_id' => $userId,
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'payload' => self::sanitizePayload($payload),
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent,
                'created_at' => now(),
            ]);
        });
    }
}
