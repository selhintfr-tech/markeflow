<?php

namespace App\Http\Requests\Reports;

use App\Models\SavedReport;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateReportRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'type' => ['sometimes', 'required', 'string', Rule::in(SavedReport::TYPES)],
            'from_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'to_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'filters' => ['sometimes', 'array'],
            'filters.*' => ['nullable', 'string', 'max:255'],
            'configuration' => ['sometimes', 'array'],
            'workspace_id' => ['prohibited'],
            'created_by' => ['prohibited'],
        ];
    }

    public function after(): array
    {
        return [
            function ($validator): void {
                $from = $this->input('from_date');
                $to = $this->input('to_date');
                if ($from !== null && $to !== null && $to < $from) {
                    $validator->errors()->add('to_date', 'The to date must be on or after the from date.');
                }
            },
        ];
    }
}
