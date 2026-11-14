// Geo checks. On Android the Rust core computes them; the TypeScript fallback is held to the same answers by
// the golden-vector test.
import { viaRust } from '../../modules/kovil-core';

const EARTH_RADIUS_M = 6_371_000;
// Generous box around South Korea incl. Jeju and Ulleungdo; the server decides the exact area.
const KOREA = { minLat: 33.0, maxLat: 38.7, minLng: 124.5, maxLng: 132.0 };
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in whole metres (haversine). */
export function distanceM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  return viaRust((core) => core.distanceM(aLat, aLng, bLat, bLng), () => distanceMTs(aLat, aLng, bLat, bLng));
}

export function distanceMTs(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h))));
}

export function inKorea(lat: number, lng: number): boolean {
  return viaRust((core) => core.inKorea(lat, lng), () => (inKoreaTs(lat, lng) ? 1 : 0)) === 1;
}

export function inKoreaTs(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= KOREA.minLat && lat <= KOREA.maxLat && lng >= KOREA.minLng && lng <= KOREA.maxLng;
}
