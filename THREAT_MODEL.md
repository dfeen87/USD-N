# USD-N Threat Model

**Status:** Production-grade threat framing (calm, bounded, explicit)  
**Scope:** USD-N Core protocol + hash-chained event log + reserve coverage enforcement  
**Out of scope:** Legal tender status, custody, redemption operations, market pricing, user wallets

---

## Security Goals

USD-N Core is designed to guarantee:

1. **Tamper-evident history**  
   The event log is append-only and hash-chained. Any modification is detectable.

2. **Deterministic replayability**  
   Independent parties can replay the event log and reconstruct state exactly.

3. **Supply discipline**  
   Supply changes occur only via protocol-defined actions and bounded steps.

4. **Reserve coverage enforcement**  
   Issuance is prevented when reserve coverage constraints would be violated.

5. **Audit-first transparency**  
   All supply-affecting actions and reserve snapshots are recorded as immutable events.

---

## Non-Goals

USD-N Core explicitly does **not** attempt to provide:

- Custody or safekeeping of assets
- Legal validation of reserve ownership claims
- Price discovery, market prediction, or valuation guarantees
- End-user privacy tooling (wallet-layer concern)
- Censorship resistance at the network layer (deployment concern)
- Protection against an attacker who controls all attestors and all telemetry sources simultaneously

---

## Trust Boundaries

USD-N is intentionally minimal and draws hard boundaries:

- **Protocol Core (trusted for correctness)**  
  Deterministic logic, invariants, bounded actions, event log rules.

- **Inputs (not trusted by default)**  
  Macro telemetry and reserve attestations are *external* inputs. The protocol treats them as data, not truth.

- **Attestors / Oracles (explicitly external)**  
  The protocol does not custody assets or adjudicate legal claims; it only enforces coverage based on attestations.

---

## Adversary Model

USD-N considers the following adversaries:

- **A1: Log editor**  
  Attempts to alter past events to hide issuance/burn actions or reserve changes.

- **A2: Oracle/attestor manipulator**  
  Attempts to inflate reserve attestations or distort macro telemetry to induce issuance.

- **A3: Policy gamer**  
  Attempts to exploit policy thresholds to trigger repeated issuance/burn patterns.

- **A4: Operator error / integration bugs**  
  Benign failures that still produce dangerous outcomes (misconfiguration, malformed logs, partial writes).

- **A5: Insider threat**  
  Authorized actors attempting to abuse permissions in surrounding infrastructure (outside the core).

---

## Primary Threats and Mitigations

### T1 — Event log tampering (history rewrite)
**Threat:** An attacker edits historical events to conceal or alter monetary actions.  
**Mitigation:** Hash-chained event log makes tampering detectable by replay and hash verification.  
**Residual risk:** If operators distribute only a forged “new canonical log” and no one compares copies, social trust can be attacked (distribution problem, not protocol problem).

### T2 — Fake reserve attestations (over-issuance)
**Threat:** An attacker submits inflated reserve snapshots to permit issuance.  
**Mitigation:** Protocol enforces *coverage* as a precondition, but cannot prove attestation truth.  
**Operational requirement:** Use multiple independent attestors; publish attestations; require signature verification and cross-attestation at deployment layer.  
**Residual risk:** Collusion among all attestors remains possible (explicitly out of scope for core).

### T3 — Telemetry manipulation (policy steering)
**Threat:** CPI/GDP/unemployment inputs are distorted to trigger issuance/burn.  
**Mitigation:** Determinism ensures behavior is inspectable; governance must harden telemetry sourcing with redundancy and dispute windows (deployment layer).  
**Residual risk:** If telemetry sources are captured, policy can be steered—visible, but not preventable by core alone.

### T4 — Invariant bypass via implementation bugs
**Threat:** A bug allows negative supply, unbounded issuance, or incorrect reserve math.  
**Mitigation:** Strict invariants; bounded step limits; replay verifier (next file) will mechanically detect violations.  
**Residual risk:** Bugs can still exist; minimized by small surface area, tests, and independent implementations.

### T5 — Configuration drift / unsafe parameter changes
**Threat:** Step limits or coverage thresholds are loosened over time.  
**Mitigation:** Version all configs; require explicit config events (recommended); treat config as consensus-critical.  
**Residual risk:** Social/governance capture can still change parameters (visible, auditable).

### T6 — Log truncation / partial writes
**Threat:** System crashes leaving incomplete history or ambiguous final state.  
**Mitigation:** Append-only log format with atomic writes (JSONL + fsync recommended); replay verifier rejects malformed tails.  
**Residual risk:** Operator error; mitigated by tooling and strict formats.

---

## Recommended Operational Controls (Non-Core)

These are not protocol requirements, but strongly recommended for real deployments:

- Multi-attestor reserve proofs with threshold acceptance (e.g., 2-of-3)
- Signed attestations + signature verification
- Public publication of logs (mirrors) + periodic checkpoints
- Deterministic builds and reproducible release artifacts
- Independent “watchers” running replay verification continuously

---

## Summary

USD-N Core is designed to be:

- **small**
- **deterministic**
- **tamper-evident**
- **auditable**

It does not attempt to solve everything.  
It solves the protocol problem: defining and enforcing monetary behavior that can be independently verified.
