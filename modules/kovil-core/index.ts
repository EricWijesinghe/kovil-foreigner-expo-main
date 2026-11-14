import { requireOptionalNativeModule } from 'expo';

// The Rust core (./rust) over JNI on Android. Elsewhere (web, jest, a build without the native library) it is
// absent and callers use their TypeScript implementation, which golden.json proves gives the same answers.
type KovilCoreNative = {
  isAvailable(): boolean;
  version(): number;
  convertRent(deposit: number, rent: number, newDeposit: number, ratePct: number): number;
  jeonseEquivalent(deposit: number, rent: number, ratePct: number): number;
  agentFeeCap(deposit: number, rent: number): number;
  distanceM(aLat: number, aLng: number, bLat: number, bLng: number): number;
  inKorea(lat: number, lng: number): number;
};

let native: KovilCoreNative | null = null;
try {
  const mod = requireOptionalNativeModule<KovilCoreNative>('KovilCore');
  native = mod?.isAvailable() ? mod : null;
} catch {
  native = null;
}

/** Rust result when the core is loaded and returns a finite number; otherwise the TypeScript fallback. */
export function viaRust(call: (core: KovilCoreNative) => number, fallback: () => number): number {
  if (!native) return fallback();
  try {
    const value = call(native);
    return Number.isFinite(value) ? value : fallback();
  } catch {
    return fallback();
  }
}

/** "0.1.0" when the Rust core runs on this device, null when the app is using the fallback. */
export function rustCoreVersion(): string | null {
  const v = viaRust((core) => core.version(), () => NaN);
  if (!Number.isFinite(v)) return null;
  return `${Math.floor(v / 10_000)}.${Math.floor(v / 100) % 100}.${v % 100}`;
}
