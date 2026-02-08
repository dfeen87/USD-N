import { CONFIG } from "../config.js";
import type {
  BtcOwnershipProof,
  BtcPriceSnapshot,
  ReserveSnapshot,
  StressSnapshot,
  USD,
  USDN
} from "../types.js";

const BTC_DECIMALS = 8;

export function assertNonNegative(name: string, v: bigint): void {
  if (v < 0n) throw new Error(`INVARIANT_FAIL: ${name} < 0`);
}

export function assertNonNegativeNumber(name: string, v: number): void {
  if (!Number.isFinite(v)) {
    throw new Error(`INVARIANT_FAIL: ${name} is not finite`);
  }
  if (v < 0) {
    throw new Error(`INVARIANT_FAIL: ${name} < 0`);
  }
}

export function assertStepLimit(kind: "ISSUE" | "BURN", amount: USDN): void {
  if (kind === "ISSUE" && amount > CONFIG.max_issue_per_step_cents) {
    throw new Error(`INVARIANT_FAIL: issue step limit exceeded (${amount})`);
  }
  if (kind === "BURN" && amount > CONFIG.max_burn_per_step_cents) {
    throw new Error(`INVARIANT_FAIL: burn step limit exceeded (${amount})`);
  }
}

export function reserveCoverageBps(snapshot: ReserveSnapshot, supply: USDN): bigint {
  if (supply === 0n) return 10_000n;
  // coverage = reserves / supply
  // both in cents => ratio in bps
  return (snapshot.total_value_usd * 10_000n) / supply;
}

export function assertReserveCoverage(snapshot: ReserveSnapshot, supply: USDN): void {
  const cov = reserveCoverageBps(snapshot, supply);
  if (cov < CONFIG.min_reserve_coverage_bps) {
    throw new Error(`INVARIANT_FAIL: reserve coverage too low (${cov} bps)`);
  }
}

export function btcToUsdCents(amount_btc: number, price_usd: number): USD {
  assertNonNegativeNumber("btc.amount_btc", amount_btc);
  assertNonNegativeNumber("btc.price_usd", price_usd);
  if (price_usd === 0) {
    throw new Error("INVARIANT_FAIL: btc.price_usd must be > 0");
  }
  const cents = Math.round(amount_btc * price_usd * 100);
  if (!Number.isFinite(cents)) {
    throw new Error("INVARIANT_FAIL: btc usd value not finite");
  }
  return BigInt(cents);
}

export function usdCentsToBtc(amount: USDN, price_usd: number): number {
  assertNonNegativeNumber("btc.price_usd", price_usd);
  if (price_usd === 0) {
    throw new Error("INVARIANT_FAIL: btc.price_usd must be > 0");
  }
  const btc = Number(amount) / 100 / price_usd;
  if (!Number.isFinite(btc)) {
    throw new Error("INVARIANT_FAIL: btc.amount_btc not finite");
  }
  const scale = 10 ** BTC_DECIMALS;
  return Math.round(btc * scale) / scale;
}

export function assertValidBtcPriceSnapshot(
  snapshot: BtcPriceSnapshot,
  at: string
): void {
  if (!Number.isFinite(snapshot.price_usd) || snapshot.price_usd <= 0) {
    throw new Error("INVARIANT_FAIL: btc.price_usd must be > 0");
  }
  if (!Number.isFinite(snapshot.timestamp)) {
    throw new Error("INVARIANT_FAIL: btc.timestamp not finite");
  }
  const atMs = Date.parse(at);
  if (!Number.isFinite(atMs)) {
    throw new Error("INVARIANT_FAIL: snapshot.at invalid");
  }
  if (snapshot.timestamp > atMs) {
    throw new Error("INVARIANT_FAIL: btc.timestamp in future");
  }
  if (!snapshot.source || snapshot.source.trim().length === 0) {
    throw new Error("INVARIANT_FAIL: btc.source empty");
  }
}

export function assertValidBtcOwnershipProof(proof: BtcOwnershipProof): void {
  assertNonEmptyString("btc.address", proof.btc_address);
  assertNonEmptyString("btc.message", proof.message);
  assertNonEmptyString("btc.signature", proof.signature);
}

export function btcReserveValue(snapshot: ReserveSnapshot): USD {
  return snapshot.btc?.value_usd ?? 0n;
}

export function assertBtcReserveCoverage(
  snapshot: ReserveSnapshot,
  supply: USDN
): void {
  const btcValue = btcReserveValue(snapshot);
  if (btcValue < supply) {
    throw new Error(
      `INVARIANT_FAIL: btc reserve coverage too low (btc=${btcValue} supply=${supply})`
    );
  }
}

export function assertValidReserveSnapshot(snapshot: ReserveSnapshot): void {
  assertNonNegative("reserve.total_value_usd", snapshot.total_value_usd);
  let sum = 0n;
  for (const [asset, value] of Object.entries(snapshot.by_asset_usd)) {
    assertNonNegative(`reserve.asset.${asset}`, value);
    sum += value;
  }
  if (sum !== snapshot.total_value_usd) {
    throw new Error(
      `INVARIANT_FAIL: reserve total mismatch (sum=${sum}, total=${snapshot.total_value_usd})`
    );
  }

  const btcValue = snapshot.by_asset_usd.BTC ?? 0n;
  if (snapshot.btc) {
    if (snapshot.btc.asset !== "BTC") {
      throw new Error("INVARIANT_FAIL: btc reserve asset must be BTC");
    }
    assertValidBtcPriceSnapshot(snapshot.btc.price_snapshot, snapshot.at);
    const derived = btcToUsdCents(
      snapshot.btc.amount_btc,
      snapshot.btc.price_snapshot.price_usd
    );
    assertNonNegative("reserve.btc.value_usd", snapshot.btc.value_usd);
    if (derived !== snapshot.btc.value_usd) {
      throw new Error(
        `INVARIANT_FAIL: btc reserve value mismatch (derived=${derived}, value=${snapshot.btc.value_usd})`
      );
    }
    if (btcValue !== snapshot.btc.value_usd) {
      throw new Error(
        `INVARIANT_FAIL: btc reserve by_asset mismatch (asset=${btcValue}, value=${snapshot.btc.value_usd})`
      );
    }
  } else if (btcValue > 0n) {
    throw new Error("INVARIANT_FAIL: btc reserve details missing");
  }
}

export function assertValidStressSnapshot(snapshot: StressSnapshot, at: string): void {
  assertNonNegativeNumber("stress.btc_drawdown_pct", snapshot.btc_drawdown_pct);
  assertNonNegativeNumber("stress.btc_volatility_pct", snapshot.btc_volatility_pct);
  if (!Number.isFinite(snapshot.timestamp)) {
    throw new Error("INVARIANT_FAIL: stress.timestamp not finite");
  }
  const atMs = Date.parse(at);
  if (!Number.isFinite(atMs)) {
    throw new Error("INVARIANT_FAIL: stress.at invalid");
  }
  if (snapshot.timestamp > atMs) {
    throw new Error("INVARIANT_FAIL: stress.timestamp in future");
  }
}

function assertNonEmptyString(name: string, value: string): void {
  if (!value || value.trim().length === 0) {
    throw new Error(`INVARIANT_FAIL: ${name} empty`);
  }
}
