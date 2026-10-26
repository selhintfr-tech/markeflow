<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ChangePasswordRequest;
use App\Http\Requests\Api\UpdateProfileRequest;
use App\Http\Requests\Api\UploadProfileAvatarRequest;
use App\Http\Resources\Api\ProfileResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class ProfileController extends Controller
{
    public function show(Request $request): ProfileResource
    {
        return new ProfileResource($request->user());
    }

    public function update(UpdateProfileRequest $request): ProfileResource
    {
        $user = $request->user();
        $attributes = $request->validated();
        $emailChanged = isset($attributes['email']) && $attributes['email'] !== $user->email;

        $user->fill($attributes);

        if ($emailChanged) {
            $user->forceFill(['email_verified_at' => null]);
        }

        $user->save();

        return new ProfileResource($user->refresh());
    }

    public function uploadAvatar(UploadProfileAvatarRequest $request): ProfileResource
    {
        /** @var User $user */
        $user = $request->user();
        $diskName = config('filesystems.avatar_disk', 'public');
        $disk = Storage::disk($diskName);
        $oldPath = $user->avatar_url;
        $newPath = $request->file('avatar')->storePublicly('avatars', $diskName);

        if (! is_string($newPath) || $newPath === '') {
            throw new RuntimeException('The profile photo could not be stored.');
        }

        try {
            DB::transaction(function () use ($user, $newPath): void {
                if (! $user->forceFill(['avatar_url' => $newPath])->save()) {
                    throw new RuntimeException('The profile photo could not be associated with your account.');
                }
            });
        } catch (Throwable $exception) {
            try {
                if (! $disk->delete($newPath)) {
                    Log::warning('Unable to remove an unassociated profile avatar.', ['path' => $newPath]);
                }
            } catch (Throwable $cleanupException) {
                Log::warning('Unable to remove an unassociated profile avatar.', [
                    'path' => $newPath,
                    'error' => $cleanupException->getMessage(),
                ]);
            }
            throw $exception;
        }

        $this->deleteStoredAvatar($diskName, $oldPath);

        return new ProfileResource($user->refresh());
    }

    public function deleteAvatar(Request $request): ProfileResource
    {
        /** @var User $user */
        $user = $request->user();
        $oldPath = $user->avatar_url;

        DB::transaction(function () use ($user): void {
            if (! $user->forceFill(['avatar_url' => null])->save()) {
                throw new RuntimeException('The profile photo could not be removed from your account.');
            }
        });

        $this->deleteStoredAvatar(config('filesystems.avatar_disk', 'public'), $oldPath);

        return new ProfileResource($user->refresh());
    }

    private function deleteStoredAvatar(string $diskName, ?string $path): void
    {
        if (! $path || ! str_starts_with($path, 'avatars/')) {
            return;
        }

        try {
            if (! Storage::disk($diskName)->delete($path)) {
                Log::warning('Unable to delete a replaced profile avatar.', ['path' => $path]);
            }
        } catch (Throwable $exception) {
            Log::warning('Unable to delete a replaced profile avatar.', [
                'path' => $path,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $request->user()->update([
            'password' => $request->validated('new_password'),
        ]);

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    }
}
