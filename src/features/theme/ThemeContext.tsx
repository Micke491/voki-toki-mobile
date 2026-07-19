import React, { createContext, useContext, useMemo, PropsWithChildren } from 'react';
import { useAuthContext } from '../auth/context/AuthContext';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  input: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentSoft: string;
  danger: string;
  dangerSoft: string;
  success: string;
  warning: string;
  overlay: string;
}

const DARK: ThemeColors = {
  background: '#09090b',
  surface: '#18181b',
  surfaceAlt: '#111113',
  input: '#111113',
  border: '#27272a',
  borderStrong: '#3f3f46',
  textPrimary: '#f4f4f5',
  textSecondary: '#a1a1aa',
  textTertiary: '#71717a',
  accent: '#2563eb',
  accentSoft: 'rgba(37, 99, 235, 0.12)',
  danger: '#ef4444',
  dangerSoft: 'rgba(239, 68, 68, 0.1)',
  success: '#22c55e',
  warning: '#f59e0b',
  overlay: 'rgba(0, 0, 0, 0.65)',
};

const LIGHT: ThemeColors = {
  background: '#f4f4f5',
  surface: '#ffffff',
  surfaceAlt: '#fafafa',
  input: '#f4f4f5',
  border: '#e4e4e7',
  borderStrong: '#d4d4d8',
  textPrimary: '#18181b',
  textSecondary: '#52525b',
  textTertiary: '#a1a1aa',
  accent: '#2563eb',
  accentSoft: 'rgba(37, 99, 235, 0.1)',
  danger: '#dc2626',
  dangerSoft: 'rgba(220, 38, 38, 0.08)',
  success: '#16a34a',
  warning: '#d97706',
  overlay: 'rgba(0, 0, 0, 0.45)',
};

interface ThemeContextData {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextData>({
  mode: 'dark',
  colors: DARK,
  isDark: true,
});

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const { user } = useAuthContext();
  const mode: 'light' | 'dark' = user?.theme === 'light' ? 'light' : 'dark';

  const value = useMemo<ThemeContextData>(
    () => ({ mode, colors: mode === 'light' ? LIGHT : DARK, isDark: mode === 'dark' }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
