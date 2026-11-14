//! Prints golden vectors (JSON) from the Rust core. The jest test checks the TypeScript fallback against
//! them, and `tests::golden_file_is_current` fails when this output and the checked-in file drift apart.
//! Regenerate: cargo run --bin golden > ../golden.json

fn main() {
    print!("{}", kovil_core_golden());
}

fn kovil_core_golden() -> String {
    use kovil_core::{geo, money};
    let won = [0.0, 1_000_000.0, 5_000_000.0, 10_000_000.0, 49_000_000.0, 50_000_000.0, 99_999_999.0, 300_000_000.0, 1_199_999_999.0, 2_000_000_000.0];
    let rents = [0.0, 300_000.0, 500_000.0, 650_000.0, 1_500_000.0];
    let rates = [0.0, 2.5, 5.5, 6.0];
    let mut rows = Vec::new();
    for d in won {
        for r in rents {
            rows.push(format!(r#"{{"fn":"agentFeeCap","args":[{d},{r}],"out":{}}}"#, money::agent_fee_cap(d, r)));
            for rate in rates {
                rows.push(format!(r#"{{"fn":"jeonseEquivalent","args":[{d},{r},{rate}],"out":{}}}"#, money::jeonse_equivalent(d, r, rate)));
                for nd in [0.0, 5_000_000.0, 20_000_000.0] {
                    rows.push(format!(r#"{{"fn":"convertRent","args":[{d},{r},{nd},{rate}],"out":{}}}"#, money::convert_rent(d, r, nd, rate)));
                }
            }
        }
    }
    let points = [(37.5663, 126.9779), (37.4979, 127.0276), (35.1796, 129.0756), (33.4996, 126.5312), (35.6762, 139.6503), (38.69, 131.99)];
    for (a_lat, a_lng) in points {
        rows.push(format!(r#"{{"fn":"inKorea","args":[{a_lat},{a_lng}],"out":{}}}"#, geo::in_korea(a_lat, a_lng)));
        for (b_lat, b_lng) in points {
            rows.push(format!(r#"{{"fn":"distanceM","args":[{a_lat},{a_lng},{b_lat},{b_lng}],"out":{}}}"#, geo::distance_m(a_lat, a_lng, b_lat, b_lng)));
        }
    }
    format!("[\n{}\n]\n", rows.join(",\n"))
}

#[cfg(test)]
mod tests {
    #[test]
    fn golden_file_is_current() {
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../golden.json");
        let checked_in = std::fs::read_to_string(path).unwrap_or_default().replace("\r\n", "\n");
        assert_eq!(checked_in, super::kovil_core_golden(), "run: cargo run --bin golden > ../golden.json");
    }
}
