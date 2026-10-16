<?php

namespace App\Http\Requests\Api;

use App\Models\Workspace;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWorkspaceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'slug' => [
                'nullable',
                'string',
                'min:2',
                'max:100',
                'unique:workspaces,slug',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
            ],
            'business_type' => [
                'nullable',
                'string',
                Rule::in([
                    Workspace::TYPE_SOLO,
                    Workspace::TYPE_AGENCY,
                    Workspace::TYPE_ECOMMERCE,
                    Workspace::TYPE_GENERAL,
                    Workspace::TYPE_BRANCH,
                ]),
            ],
            'industry' => ['nullable', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:100'],
            'currency' => ['nullable', 'string', 'max:10'],
            'timezone' => ['nullable', 'string', 'timezone:all'],
            'date_format' => ['nullable', 'string', 'max:20'],
            'enabled_modules' => ['nullable', 'array'],
            'enabled_modules.*' => ['string', 'max:50'],
        ];
    }

    /**
     * Custom validation messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'slug.regex' => 'The slug must only contain lowercase alphanumeric characters and single hyphens.',
            'slug.unique' => 'A workspace with this URL slug already exists.',
            'business_type.in' => 'The selected business type is invalid.',
        ];
    }
}
