import type { ReserveOracle } from "./attestation.js";
import type { ReserveSnapshot } from "../types.js";

export async function resolveReserves(
  oracle: ReserveOracle
): Promise<ReserveSnapshot> {
  const attestation = await oracle.latest();

  const ASSET_COUNT = 5; // UST, GOLD, ENERGY, COMMODITY, BTC
  const each = attestation.total_value_usd_cents / BigInt(ASSET_COUNT);
  const remainder = attestation.total_value_usd_cents - each * BigInt(ASSET_COUNT - 1);

  return {
    at: attestation.at,
    total_value_usd: attestation.total_value_usd_cents,
    by_asset_usd: {
      UST: each,
      GOLD: each,
      ENERGY: each,
      COMMODITY: remainder,
      BTC: each
    },
    attestation_id: attestation.signature
  };
}
