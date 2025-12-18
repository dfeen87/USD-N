import type { ReserveSnapshot, ReserveAsset, USD } from "../types.js";

const ASSETS: ReserveAsset[] = ["UST", "GOLD", "ENERGY", "COMMODITY"];

export function makeReserveSnapshot(at: string, total_value_usd: USD): ReserveSnapshot {
  // simple split for now; later tie to weights + pricing feeds
  const each = total_value_usd / BigInt(ASSETS.length);
  const by_asset_usd = {
    UST: each,
    GOLD: each,
    ENERGY: each,
    COMMODITY: total_value_usd - each * BigInt(ASSETS.length - 1) // keep sum exact
  } satisfies Record<ReserveAsset, USD>;

  return {
    at,
    total_value_usd,
    by_asset_usd,
    attestation_id: `attest-${at}`
  };
}
