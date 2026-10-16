<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreWorkspaceRequest;
use App\Http\Requests\Api\UpdateWorkspaceRequest;
use App\Http\Resources\Api\WorkspaceResource;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceAuditLog;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WorkspaceController extends Controller
{
    /**
     * Display a listing of workspaces for the authenticated user.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        $query = $user->workspaces()
            ->withPivot(['id', 'role', 'job_title', 'joined_at'])
            ->withCount('members');

        // Optional search filtering
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('industry', 'like', "%{$search}%");
            });
        }

        // Optional business type filter
        if ($businessType = $request->query('business_type')) {
            $query->where('business_type', $businessType);
        }

        // Optional status filter
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $perPage = (int) $request->query('per_page', 0);
        $workspaces = $perPage > 0
            ? $query->paginate($perPage)
            : $query->orderBy('name')->get();

        return WorkspaceResource::collection($workspaces);
    }

    /**
     * Store a newly created workspace in storage.
     * Enforces atomic creation with initial owner, settings, and audit log.
     */
    public function store(StoreWorkspaceRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validated();

        // Generate unique slug if not explicitly provided
        if (empty($validated['slug'])) {
            $baseSlug = Str::slug($validated['name']);
            $slug = $baseSlug;
            $counter = 1;

            while (Workspace::where('slug', $slug)->exists()) {
                $slug = "{$baseSlug}-{$counter}";
                $counter++;
            }
            $validated['slug'] = $slug;
        }

        // Set defaults if missing
        $validated['business_type'] = $validated['business_type'] ?? Workspace::TYPE_GENERAL;
        $validated['currency'] = $validated['currency'] ?? 'MAD';
        $validated['timezone'] = $validated['timezone'] ?? 'Africa/Casablanca';
        $validated['date_format'] = $validated['date_format'] ?? 'DD/MM/YYYY';
        $validated['status'] = 'Active';

        // Strip any client attempts to control owner ID, workspace ID, or role
        unset($validated['id'], $validated['owner_id'], $validated['role'], $validated['user_id']);

        $workspace = Workspace::createWithInitialOwner($user, $validated);

        return (new WorkspaceResource($workspace))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified workspace for an authorized member.
     */
    public function show(Request $request, Workspace $workspace): WorkspaceResource
    {
        /** @var User $user */
        $user = $request->user();

        // Enforce server-side authorization check via WorkspacePolicy
        if (! $user || ! $user->can('view', $workspace)) {
            abort(403, 'Unauthorized. You must be an active member of this workspace.');
        }

        $workspace->loadCount('members');

        return new WorkspaceResource($workspace);
    }

    /**
     * Update the specified workspace in storage.
     */
    public function update(UpdateWorkspaceRequest $request, Workspace $workspace): WorkspaceResource
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validated();

        // Strip immutable tenant fields
        unset($validated['id'], $validated['owner_id'], $validated['role'], $validated['user_id']);

        DB::transaction(function () use ($workspace, $validated, $user) {
            $workspace->update($validated);

            // Run audit logging within the workspace tenant context
            app(TenantContext::class)->runInContext($workspace, function () use ($workspace, $validated, $user) {
                WorkspaceAuditLog::log(
                    $workspace,
                    'workspace.updated',
                    'Workspace',
                    $workspace->id,
                    $validated,
                    $user->id
                );
            });
        });

        $workspace->loadCount('members');

        return new WorkspaceResource($workspace->fresh());
    }

    /**
     * Remove the specified workspace from storage.
     * Enforces owner-only authorization and destructive cascading.
     */
    public function destroy(Request $request, Workspace $workspace): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        // Only the workspace owner has permission to delete the workspace
        if (! $user || ! $user->can('delete', $workspace)) {
            abort(403, 'Unauthorized. Only the workspace owner can delete this workspace.');
        }

        DB::transaction(function () use ($workspace, $user) {
            app(TenantContext::class)->runInContext($workspace, function () use ($workspace, $user) {
                WorkspaceAuditLog::log(
                    $workspace,
                    'workspace.deleted',
                    'Workspace',
                    $workspace->id,
                    ['name' => $workspace->name],
                    $user->id
                );
            });

            // Cascade delete settings, memberships, and workspace record
            $workspace->settings()?->delete();
            $workspace->members()->delete();
            $workspace->invitations()->delete();
            $workspace->delete();
        });

        return response()->json([
            'message' => 'Workspace deleted successfully.',
        ], 200);
    }
}
