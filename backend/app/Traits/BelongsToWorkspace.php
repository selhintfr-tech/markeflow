<?php

namespace App\Traits;

use App\Exceptions\MissingTenantContextException;
use App\Exceptions\TenantImmutabilityException;
use App\Exceptions\TenantMismatchException;
use App\Models\Builders\WorkspaceBuilder;
use App\Models\Scopes\WorkspaceScope;
use App\Models\Workspace;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToWorkspace
{
    /**
     * Use a builder that also protects bulk updates from changing tenant ownership.
     */
    public function newEloquentBuilder($query): WorkspaceBuilder
    {
        return new WorkspaceBuilder($query);
    }

    /**
     * Boot the trait to apply the global tenant scope and enforce mutation guards.
     */
    protected static function bootBelongsToWorkspace(): void
    {
        static::addGlobalScope(new WorkspaceScope);

        // 1. Guard creation against cross-tenant writes and unauthenticated writes
        static::creating(function ($model) {
            /** @var TenantContext $tenantContext */
            $tenantContext = app(TenantContext::class);

            if ($tenantContext->isBypassed()) {
                return;
            }

            if (! $tenantContext->hasContext()) {
                throw new MissingTenantContextException(
                    'Cannot create tenant-scoped record ['.static::class.'] without an active tenant context.'
                );
            }

            $activeWorkspaceId = $tenantContext->getWorkspaceId();

            if (empty($model->workspace_id)) {
                // Auto-fill from authenticated context
                $model->workspace_id = $activeWorkspaceId;
            } elseif ($model->workspace_id !== $activeWorkspaceId) {
                // Reject attempt to write to another tenant's workspace
                throw new TenantMismatchException(
                    'Cross-tenant write rejected. Attempted to create record for workspace ['.$model->workspace_id.'] while active context is ['.$activeWorkspaceId.'].'
                );
            }
        });

        // 2. Guard updating against workspace_id reassignment and cross-tenant edits
        static::updating(function ($model) {
            /** @var TenantContext $tenantContext */
            $tenantContext = app(TenantContext::class);

            if ($tenantContext->isBypassed()) {
                return;
            }

            // Prohibit reassigning a tenant-owned record to a different workspace
            if ($model->isDirty('workspace_id')) {
                throw new TenantImmutabilityException(
                    'Tenant ownership (workspace_id) of record ['.static::class.'] cannot be modified once created.'
                );
            }

            if ($tenantContext->hasContext()) {
                $activeWorkspaceId = $tenantContext->getWorkspaceId();
                if ($model->workspace_id !== $activeWorkspaceId) {
                    throw new TenantMismatchException(
                        'Cross-tenant update rejected. Record belongs to workspace ['.$model->workspace_id.'] but active context is ['.$activeWorkspaceId.'].'
                    );
                }
            } elseif (! $tenantContext->isBypassed()) {
                throw new MissingTenantContextException(
                    'Cannot update tenant-scoped record ['.static::class.'] without an active tenant context.'
                );
            }
        });

        // 3. Guard deleting against cross-tenant deletions
        static::deleting(function ($model) {
            /** @var TenantContext $tenantContext */
            $tenantContext = app(TenantContext::class);

            if ($tenantContext->isBypassed()) {
                return;
            }

            if ($tenantContext->hasContext()) {
                $activeWorkspaceId = $tenantContext->getWorkspaceId();
                if ($model->workspace_id !== $activeWorkspaceId) {
                    throw new TenantMismatchException(
                        'Cross-tenant deletion rejected. Record belongs to workspace ['.$model->workspace_id.'] but active context is ['.$activeWorkspaceId.'].'
                    );
                }
            } elseif (! $tenantContext->isBypassed()) {
                throw new MissingTenantContextException(
                    'Cannot delete tenant-scoped record ['.static::class.'] without an active tenant context.'
                );
            }
        });
    }

    /**
     * Get the workspace that owns the model.
     */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }
}
