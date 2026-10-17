<?php

namespace App\Http\Requests\Finance;

use App\Models\FinanceTransaction;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTransactionRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'type' => ['sometimes', 'required', 'string', Rule::in(FinanceTransaction::TYPES)],
            'category' => ['sometimes', 'required', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'amount' => ['sometimes', 'required', 'numeric', 'decimal:0,2', 'gt:0', 'max:999999999999.99'],
            'occurred_on' => ['sometimes', 'required', 'date_format:Y-m-d'],
            'workspace_id' => ['prohibited'],
            'created_by' => ['prohibited'],
        ];
    }
}
