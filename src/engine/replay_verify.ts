// src/engine/replay_verify.ts
import type { HashedEvent } from "./hashchain.js";
import { computeEventHash } from "./hashchain.js";
import type { BtcOwnershipProof, ReserveSnapshot } from "../types.js";
import {
  assertBtcReserveCoverage,
  assertValidBtcOwnershipProof,
  assertValidBtcPriceSnapshot,
  assertNonNegative,
  assertReserveCoverage,
  assertValidReserveSnapshot,
  btcToUsdCents
} from "./invariants.js";

export type VerifyResult = {
  ok: boolean;
  final_supply_cents: bigint;
  events: number;
  errors: string[];
};

export function verifyAndReplay(events: readonly HashedEvent[]): VerifyResult {
  const errors: string[] = [];

  let supply = 0n;
  let lastHash = "GENESIS";
  let lastReserveSnapshot: ReserveSnapshot | null = null;
  const usedBtcProofs = new Set<string>();

  for (let i = 0; i < events.length; i++) {
    const e = events[i];

    // 1) hash-chain integrity
    if (e.prev_hash !== lastHash) {
      errors.push(
        `HASH_CHAIN_BROKEN at index ${i}: prev_hash=${e.prev_hash} expected=${lastHash}`
      );
    }

    const recomputed = computeEventHash(stripHashFields(e), e.prev_hash);
    if (e.hash !== recomputed) {
      errors.push(
        `HASH_MISMATCH at index ${i}: hash=${e.hash} recomputed=${recomputed}`
      );
    }

    // 2) state replay + invariants
    try {
      switch (e.type) {
        case "RESERVE_SNAPSHOT": {
          assertValidReserveSnapshot(e.snapshot);
          lastReserveSnapshot = e.snapshot;
          break;
        }

        case "MINT": {
          assertNonNegative("mint.amount", e.amount);

          // Reserve coverage is a precondition to issuance, if we have a snapshot.
          // If no snapshot exists yet, we don't invent one; we only enforce what is known.
          const newSupply = supply + e.amount;
          if (lastReserveSnapshot) {
            assertBtcReserveCoverage(lastReserveSnapshot, newSupply);
            assertReserveCoverage(lastReserveSnapshot, newSupply);
          }

          supply = newSupply;
          break;
        }

        case "BURN": {
          assertNonNegative("burn.amount", e.amount);
          if (e.amount > supply) {
            errors.push(
              `INVARIANT_FAIL burn>suppy at index ${i}: burn=${e.amount} supply=${supply}`
            );
            // still apply a safe behavior: do not underflow state
          } else {
            supply = supply - e.amount;
          }
          break;
        }

        case "BTC_BACKED_ISSUE": {
          assertNonNegative("btc_issue.amount", e.amount);
          assertValidBtcPriceSnapshot(e.price_snapshot, e.at);
          assertValidBtcOwnershipProof(e.proof);

          const key = proofKey(e.proof);
          if (usedBtcProofs.has(key)) {
            errors.push(`INVARIANT_FAIL btc proof reused at index ${i}`);
            break;
          }
          usedBtcProofs.add(key);

          const expected = btcToUsdCents(
            e.btc_amount,
            e.price_snapshot.price_usd
          );
          if (expected !== e.amount) {
            errors.push(
              `INVARIANT_FAIL btc issue amount mismatch at index ${i}: expected=${expected} actual=${e.amount}`
            );
          }

          const newSupply = supply + e.amount;
          if (lastReserveSnapshot) {
            assertBtcReserveCoverage(lastReserveSnapshot, newSupply);
          } else {
            errors.push(`INVARIANT_FAIL btc issue missing reserve snapshot at index ${i}`);
          }

          supply = newSupply;
          break;
        }

        case "BTC_BACKED_BURN": {
          assertNonNegative("btc_burn.amount", e.amount);
          assertValidBtcPriceSnapshot(e.price_snapshot, e.at);
          const expected = btcToUsdCents(
            e.btc_amount,
            e.price_snapshot.price_usd
          );
          if (expected !== e.amount) {
            errors.push(
              `INVARIANT_FAIL btc burn amount mismatch at index ${i}: expected=${expected} actual=${e.amount}`
            );
          }
          if (!lastReserveSnapshot?.btc) {
            errors.push(`INVARIANT_FAIL btc burn missing reserve snapshot at index ${i}`);
          } else if (lastReserveSnapshot.btc.amount_btc < e.btc_amount) {
            errors.push(
              `INVARIANT_FAIL btc burn exceeds reserves at index ${i}: burn=${e.btc_amount} reserve=${lastReserveSnapshot.btc.amount_btc}`
            );
          }
          if (e.amount > supply) {
            errors.push(
              `INVARIANT_FAIL btc burn>suppy at index ${i}: burn=${e.amount} supply=${supply}`
            );
          } else {
            supply = supply - e.amount;
          }
          break;
        }

        case "POLICY_ACTION": {
          // Policy events are informational from the verifier’s perspective.
          // They can be cross-checked later, but they do not change supply.
          break;
        }

        case "POLICY_REJECTED": {
          // Rejections do not change supply; they are audit records.
          break;
        }

        default: {
          const never: never = e;
          errors.push(`UNKNOWN_EVENT_TYPE at index ${i}: ${(never as any)?.type}`);
        }
      }

      assertNonNegative("supply", supply);
    } catch (err) {
      errors.push(
        `EXCEPTION at index ${i} type=${e.type}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    lastHash = e.hash;
  }

  return {
    ok: errors.length === 0,
    final_supply_cents: supply,
    events: events.length,
    errors
  };
}

function stripHashFields(e: HashedEvent) {
  // recompute over the original LedgerEvent fields only (no hash/prev_hash)
  const { prev_hash: _p, hash: _h, ...event } = e;
  return event;
}

function proofKey(proof: BtcOwnershipProof): string {
  return `${proof.btc_address}|${proof.message}|${proof.signature}`;
}
