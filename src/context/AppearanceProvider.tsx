import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  defaultAppearance,
  loadStoredAppearance,
  resolveAppearanceTheme,
  saveStoredAppearance,
} from '../features/settings/settingsData';
import type { AppearanceSettings } from '../features/settings/types';
import { AppearanceContext } from './appearanceContext';
import type { AppearanceContextValue } from './appearanceContext';

export const AppearanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return (
    <AppearanceState key={userId ?? 'anonymous'} userId={userId}>
      {children}
    </AppearanceState>
  );
};

const AppearanceState: React.FC<{ children: React.ReactNode; userId: string | null }> = ({
  children,
  userId,
}) => {
  const [savedAppearance, setSavedAppearance] = useState<AppearanceSettings>(
    () => userId ? loadStoredAppearance(userId) : defaultAppearance,
  );
  const [preview, setPreview] = useState<{ userId: string; appearance: AppearanceSettings } | null>(null);
  const appearance = preview?.userId === userId ? preview.appearance : savedAppearance;
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = () => setSystemTheme(media.matches ? 'dark' : 'light');
    media.addEventListener('change', updateSystemTheme);
    return () => media.removeEventListener('change', updateSystemTheme);
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolveAppearanceTheme(appearance.theme, systemTheme);
    root.dataset.themePreference = appearance.theme;
    root.dataset.density = appearance.density;
  }, [appearance, systemTheme]);

  const previewAppearance = useCallback((nextAppearance: AppearanceSettings) => {
    if (userId) setPreview({ userId, appearance: nextAppearance });
  }, [userId]);

  const saveAppearance = useCallback((nextAppearance: AppearanceSettings): boolean => {
    if (!userId) return false;
    if (!saveStoredAppearance(userId, nextAppearance)) return false;
    setSavedAppearance(nextAppearance);
    setPreview(null);
    return true;
  }, [userId]);

  const cancelAppearance = useCallback(() => {
    setPreview(null);
  }, []);

  const value = useMemo<AppearanceContextValue>(() => ({
    appearance,
    savedAppearance,
    isAppearanceLoaded: true,
    previewAppearance,
    saveAppearance,
    cancelAppearance,
  }), [
    appearance,
    savedAppearance,
    previewAppearance,
    saveAppearance,
    cancelAppearance,
  ]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
};
