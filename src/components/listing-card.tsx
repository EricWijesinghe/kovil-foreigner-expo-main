import { Image } from 'expo-image';
import { router } from 'expo-router';
import { View } from 'react-native';

import type { Listing } from '@/api/kovil';
import { Card, Pill, Row, T } from '@/components/ui';
import { useI18n } from '@/i18n';
import type { StringKey } from '@/i18n/strings/en';
import { radius, space, useTheme } from '@/theme';
import { formatWon } from '@/tools/money';

export function usePrice() {
  const { t, lang } = useI18n();
  return (l: Pick<Listing, 'sellingType' | 'deposit' | 'monthlyRent'>) => {
    // A missing amount shows as a dash, never as ₩0 (which reads like a real price).
    const won = (n: number | null) => (n == null ? '–' : formatWon(n, lang));
    const deposit = won(l.deposit);
    return l.sellingType === 'LEASE' ? t('listing.price.lease', { deposit }) : t('listing.price.monthly', { deposit, rent: won(l.monthlyRent) });
  };
}

export function ListingCard({ listing }: { listing: Listing }) {
  const { t } = useI18n();
  const { c } = useTheme();
  const price = usePrice();
  return (
    <Card label={listing.title} onPress={() => router.push({ pathname: '/listing/[uuid]', params: { uuid: listing.listingUuid } })} style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
      {listing.thumbnailUrl ? (
        <Image source={listing.thumbnailUrl} style={{ width: '100%', height: 170 }} contentFit="cover" accessibilityIgnoresInvertColors />
      ) : (
        <View style={{ height: 90, backgroundColor: c.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ fontSize: 34 }}>🏠</T>
        </View>
      )}
      <View style={{ padding: space.lg, gap: space.xs }}>
        <T v="heading" numberOfLines={1}>
          {price(listing)}
        </T>
        <T numberOfLines={2}>{listing.title}</T>
        <Row>
          {listing.roomType ? <Pill tone="blue" label={t(`room.${listing.roomType}` as StringKey)} /> : null}
          {listing.exclusiveArea ? <Pill tone="blue" label={`${listing.exclusiveArea} m²`} /> : null}
          {listing.shortLease ? <Pill tone="green" label={t('listing.shortLease')} /> : null}
        </Row>
        {listing.dongName ? (
          <T v="small" style={{ borderRadius: radius.sm }}>
            📍 {[listing.regionName, listing.dongName].filter(Boolean).join(' ')}
          </T>
        ) : null}
      </View>
    </Card>
  );
}
