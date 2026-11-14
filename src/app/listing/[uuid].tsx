import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorText } from '@/api/client';
import { api } from '@/api/kovil';
import { useSession } from '@/auth/session';
import { usePrice } from '@/components/listing-card';
import { Button, Card, ErrorBox, Pill, Row, Screen, Section, Skeleton, T, useElevation } from '@/components/ui';
import { useLoad } from '@/hooks/use-load';
import { useI18n } from '@/i18n';
import type { StringKey } from '@/i18n/catalogs';
import { radius, space, useTheme } from '@/theme';

const PHOTO_HEIGHT = 260;
const PHONE = /^\+?[0-9][0-9 -]{5,19}$/;

const MAX_PHOTOS = 12;
const BAR_SPACE = 88;

/** Per-listing state (translation, saved, revealed number) resets when the listing, language or sign-in changes. */
export default function ListingDetail() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const { lang } = useI18n();
  const { signedIn } = useSession();
  return <Detail key={`${uuid}|${lang}|${signedIn}`} uuid={uuid} />;
}

function Detail({ uuid }: { uuid: string }) {
  const { t, lang } = useI18n();
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const session = useSession();
  const price = usePrice();
  const detail = useLoad((s) => api.listing(lang, uuid, s), [uuid, lang, session.signedIn]);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reached, setReached] = useState<string | null>(null);
  const [translation, setTranslation] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [photo, setPhoto] = useState(0);
  // Measured, not fixed: the bar grows with large fonts, a two-line price and the gesture-bar inset.
  const [barHeight, setBarHeight] = useState(BAR_SPACE);
  const insets = useSafeAreaInsets();
  const lift = useElevation(2);

  if (detail.loading && !detail.data) return <DetailSkeleton />;
  if (detail.error || !detail.data) {
    return (
      <Screen edges={[]}>
        <ErrorBox message={errorText(detail.error, t('common.error'))} onRetry={detail.reload} />
      </Screen>
    );
  }
  const l = detail.data;
  const isSaved = saved ?? l.favorited;

  const needSignIn = () => router.push({ pathname: '/auth', params: { mode: 'signIn' } });
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(errorText(e, t('common.error')));
    } finally {
      setBusy(false);
    }
  }
  const save = () =>
    act(async () => {
      await api.favorite(lang, l.listingUuid, !isSaved);
      setSaved(!isSaved);
    });
  const translate = () =>
    act(async () => {
      const r = await api.translate(lang, l.listingUuid);
      if (r.translated) setTranslation(r.content);
      else setActionError(t('listing.translate.unavailable'));
    });
  // The only way to reach the agent: the server reveals the number per request (anti-scraping) and we open SMS.
  const contact = () =>
    act(async () => {
      const q = await api.inquire(lang, l.listingUuid);
      // Server data goes into a URL: accept phone-number characters only, so it cannot add recipients or params.
      const sms = q.smsNumber && PHONE.test(q.smsNumber) ? q.smsNumber : null;
      const call = q.callNumber && PHONE.test(q.callNumber) ? q.callNumber : null;
      setReached(sms ?? call);
      if (sms) {
        const sep = Platform.OS === 'ios' ? '&' : '?';
        await Linking.openURL(`sms:${sms}${sep}body=${encodeURIComponent(q.smsBody)}`);
      } else if (call) {
        await Linking.openURL(`tel:${call}`);
      }
    });

  const photos = l.imageUrls.slice(0, MAX_PHOTOS);
  const facts: [string, boolean][] = [
    [l.buildingFloor ? t('listing.floor', { floor: l.buildingFloor }) : '', !!l.buildingFloor],
    [t('listing.parking'), l.canParking],
    [t('listing.elevator'), !!l.hasElevator],
    [l.moveInImmediate ? t('listing.moveInNow') : t('listing.moveInDate', { date: l.moveInDate ?? '' }), l.moveInImmediate || !!l.moveInDate],
    [t('listing.registration'), l.residentRegistration === 'POSSIBLE'],
    [t('listing.insurance'), l.depositInsurance === 'POSSIBLE'],
    [t('listing.shortLease'), l.shortLease],
  ];

  return (
    <View style={{ flex: 1 }}>
      <Screen edges={[]}>
        {photos.length ? (
          <View style={{ marginHorizontal: -space.lg, marginTop: -space.lg }}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setPhoto(Math.min(photos.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width)))))}>
              {photos.map((u) => (
                <Image key={u} source={u} recyclingKey={u} style={{ width, height: PHOTO_HEIGHT }} contentFit="cover" transition={200} accessibilityIgnoresInvertColors />
              ))}
            </ScrollView>
            {photos.length > 1 ? (
              <View
                style={{
                  position: 'absolute',
                  right: space.lg,
                  bottom: space.md,
                  backgroundColor: 'rgba(15,27,45,0.72)',
                  borderRadius: radius.pill,
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                }}>
                <T v="small" color="#FFFFFF">{`${photo + 1} / ${photos.length}`}</T>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={{ gap: space.xs }}>
          <T v="title">{price(l)}</T>
          <T v="heading">{l.title}</T>
          <T v="dim">📍 {l.address ?? [l.dongName, t('listing.address.hidden')].filter(Boolean).join(' · ')}</T>
          <Row>
            {l.roomType ? <Pill tone="blue" label={t(`room.${l.roomType}` as StringKey)} /> : null}
            {l.exclusiveArea ? <Pill tone="blue" label={`${l.exclusiveArea} m²`} /> : null}
            <Pill tone="green" label={t(`listings.type.${l.sellingType}` as StringKey)} />
          </Row>
        </View>

        {facts.some(([, on]) => on) ? (
          <Card>
            <Row>
              {facts
                .filter(([, on]) => on)
                .map(([label]) => (
                  <Pill key={label} tone="green" label={`✓ ${label}`} />
                ))}
            </Row>
          </Card>
        ) : null}

        {l.description ? (
          <Section title={t('listing.description')}>
            <Card>
              <T>{translation && !showOriginal ? translation : l.description}</T>
              {translation ? (
                <Row style={{ justifyContent: 'space-between' }}>
                  <Pill tone="blue" label={`🌐 ${t('listing.translated')}`} />
                  <Button kind="ghost" label={showOriginal ? t('listing.translate') : t('listing.showOriginal')} onPress={() => setShowOriginal(!showOriginal)} />
                </Row>
              ) : lang !== 'ko' && session.signedIn ? (
                <Button kind="ghost" label={`🌐 ${t('listing.translate')}`} onPress={translate} busy={busy} />
              ) : null}
            </Card>
          </Section>
        ) : null}

        {actionError ? <T color={c.danger}>{actionError}</T> : null}
        {reached ? (
          <T v="label" selectable style={{ textAlign: 'center' }}>
            📞 {reached}
          </T>
        ) : null}
        {session.signedIn ? <Button kind="ghost" label={isSaved ? `♥ ${t('listing.saved')}` : `♡ ${t('listing.save')}`} onPress={save} disabled={busy} /> : null}
        {/* Room for the action bar so the last content is never hidden under it. */}
        <View style={{ height: barHeight + space.md }} />
      </Screen>
      {/* Sticky action bar: price stays visible and the main action is one tap away while reading. */}
      <View
        onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: c.card,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: c.border,
          },
          {
            paddingHorizontal: space.lg,
            paddingTop: space.md,
            paddingBottom: Math.max(insets.bottom, space.md),
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
          },
          lift,
        ]}>
        <View style={{ flex: 1 }}>
          <T v="heading" numberOfLines={2}>
            {price(l)}
          </T>
        </View>
        <View style={{ flexShrink: 0, maxWidth: '55%' }}>
          {session.signedIn ? <Button label={`💬 ${t('listing.contact')}`} onPress={contact} busy={busy} /> : <Button label={t('listing.contact.signIn')} onPress={needSignIn} />}
        </View>
      </View>
    </View>
  );
}

function DetailSkeleton() {
  const { width } = useWindowDimensions();
  return (
    <View accessible accessibilityRole="progressbar" style={{ gap: space.lg }}>
      <Skeleton height={PHOTO_HEIGHT} width={width} round={0} />
      <View style={{ paddingHorizontal: space.lg, gap: space.md }}>
        <Skeleton height={28} width="60%" />
        <Skeleton height={20} width="90%" />
        <Skeleton height={16} width="70%" />
        <Skeleton height={120} />
      </View>
    </View>
  );
}

// Render errors on this route show a recovery screen instead of closing the app.
export { CrashScreen as ErrorBoundary } from '@/components/crash-screen';
