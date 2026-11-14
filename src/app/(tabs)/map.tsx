import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api/kovil';
import { LeafletMap, type LeafletHandle, type MapView } from '@/components/leaflet-map';
import { Button, Card, EmptyState, Pill, Row, T } from '@/components/ui';
import { useLoad } from '@/hooks/use-load';
import { useI18n } from '@/i18n';
import { radius, space, useTheme } from '@/theme';

const START = { lat: 37.5663, lng: 126.9779, zoom: 15 };
/** Below this zoom the view is a whole city: too many pins to be useful. */
const DETAIL_ZOOM = 14;
const MAX_PINS = 80;
/** ~100 m grid so small pans don't refetch. */
const snap = (n: number) => Math.round(n * 1000) / 1000;

export default function MapScreen() {
  const { t, lang } = useI18n();
  const { c, dark } = useTheme();
  const map = useRef<LeafletHandle>(null);
  const [view, setView] = useState<MapView | null>(null);
  // Counts page loads: a theme switch reloads the WebView, which must get its pins and boundary again.
  const [loads, setLoads] = useState(0);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const ready = loads > 0;

  const center = view ? { lat: snap(view.lat), lng: snap(view.lng) } : null;
  const detailed = (view?.zoom ?? 0) >= DETAIL_ZOOM;
  const b = view?.bounds;
  const bounds = b ? { swLat: snap(b.swLat), swLng: snap(b.swLng), neLat: snap(b.neLat), neLng: snap(b.neLng) } : null;

  const area = useLoad(async (s) => {
    if (!center) return null;
    const [mine, ko] = await Promise.all([api.resolve(lang, center.lat, center.lng, s), lang === 'ko' ? null : api.resolve('ko', center.lat, center.lng, s)]);
    return { ...mine, koName: ko?.dong.name ?? mine.dong.name };
  }, [center?.lat ?? 0, center?.lng ?? 0, lang], { keep: true });
  const dongCode = area.data?.dong.code ?? '';
  const boundary = useLoad((s) => (dongCode ? api.boundary(lang, dongCode, s) : Promise.resolve(null)), [dongCode, lang], { keep: true });
  const stations = useLoad((s) => (detailed && bounds ? api.stations(lang, bounds, s) : Promise.resolve([])), [bounds, detailed, lang], { keep: true });
  const campuses = useLoad((s) => (detailed && bounds ? api.universities(lang, bounds, s) : Promise.resolve([])), [bounds, detailed, lang], { keep: true });

  // Push data into the map page whenever it changes (the WebView keeps its own state between pushes).
  useEffect(() => {
    if (!ready) return;
    const pins = [
      ...(stations.data ?? []).slice(0, MAX_PINS).map((s) => ({ id: s.code, lat: s.lat, lng: s.lng, title: s.name, subtitle: s.lines.map((l) => l.name).join(' · '), kind: 'station' as const, color: s.lines[0]?.color })),
      ...(campuses.data ?? []).slice(0, MAX_PINS).map((u) => ({ id: u.code + (u.campusName ?? ''), lat: u.lat, lng: u.lng, title: u.name, subtitle: u.campusName ?? undefined, kind: 'campus' as const })),
    ];
    map.current?.setPins(pins);
  }, [ready, loads, stations.data, campuses.data]);
  useEffect(() => {
    if (!ready) return;
    // GeoJSON is [lng, lat]; Leaflet wants [lat, lng]. Outer rings only (holes are rare and tiny for dongs).
    const rings = boundary.data?.geometry.coordinates.map((poly) => poly[0].map(([x, y]) => [y, x] as [number, number])) ?? [];
    map.current?.setBoundary(rings);
  }, [ready, loads, boundary.data]);

  async function locate() {
    const perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
    if (!perm?.granted) return;
    const pos = (await Location.getLastKnownPositionAsync().catch(() => null)) ?? (await Location.getCurrentPositionAsync().catch(() => null));
    if (pos) map.current?.flyTo(pos.coords.latitude, pos.coords.longitude, 16);
  }

  if (failed) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, padding: space.lg, justifyContent: 'center', gap: space.lg }}>
        <EmptyState icon="🗺️" text={t('map.unavailable')} />
        <Button
          label={t('common.retry')}
          onPress={() => {
            setFailed(false);
            setLoads(0);
            setAttempt(attempt + 1);
          }}
        />
        <Button kind="ghost" label={t('tab.areas')} onPress={() => router.navigate('/areas')} />
      </SafeAreaView>
    );
  }

  const a = area.data;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <LeafletMap
        key={`${attempt}-${dark}`}
        ref={map}
        lat={START.lat}
        lng={START.lng}
        zoom={START.zoom}
        dark={dark}
        onView={setView}
        onReady={() => setLoads((n) => n + 1)}
        onError={() => setFailed(true)}
      />

      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: space.lg, right: space.lg }} pointerEvents="box-none">
        <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
          <Card style={{ paddingVertical: space.sm, paddingHorizontal: space.md }}>
            <Row>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.primary }} />
              <T v="small">{t('map.legend.station')}</T>
              <T v="small">🎓 {t('map.legend.campus')}</T>
            </Row>
          </Card>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('map.locate')}
            onPress={locate}
            style={{ width: 48, height: 48, borderRadius: radius.pill, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border }}>
            <T style={{ fontSize: 20 }}>📍</T>
          </Pressable>
        </Row>
        {view && !detailed ? (
          <Card tone="alt" style={{ marginTop: space.sm, paddingVertical: space.sm }}>
            <T v="small">{t('map.zoomIn')}</T>
          </Card>
        ) : null}
      </SafeAreaView>

      {a ? (
        <Card style={{ position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg, gap: space.xs }}>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <View style={{ flexShrink: 1 }}>
              <T v="heading">{a.dong.name}</T>
              {lang !== 'ko' ? (
                <T v="label" color={c.primary}>
                  {a.koName}
                </T>
              ) : null}
              <T v="dim">
                {a.sigungu.name} · {a.sido.name}
              </T>
            </View>
            <Pill tone={a.serviceOpen ? 'green' : 'orange'} label={t(a.serviceOpen ? 'home.area.open' : 'home.area.closed')} />
          </Row>
          <Row style={{ flexWrap: 'nowrap' }}>
            <View style={{ flex: 1 }}>
              <Button kind="ghost" label={t('home.area.explore')} onPress={() => router.navigate({ pathname: '/areas', params: { region: a.sigungu.code, dong: a.dong.code, at: String(Date.now()) } })} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t('listings.title')} onPress={() => router.push({ pathname: '/listings', params: { lat: String(center?.lat), lng: String(center?.lng) } })} />
            </View>
          </Row>
        </Card>
      ) : center ? (
        // Location service unreachable: the homes nearby are still one tap away.
        <View style={{ position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg }}>
          <Button label={`🏠 ${t('listings.title')}`} onPress={() => router.push({ pathname: '/listings', params: { lat: String(center.lat), lng: String(center.lng) } })} />
        </View>
      ) : null}
    </View>
  );
}
