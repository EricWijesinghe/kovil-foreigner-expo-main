import { type ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Animated, I18nManager, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, type TextInputProps, type TextProps, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n';
import { radius, space, useTheme } from '@/theme';

type Variant = 'hero' | 'title' | 'heading' | 'body' | 'dim' | 'small' | 'label' | 'number';
const SIZES: Record<
  Variant,
  {
    fontSize: number;
    fontWeight: '400' | '600' | '700' | '800';
    lineHeight: number;
  }
> = {
  hero: { fontSize: 30, fontWeight: '800', lineHeight: 38 },
  title: { fontSize: 24, fontWeight: '800', lineHeight: 32 },
  heading: { fontSize: 17, fontWeight: '700', lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  dim: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  label: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  number: { fontSize: 26, fontWeight: '800', lineHeight: 32 },
};
const MIN_TOUCH = 44;
// Pressed feedback: a slight shrink reads as "touched" without the flicker of a big opacity change.
const PRESSED = { transform: [{ scale: 0.98 }], opacity: 0.9 } as const;

/** Soft elevation in light mode; dark mode relies on the border (shadows are invisible on dark backgrounds). */
export function useElevation(level: 1 | 2 = 1): ViewStyle {
  const { dark } = useTheme();
  if (dark) return {};
  return {
    shadowColor: '#0F1B2D',
    shadowOpacity: level === 1 ? 0.06 : 0.12,
    shadowRadius: level === 1 ? 10 : 18,
    shadowOffset: { width: 0, height: level === 1 ? 3 : 8 },
    elevation: level === 1 ? 2 : 6,
  };
}

/** True when this screen must mirror by hand: the app language is RTL but the OS layout is not (or the reverse). */
function useMirror() {
  const { rtl } = useI18n();
  return rtl !== I18nManager.isRTL;
}

/** Text that follows the theme and the language direction (Urdu is right-to-left). */
export function T({ v = 'body', color, style, ...rest }: TextProps & { v?: Variant; color?: string }) {
  const { c } = useTheme();
  const { rtl } = useI18n();
  const dim = v === 'dim' || v === 'small';
  return <Text {...rest} style={[SIZES[v], { color: color ?? (dim ? c.textDim : c.text) }, rtl && { writingDirection: 'rtl', textAlign: 'right' }, style]} />;
}

/** `edges={[]}` inside stack screens that already draw a native header (no double top inset). */
export function Screen({ children, onRefresh, refreshing = false, edges = ['top'] }: { children: ReactNode; onRefresh?: () => void; refreshing?: boolean; edges?: ('top' | 'bottom')[] }) {
  const { c } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={edges}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: space.lg,
          paddingBottom: space.xxl,
          gap: space.lg,
        }}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} /> : undefined}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

type CardProps = {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  tone?: 'alt';
  label?: string;
  selected?: boolean;
};
export function Card({ children, style, onPress, tone, label, selected }: CardProps) {
  const { c } = useTheme();
  const lift = useElevation(1);
  const base: ViewStyle = {
    backgroundColor: tone === 'alt' ? c.cardAlt : c.card,
    borderRadius: radius.md,
    padding: space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    gap: space.sm,
    ...(tone === 'alt' ? {} : lift),
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress}
      style={({ pressed }) => [base, style, pressed && PRESSED]}>
      {children}
    </Pressable>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  busy?: boolean;
  disabled?: boolean;
};
export function Button({ label, onPress, kind = 'primary', busy = false, disabled = false }: ButtonProps) {
  const { c } = useTheme();
  const off = busy || disabled;
  const [bg, fg] = kind === 'primary' ? [c.primary, c.onPrimary] : kind === 'danger' ? [c.cardAlt, c.danger] : [c.primarySoft, c.primary];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderRadius: radius.pill,
        minHeight: MIN_TOUCH + 4,
        paddingHorizontal: space.xl,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: space.sm,
        opacity: off ? 0.5 : 1,
        ...(pressed && !off ? PRESSED : null),
      })}>
      {busy && <ActivityIndicator color={fg} />}
      <T v="label" color={fg} style={{ fontSize: 15, textAlign: 'center' }}>
        {label}
      </T>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={({ pressed }) => ({
        ...(pressed ? PRESSED : null),
        backgroundColor: active ? c.primary : c.card,
        borderColor: active ? c.primary : c.border,
        borderWidth: 1,
        borderRadius: radius.pill,
        minHeight: MIN_TOUCH,
        justifyContent: 'center',
        paddingHorizontal: 14,
      })}>
      <T v="label" color={active ? c.onPrimary : c.text}>
        {label}
      </T>
    </Pressable>
  );
}

