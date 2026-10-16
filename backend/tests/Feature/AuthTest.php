<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('test@example.com|127.0.0.1');
    }

    public function test_user_can_register_with_valid_data_and_is_authenticated_in_session(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Jane Developer',
            'email' => 'jane@example.com',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'terms_accepted' => true,
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'user' => [
                    'id',
                    'name',
                    'email',
                    'phone',
                    'job_title',
                    'avatar_url',
                    'timezone',
                    'locale',
                    'role',
                    'workspaceId',
                ],
                'message',
            ])
            ->assertJsonMissingPath('user.password')
            ->assertJsonMissingPath('user.remember_token')
            ->assertJsonMissingPath('user.tokens')
            ->assertJson([
                'user' => [
                    'name' => 'Jane Developer',
                    'email' => 'jane@example.com',
                ],
                'message' => 'Account created successfully.',
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'jane@example.com',
            'name' => 'Jane Developer',
        ]);

        $this->assertTrue(Auth::check());
        $this->assertSame('jane@example.com', Auth::user()->email);
    }

    public function test_registration_fails_when_terms_are_not_accepted(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'No Terms User',
            'email' => 'noterms@example.com',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'terms_accepted' => false,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['terms_accepted']);

        $this->assertFalse(Auth::check());
    }

    public function test_registration_fails_when_password_confirmation_mismatches(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Mismatch User',
            'email' => 'mismatch@example.com',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'DifferentPass123!',
            'terms_accepted' => true,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);

        $this->assertFalse(Auth::check());
    }

    public function test_registration_fails_when_email_already_exists(): void
    {
        User::create([
            'name' => 'Existing User',
            'email' => 'existing@example.com',
            'password' => Hash::make('Password123!'),
        ]);

        $response = $this->postJson('/api/register', [
            'name' => 'Duplicate Attempt',
            'email' => 'existing@example.com',
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
            'terms_accepted' => true,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_user_can_login_with_correct_credentials_and_session_is_regenerated(): void
    {
        $user = User::create([
            'name' => 'John Login',
            'email' => 'john@example.com',
            'password' => Hash::make('CorrectPassword123!'),
        ]);

        $initialSessionId = session()->getId();

        $response = $this->postJson('/api/login', [
            'email' => 'john@example.com',
            'password' => 'CorrectPassword123!',
            'remember' => true,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user' => [
                    'id',
                    'name',
                    'email',
                ],
                'message',
            ])
            ->assertJsonMissingPath('user.password')
            ->assertJsonMissingPath('user.remember_token')
            ->assertJsonMissingPath('user.tokens')
            ->assertJson([
                'user' => [
                    'id' => (string) $user->id,
                    'name' => 'John Login',
                    'email' => 'john@example.com',
                ],
                'message' => 'Successfully signed in.',
            ]);

        $this->assertTrue(Auth::check());
        $this->assertSame($user->id, Auth::id());
        $this->assertNotEquals($initialSessionId, session()->getId());
    }

    public function test_login_fails_with_wrong_password(): void
    {
        User::create([
            'name' => 'John Login',
            'email' => 'john@example.com',
            'password' => Hash::make('CorrectPassword123!'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'john@example.com',
            'password' => 'WrongPassword999!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email'])
            ->assertJson([
                'message' => 'The provided credentials do not match our records.',
            ]);

        $this->assertFalse(Auth::check());
    }

    public function test_login_rate_limiting_triggers_too_many_requests_after_five_failed_attempts(): void
    {
        User::create([
            'name' => 'Throttle Target',
            'email' => 'throttle@example.com',
            'password' => Hash::make('CorrectPass123!'),
        ]);

        // 5 consecutive failed login attempts
        for ($i = 0; $i < 5; $i++) {
            $res = $this->postJson('/api/login', [
                'email' => 'throttle@example.com',
                'password' => 'BadPassword!',
            ]);
            $res->assertStatus(422);
        }

        // 6th attempt must be blocked by rate limiter with HTTP 429
        $throttledResponse = $this->postJson('/api/login', [
            'email' => 'throttle@example.com',
            'password' => 'BadPassword!',
        ]);

        $throttledResponse->assertStatus(429)
            ->assertJsonStructure([
                'message',
                'errors' => ['email'],
            ]);
    }

    public function test_authenticated_user_can_retrieve_profile_session_via_api_user(): void
    {
        $user = User::create([
            'name' => 'Current Session User',
            'email' => 'current@example.com',
            'password' => Hash::make('Password123!'),
        ]);

        $this->actingAs($user);

        $response = $this->getJson('/api/user');

        $response->assertStatus(200)
            ->assertJson([
                'id' => (string) $user->id,
                'name' => 'Current Session User',
                'email' => 'current@example.com',
            ])
            ->assertJsonMissingPath('password')
            ->assertJsonMissingPath('remember_token')
            ->assertJsonMissingPath('tokens');
    }

    public function test_auth_payload_includes_only_frontend_contract_fields_and_safe_workspace_membership_data(): void
    {
        $user = User::create([
            'name' => 'Payload User',
            'email' => 'payload@example.com',
            'password' => Hash::make('Password123!'),
        ]);
        $workspace = Workspace::createWithInitialOwner($user, [
            'name' => 'Payload Workspace',
            'slug' => 'payload-workspace',
        ]);

        $response = $this->actingAs($user)->getJson('/api/user');

        $response->assertOk()
            ->assertJsonStructure([
                'id',
                'name',
                'email',
                'phone',
                'job_title',
                'avatar_url',
                'timezone',
                'locale',
                'role',
                'workspaceId',
            ])
            ->assertJsonPath('role', 'owner')
            ->assertJsonPath('workspaceId', $workspace->id)
            ->assertJsonMissingPath('password')
            ->assertJsonMissingPath('remember_token')
            ->assertJsonMissingPath('tokens');
    }

    public function test_unauthenticated_request_to_api_user_returns_401(): void
    {
        $response = $this->getJson('/api/user');

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Unauthenticated.',
            ]);
    }

    public function test_user_can_logout_and_session_is_terminated(): void
    {
        $user = User::create([
            'name' => 'Logout User',
            'email' => 'logout@example.com',
            'password' => Hash::make('Password123!'),
        ]);

        $this->actingAs($user);
        $this->assertTrue(Auth::check());

        $response = $this->postJson('/api/logout');

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Successfully logged out.',
            ]);

        $this->assertFalse(Auth::check());

        // Subsequent call to /api/user should now be unauthenticated
        $this->getJson('/api/user')->assertStatus(401);
    }

    public function test_csrf_cookie_endpoint_returns_no_content_and_initializes_cookies(): void
    {
        $response = $this->get('/sanctum/csrf-cookie');

        $response->assertStatus(204);
        $response->assertCookie('XSRF-TOKEN');
    }

    public function test_csrf_protection_rejects_post_requests_with_invalid_or_missing_token(): void
    {
        $this->app->detectEnvironment(fn () => 'production');

        // Explicitly enable CSRF middleware for this test to verify security enforcement
        $this->withMiddleware([ValidateCsrfToken::class]);

        // Request with no CSRF token header or input
        $response = $this->call('POST', '/api/login', [
            'email' => 'csrf_test@example.com',
            'password' => 'SomePassword123!',
        ]);

        // Standard Laravel CSRF failure is HTTP 419
        $response->assertStatus(419);
    }
}
