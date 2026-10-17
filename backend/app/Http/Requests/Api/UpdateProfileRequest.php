<?php

namespace App\Http\Requests\Api;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $userId = $this->user()->getKey();

        return [
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'job_title' => ['sometimes', 'nullable', 'string', 'max:100'],
            'avatar_url' => ['sometimes', 'nullable', 'url', 'max:500'],
            'timezone' => ['sometimes', 'nullable', 'string', 'timezone:all', 'max:50'],
            'locale' => ['sometimes', 'nullable', Rule::in(['en', 'fr', 'ar', 'es'])],
            'id' => ['prohibited'],
            'password' => ['prohibited'],
            'remember_token' => ['prohibited'],
            'role' => ['prohibited'],
            'workspace_id' => ['prohibited'],
        ];
    }
}
