import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Who the user is shapes tips and shortcuts, never what they may see.
export const PERSONAS = ['student', 'worker', 'professional', 'family'] as const;
export type Persona = (typeof PERSONAS)[number];

const KEY = 'kovil.prefs';
type Stored = { onboarded: boolean; persona: Persona | null; checklist: string[] };
const DEFAULTS: Stored = { onboarded: false, persona: null, checklist: [] };

/** Saved data may come from an older version or be corrupt: keep only well-typed fields. */
export function sanitize(raw: unknown): Stored {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    onboarded: o.onboarded === true,
    persona: PERSONAS.includes(o.persona as Persona) ? (o.persona as Persona) : null,
    checklist: Array.isArray(o.checklist) ? o.checklist.filter((x): x is string => typeof x === 'string') : [],
  };
}

type Prefs = Stored & {
  ready: boolean;
  update: (patch: Partial<Stored>) => void;
};

const Ctx = createContext<Prefs | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Stored>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setStored(sanitize(JSON.parse(raw))))
      .catch(() => {}) // unreadable: start fresh (onboarding shows again, nothing is lost server-side)
      .finally(() => setReady(true));
  }, []);

  const update = useCallback((patch: Partial<Stored>) => {
    setStored((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(() => ({ ...stored, ready, update }), [stored, ready, update]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs(): Prefs {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePrefs outside PrefsProvider');
  return ctx;
}
