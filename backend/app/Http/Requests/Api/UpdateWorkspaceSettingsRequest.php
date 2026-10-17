<?php

namespace App\Http\Requests\Api;

use App\Models\Workspace;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWorkspaceSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        $workspace = $this->route('workspace');
        $user = $this->user();

        return $workspace instanceof Workspace
            && $user !== null
            && $user->isAdminOf($workspace)
            && $user->can('manageSettings', $workspace);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'settings' => ['required', 'array:general,workspaceDisplay,notifications,appearance,privacy'],
            'settings.general' => ['sometimes', 'array:language,timezone,dateFormat,currency,reportingPeriod'],
            'settings.general.language' => ['sometimes', Rule::in(['English', 'Français', 'العربية'])],
            'settings.general.timezone' => ['sometimes', 'string', 'timezone:all'],
            'settings.general.dateFormat' => ['sometimes', Rule::in(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'])],
            'settings.general.currency' => ['sometimes', Rule::in(['MAD', 'EUR', 'USD'])],
            'settings.general.reportingPeriod' => ['sometimes', Rule::in(['Current month', 'Last 30 days', 'Current quarter', 'Year to date'])],
            'settings.workspaceDisplay' => ['sometimes', 'array:displayName,industry,contactEmail'],
            'settings.workspaceDisplay.displayName' => ['sometimes', 'required', 'string', 'min:2', 'max:255'],
            'settings.workspaceDisplay.industry' => ['sometimes', 'nullable', 'string', 'max:100'],
            'settings.workspaceDisplay.contactEmail' => ['sometimes', 'nullable', 'email', 'max:255'],
            'settings.notifications' => ['sometimes', 'array:campaignBudgetAlerts,newCrmLeads,taskUpdates,reportAvailability,workspaceActivity,emailDigest'],
            'settings.notifications.campaignBudgetAlerts' => ['sometimes', 'boolean'],
            'settings.notifications.newCrmLeads' => ['sometimes', 'boolean'],
            'settings.notifications.taskUpdates' => ['sometimes', 'boolean'],
            'settings.notifications.reportAvailability' => ['sometimes', 'boolean'],
            'settings.notifications.workspaceActivity' => ['sometimes', 'boolean'],
            'settings.notifications.emailDigest' => ['sometimes', 'boolean'],
            'settings.appearance' => ['sometimes', 'array:theme,density'],
            'settings.appearance.theme' => ['sometimes', Rule::in(['light', 'dark', 'system'])],
            'settings.appearance.density' => ['sometimes', Rule::in(['comfortable', 'compact'])],
            'settings.privacy' => ['sometimes', 'array:analyticsTelemetry,rememberFilters'],
            'settings.privacy.analyticsTelemetry' => ['sometimes', 'boolean'],
            'settings.privacy.rememberFilters' => ['sometimes', 'boolean'],
            'workspace_id' => ['prohibited'],
        ];
    }
}
