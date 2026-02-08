import test from "node:test";
import assert from "node:assert/strict";
import { Ledger } from "./ledger.js";
import { FIDES } from "./fides.js";
import { makeReserveSnapshot } from "./reserves.js";
import { verifyAndReplay } from "./replay_verify.js";
import { btcToUsdCents } from "./invariants.js";
import type {
  BtcOwnershipProof,
  BtcPriceSnapshot,
  MacroTelemetry,
  ReserveSnapshot,
  StressSnapshot
} from "../types.js";

function buildBtcReserveSnapshot(
  at: string,
  btc_amount: number,
  price_snapshot: BtcPriceSnapshot
): ReserveSnapshot {
  const btc_value_usd = btcToUsdCents(btc_amount, price_snapshot.price_usd);
  return {
    at,
    total_value_usd: btc_value_usd,
    by_asset_usd: {
      UST: 0n,
      GOLD: 0n,
      ENERGY: 0n,
      COMMODITY: 0n,
      BTC: btc_value_usd
    },
    attestation_id: `attest-${at}`,
    btc: {
      asset: "BTC",
      amount_btc: btc_amount,
      value_usd: btc_value_usd,
      price_snapshot
    }
  };
}

test("rejected policy actions do not mutate supply", () => {
  const ledger = new Ledger();
  const fides = new FIDES(ledger);
  const at = "2024-01-01T00:00:00Z";

  const telemetry: MacroTelemetry = {
    at,
    cpi_yoy_bps: 100,
    gdp_qoq_bps: 200,
    unemployment_bps: 400
  };

  const reserves = makeReserveSnapshot(at, 1_000_000_00n, 0n);
  const stress: StressSnapshot = {
    btc_drawdown_pct: 10,
    btc_volatility_pct: 5,
    timestamp: Date.parse(at)
  };

  const events = fides.step(at, telemetry, reserves, stress);
  assert.equal(ledger.getSupply(), 0n);
  assert.ok(events.some((event) => event.type === "POLICY_REJECTED"));
  assert.ok(!events.some((event) => event.type === "MINT"));

  const replay = verifyAndReplay(ledger.getEvents(), { strict: true });
  assert.equal(replay.ok, true);
  assert.equal(replay.final_supply_cents, 0n);
});

test("burn bounds reject oversized policy action", () => {
  const ledger = new Ledger();
  const fides = new FIDES(ledger);
  const bootstrapAt = "2024-01-01T00:00:00Z";
  ledger.mint(bootstrapAt, 10_000_000_000n, "bootstrap supply");

  const at = "2024-01-01T00:05:00Z";
  const telemetry: MacroTelemetry = {
    at,
    cpi_yoy_bps: 500,
    gdp_qoq_bps: 200,
    unemployment_bps: 400
  };
  const reserves = makeReserveSnapshot(at, 1_000_000_00n, 0n);
  const stress: StressSnapshot = {
    btc_drawdown_pct: 5,
    btc_volatility_pct: 2,
    timestamp: Date.parse(at)
  };

  const supplyBefore = ledger.getSupply();
  const events = fides.step(at, telemetry, reserves, stress);

  assert.equal(ledger.getSupply(), supplyBefore);
  assert.ok(events.some((event) => event.type === "POLICY_REJECTED"));
  assert.ok(!events.some((event) => event.type === "BURN"));
});

test("deterministic replay matches supply deltas", () => {
  const atIssue = "2024-01-01T00:00:00Z";
  const atBurn = "2024-01-01T00:01:00Z";
  const price_snapshot: BtcPriceSnapshot = {
    price_usd: 50_000,
    timestamp: Date.parse(atIssue),
    source: "unit-test"
  };
  const proof: BtcOwnershipProof = {
    btc_address: "bc1qexampleaddress",
    message: "usd-n deterministic test",
    signature: "deadbeef"
  };

  function runScenario() {
    const ledger = new Ledger();
    const fides = new FIDES(ledger);
    const reserveIssue = buildBtcReserveSnapshot(atIssue, 1, price_snapshot);
    ledger.record({ type: "RESERVE_SNAPSHOT", at: atIssue, snapshot: reserveIssue });
    ledger.record({
      type: "POLICY_ACTION",
      at: atIssue,
      action: {
        kind: "BTC_BACKED_ISSUE",
        amount: btcToUsdCents(0.1, price_snapshot.price_usd),
        btc_amount: 0.1,
        price_snapshot,
        proof,
        reason: "BTC-backed issue"
      }
    });
    fides.issueBtcBacked(atIssue, reserveIssue, 0.1, price_snapshot, proof);

    const reserveBurn = buildBtcReserveSnapshot(atBurn, 1, price_snapshot);
    ledger.record({
      type: "POLICY_ACTION",
      at: atBurn,
      action: {
        kind: "BTC_BACKED_BURN",
        amount: 200_000n,
        btc_amount: Number(200_000n) / 100 / price_snapshot.price_usd,
        price_snapshot,
        reason: "BTC-backed burn"
      }
    });
    fides.burnBtcBacked(atBurn, reserveBurn, 200_000n, price_snapshot);

    return ledger.getEvents();
  }

  const eventsA = runScenario();
  const eventsB = runScenario();
  assert.deepEqual(eventsA, eventsB);

  const replay = verifyAndReplay(eventsA, { strict: false });
  assert.equal(replay.ok, true);

  const issueAmount = eventsA
    .filter((event) => event.type === "BTC_BACKED_ISSUE")
    .reduce((sum, event) => sum + event.amount, 0n);
  const burnAmount = eventsA
    .filter((event) => event.type === "BTC_BACKED_BURN")
    .reduce((sum, event) => sum + event.amount, 0n);

  assert.equal(replay.final_supply_cents, issueAmount - burnAmount);
});
