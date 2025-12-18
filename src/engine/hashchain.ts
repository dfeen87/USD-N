import crypto from "crypto";
import type { LedgerEvent } from "../types.js";
import { stableStringify } from "./stable_stringify.js";

export type HashedEvent = LedgerEvent & {
  prev_hash: string;
  hash: string;
};

/**
 * Computes the canonical hash for a ledger event.
 * This function MUST be deterministic across runtimes.
 */
export function computeEventHash(
  event: LedgerEvent,
  prev_hash: string
): string {
  const payload = stableStringify({
    prev_hash,
    event
  });

  return crypto
    .createHash("sha256")
    .update(payload)
    .digest("hex");
}

export function hashEvent(
  event: LedgerEvent,
  prev_hash: string
): HashedEvent {
  const hash = computeEventHash(event, prev_hash);
  return {
    ...event,
    prev_hash,
    hash
  };
}
