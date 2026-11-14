import { API_URL, CORE_URL, request } from './client';

export type Named = { code: string; name: string };
export type Region = Named & { children: Region[] };
export type Language = { code: string; nativeName: string; englishName: string; isDefault: boolean };
export type University = { code: string; name: string; shortName: string | null; campusName: string | null; lat: number; lng: number; regionCode: string };
export type Station = { code: string; name: string; lat: number; lng: number; lines: { code: string; name: string; color: string }[] };
export type Dong = { code: string; name: string; lat: number; lng: number };
export type ResolvedArea = { sido: Named; sigungu: Named; dong: Named; serviceOpen: boolean; match: 'INSIDE' | 'NEAREST' };
export type Boundary = { properties: { code: string; name: string; attribution: string }; geometry: { coordinates: [number, number][][][] } };
export type SellingType = 'MONTHLY_RENT' | 'LEASE';
export type RoomType = 'ONE_ROOM' | 'TWO_ROOM' | 'THREE_ROOM' | 'OFFICETEL';
export type Listing = {
  listingUuid: string;
  title: string;
  sellingType: SellingType;
  roomType: RoomType | null;
  deposit: number | null;
  monthlyRent: number | null;
  exclusiveArea: number | null;
  dongName: string | null;
  regionName: string | null;
  thumbnailUrl: string | null;
  shortLease: boolean;
};
export type ListingDetail = Listing & {
  description: string | null;
  address: string | null;
  imageUrls: string[];
  buildingFloor: number | null;
  canParking: boolean;
  hasElevator: boolean | null;
  moveInImmediate: boolean;
  moveInDate: string | null;
  residentRegistration: string | null;
  depositInsurance: string | null;
  favorited: boolean;
  office: { name?: string } | null;
};
export type ListingPage = { content: Listing[]; totalElements: number; hasNext: boolean };
export type ListingFilters = {
  regionCode?: string;
  /** Radius search: lat, lng and radius (metres, 100–3,000) go together. */
  lat?: number;
  lng?: number;
  radius?: number;
  sellingTypes?: SellingType[];
  roomTypes?: RoomType[];
  depositMax?: number;
  rentMax?: number;
  page?: number;
};
/** smsNumber is a mobile that can take texts; offices without one only have callNumber (landline). */
export type Inquiry = { smsNumber: string | null; callNumber: string | null; smsBody: string };
export type Bounds = { swLat: number; swLng: number; neLat: number; neLng: number };

type Query = Record<string, string | number | boolean | undefined | (string | number)[]>;
/** Spring binds repeated keys to lists (`sellingTypes=A&sellingTypes=B`). Undefined values are dropped. */
export function qs(o: Query): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined) continue;
    for (const item of Array.isArray(v) ? v : [v]) parts.push(`${k}=${encodeURIComponent(item)}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

/** Square box of about `km` around a point (1° lat ≈ 111 km; longitude shrinks with latitude). */
export function around(lat: number, lng: number, km = 1.2): Bounds {
  const dLat = km / 111;
  const dLng = km / (111 * Math.cos((lat * Math.PI) / 180));
  return { swLat: lat - dLat, swLng: lng - dLng, neLat: lat + dLat, neLng: lng + dLng };
}

const HEALTH_TIMEOUT_MS = 3000;
type Sig = AbortSignal | undefined;

export const api = {
  languages: (lang: string, signal?: Sig) => request<Language[]>(API_URL, '/api/v1/languages', lang, { signal }),
  regions: (lang: string, signal?: Sig) => request<Region[]>(API_URL, '/api/v1/regions', lang, { signal }),
  universities: async (lang: string, b: Bounds, signal?: Sig) => (await request<University[] | null>(API_URL, '/api/v1/universities' + qs(b), lang, { signal })) ?? [],
  stations: async (lang: string, b: Bounds, signal?: Sig) => (await request<Station[] | null>(API_URL, '/api/v1/transit/subway-stations' + qs(b), lang, { signal })) ?? [],
  listings: (lang: string, f: ListingFilters, signal?: Sig) =>
    request<ListingPage>(API_URL, '/api/v1/listings' + qs({ ...f, size: 20 }), lang, { signal, auth: true }),
  listing: (lang: string, uuid: string, signal?: Sig) =>
    request<ListingDetail>(API_URL, `/api/v1/listings/${encodeURIComponent(uuid)}`, lang, { signal, auth: true }),
  favorite: (lang: string, uuid: string, on: boolean) =>
    request<null>(API_URL, `/api/v1/listings/${encodeURIComponent(uuid)}/favorite`, lang, { method: on ? 'POST' : 'DELETE', auth: true }),
  /** Server falls back to the Korean original (translated=false) when the engine or quota is unavailable. */
  translate: (lang: string, uuid: string) =>
    request<{ content: string; translated: boolean }>(API_URL, `/api/v1/listings/${encodeURIComponent(uuid)}/description/translate${qs({ language: lang })}`, lang, {
      method: 'POST',
      auth: true,
    }),
  inquire: (lang: string, uuid: string) =>
    request<Inquiry>(API_URL, `/api/v1/listings/${encodeURIComponent(uuid)}/inquiries`, lang, { method: 'POST', auth: true }),
  resolve: (lang: string, lat: number, lng: number, signal?: Sig) => request<ResolvedArea>(CORE_URL, '/api/v1/areas/resolve' + qs({ lat, lng }), lang, { signal }),
  dongs: (lang: string, regionCode: string, signal?: Sig) => request<Dong[]>(CORE_URL, `/api/v1/regions/${encodeURIComponent(regionCode)}/dongs`, lang, { signal }),
  boundary: (lang: string, dongCode: string, signal?: Sig) =>
    request<Boundary>(CORE_URL, `/api/v1/areas/dongs/${encodeURIComponent(dongCode)}/boundary`, lang, { signal }),
  health: async (base: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    try {
      return (await fetch(base + '/actuator/health', { signal: controller.signal })).ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  },
  apiUrl: API_URL,
  coreUrl: CORE_URL,
};
