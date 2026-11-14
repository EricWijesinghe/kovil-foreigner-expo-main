import type { Bounds } from '@/api/kovil';

// Generous province boxes (sido code -> bounds) for box-based APIs; results are then filtered by region code.
export const PROVINCE_BOXES: Record<string, Bounds> = {
  '11': { swLat: 37.41, swLng: 126.76, neLat: 37.72, neLng: 127.19 },
  '26': { swLat: 34.88, swLng: 128.76, neLat: 35.39, neLng: 129.31 },
  '27': { swLat: 35.6, swLng: 128.35, neLat: 36.02, neLng: 128.77 },
  '28': { swLat: 37.15, swLng: 126.1, neLat: 37.83, neLng: 126.8 },
  '30': { swLat: 36.18, swLng: 127.24, neLat: 36.5, neLng: 127.56 },
  '31': { swLat: 35.32, swLng: 128.95, neLat: 35.73, neLng: 129.47 },
  '36': { swLat: 36.43, swLng: 127.15, neLat: 36.73, neLng: 127.4 },
  '41': { swLat: 36.89, swLng: 126.5, neLat: 38.3, neLng: 127.86 },
  '43': { swLat: 36.0, swLng: 127.25, neLat: 37.27, neLng: 128.66 },
  '44': { swLat: 35.97, swLng: 125.9, neLat: 37.07, neLng: 127.65 },
  '47': { swLat: 35.57, swLng: 128.0, neLat: 37.56, neLng: 129.6 },
  '48': { swLat: 34.47, swLng: 127.57, neLat: 35.92, neLng: 129.23 },
  '50': { swLat: 33.1, swLng: 126.1, neLat: 33.6, neLng: 127.0 },
  '51': { swLat: 37.02, swLng: 127.08, neLat: 38.62, neLng: 129.37 },
  '52': { swLat: 35.28, swLng: 126.37, neLat: 36.16, neLng: 127.92 },
  '12': { swLat: 33.9, swLng: 125.0, neLat: 35.5, neLng: 127.9 },
};

// 전남광주통합특별시 (12) absorbed Gwangju (29) and Jeollanam-do (46); older rows may still carry the old codes.
const MERGED: Record<string, string[]> = { '12': ['12', '29', '46'] };

export function inProvince(regionCode: string, sido: string): boolean {
  return (MERGED[sido] ?? [sido]).some((p) => regionCode.startsWith(p));
}
