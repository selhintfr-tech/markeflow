<?php

namespace App\Http\Requests\Reports;

use App\Models\SavedReport;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreReportRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', Rule::in(SavedReport::TYPES)],
            'status' => ['sometimes', 'required', 'string', Rule::in(SavedReport::STATUSES)],
            'from_date' => ['nullable', 'date_format:Y-m-d'],
            'to_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from_date'],
            'filters' => ['sometimes', 'array'],
            'filters.*' => ['nullable', 'string', 'max:255'],
            'configuration' => ['sometimes', 'array'],
            'workspace_id' => ['prohibited'],
            'created_by' => ['prohibited'],
        ];
    }
}
