<?php

namespace App\Http\Requests\Api;

use App\Models\Workspace;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWorkspaceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $workspace = $this->route('workspace');

        if (! $workspace instanceof Workspace) {
            $workspace = Workspace::find($workspace);
        }

        if (! $workspace || ! $this->user()) {
            return false;
        }

        return $this->user()->can('update', $workspace);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $workspace = $this->route('workspace');
        $workspaceId = $workspace instanceof Workspace ? $workspace->id : $workspace;

        return [
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:255'],
            'slug' => [
                'sometimes',
                'nullable',
                'string',
                'min:2',
                'max:100',
                Rule::unique('workspaces', 'slug')->ignore($workspaceId),
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
            ],
            'business_type' => [
                'sometimes',
                'string',
                Rule::in([
                    Workspace::TYPE_SOLO,
                    Workspace::TYPE_AGENCY,
                    Workspace::TYPE_ECOMMERCE,
                    Workspace::TYPE_GENERAL,
                    Workspace::TYPE_BRANCH,
                ]),
            ],
            'industry' => ['sometimes', 'nullable', 'string', 'max:100'],
            'location' => ['sometimes', 'nullable', 'string', 'max:100'],
            'currency' => ['sometimes', 'nullable', 'string', 'max:10'],
            'timezone' => ['sometimes', 'nullable', 'string', 'timezone:all'],
            'date_format' => ['sometimes', 'nullable', 'string', 'max:20'],
            'enabled_modules' => ['sometimes', 'nullable', 'array'],
            'enabled_modules.*' => ['string', 'max:50'],
            'status' => ['sometimes', 'string', Rule::in(['Active', 'Archived', 'Suspended'])],
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
