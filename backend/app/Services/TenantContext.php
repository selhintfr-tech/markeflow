<?php

namespace App\Services;

use App\Exceptions\MissingTenantContextException;
use App\Models\Workspace;
use App\Models\WorkspaceUser;

class TenantContext
{
    private ?Workspace $workspace = null;

    private ?WorkspaceUser $membership = null;

    private bool $bypassScope = false;

    /**
     * Set active workspace and optional verified membership.
     */
    public function setWorkspace(Workspace $workspace, ?WorkspaceUser $membership = null): void
    {
        $this->workspace = $workspace;
        $this->membership = $membership;
    }

    /**
     * Get active workspace.
     */
    public function getWorkspace(): ?Workspace
    {
        return $this->workspace;
    }

    /**
     * Get active workspace UUID.
     */
    public function getWorkspaceId(): ?string
    {
        return $this->workspace?->id;
    }

    /**
     * Get user membership in active workspace.
     */
    public function getMembership(): ?WorkspaceUser
    {
        return $this->membership;
    }

    /**
     * Check if a valid tenant context is active.
     */
    public function hasContext(): bool
    {
        return $this->workspace !== null;
    }

    /**
     * Check if tenant scope is currently bypassed for trusted system operations.
     */
    public function isBypassed(): bool
    {
        return $this->bypassScope;
    }

    /**
     * Clear the tenant context.
     * Prevents stale context leakage between requests, queued jobs, and test runs.
     */
    public function clear(): void
    {
        $this->workspace = null;
        $this->membership = null;
        $this->bypassScope = false;
    }

    /**
     * Execute a callback within an isolated workspace context (safe for jobs and scripts).
     * Automatically restores previous context upon completion or error.
     */
    public function runInContext(Workspace|string $workspace, callable $callback): mixed
    {
        $previousWorkspace = $this->workspace;
        $previousMembership = $this->membership;
        $previousBypass = $this->bypassScope;

        if (is_string($workspace)) {
            $resolved = Workspace::query()->find($workspace);
            if (! $resolved) {
                throw new MissingTenantContextException("Cannot run in context: Workspace [{$workspace}] not found.");
            }
            $workspace = $resolved;
        }

        $this->setWorkspace($workspace);

        try {
            return $callback($workspace);
        } finally {
            $this->workspace = $previousWorkspace;
            $this->membership = $previousMembership;
            $this->bypassScope = $previousBypass;
        }
    }

    /**
     * Execute a callback with tenant scoping explicitly bypassed.
     * Strictly reserved for trusted system-level operations, migrations, and platform reporting.
     */
    public function runWithoutTenantScope(callable $callback): mixed
    {
        $previousBypass = $this->bypassScope;
        $this->bypassScope = true;

        try {
            return $callback();
        } finally {
            $this->bypassScope = $previousBypass;
        }
    }
}
