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
    displayName: 'Atlas Retail SARL',
    industry: 'Retail & E-commerce',
    contactEmail: 'contact@atlasretail.ma',
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
        general: { ...defaultSettings.general, ...(parsed.general || {}) },
        workspaceDisplay: { ...defaultSettings.workspaceDisplay, ...(parsed.workspaceDisplay || {}) },
        notifications: { ...defaultSettings.notifications, ...(parsed.notifications || {}) },
        appearance: { ...defaultSettings.appearance, ...(parsed.appearance || {}) },
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
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch (err) {
    console.error('Failed to save settings to localStorage:', err);
    return false;
  }
};
