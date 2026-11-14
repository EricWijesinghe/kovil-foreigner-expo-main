// Housing money maths for Korea. All amounts in won (integers).
// On Android the Rust core (modules/kovil-core) computes these; the TypeScript below is the fallback and is held to
// the same answers by the golden-vector test (src/tools/__tests__/rust-parity.test.ts).
import { viaRust } from '../../modules/kovil-core';

/** Monthly rent after moving `deposit - newDeposit` won between deposit and rent at `ratePct` per year. Never negative. */
export function convertRent(deposit: number, rent: number, newDeposit: number, ratePct: number): number {
  return viaRust((core) => core.convertRent(deposit, rent, newDeposit, ratePct), () => convertRentTs(deposit, rent, newDeposit, ratePct));
}

export function convertRentTs(deposit: number, rent: number, newDeposit: number, ratePct: number): number {
  const monthly = rent + ((deposit - newDeposit) * (ratePct / 100)) / 12;
  return Math.max(0, Math.round(monthly));
}

/** The lump-sum lease (jeonse) deposit worth the same as `deposit` + `rent` a month at `ratePct`. */
export function jeonseEquivalent(deposit: number, rent: number, ratePct: number): number {
  return viaRust((core) => core.jeonseEquivalent(deposit, rent, ratePct), () => jeonseEquivalentTs(deposit, rent, ratePct));
}

export function jeonseEquivalentTs(deposit: number, rent: number, ratePct: number): number {
  if (ratePct <= 0) return deposit;
  return Math.round(deposit + (rent * 12) / (ratePct / 100));
}

// Agent fee caps for home rentals (공인중개사법 시행규칙 별표, in force since 2021-10-19): [below amount, rate, cap].
const FEE_TABLE: [number, number, number][] = [
  [50_000_000, 0.005, 200_000],
  [100_000_000, 0.004, 300_000],
  [600_000_000, 0.003, Infinity],
  [1_200_000_000, 0.004, Infinity],
  [1_500_000_000, 0.005, Infinity],
  [Infinity, 0.006, Infinity],
];
const RENT_MULTIPLIER = 100;
const SMALL_RENT_MULTIPLIER = 70;
const SMALL_DEAL = 50_000_000;

/**
 * Legal maximum agent fee (VAT excluded) for a rental. Monthly-rent deals are valued at deposit + rent x 100,
 * or deposit + rent x 70 when that total is under 50 million won.
 */
export function agentFeeCap(deposit: number, rent: number): number {
  return viaRust((core) => core.agentFeeCap(deposit, rent), () => agentFeeCapTs(deposit, rent));
}

export function agentFeeCapTs(deposit: number, rent: number): number {
  let amount = deposit + rent * RENT_MULTIPLIER;
  if (rent > 0 && amount < SMALL_DEAL) amount = deposit + rent * SMALL_RENT_MULTIPLIER;
  const [, rate, cap] = FEE_TABLE.find(([below]) => amount < below)!;
  return Math.round(Math.min(amount * rate, cap));
}

/** Korean listings quote money in units of 10,000 won (만원): "500/50" = 5,000,000 deposit, 500,000 rent. */
export const MAN = 10_000;

export function formatWon(won: number, lang: string): string {
  try {
    return `₩${Math.round(won).toLocaleString(lang)}`;
  } catch {
    return `₩${Math.round(won)}`;
  }
}

/** Short price for chips: 500만원 in Korean (how agents say it), ₩5M / ₩400K elsewhere. */
export function shortWon(won: number, lang: string): string {
  if (lang === 'ko') return `${(won / MAN).toLocaleString('ko')}만원`;
  const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  return won >= 1_000_000 ? `₩${trim(won / 1_000_000)}M` : `₩${trim(won / 1000)}K`;
}
