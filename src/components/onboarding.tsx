import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Row, Screen, T } from '@/components/ui';
import { LANGUAGES, type Lang, useI18n } from '@/i18n';
import type { StringKey } from '@/i18n/strings/en';
import { PERSONAS, type Persona, usePrefs } from '@/prefs';
import { radius, space, useTheme } from '@/theme';

const PERSONA_ICON: Record<Persona, string> = { student: '🎓', worker: '🛠️', professional: '💼', family: '👨‍👩‍👧' };
const STEPS = 3;

/** First launch: language (in every language's own script), who you are, and why location helps. */
export function Onboarding() {
  const { t, lang, setLanguage } = useI18n();
  const { c } = useTheme();
  const prefs = usePrefs();
  const [step, setStep] = useState(0);
  const finish = () => prefs.update({ onboarded: true });

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row>
          {Array.from({ length: STEPS }, (_, i) => (
            <View key={i} style={{ width: i === step ? 28 : 8, height: 8, borderRadius: 4, backgroundColor: i <= step ? c.primary : c.border }} />
          ))}
        </Row>
        <Button kind="ghost" label={t('onboarding.skip')} onPress={finish} />
      </Row>

      {step === 0 ? (
        <>
          <T v="hero">🏡 {t('onboarding.welcome.title')}</T>
          <T v="dim">{t('onboarding.welcome.body')}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {LANGUAGES.map(([code, name]) => (
              <Card
                key={code}
                label={name}
                selected={code === lang}
                onPress={() => setLanguage(code as Lang)}
                style={{
                  width: '31%',
                  paddingVertical: space.md,
                  paddingHorizontal: space.sm,
                  alignItems: 'center',
                  borderRadius: radius.sm,
                  backgroundColor: code === lang ? c.primarySoft : c.card,
                  borderColor: code === lang ? c.primary : c.border,
                }}>
                <T v="label" color={code === lang ? c.primary : c.text} style={{ textAlign: 'center' }} numberOfLines={1}>
                  {name}
                </T>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <T v="hero">{t('onboarding.persona.title')}</T>
          <T v="dim">{t('onboarding.persona.body')}</T>
          {PERSONAS.map((p) => (
            <Card key={p} label={t(`persona.${p}` as StringKey)} selected={prefs.persona === p} onPress={() => prefs.update({ persona: p })}
              style={{ borderColor: prefs.persona === p ? c.primary : c.border, borderWidth: prefs.persona === p ? 2 : 1 }}>
              <Row>
                <T style={{ fontSize: 28 }}>{PERSONA_ICON[p]}</T>
                <View style={{ flexShrink: 1 }}>
                  <T v="heading">{t(`persona.${p}` as StringKey)}</T>
                  <T v="dim">{t(`persona.${p}.hint` as StringKey)}</T>
                </View>
              </Row>
            </Card>
          ))}
        </>
      ) : null}

      {step === 2 ? (
        <>
          <T style={{ fontSize: 64, textAlign: 'center' }}>📍</T>
          <T v="hero">{t('onboarding.location.title')}</T>
          <T>{t('onboarding.location.body')}</T>
        </>
      ) : null}

      <Button label={step < STEPS - 1 ? t('onboarding.next') : t('onboarding.start')} onPress={() => (step < STEPS - 1 ? setStep(step + 1) : finish())} />
    </Screen>
  );
}

export { PERSONA_ICON };
