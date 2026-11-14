import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { errorText } from '@/api/client';
import { api, type Region } from '@/api/kovil';
import { AreaDetail } from '@/components/area-detail';
import { Button, Card, Chip, ErrorBox, Loading, Row, Screen, SearchBox, Segmented, T } from '@/components/ui';
import { useLoad } from '@/hooks/use-load';
import { useI18n } from '@/i18n';
import { space, useTheme } from '@/theme';
import { PROVINCE_BOXES, inProvince } from '@/tools/provinces';

type Mode = 'dongs' | 'campus';
const PROVINCE_ICONS: Record<string, string> = { '11': '🏙️', '26': '🌊', '27': '🍎', '28': '✈️', '30': '🔬', '31': '🏭', '36': '🏛️', '41': '🏘️', '50': '🌴', '51': '⛰️' };

export default function Areas() {
  const { t, lang } = useI18n();
  // `at` makes every "Explore this area" tap a new jump, even to the same district.
  const params = useLocalSearchParams<{ region?: string; dong?: string; at?: string }>();
  const regions = useLoad((s) => api.regions(lang, s), [lang]);
  const [mode, setMode] = useState<Mode>('dongs');
  const [district, setDistrict] = useState<string | null>(null);
  const [province, setProvince] = useState<string | null>(null);
  const [dong, setDong] = useState<string | null>(null);
  const [jump, setJump] = useState<string | undefined>(undefined);
  if (params.at && params.at !== jump) {
    setJump(params.at);
    setMode('dongs');
    setDistrict(params.region ?? null);
    setProvince(null);
    setDong(params.dong ?? null);
  }

  // The province is whichever one owns the district (deep links do not carry a reliable province).
  const prov = regions.data?.find((p) => (district ? p.children.some((d) => d.code === district) : p.code === province));
  const dist = prov?.children.find((d) => d.code === district);
  const back = () => {
    if (dong) setDong(null);
    else if (district) {
      setProvince(prov?.code ?? null);
      setDistrict(null);
    } else setProvince(null);
  };

  return (
    <Screen onRefresh={regions.reload}>
      <View style={{ gap: 2 }}>
        <T v="title">{t('areas.title')}</T>
        <T v="dim">{mode === 'dongs' ? t('areas.subtitle') : t('campus.subtitle')}</T>
      </View>
      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { key: 'dongs', label: t('areas.segment.dongs') },
          { key: 'campus', label: t('areas.segment.campus') },
        ]}
      />

      {regions.loading && !regions.data ? <Loading /> : null}
      {regions.error ? <ErrorBox message={errorText(regions.error, t('common.error'))} onRetry={regions.reload} /> : null}

      {mode === 'campus' && regions.data ? <Campus regions={regions.data} /> : null}

      {mode === 'dongs' && regions.data ? (
        <>
          {prov ? (
            <Row>
              <Chip label={`← ${t('areas.back')}`} onPress={back} />
              <T v="label" style={{ flexShrink: 1 }}>
                {[prov.name, dist?.name].filter(Boolean).join(' › ')}
              </T>
            </Row>
          ) : (
            <Provinces regions={regions.data} onPick={setProvince} />
          )}
          {prov && !dist ? (
            <Row>
              {prov.children.map((d) => (
                <Chip key={d.code} label={d.name} onPress={() => setDistrict(d.code)} />
              ))}
            </Row>
          ) : null}
          {dist ? <Dongs key={dist.code} region={dist} selected={dong} onPick={setDong} /> : null}
        </>
      ) : null}
    </Screen>
  );
}

