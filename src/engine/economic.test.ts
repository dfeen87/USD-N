import test from "node:test";
import assert from "node:assert/strict";
import { resolveReserves } from "./economic.js";
import type { ReserveOracle } from "./attestation.js";

test("resolveReserves distributes reserves across all assets", async () => {
  const mockOracle: ReserveOracle = {
    async latest() {
      return {
        attestor: "test-attestor",
        at: "2024-01-01T00:00:00Z",
        total_value_usd_cents: 1000n,
        signature: "test-sig"
      };
    }
  };

  const snapshot = await resolveReserves(mockOracle);

  // Verify total is preserved
  assert.equal(snapshot.total_value_usd, 1000n);

  // Verify sum of all assets equals total
  const sum =
    snapshot.by_asset_usd.UST +
    snapshot.by_asset_usd.GOLD +
    snapshot.by_asset_usd.ENERGY +
    snapshot.by_asset_usd.COMMODITY +
    snapshot.by_asset_usd.BTC;
  assert.equal(sum, snapshot.total_value_usd);

  // Verify no asset has ALL the reserves (this was the bug)
  assert.ok(snapshot.by_asset_usd.UST < snapshot.total_value_usd);
  assert.ok(snapshot.by_asset_usd.GOLD > 0n);
  assert.ok(snapshot.by_asset_usd.ENERGY > 0n);
  assert.ok(snapshot.by_asset_usd.COMMODITY > 0n);
  assert.ok(snapshot.by_asset_usd.BTC > 0n);
});

test("resolveReserves handles division with remainder correctly", async () => {
  const mockOracle: ReserveOracle = {
    async latest() {
      return {
        attestor: "test-attestor",
        at: "2024-01-01T00:00:00Z",
        total_value_usd_cents: 1003n, // Not evenly divisible by 5
        signature: "test-sig"
      };
    }
  };

  const snapshot = await resolveReserves(mockOracle);

  // Verify sum still equals total (remainder handled in COMMODITY)
  const sum =
    snapshot.by_asset_usd.UST +
    snapshot.by_asset_usd.GOLD +
    snapshot.by_asset_usd.ENERGY +
    snapshot.by_asset_usd.COMMODITY +
    snapshot.by_asset_usd.BTC;
  assert.equal(sum, snapshot.total_value_usd);
});
