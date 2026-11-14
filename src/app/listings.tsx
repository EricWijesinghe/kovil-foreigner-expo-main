import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';

import { errorText } from '@/api/client';
import { api, type Listing, type ListingFilters, type RoomType, type SellingType } from '@/api/kovil';
import { ListingCard } from '@/components/listing-card';
import { Button, Chip, EmptyState, ErrorBox, Loading, Row, T } from '@/components/ui';
import { useLoad } from '@/hooks/use-load';
import { useI18n } from '@/i18n';
import type { StringKey } from '@/i18n/strings/en';
import { space, useTheme } from '@/theme';
import { MAN, shortWon } from '@/tools/money';

const SELLING: SellingType[] = ['MONTHLY_RENT', 'LEASE'];
const ROOMS: RoomType[] = ['ONE_ROOM', 'TWO_ROOM', 'THREE_ROOM', 'OFFICETEL'];
// Steps in units of ₩10,000, the way agents quote prices.
const DEPOSIT_STEPS = [500, 1000, 3000, 10000];
const RENT_STEPS = [40, 60, 80, 120];
const NEAR_RADIUS_M = 3000;

const toggle = <X,>(list: X[], x: X) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);

type More = { key: string; items: Listing[]; next: number; hasNext: boolean | null; busy: boolean; error: string | null };
const fresh = (key: string): More => ({ key, items: [], next: 1, hasNext: null, busy: false, error: null });

export default function Listings() {
  const { t, lang } = useI18n();
  const { c } = useTheme();
  const params = useLocalSearchParams<{ region?: string; lat?: string; lng?: string }>();
  const [selling, setSelling] = useState<SellingType[]>([]);
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [depositMax, setDepositMax] = useState<number | null>(null);
  const [rentMax, setRentMax] = useState<number | null>(null);

  const lat = Number(params.lat);
  const lng = Number(params.lng);
  const near = params.lat && params.lng && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng, radius: NEAR_RADIUS_M } : {};
  // Lump-sum leases have no monthly rent: the rent filter is hidden then and must not be sent either.
  const rentShown = !(selling.length === 1 && selling[0] === 'LEASE');
  const filters: ListingFilters = {
    regionCode: params.region,
    ...near,
    sellingTypes: selling,
    roomTypes: rooms,
    depositMax: depositMax ? depositMax * MAN : undefined,
    rentMax: rentShown && rentMax ? rentMax * MAN : undefined,
  };
  const key = JSON.stringify([filters, lang]);

  const first = useLoad((s) => api.listings(lang, { ...filters, page: 0 }, s), [filters, lang]);
  // Later pages are appended, never refetched: "show more" must not blank the list or reload pages 0..n.
  const [more, setMore] = useState<More>(() => fresh(key));
  if (more.key !== key) setMore(fresh(key));

  const items = [...(first.data?.content ?? []), ...more.items];
  const hasNext = more.hasNext ?? first.data?.hasNext ?? false;
  async function loadMore() {
    if (more.busy) return;
    setMore((m) => ({ ...m, busy: true, error: null }));
    try {
      const p = await api.listings(lang, { ...filters, page: more.next });
      setMore((m) => (m.key === key ? { ...m, items: [...m.items, ...p.content], next: m.next + 1, hasNext: p.hasNext, busy: false } : m));
    } catch (e) {
      setMore((m) => (m.key === key ? { ...m, busy: false, error: errorText(e, t('common.error')) } : m));
    }
  }

  const header = (
    <View style={{ gap: space.md, paddingBottom: space.md }}>
      <Row>
        {SELLING.map((s) => (
          <Chip key={s} label={t(`listings.type.${s}` as StringKey)} active={selling.includes(s)} onPress={() => setSelling(toggle(selling, s))} />
        ))}
      </Row>
      <Row>
        {ROOMS.map((r) => (
          <Chip key={r} label={t(`room.${r}` as StringKey)} active={rooms.includes(r)} onPress={() => setRooms(toggle(rooms, r))} />
        ))}
      </Row>
      <T v="label">{t('listings.depositMax')}</T>
      <Row>
        <Chip label={t('listings.any')} active={depositMax === null} onPress={() => setDepositMax(null)} />
        {DEPOSIT_STEPS.map((v) => (
          <Chip key={v} label={`≤ ${shortWon(v * MAN, lang)}`} active={depositMax === v} onPress={() => setDepositMax(v)} />
        ))}
      </Row>
      {rentShown ? (
        <>
          <T v="label">{t('listings.rentMax')}</T>
          <Row>
            <Chip label={t('listings.any')} active={rentMax === null} onPress={() => setRentMax(null)} />
            {RENT_STEPS.map((v) => (
              <Chip key={v} label={`≤ ${shortWon(v * MAN, lang)}`} active={rentMax === v} onPress={() => setRentMax(v)} />
            ))}
          </Row>
        </>
      ) : null}
      {first.data ? <T v="small">{t('listings.count', { count: first.data.totalElements })}</T> : null}
      {first.loading && !first.data ? <Loading /> : null}
      {first.error ? <ErrorBox message={errorText(first.error, t('common.error'))} onRetry={first.reload} /> : null}
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xxl }}
      keyboardShouldPersistTaps="handled"
      data={items}
      keyExtractor={(l) => l.listingUuid}
      renderItem={({ item }) => <ListingCard listing={item} />}
      ListHeaderComponent={header}
      ListEmptyComponent={first.data ? <EmptyState icon="🏘️" text={t('listings.empty')} /> : null}
      ListFooterComponent={
        <View style={{ gap: space.sm }}>
          {more.error ? <T color={c.danger}>{more.error}</T> : null}
          {hasNext ? <Button kind="ghost" label={t('listings.loadMore')} onPress={loadMore} busy={more.busy} /> : null}
        </View>
      }
      onRefresh={() => {
        setMore(fresh(key));
        first.reload();
      }}
      refreshing={false}
    />
  );
}
