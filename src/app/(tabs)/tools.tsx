import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card, Field, Row, Screen, Section, T } from '@/components/ui';
import { useI18n } from '@/i18n';
import type { StringKey } from '@/i18n/strings/en';
import { usePrefs } from '@/prefs';
import { radius, space, useTheme } from '@/theme';
import { agentFeeCap, convertRent, formatWon, jeonseEquivalent, MAN } from '@/tools/money';

// Each check keeps the Korean word people will hear at the agency.
const CHECKS: { id: string; ko: string }[] = [
  { id: 'registry', ko: '등기부등본' },
  { id: 'owner', ko: '임대인 본인 확인' },
  { id: 'fixedDate', ko: '확정일자' },
  { id: 'moveIn', ko: '전입신고' },
  { id: 'insurance', ko: '보증금 반환보증' },
  { id: 'special', ko: '특약사항' },
];

/** Digits only; empty input counts as 0 so the maths never shows NaN. */
const num = (s: string) => {
  // Many keyboards (vi, ru, id…) type a decimal comma: 5,5 must mean 5.5, not 55.
  const n = Number(s.replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export default function Tools() {
  const { t, lang } = useI18n();
  const { c } = useTheme();
  // Inputs in units of ₩10,000, the way Korean listings quote them ("1000/50").
  const [deposit, setDeposit] = useState('1000');
  const [rent, setRent] = useState('50');
  const [newDeposit, setNewDeposit] = useState('500');
  const [rate, setRate] = useState('5.5');
  const [maintenance, setMaintenance] = useState('7');
  const [utilities, setUtilities] = useState('10');

  const won = (n: number) => formatWon(n, lang);
  const d = num(deposit) * MAN;
  const r = num(rent) * MAN;
  const newRent = convertRent(d, r, num(newDeposit) * MAN, num(rate));
  const monthly = r + (num(maintenance) + num(utilities)) * MAN;
  const fee = agentFeeCap(d, r);
  const unit = t('tools.unit');

  return (
    <Screen>
      <View style={{ gap: 2 }}>
        <T v="title">{t('tools.title')}</T>
        <T v="dim">{t('tools.subtitle')}</T>
      </View>

      <Section title={`🔁 ${t('tools.convert.title')}`} subtitle={t('tools.convert.body')}>
        <Card>
          <Row style={{ flexWrap: 'nowrap' }}>
            <View style={{ flex: 1 }}>
              <Field label={`${t('tools.field.deposit')} (${unit})`} value={deposit} onChangeText={setDeposit} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={`${t('tools.field.rent')} (${unit})`} value={rent} onChangeText={setRent} keyboardType="numeric" />
            </View>
          </Row>
          <Row style={{ flexWrap: 'nowrap' }}>
            <View style={{ flex: 1 }}>
              <Field label={`${t('tools.field.newDeposit')} (${unit})`} value={newDeposit} onChangeText={setNewDeposit} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('tools.field.rate')} value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
            </View>
          </Row>
          <T v="small">{t('tools.rate.hint')}</T>
          <Result label={t('tools.convert.result')} value={won(newRent)} accent={c.primary} />
          <Result label={t('tools.convert.jeonse')} value={won(jeonseEquivalent(d, r, num(rate)))} />
        </Card>
      </Section>

      <Section title={`🧾 ${t('tools.cost.title')}`}>
        <Card>
          <Row style={{ flexWrap: 'nowrap' }}>
            <View style={{ flex: 1 }}>
              <Field label={`${t('tools.field.maintenance')} (${unit})`} value={maintenance} onChangeText={setMaintenance} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={`${t('tools.field.utilities')} (${unit})`} value={utilities} onChangeText={setUtilities} keyboardType="numeric" />
            </View>
          </Row>
          <Result label={t('tools.cost.result')} value={won(monthly)} accent={c.primary} />
          <Result label={t('tools.fee.title')} value={won(fee)} />
          <T v="small">{t('tools.fee.body')}</T>
          <Result label={t('tools.moveIn.result')} value={won(d + r + fee)} accent={c.green} />
        </Card>
      </Section>

      <Checklist />
    </Screen>
  );
}

function Result({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ backgroundColor: c.cardAlt, borderRadius: radius.sm, padding: space.md, gap: 2 }} accessible accessibilityLabel={`${label}: ${value}`}>
      <T v="small">{label}</T>
      <T v="number" color={accent ?? c.text}>
        {value}
      </T>
    </View>
  );
}

function Checklist() {
  const { t } = useI18n();
  const { c } = useTheme();
  const { checklist, update } = usePrefs();
  const done = CHECKS.filter((x) => checklist.includes(x.id)).length;
  const toggle = (id: string) => update({ checklist: checklist.includes(id) ? checklist.filter((x) => x !== id) : [...checklist, id] });
  return (
    <Section title={`✅ ${t('tools.check.title')}`} subtitle={t('tools.check.progress', { done, total: CHECKS.length })}>
      <View style={{ height: 8, backgroundColor: c.border, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ width: `${(done / CHECKS.length) * 100}%`, height: 8, backgroundColor: c.green }} />
      </View>
      {CHECKS.map((x) => {
        const on = checklist.includes(x.id);
        return (
          <Pressable
            key={x.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            onPress={() => toggle(x.id)}
            style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start', backgroundColor: c.card, borderRadius: radius.md, padding: space.lg, borderWidth: 1, borderColor: on ? c.green : c.border }}>
            <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: on ? c.green : c.textDim, backgroundColor: on ? c.green : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {on ? <T v="label" color="#FFFFFF">✓</T> : null}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="label" color={c.primary}>
                {x.ko}
              </T>
              <T style={on ? { textDecorationLine: 'line-through', color: c.textDim } : undefined}>{t(`check.${x.id}` as StringKey)}</T>
            </View>
          </Pressable>
        );
      })}
    </Section>
  );
}
