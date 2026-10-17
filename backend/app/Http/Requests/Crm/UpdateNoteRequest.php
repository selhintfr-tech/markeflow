<?php

namespace App\Http\Requests\Crm;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'content' => ['sometimes', 'required', 'string', 'max:10000'],
            'is_pinned' => ['sometimes', 'boolean'],
            'workspace_id' => ['prohibited'],
            'id' => ['prohibited'],
            'lead_id' => ['prohibited'],
            'contact_id' => ['prohibited'],
            'customer_id' => ['prohibited'],
        ];
    }
}