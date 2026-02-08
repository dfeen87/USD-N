import type { BtcOwnershipProof, BtcPriceSnapshot, LedgerEvent, USDN } from "../types.js";
import { assertNonNegative } from "./invariants.js";
import { hashEvent, HashedEvent } from "./hashchain.js";

export class Ledger {
  private events: HashedEvent[] = [];
  private supply: USDN = 0n;
  private usedBtcProofs = new Set<string>();

  private lastHash(): string {
    return this.events.length === 0
      ? "GENESIS"
      : this.events[this.events.length - 1].hash;
  }

  getSupply(): USDN {
    return this.supply;
  }

  getEvents(): readonly HashedEvent[] {
    return this.events.slice();
  }

  private append(event: LedgerEvent): void {
    const hashed = hashEvent(event, this.lastHash());
    this.events.push(hashed);
  }

  mint(at: string, amount: USDN, memo: string): void {
    assertNonNegative("mint.amount", amount);
    this.supply += amount;
    this.append({ type: "MINT", at, amount, memo });
  }

  burn(at: string, amount: USDN, memo: string): void {
    assertNonNegative("burn.amount", amount);
    if (amount > this.supply) {
      throw new Error("INVARIANT_FAIL: burn exceeds supply");
    }
    this.supply -= amount;
    this.append({ type: "BURN", at, amount, memo });
  }

  issueBtcBacked(
    at: string,
    amount: USDN,
    btc_amount: number,
    price_snapshot: BtcPriceSnapshot,
    proof: BtcOwnershipProof,
    memo: string
  ): void {
    assertNonNegative("btc_issue.amount", amount);
    const key = proofKey(proof);
    if (this.usedBtcProofs.has(key)) {
      throw new Error("INVARIANT_FAIL: btc proof reused");
    }
    this.usedBtcProofs.add(key);
    this.supply += amount;
    this.append({
      type: "BTC_BACKED_ISSUE",
      at,
      amount,
      btc_amount,
      price_snapshot,
      proof,
      memo
    });
  }

  burnBtcBacked(
    at: string,
    amount: USDN,
    btc_amount: number,
    price_snapshot: BtcPriceSnapshot,
    memo: string
  ): void {
    assertNonNegative("btc_burn.amount", amount);
    if (amount > this.supply) {
      throw new Error("INVARIANT_FAIL: btc burn exceeds supply");
    }
    this.supply -= amount;
    this.append({
      type: "BTC_BACKED_BURN",
      at,
      amount,
      btc_amount,
      price_snapshot,
      memo
    });
  }

  record(event: LedgerEvent): void {
    this.append(event);
  }
}

function proofKey(proof: BtcOwnershipProof): string {
  return `${proof.btc_address}|${proof.message}|${proof.signature}`;
}
