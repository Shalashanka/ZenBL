import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOCALE_LABELS, SupportedLocale, translate } from '../i18n';

const THEME_KEY = 'zenox_ui_theme_mode';
const LOCALE_KEY = 'zenox_ui_locale';

export type ThemeMode = 'dark' | 'light';

type AppPreferencesContextValue = {
  themeMode: ThemeMode;
  locale: SupportedLocale;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  locales: Array<{ code: SupportedLocale; label: string }>;
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null);

export const AppPreferencesProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [locale, setLocaleState] = useState<SupportedLocale>('en');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [savedMode, savedLocale] = await Promise.all([
        AsyncStorage.getItem(THEME_KEY),
        AsyncStorage.getItem(LOCALE_KEY),
      ]);
      if (!mounted) return;
      if (savedMode === 'dark' || savedMode === 'light') {
        setThemeModeState(savedMode);
      }
      if (LOCALE_LABELS.some((entry) => entry.code === savedLocale)) {
        setLocaleState(savedLocale as SupportedLocale);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_KEY, mode);
  }, []);

  const setLocale = useCallback(async (nextLocale: SupportedLocale) => {
    setLocaleState(nextLocale);
    await AsyncStorage.setItem(LOCALE_KEY, nextLocale);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    return translate(locale, key, params);
  }, [locale]);

  const value = useMemo(
    () => ({
      themeMode,
      locale,
      setThemeMode,
      setLocale,
      t,
      locales: LOCALE_LABELS,
    }),
    [locale, setLocale, setThemeMode, t, themeMode],
  );

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
};

export const useAppPreferences = () => {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error('useAppPreferences must be used within AppPreferencesProvider');
  }
  return context;
};
