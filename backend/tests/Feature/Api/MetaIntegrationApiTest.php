<?php

namespace Tests\Feature\Api;

use App\Models\MetaAdConnection;
use App\Models\MetaOAuthTransaction;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
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

    public function test_unauthenticated_oauth_initiation_returns_json_401(): void
    {
        $this->post('/api/integrations/meta/connect')
            ->assertUnauthorized()
            ->assertHeader('Content-Type', 'application/json');
    }

    public function test_tampered_state_is_rejected_without_exchanging_the_code(): void
    {
        $this->setMetaEnvironment();
        Http::fake();
        $user = $this->createUser('meta-state@example.test');
        $workspace = $this->createWorkspace($user);
        $state = $this->startOAuth($user, $workspace);
        $tamperedState = ($state[0] === 'a' ? 'b' : 'a').substr($state, 1);

        $response = $this->get('/api/integrations/meta/callback?code=authorization-code&state='.$tamperedState);

        $response->assertRedirect('http://localhost/integrations/meta?meta_status=error');
        $this->get('/api/integrations/meta/callback?code=missing-state-code')
            ->assertRedirect('http://localhost/integrations/meta?meta_status=error');
        Http::assertNothingSent();
        $this->assertDatabaseCount('meta_ad_connections', 0);
        $this->assertDatabaseCount('meta_oauth_transactions', 1);
    }

    public function test_oauth_authorization_requests_only_ads_read_permission(): void
    {
        $this->setMetaEnvironment();
        $user = $this->createUser('meta-permissions@example.test');
        $workspace = $this->createWorkspace($user);

        $response = $this->actingAs($user)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/integrations/meta/connect')
            ->assertOk();

        $authorizationUrl = $response->json('data.authorization_url');
        parse_str((string) parse_url($authorizationUrl, PHP_URL_QUERY), $query);

        $this->assertSame('ads_read', $query['scope'] ?? null);
        $this->assertStringNotContainsString('read_insights', $authorizationUrl);
        $this->assertSame('code', $query['response_type'] ?? null);
        $this->assertNotEmpty($query['state'] ?? null);
    }

    public function test_oauth_callback_encrypts_the_token_and_never_returns_it(): void
    {
        $this->setMetaEnvironment();
        $user = $this->createUser('meta-callback@example.test');
        $workspace = $this->createWorkspace($user);
        $state = $this->startOAuth($user, $workspace);
        $otherUser = $this->createUser('meta-other-callback@example.test');
        $otherWorkspace = $this->createWorkspace($otherUser);
        Http::fake([
            'https://graph.facebook.com/v25.0/oauth/access_token*' => Http::response([
                'access_token' => 'sensitive-meta-token',
                'expires_in' => 3600,
                'user_id' => 'meta-user-1',
            ]),
        ]);

        Auth::forgetGuards();
        $response = $this->get('/api/integrations/meta/callback?'.http_build_query([
            'code' => 'temporary-code',
            'state' => $state,
            'user_id' => $otherUser->id,
            'workspace_id' => $otherWorkspace->id,
        ]));

        Http::assertSentCount(1);
        $response->assertRedirect('http://localhost/integrations/meta?meta_status=connected');
        $rawToken = DB::table('meta_ad_connections')->where('workspace_id', $workspace->id)->value('access_token');
        $this->assertIsString($rawToken);
        $this->assertNotSame('sensitive-meta-token', $rawToken);
        $connection = MetaAdConnection::query()->where('workspace_id', $workspace->id)->firstOrFail();
        $this->assertSame('sensitive-meta-token', $connection->access_token);
        $this->assertSame('connected', $connection->status);
        $this->assertSame(['ads_read'], $connection->scopes);
        $this->assertStringNotContainsString('sensitive-meta-token', $response->getContent());
        $this->assertDatabaseMissing('meta_ad_connections', ['workspace_id' => $otherWorkspace->id]);
        $this->assertDatabaseHas('meta_ad_connections', ['workspace_id' => $workspace->id, 'user_id' => $user->id]);
        $this->assertDatabaseCount('meta_oauth_transactions', 0);
        $this->assertDatabaseMissing('meta_oauth_transactions', ['state_hash' => $state]);
    }

    public function test_expired_state_is_consumed_and_never_exchanges_the_code(): void
    {
        $this->setMetaEnvironment();
        Http::fake();
        $user = $this->createUser('meta-expired@example.test');
        $workspace = $this->createWorkspace($user);
        $state = bin2hex(random_bytes(32));
        MetaOAuthTransaction::create([
            'state_hash' => hash('sha256', $state),
            'user_id' => $user->id,
            'workspace_id' => $workspace->id,
            'expires_at' => now()->subSecond(),
        ]);

        $this->get('/api/integrations/meta/callback?'.http_build_query([
            'state' => $state,
            'code' => 'expired-code',
        ]))->assertRedirect('http://localhost/integrations/meta?meta_status=error');

        Http::assertNothingSent();
        $this->assertDatabaseCount('meta_oauth_transactions', 0);
        $this->assertDatabaseCount('meta_ad_connections', 0);
    }

    public function test_callback_state_can_only_be_used_once(): void
    {
        $this->setMetaEnvironment();
        $user = $this->createUser('meta-reused@example.test');
        $workspace = $this->createWorkspace($user);
        $state = $this->startOAuth($user, $workspace);
        Http::fake([
            'https://graph.facebook.com/v25.0/oauth/access_token*' => Http::response([
                'access_token' => 'single-use-token',
                'expires_in' => 3600,
                'user_id' => 'meta-user-once',
            ]),
        ]);

        $this->get('/api/integrations/meta/callback?'.http_build_query([
            'state' => $state,
            'code' => 'one-time-code',
        ]))->assertRedirect('http://localhost/integrations/meta?meta_status=connected');

        $this->get('/api/integrations/meta/callback?'.http_build_query([
            'state' => $state,
            'code' => 'reused-code',
        ]))->assertRedirect('http://localhost/integrations/meta?meta_status=error');

        Http::assertSentCount(1);
        $this->assertDatabaseHas('meta_ad_connections', ['workspace_id' => $workspace->id, 'user_id' => $user->id]);
    }

    public function test_exchange_transport_errors_redirect_without_echoing_sensitive_values(): void
    {
        $this->setMetaEnvironment();
        $user = $this->createUser('meta-transport-error@example.test');
        $workspace = $this->createWorkspace($user);
        $state = $this->startOAuth($user, $workspace);
        Http::fake(fn () => throw new ConnectionException('code=private-code client_secret=private-secret'));
        Auth::forgetGuards();

        $this->get('/api/integrations/meta/callback?'.http_build_query([
            'state' => $state,
            'code' => 'sensitive-code-value',
        ]))
            ->assertRedirect('http://localhost/integrations/meta?meta_status=error')
            ->assertDontSee('private-code')
            ->assertDontSee('private-secret')
            ->assertDontSee('sensitive-code-value');
    }

    public function test_callback_rechecks_initiating_workspace_membership(): void
    {
        $this->setMetaEnvironment();
        Http::fake();
        $user = $this->createUser('meta-removed-member@example.test');
        $workspace = $this->createWorkspace($user);
        $state = $this->startOAuth($user, $workspace);
        WorkspaceUser::query()
            ->where('workspace_id', $workspace->id)
            ->where('user_id', $user->id)
            ->delete();

        $this->get('/api/integrations/meta/callback?'.http_build_query([
            'state' => $state,
            'code' => 'membership-revoked-code',
        ]))->assertRedirect('http://localhost/integrations/meta?meta_status=error');

        Http::assertNothingSent();
        $this->assertDatabaseCount('meta_ad_connections', 0);
        $this->assertDatabaseCount('meta_oauth_transactions', 0);
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
            ->getJson('/api/integrations/meta/status')
            ->assertOk()
            ->assertJsonPath('data.connected', true)
            ->assertJsonMissingPath('data.access_token');

        $this->postJson('/api/integrations/meta/connect')->assertForbidden();
    }

    public function test_active_workspace_connection_cannot_be_silently_replaced(): void
    {
        $this->setMetaEnvironment();
        $user = $this->createUser('meta-no-replace@example.test');
        $workspace = $this->createWorkspace($user);
        MetaAdConnection::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'meta_user_id' => 'existing-meta-user',
            'access_token' => 'existing-working-token',
            'status' => 'connected',
            'scopes' => ['ads_read'],
        ]);

        $this->actingAs($user)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/integrations/meta/connect')
            ->assertConflict()
            ->assertJsonPath('message', 'This workspace already has an active Meta Ads connection. Disconnect it explicitly before connecting another account.');

        $connection = MetaAdConnection::query()->where('workspace_id', $workspace->id)->firstOrFail();
        $this->assertSame('existing-working-token', $connection->access_token);
        $this->assertSame('existing-meta-user', $connection->meta_user_id);
        $this->assertDatabaseCount('meta_oauth_transactions', 0);
    }

    public function test_preferred_ad_account_is_validated_and_restored_from_workspace_connection(): void
    {
        $this->setMetaEnvironment();
        $user = $this->createUser('meta-preferred@example.test');
        $workspace = $this->createWorkspace($user);
        MetaAdConnection::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'access_token' => 'preferred-account-token',
            'status' => 'connected',
            'scopes' => ['ads_read'],
        ]);
        Http::fake([
            'https://graph.facebook.com/v25.0/me/adaccounts*' => Http::response([
                'data' => [
                    ['id' => 'act_12345', 'name' => 'Luxe Store Ads'],
                    ['id' => 'act_98765', 'name' => 'Second authorized account'],
                ],
            ]),
        ]);

        $this->actingAs($user)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->putJson('/api/integrations/meta/preferred-account', ['account_id' => 'act_98765'])
            ->assertOk()
            ->assertJsonPath('data.preferred_account_id', 'act_98765');

        $this->getJson('/api/integrations/meta/status')
            ->assertOk()
            ->assertJsonPath('data.connected', true)
            ->assertJsonPath('data.preferred_account_id', 'act_98765')
            ->assertJsonMissingPath('data.access_token');

        $this->putJson('/api/integrations/meta/preferred-account', ['account_id' => 'act_00000'])
            ->assertForbidden();
        $this->assertDatabaseHas('meta_ad_connections', [
            'workspace_id' => $workspace->id,
            'preferred_account_id' => 'act_98765',
        ]);
    }

    public function test_expired_token_is_reflected_in_status_without_deleting_the_token(): void
    {
        $user = $this->createUser('meta-expired-status@example.test');
        $workspace = $this->createWorkspace($user);
        MetaAdConnection::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'access_token' => 'preserve-this-expired-token',
            'token_expires_at' => now()->subMinute(),
            'status' => 'connected',
            'scopes' => ['ads_read'],
        ]);

        $this->actingAs($user)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/integrations/meta/status')
            ->assertOk()
            ->assertJsonPath('data.connected', false)
            ->assertJsonPath('data.status', 'expired');

        $connection = MetaAdConnection::query()->where('workspace_id', $workspace->id)->firstOrFail();
        $this->assertSame('preserve-this-expired-token', $connection->access_token);
        $this->assertSame('expired', $connection->status);
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

    private function startOAuth(User $user, Workspace $workspace): string
    {
        $response = $this->actingAs($user)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/integrations/meta/connect')
            ->assertOk();
        $authorizationUrl = $response->json('data.authorization_url');
        parse_str((string) parse_url($authorizationUrl, PHP_URL_QUERY), $query);

        $this->assertSame('ads_read', $query['scope'] ?? null);
        $state = $query['state'] ?? '';
        $this->assertMatchesRegularExpression('/\A[a-f0-9]{64}\z/', $state);
        $this->assertDatabaseHas('meta_oauth_transactions', [
            'state_hash' => hash('sha256', $state),
            'user_id' => $user->id,
            'workspace_id' => $workspace->id,
        ]);
        $this->assertDatabaseMissing('meta_oauth_transactions', ['state_hash' => $state]);

        return $state;
    }
}