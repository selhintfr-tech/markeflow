<?php

namespace App\Models\Scopes;

use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class WorkspaceScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     * Enforces strict fail-closed multi-tenant data isolation.
     */
    public function apply(Builder $builder, Model $model): void
    {
        /** @var TenantContext $tenantContext */
        $tenantContext = app(TenantContext::class);

        // Allow trusted system-level operations to run without tenant restriction when explicitly invoked
        if ($tenantContext->isBypassed()) {
            return;
        }

        $workspaceId = $tenantContext->getWorkspaceId();

        if ($workspaceId) {
            $builder->where($model->qualifyColumn('workspace_id'), $workspaceId);
        } else {
            // STRICT FAIL-CLOSED: A missing or invalid tenant context must NEVER fail open.
            // If no tenant context is set, force the query to match zero rows.
            $builder->whereRaw('1 = 0');
        }
    }
}
