import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { errorText } from '@/api/client';
import { useSession } from '@/auth/session';
import { Button, Card, Field, Pill, Screen, Segmented, T } from '@/components/ui';
import { useI18n } from '@/i18n';
import { space, useTheme } from '@/theme';

type Mode = 'signIn' | 'signUp';
/** Back to where sign-in was opened from; home when /auth was the first screen (deep link). */
const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));
const CODE_LENGTH = 6;

export default function Auth() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'signUp' ? 'signUp' : 'signIn');
  return (
    <Screen edges={[]}>
      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { key: 'signIn', label: t('auth.signIn') },
          { key: 'signUp', label: t('auth.signUp') },
        ]}
      />
      {mode === 'signIn' ? <SignIn onSwitch={() => setMode('signUp')} /> : <SignUp onSwitch={() => setMode('signIn')} />}
    </Screen>
  );
}

function useSubmit() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorText(e, t('common.error')));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function ErrorLine({ text }: { text: string | null }) {
  const { c } = useTheme();
  return text ? (
    <T accessibilityLiveRegion="polite" color={c.danger}>
      {text}
    </T>
  ) : null;
}

function Switch({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ minHeight: 44, justifyContent: 'center' }}>
      <T v="label" color={c.primary} style={{ textAlign: 'center' }}>
        {label}
      </T>
    </Pressable>
  );
}

function SignIn({ onSwitch }: { onSwitch: () => void }) {
  const { t } = useI18n();
  const session = useSession();
  const { busy, error, run } = useSubmit();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const submit = () => {
    if (busy || !email || !password) return; // keyboard "Done" bypasses the disabled button
    run(async () => {
      await session.signIn(email, password);
      leave();
    });
  };
  return (
    <Card>
      <Field label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
      <Field label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" textContentType="password" onSubmitEditing={submit} />
      <ErrorLine text={error} />
      <Button label={t('auth.signIn')} onPress={submit} busy={busy} disabled={!email || !password} />
      <Switch label={t('auth.toSignUp')} onPress={onSwitch} />
    </Card>
  );
}

function SignUp({ onSwitch }: { onSwitch: () => void }) {
  const { t } = useI18n();
  const session = useSession();
  const { busy, error, run } = useSubmit();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [wait, setWait] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Resend countdown from the server's resendAvailableInSeconds.
  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const digits = phone.replace(/\D/g, '');
  const send = () =>
    run(async () => {
      const r = await session.sendCode(digits);
      setSent(true);
      setWait(r.resendAvailableInSeconds);
    });
  const verify = () => run(async () => setToken(await session.verifyCode(digits, code)));
  const create = () =>
    run(async () => {
      await session.signUp({ verificationToken: token!, email, password, name: name.trim() || undefined });
      leave();
    });

  return (
    <View style={{ gap: space.lg }}>
      <Card>
        <T v="heading">1 · {t('auth.verify')}</T>
        <Field label={t('auth.phone')} hint={t('auth.phone.hint')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" editable={!token} placeholder="010-1234-5678" />
        {!token ? (
          <Button kind={sent ? 'ghost' : 'primary'} label={wait > 0 ? t('auth.resend', { seconds: wait }) : t('auth.sendCode')} onPress={send} busy={busy && !sent} disabled={digits.length < 10 || wait > 0} />
        ) : null}
        {sent && !token ? (
          <>
            <Field label={t('auth.code')} value={code} onChangeText={(s) => setCode(s.replace(/\D/g, '').slice(0, CODE_LENGTH))} keyboardType="number-pad" autoComplete="sms-otp" textContentType="oneTimeCode" />
            <Button label={t('auth.verify')} onPress={verify} busy={busy} disabled={code.length !== CODE_LENGTH} />
          </>
        ) : null}
        {token ? (
          <>
            <Pill tone="green" label={`✓ ${t('auth.verified')}`} />
            {/* The verification expires; this restarts it (also for a mistyped number). */}
            <Button
              kind="ghost"
              label={t('auth.sendCode')}
              onPress={() => {
                setToken(null);
                setSent(false);
                setCode('');
              }}
            />
          </>
        ) : null}
      </Card>

      {token ? (
        <Card>
          <T v="heading">2 · {t('auth.signUp')}</T>
          <Field label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
          <Field label={t('auth.password')} hint={t('auth.password.hint')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
          <Field label={t('auth.name')} value={name} onChangeText={setName} autoComplete="name" />
          <Button label={t('auth.signUp')} onPress={create} busy={busy} disabled={!email || password.length < 8} />
        </Card>
      ) : null}

      <ErrorLine text={error} />
      <Switch label={t('auth.toSignIn')} onPress={onSwitch} />
    </View>
  );
}
