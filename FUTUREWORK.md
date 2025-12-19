# Future Work (Non-Binding)

This document records exploratory ideas discussed after the release of
**USD-N Core v1.0.0**. Inclusion here does **not** imply commitment,
timeline, prioritization, or adoption into the core protocol.

The USD-N Core protocol is intentionally defined, bounded, and frozen.
All items listed below are **explicitly out of scope** for the current
core definition and would require separate specification, review, and
justification before any consideration.

This document exists to preserve context, not to establish direction.

---

## Principles Governing Future Work

Any future work related to USD-N should adhere to the following principles:

- **Protocol immutability first**  
  Changes to core monetary rules must be exceptional, justified, and explicit.

- **Layer separation**  
  Governance, custody, telemetry, and deployment concerns must remain outside
  the core monetary protocol.

- **Verification over discretion**  
  Any extension should preserve independent verifiability as a first principle.

- **Optionality preserved**  
  No future path should be assumed or implied by the existence of this document.

---

## Potential Areas of Exploration

The following topics are recorded as areas of possible future investigation.
They are not proposals, requirements, or roadmap items.

### Reserve Attestation Mechanisms
- Multi-oracle reserve attestation models
- Quorum-based validation (e.g., threshold schemes)
- Failure and adversarial oracle analysis

### Formal Verification
- Formal specification of USD-N invariants
- Model checking and proof frameworks (e.g., TLA+ or equivalent)
- Alignment between formal models and reference implementation

### Observability and Telemetry
- External economic telemetry (e.g., velocity measures, macro indicators)
- Non-authoritative analytics layered above the core protocol
- Separation between monetary rules and observational tooling

### Data Representation and Migration
- Alternative reserve snapshot formats
- Backward-compatible migration strategies
- Historical replay guarantees under format evolution

### External Governance Interfaces
- Policy or governance mechanisms layered above the protocol
- Explicit constraints on governance authority
- Clear separation between governance inputs and monetary rule enforcement

---

## Non-Goals

The following are **explicitly not goals** of future work within this repository:

- Introducing custody, wallets, or user-facing systems
- Defining legal tender status or regulatory posture
- Establishing deployment models or operational operators
- Optimizing for market adoption or integration
- Collapsing protocol rules with policy discretion

---

## Closing Note

USD-N Core is designed to remain small, legible, and verifiable.
Future work should strengthen these qualities or remain external to the core.

The existence of ideas does not obligate their implementation.
