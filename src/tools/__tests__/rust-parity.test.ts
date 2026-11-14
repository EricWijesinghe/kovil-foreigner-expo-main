import golden from '../../../modules/kovil-core/golden.json';
import { distanceMTs, inKoreaTs } from '@/tools/geo';
import { agentFeeCapTs, convertRentTs, jeonseEquivalentTs } from '@/tools/money';

// golden.json is printed by the Rust core (modules/kovil-core/rust, `cargo run --bin golden`); a Rust test keeps it
// current. The TypeScript fallback must give the same answer for every vector.
type Row = { fn: string; args: number[]; out: number | boolean };
const impl: Record<string, (...a: number[]) => number | boolean> = {
  convertRent: (a, b, c, d) => convertRentTs(a, b, c, d),
  jeonseEquivalent: (a, b, c) => jeonseEquivalentTs(a, b, c),
  agentFeeCap: (a, b) => agentFeeCapTs(a, b),
  distanceM: (a, b, c, d) => distanceMTs(a, b, c, d),
  inKorea: (a, b) => inKoreaTs(a, b),
};

describe('TypeScript fallback matches the Rust core', () => {
  const rows = golden as Row[];

  it('has vectors for every function', () => {
    expect(new Set(rows.map((r) => r.fn))).toEqual(new Set(Object.keys(impl)));
  });

  it.each(Object.keys(impl))('%s', (fn) => {
    for (const r of rows.filter((x) => x.fn === fn)) {
      const got = impl[fn](...r.args);
      // Trig in two runtimes may differ in the last bit; whole metres can then round 1 apart.
      if (fn === 'distanceM') expect([r.args, Math.abs((got as number) - (r.out as number)) <= 1]).toEqual([r.args, true]);
      else expect([r.args, got]).toEqual([r.args, r.out]);
    }
  });
});
