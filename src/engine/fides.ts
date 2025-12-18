import type { LedgerEvent, MacroTelemetry, ReserveSnapshot } from "../types.js";
import { Ledger } from "./ledger.js";
import { fidesPolicyDecision } from "./policy.js";
import { assertReserveCoverage, assertStepLimit } from "./invariants.js";

export class FIDES {
  constructor(private readonly ledger: Ledger) {}

  step(at: string, telemetry: MacroTelemetry, reserves: ReserveSnapshot): LedgerEvent[] {
    const produced: LedgerEvent[] = [];

    // record reserves snapshot (auditable)
    this.ledger.record({ type: "RESERVE_SNAPSHOT", at, snapshot: reserves });
    produced.push({ type: "RESERVE_SNAPSHOT", at, snapshot: reserves });

    // policy decision
    const action = fidesPolicyDecision(telemetry, this.ledger.getSupply());
    this.ledger.record({ type: "POLICY_ACTION", at, action });
    produced.push({ type: "POLICY_ACTION", at, action });

    // execute policy
    if (action.kind === "ISSUE") {
      assertStepLimit("ISSUE", action.amount);
      // enforce reserve coverage AFTER issue (conservative check)
      const newSupply = this.ledger.getSupply() + action.amount;
      assertReserveCoverage(reserves, newSupply);

      this.ledger.mint(at, action.amount, action.reason);
      produced.push({ type: "MINT", at, amount: action.amount, memo: action.reason });
    } else if (action.kind === "BURN") {
      assertStepLimit("BURN", action.amount);
      this.ledger.burn(at, action.amount, action.reason);
      produced.push({ type: "BURN", at, amount: action.amount, memo: action.reason });
    }

    return produced;
  }
}
