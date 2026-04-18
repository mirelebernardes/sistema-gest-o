/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';

const THEME_STORAGE_KEY = 'app_theme_mode';
const THEME_OPTIONS = ['light', 'dark'];
const ThemeContext = createContext(null);

function getSystemPreference() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (THEME_OPTIONS.includes(saved)) return saved;
  return getSystemPreference();
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.themeMode = theme;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useLayoutEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setThemeMode = (nextTheme) => {
    if (!THEME_OPTIONS.includes(nextTheme)) return;
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  };

  const value = useMemo(() => ({
    theme,
    setTheme: setThemeMode,
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider.');
  }
  return context;
}
