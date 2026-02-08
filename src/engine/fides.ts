import { CONFIG } from "../config.js";
import type {
  BtcOwnershipProof,
  BtcPriceSnapshot,
  LedgerEvent,
  MacroTelemetry,
  ReserveSnapshot,
  StressSnapshot,
  USDN
} from "../types.js";
import { Ledger } from "./ledger.js";
import {
  btcBackedBurnAmount,
  btcBackedMintAmount,
  fidesPolicyDecision,
  issuanceMultiplier,
  stressAdjustedIssuanceAmount
} from "./policy.js";
import {
  assertBtcReserveCoverage,
  assertReserveCoverage,
  assertStepLimit,
  assertValidBtcOwnershipProof,
  assertValidBtcPriceSnapshot,
  assertValidReserveSnapshot,
  assertValidStressSnapshot
} from "./invariants.js";

export class FIDES {
  constructor(private readonly ledger: Ledger) {}

  step(
    at: string,
    telemetry: MacroTelemetry,
    reserves: ReserveSnapshot,
    stress: StressSnapshot
  ): LedgerEvent[] {
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
        assertValidStressSnapshot(stress, at);
        this.ledger.record({ type: "STRESS_SNAPSHOT", at, snapshot: stress });
        produced.push({ type: "STRESS_SNAPSHOT", at, snapshot: stress });

        const multiplier = issuanceMultiplier(stress);
        const adjustedAmount = stressAdjustedIssuanceAmount(action.amount, stress);
        if (adjustedAmount < CONFIG.min_policy_step_cents) {
          throw new Error(
            `POLICY_REJECT: stress-adjusted issue below minimum (amount=${adjustedAmount}, multiplier=${multiplier.toFixed(4)})`
          );
        }

        assertStepLimit("ISSUE", adjustedAmount);
        // enforce reserve coverage AFTER issue (conservative check)
        const newSupply = this.ledger.getSupply() + adjustedAmount;
        assertBtcReserveCoverage(reserves, newSupply);
        assertReserveCoverage(reserves, newSupply);

        const memo = `${action.reason}; stress_multiplier=${multiplier.toFixed(4)}`;
        this.ledger.mint(at, adjustedAmount, memo);
        produced.push({ type: "MINT", at, amount: adjustedAmount, memo });
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

  issueBtcBacked(
    at: string,
    reserves: ReserveSnapshot,
    btc_amount: number,
    price_snapshot: BtcPriceSnapshot,
    proof: BtcOwnershipProof,
    memo = "BTC-backed issue"
  ): LedgerEvent[] {
    const produced: LedgerEvent[] = [];
    const actionAmount = btcBackedMintAmount(btc_amount, price_snapshot);
    const action = {
      kind: "BTC_BACKED_ISSUE",
      amount: actionAmount,
      btc_amount,
      price_snapshot,
      proof,
      reason: memo
    } satisfies {
      kind: "BTC_BACKED_ISSUE";
      amount: USDN;
      btc_amount: number;
      price_snapshot: BtcPriceSnapshot;
      proof: BtcOwnershipProof;
      reason: string;
    };

    try {
      assertValidReserveSnapshot(reserves);
      assertValidBtcPriceSnapshot(price_snapshot, at);
      assertValidBtcOwnershipProof(proof);

      const newSupply = this.ledger.getSupply() + actionAmount;
      assertBtcReserveCoverage(reserves, newSupply);

      this.ledger.issueBtcBacked(
        at,
        actionAmount,
        btc_amount,
        price_snapshot,
        proof,
        memo
      );
      produced.push({
        type: "BTC_BACKED_ISSUE",
        at,
        amount: actionAmount,
        btc_amount,
        price_snapshot,
        proof,
        memo
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.ledger.record({ type: "POLICY_REJECTED", at, action, reason });
      produced.push({ type: "POLICY_REJECTED", at, action, reason });
    }

    return produced;
  }

  burnBtcBacked(
    at: string,
    reserves: ReserveSnapshot,
    amount: USDN,
    price_snapshot: BtcPriceSnapshot,
    memo = "BTC-backed burn"
  ): LedgerEvent[] {
    const produced: LedgerEvent[] = [];
    const btc_amount = btcBackedBurnAmount(amount, price_snapshot);
    const action = {
      kind: "BTC_BACKED_BURN",
      amount,
      btc_amount,
      price_snapshot,
      reason: memo
    } satisfies {
      kind: "BTC_BACKED_BURN";
      amount: USDN;
      btc_amount: number;
      price_snapshot: BtcPriceSnapshot;
      reason: string;
    };

    try {
      assertValidReserveSnapshot(reserves);
      assertValidBtcPriceSnapshot(price_snapshot, at);

      if (!reserves.btc) {
        throw new Error("INVARIANT_FAIL: btc reserve missing for burn");
      }
      if (reserves.btc.amount_btc < btc_amount) {
        throw new Error(
          `INVARIANT_FAIL: btc reserve insufficient (need=${btc_amount}, have=${reserves.btc.amount_btc})`
        );
      }

      this.ledger.burnBtcBacked(
        at,
        amount,
        btc_amount,
        price_snapshot,
        memo
      );
      produced.push({
        type: "BTC_BACKED_BURN",
        at,
        amount,
        btc_amount,
        price_snapshot,
        memo
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.ledger.record({ type: "POLICY_REJECTED", at, action, reason });
      produced.push({ type: "POLICY_REJECTED", at, action, reason });
    }

    return produced;
  }
}
