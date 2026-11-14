import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ApiError, errorText } from '@/api/client';
import { api } from '@/api/kovil';
import { AreaDetail } from '@/components/area-detail';
import { PERSONA_ICON } from '@/components/onboarding';
import { Button, Card, ErrorBox, Loading, Pill, Row, Screen, Section, T } from '@/components/ui';
import { useLoad } from '@/hooks/use-load';
import { useI18n } from '@/i18n';
import type { StringKey } from '@/i18n/catalogs';
import { usePrefs } from '@/prefs';
import { radius, space, useTheme } from '@/theme';
import { inKorea } from '@/tools/geo';

const inKoreaAt = (p: Point) => inKorea(p.lat, p.lng);

const SEOUL_CITY_HALL = { lat: 37.5663, lng: 126.9779 };
const GPS_TIMEOUT_MS = 10_000;

// Korean originals stay in Hangul: it is what landlords, agents and contracts actually say.
export const GLOSSARY: { id: string; ko: string; icon: string }[] = [
  { id: 'deposit', ko: '보증금', icon: '💰' },
  { id: 'wolse', ko: '월세', icon: '📅' },
  { id: 'jeonse', ko: '전세', icon: '🏦' },
  { id: 'maintenance', ko: '관리비', icon: '🧾' },
  { id: 'moveInReport', ko: '전입신고', icon: '📝' },
  { id: 'arc', ko: '외국인등록증', icon: '🪪' },
  { id: 'oneRoom', ko: '원룸', icon: '🛏️' },
  { id: 'agent', ko: '공인중개사', icon: '🤝' },
];

type Point = { lat: number; lng: number };
type Status = { kind: 'idle' | 'locating' } | { kind: 'point'; at: Point } | { kind: 'message'; key: StringKey };

function greetingKey(): StringKey {
  const h = new Date().getHours();
  return h < 12 ? 'home.greeting.morning' : h < 18 ? 'home.greeting.afternoon' : 'home.greeting.evening';
}

async function currentPosition(): Promise<Point | null> {
  // A fresh fix can hang indoors or fail on emulators; the last known position is enough to name a neighbourhood.
  const fresh = Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    new Promise<null>((r) => setTimeout(() => r(null), GPS_TIMEOUT_MS)),
  ]).catch(() => null);
  const pos = (await fresh) ?? (await Location.getLastKnownPositionAsync().catch(() => null));
  return pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : null;
}

export default function Home() {
  const { t } = useI18n();
  const { c } = useTheme();
  const { persona } = usePrefs();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function locate() {
    setStatus({ kind: 'locating' });
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return setStatus({ kind: 'message', key: 'home.locate.denied' });
      const at = await currentPosition();
      setStatus(at ? { kind: 'point', at } : { kind: 'message', key: 'common.error' });
    } catch {
      setStatus({ kind: 'message', key: 'common.error' });
    }
  }

  return (
    <Screen>
      <View style={{ backgroundColor: c.hero[0], borderRadius: radius.lg, padding: space.xl, overflow: 'hidden', gap: space.md }}>
        <View style={{ position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: c.hero[1], top: -70, right: -60, opacity: 0.6 }} />
        <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: c.orange, bottom: -50, right: 40, opacity: 0.35 }} />
        <T v="label" color="#DCE6FF">
          {t(greetingKey())} 👋
        </T>
        <T v="hero" color="#FFFFFF">
          {t('home.title')}
        </T>
        <T color="#E8EEFF">{t('home.subtitle')}</T>
        <Button label={`📍 ${t('home.locate.button')}`} onPress={locate} busy={status.kind === 'locating'} kind="ghost" />
      </View>

      {status.kind === 'locating' ? <T v="dim">{t('home.locate.locating')}</T> : null}
      {status.kind === 'message' ? (
        <Card tone="alt">
          <T>{t(status.key)}</T>
          <Button kind="ghost" label={`🏛️ ${t('home.locate.trySeoul')}`} onPress={() => setStatus({ kind: 'point', at: SEOUL_CITY_HALL })} />
        </Card>
      ) : null}
      {status.kind === 'point' ? <FoundArea key={`${status.at.lat},${status.at.lng}`} at={status.at} onSeoul={() => setStatus({ kind: 'point', at: SEOUL_CITY_HALL })} /> : null}

      <Card onPress={() => router.push('/listings')} label={t('home.search.title')} style={{ borderColor: c.primary, borderWidth: 1 }}>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <View style={{ flexShrink: 1, gap: 2 }}>
            <T v="heading">🔎 {t('home.search.title')}</T>
            <T v="dim">{t('home.search.body')}</T>
          </View>
          <T v="title" color={c.primary}>
            ›
          </T>
        </Row>
      </Card>

      {persona ? (
        <Section title={`${PERSONA_ICON[persona]} ${t('home.tips.title')}`}>
          {[1, 2].map((n) => (
            <Card key={n} tone="alt">
              <T>💡 {t(`tips.${persona}.${n}` as StringKey)}</T>
            </Card>
          ))}
        </Section>
      ) : null}

      <Section title={t('home.glossary.title')} subtitle={t('home.glossary.subtitle')}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingRight: space.lg }}>
          {GLOSSARY.map((g) => (
            <Card key={g.id} style={{ width: 250 }}>
              <T style={{ fontSize: 28 }}>{g.icon}</T>
              <T v="title" color={c.primary}>
                {g.ko}
              </T>
              <T v="heading">{t(`glossary.${g.id}.term` as StringKey)}</T>
              <T v="dim">{t(`glossary.${g.id}.body` as StringKey)}</T>
            </Card>
          ))}
        </ScrollView>
      </Section>
    </Screen>
  );
}

