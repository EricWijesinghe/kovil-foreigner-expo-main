import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

// KOVIL brand: trust blue, home green, warm orange accent.
const light = {
  bg: '#F6F8FC',
  card: '#FFFFFF',
  cardAlt: '#EEF3FB',
  text: '#0F1B2D',
  textDim: '#5B6B82',
  border: '#E1E7F0',
  primary: '#1F5EFF',
  primarySoft: '#E3EBFF',
  onPrimary: '#FFFFFF',
  green: '#12A06A',
  greenSoft: '#DDF5EA',
  orange: '#FF8A3D',
  orangeSoft: '#FFEBDD',
  danger: '#D64545',
  greenText: '#0A6B45',
  orangeText: '#8F420C',
  hero: ['#1F5EFF', '#4C8DFF'] as [string, string],
};
const dark: typeof light = {
  bg: '#0B1220',
  card: '#141E31',
  cardAlt: '#1B2840',
  text: '#ECF1FA',
  textDim: '#93A3BC',
  border: '#24324B',
  primary: '#6E9BFF',
  primarySoft: '#1D2C4D',
  onPrimary: '#0B1220',
  green: '#3DD598',
  greenSoft: '#143A2C',
  orange: '#FFA466',
  orangeSoft: '#3A2716',
  danger: '#FF7070',
  greenText: '#7CE8B9',
  orangeText: '#FFC79E',
  hero: ['#1A3F9E', '#2C64E0'] as [string, string],
};
export type Palette = typeof light;
export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'kovil.theme';
type ThemeCtx = { c: Palette; dark: boolean; mode: ThemeMode; ready: boolean; setMode: (m: ThemeMode) => void };
const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => (v === 'light' || v === 'dark') && setModeState(v))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);
  const value = useMemo(() => {
    const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';
    return { c: isDark ? dark : light, dark: isDark, mode, ready, setMode };
  }, [mode, system, ready, setMode]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme outside ThemeModeProvider');
  return ctx;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
