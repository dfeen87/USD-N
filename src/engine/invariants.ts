import { CONFIG } from "../config.js";
import type { ReserveSnapshot, USDN } from "../types.js";

export function assertNonNegative(name: string, v: bigint): void {
  if (v < 0n) throw new Error(`INVARIANT_FAIL: ${name} < 0`);
}

export function assertStepLimit(kind: "ISSUE" | "BURN", amount: USDN): void {
  if (kind === "ISSUE" && amount > CONFIG.max_issue_per_step_cents) {
    throw new Error(`INVARIANT_FAIL: issue step limit exceeded (${amount})`);
  }
  if (kind === "BURN" && amount > CONFIG.max_burn_per_step_cents) {
    throw new Error(`INVARIANT_FAIL: burn step limit exceeded (${amount})`);
  }
}

export function reserveCoverageBps(snapshot: ReserveSnapshot, supply: USDN): number {
  if (supply === 0n) return 10_000;
  // coverage = reserves / supply
  // both in cents => ratio in bps
  const cov = Number((snapshot.total_value_usd * 10_000n) / supply);
  return cov;
}

export function assertReserveCoverage(snapshot: ReserveSnapshot, supply: USDN): void {
  const cov = reserveCoverageBps(snapshot, supply);
  if (cov < CONFIG.min_reserve_coverage_bps) {
    throw new Error(`INVARIANT_FAIL: reserve coverage too low (${cov} bps)`);
  }
}
