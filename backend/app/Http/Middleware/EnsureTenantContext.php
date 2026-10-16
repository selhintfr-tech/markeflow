<?php

namespace App\Http\Middleware;

use App\Services\TenantContext;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantContext
{
    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    /**
     * Handle an incoming request.
     * Guarantees that a verified active tenant context is present on tenant-required routes.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return new JsonResponse([
                'message' => 'Unauthenticated access to workspace resources.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $workspace = $this->tenantContext->getWorkspace();
        $membership = $this->tenantContext->getMembership();

        if (
            ! $workspace
            || $workspace->status !== 'Active'
            || ! $membership
            || $membership->workspace_id !== $workspace->id
            || $membership->user_id !== $user->id
        ) {
            return new JsonResponse([
                'message' => 'A valid workspace context is required for this operation. Please supply a valid X-Workspace-Id header.',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
