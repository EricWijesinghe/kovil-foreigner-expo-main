import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { rustCoreVersion } from '../../../modules/kovil-core';

import { api } from '@/api/kovil';
import { useSession } from '@/auth/session';
import { PERSONA_ICON } from '@/components/onboarding';
import { Button, Card, Chip, Pill, Row, Screen, Section, T } from '@/components/ui';
import { useLoad } from '@/hooks/use-load';
import { LANGUAGES, type Lang, useI18n } from '@/i18n';
import type { StringKey } from '@/i18n/catalogs';
import { PERSONAS, usePrefs } from '@/prefs';
import { radius, space, type ThemeMode, useTheme } from '@/theme';

const MODES: ThemeMode[] = ['system', 'light', 'dark'];

export default function Me() {
  const { t, lang, chosen, setLanguage } = useI18n();
  const { c, mode, setMode } = useTheme();
  const session = useSession();
  const prefs = usePrefs();
  // Server names win (curated); the built-in list keeps the picker working offline.
  const serverLangs = useLoad((s) => api.languages(lang, s), [lang]);
  const names = new Map(serverLangs.data?.map((l) => [l.code, l.nativeName]));
  const status = useLoad(() => api.health(api.apiUrl), []);

  return (
    <Screen onRefresh={status.reload}>
      <T v="title">{t('me.title')}</T>

      {session.me ? (
        <Card>
          <Row style={{ flexWrap: 'nowrap' }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <T v="title" color={c.primary}>
                {(session.me.name || session.me.nickname || session.me.email || '?').slice(0, 1).toUpperCase()}
              </T>
            </View>
            <View style={{ flexShrink: 1, gap: 2 }}>
              <T v="heading">{session.me.name || session.me.nickname}</T>
              {session.me.email ? <T v="dim">{session.me.email}</T> : null}
              {session.me.phoneVerified ? <Pill tone="green" label={`✓ ${t('auth.verified')}`} /> : null}
            </View>
          </Row>
          <Button kind="danger" label={t('me.signOut')} onPress={session.signOut} />
        </Card>
      ) : (
        <Card style={{ borderColor: c.primary, borderWidth: 1 }}>
          <T v="heading">👤 {t('me.signedOut.title')}</T>
          <T v="dim">{t('me.signedOut.body')}</T>
          <Button label={t('auth.signIn')} onPress={() => router.push({ pathname: '/auth', params: { mode: 'signIn' } })} />
          <Button kind="ghost" label={t('auth.signUp')} onPress={() => router.push({ pathname: '/auth', params: { mode: 'signUp' } })} />
        </Card>
      )}

      <Section title={t('me.persona')}>
        <Row>
          {PERSONAS.map((p) => (
            <Chip key={p} label={`${PERSONA_ICON[p]} ${t(`persona.${p}` as StringKey)}`} active={prefs.persona === p} onPress={() => prefs.update({ persona: p })} />
          ))}
        </Row>
      </Section>

      <Section title={t('settings.language')} subtitle={t('settings.language.hint')}>
        <Card style={{ gap: 2, paddingVertical: space.sm }}>
          <LangRow label={`📱 ${t('settings.language.device')}`} active={chosen === null} onPress={() => setLanguage(null)} />
          {LANGUAGES.map(([code, fallback]) => (
            <LangRow key={code} label={names.get(code) ?? fallback} code={code} active={chosen === code} onPress={() => setLanguage(code as Lang)} />
          ))}
        </Card>
      </Section>

      <Section title={t('settings.theme')}>
        <Row>
          {MODES.map((m) => (
            <Chip key={m} label={t(`settings.theme.${m}`)} active={mode === m} onPress={() => setMode(m)} />
          ))}
        </Row>
      </Section>

      <Section title={t('settings.servers')}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <T>KOVIL</T>
            {status.loading ? (
              <T v="dim">…</T>
            ) : (
              <Pill tone={status.data ? 'green' : 'orange'} label={t(status.data ? 'settings.servers.online' : 'settings.servers.offline')} />
            )}
          </Row>
        </Card>
      </Section>

      <Section title={t('settings.about')}>
        <Card tone="alt">
          <T>{t('settings.about.body')}</T>
          <T v="small">{t('settings.attribution')}</T>
          <T v="small">
            {[lang, `v${Constants.expoConfig?.version ?? '?'}`, rustCoreVersion() ? `Rust core ${rustCoreVersion()}` : null].filter(Boolean).join(' · ')}
          </T>
        </Card>
      </Section>
    </Screen>
  );
}

function LangRow({ label, code, active, onPress }: { label: string; code?: string; active: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active, checked: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{ minHeight: 48, borderRadius: radius.sm, paddingHorizontal: space.md, justifyContent: 'center', backgroundColor: active ? c.primarySoft : 'transparent' }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="heading" color={active ? c.primary : c.text}>
          {label}
        </T>
        <T v="small" importantForAccessibility="no">
          {active ? '✓' : (code ?? '')}
        </T>
      </Row>
    </Pressable>
  );
}

// Render errors on this route show a recovery screen instead of closing the app.
export { CrashScreen as ErrorBoundary } from '@/components/crash-screen';
