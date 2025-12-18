import type { LedgerEvent, USDN } from "../types.js";
import { assertNonNegative } from "./invariants.js";

export class Ledger {
  private events: LedgerEvent[] = [];
  private supply: USDN = 0n;

  getSupply(): USDN {
    return this.supply;
  }

  getEvents(): readonly LedgerEvent[] {
    return this.events;
  }

  mint(at: string, amount: USDN, memo: string): void {
    assertNonNegative("mint.amount", amount);
    this.supply += amount;
    this.events.push({ type: "MINT", at, amount, memo });
  }

  burn(at: string, amount: USDN, memo: string): void {
    assertNonNegative("burn.amount", amount);
    if (amount > this.supply) throw new Error("INVARIANT_FAIL: burn > supply");
    this.supply -= amount;
    this.events.push({ type: "BURN", at, amount, memo });
  }

  record(event: LedgerEvent): void {
    this.events.push(event);
  }
}
