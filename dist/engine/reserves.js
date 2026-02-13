const ASSETS = ["UST", "GOLD", "ENERGY", "COMMODITY"];
const NON_BTC_ASSET_COUNT = ASSETS.length;
export function makeReserveSnapshot(at, total_value_usd, btc_value_usd = 0n) {
    // simple split for now; later tie to weights + pricing feeds
    if (btc_value_usd > total_value_usd) {
        throw new Error("INVARIANT_FAIL: BTC reserve exceeds total reserves");
    }
    const nonBtcTotal = total_value_usd - btc_value_usd;
    const each = nonBtcTotal / BigInt(NON_BTC_ASSET_COUNT);
    const by_asset_usd = {
        UST: each,
        GOLD: each,
        ENERGY: each,
        COMMODITY: nonBtcTotal - each * BigInt(NON_BTC_ASSET_COUNT - 1), // keep sum exact
        BTC: btc_value_usd
    };
    return {
        at,
        total_value_usd,
        by_asset_usd,
        attestation_id: `attest-${at}`
    };
}
