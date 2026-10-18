<?php

namespace Tests\Feature\Api;

use App\Http\Controllers\Api\MetaIntegrationController;
use App\Http\Middleware\EnsureTenantContext;
use App\Http\Middleware\SetTenantContext;
use App\Models\MetaAdConnection;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class MetaIntegrationApiTest extends TestCase
{
    use RefreshDatabase;

    private array $originalEnvironment = [];

    protected function setUp(): void
    {
        parent::setUp();
        app(TenantContext::class)->clear();
        config(['app.key' => 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=']);

        Route::middleware(['auth', SetTenantContext::class, EnsureTenantContext::class])
            ->prefix('test-api/meta')
            ->group(function (): void {
                Route::get('/status', [MetaIntegrationController::class, 'status']);
                Route::post('/connect', [MetaIntegrationController::class, 'connect']);
                Route::get('/accounts', [MetaIntegrationController::class, 'accounts']);
                Route::get('/insights', [MetaIntegrationController::class, 'insights']);
                Route::delete('/connection', [MetaIntegrationController::class, 'disconnect']);
            });
        Route::middleware(['web', 'auth'])
            ->get('/test-api/meta/callback', [MetaIntegrationController::class, 'callback']);
    }

    protected function tearDown(): void
    {
        foreach ($this->originalEnvironment as $name => $value) {
            if ($value === false) {
                putenv($name);
                unset($_ENV[$name], $_SERVER[$name]);
            } else {
                putenv($name.'='.$value);
                $_ENV[$name] = $value;
                $_SERVER[$name] = $value;
            }
        }
        parent::tearDown();
    }

    public function test_oauth_state_must_match_the_initiating_session(): void
    {
        $user = $this->createUser('meta-state@example.test');
        $workspace = $this->createWorkspace($user);

        $this->actingAs($user)
            ->withSession(['meta_ads_oauth_state' => [
                'state' => str_repeat('a', 64),
                'workspace_id' => $workspace->id,
                'user_id' => $user->id,
                'issued_at' => now()->timestamp,
            ]])
            ->getJson('/test-api/meta/callback?code=authorization-code&state='.str_repeat('b', 64))
            ->assertStatus(419);

        $this->assertDatabaseCount('meta_ad_connections', 0);
    }

    public function test_oauth_callback_encrypts_the_token_and_never_returns_it(): void
    {
        $this->setMetaEnvironment();
        Http::fake([
            'https://graph.facebook.com/v25.0/oauth/access_token*' => Http::response([
                'access_token' => 'sensitive-meta-token',
                'expires_in' => 3600,
                'user_id' => 'meta-user-1',
                'granted_scopes' => 'ads_read,read_insights',
            ]),
        ]);
        $user = $this->createUser('meta-callback@example.test');
        $workspace = $this->createWorkspace($user);
        $state = str_repeat('c', 64);

        $response = $this->actingAs($user)
            ->withSession(['meta_ads_oauth_state' => [
                'state' => $state,
                'workspace_id' => $workspace->id,
                'user_id' => $user->id,
                'issued_at' => now()->timestamp,
            ]])
            ->get('/test-api/meta/callback?code=temporary-code&state='.$state);

        $response->assertRedirect();
        $rawToken = DB::table('meta_ad_connections')->where('workspace_id', $workspace->id)->value('access_token');
        $this->assertIsString($rawToken);
        $this->assertNotSame('sensitive-meta-token', $rawToken);
        $connection = MetaAdConnection::query()->where('workspace_id', $workspace->id)->firstOrFail();
        $this->assertSame('sensitive-meta-token', $connection->access_token);
        $this->assertSame('connected', $connection->status);
        $this->assertStringNotContainsString('sensitive-meta-token', $response->getContent());
    }

    public function test_connection_status_is_workspace_scoped_and_viewers_cannot_connect(): void
    {
        $owner = $this->createUser('meta-status-owner@example.test');
        $viewer = $this->createUser('meta-status-viewer@example.test');
        $workspace = $this->createWorkspace($owner);
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $viewer->id,
            'role' => WorkspaceUser::ROLE_VIEWER,
        ]);
        MetaAdConnection::create([
            'workspace_id' => $workspace->id,
            'user_id' => $owner->id,
            'access_token' => 'secret-in-database',
            'status' => 'connected',
            'scopes' => ['ads_read'],
        ]);

        $this->actingAs($viewer)->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/test-api/meta/status')
            ->assertOk()
            ->assertJsonPath('data.connected', true)
            ->assertJsonMissingPath('data.access_token');

        $this->postJson('/test-api/meta/connect')->assertForbidden();
    }

    private function setMetaEnvironment(): void
    {
        foreach ([
            'META_APP_ID' => 'test-app-id',
            'META_APP_SECRET' => 'test-app-secret',
            'META_OAUTH_REDIRECT_URI' => 'http://localhost/test-api/meta/callback',
            'META_FRONTEND_REDIRECT_URI' => 'http://localhost/integrations/meta',
            'META_GRAPH_API_VERSION' => 'v25.0',
        ] as $name => $value) {
            $this->originalEnvironment[$name] = getenv($name);
            putenv($name.'='.$value);
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }

    private function createUser(string $email): User
    {
        return User::create(['name' => 'Meta User', 'email' => $email, 'password' => 'password']);
    }

    private function createWorkspace(User $owner): Workspace
    {
        return Workspace::createWithInitialOwner($owner, [
            'name' => 'Meta workspace '.$owner->id,
            'slug' => 'meta-workspace-'.$owner->id,
        ]);
    }
}