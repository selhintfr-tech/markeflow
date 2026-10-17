<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBudgetRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'category' => ['sometimes', 'required', 'string', 'max:100'],
            'amount' => ['sometimes', 'required', 'numeric', 'decimal:0,2', 'gt:0', 'max:999999999999.99'],
            'starts_on' => ['required_with:ends_on', 'date_format:Y-m-d'],
            'ends_on' => ['required_with:starts_on', 'date_format:Y-m-d', 'after_or_equal:starts_on'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'workspace_id' => ['prohibited'],
            'created_by' => ['prohibited'],
        ];
    }
}
