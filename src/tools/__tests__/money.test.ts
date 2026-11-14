import { agentFeeCap, convertRent, jeonseEquivalent, shortWon } from '@/tools/money';

describe('money tools', () => {
  it('converts deposit to rent and back', () => {
    // 10M deposit / 500k rent, deposit drops to 5M at 6%: +5M x 6% / 12 = +25,000
    expect(convertRent(10_000_000, 500_000, 5_000_000, 6)).toBe(525_000);
    expect(convertRent(10_000_000, 500_000, 20_000_000, 6)).toBe(450_000);
    expect(convertRent(10_000_000, 10_000, 100_000_000, 6)).toBe(0); // never negative
  });

  it('values a monthly lease as a lump-sum deposit', () => {
    expect(jeonseEquivalent(10_000_000, 500_000, 6)).toBe(110_000_000);
    expect(jeonseEquivalent(10_000_000, 500_000, 0)).toBe(10_000_000);
  });

  it('applies the agent fee table', () => {
    // 5M + 500k x 100 = 55M -> 0.4% = 220,000 (cap 300,000)
    expect(agentFeeCap(5_000_000, 500_000)).toBe(220_000);
    // 3M + 300k x 100 = 33M < 50M -> x70 rule: 3M + 21M = 24M -> 0.5% = 120,000
    expect(agentFeeCap(3_000_000, 300_000)).toBe(120_000);
    // lump-sum 49M -> 0.5% = 245,000 capped at 200,000
    expect(agentFeeCap(49_000_000, 0)).toBe(200_000);
    // lump-sum 300M -> 0.3%
    expect(agentFeeCap(300_000_000, 0)).toBe(900_000);
  });

  it('shortens chip prices', () => {
    expect(shortWon(5_000_000, 'en')).toBe('₩5M');
    expect(shortWon(400_000, 'en')).toBe('₩400K');
    expect(shortWon(1_500_000, 'vi')).toBe('₩1.5M');
    expect(shortWon(5_000_000, 'ko')).toBe('500만원');
  });
});