function Provinces({ regions, onPick }: { regions: Region[]; onPick: (code: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
      {regions.map((p) => (
        <Card key={p.code} label={p.name} onPress={() => onPick(p.code)} style={{ width: '47%', minHeight: 96, justifyContent: 'space-between' }}>
          <T style={{ fontSize: 26 }}>{PROVINCE_ICONS[p.code] ?? '📍'}</T>
          <T v="heading">{p.name}</T>
          <T v="small">{p.children.length}</T>
        </Card>
      ))}
    </View>
  );
}

/** Dong list with Korean names under the user's language; the chosen dong is kept by code so names follow the language. */
function Dongs({ region, selected, onPick }: { region: Region; selected: string | null; onPick: (code: string) => void }) {
  const { t, lang } = useI18n();
  const { c } = useTheme();
  const [query, setQuery] = useState('');
  const dongs = useLoad(async (s) => {
    const [mine, ko] = await Promise.all([api.dongs(lang, region.code, s), lang === 'ko' ? null : api.dongs('ko', region.code, s)]);
    const koByCode = new Map((ko ?? mine).map((d) => [d.code, d.name]));
    return mine.map((d) => ({ ...d, ko: koByCode.get(d.code) ?? d.name }));
  }, [region.code, lang]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (dongs.data ?? []).filter((d) => !q || d.name.toLowerCase().includes(q) || d.ko.includes(q));
  }, [dongs.data, query]);
  const pick = dongs.data?.find((d) => d.code === selected);

  if (dongs.loading && !dongs.data) return <Loading />;
  // Neighbourhood lists come from the location service; without it the district's homes are still one tap away.
  if (dongs.error) {
    return (
      <Card>
        <T v="heading">{region.name}</T>
        <Button label={`🏠 ${t('listings.title')}`} onPress={() => router.push({ pathname: '/listings', params: { region: region.code } })} />
        <Button kind="ghost" label={t('common.retry')} onPress={dongs.reload} />
      </Card>
    );
  }
  if (pick) {
    return (
      <View style={{ gap: space.lg }}>
        <Card>
          <T v="title">{pick.name}</T>
          {lang !== 'ko' ? (
            <T v="heading" color={c.primary}>
              {pick.ko}
            </T>
          ) : null}
          <T v="dim">{region.name}</T>
        </Card>
        <AreaDetail key={pick.code} lat={pick.lat} lng={pick.lng} />
      </View>
    );
  }
  return (
    <View style={{ gap: space.md }}>
      <SearchBox value={query} onChangeText={setQuery} placeholder={t('areas.search')} />
      <T v="small">{shown.length ? t('areas.dongs.count', { count: shown.length }) : t('areas.search.empty')}</T>
      {shown.map((d) => (
        <Card key={d.code} label={d.name} onPress={() => onPick(d.code)}>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <View style={{ flexShrink: 1 }}>
              <T v="heading">{d.name}</T>
              {lang !== 'ko' ? <T v="dim">{d.ko}</T> : null}
            </View>
            <T v="heading" color={c.primary}>
              ›
            </T>
          </Row>
        </Card>
      ))}
    </View>
  );
}

function Campus({ regions }: { regions: Region[] }) {
  const { t, lang } = useI18n();
  const [sido, setSido] = useState('11');
  const [query, setQuery] = useState('');
  const box = PROVINCE_BOXES[sido];
  const unis = useLoad((s) => (box ? api.universities(lang, box, s) : Promise.resolve([])), [sido, lang]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (unis.data ?? [])
      .filter((u) => inProvince(u.regionCode, sido)) // boxes overlap; the region code decides
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.shortName?.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, lang));
  }, [unis.data, query, lang, sido]);

  return (
    <View style={{ gap: space.md }}>
      <Row>
        {regions.filter((p) => PROVINCE_BOXES[p.code]).map((p) => (
          <Chip key={p.code} label={p.name} active={p.code === sido} onPress={() => setSido(p.code)} />
        ))}
      </Row>
      <SearchBox value={query} onChangeText={setQuery} placeholder={t('campus.search')} />
      {unis.loading ? <Loading /> : null}
      {unis.error ? <ErrorBox message={errorText(unis.error, t('common.error'))} onRetry={unis.reload} /> : null}
      {!unis.loading && !unis.error ? <T v="small">{shown.length ? t('campus.count', { count: shown.length }) : t('campus.empty')}</T> : null}
      {!unis.loading &&
        shown.map((u) => (
          <Card key={u.code + (u.campusName ?? '')}>
            <T v="heading">🎓 {u.name}</T>
            {u.campusName ? <T v="dim">{u.campusName}</T> : null}
          </Card>
        ))}
    </View>
  );
}

// Render errors on this route show a recovery screen instead of closing the app.
export { CrashScreen as ErrorBoundary } from '@/components/crash-screen';
