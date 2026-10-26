import { createContext } from 'react';
import type { AppearanceSettings } from '../features/settings/types';

export interface AppearanceContextValue {
  appearance: AppearanceSettings;
  savedAppearance: AppearanceSettings;
  isAppearanceLoaded: boolean;
  previewAppearance: (appearance: AppearanceSettings) => void;
  cancelAppearance: () => void;
  saveAppearance: (appearance: AppearanceSettings) => boolean;
}

export const AppearanceContext = createContext<AppearanceContextValue | undefined>(undefined);
