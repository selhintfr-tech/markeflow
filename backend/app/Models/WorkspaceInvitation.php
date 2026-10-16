<?php

namespace App\Models;

use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkspaceInvitation extends Model
{
    use BelongsToWorkspace, HasFactory, HasUuids;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'workspace_invitations';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'workspace_id',
        'email',
        'role',
        'token_hash',
        'invited_by',
        'accepted_at',
        'expires_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     * Never expose raw or hashed invitation tokens in JSON.
     *
     * @var list<string>
     */
    protected $hidden = [
        'token_hash',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'accepted_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    /**
     * The workspace the invitation is for.
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }

    /**
     * The user who created the invitation.
     */
    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    /**
     * Check if the invitation has expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Check if the invitation was already accepted.
     */
    public function isAccepted(): bool
    {
        return $this->accepted_at !== null;
    }

    /**
     * Check if the invitation is currently pending and valid.
     */
    public function isPending(): bool
    {
        return ! $this->isAccepted() && ! $this->isExpired();
    }

    /**
     * Scope query to pending invitations only.
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->whereNull('accepted_at')
            ->where('expires_at', '>', now());
    }

    /**
     * Scope query to expired invitations.
     */
    public function scopeExpired(Builder $query): Builder
    {
        return $query->whereNull('accepted_at')
            ->where('expires_at', '<=', now());
    }

    /**
     * Securely hash a plain invitation token using SHA-256.
     */
    public static function hashToken(string $plainToken): string
    {
        return hash('sha256', $plainToken);
    }
}
