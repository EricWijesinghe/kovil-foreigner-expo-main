import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { SessionProvider } from '@/auth/session';
import { CrashScreen } from '@/components/crash-screen';
import { installGlobalHandler, onFatalStorm } from '@/errors';
import { Onboarding } from '@/components/onboarding';
import { LanguageProvider, useI18n } from '@/i18n';
import { PrefsProvider, usePrefs } from '@/prefs';
import { ThemeModeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
installGlobalHandler();

// A cold deep link to /listing/... still gets the tabs underneath, so Back stays inside the app.
export const unstable_settings = { initialRouteName: '(tabs)' };

function Shell() {
  const { dark, c, ready: themeReady } = useTheme();
  const { ready: langReady, t } = useI18n();
  const prefs = usePrefs();
  const ready = themeReady && langReady && prefs.ready;

  // Hide the splash only once the saved language/theme are applied, so nothing flashes in the wrong one.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return null;

  const base = dark ? DarkTheme : DefaultTheme;
  const navTheme = { ...base, colors: { ...base.colors, background: c.bg, card: c.card, primary: c.primary, text: c.text, border: c.border } };
  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {prefs.onboarded ? (
        <Stack screenOptions={{ headerTintColor: c.primary, headerStyle: { backgroundColor: c.card }, headerTitleStyle: { color: c.text } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="listings" options={{ title: t('listings.title') }} />
          <Stack.Screen name="listing/[uuid]" options={{ title: '' }} />
          <Stack.Screen name="auth" options={{ presentation: 'modal', title: t('me.signedOut.title') }} />
        </Stack>
      ) : (
        <Onboarding />
      )}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // Repeated fatal errors outside rendering mean the app is in a broken state: offer recovery instead of a dead UI.
  const [storm, setStorm] = useState<Error | null>(null);
  useEffect(() => {
    onFatalStorm(setStorm);
    return () => onFatalStorm(null);
  }, []);
  if (storm) return <CrashScreen error={storm} retry={async () => setStorm(null)} />;
  return (
    <ThemeModeProvider>
      <LanguageProvider>
        <PrefsProvider>
          <SessionProvider>
            <Shell />
          </SessionProvider>
        </PrefsProvider>
      </LanguageProvider>
    </ThemeModeProvider>
  );
}

// Render errors on this route show a recovery screen instead of closing the app.
export { CrashScreen as ErrorBoundary } from '@/components/crash-screen';
