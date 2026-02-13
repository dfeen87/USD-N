import { assertNonNegative } from "./invariants.js";
import { hashEvent } from "./hashchain.js";
export class Ledger {
    events = [];
    supply = 0n;
    usedBtcProofs = new Set();
    lastHash() {
        return this.events.length === 0
            ? "GENESIS"
            : this.events[this.events.length - 1].hash;
    }
    getSupply() {
        return this.supply;
    }
    getEvents() {
        return this.events.slice();
    }
    append(event) {
        const hashed = hashEvent(event, this.lastHash());
        this.events.push(hashed);
    }
    mint(at, amount, memo) {
        assertNonNegative("mint.amount", amount);
        this.supply += amount;
        this.append({ type: "MINT", at, amount, memo });
    }
    burn(at, amount, memo) {
        assertNonNegative("burn.amount", amount);
        if (amount > this.supply) {
            throw new Error("INVARIANT_FAIL: burn exceeds supply");
        }
        this.supply -= amount;
        this.append({ type: "BURN", at, amount, memo });
    }
    issueBtcBacked(at, amount, btc_amount, price_snapshot, proof, memo) {
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
    burnBtcBacked(at, amount, btc_amount, price_snapshot, memo) {
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
    record(event) {
        this.append(event);
    }
}
function proofKey(proof) {
    return `${proof.btc_address}|${proof.message}|${proof.signature}`;
}
