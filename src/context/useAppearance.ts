import { useContext } from 'react';
import { AppearanceContext } from './appearanceContext';
import type { AppearanceContextValue } from './appearanceContext';

export const useAppearance = (): AppearanceContextValue => {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used within an AppearanceProvider');
  }
  return context;
};
