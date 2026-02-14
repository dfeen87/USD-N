# USD-N

**A Deterministic, Reserve-Constrained Dollar Tender**

*Governed by the FIDES Protocol*

---

## Overview

**USD-N** is a **digitally native monetary system** that defines, enforces, and audits
U.S. dollar–denominated **tender** under explicit, rule-based constraints.

USD-N is **not a retail currency**, not a discretionary monetary authority, and not a custodial system.
It defines a **programmable dollar rail** whose issuance, redemption, and contraction are
**derivable from verifiable reserves and deterministic policy rules**, rather than human judgment.

USD-N is governed by the **FIDES Protocol**, an invariant-driven fiscal engine that enforces
monetary discipline, replayable auditability, and counter-cyclical behavior through code.

Protocol definition and core implementation only.
Custody, deployment, distribution, and user interfaces are explicitly out of scope.

---

## Design Principles

USD-N is built on a small set of non-negotiable principles:

* **Determinism First**
  Monetary outcomes are derived from explicit inputs and replay identically across time.

* **Constraint Over Discretion**
  Supply is limited by reserves and policy invariants, not committees or ad-hoc decisions.

* **Auditability by Construction**
  Every state transition is ledgered, hash-stable, and independently replayable.

* **Counter-Cyclical Discipline**
  Issuance tightens automatically during stress and relaxes only under defined conditions.

* **Interoperability Without Custody**
  External assets and signals may constrain supply without introducing trusted intermediaries.

---

## What USD-N Is

* A **deterministic U.S. dollar tender**
* **Reserve-constrained** rather than trust-based
* **Replay-verifiable** down to individual issuance decisions
* **Counter-cyclical by design**
* **Ledger-driven**, not account-driven
* **Governed by code**, not discretion

---

## What USD-N Is Not

* ❌ Not a speculative cryptocurrency
* ❌ Not a privately issued stablecoin
* ❌ Not a CBDC or surveillance system
* ❌ Not a bank, custodian, or payment app
* ❌ Not a discretionary monetary authority

USD-N defines **monetary validity rules and invariants**, not financial products or custodial services.

---

## Reserve & Issuance Model

USD-N supply is constrained by **explicit reserve snapshots** and **policy invariants**.

As of v2.0.0, the reference implementation supports:

* **BTC-denominated reserve accounting**
* **BTC/USD price snapshots** for deterministic valuation
* **Minimal, non-custodial BTC ownership proofs**
* **Explicit BTC-backed issuance and burn events**
* **Hard rejection of issuance when reserve coverage fails**

No issuance occurs without:

1. A validated reserve snapshot
2. A validated price snapshot
3. Invariant enforcement
4. A ledgered policy action

All failures emit explicit `POLICY_REJECTED` events.

---

## The Constraint Triangle

USD-N is not a competing currency.
It is a **validity layer** that sits between sovereign money and non-sovereign reality.

The system forms a **constraint triangle**:

```
                ┌──────────────┐
                │   Bitcoin    │
                │   (BTC)      │
                │              │
                │  External,   │
                │  Non-Sovereign
                │  Constraint  │
                └──────▲───────┘
                       │
        Price, Stress, │  Observable Reality
        Scarcity       │
                       │
┌──────────────┐       │       ┌──────────────┐
│              │───────┼──────▶│              │
│     USD      │       │       │    USD-N     │
│              │◀──────┼───────│              │
│  Unit of     │  Validity &   │  Deterministic
│  Account     │  Discipline   │  Validity Layer
│              │               │              │
└──────────────┘               └──────────────┘
```

### Roles in the Triangle

* **USD (U.S. Dollar)**
  The unit of account and settlement medium used by the real economy.

* **Bitcoin (BTC)**
  An external, non-sovereign reference that provides observable scarcity, price signals,
  and stress indicators that cannot be manipulated by USD-N or USD issuance logic.

* **USD-N**
  A deterministic validity layer that:

  * derives issuance constraints from BTC-denominated reserves and stress telemetry
  * enforces invariant-based discipline on USD-denominated supply
  * records a fully replayable, hash-chained monetary history

### What This Is *Not*

* This is **not** a peg.
* This is **not** convertibility.
* This is **not** competition between USD and BTC.

USD-N does not force either side to change behavior.
It simply makes **invalid issuance observable and rejectable**.

