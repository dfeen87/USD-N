// src/engine/replay_verify.ts
import type { HashedEvent } from "./hashchain.js";
import { computeEventHash } from "./hashchain.js";
import type { PolicyAction, ReserveSnapshot, StressSnapshot } from "../types.js";
import {
  isValidTenderState,
  validateTenderState
} from "./tender_validity.js";

export type VerifyResult = {
  ok: boolean;
  final_supply_cents: bigint;
  events: number;
  errors: string[];
};

export type VerifyOptions = {
  strict?: boolean;
};

export function verifyAndReplay(
  events: readonly HashedEvent[],
  options: VerifyOptions = {}
): VerifyResult {
  const errors: string[] = [];

  let supply = 0n;
  let lastHash = "GENESIS";
  let lastReserveSnapshot: ReserveSnapshot | null = null;
  let lastStressSnapshot: StressSnapshot | null = null;
  let lastPolicyAction: PolicyAction | null = null;
  let lastPolicyActionIndex: number | null = null;
  let lastReserveSnapshotIndex: number | null = null;
  let lastStressSnapshotIndex: number | null = null;
  const usedBtcProofs = new Set<string>();
  const strict = options.strict ?? false;

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
      const tenderState = {
        event: e,
        index: i,
        currentSupply: supply,
        lastPolicyAction,
        lastPolicyActionIndex,
        lastReserveSnapshot,
        lastReserveSnapshotIndex,
        lastStressSnapshot,
        lastStressSnapshotIndex,
        usedBtcProofs,
        strict
      };
      if (!isValidTenderState(tenderState)) {
        const tenderErrors = validateTenderState(tenderState);
        for (const err of tenderErrors) {
          errors.push(`${err} at index ${i}`);
        }
      }

      switch (e.type) {
        case "RESERVE_SNAPSHOT": {
          lastReserveSnapshot = e.snapshot;
          lastReserveSnapshotIndex = i;
          break;
        }

        case "STRESS_SNAPSHOT": {
          lastStressSnapshot = e.snapshot;
          lastStressSnapshotIndex = i;
          break;
        }

        case "MINT": {
          supply = supply + e.amount;
          break;
        }

        case "BURN": {
          if (e.amount > supply) {
            // still apply a safe behavior: do not underflow state
            break;
          }
          supply = supply - e.amount;
          break;
        }

        case "BTC_BACKED_ISSUE": {
          const key = proofKey(e.proof);
          usedBtcProofs.add(key);
          supply = supply + e.amount;
          break;
        }

        case "BTC_BACKED_BURN": {
          if (e.amount > supply) {
            break;
          }
          supply = supply - e.amount;
          break;
        }

        case "POLICY_ACTION": {
          // Policy events are informational from the verifier’s perspective.
          // They can be cross-checked later, but they do not change supply.
          lastPolicyAction = e.action;
          lastPolicyActionIndex = i;
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

      if (supply < 0n) {
        errors.push(`INVARIANT_FAIL: supply < 0 at index ${i}`);
      }
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

function proofKey(proof: { btc_address: string; message: string; signature: string }): string {
  return `${proof.btc_address}|${proof.message}|${proof.signature}`;
}
