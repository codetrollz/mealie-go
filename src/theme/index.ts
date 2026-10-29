import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Scheme = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface Colors {
  background: string;
  surface: string;
  surfaceElevated: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  /** Text and icons drawn on top of `primary`. */
  textInverse: string;
  border: string;
  borderLight: string;
  tabBar: string;
  tabBarActive: string;
  tabBarInactive: string;
}

// The accent (primary*, tabBarActive) is kept apart from the neutral palette so
// a user-selectable accent colour can be added later without touching screens.
type Accent = Pick<Colors, 'primary' | 'primaryLight' | 'primaryDark'>;
export const ACCENTS: Record<string, Record<Scheme, Accent>> = {
  orange: {
    dark: { primary: '#E87830', primaryLight: '#F09850', primaryDark: '#C45C18' },
    // Darkened so white text on it, and the colour itself on white, pass 4.5:1.
    light: { primary: '#BC5516', primaryLight: '#D96A24', primaryDark: '#9A4410' },
  },
};
export const DEFAULT_ACCENT = 'orange';

const neutrals: Record<Scheme, Omit<Colors, keyof Accent | 'tabBarActive'>> = {
  dark: {
    background: '#0F0D0A',
    surface: '#1A1510',
    surfaceElevated: '#251C14',
    accent: '#4E9E8C',
    success: '#5BA07A',
    warning: '#F0B429',
    error: '#E05D5D',
    textPrimary: '#F4F0EC',
    textSecondary: '#9A8070',
    textDisabled: '#52403A',
    textInverse: '#0F0D0A',
    border: '#2A1E14',
    borderLight: '#382818',
    tabBar: '#130E0A',
    tabBarInactive: '#4A3428',
  },
  // "Clean White"
  light: {
    background: '#FFFFFF',
    surface: '#F7F4F0',
    surfaceElevated: '#EFE9E2',
    accent: '#2F7F6D',
    success: '#2E7D52',
    warning: '#A66A00',
    error: '#C23B3B',
    textPrimary: '#1F1A16',
    textSecondary: '#6B5D52',
    textDisabled: '#A39A91',
    textInverse: '#FFFFFF',
    border: '#E4DDD5',
    borderLight: '#D9CFC4',
    tabBar: '#FFFFFF',
    tabBarInactive: '#8C7F74',
  },
};

export function buildColors(scheme: Scheme, accent: string = DEFAULT_ACCENT): Colors {
  const a = (ACCENTS[accent] ?? ACCENTS[DEFAULT_ACCENT])[scheme];
  return { ...neutrals[scheme], ...a, tabBarActive: a.primary };
}

const THEME_KEY = 'mealie_go.theme';

export async function getSavedThemePreference(): Promise<ThemePreference> {
  try {
    const v = await AsyncStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  } catch {
    return 'system';
  }
}

interface ThemeContextValue {
  colors: Colors;
  scheme: Scheme;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: buildColors('dark'),
  scheme: 'dark',
  preference: 'system',
  setPreference: async () => {},
});

export function ThemeProvider({ children, initialPreference = 'system' }: {
  children: React.ReactNode;
  initialPreference?: ThemePreference;
}) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  // The app was dark-only, so an unknown system scheme stays dark.
  const scheme: Scheme = preference === 'system' ? (system === 'light' ? 'light' : 'dark') : preference;
  const colors = useMemo(() => buildColors(scheme), [scheme]);

  const setPreference = useCallback(async (p: ThemePreference) => {
    setPreferenceState(p);
    try { await AsyncStorage.setItem(THEME_KEY, p); } catch { /* the choice still applies this session */ }
  }, []);

  const value = useMemo(() => ({ colors, scheme, preference, setPreference }), [colors, scheme, preference, setPreference]);
  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Declares a screen's styles as a function of the current colours:
 *   const useStyles = makeStyles(colors => StyleSheet.create({ ... }));
 *   // in the component: const styles = useStyles();
 * Rebuilt only when the theme changes.
 */
export function makeStyles<T>(factory: (colors: Colors) => T): () => T {
  return function useStyles() {
    const { colors } = useTheme();
    return useMemo(() => factory(colors), [colors]);
  };
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    display: 32,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};