/** Names reload when the language changes: only the point is kept in state. */
function FoundArea({ at, onSeoul }: { at: Point; onSeoul: () => void }) {
  const { t, lang } = useI18n();
  const { c } = useTheme();
  const area = useLoad(async (s) => {
    if (!inKoreaAt(at)) return null; // no server call for a point we already know is outside Korea
    const [mine, ko] = await Promise.all([api.resolve(lang, at.lat, at.lng, s), lang === 'ko' ? null : api.resolve('ko', at.lat, at.lng, s)]);
    return { ...mine, koName: ko?.dong.name ?? mine.dong.name };
  }, [at.lat, at.lng, lang]);

  if (!inKoreaAt(at)) {
    return (
      <Card tone="alt">
        <T>{t('home.locate.outside')}</T>
        <Button kind="ghost" label={`🏛️ ${t('home.locate.trySeoul')}`} onPress={onSeoul} />
      </Card>
    );
  }
  if (area.loading && !area.data) return <Loading />;
  if (!area.data && !area.error) return null;
  // Neighbourhood names come from the location service; if it is unreachable, still show what is nearby.
  if (area.error) {
    const offline = area.error instanceof ApiError && area.error.status === 0;
    return (
      <View style={{ gap: space.lg }}>
        {offline ? <ErrorBox message={errorText(area.error, t('common.error'))} onRetry={area.reload} /> : null}
        <AreaDetail lat={at.lat} lng={at.lng} />
      </View>
    );
  }
  const a = area.data!;
  return (
    <View style={{ gap: space.lg }}>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pill tone={a.serviceOpen ? 'green' : 'orange'} label={t(a.serviceOpen ? 'home.area.open' : 'home.area.closed')} />
          <T v="small">📍</T>
        </Row>
        <T v="title">{a.dong.name}</T>
        {lang !== 'ko' ? (
          <T v="heading" color={c.primary}>
            {a.koName}
          </T>
        ) : null}
        <T v="dim">
          {a.sigungu.name} · {a.sido.name}
        </T>
        {a.match === 'NEAREST' ? <T v="small">{t('home.locate.near')}</T> : null}
        <Button
          kind="ghost"
          label={t('home.area.explore')}
          onPress={() => router.navigate({ pathname: '/areas', params: { region: a.sigungu.code, dong: a.dong.code, at: String(Date.now()) } })}
        />
      </Card>
      <AreaDetail lat={at.lat} lng={at.lng} />
    </View>
  );
}

// Render errors on this route show a recovery screen instead of closing the app.
export { CrashScreen as ErrorBoundary } from '@/components/crash-screen';
