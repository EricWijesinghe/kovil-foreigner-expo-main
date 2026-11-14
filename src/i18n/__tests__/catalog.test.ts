import { LANGUAGES, translate } from '@/i18n';
import { catalogs, en } from '@/i18n/catalogs';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

// Main script each language must be written in (a value may also contain Latin brand names, digits, Hangul terms).
const SCRIPT: Record<string, RegExp> = {
  ko: /[가-힣]/, zh: /[一-鿿]/, ja: /[぀-ヿ一-鿿]/, ne: /[ऀ-ॿ]/,
  hi: /[ऀ-ॿ]/, th: /[฀-๿]/, ru: /[Ѐ-ӿ]/, mn: /[Ѐ-ӿ]/, kk: /[Ѐ-ӿ]/,
  ky: /[Ѐ-ӿ]/, km: /[ក-៿]/, my: /[က-႟]/, si: /[඀-෿]/, bn: /[ঀ-৿]/,
  ur: /[؀-ۿ]/,
};

describe('UI catalogs', () => {
  it('covers every app language', () => {
    expect(Object.keys(catalogs).sort()).toEqual(LANGUAGES.map(([c]) => c).sort());
  });

  it.each(Object.entries(catalogs))('%s has the same keys and placeholders as en', (lang, cat) => {
    expect(Object.keys(cat!).sort()).toEqual(Object.keys(en).sort());
    for (const [k, v] of Object.entries(en)) {
      expect([lang, k, placeholders(cat![k as keyof typeof en] ?? '')]).toEqual([lang, k, placeholders(v)]);
      expect((cat![k as keyof typeof en] ?? '').trim()).not.toBe('');
    }
  });

  it.each(Object.entries(SCRIPT))('%s is written in its own script', (lang, script) => {
    const values = Object.values(catalogs[lang]!);
    const inScript = values.filter((v) => script.test(v)).length;
    expect(inScript / values.length).toBeGreaterThan(0.8);
  });

  it('fills placeholders and falls back to English', () => {
    expect(translate('ko', 'campus.count', { count: 3 })).toBe('대학교 3곳');
    expect(translate('en', 'areas.dongs.count', { count: 12 })).toBe('12 neighbourhoods');
  });
});
