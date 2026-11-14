//! Housing money maths for Korea. Amounts are won; results are rounded like JavaScript `Math.round`
//! (half up) so the Rust core and the TypeScript fallback give byte-identical answers.

/// JavaScript `Math.round`: halves go toward +infinity (Rust's `round` goes away from zero).
pub fn js_round(x: f64) -> f64 {
    (x + 0.5).floor()
}

/// Monthly rent after moving `deposit - new_deposit` won between deposit and rent at `rate_pct` a year. Never negative.
pub fn convert_rent(deposit: f64, rent: f64, new_deposit: f64, rate_pct: f64) -> f64 {
    let monthly = rent + (deposit - new_deposit) * (rate_pct / 100.0) / 12.0;
    js_round(monthly).max(0.0)
}

/// The lump-sum lease (jeonse) deposit worth the same as `deposit` plus `rent` a month at `rate_pct`.
pub fn jeonse_equivalent(deposit: f64, rent: f64, rate_pct: f64) -> f64 {
    if rate_pct <= 0.0 {
        return deposit;
    }
    js_round(deposit + rent * 12.0 / (rate_pct / 100.0))
}

/// Agent fee caps for home rentals (공인중개사법 시행규칙 별표, in force since 2021-10-19): (below amount, rate, cap).
const FEE_TABLE: [(f64, f64, f64); 6] = [
    (50_000_000.0, 0.005, 200_000.0),
    (100_000_000.0, 0.004, 300_000.0),
    (600_000_000.0, 0.003, f64::INFINITY),
    (1_200_000_000.0, 0.004, f64::INFINITY),
    (1_500_000_000.0, 0.005, f64::INFINITY),
    (f64::INFINITY, 0.006, f64::INFINITY),
];
const RENT_MULTIPLIER: f64 = 100.0;
const SMALL_RENT_MULTIPLIER: f64 = 70.0;
const SMALL_DEAL: f64 = 50_000_000.0;

/// Legal maximum agent fee (VAT excluded). Monthly-rent deals are valued at deposit + rent x 100,
/// or deposit + rent x 70 when that total is under 50 million won.
pub fn agent_fee_cap(deposit: f64, rent: f64) -> f64 {
    let mut amount = deposit + rent * RENT_MULTIPLIER;
    if rent > 0.0 && amount < SMALL_DEAL {
        amount = deposit + rent * SMALL_RENT_MULTIPLIER;
    }
    let (_, rate, cap) = FEE_TABLE.iter().copied().find(|(below, _, _)| amount < *below).unwrap_or(FEE_TABLE[5]);
    js_round((amount * rate).min(cap))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rounding_matches_javascript() {
        assert_eq!(js_round(2.5), 3.0);
        assert_eq!(js_round(-2.5), -2.0);
        assert_eq!(js_round(-0.4), 0.0);
    }

    #[test]
    fn rent_conversion() {
        // 1000/50 moved to 500 deposit at 5.5%: 500 + 5,000,000 * 0.055 / 12 = 22,917 more a month.
        assert_eq!(convert_rent(10_000_000.0, 500_000.0, 5_000_000.0, 5.5), 522_917.0);
        assert_eq!(convert_rent(0.0, 0.0, 50_000_000.0, 5.5), 0.0, "never negative");
    }

    #[test]
    fn jeonse_equivalent_values() {
        assert_eq!(jeonse_equivalent(10_000_000.0, 500_000.0, 5.5), 119_090_909.0);
        assert_eq!(jeonse_equivalent(10_000_000.0, 500_000.0, 0.0), 10_000_000.0);
    }

    #[test]
    fn agent_fee_caps() {
        // 1000/50: 10M + 50만 x 100 = 60M -> 0.4% = 240,000 (cap 300,000).
        assert_eq!(agent_fee_cap(10_000_000.0, 500_000.0), 240_000.0);
        // Small deal: 500/30 -> 5M + 3M x 70 = 26M -> 0.5% = 130,000.
        assert_eq!(agent_fee_cap(5_000_000.0, 300_000.0), 130_000.0);
        // Cap: 49M jeonse -> 245,000 capped at 200,000.
        assert_eq!(agent_fee_cap(49_000_000.0, 0.0), 200_000.0);
        assert_eq!(agent_fee_cap(2_000_000_000.0, 0.0), 12_000_000.0);
    }
}
