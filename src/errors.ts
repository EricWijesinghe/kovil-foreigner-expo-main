import AsyncStorage from '@react-native-async-storage/async-storage';

// Local-only error log (no third-party crash service): last few errors, readable for support.
const KEY = 'kovil.errors';
const MAX = 20;
const DEDUPE_MS = 1000;
// This many swallowed fatal errors in the window means the app is broken, not unlucky: show the recovery screen.
const STORM_COUNT = 3;
const STORM_WINDOW_MS = 10_000;

export type LoggedError = { at: string; where: string; message: string };

let queue: Promise<void> = Promise.resolve();
let last = { key: '', at: 0 };

function describe(error: unknown): string {
  try {
    if (error instanceof Error) return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;
    return String(error);
  } catch {
    return 'unprintable error';
  }
}

/** Appends to the log; never throws (logging must not become a second crash). */
export function logError(where: string, error: unknown): void {
  try {
    const message = describe(error).slice(0, 800);
    const now = Date.now();
    // A throwing timer or loop would otherwise queue a storage write per error forever.
    if (last.key === where + message && now - last.at < DEDUPE_MS) return;
    last = { key: where + message, at: now };
    const entry: LoggedError = { at: new Date(now).toISOString(), where, message };
    queue = queue
      .then(async () => {
        const prev = await readErrors();
        await AsyncStorage.setItem(KEY, JSON.stringify([entry, ...prev].slice(0, MAX)));
      })
      .catch(() => {});
  } catch {
    // nothing left to do safely
  }
}

export async function readErrors(): Promise<LoggedError[]> {
  try {
    const parsed: unknown = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]');
    return Array.isArray(parsed) ? (parsed as LoggedError[]) : [];
  } catch {
    return [];
  }
}

type Handler = (error: unknown, isFatal?: boolean) => void;
type ErrorUtilsLike = { getGlobalHandler: () => Handler; setGlobalHandler: (h: Handler) => void };

let fatalTimes: number[] = [];
let stormListener: ((error: Error) => void) | null = null;

/** The root layout listens here and shows the recovery screen when fatal errors keep coming. */
export function onFatalStorm(listener: ((error: Error) => void) | null): void {
  stormListener = listener;
}

/** Exposed for tests: records a fatal error and reports whether it started a storm. */
export function recordFatal(now: number): boolean {
  fatalTimes = [...fatalTimes.filter((t) => now - t < STORM_WINDOW_MS), now];
  return fatalTimes.length >= STORM_COUNT;
}

/**
 * Errors thrown outside rendering (press handlers, timers) are "fatal" to React Native and close a release app
 * without a word. Log them and keep running; if they repeat, the app is broken, so show the recovery screen.
 * Render errors are caught by the route ErrorBoundary. In development the default red screen still shows.
 */
export function installGlobalHandler(): void {
  const utils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!utils) return;
  const fallback = utils.getGlobalHandler();
  utils.setGlobalHandler((error, isFatal) => {
    logError(isFatal ? 'fatal' : 'error', error);
    if (__DEV__) {
      fallback(error, isFatal);
      return;
    }
    if (isFatal && recordFatal(Date.now())) {
      fatalTimes = [];
      try {
        stormListener?.(error instanceof Error ? error : new Error(describe(error)));
      } catch {
        // the listener is UI code; never let it rethrow from the global handler
      }
    }
  });
}
