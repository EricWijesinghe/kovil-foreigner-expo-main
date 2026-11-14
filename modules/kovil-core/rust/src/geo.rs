//! Geo checks used by the app: distance between points and whether a position is in Korea's service box.

const EARTH_RADIUS_M: f64 = 6_371_000.0;

/// Generous box around South Korea incl. Jeju and Ulleungdo; the server decides the exact area.
const KOREA: (f64, f64, f64, f64) = (33.0, 38.7, 124.5, 132.0); // min lat, max lat, min lng, max lng

/// Great-circle distance in metres (haversine), rounded to whole metres like the UI shows it.
pub fn distance_m(a_lat: f64, a_lng: f64, b_lat: f64, b_lng: f64) -> f64 {
    let (p1, p2) = (a_lat.to_radians(), b_lat.to_radians());
    let dp = (b_lat - a_lat).to_radians();
    let dl = (b_lng - a_lng).to_radians();
    let h = (dp / 2.0).sin().powi(2) + p1.cos() * p2.cos() * (dl / 2.0).sin().powi(2);
    crate::money::js_round(2.0 * EARTH_RADIUS_M * h.sqrt().min(1.0).asin())
}

pub fn in_korea(lat: f64, lng: f64) -> bool {
    let (min_lat, max_lat, min_lng, max_lng) = KOREA;
    lat.is_finite() && lng.is_finite() && (min_lat..=max_lat).contains(&lat) && (min_lng..=max_lng).contains(&lng)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn seoul_city_hall_to_gangnam_station() {
        let d = distance_m(37.5663, 126.9779, 37.4979, 127.0276);
        assert!((8_400.0..8_800.0).contains(&d), "{d}");
        assert_eq!(distance_m(37.5, 127.0, 37.5, 127.0), 0.0);
    }

    #[test]
    fn korea_box() {
        assert!(in_korea(37.5663, 126.9779)); // Seoul
        assert!(in_korea(33.4996, 126.5312)); // Jeju
        assert!(!in_korea(35.6762, 139.6503)); // Tokyo
        assert!(!in_korea(f64::NAN, 127.0));
    }
}
