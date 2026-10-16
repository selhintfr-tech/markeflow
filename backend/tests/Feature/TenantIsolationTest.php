<?php

namespace Tests\Feature;

use App\Exceptions\MissingTenantContextException;
use App\Exceptions\TenantImmutabilityException;
use App\Exceptions\TenantMismatchException;
use App\Http\Middleware\EnsureTenantContext;
use App\Http\Middleware\SetTenantContext;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceAuditLog;
use App\Models\WorkspaceInvitation;
use App\Models\WorkspaceSetting;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(TenantContext::class)->clear();
    }

    public function test_workspace_owned_queries_fail_closed_and_are_scoped(): void
    {
        $firstWorkspace = $this->createWorkspace('First workspace');
        $secondWorkspace = $this->createWorkspace('Second workspace');
        $user = User::create([
            'name' => 'Inviter',
            'email' => 'inviter@example.test',
            'password' => 'password',
        ]);

        app(TenantContext::class)->runInContext($firstWorkspace, function () {
            WorkspaceSetting::create(['settings' => ['theme' => 'light']]);
        });
        app(TenantContext::class)->runInContext($secondWorkspace, function () use ($user) {
            WorkspaceSetting::create(['settings' => ['theme' => 'dark']]);
            WorkspaceInvitation::create([
                'email' => 'invite@example.test',
                'role' => WorkspaceUser::ROLE_MEMBER,
                'token_hash' => hash('sha256', 'invitation-token'),
                'invited_by' => $user->id,
                'expires_at' => now()->addDay(),
            ]);
            WorkspaceAuditLog::create([
                'action' => 'created',
                'entity_type' => 'campaign',
                'entity_id' => 'campaign-1',
                'created_at' => now(),
            ]);
        });

        $this->assertSame(0, WorkspaceSetting::query()->count());
        $this->assertSame(0, WorkspaceInvitation::query()->count());
        $this->assertSame(0, WorkspaceAuditLog::query()->count());

        app(TenantContext::class)->runInContext($firstWorkspace, function () {
            $this->assertSame(1, WorkspaceSetting::query()->count());
            $this->assertSame('light', WorkspaceSetting::query()->first()->get('theme'));
            $this->assertSame(0, WorkspaceInvitation::query()->count());
            $this->assertSame(0, WorkspaceAuditLog::query()->count());
        });

        app(TenantContext::class)->runInContext($secondWorkspace, function () {
            $this->assertSame(1, WorkspaceSetting::query()->count());
            $this->assertSame(1, WorkspaceInvitation::query()->count());
            $this->assertSame(1, WorkspaceAuditLog::query()->count());
        });
    }

    public function test_workspace_owned_writes_require_context_and_reject_cross_tenant_ownership(): void
    {
        $firstWorkspace = $this->createWorkspace('First workspace');
        $secondWorkspace = $this->createWorkspace('Second workspace');

        try {
            WorkspaceSetting::create(['settings' => ['theme' => 'light']]);
            $this->fail('A tenant-owned record was created without a tenant context.');
        } catch (MissingTenantContextException) {
            $this->assertSame(
                0,
                app(TenantContext::class)->runWithoutTenantScope(
                    fn () => WorkspaceSetting::withoutGlobalScopes()->count()
                )
            );
        }

        app(TenantContext::class)->runInContext($firstWorkspace, function () use ($secondWorkspace) {
            $this->expectException(TenantMismatchException::class);
            WorkspaceSetting::create([
                'workspace_id' => $secondWorkspace->id,
                'settings' => ['theme' => 'dark'],
            ]);
        });
    }

    public function test_workspace_ownership_cannot_be_changed_through_model_or_bulk_updates(): void
    {
        $firstWorkspace = $this->createWorkspace('First workspace');
        $secondWorkspace = $this->createWorkspace('Second workspace');
        $setting = app(TenantContext::class)->runInContext($firstWorkspace, function () {
            return WorkspaceSetting::create(['settings' => ['theme' => 'light']]);
        });

        app(TenantContext::class)->runInContext($firstWorkspace, function () use ($setting, $secondWorkspace) {
            $setting->workspace_id = $secondWorkspace->id;
            $this->expectException(TenantImmutabilityException::class);
            $setting->save();
        });
    }

    public function test_bulk_updates_cannot_reassign_workspace_ownership(): void
    {
        $firstWorkspace = $this->createWorkspace('First workspace');
        $secondWorkspace = $this->createWorkspace('Second workspace');
        app(TenantContext::class)->runInContext($firstWorkspace, function () {
            WorkspaceSetting::create(['settings' => ['theme' => 'light']]);
        });

        app(TenantContext::class)->runInContext($firstWorkspace, function () use ($secondWorkspace) {
            $this->expectException(TenantImmutabilityException::class);
            WorkspaceSetting::query()->update(['workspace_id' => $secondWorkspace->id]);
        });
    }

    public function test_upserts_require_the_active_workspace_and_cannot_reassign_ownership(): void
    {
        $firstWorkspace = $this->createWorkspace('First workspace');

        app(TenantContext::class)->runInContext($firstWorkspace, function () {
            $this->expectException(TenantImmutabilityException::class);
            WorkspaceSetting::query()->upsert([
                'settings' => json_encode(['theme' => 'light']),
            ], ['workspace_id']);
        });
    }

    public function test_bulk_inserts_require_and_use_the_active_workspace(): void
    {
        $workspace = $this->createWorkspace('First workspace');
        $otherWorkspace = $this->createWorkspace('Second workspace');

        try {
            WorkspaceSetting::query()->insert([
                'id' => (string) Str::uuid(),
                'settings' => json_encode(['theme' => 'light']),
            ]);
            $this->fail('A tenant-owned record was inserted without a tenant context.');
        } catch (MissingTenantContextException) {
            $this->assertSame(0, WorkspaceSetting::query()->count());
        }

        app(TenantContext::class)->runInContext($workspace, function () use ($workspace, $otherWorkspace) {
            try {
                WorkspaceSetting::query()->insert([
                    'id' => (string) Str::uuid(),
                    'workspace_id' => $otherWorkspace->id,
                    'settings' => json_encode(['theme' => 'dark']),
                ]);
                $this->fail('A bulk insert accepted a workspace ID outside the active context.');
            } catch (TenantMismatchException) {
                $this->assertSame(0, WorkspaceSetting::query()->count());
            }

            WorkspaceSetting::query()->insert([
                'id' => (string) Str::uuid(),
                'settings' => json_encode(['theme' => 'light']),
            ]);
            $this->assertSame($workspace->id, WorkspaceSetting::query()->value('workspace_id'));
        });
    }

    public function test_workspace_scope_cannot_be_removed_outside_trusted_system_scope(): void
    {
        $this->expectException(TenantImmutabilityException::class);

        WorkspaceSetting::withoutGlobalScopes()->delete();
    }

    public function test_bulk_force_delete_remains_scoped_to_the_active_workspace(): void
    {
        $firstWorkspace = $this->createWorkspace('First workspace');
        $secondWorkspace = $this->createWorkspace('Second workspace');

        app(TenantContext::class)->runInContext($firstWorkspace, function () {
            WorkspaceSetting::create(['settings' => ['theme' => 'light']]);
        });
        app(TenantContext::class)->runInContext($secondWorkspace, function () {
            WorkspaceSetting::create(['settings' => ['theme' => 'dark']]);
        });

        app(TenantContext::class)->runInContext($firstWorkspace, function () {
            WorkspaceSetting::query()->forceDelete();
            $this->assertSame(0, WorkspaceSetting::query()->count());
        });

        app(TenantContext::class)->runInContext($secondWorkspace, function () {
            $this->assertSame(1, WorkspaceSetting::query()->count());
        });
    }

    public function test_request_middleware_verifies_membership_and_clears_context(): void
    {
        $workspace = $this->createWorkspace('First workspace');
        $user = User::create([
            'name' => 'Member',
            'email' => 'member@example.test',
            'password' => 'password',
        ]);
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'role' => WorkspaceUser::ROLE_MEMBER,
        ]);

        $request = Request::create('/tenant', 'GET', [], [], [], [
            'HTTP_X_WORKSPACE_ID' => $workspace->id,
        ]);
        $request->setUserResolver(fn () => $user);

        $response = app(SetTenantContext::class)->handle($request, function () use ($workspace, $request) {
            $this->assertSame($workspace->id, app(TenantContext::class)->getWorkspaceId());
            $this->assertNotNull(app(TenantContext::class)->getMembership());
            $this->assertSame(
                Response::HTTP_OK,
                app(EnsureTenantContext::class)->handle($request, fn () => new Response)->getStatusCode()
            );

            return new Response;
        });

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
        $this->assertNull(app(TenantContext::class)->getWorkspace());
        $this->assertNull(app(TenantContext::class)->getMembership());
    }

    public function test_request_middleware_rejects_non_members_and_cleans_context_on_exceptions(): void
    {
        $workspace = $this->createWorkspace('First workspace');
        $user = User::create([
            'name' => 'Non-member',
            'email' => 'non-member@example.test',
            'password' => 'password',
        ]);
        $request = Request::create('/tenant', 'GET', [], [], [], [
            'HTTP_X_WORKSPACE_ID' => $workspace->id,
        ]);
        $request->setUserResolver(fn () => $user);

        $response = app(SetTenantContext::class)->handle($request, fn () => new Response);

        $this->assertSame(Response::HTTP_FORBIDDEN, $response->getStatusCode());
        $this->assertNull(app(TenantContext::class)->getWorkspace());

        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'role' => WorkspaceUser::ROLE_MEMBER,
        ]);

        try {
            app(SetTenantContext::class)->handle($request, function () {
                throw new \RuntimeException('Request failed.');
            });
            $this->fail('The middleware did not propagate the downstream exception.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Request failed.', $exception->getMessage());
            $this->assertNull(app(TenantContext::class)->getWorkspace());
            $this->assertNull(app(TenantContext::class)->getMembership());
        }
    }

    public function test_tenant_required_middleware_requires_authenticated_verified_membership(): void
    {
        $workspace = $this->createWorkspace('First workspace');
        $user = User::create([
            'name' => 'Member',
            'email' => 'member@example.test',
            'password' => 'password',
        ]);
        $request = Request::create('/tenant');
        $request->setUserResolver(fn () => $user);

        $response = app(EnsureTenantContext::class)->handle($request, fn () => new Response);

        $this->assertSame(Response::HTTP_FORBIDDEN, $response->getStatusCode());

        $request->setUserResolver(fn () => null);
        $response = app(EnsureTenantContext::class)->handle($request, fn () => new Response);

        $this->assertSame(Response::HTTP_UNAUTHORIZED, $response->getStatusCode());
    }

    private function createWorkspace(string $name): Workspace
    {
        return Workspace::create([
            'name' => $name,
            'slug' => str($name)->slug().'-'.uniqid(),
        ]);
    }
}
