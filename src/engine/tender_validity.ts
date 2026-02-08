import type {
  LedgerEvent,
  PolicyAction,
  ReserveSnapshot,
  StressSnapshot,
  USDN
} from "../types.js";
import { stressAdjustedIssuanceAmount } from "./policy.js";
import {
  assertBtcReserveCoverage,
  assertNonNegative,
  assertReserveCoverage,
  assertValidBtcOwnershipProof,
  assertValidBtcPriceSnapshot,
  assertValidReserveSnapshot,
  assertValidStressSnapshot,
  btcToUsdCents
} from "./invariants.js";

export type TenderLedgerState = {
  event: LedgerEvent;
  index: number;
  currentSupply: USDN;
  lastPolicyAction: PolicyAction | null;
  lastPolicyActionIndex: number | null;
  lastReserveSnapshot: ReserveSnapshot | null;
  lastReserveSnapshotIndex: number | null;
  lastStressSnapshot: StressSnapshot | null;
  lastStressSnapshotIndex: number | null;
  usedBtcProofs: ReadonlySet<string>;
  strict: boolean;
};

export function isValidTenderState(state: TenderLedgerState): boolean {
  return validateTenderState(state).length === 0;
}

export function validateTenderState(state: TenderLedgerState): string[] {
  const errors: string[] = [];
  const { event } = state;
  const isIssuance =
    event.type === "MINT" || event.type === "BTC_BACKED_ISSUE";
  const isBurn = event.type === "BURN" || event.type === "BTC_BACKED_BURN";
  const isMonetary = isIssuance || isBurn;

  pushInvariant(errors, () => assertNonNegative("supply", state.currentSupply));

  if (isMonetary) {
    enforcePolicyLinkage(errors, state, expectedPolicyKind(event));
  }

  if (state.strict && isMonetary) {
    enforceStrictLinkage(errors, state);
  }

  switch (event.type) {
    case "RESERVE_SNAPSHOT": {
      pushInvariant(errors, () => assertValidReserveSnapshot(event.snapshot));
      break;
    }
    case "STRESS_SNAPSHOT": {
      pushInvariant(errors, () =>
        assertValidStressSnapshot(event.snapshot, event.at)
      );
      break;
    }
    case "MINT": {
      pushInvariant(errors, () => assertNonNegative("mint.amount", event.amount));

      if (!state.lastStressSnapshot) {
        errors.push("INVARIANT_FAIL: mint missing stress snapshot");
        break;
      }
      if (!state.lastPolicyAction || state.lastPolicyAction.kind !== "ISSUE") {
        break;
      }

      const expected = stressAdjustedIssuanceAmount(
        state.lastPolicyAction.amount,
        state.lastStressSnapshot
      );
      if (expected !== event.amount) {
        errors.push(
          `INVARIANT_FAIL: mint exceeds stress bounds (expected=${expected} actual=${event.amount})`
        );
      }

      const newSupply = state.currentSupply + event.amount;
      const reserveSnapshot = state.lastReserveSnapshot;
      if (!reserveSnapshot) {
        errors.push("INVARIANT_FAIL: mint missing reserve snapshot");
        break;
      }
      pushInvariant(errors, () =>
        assertBtcReserveCoverage(reserveSnapshot, newSupply)
      );
      pushInvariant(errors, () =>
        assertReserveCoverage(reserveSnapshot, newSupply)
      );
      break;
    }
    case "BURN": {
      pushInvariant(errors, () => assertNonNegative("burn.amount", event.amount));

      if (event.amount > state.currentSupply) {
        errors.push(
          `INVARIANT_FAIL: burn exceeds supply (burn=${event.amount} supply=${state.currentSupply})`
        );
      }
      if (
        state.lastPolicyAction &&
        state.lastPolicyAction.kind === "BURN" &&
        state.lastPolicyAction.amount !== event.amount
      ) {
        errors.push(
          `INVARIANT_FAIL: burn amount mismatch vs policy action (policy=${state.lastPolicyAction.amount} burn=${event.amount})`
        );
      }
      break;
    }
    case "BTC_BACKED_ISSUE": {
      pushInvariant(errors, () =>
        assertNonNegative("btc_issue.amount", event.amount)
      );
      pushInvariant(errors, () =>
        assertValidBtcPriceSnapshot(event.price_snapshot, event.at)
      );
      pushInvariant(errors, () => assertValidBtcOwnershipProof(event.proof));

      const key = proofKey(event.proof);
      if (state.usedBtcProofs.has(key)) {
        errors.push("INVARIANT_FAIL: btc proof reused");
      }

      const expected = btcToUsdCents(
        event.btc_amount,
        event.price_snapshot.price_usd
      );
      if (expected !== event.amount) {
        errors.push(
          `INVARIANT_FAIL: btc issue amount mismatch (expected=${expected} actual=${event.amount})`
        );
      }

      const newSupply = state.currentSupply + event.amount;
      const reserveSnapshot = state.lastReserveSnapshot;
      if (!reserveSnapshot) {
        errors.push("INVARIANT_FAIL: btc issue missing reserve snapshot");
        break;
      }
      pushInvariant(errors, () =>
        assertBtcReserveCoverage(reserveSnapshot, newSupply)
      );
      pushInvariant(errors, () =>
        assertReserveCoverage(reserveSnapshot, newSupply)
      );

      if (state.lastPolicyAction?.kind === "BTC_BACKED_ISSUE") {
        enforceBtcPolicyMatch(errors, state.lastPolicyAction, event, "issue");
      }
      break;
    }
    case "BTC_BACKED_BURN": {
      pushInvariant(errors, () =>
        assertNonNegative("btc_burn.amount", event.amount)
      );
      pushInvariant(errors, () =>
        assertValidBtcPriceSnapshot(event.price_snapshot, event.at)
      );

      const expected = btcToUsdCents(
        event.btc_amount,
        event.price_snapshot.price_usd
      );
      if (expected !== event.amount) {
        errors.push(
          `INVARIANT_FAIL: btc burn amount mismatch (expected=${expected} actual=${event.amount})`
        );
      }

      if (!state.lastReserveSnapshot?.btc) {
        errors.push("INVARIANT_FAIL: btc burn missing reserve snapshot");
      } else if (state.lastReserveSnapshot.btc.amount_btc < event.btc_amount) {
        errors.push(
          `INVARIANT_FAIL: btc burn exceeds reserves (burn=${event.btc_amount} reserve=${state.lastReserveSnapshot.btc.amount_btc})`
        );
      }

      if (event.amount > state.currentSupply) {
        errors.push(
          `INVARIANT_FAIL: btc burn exceeds supply (burn=${event.amount} supply=${state.currentSupply})`
        );
      }

      if (state.lastPolicyAction?.kind === "BTC_BACKED_BURN") {
        enforceBtcPolicyMatch(errors, state.lastPolicyAction, event, "burn");
      }
      break;
    }
    case "POLICY_ACTION":
    case "POLICY_REJECTED":
      break;
    default: {
      const never: never = event;
      errors.push(
        `INVARIANT_FAIL: unknown event type ${(never as any)?.type ?? "unknown"}`
      );
    }
  }

  return errors;
}

