import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Two backends during the Rust migration: Java (everything) and Rust (areas/location).
// Emulator: 10.0.2.2 is the host's localhost. Real phone on the same Wi-Fi: the Expo dev server's host.
// Release builds must set EXPO_PUBLIC_API_URL / EXPO_PUBLIC_CORE_URL to https endpoints.
const devHost = (() => {
  if (Platform.OS === 'android' && !Device.isDevice) return '10.0.2.2';
  const hostUri = Constants.expoConfig?.hostUri?.split(':')[0];
  if (hostUri && hostUri !== 'localhost' && hostUri !== '127.0.0.1') return hostUri;
  return Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
})();

// Release builds never fall back to a cleartext dev URL.
const PROD_URL = 'https://api.kovil.co.kr';
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? `http://${devHost}:8095` : PROD_URL);
export const CORE_URL = process.env.EXPO_PUBLIC_CORE_URL ?? (__DEV__ ? `http://${devHost}:8090` : PROD_URL);
const TIMEOUT_MS = 8000;

/** `message` is the server's localized text; empty when the server was never reached (show a generic error). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string | null,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Access token + one refresh attempt, provided by the session. Kept here so every call can authenticate. */
type TokenSource = { access: () => string | null; refresh: () => Promise<boolean> };
let tokens: TokenSource | null = null;
export function setTokenSource(source: TokenSource | null) {
  tokens = source;
}

type Envelope<T> = { success: boolean; data: T | null; message: string | null; errorCode: string | null };
/** `retry: false` turns off the refresh-and-retry on 401 (logout must not resend a just-rotated token). */
export type Options = { method?: string; body?: unknown; auth?: boolean; retry?: boolean; signal?: AbortSignal };

/** Unwraps `{ success, data, message, errorCode }`. With `auth`, a 401 triggers one token refresh and a retry. */
export async function request<T>(base: string, path: string, lang: string, opts: Options = {}, retried = false): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onAbort);
  const access = opts.auth ? tokens?.access() : null;
  try {
    const res = await fetch(base + path, {
      method: opts.method ?? 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Accept-Language': lang,
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const body = (await res.json().catch(() => null)) as Envelope<T> | null;
    if (res.status === 401 && opts.auth && opts.retry !== false && !retried && tokens && (await tokens.refresh())) {
      return request<T>(base, path, lang, opts, true);
    }
    if (!res.ok || !body?.success) {
      throw new ApiError(body?.message ?? '', body?.errorCode ?? null, res.status);
    }
    return body.data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('', null, 0); // offline, timeout or aborted
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

/** Text to show for a failure: the server's localized message, else the app's generic one. */
export function errorText(e: unknown, fallback: string): string {
  return e instanceof ApiError && e.status > 0 && e.message ? e.message : fallback;
}
