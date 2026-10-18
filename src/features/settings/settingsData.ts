import type { AppSettingsState } from './types';

export const SETTINGS_STORAGE_KEY = 'marketflow_settings_v1';

export const defaultSettings: AppSettingsState = {
  general: {
    language: 'English',
    timezone: 'Africa/Casablanca',
    dateFormat: 'DD/MM/YYYY',
    currency: 'MAD',
    reportingPeriod: 'Current month',
  },
  workspaceDisplay: {
    displayName: '',
    industry: '',
    contactEmail: '',
  },
  notifications: {
    campaignBudgetAlerts: true,
    newCrmLeads: true,
    taskUpdates: true,
    reportAvailability: true,
    workspaceActivity: false,
    emailDigest: true,
  },
  appearance: {
    theme: 'light',
    density: 'comfortable',
  },
  privacy: {
    analyticsTelemetry: true,
    rememberFilters: true,
  },
};

export const loadStoredSettings = (): AppSettingsState => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        general: {
          ...defaultSettings.general,
          language: parsed.general?.language ?? defaultSettings.general.language,
          reportingPeriod: parsed.general?.reportingPeriod ?? defaultSettings.general.reportingPeriod,
        },
        workspaceDisplay: defaultSettings.workspaceDisplay,
        notifications: { ...defaultSettings.notifications, ...(parsed.notifications || {}) },
        appearance: { ...defaultSettings.appearance, ...(parsed.appearance || {}), theme: 'light', density: 'comfortable' },
        privacy: { ...defaultSettings.privacy, ...(parsed.privacy || {}) },
      };
    }
  } catch (err) {
    console.error('Failed to load settings from localStorage:', err);
  }
  return defaultSettings;
};

export const saveStoredSettings = (settings: AppSettingsState): boolean => {
  try {
    const localPreferences: Pick<AppSettingsState, 'notifications' | 'appearance' | 'privacy'> & {
      general: Pick<AppSettingsState['general'], 'language' | 'reportingPeriod'>;
    } = {
      general: {
        language: settings.general.language,
        reportingPeriod: settings.general.reportingPeriod,
      },
      notifications: settings.notifications,
      appearance: settings.appearance,
      privacy: settings.privacy,
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(localPreferences));
    return true;
  } catch (err) {
    console.error('Failed to save settings to localStorage:', err);
    return false;
  }
};