### Why the Triangle Is Stable

* USD retains its role as the unit of account.
* Bitcoin remains independent and non-sovereign.
* USD-N enforces discipline without discretion or custody.

When issuance is disciplined, USD-N is quiet.
When it is not, USD-N shows **exactly why**.

---

## Counter-Cyclical Supply Control

USD-N incorporates **deterministic stress telemetry** to encode real-world monetary tightening.

The protocol supports:

* Explicit **stress snapshots** (e.g. drawdown and volatility inputs)
* A **monotonic issuance multiplier** bounded in `(0, 1]`
* Automatic **issuance tightening under stress**
* Unrestricted burns and redemptions

This ensures USD-N becomes **scarcer during market stress**, mirroring strong-dollar behavior
without discretionary intervention.

---

## The FIDES Protocol

**FIDES**
(*Fiscal Integrity via Deterministic Economic Systems*)

FIDES is the policy engine that governs USD-N.

It enforces:

* Reserve-constrained issuance
* Deterministic mint and burn semantics
* Counter-cyclical supply modulation
* Explicit rejection on invariant violation
* Full replay and audit of economic validity

FIDES does not *decide* outcomes — it **derives** them.

---

## Relationship to External Systems

USD-N is designed to **interoperate without dependence**.

* External assets may **constrain** issuance
* External signals may **inform** policy inputs
* No external system is trusted for correctness

USD-N remains internally consistent even if all external inputs are removed.

---

## Web Interface

USD-N is now accessible via a web interface for interactive demonstration.

To run the web interface:

```bash
npm run serve
```

Then open your browser to `http://localhost:3000`

The web interface provides:

* Interactive protocol simulation
* Real-time event logging
* Live supply and reserve metrics
* Visual demonstration of deterministic issuance logic

---

## REST API

USD-N now includes a REST API for programmatic access to the protocol.

### Starting the API Server

```bash
npm run serve
```

The server runs on `http://localhost:3000` and provides both the web interface and REST API.

### Global Node Access

The server maintains a single global USD-N node instance with shared ledger state. This allows multiple API clients to interact with the same protocol instance, demonstrating global node access patterns.

### API Endpoints

**Node Status:**
- `GET /api/status` - Get node status and current state

**Ledger Operations:**
- `GET /api/ledger/supply` - Get current USD-N supply
- `GET /api/ledger/events` - Get all ledger events (hash-chained)
- `POST /api/ledger/reset` - Reset ledger (for testing)

**FIDES Protocol:**
- `POST /api/fides/step` - Execute a policy step with telemetry
- `POST /api/fides/btc-issue` - Issue BTC-backed USD-N
- `POST /api/fides/btc-burn` - Burn BTC-backed USD-N

### Quick Example

```bash
# Check node status
curl http://localhost:3000/api/status

# Get current supply
curl http://localhost:3000/api/ledger/supply

# Execute a policy step
curl -X POST http://localhost:3000/api/fides/step \
  -H "Content-Type: application/json" \
  -d '{
    "telemetry": {
      "at": "2024-01-01T00:00:00.000Z",
      "cpi_yoy_bps": 250,
      "gdp_qoq_bps": 200,
      "unemployment_bps": 450
    },
    "reserves": { ... },
    "stress": { ... }
  }'
```

For complete API documentation and examples, see [API.md](./API.md).

For a working example script, see [examples/api_example.js](./examples/api_example.js).

---

## Status

This repository defines the **core specification and canonical implementation** for USD-N.

* Experimental
* Dollar-denominated tender definition
* Open specification
* Designed for audit, simulation, and research
* Intended for institutional-grade review
* **Now accessible via web interface and REST API**

---

## Continuous Integration

USD-N’s CI validates **buildability**, **core invariants**, and **deterministic replay** on every
commit. It does **not** test economic outcomes, market behavior, or performance; those remain
explicitly out of scope. The goal is to protect mechanical correctness and governance safety
through reproducible checks.

---

## Philosophy

> Monetary trust should not be requested.
> It should be provable.

USD-N exists to demonstrate that monetary systems can be:

* Auditable without surveillance
* Disciplined without discretion
* Programmable without opacity
* Strong without coercion

---

## License

**MIT License**
Open by default. Forkable by design.
