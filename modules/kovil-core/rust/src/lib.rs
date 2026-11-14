//! KOVIL on-device core. Pure functions in [`money`] and [`geo`]; the `Java_*` exports below are the
//! JNI entry points `kr.co.kovil.core.KovilNative` binds to. Only primitives cross the boundary, so no JNI
//! crate is needed, and a panic never unwinds into the JVM: it becomes NaN and the app uses its fallback.

pub mod geo;
pub mod money;

use std::ffi::c_void;
use std::panic::{UnwindSafe, catch_unwind};

/// Version shown in the app so support can tell which core a phone runs.
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

fn guarded(f: impl FnOnce() -> f64 + UnwindSafe) -> f64 {
    catch_unwind(f).unwrap_or(f64::NAN)
}

fn finite(xs: &[f64]) -> bool {
    xs.iter().all(|x| x.is_finite())
}

type Env = *mut c_void;
type Class = *mut c_void;

#[unsafe(no_mangle)]
pub extern "system" fn Java_kr_co_kovil_core_KovilNative_convertRent(_: Env, _: Class, deposit: f64, rent: f64, new_deposit: f64, rate_pct: f64) -> f64 {
    if !finite(&[deposit, rent, new_deposit, rate_pct]) {
        return f64::NAN;
    }
    guarded(|| money::convert_rent(deposit, rent, new_deposit, rate_pct))
}

#[unsafe(no_mangle)]
pub extern "system" fn Java_kr_co_kovil_core_KovilNative_jeonseEquivalent(_: Env, _: Class, deposit: f64, rent: f64, rate_pct: f64) -> f64 {
    if !finite(&[deposit, rent, rate_pct]) {
        return f64::NAN;
    }
    guarded(|| money::jeonse_equivalent(deposit, rent, rate_pct))
}

#[unsafe(no_mangle)]
pub extern "system" fn Java_kr_co_kovil_core_KovilNative_agentFeeCap(_: Env, _: Class, deposit: f64, rent: f64) -> f64 {
    if !finite(&[deposit, rent]) {
        return f64::NAN;
    }
    guarded(|| money::agent_fee_cap(deposit, rent))
}

#[unsafe(no_mangle)]
pub extern "system" fn Java_kr_co_kovil_core_KovilNative_distanceM(_: Env, _: Class, a_lat: f64, a_lng: f64, b_lat: f64, b_lng: f64) -> f64 {
    if !finite(&[a_lat, a_lng, b_lat, b_lng]) {
        return f64::NAN;
    }
    guarded(|| geo::distance_m(a_lat, a_lng, b_lat, b_lng))
}

/// 1.0 inside Korea, 0.0 outside, NaN for bad input (a double keeps every export the same shape).
#[unsafe(no_mangle)]
pub extern "system" fn Java_kr_co_kovil_core_KovilNative_inKorea(_: Env, _: Class, lat: f64, lng: f64) -> f64 {
    if !finite(&[lat, lng]) {
        return f64::NAN;
    }
    guarded(|| if geo::in_korea(lat, lng) { 1.0 } else { 0.0 })
}

/// Major/minor/patch packed as major*10000 + minor*100 + patch.
#[unsafe(no_mangle)]
pub extern "system" fn Java_kr_co_kovil_core_KovilNative_version(_: Env, _: Class) -> f64 {
    let mut parts = VERSION.split('.').map(|p| p.parse::<f64>().unwrap_or(0.0));
    let (a, b, c) = (parts.next().unwrap_or(0.0), parts.next().unwrap_or(0.0), parts.next().unwrap_or(0.0));
    a * 10_000.0 + b * 100.0 + c
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::ptr::null_mut;

    #[test]
    fn exports_reject_bad_input_instead_of_panicking() {
        let n = null_mut();
        assert!(Java_kr_co_kovil_core_KovilNative_convertRent(n, n, f64::NAN, 1.0, 1.0, 1.0).is_nan());
        assert!(Java_kr_co_kovil_core_KovilNative_agentFeeCap(n, n, f64::INFINITY, 0.0).is_nan());
        assert_eq!(Java_kr_co_kovil_core_KovilNative_inKorea(n, n, 37.5, 127.0), 1.0);
        assert_eq!(Java_kr_co_kovil_core_KovilNative_version(n, n), 100.0);
    }

    #[test]
    fn panics_become_nan() {
        assert!(guarded(|| panic!("boom")).is_nan());
    }
}
