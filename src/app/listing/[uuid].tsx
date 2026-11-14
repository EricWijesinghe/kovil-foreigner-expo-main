import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, ScrollView, useWindowDimensions, View } from 'react-native';

import { errorText } from '@/api/client';
import { api } from '@/api/kovil';
import { useSession } from '@/auth/session';
import { usePrice } from '@/components/listing-card';
import { Button, Card, ErrorBox, Loading, Pill, Row, Screen, Section, T } from '@/components/ui';
import { useLoad } from '@/hooks/use-load';
import { useI18n } from '@/i18n';
import type { StringKey } from '@/i18n/strings/en';
import { space, useTheme } from '@/theme';

const PHOTO_HEIGHT = 260;
const PHONE = /^\+?[0-9][0-9 -]{5,19}$/;

const MAX_PHOTOS = 12;

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

  if (detail.loading && !detail.data) return <Loading />;
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
    <Screen edges={[]}>
      {l.imageUrls.length ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }}>
          {l.imageUrls.slice(0, MAX_PHOTOS).map((u) => (
            <Image key={u} source={u} recyclingKey={u} style={{ width, height: PHOTO_HEIGHT }} contentFit="cover" accessibilityIgnoresInvertColors />
          ))}
        </ScrollView>
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
            {facts.filter(([, on]) => on).map(([label]) => (
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
      {session.signedIn ? (
        <>
          <Button label={`💬 ${t('listing.contact')}`} onPress={contact} busy={busy} />
          {reached ? (
            <T v="label" selectable style={{ textAlign: 'center' }}>
              📞 {reached}
            </T>
          ) : null}
          <Button kind="ghost" label={isSaved ? `♥ ${t('listing.saved')}` : `♡ ${t('listing.save')}`} onPress={save} disabled={busy} />
        </>
      ) : (
        <Button label={t('listing.contact.signIn')} onPress={needSignIn} />
      )}
    </Screen>
  );
}
