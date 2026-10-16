<?php

namespace App\Models\Builders;

use App\Exceptions\MissingTenantContextException;
use App\Exceptions\TenantImmutabilityException;
use App\Exceptions\TenantMismatchException;
use App\Models\Scopes\WorkspaceScope;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Builder;

class WorkspaceBuilder extends Builder
{
    public function insert(array $values): bool
    {
        return $this->toBase()->insert($this->withActiveWorkspace($values));
    }

    public function insertOrIgnore(array $values): int
    {
        return $this->toBase()->insertOrIgnore($this->withActiveWorkspace($values));
    }

    public function insertGetId(array $values, $sequence = null): int
    {
        return $this->toBase()->insertGetId($this->withActiveWorkspace($values), $sequence);
    }

    public function insertUsing(array $columns, $query): int
    {
        $this->requireBypass('insertUsing');

        return $this->toBase()->insertUsing($columns, $query);
    }

    public function insertOrIgnoreUsing(array $columns, $query): int
    {
        $this->requireBypass('insertOrIgnoreUsing');

        return $this->toBase()->insertOrIgnoreUsing($columns, $query);
    }

    public function update(array $values)
    {
        $this->requireTenantScope('update');
        $this->guardWorkspaceOwnership(array_keys($values));

        return parent::update($values);
    }

    public function delete()
    {
        $this->requireTenantScope('delete');

        return parent::delete();
    }

    public function forceDelete()
    {
        $this->requireTenantScope('force delete');

        return $this->toBase()->delete();
    }

    public function updateOrInsert(array $attributes, array|callable $values = []): bool
    {
        $this->requireBypass('updateOrInsert');

        return $this->toBase()->updateOrInsert($attributes, $values);
    }

    public function upsert(array $values, $uniqueBy, $update = null): int
    {
        $this->requireBypass('upsert');

        return parent::upsert($values, $uniqueBy, $update);
    }

    public function increment($column, $amount = 1, array $extra = [])
    {
        $this->requireTenantScope('increment');
        $this->guardWorkspaceOwnership([$column]);

        return $this->toBase()->increment($column, $amount, $extra);
    }

    public function incrementEach(array $columns, array $extra = [])
    {
        $this->requireTenantScope('increment');
        $this->guardWorkspaceOwnership(array_keys($columns));

        return $this->toBase()->incrementEach($columns, $extra);
    }

    public function decrement($column, $amount = 1, array $extra = [])
    {
        $this->requireTenantScope('decrement');
        $this->guardWorkspaceOwnership([$column]);

        return $this->toBase()->decrement($column, $amount, $extra);
    }

    public function decrementEach(array $columns, array $extra = [])
    {
        $this->requireTenantScope('decrement');
        $this->guardWorkspaceOwnership(array_keys($columns));

        return $this->toBase()->decrementEach($columns, $extra);
    }

    public function withoutGlobalScope($scope)
    {
        if (
            ! app(TenantContext::class)->isBypassed()
            && ($scope === WorkspaceScope::class || $scope instanceof WorkspaceScope)
        ) {
            throw new TenantImmutabilityException(
                'The workspace isolation scope can only be removed inside trusted system scope.'
            );
        }

        return parent::withoutGlobalScope($scope);
    }

    public function truncate()
    {
        $this->requireBypass('truncate');

        return $this->toBase()->truncate();
    }

    /**
     * Fill the current tenant ID into safe bulk inserts and reject foreign IDs.
     *
     * @param  array<int|string, mixed>  $values
     * @return array<int|string, mixed>
     */
    private function withActiveWorkspace(array $values): array
    {
        $tenantContext = app(TenantContext::class);
        if ($tenantContext->isBypassed()) {
            return $values;
        }

        $workspaceId = $tenantContext->getWorkspaceId();
        if ($workspaceId === null) {
            throw new MissingTenantContextException(
                'Cannot insert tenant-owned records without an active tenant context.'
            );
        }

        $isSingleRow = $values && ! is_array(array_first($values));
        $rows = $isSingleRow ? [$values] : $values;

        foreach ($rows as &$row) {
            if (! is_array($row)) {
                throw new \InvalidArgumentException('Each tenant insert row must be an attribute array.');
            }

            if (isset($row['workspace_id']) && $row['workspace_id'] !== $workspaceId) {
                throw new TenantMismatchException(
                    'Cross-tenant insert rejected. Every record must belong to the active workspace.'
                );
            }

            $row['workspace_id'] = $workspaceId;
        }
        unset($row);

        return $isSingleRow ? $rows[0] : $rows;
    }

    /**
     * Block writes that could change ownership or escape tenant filtering.
     *
     * @param  array<int, int|string>  $columns
     */
    private function guardWorkspaceOwnership(array $columns): void
    {
        if (app(TenantContext::class)->isBypassed()) {
            return;
        }

        foreach ($columns as $column) {
            if (is_string($column) && basename(str_replace('.', '/', trim($column, '"`[]'))) === 'workspace_id') {
                throw new TenantImmutabilityException(
                    'Tenant ownership (workspace_id) cannot be modified through a bulk operation.'
                );
            }
        }
    }

    private function requireBypass(string $operation): void
    {
        if (! app(TenantContext::class)->isBypassed()) {
            throw new TenantImmutabilityException(
                "The {$operation} operation is disabled for tenant-owned records outside trusted system scope."
            );
        }
    }

    private function requireTenantScope(string $operation): void
    {
        if (
            ! app(TenantContext::class)->isBypassed()
            && (
                ! $this->getModel()::hasGlobalScope(WorkspaceScope::class)
                || in_array(WorkspaceScope::class, $this->removedScopes(), true)
            )
        ) {
            throw new TenantImmutabilityException(
                "The {$operation} operation requires the workspace isolation scope."
            );
        }
    }
}
