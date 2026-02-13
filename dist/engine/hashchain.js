import crypto from "crypto";
import { stableStringify } from "./stable_stringify.js";
/**
 * Computes the canonical hash for a ledger event.
 * This function MUST be deterministic across runtimes.
 */
export function computeEventHash(event, prev_hash) {
    const payload = stableStringify({
        event,
        prev_hash
    });
    return crypto
        .createHash("sha256")
        .update(payload)
        .digest("hex");
}
export function hashEvent(event, prev_hash) {
    const hash = computeEventHash(event, prev_hash);
    return {
        ...event,
        prev_hash,
        hash
    };
}
