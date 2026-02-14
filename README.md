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

## Deploying USD-N as a Public REST API

USD-N can be deployed as a production-ready REST API service on platforms like Railway, Heroku, or any Docker-compatible host.

### Production API Features

The production API (`main.ts`) includes:

* ✅ **Production-grade endpoints** - Health checks, ledger operations, FIDES scoring, BTC backing analysis
* ✅ **Deterministic operations** - All monetary operations are safe, bounded, and reproducible
* ✅ **Rate limiting** - 100 requests/minute per IP address
* ✅ **Optional JWT authentication** - Disabled by default, enable via environment variable
* ✅ **CORS enabled** - Cross-origin requests supported
* ✅ **Environment configuration** - Full control via environment variables
* ✅ **OpenAPI compatible** - JSON-only responses with clear error messages
* ✅ **Docker optimized** - Multi-stage builds, non-root user, health checks

### Local Development

Run the production server locally:

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start production server
npm run serve:prod
```

The server will start on port 8080 (or PORT environment variable).

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

### Railway Deployment (Free Tier)

Deploy to Railway with one command:

#### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

#### 2. Login to Railway

```bash
railway login
```

#### 3. Initialize and Deploy

```bash
# Create new project
railway init

# Deploy
railway up
```

#### 4. Set Environment Variables

```bash
railway variables set USDN_ENV=production
railway variables set USDN_LOG_LEVEL=info
railway variables set USDN_NODE_ID=railway-node-1

# Optional: Enable JWT authentication
railway variables set USDN_JWT_SECRET=$(openssl rand -base64 32)
```

#### 5. View Logs

```bash
railway logs
```

Your API will be automatically deployed and accessible via Railway's provided URL.

### Environment Variables

Configure your deployment using these environment variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `USDN_ENV` | Environment mode (`production`, `development`, `test`) | `development` | No |
| `USDN_JWT_SECRET` | JWT secret for authentication (leave empty to disable) | `` | No |
| `USDN_LOG_LEVEL` | Logging level (`debug`, `info`, `warn`, `error`) | `info` | No |
| `USDN_NODE_ID` | Unique node identifier | Auto-generated | No |
| `PORT` | Server port | `8080` | No |

See `.env.example` for a complete template.

### API Endpoints

The production API exposes these endpoints:

**Health & Status:**
- `GET /api/health` - Basic health check
- `GET /api/status` - Detailed node status with version, uptime, config

**Ledger Operations:**
- `GET /api/ledger/state` - Full ledger state snapshot
- `GET /api/ledger/transactions?page=1&per_page=50` - Paginated transaction history
- `POST /api/ledger/mint` - Mint USD-N (bounded: max $1M per operation)
- `POST /api/ledger/burn` - Burn USD-N (bounded: max $1M per operation)
- `POST /api/ledger/transfer` - Transfer USD-N between accounts (max $100K per operation)

**FIDES Protocol:**
- `GET /api/fides/score` - Compute FIDES trust score
- `POST /api/fides/step` - Execute policy step
- `POST /api/fides/btc-issue` - Issue BTC-backed USD-N
- `POST /api/fides/btc-burn` - Burn BTC-backed USD-N

**BTC Backing:**
- `GET /api/btc/backing` - BTC backing ratio and reserve model

All endpoints return JSON and support CORS. Write operations (POST) require JWT authentication if `USDN_JWT_SECRET` is set.

### Health Checks

Railway and Docker health checks use:

```
GET /api/health
```

Returns 200 OK when service is healthy.

### Scaling (Optional)

For high-traffic deployments:

1. **Horizontal scaling**: Deploy multiple instances behind a load balancer
2. **Database persistence**: Currently uses in-memory state; add Redis/PostgreSQL for persistence
3. **Rate limiting**: Adjust rate limits in `api/utils.ts`
4. **Authentication**: Enable JWT auth for production use

### Security Notes

⚠️ **Important Security Guidelines:**

- Never commit `.env` files with real secrets
- Enable `USDN_JWT_SECRET` for production deployments
- Use HTTPS in production (Railway provides this automatically)
- Monitor rate limiting logs for abuse
- Review CORS settings for production domains
- Keep TypeScript and Node.js dependencies updated

### Monitoring

Monitor your deployment:

```bash
# Railway logs
railway logs --follow

# Docker logs
docker logs -f <container-id>

# Health check
curl https://your-app.railway.app/api/health
```

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
