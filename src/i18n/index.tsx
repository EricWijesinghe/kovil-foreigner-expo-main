import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { catalogs, en, type StringKey } from './catalogs';

// Same 20 codes the server activates (V39). Native names are the fallback when /languages is unreachable.
export const LANGUAGES = [
  ['ko', '한국어'], ['en', 'English'], ['vi', 'Tiếng Việt'], ['zh', '中文'], ['ja', '日本語'],
  ['ne', 'नेपाली'], ['th', 'ไทย'], ['uz', 'Oʻzbekcha'], ['ru', 'Русский'], ['mn', 'Монгол'],
  ['km', 'ខ្មែរ'], ['id', 'Bahasa Indonesia'], ['fil', 'Filipino'], ['my', 'မြန်မာ'], ['si', 'සිංහල'],
  ['bn', 'বাংলা'], ['hi', 'हिन्दी'], ['ur', 'اردو'], ['kk', 'Қазақша'], ['ky', 'Кыргызча'],
] as const;
export type Lang = (typeof LANGUAGES)[number][0];

const RTL: readonly Lang[] = ['ur'];
const STORAGE_KEY = 'kovil.language';
// Device locales that use a different code from ours.
const ALIASES: Record<string, Lang> = { tl: 'fil', in: 'id' };

export function deviceLanguage(): Lang {
  for (const locale of getLocales()) {
    const code = (ALIASES[locale.languageCode ?? ''] ?? locale.languageCode) as Lang;
    if (LANGUAGES.some(([c]) => c === code)) return code;
  }
  return 'en';
}

/** `{name}` placeholders; a missing key falls back to English so a gap never shows a raw key. */
export function translate(lang: Lang, key: StringKey, params?: Record<string, string | number>): string {
  const template = catalogs[lang]?.[key] ?? en[key];
  return params ? template.replace(/\{(\w+)\}/g, (m, p) => (p in params ? String(params[p]) : m)) : template;
}

type I18n = {
  lang: Lang;
  /** null = following the device. */
  chosen: Lang | null;
  rtl: boolean;
  /** Saved choice has been read (hide the splash only after this, or the wrong language flashes). */
  ready: boolean;
  t: (key: StringKey, params?: Record<string, string | number>) => string;
  setLanguage: (lang: Lang | null) => void;
};

const Ctx = createContext<I18n | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [chosen, setChosen] = useState<Lang | null>(null);
  const [device] = useState(deviceLanguage);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => v && LANGUAGES.some(([c]) => c === v) && setChosen(v as Lang))
      .catch(() => {}) // storage unavailable: follow the device
      .finally(() => setReady(true));
  }, []);

  const setLanguage = useCallback((lang: Lang | null) => {
    setChosen(lang);
    (lang ? AsyncStorage.setItem(STORAGE_KEY, lang) : AsyncStorage.removeItem(STORAGE_KEY)).catch(() => {});
  }, []);

  const value = useMemo<I18n>(() => {
    const lang = chosen ?? device;
    return { lang, chosen, rtl: RTL.includes(lang), ready, t: (k, p) => translate(lang, k, p), setLanguage };
  }, [chosen, device, ready, setLanguage]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n outside LanguageProvider');
  return ctx;
}
