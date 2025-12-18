import type { LedgerEvent, USDN } from "../types.js";
import { assertNonNegative } from "./invariants.js";
import { hashEvent, HashedEvent } from "./hashchain.js";

export class Ledger {
  private events: HashedEvent[] = [];
  private supply: USDN = 0n;

  private lastHash(): string {
    return this.events.length === 0
      ? "GENESIS"
      : this.events[this.events.length - 1].hash;
  }

  getSupply(): USDN {
    return this.supply;
  }

  getEvents(): readonly HashedEvent[] {
    return this.events;
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

  record(event: LedgerEvent): void {
    this.append(event);
  }
}
