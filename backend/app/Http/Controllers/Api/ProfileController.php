<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ChangePasswordRequest;
use App\Http\Requests\Api\UpdateProfileRequest;
use App\Http\Resources\Api\ProfileResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
