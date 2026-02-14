# USD-N

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)

**A Deterministic, Reserve-Constrained Dollar Tender**

*Governed by the FIDES Protocol*

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Usage Examples](#usage-examples)
  - [Running a Simulation](#running-a-simulation)
  - [Using the Web Interface](#using-the-web-interface)
  - [REST API Usage](#rest-api-usage)
  - [Programmatic Usage](#programmatic-usage)
- [Design Principles](#design-principles)
- [What USD-N Is](#what-usd-n-is)
- [What USD-N Is Not](#what-usd-n-is-not)
- [Reserve & Issuance Model](#reserve--issuance-model)
- [Counter-Cyclical Supply Control](#counter-cyclical-supply-control)
- [The FIDES Protocol](#the-fides-protocol)
- [The Constraint Triangle](#the-constraint-triangle)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Development](#development)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Troubleshooting](#troubleshooting)
- [Status](#status)
- [Philosophy](#philosophy)
- [License](#license)

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

## Quick Start

Get USD-N running in 3 minutes:

```bash
# 1. Clone the repository
git clone https://github.com/dfeen87/USD-N.git
cd USD-N

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Run a simulation
npm run verify

# 5. Start the web interface and API
npm run serve
```

Then open your browser to `http://localhost:3000` to interact with USD-N.

---

## Installation

### Prerequisites

- **Node.js** 20.x or higher ([Download](https://nodejs.org/))
- **npm** 9.x or higher (included with Node.js)
- **TypeScript** 5.6+ (installed automatically)

### Install Dependencies

```bash
npm install
```

### Build the Project

USD-N is written in TypeScript and must be compiled before use:

```bash
npm run build
```

This compiles all TypeScript files in `src/` to JavaScript in `dist/`.

### Verify Installation

Run the test suite to ensure everything is working:

```bash
npm test
```

You should see output confirming all invariant tests pass.

---

## Getting Started

USD-N can be used in several ways depending on your needs:

### 1. Run a Simulation (Command Line)

The fastest way to see USD-N in action is to run a simulation:

```bash
npm run verify
```

This executes a 12-step monetary policy simulation demonstrating:
- Policy-driven issuance based on CPI, GDP, and unemployment
- Reserve coverage enforcement
- Counter-cyclical supply adjustments
- Stress-based issuance multipliers

**Example output:**
```
2024-01-01T00:00:00.000Z MINT $250.00 :: FIDES: Expansion (CPI below target)
2024-01-01T00:00:00.000Z ALIGNMENT coverage=100.00% btc_share=30.00% stress_mult=0.85
...
Final supply: $3,000.00
```

### 2. Use the Web Interface

Start the interactive web interface:

```bash
npm run serve
```

Then navigate to `http://localhost:3000`. The web interface provides:
- Interactive protocol simulation
- Real-time event logging
- Live supply and reserve metrics
- Visual demonstration of deterministic issuance logic

### 3. Use the REST API

The web server also exposes a REST API for programmatic access:

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
    "reserves": {
      "at": "2024-01-01T00:00:00.000Z",
      "total_value_usd": "100000000",
      "by_asset_usd": { "BTC": "100000000" },
      "attestation_id": "example-1"
    },
    "stress": {
      "btc_drawdown_pct": 5,
      "btc_volatility_pct": 3,
      "timestamp": 1704067200000
    }
  }'
```

See [API.md](./API.md) for complete API documentation.

### 4. Programmatic Usage (TypeScript/JavaScript)

Create your own monetary policy scenarios programmatically.

**Note:** The following examples assume you're running from the project root directory after building with `npm run build`.

```typescript
import { Ledger } from './dist/src/engine/ledger.js';
import { FIDES } from './dist/src/engine/fides.js';
import { makeReserveSnapshot } from './dist/src/engine/reserves.js';

// Create a new ledger and FIDES instance
const ledger = new Ledger();
const fides = new FIDES(ledger);

// Define economic telemetry
const telemetry = {
  at: new Date().toISOString(),
  cpi_yoy_bps: 250,     // 2.50% inflation
  gdp_qoq_bps: 200,     // 2.00% GDP growth
  unemployment_bps: 450  // 4.50% unemployment
};

// Create reserve snapshot ($1M USD, 30% in BTC)
const reserves = makeReserveSnapshot(
  telemetry.at,
  100_000_000n,  // $1,000,000 in cents
  30_000_000n    // $300,000 in BTC
);

// Define stress metrics
const stress = {
  btc_drawdown_pct: 5,
  btc_volatility_pct: 3,
  timestamp: Date.now()
};

// Execute policy step
const events = fides.step(telemetry.at, telemetry, reserves, stress);

// Check results
console.log('New supply:', ledger.getSupply().toString(), 'cents');
console.log('Events:', events.length);
```

---

## Usage Examples

### Running a Simulation

USD-N includes a built-in simulation tool that demonstrates how the protocol responds to changing economic conditions:

```bash
npm run verify
```

**What it does:**
- Runs 12 policy steps
- Simulates varying CPI (high → stable → low)
- Demonstrates expansion during low inflation
- Shows contraction during high inflation
- Applies stress multipliers based on BTC volatility

**Sample output:**
```
2024-01-01T00:00:00.000Z POLICY EXPANSION :: CPI below target (1.20% vs 2.00%)
2024-01-01T00:00:00.000Z MINT $500.00 :: FIDES: Expansion (CPI below target)
2024-01-01T00:01:00.000Z ALIGNMENT coverage=100.00% btc_share=30.00% stress_mult=0.65
2024-01-01T00:02:00.000Z POLICY CONTRACTION :: CPI above target (4.20% vs 2.00%)
2024-01-01T00:02:00.000Z BURN $250.00 :: FIDES: Contraction (CPI above target)
...
Final supply: $2,750.00
```

### Using the Web Interface

The web interface provides an interactive way to explore USD-N:

```bash
npm run serve
```

**Features:**
1. **Interactive Controls**: Adjust CPI, GDP, unemployment, and stress metrics
2. **Real-time Visualization**: See supply changes as they happen
3. **Event Log**: View all ledger events with timestamps and hashes
4. **Metrics Dashboard**: Monitor reserve coverage, BTC allocation, stress multipliers

**Try this:**
1. Start the server: `npm run serve`
2. Open `http://localhost:3000`
3. Click "Execute Policy Step"
4. Adjust the CPI slider to see expansion/contraction
5. View the event log to see deterministic policy decisions

### REST API Usage

#### Example 1: Check Node Status

```bash
curl http://localhost:3000/api/status
```

**Response:**
```json
{
  "status": "online",
  "supply": "0",
  "totalEvents": 0,
  "latestEventHash": "GENESIS"
}
```

#### Example 2: Issue BTC-Backed USD-N

```bash
curl -X POST http://localhost:3000/api/fides/btc-issue \
  -H "Content-Type: application/json" \
  -d '{
    "reserves": {
      "at": "2024-01-01T00:00:00.000Z",
      "total_value_usd": "200000000",
      "by_asset_usd": { "BTC": "200000000" },
      "attestation_id": "reserve-proof-1",
      "btc": {
        "asset": "BTC",
        "amount_btc": 20.0,
        "value_usd": "200000000",
        "price_snapshot": {
          "price_usd": 100000,
          "timestamp": 1704067200000,
          "source": "coinbase"
        }
      }
    },
    "btc_amount": 5.0,
    "price_snapshot": {
      "price_usd": 100000,
      "timestamp": 1704067200000,
      "source": "coinbase"
    },
    "proof": {
      "btc_address": "bc1q...",
      "message": "USD-N Reserve Proof",
      "signature": "..."
    },
    "memo": "Initial BTC-backed issuance"
  }'
```

**Response:**
```json
{
  "success": true,
  "newSupply": "50000000",
  "events": [
    {
      "type": "BTC_ISSUE",
      "amount": "50000000",
      "at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Example 3: Execute Policy Step

```bash
curl -X POST http://localhost:3000/api/fides/step \
  -H "Content-Type: application/json" \
  -d '{
    "telemetry": {
      "at": "2024-01-01T00:00:00.000Z",
      "cpi_yoy_bps": 120,
      "gdp_qoq_bps": 200,
      "unemployment_bps": 450
    },
    "reserves": {
      "at": "2024-01-01T00:00:00.000Z",
      "total_value_usd": "100000000",
      "by_asset_usd": { "BTC": "100000000" },
      "attestation_id": "reserve-snapshot-1"
    },
    "stress": {
      "btc_drawdown_pct": 5,
      "btc_volatility_pct": 3,
      "timestamp": 1704067200000
    }
  }'
```

#### Example 4: Get Full Ledger History

```bash
curl http://localhost:3000/api/ledger/events
```

**Response:**
```json
{
  "events": [
    {
      "event": {
        "type": "MINT",
        "amount": "50000000",
        "at": "2024-01-01T00:00:00.000Z",
        "memo": "FIDES: Expansion (CPI below target)"
      },
      "hash": "a1b2c3d4...",
      "prevHash": "GENESIS"
    }
  ],
  "count": 1
}
```

### Programmatic Usage

#### Example 1: Create a Custom Simulation

```typescript
import { Ledger } from './dist/src/engine/ledger.js';
import { FIDES } from './dist/src/engine/fides.js';
import { makeReserveSnapshot } from './dist/src/engine/reserves.js';

const ledger = new Ledger();
const fides = new FIDES(ledger);

// Simulate 6 months of economic data
for (let month = 0; month < 6; month++) {
  const at = new Date(2024, month, 1).toISOString();
  
  const telemetry = {
    at,
    cpi_yoy_bps: 250 - (month * 20),  // Inflation declining
    gdp_qoq_bps: 200 + (month * 10),  // Growth improving
    unemployment_bps: 500 - (month * 50) // Unemployment falling
  };
  
  const reserves = makeReserveSnapshot(at, 1_000_000_00n, 300_000_00n);
  const stress = {
    btc_drawdown_pct: 10 - month,
    btc_volatility_pct: 8 - month,
    timestamp: Date.parse(at)
  };
  
  const events = fides.step(at, telemetry, reserves, stress);
  
  console.log(`Month ${month + 1}:`);
  console.log(`  CPI: ${telemetry.cpi_yoy_bps / 100}%`);
  console.log(`  Supply: $${Number(ledger.getSupply()) / 100}`);
  console.log(`  Events: ${events.length}`);
}
```

#### Example 2: Verify Reserve Coverage

```typescript
import { Ledger } from './dist/src/engine/ledger.js';
import { makeReserveSnapshot } from './dist/src/engine/reserves.js';
import { buildAlignmentReport } from './dist/src/engine/alignment.js';

const ledger = new Ledger();
const at = new Date().toISOString();
const reserves = makeReserveSnapshot(at, 1_000_000_00n, 300_000_00n);

const report = buildAlignmentReport(
  ledger.getSupply(),
  reserves,
  {
    btc_drawdown_pct: 5,
    btc_volatility_pct: 3,
    timestamp: Date.now()
  }
);

console.log('Reserve Coverage:', report.reserve_coverage_bps / 100, '%');
console.log('BTC Reserve Share:', report.btc_reserve_share_bps / 100, '%');
console.log('Stress Multiplier:', report.stress_multiplier_bps / 100, '%');
```

#### Example 3: Build a Custom API Client

```javascript
// examples/custom-client.js
class USDNClient {
  constructor(baseUrl = 'http://localhost:3000/api') {
    this.baseUrl = baseUrl;
  }
  
  async getStatus() {
    const res = await fetch(`${this.baseUrl}/status`);
    return res.json();
  }
  
  async getSupply() {
    const res = await fetch(`${this.baseUrl}/ledger/supply`);
    return res.json();
  }
  
  async executeStep(telemetry, reserves, stress) {
    const res = await fetch(`${this.baseUrl}/fides/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telemetry, reserves, stress })
    });
    return res.json();
  }
}

// Usage
const client = new USDNClient();
const status = await client.getStatus();
console.log('Node status:', status);
```

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

### Code Example: Reserve Snapshot

```typescript
import { makeReserveSnapshot } from './dist/src/engine/reserves.js';

// Create a reserve snapshot: $1M total, $300K in BTC
const reserves = makeReserveSnapshot(
  new Date().toISOString(),
  100_000_000n,  // $1,000,000 in cents
  30_000_000n    // $300,000 in BTC (30% allocation)
);

console.log('Total reserves:', reserves.total_value_usd.toString(), 'cents');
console.log('BTC allocation:', reserves.by_asset_usd.BTC.toString(), 'cents');
```

### Code Example: BTC-Backed Issuance

```bash
curl -X POST http://localhost:3000/api/fides/btc-issue \
  -H "Content-Type: application/json" \
  -d '{
    "reserves": {
      "at": "2024-01-01T00:00:00.000Z",
      "total_value_usd": "100000000",
      "by_asset_usd": { "BTC": "100000000" },
      "attestation_id": "proof-1",
      "btc": {
        "asset": "BTC",
        "amount_btc": 10.0,
        "value_usd": "100000000",
        "price_snapshot": {
          "price_usd": 100000,
          "timestamp": 1704067200000,
          "source": "exchange"
        }
      }
    },
    "btc_amount": 2.5,
    "price_snapshot": {
      "price_usd": 100000,
      "timestamp": 1704067200000,
      "source": "exchange"
    },
    "proof": {
      "btc_address": "bc1q...",
      "message": "Reserve proof",
      "signature": "..."
    },
    "memo": "BTC-backed USD-N issuance"
  }'
```

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

### Code Example: Stress-Based Tightening

```typescript
// High stress scenario
const highStress = {
  btc_drawdown_pct: 35,   // 35% drawdown
  btc_volatility_pct: 18,  // 18% volatility
  timestamp: Date.now()
};

// Low stress scenario
const lowStress = {
  btc_drawdown_pct: 4,     // 4% drawdown
  btc_volatility_pct: 6,   // 6% volatility
  timestamp: Date.now()
};

// Execute steps with different stress levels
const highStressEvents = fides.step(at, telemetry, reserves, highStress);
const lowStressEvents = fides.step(at, telemetry, reserves, lowStress);

// High stress results in tighter issuance (lower amounts)
// Low stress allows normal issuance
```

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

### Code Example: FIDES Step Execution

```typescript
import { FIDES } from './dist/src/engine/fides.js';
import { Ledger } from './dist/src/engine/ledger.js';

const ledger = new Ledger();
const fides = new FIDES(ledger);

// Execute a FIDES policy step
const events = fides.step(
  '2024-01-01T00:00:00.000Z',
  {
    at: '2024-01-01T00:00:00.000Z',
    cpi_yoy_bps: 120,    // 1.20% inflation (below 2% target)
    gdp_qoq_bps: 200,    // 2.00% GDP growth
    unemployment_bps: 450 // 4.50% unemployment
  },
  reserves,
  stress
);

// Check what actions were taken
events.forEach(event => {
  if (event.type === 'POLICY_ACTION') {
    console.log(`Action: ${event.action.kind}`);
    console.log(`Reason: ${event.action.reason}`);
  } else if (event.type === 'MINT') {
    console.log(`Minted: $${Number(event.amount) / 100}`);
  } else if (event.type === 'BURN') {
    console.log(`Burned: $${Number(event.amount) / 100}`);
  }
});
```

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

## API Reference

USD-N exposes two APIs:

1. **Development API** (`server.js`) - Simple API for local development and testing
2. **Production API** (`main.ts`) - Production-ready API with authentication, rate limiting, and more

### Development API

Start the development server:

```bash
npm run serve
```

**Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Get node status and current state |
| GET | `/api/ledger/supply` | Get current USD-N supply |
| GET | `/api/ledger/events` | Get all ledger events (hash-chained) |
| POST | `/api/ledger/reset` | Reset ledger (for testing) |
| POST | `/api/fides/step` | Execute a policy step with telemetry |
| POST | `/api/fides/btc-issue` | Issue BTC-backed USD-N |
| POST | `/api/fides/btc-burn` | Burn BTC-backed USD-N |

### Production API

Start the production server:

```bash
npm run serve:prod
```

**Additional Features:**
- ✅ JWT authentication (optional)
- ✅ Rate limiting (100 req/min per IP)
- ✅ CORS enabled
- ✅ Health checks
- ✅ OpenAPI compatible
- ✅ Docker optimized

**Additional Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Basic health check |
| GET | `/api/ledger/state` | Full ledger state snapshot |
| GET | `/api/ledger/transactions` | Paginated transaction history |
| POST | `/api/ledger/mint` | Mint USD-N (bounded: max $1M) |
| POST | `/api/ledger/burn` | Burn USD-N (bounded: max $1M) |
| POST | `/api/ledger/transfer` | Transfer USD-N (max $100K) |
| GET | `/api/fides/score` | Compute FIDES trust score |
| GET | `/api/btc/backing` | BTC backing ratio and reserve model |

**Complete API documentation:** [API.md](./API.md) and [API_PRODUCTION.md](./API_PRODUCTION.md)

---

## Deployment

### Local Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run development server
npm run serve
```

Access at `http://localhost:3000`

### Docker Deployment

Build and run with Docker:

```bash
# Build the image
docker build -t usd-n-api .

# Run the container
docker run -p 8080:8080 \
  -e USDN_ENV=production \
  -e USDN_LOG_LEVEL=info \
  usd-n-api
```

Access the API at `http://localhost:8080/api/health`

### Railway Deployment

Deploy to Railway's free tier:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize and deploy
railway init
railway up

# Set environment variables
railway variables set USDN_ENV=production
railway variables set USDN_LOG_LEVEL=info
railway variables set USDN_NODE_ID=railway-node-1
```

Your API will be automatically deployed and accessible via Railway's provided URL.

**Environment Variables:**

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `USDN_ENV` | Environment mode (`production`, `development`, `test`) | `development` | No |
| `USDN_JWT_SECRET` | JWT secret for authentication (leave empty to disable) | `` | No |
| `USDN_LOG_LEVEL` | Logging level (`debug`, `info`, `warn`, `error`) | `info` | No |
| `USDN_NODE_ID` | Unique node identifier | Auto-generated | No |
| `PORT` | Server port | `8080` | No |

See `.env.example` for a complete template.

**Deployment guides:**
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment instructions
- [Dockerfile](./Dockerfile) - Docker configuration

---

## Development

### Project Structure

```
USD-N/
├── src/
│   ├── engine/         # Core protocol engine
│   │   ├── ledger.ts   # Ledger and event log
│   │   ├── fides.ts    # FIDES policy engine
│   │   ├── reserves.ts # Reserve management
│   │   └── *.test.ts   # Unit tests
│   ├── cli/            # Command-line tools
│   ├── types.ts        # TypeScript type definitions
│   └── index.ts        # Main entry point
├── api/                # API utilities
├── examples/           # Example code
├── public/             # Web interface assets
├── server.js           # Development API server
├── main.ts             # Production API server
└── docs/               # Documentation
```

### Building

Compile TypeScript to JavaScript:

```bash
npm run build
```

Output is written to `dist/`.

### Testing

Run the test suite:

```bash
npm test
```

This runs:
- Invariant tests
- Economic behavior tests
- Replay verification tests
- CI validation tests

### Development Mode

Watch for changes and rebuild automatically:

```bash
npm run dev
```

### Linting

USD-N uses TypeScript's built-in type checking:

```bash
npx tsc --noEmit
```

### Running Examples

Execute the provided examples:

```bash
# Run the API example
npm run serve
node examples/api_example.js

# Run a production API test
node examples/production_api_test.js
```

### Creating Custom Scenarios

Create a new file in the project:

**Note:** Run this from the project root after building with `npm run build`.

```typescript
// my-scenario.ts
import { Ledger } from './dist/src/engine/ledger.js';
import { FIDES } from './dist/src/engine/fides.js';
import { makeReserveSnapshot } from './dist/src/engine/reserves.js';

const ledger = new Ledger();
const fides = new FIDES(ledger);

// Your custom scenario here
const telemetry = { /* ... */ };
const reserves = makeReserveSnapshot(/* ... */);
const stress = { /* ... */ };

const events = fides.step(new Date().toISOString(), telemetry, reserves, stress);
console.log('Events:', events);
```

Compile and run:

```bash
npx tsc my-scenario.ts
node my-scenario.js
```

---

## Architecture

### Core Components

**Ledger** (`src/engine/ledger.ts`)
- Maintains append-only event log
- Tracks current supply
- Enforces non-negative supply invariant
- Provides hash-chained event history

**FIDES** (`src/engine/fides.ts`)
- Deterministic policy engine
- Evaluates macroeconomic telemetry
- Makes issuance/burn decisions
- Enforces reserve constraints
- Applies stress-based multipliers

**Reserve Management** (`src/engine/reserves.ts`)
- Creates reserve snapshots
- Validates BTC backing
- Computes coverage ratios

**Alignment Reporting** (`src/engine/alignment.ts`)
- Computes reserve coverage
- Calculates BTC reserve share
- Determines stress multipliers

### Data Flow

```
Economic Telemetry (CPI, GDP, Unemployment)
            ↓
        FIDES Policy Engine
            ↓
   Policy Decision (MINT/BURN/HOLD)
            ↓
    Reserve Constraint Check
            ↓
   Stress Multiplier Application
            ↓
      Ledger Event Recording
            ↓
    Hash-Chained Event Log
```

### Determinism

USD-N is deterministic:
- Same inputs → same outputs
- No randomness
- No discretionary decisions
- Fully replayable

**Verification:**

```bash
npm run verify
```

This runs a 12-step simulation and verifies:
1. All invariants hold
2. Events are properly hash-chained
3. Supply is correctly calculated
4. Reserve constraints are enforced

---

## Documentation

USD-N includes comprehensive documentation:

| Document | Description |
|----------|-------------|
| [README.md](./README.md) | This file - getting started and overview |
| [SPEC.md](./SPEC.md) | Formal protocol specification |
| [API.md](./API.md) | Development API reference |
| [API_PRODUCTION.md](./API_PRODUCTION.md) | Production API reference |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment guide |
| [WHITEPAPER.md](./WHITEPAPER.md) | Theoretical foundation and design rationale |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | Implementation details |
| [THREAT_MODEL.md](./THREAT_MODEL.md) | Security analysis |
| [FUTUREWORK.md](./FUTUREWORK.md) | Planned features and improvements |
| [NON_GOALS.md](./NON_GOALS.md) | Explicitly out-of-scope items |
| [CHANGELOG.md](./CHANGELOG.md) | Version history |

### Additional Resources

- [OpenAPI Specification](./openapi.yaml) - Machine-readable API spec
- [Citation](./CITATION.cff) - Academic citation format
- [Examples](./examples/) - Working code examples

---

## Troubleshooting

### Build Issues

**Problem:** TypeScript compilation fails
```bash
npm run build
# Error: Cannot find module...
```

**Solution:** Ensure you're using Node.js 20+ and TypeScript 5.6+:
```bash
node --version  # Should be v20.x or higher
npm install     # Reinstall dependencies
npm run build
```

---

**Problem:** Module not found errors at runtime
```bash
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../dist/...'
```

**Solution:** Make sure you've built the project first:
```bash
npm run build
```

### API Issues

**Problem:** Server won't start / port already in use
```bash
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:** Either kill the existing process or use a different port:
```bash
# Kill existing process
pkill -f "node server.js"

# Or use a different port
PORT=3001 npm run serve
```

---

**Problem:** API returns 500 errors
```bash
{"error": "Internal server error"}
```

**Solution:** Check the server logs for details. Common issues:
- Missing required fields in request body
- Invalid data types (e.g., strings instead of numbers)
- BTC reserves specified without BTC details

### Simulation Issues

**Problem:** Simulation shows only rejections
```
POLICY_REJECTED ISSUE :: POLICY_REJECT: stress-adjusted issue below minimum
```

**Solution:** This is expected behavior when:
- Supply is 0 and CPI triggers expansion, but stress multiplier makes the issuance too small
- CPI is high and triggers contraction, but supply is already 0
- This demonstrates the protocol's conservative approach under stress

### Common Questions

**Q: Why does the simulation result in $0 supply?**

A: The simulation uses conservative stress parameters that may reject small issuances. This demonstrates the protocol's safety features. Try running with different parameters or check the detailed event log.

**Q: How do I reset the ledger when using the API?**

A: Use the reset endpoint:
```bash
curl -X POST http://localhost:3000/api/ledger/reset
```

**Q: Can I use this in production?**

A: USD-N is experimental and designed for research, audit, and demonstration. See [Status](#status) section for details.

**Q: Where can I find more examples?**

A: Check the [examples/](./examples/) directory for working code samples, including:
- `api_example.js` - Full API workflow
- `valid_history.jsonl` - Sample event log
- `production_api_test.js` - Production API examples

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
