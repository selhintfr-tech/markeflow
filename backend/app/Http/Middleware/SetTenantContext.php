<?php

namespace App\Http\Middleware;

use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetTenantContext
{
    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    /**
     * Handle an incoming request.
     * Enforces server-side workspace authorization and context initialization.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $this->tenantContext->clear();

        try {
            $user = $request->user();

            // Resolve the candidate workspace ID from the header or route parameters.
            $workspaceParam = $request->header('X-Workspace-Id')
                ?? $request->route('workspace_id')
                ?? $request->route('workspace');

            $workspaceId = $workspaceParam instanceof Workspace ? $workspaceParam->id : $workspaceParam;

            if ($workspaceId !== null) {
                if (! is_string($workspaceId) || $workspaceId === '') {
                    return new JsonResponse([
                        'message' => 'Invalid workspace identifier.',
                    ], Response::HTTP_BAD_REQUEST);
                }

                if (! $user) {
                    return new JsonResponse([
                        'message' => 'Unauthenticated access to workspace resources.',
                    ], Response::HTTP_UNAUTHORIZED);
                }

                // Verify membership directly against the database, not client-provided claims.
                /** @var WorkspaceUser|null $membership */
                $membership = WorkspaceUser::query()
                    ->where('workspace_id', $workspaceId)
                    ->where('user_id', $user->id)
                    ->first();

                if (! $membership) {
                    return new JsonResponse([
                        'message' => 'Unauthorized workspace access. You are not a member of this workspace.',
                    ], Response::HTTP_FORBIDDEN);
                }

                /** @var Workspace|null $workspace */
                $workspace = Workspace::query()->find($workspaceId);

                if (! $workspace || $workspace->status !== 'Active') {
                    return new JsonResponse([
                        'message' => 'The requested workspace is inactive or suspended.',
                    ], Response::HTTP_FORBIDDEN);
                }

                $this->tenantContext->setWorkspace($workspace, $membership);
            }

            return $next($request);
        } finally {
            $this->tenantContext->clear();
        }
    }

    /**
     * Terminate request lifecycle and prevent context leakage across requests.
     */
    public function terminate(Request $request, Response $response): void
    {
        $this->tenantContext->clear();
    }
}
