import type { AppSettingsState } from './types';
import type { AppearanceSettings } from './types';

export const SETTINGS_STORAGE_KEY = 'marketflow_settings_v1';
export const APPEARANCE_STORAGE_KEY = 'marketflow_appearance_v1';

export const defaultAppearance: AppearanceSettings = {
  theme: 'light',
  density: 'comfortable',
};

export const resolveAppearanceTheme = (
  preference: AppearanceSettings['theme'],
  systemTheme: 'light' | 'dark',
): 'light' | 'dark' => preference === 'system' ? systemTheme : preference;

export const getAppearanceStorageKey = (userId: string): string =>
  `${APPEARANCE_STORAGE_KEY}:${encodeURIComponent(userId)}`;

export const loadStoredAppearance = (userId: string): AppearanceSettings => {
  try {
    const raw = localStorage.getItem(getAppearanceStorageKey(userId));
    if (!raw) return defaultAppearance;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaultAppearance;
    const value = parsed as Partial<AppearanceSettings>;

    return {
      theme: value.theme === 'dark' || value.theme === 'system' ? value.theme : 'light',
      density: value.density === 'compact' ? 'compact' : 'comfortable',
    };
  } catch (error) {
    console.error('Failed to load appearance preferences:', error);
    return defaultAppearance;
  }
};

export const saveStoredAppearance = (
  userId: string,
  appearance: AppearanceSettings,
): boolean => {
  try {
    localStorage.setItem(getAppearanceStorageKey(userId), JSON.stringify(appearance));
    return true;
  } catch (error) {
    console.error('Failed to save appearance preferences:', error);
    return false;
  }
};

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
        appearance: defaultSettings.appearance,
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
    const localPreferences: Pick<AppSettingsState, 'notifications' | 'privacy'> & {
      general: Pick<AppSettingsState['general'], 'language' | 'reportingPeriod'>;
    } = {
      general: {
        language: settings.general.language,
        reportingPeriod: settings.general.reportingPeriod,
      },
      notifications: settings.notifications,
      privacy: settings.privacy,
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(localPreferences));
    return true;
  } catch (err) {
    console.error('Failed to save settings to localStorage:', err);
    return false;
  }
};
