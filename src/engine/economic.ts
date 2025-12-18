import type { ReserveOracle } from "./attestation.js";
import type { ReserveSnapshot } from "../types.js";

export async function resolveReserves(
  oracle: ReserveOracle
): Promise<ReserveSnapshot> {
  const attestation = await oracle.latest();

  return {
    at: attestation.at,
    total_value_usd: attestation.total_value_usd_cents,
    by_asset_usd: {
      UST: attestation.total_value_usd_cents,
      GOLD: 0n,
      ENERGY: 0n,
      COMMODITY: 0n
    },
    attestation_id: attestation.signature
  };
}
