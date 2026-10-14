export type SettingsSection =
  | 'general'
  | 'workspace'
  | 'notifications'
  | 'appearance'
  | 'team'
  | 'security';

export interface GeneralSettings {
  language: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  reportingPeriod: string;
}

export interface WorkspaceDisplaySettings {
  displayName: string;
  industry: string;
  contactEmail: string;
}

export interface NotificationPreferences {
  campaignBudgetAlerts: boolean;
  newCrmLeads: boolean;
  taskUpdates: boolean;
  reportAvailability: boolean;
  workspaceActivity: boolean;
  emailDigest: boolean;
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  density: 'comfortable' | 'compact';
}

export interface PrivacySettings {
  analyticsTelemetry: boolean;
  rememberFilters: boolean;
}

export interface AppSettingsState {
  general: GeneralSettings;
  workspaceDisplay: WorkspaceDisplaySettings;
  notifications: NotificationPreferences;
  appearance: AppearanceSettings;
  privacy: PrivacySettings;
}
