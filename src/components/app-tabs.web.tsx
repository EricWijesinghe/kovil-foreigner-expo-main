import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, View } from 'react-native';

import { T } from '@/components/ui';
import { useI18n } from '@/i18n';
import type { StringKey } from '@/i18n/strings/en';
import { radius, space, useTheme } from '@/theme';

const TABS: { name: string; href: '/' | '/map' | '/areas' | '/tools' | '/me'; label: StringKey; icon: string }[] = [
  { name: 'index', href: '/', label: 'tab.home', icon: '🏠' },
  { name: 'map', href: '/map', label: 'tab.map', icon: '🗺️' },
  { name: 'areas', href: '/areas', label: 'tab.areas', icon: '🏘️' },
  { name: 'tools', href: '/tools', label: 'tab.tools', icon: '🧮' },
  { name: 'me', href: '/me', label: 'tab.me', icon: '👤' },
];

// Web has no native tab bar: a floating pill bar with the same five tabs.
export default function AppTabs() {
  const { t } = useI18n();
  const { c } = useTheme();
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <View
          style={{
            position: 'absolute',
            bottom: space.lg,
            alignSelf: 'center',
            flexDirection: 'row',
            gap: space.xs,
            padding: space.xs,
            borderRadius: radius.pill,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.border,
          }}>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton>{`${tab.icon} ${t(tab.label)}`}</TabButton>
            </TabTrigger>
          ))}
        </View>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const { c } = useTheme();
  return (
    <Pressable {...props} style={{ paddingVertical: 10, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: isFocused ? c.primary : 'transparent' }}>
      <T v="label" color={isFocused ? c.onPrimary : c.text}>
        {children as string}
      </T>
    </Pressable>
  );
}
