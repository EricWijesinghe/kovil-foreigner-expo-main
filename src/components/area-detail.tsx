import { router } from 'expo-router';
import { View } from 'react-native';

import { errorText } from '@/api/client';
import { around, api } from '@/api/kovil';
import { ListingCard } from '@/components/listing-card';
import { Button, Card, EmptyState, ErrorBox, LineBadge, Loading, Row, Section, SkeletonCards, T } from '@/components/ui';
import { useLoad } from '@/hooks/use-load';
import { useI18n } from '@/i18n';
import { space } from '@/theme';
import { distanceM } from '@/tools/geo';

export { distanceM };

const WALK_KM = 1.2;
/** Homes within this many metres of the point (server allows 100–3,000). */
const HOMES_RADIUS_M = 1500;
const MAX_NEARBY = 6;


export const fmtDistance = (m: number) => (m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`);

/**
 * Stations, campuses and homes around a point. Everything comes from the main API, so it works even where the
 * location service (neighbourhood names) is not deployed. Remount with a new `key` per place.
 */
export function AreaDetail({ lat, lng }: { lat: number; lng: number }) {
  const { t, lang } = useI18n();
  const box = around(lat, lng, WALK_KM);
  const stations = useLoad((s) => api.stations(lang, box, s), [lat, lng, lang]);
  const campuses = useLoad((s) => api.universities(lang, box, s), [lat, lng, lang]);
  const listings = useLoad((s) => api.listings(lang, { lat, lng, radius: HOMES_RADIUS_M }, s), [lat, lng, lang]);
  const failed = t('common.error');

  const byDistance = <X extends { lat: number; lng: number }>(xs: X[] | undefined) =>
    (xs ?? []).map((x) => ({ x, d: distanceM(lat, lng, x.lat, x.lng) })).sort((a, b) => a.d - b.d).slice(0, MAX_NEARBY);

  return (
    <View style={{ gap: space.lg }}>
      <Section title={t('areas.detail.stations')}>
        {stations.loading && !stations.data ? <Loading /> : null}
        {stations.error ? <ErrorBox message={errorText(stations.error, failed)} onRetry={stations.reload} /> : null}
        {stations.data && !stations.data.length ? <T v="dim">{t('areas.detail.none')}</T> : null}
        {byDistance(stations.data).map(({ x, d }) => (
          <Card key={x.code}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="heading">{x.name}</T>
              <T v="dim">{fmtDistance(d)}</T>
            </Row>
            <Row>
              {x.lines.map((l) => (
                <LineBadge key={l.code} name={l.name} color={l.color} />
              ))}
            </Row>
          </Card>
        ))}
      </Section>

      <Section title={t('areas.detail.campuses')}>
        {campuses.loading && !campuses.data ? <Loading /> : null}
        {campuses.error ? <ErrorBox message={errorText(campuses.error, failed)} onRetry={campuses.reload} /> : null}
        {campuses.data && !campuses.data.length ? <T v="dim">{t('areas.detail.none')}</T> : null}
        {byDistance(campuses.data).map(({ x, d }) => (
          <Card key={x.code + (x.campusName ?? '')}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="heading" style={{ flexShrink: 1 }}>
                🎓 {x.name}
                {x.campusName ? ` · ${x.campusName}` : ''}
              </T>
              <T v="dim">{fmtDistance(d)}</T>
            </Row>
          </Card>
        ))}
      </Section>

      <Section title={t('areas.detail.listings')}>
        {listings.loading && !listings.data ? <SkeletonCards count={2} /> : null}
        {listings.error ? <ErrorBox message={errorText(listings.error, failed)} onRetry={listings.reload} /> : null}
        {listings.data?.content.map((l) => <ListingCard key={l.listingUuid} listing={l} />)}
        {listings.data && !listings.data.content.length ? <EmptyState icon="🏠" text={t('home.listings.empty')} /> : null}
        {listings.data?.hasNext ? (
          <Button kind="ghost" label={t('listings.loadMore')} onPress={() => router.push({ pathname: '/listings', params: { lat: String(lat), lng: String(lng) } })} />
        ) : null}
      </Section>
    </View>
  );
}