/** Two or three mutually exclusive options. */
export function Segmented<K extends string>({ value, options, onChange }: { value: K; options: { key: K; label: string }[]; onChange: (k: K) => void }) {
  const { c } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: c.cardAlt,
        borderRadius: radius.pill,
        padding: 4,
        gap: 4,
      }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={{
              flex: 1,
              minHeight: MIN_TOUCH - 4,
              borderRadius: radius.pill,
              justifyContent: 'center',
              backgroundColor: on ? c.card : 'transparent',
            }}>
            <T v="label" color={on ? c.primary : c.textDim} style={{ textAlign: 'center' }}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({ label, hint, ...input }: TextInputProps & { label: string; hint?: string }) {
  const { c } = useTheme();
  const { rtl } = useI18n();
  return (
    <View style={{ gap: 6 }}>
      <T v="label">{label}</T>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.textDim}
        {...input}
        style={[
          {
            backgroundColor: c.card,
            color: c.text,
            borderRadius: radius.sm,
            paddingHorizontal: space.md,
            minHeight: MIN_TOUCH + 4,
            borderWidth: 1,
            borderColor: c.border,
            fontSize: 16,
          },
          rtl && { textAlign: 'right' },
          input.style,
        ]}
      />
      {hint ? <T v="small">{hint}</T> : null}
    </View>
  );
}

export function SearchBox({ value, onChangeText, placeholder }: { value: string; onChangeText: (s: string) => void; placeholder: string }) {
  const { c } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={`🔎 ${placeholder}`}
      accessibilityLabel={placeholder}
      placeholderTextColor={c.textDim}
      style={{
        backgroundColor: c.card,
        color: c.text,
        borderRadius: radius.pill,
        paddingHorizontal: space.lg,
        minHeight: MIN_TOUCH + 4,
        borderWidth: 1,
        borderColor: c.border,
      }}
    />
  );
}

export function Pill({ label, tone }: { label: string; tone: 'green' | 'orange' | 'blue' }) {
  const { c } = useTheme();
  const [bg, fg] = tone === 'green' ? [c.greenSoft, c.greenText] : tone === 'orange' ? [c.orangeSoft, c.orangeText] : [c.primarySoft, c.primary];
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: radius.pill,
        paddingVertical: 4,
        paddingHorizontal: 10,
        alignSelf: 'flex-start',
      }}>
      <T v="small" color={fg}>
        {label}
      </T>
    </View>
  );
}

/** Subway line chip in the operator's own line colour. */
export function LineBadge({ name, color }: { name: string; color: string }) {
  return (
    <View
      style={{
        backgroundColor: color,
        borderRadius: radius.pill,
        paddingVertical: 2,
        paddingHorizontal: 8,
      }}>
      <T v="small" color="#FFFFFF">
        {name}
      </T>
    </View>
  );
}

export function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: 2 }}>
        <T v="heading" accessibilityRole="header">
          {title}
        </T>
        {subtitle ? <T v="dim">{subtitle}</T> : null}
      </View>
      {children}
    </View>
  );
}

export function Loading() {
  const { c } = useTheme();
  return <ActivityIndicator style={{ padding: space.xl }} color={c.primary} />;
}

/** Pulsing placeholder block shown while content loads (keeps the layout from jumping). */
export function Skeleton({ height, width = '100%', round = radius.sm }: { height: number; width?: ViewStyle['width']; round?: number }) {
  const { c } = useTheme();
  const [pulse] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View
      importantForAccessibility="no"
      style={{
        height,
        width,
        borderRadius: round,
        backgroundColor: c.border,
        opacity: pulse,
      }}
    />
  );
}

/** Placeholder for a list of listing cards. */
export function SkeletonCards({ count = 3 }: { count?: number }) {
  const { c } = useTheme();
  return (
    <View accessible accessibilityRole="progressbar" style={{ gap: space.lg }}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            backgroundColor: c.card,
            borderRadius: radius.lg,
            overflow: 'hidden',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: c.border,
          }}>
          <Skeleton height={170} round={0} />
          <View style={{ padding: space.lg, gap: space.sm }}>
            <Skeleton height={20} width="55%" />
            <Skeleton height={16} width="85%" />
            <Skeleton height={14} width="40%" />
          </View>
        </View>
      ))}
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <Card tone="alt">
      <T v="dim">{message}</T>
      <Button kind="ghost" label={t('common.retry')} onPress={onRetry} />
    </Card>
  );
}

export function EmptyState({ icon, text }: { icon: string; text: string }) {
  const { c } = useTheme();
  return (
    <Card
      tone="alt"
      style={{
        alignItems: 'center',
        paddingVertical: space.xxl,
        gap: space.md,
      }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: c.card,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <T style={{ fontSize: 34, lineHeight: 42 }}>{icon}</T>
      </View>
      <T v="dim" style={{ textAlign: 'center' }}>
        {text}
      </T>
    </Card>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const mirror = useMirror();
  return (
    <View
      style={[
        {
          flexDirection: mirror ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: space.sm,
          flexWrap: 'wrap',
        },
        style,
      ]}>
      {children}
    </View>
  );
}
