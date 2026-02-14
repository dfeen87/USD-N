import type { ReserveSnapshot, ReserveAsset, USD } from "../types.js";

const ASSETS: ReserveAsset[] = ["UST", "GOLD", "ENERGY", "COMMODITY"];
const NON_BTC_ASSET_COUNT = ASSETS.length;

export function makeReserveSnapshot(
  at: string,
  total_value_usd: USD,
  btc_value_usd: USD = 0n
): ReserveSnapshot {
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
    COMMODITY:
      nonBtcTotal - each * BigInt(NON_BTC_ASSET_COUNT - 1), // keep sum exact
    BTC: btc_value_usd
  } satisfies Record<ReserveAsset, USD>;

  const snapshot: ReserveSnapshot = {
    at,
    total_value_usd,
    by_asset_usd,
    attestation_id: `attest-${at}`
  };

  // If BTC value is specified, add BTC details
  if (btc_value_usd > 0n) {
    // Use a fixed price for simulation (e.g., $100,000 per BTC)
    const btcPriceUsd = 100000;
    const btcAmount = Number(btc_value_usd) / 100 / btcPriceUsd;
    
    snapshot.btc = {
      asset: "BTC",
      amount_btc: btcAmount,
      value_usd: btc_value_usd,
      price_snapshot: {
        price_usd: btcPriceUsd,
        timestamp: Date.parse(at),
        source: "simulation"
      }
    };
  }

  return snapshot;
}
