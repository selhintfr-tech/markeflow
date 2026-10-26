<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PasswordRecoveryCode;
use App\Models\User;
use App\Notifications\PasswordRecoveryCodeNotification;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Throwable;

class PasswordRecoveryController extends Controller
{
    public function sendCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);
        $email = Str::lower(trim($validated['email']));
        $user = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();

        if ($user) {
            $code = (string) random_int(100000, 999999);
            PasswordRecoveryCode::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'code_hash' => Hash::make($code),
                    'attempts' => 0,
                    'expires_at' => now()->addMinutes(config('password-recovery.code_ttl_minutes', 10)),
                    'verified_at' => null,
                    'recovery_token_hash' => null,
                    'recovery_expires_at' => null,
                ]
            );

            try {
                $this->assertTransactionalMailerConfigured();
                $user->notify(new PasswordRecoveryCodeNotification($code));
            } catch (Throwable $exception) {
                PasswordRecoveryCode::query()->where('user_id', $user->id)->delete();
                Log::warning('Password recovery code email delivery failed.', [
                    'exception' => $exception::class,
                ]);
            }
        }

        return response()->json([
            'message' => 'If an account exists for that email address, a verification code will be sent.',
        ]);
    }

    public function verifyCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'code' => ['required', 'string', 'regex:/^[0-9]{6}$/'],
        ]);
        $user = User::query()->whereRaw('LOWER(email) = ?', [Str::lower(trim($validated['email']))])->first();

        if (! $user) {
            return $this->invalidCodeResponse();
        }

        $result = DB::transaction(function () use ($user, $validated): ?string {
            $record = PasswordRecoveryCode::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if (
                ! $record
                || $record->verified_at
                || $record->expires_at->isPast()
                || $record->attempts >= config('password-recovery.max_code_attempts', 5)
            ) {
                return null;
            }

            if (! Hash::check($validated['code'], $record->code_hash)) {
                $record->increment('attempts');

                return null;
            }

            $recoveryToken = bin2hex(random_bytes(32));
            $record->forceFill([
                'verified_at' => now(),
                'recovery_token_hash' => hash('sha256', $recoveryToken),
                'recovery_expires_at' => now()->addMinutes(config('password-recovery.code_ttl_minutes', 10)),
            ])->save();

            return $recoveryToken;
        });

        if (! $result) {
            return $this->invalidCodeResponse();
        }

        return response()->json([
            'message' => 'Email verification successful. You can now choose a new password.',
            'recovery_token' => $result,
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'recovery_token' => ['required', 'string', 'regex:/^[a-f0-9]{64}$/'],
            'password' => ['required', 'string', 'confirmed', PasswordRule::min(12)->letters()->numbers()],
        ]);
        $user = User::query()->whereRaw('LOWER(email) = ?', [Str::lower(trim($validated['email']))])->first();

        if (! $user) {
            return $this->invalidRecoveryResponse();
        }

        $reset = DB::transaction(function () use ($user, $validated): bool {
            $record = PasswordRecoveryCode::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if (
                ! $record
                || ! $record->verified_at
                || ! $record->recovery_expires_at
                || $record->recovery_expires_at->isPast()
                || ! $record->recovery_token_hash
                || ! hash_equals($record->recovery_token_hash, hash('sha256', $validated['recovery_token']))
            ) {
                return false;
            }

            $user->forceFill([
                'password' => $validated['password'],
                'remember_token' => Str::random(60),
            ])->save();
            $record->delete();
            event(new PasswordReset($user));

            return true;
        });

        if (! $reset) {
            return $this->invalidRecoveryResponse();
        }

        return response()->json([
            'message' => 'Your password has been reset successfully. You may now sign in.',
        ]);
    }

    private function invalidCodeResponse(): JsonResponse
    {
        return response()->json([
            'message' => 'That code is incorrect, expired, or unavailable. Request a new code and try again.',
        ], 422);
    }

    private function invalidRecoveryResponse(): JsonResponse
    {
        return response()->json([
            'message' => 'Email verification has expired or is invalid. Request a new verification code.',
        ], 422);
    }

    private function assertTransactionalMailerConfigured(): void
    {
        $mailer = config('mail.default');
        $transport = config("mail.mailers.{$mailer}.transport");
        if (! in_array($transport, ['smtp', 'sendmail', 'mailgun', 'ses', 'ses-v2', 'postmark', 'resend'], true)) {
            throw new \RuntimeException('A real transactional mail transport is not configured.');
        }
    }
}
