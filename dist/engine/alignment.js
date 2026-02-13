import { issuanceMultiplier } from "./policy.js";
export function buildAlignmentReport(supply, reserves, stress) {
    const reserveTotal = reserves.total_value_usd;
    const btcReserve = reserves.by_asset_usd.BTC ?? 0n;
    return {
        at: reserves.at,
        supply_usd_cents: supply,
        reserve_total_usd_cents: reserveTotal,
        reserve_coverage_bps: ratioBps(reserveTotal, supply),
        btc_reserve_usd_cents: btcReserve,
        btc_reserve_share_bps: ratioBps(btcReserve, reserveTotal),
        stress_multiplier_bps: Math.round(issuanceMultiplier(stress) * 10_000)
    };
}
function ratioBps(numerator, denominator) {
    if (denominator <= 0n)
        return 0n;
    return (numerator * 10000n) / denominator;
}
