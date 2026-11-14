import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useI18n } from '@/i18n';
import { useTheme } from '@/theme';

// sf = iOS SF Symbols, md = Android Material icons. Five tabs is the Material bottom-bar maximum.
const TABS = [
  { name: 'index', label: 'tab.home', sf: 'house.fill', md: 'home' },
  { name: 'map', label: 'tab.map', sf: 'map.fill', md: 'map' },
  { name: 'areas', label: 'tab.areas', sf: 'building.2.fill', md: 'apartment' },
  { name: 'tools', label: 'tab.tools', sf: 'function', md: 'calculate' },
  { name: 'me', label: 'tab.me', sf: 'person.crop.circle', md: 'person' },
] as const;

export default function AppTabs() {
  const { t } = useI18n();
  const { c } = useTheme();
  return (
    <NativeTabs
      backgroundColor={c.card}
      indicatorColor={c.primarySoft}
      iconColor={{ default: c.textDim, selected: c.primary }}
      labelStyle={{ default: { color: c.textDim }, selected: { color: c.primary } }}>
      {TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{t(tab.label)}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={tab.sf} md={tab.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
