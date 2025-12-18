// src/engine/replay_verify.ts
import type { HashedEvent } from "./hashchain.js";
import { computeEventHash } from "./hashchain.js";
import type { ReserveSnapshot } from "../types.js";
import { assertNonNegative } from "./invariants.js";
import { assertReserveCoverage } from "./invariants.js";

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
          lastReserveSnapshot = e.snapshot;
          break;
        }

        case "MINT": {
          assertNonNegative("mint.amount", e.amount);

          // Reserve coverage is a precondition to issuance, if we have a snapshot.
          // If no snapshot exists yet, we don't invent one; we only enforce what is known.
          const newSupply = supply + e.amount;
          if (lastReserveSnapshot) {
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

        case "POLICY_ACTION": {
          // Policy events are informational from the verifier’s perspective.
          // They can be cross-checked later, but they do not change supply.
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
