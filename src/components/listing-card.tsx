import { Image } from 'expo-image';
import { router } from 'expo-router';
import { View } from 'react-native';

import type { Listing } from '@/api/kovil';
import { Card, Pill, Row, T } from '@/components/ui';
import { useI18n } from '@/i18n';
import type { StringKey } from '@/i18n/catalogs';
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

const PHOTO_RATIO = 4 / 3;

export function ListingCard({ listing }: { listing: Listing }) {
  const { t } = useI18n();
  const { c } = useTheme();
  const price = usePrice();
  const place = [listing.regionName, listing.dongName].filter(Boolean).join(' ');
  return (
    <Card
      label={`${price(listing)}, ${listing.title}`}
      onPress={() =>
        router.push({
          pathname: '/listing/[uuid]',
          params: { uuid: listing.listingUuid },
        })
      }
      style={{
        padding: 0,
        overflow: 'hidden',
        gap: 0,
        borderRadius: radius.lg,
      }}>
      <View>
        {listing.thumbnailUrl ? (
          <Image source={listing.thumbnailUrl} style={{ width: '100%', aspectRatio: PHOTO_RATIO }} contentFit="cover" transition={200} accessibilityIgnoresInvertColors />
        ) : (
          <View
            style={{
              width: '100%',
              aspectRatio: 2,
              backgroundColor: c.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <T style={{ fontSize: 44, lineHeight: 54 }}>🏠</T>
          </View>
        )}
        {/* Deal type on the photo, like listing apps people already know. */}
        <View
          style={{
            position: 'absolute',
            top: space.md,
            left: space.md,
            flexDirection: 'row',
            gap: space.xs,
          }}>
          <Badge label={t(`listings.type.${listing.sellingType}` as StringKey)} />
          {listing.shortLease ? <Badge label={t('listing.shortLease')} /> : null}
        </View>
      </View>
      <View style={{ padding: space.lg, gap: space.xs }}>
        <T v="heading" style={{ fontSize: 19, lineHeight: 26 }} numberOfLines={1}>
          {price(listing)}
        </T>
        <T numberOfLines={2}>{listing.title}</T>
        {place ? (
          <T v="dim" numberOfLines={1}>
            📍 {place}
          </T>
        ) : null}
        <Row style={{ marginTop: space.xs }}>
          {listing.roomType ? <Pill tone="blue" label={t(`room.${listing.roomType}` as StringKey)} /> : null}
          {listing.exclusiveArea ? <Pill tone="blue" label={`${listing.exclusiveArea} m²`} /> : null}
        </Row>
      </View>
    </Card>
  );
}

/** Label on top of a photo: readable on any picture. */
function Badge({ label }: { label: string }) {
  return (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.94)',
        borderRadius: radius.pill,
        paddingVertical: 4,
        paddingHorizontal: 10,
      }}>
      <T v="small" color="#0F1B2D">
        {label}
      </T>
    </View>
  );
}
