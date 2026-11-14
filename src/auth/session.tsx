import * as SecureStore from 'expo-secure-store';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { API_URL, ApiError, request, setTokenSource } from '@/api/client';
import { useI18n } from '@/i18n';

// Tokens live in the OS keystore (expo-secure-store), never in AsyncStorage.
const KEY = 'kovil.session';

type Tokens = { accessToken: string; refreshToken: string };
export type Me = { userUuid: string; name: string | null; nickname: string | null; email: string | null; phoneVerified: boolean; role: string };
type SignInResponse = Tokens & { userUuid: string };
type PhoneSend = { expiresInSeconds: number; resendAvailableInSeconds: number };
type PhoneVerify = { verificationToken: string; expiresInSeconds: number };
export type SignUpInput = { verificationToken: string; email: string; password: string; name?: string };

type Session = {
  ready: boolean;
  me: Me | null;
  signedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  sendCode: (phone: string) => Promise<PhoneSend>;
  verifyCode: (phone: string, code: string) => Promise<string>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Session | null>(null);

async function persist(t: Tokens | null) {
  try {
    if (t) await SecureStore.setItemAsync(KEY, JSON.stringify(t));
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Keystore unavailable (e.g. web): the session just won't survive a restart.
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  const tokens = useRef<Tokens | null>(null);
  const refreshing = useRef<Promise<boolean> | null>(null);
  /** Bumped on sign-out so a refresh that was already in flight cannot write tokens back afterwards. */
  const generation = useRef(0);
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  const save = useCallback(async (t: Tokens | null) => {
    tokens.current = t;
    if (!t) setMe(null);
    await persist(t);
  }, []);

  /** One refresh at a time: parallel 401s share it (a second rotate would look like token theft to the server). */
  const refresh = useCallback((): Promise<boolean> => {
    const current = tokens.current;
    if (!current) return Promise.resolve(false); // not cached: a later sign-in must be able to refresh
    if (!refreshing.current) {
      const gen = generation.current;
      refreshing.current = (async () => {
        try {
          const t = await request<Tokens>(API_URL, '/api/v1/auth/token/refresh', lang, { method: 'POST', body: { refreshToken: current.refreshToken } });
          if (gen !== generation.current) return false; // signed out meanwhile
          await save({ accessToken: t.accessToken, refreshToken: t.refreshToken });
          return true;
        } catch (e) {
          // Only a rejected refresh token ends the session; offline or a timeout keeps it for the next try.
          const rejected = e instanceof ApiError && [400, 401, 403].includes(e.status);
          if (rejected && gen === generation.current) await save(null);
          return false;
        } finally {
          refreshing.current = null;
        }
      })();
    }
    return refreshing.current;
  }, [lang, save]);

  /** `strict`: a failure throws (sign-in must not "succeed" without a profile). Otherwise it is swallowed. */
  const loadMe = useCallback(
    async (strict = false) => {
      try {
        setMe(await request<Me>(API_URL, '/api/v1/me', lang, { auth: true }));
      } catch (e) {
        setMe(null);
        if (strict) throw e;
      }
    },
    [lang],
  );
  const finishSignIn = useCallback(
    async (t: Tokens) => {
      await save(t);
      try {
        await loadMe(true);
      } catch (e) {
        await save(null);
        throw e;
      }
    },
    [save, loadMe],
  );

  useEffect(() => {
    setTokenSource({ access: () => tokens.current?.accessToken ?? null, refresh });
    return () => setTokenSource(null);
  }, [refresh]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(KEY);
        if (raw && live) {
          tokens.current = JSON.parse(raw) as Tokens;
          await loadMe();
        }
      } catch {
        tokens.current = null;
      }
      if (live) setReady(true);
    })();
    return () => {
      live = false;
    };
    // Restore once at startup; loadMe changes with the language and must not re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<Session>(
    () => ({
      ready,
      me,
      signedIn: me !== null,
      signIn: async (email, password) => {
        const r = await request<SignInResponse>(API_URL, '/api/v1/auth/login', lang, { method: 'POST', body: { email: email.trim(), password } });
        await finishSignIn({ accessToken: r.accessToken, refreshToken: r.refreshToken });
      },
      sendCode: (phone) => request<PhoneSend>(API_URL, '/api/v1/auth/phone/send', lang, { method: 'POST', body: { phone, purpose: 'SIGNUP' } }),
      verifyCode: async (phone, code) =>
        (await request<PhoneVerify>(API_URL, '/api/v1/auth/phone/verify', lang, { method: 'POST', body: { phone, code, purpose: 'SIGNUP' } })).verificationToken,
      signUp: async (input) => {
        const r = await request<SignInResponse>(API_URL, '/api/v1/auth/signup', lang, {
          method: 'POST',
          body: { ...input, email: input.email.trim(), preferredLanguage: lang },
        });
        await finishSignIn({ accessToken: r.accessToken, refreshToken: r.refreshToken });
      },
      signOut: async () => {
        // Revoke on the server when we can; sign out locally regardless. No automatic retry: a retry would resend
        // a refresh token that the retry's own refresh just rotated. On 401 we refresh once and send the new one.
        const logout = () =>
          request(API_URL, '/api/v1/auth/logout', lang, { method: 'POST', auth: true, retry: false, body: { refreshToken: tokens.current?.refreshToken } });
        if (tokens.current) {
          await logout().catch(async (e) => {
            if (e instanceof ApiError && e.status === 401 && (await refresh())) await logout().catch(() => {});
          });
        }
        generation.current += 1;
        await save(null);
      },
    }),
    [ready, me, lang, save, finishSignIn, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession outside SessionProvider');
  return ctx;
}
