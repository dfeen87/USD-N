import crypto from "crypto";
import type { LedgerEvent } from "../types.js";

export type HashedEvent = LedgerEvent & {
  prev_hash: string;
  hash: string;
};

export function hashEvent(
  event: LedgerEvent,
  prev_hash: string
): HashedEvent {
  const payload = JSON.stringify({
    prev_hash,
    event
  });

  const hash = crypto
    .createHash("sha256")
    .update(payload)
    .digest("hex");

  return {
    ...event,
    prev_hash,
    hash
  };
}
