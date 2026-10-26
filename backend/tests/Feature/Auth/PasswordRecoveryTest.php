<?php

namespace Tests\Feature\Auth;

use App\Models\PasswordRecoveryCode;
use App\Models\User;
use App\Notifications\PasswordRecoveryCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class PasswordRecoveryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['mail.default' => 'smtp']);
    }

    public function test_existing_and_unknown_emails_receive_the_same_generic_response(): void
    {
        Notification::fake();
        $user = $this->createUser('recovery@example.test');

        $existing = $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        $unknown = $this->postJson('/api/forgot-password', ['email' => 'unknown@example.test'])->assertOk();

        $this->assertSame($existing->json(), $unknown->json());
        $this->assertSame(
            'If an account exists for that email address, a verification code will be sent.',
            $existing->json('message')
        );
        Notification::assertSentTo($user, PasswordRecoveryCodeNotification::class);
        $record = PasswordRecoveryCode::query()->where('user_id', $user->id)->firstOrFail();
        $notification = Notification::sent($user, PasswordRecoveryCodeNotification::class)->first();
        $this->assertMatchesRegularExpression('/^\d{6}$/', $notification->code);
        $this->assertTrue(Hash::check($notification->code, $record->code_hash));
        $this->assertNotSame($notification->code, $record->code_hash);
        $this->assertSame(0, $record->attempts);
        $this->assertTrue($record->expires_at->isFuture());
        $this->assertDatabaseMissing('password_recovery_codes', ['user_id' => 0]);
    }

    public function test_valid_code_verifies_once_then_allows_password_reset_and_login(): void
    {
        Notification::fake();
        $user = $this->createUser('reset-success@example.test');
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        $notification = Notification::sent($user, PasswordRecoveryCodeNotification::class)->first();

        $verified = $this->postJson('/api/verify-recovery-code', [
            'email' => $user->email,
            'code' => $notification->code,
        ])->assertOk()
            ->assertJsonPath('message', 'Email verification successful. You can now choose a new password.');

        $recoveryToken = $verified->json('recovery_token');
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $recoveryToken);
        $this->postJson('/api/verify-recovery-code', [
            'email' => $user->email,
            'code' => $notification->code,
        ])->assertUnprocessable();
        $record = PasswordRecoveryCode::query()->where('user_id', $user->id)->firstOrFail();
        $this->assertNotSame($recoveryToken, $record->recovery_token_hash);
        $this->assertSame(hash('sha256', $recoveryToken), $record->recovery_token_hash);

        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'recovery_token' => $recoveryToken,
            'password' => 'NewSecurePassword123',
            'password_confirmation' => 'NewSecurePassword123',
        ])->assertOk()
            ->assertJsonPath('message', 'Your password has been reset successfully. You may now sign in.');

        $this->assertTrue(Hash::check('NewSecurePassword123', $user->fresh()->password));
        $this->assertDatabaseMissing('password_recovery_codes', ['user_id' => $user->id]);
        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'recovery_token' => $recoveryToken,
            'password' => 'AnotherSecurePassword123',
            'password_confirmation' => 'AnotherSecurePassword123',
        ])->assertUnprocessable();

        $this->postJson('/api/login', ['email' => strtoupper($user->email), 'password' => 'NewSecurePassword123'])
            ->assertOk()
            ->assertJsonPath('user.email', $user->email);
    }

    public function test_incorrect_code_consumes_limited_attempts_without_revealing_account_existence(): void
    {
        Notification::fake();
        $user = $this->createUser('wrong-code@example.test');
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/verify-recovery-code', [
                'email' => $user->email,
                'code' => '000000',
            ])->assertUnprocessable()
                ->assertJsonPath('message', 'That code is incorrect, expired, or unavailable. Request a new code and try again.');
        }

        $record = PasswordRecoveryCode::query()->where('user_id', $user->id)->firstOrFail();
        $this->assertSame(5, $record->attempts);
        $this->postJson('/api/verify-recovery-code', [
            'email' => 'unknown@example.test',
            'code' => '000000',
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'That code is incorrect, expired, or unavailable. Request a new code and try again.');
    }

    public function test_expired_code_cannot_be_verified(): void
    {
        Notification::fake();
        $user = $this->createUser('expired-code@example.test');
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        $notification = Notification::sent($user, PasswordRecoveryCodeNotification::class)->first();
        $this->travel(11)->minutes();

        $this->postJson('/api/verify-recovery-code', [
            'email' => $user->email,
            'code' => $notification->code,
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'That code is incorrect, expired, or unavailable. Request a new code and try again.');
    }

    public function test_recovery_token_expires_and_cannot_be_used_for_a_different_email(): void
    {
        Notification::fake();
        $user = $this->createUser('recovery-token@example.test');
        $otherUser = $this->createUser('other-recovery@example.test');
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        $notification = Notification::sent($user, PasswordRecoveryCodeNotification::class)->first();
        $recoveryToken = $this->postJson('/api/verify-recovery-code', [
            'email' => $user->email,
            'code' => $notification->code,
        ])->assertOk()->json('recovery_token');

        $resetPayload = [
            'email' => $otherUser->email,
            'recovery_token' => $recoveryToken,
            'password' => 'NewSecurePassword123',
            'password_confirmation' => 'NewSecurePassword123',
        ];
        $this->postJson('/api/reset-password', $resetPayload)->assertUnprocessable();

        $this->travel(11)->minutes();
        $this->postJson('/api/reset-password', [
            ...$resetPayload,
            'email' => $user->email,
        ])->assertUnprocessable();
    }

    public function test_endpoints_enforce_input_validation_and_rate_limits(): void
    {
        Notification::fake();
        $this->postJson('/api/verify-recovery-code', ['email' => 'not-an-email', 'code' => '12'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'code']);
        $this->postJson('/api/reset-password', [])->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'recovery_token', 'password']);

        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.199']);
        for ($attempt = 0; $attempt < 3; $attempt++) {
            $this->postJson('/api/forgot-password', ['email' => 'unknown@example.test'])->assertOk();
        }
        $this->postJson('/api/forgot-password', ['email' => 'unknown@example.test'])->assertTooManyRequests();
    }

    private function createUser(string $email): User
    {
        return User::create([
            'name' => 'Password Recovery User',
            'email' => $email,
            'password' => 'ExistingPassword123',
        ]);
    }
}
