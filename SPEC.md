# USD-N Specification

**Version:** Draft v0.1  
**Status:** Canonical Protocol Implementation

---

## Scope

This document defines the **core protocol rules, invariants, and execution semantics**
for **USD-N (The New U.S. Dollar)**.

USD-N is a digitally native dollar system designed to operate at **permanent 1:1 parity**
with the United States Dollar through deterministic, rule-based issuance and burn logic.

This specification governs **protocol behavior only**.  
Legal tender status, regulatory designation, and institutional deployment are explicitly
out of scope.

---

## Monetary Model

- All values are denominated in **integer cents**
- Fractional units are not permitted
- USD-N supply changes occur **only** through protocol-defined actions
- All supply-affecting actions are **explicit, auditable, and irreversible**

---

## Core Invariants

The following invariants **MUST always hold**:

1. **Parity Invariant**  
   USD-N maintains a strict 1:1 parity with USD at the unit-of-account level.

2. **Non-Negative Supply**  
   Total USD-N supply MUST NOT be negative at any time.

3. **Reserve Coverage**  
   Issued USD-N MUST be fully covered by verifiable reserve value at or above the
   configured minimum coverage threshold.

4. **Deterministic Policy Execution**  
   Given identical inputs (telemetry, reserves, configuration), the protocol MUST
   produce identical outputs.

5. **Bounded Actions**  
   Issuance and burn operations MUST respect predefined step limits to prevent
   discontinuous or destabilizing supply changes.

6. **Auditability**  
   Every protocol action affecting supply or reserves MUST be recorded as an immutable,
   ordered event.

---

## Policy Execution (FIDES)

USD-N monetary actions are governed by the **FIDES Protocol**
(*Fiscal Integrity via Digital Economic Sovereignty*).

FIDES operates as a deterministic policy engine that:

- Evaluates macroeconomic telemetry
- Selects issuance, burn, or hold actions
- Enforces reserve constraints prior to execution
- Executes actions without discretionary override

FIDES replaces committee-based discretion with **rule-based execution**.

---

## Event Model

USD-N operates on an append-only event log.

Each event:

- Is timestamped
- Is ordered
- Is immutable once recorded
- May be independently replayed to reconstruct total system state

Future protocol versions MAY cryptographically commit each event to the previous event
to form a hash-chained audit trail.

---

## Reserve Attestation

Reserve state is represented through explicit reserve snapshot events.

Each snapshot:

- Declares total reserve value
- Enumerates reserve composition
- Includes an external attestation reference

The protocol enforces reserve coverage as a **precondition** to issuance.

---

## Determinism & Reproducibility

USD-N is designed such that:

- Independent implementations can replay the event log
- Supply state can be reconstructed without trust
- Divergent behavior constitutes a protocol violation

---

## Non-Goals

The following are explicitly **not goals** of this specification:

- Speculative pricing
- Market prediction
- Discretionary monetary intervention
- Surveillance or behavioral enforcement
- Replacement of decentralized store-of-value systems

---

## Status

This specification defines a **real, executable monetary protocol**.

- Non-legal-tender by design
- Open specification
- Intended for audit, verification, and eventual institutional adoption

---

## License

MIT License  
Open by default. Forkable by design.
