import type { LedgerEvent, MacroTelemetry, ReserveSnapshot } from "../types.js";
import { Ledger } from "./ledger.js";
import { fidesPolicyDecision } from "./policy.js";
import {
  assertReserveCoverage,
  assertStepLimit,
  assertValidReserveSnapshot
} from "./invariants.js";

export class FIDES {
  constructor(private readonly ledger: Ledger) {}

  step(at: string, telemetry: MacroTelemetry, reserves: ReserveSnapshot): LedgerEvent[] {
    const produced: LedgerEvent[] = [];

    // record reserves snapshot (auditable)
    assertValidReserveSnapshot(reserves);
    this.ledger.record({ type: "RESERVE_SNAPSHOT", at, snapshot: reserves });
    produced.push({ type: "RESERVE_SNAPSHOT", at, snapshot: reserves });

    // policy decision
    const action = fidesPolicyDecision(telemetry, this.ledger.getSupply());
    this.ledger.record({ type: "POLICY_ACTION", at, action });
    produced.push({ type: "POLICY_ACTION", at, action });

    // execute policy
    if (action.kind === "ISSUE") {
      try {
        assertStepLimit("ISSUE", action.amount);
        // enforce reserve coverage AFTER issue (conservative check)
        const newSupply = this.ledger.getSupply() + action.amount;
        assertReserveCoverage(reserves, newSupply);

        this.ledger.mint(at, action.amount, action.reason);
        produced.push({ type: "MINT", at, amount: action.amount, memo: action.reason });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.ledger.record({ type: "POLICY_REJECTED", at, action, reason });
        produced.push({ type: "POLICY_REJECTED", at, action, reason });
      }
    } else if (action.kind === "BURN") {
      try {
        assertStepLimit("BURN", action.amount);
        this.ledger.burn(at, action.amount, action.reason);
        produced.push({ type: "BURN", at, amount: action.amount, memo: action.reason });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.ledger.record({ type: "POLICY_REJECTED", at, action, reason });
        produced.push({ type: "POLICY_REJECTED", at, action, reason });
      }
    }

    return produced;
  }
}