function pushInvariant(errors: string[], fn: () => void): void {
  try {
    fn();
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }
}

function enforcePolicyLinkage(
  errors: string[],
  state: TenderLedgerState,
  expected: PolicyAction["kind"] | null
): void {
  if (!expected) return;
  if (!state.lastPolicyAction) {
    errors.push(`INVARIANT_FAIL: ${expected.toLowerCase()} missing policy action`);
    return;
  }
  if (state.lastPolicyAction.kind !== expected) {
    errors.push(
      `INVARIANT_FAIL: policy action kind mismatch (expected=${expected} actual=${state.lastPolicyAction.kind})`
    );
  }
}

function enforceStrictLinkage(errors: string[], state: TenderLedgerState): void {
  if (state.lastPolicyActionIndex === null) {
    errors.push("INVARIANT_FAIL: strict mode requires explicit policy action");
    return;
  }
  if (state.lastPolicyActionIndex !== state.index - 1) {
    errors.push(
      "INVARIANT_FAIL: strict mode requires policy action immediately before monetary event"
    );
  }
  if (state.event.type === "MINT" && state.lastStressSnapshotIndex === null) {
    errors.push("INVARIANT_FAIL: strict mode requires stress snapshot before mint");
  }
  if (
    (state.event.type === "MINT" ||
      state.event.type === "BTC_BACKED_ISSUE") &&
    state.lastReserveSnapshotIndex === null
  ) {
    errors.push(
      "INVARIANT_FAIL: strict mode requires reserve snapshot before issuance"
    );
  }
  if (
    state.event.type === "BTC_BACKED_BURN" &&
    state.lastReserveSnapshotIndex === null
  ) {
    errors.push(
      "INVARIANT_FAIL: strict mode requires reserve snapshot before btc burn"
    );
  }
}

