<?php

namespace App\Http\Requests\Comparisons;

use Illuminate\Foundation\Http\FormRequest;

class ComparePeriodsRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
            'previous_from' => ['sometimes', 'required', 'date_format:Y-m-d'],
            'previous_to' => ['sometimes', 'required', 'date_format:Y-m-d', 'after_or_equal:previous_from'],
        ];
    }
}
