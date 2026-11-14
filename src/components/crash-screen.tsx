import type { ErrorBoundaryProps } from 'expo-router';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Pressable, Text, useColorScheme, View } from 'react-native';

import { logError } from '@/errors';
import { deviceLanguage, translate } from '@/i18n';
import { PALETTES, radius, space } from '@/theme';

/**
 * Shown instead of a screen that threw while rendering, so the app never closes on its own.
 * Uses no providers (they may be what failed): device language and system colours only.
 */
export function CrashScreen({ error, retry }: ErrorBoundaryProps) {
  const c = PALETTES[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const lang = deviceLanguage();
  const t = (k: 'error.title' | 'error.body' | 'error.retry' | 'error.home') => translate(lang, k);

  useEffect(() => {
    logError('render', error);
    SplashScreen.hideAsync().catch(() => {}); // a crash before first paint must not leave the splash up forever
  }, [error]);

  // Clear the error first: a boundary that is still in its error state ignores navigation.
  const goHome = () => {
    retry()
      .then(() => router.replace('/'))
      .catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', padding: space.xl, gap: space.lg }}>
      <Text style={{ fontSize: 48, textAlign: 'center' }} importantForAccessibility="no">
        🧭
      </Text>
      <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '700', color: c.text, textAlign: 'center' }}>
        {t('error.title')}
      </Text>
      <Text style={{ fontSize: 16, color: c.textDim, textAlign: 'center', lineHeight: 24 }}>{t('error.body')}</Text>
      <Action label={t('error.retry')} onPress={() => retry().catch(() => {})} bg={c.primary} fg={c.onPrimary} />
      <Action label={t('error.home')} onPress={goHome} bg={c.primarySoft} fg={c.primary} />
    </View>
  );
}

function Action({ label, onPress, bg, fg }: { label: string; onPress: () => void; bg: string; fg: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ minHeight: 52, borderRadius: radius.pill, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: fg }}>{label}</Text>
    </Pressable>
  );
}