function expectedPolicyKind(event: LedgerEvent): PolicyAction["kind"] | null {
  switch (event.type) {
    case "MINT":
      return "ISSUE";
    case "BURN":
      return "BURN";
    case "BTC_BACKED_ISSUE":
      return "BTC_BACKED_ISSUE";
    case "BTC_BACKED_BURN":
      return "BTC_BACKED_BURN";
    default:
      return null;
  }
}

function enforceBtcPolicyMatch(
  errors: string[],
  policy: Extract<
    PolicyAction,
    { kind: "BTC_BACKED_ISSUE" | "BTC_BACKED_BURN" }
  >,
  event: Extract<
    LedgerEvent,
    { type: "BTC_BACKED_ISSUE" | "BTC_BACKED_BURN" }
  >,
  verb: "issue" | "burn"
): void {
  if (policy.amount !== event.amount) {
    errors.push(
      `INVARIANT_FAIL: btc ${verb} amount mismatch vs policy action (policy=${policy.amount} event=${event.amount})`
    );
  }
  if (policy.btc_amount !== event.btc_amount) {
    errors.push(
      `INVARIANT_FAIL: btc ${verb} btc_amount mismatch vs policy action (policy=${policy.btc_amount} event=${event.btc_amount})`
    );
  }
  if (policy.price_snapshot.price_usd !== event.price_snapshot.price_usd) {
    errors.push(
      `INVARIANT_FAIL: btc ${verb} price mismatch vs policy action (policy=${policy.price_snapshot.price_usd} event=${event.price_snapshot.price_usd})`
    );
  }
  if (policy.price_snapshot.timestamp !== event.price_snapshot.timestamp) {
    errors.push(
      `INVARIANT_FAIL: btc ${verb} price timestamp mismatch vs policy action (policy=${policy.price_snapshot.timestamp} event=${event.price_snapshot.timestamp})`
    );
  }
  if (policy.price_snapshot.source !== event.price_snapshot.source) {
    errors.push(
      `INVARIANT_FAIL: btc ${verb} price source mismatch vs policy action (policy=${policy.price_snapshot.source} event=${event.price_snapshot.source})`
    );
  }
  if (policy.kind === "BTC_BACKED_ISSUE" && "proof" in event) {
    if (policy.proof.btc_address !== event.proof.btc_address) {
      errors.push(
        `INVARIANT_FAIL: btc ${verb} proof address mismatch vs policy action`
      );
    }
    if (policy.proof.message !== event.proof.message) {
      errors.push(
        `INVARIANT_FAIL: btc ${verb} proof message mismatch vs policy action`
      );
    }
    if (policy.proof.signature !== event.proof.signature) {
      errors.push(
        `INVARIANT_FAIL: btc ${verb} proof signature mismatch vs policy action`
      );
    }
  }
}

function proofKey(proof: { btc_address: string; message: string; signature: string }) {
  return `${proof.btc_address}|${proof.message}|${proof.signature}`;
}
