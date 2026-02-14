# USD-N REST API Documentation

## Overview

The USD-N REST API provides programmatic access to the global USD-N node, allowing you to interact with the FIDES protocol, query ledger state, and execute monetary operations.

**Base URL:** `http://localhost:3000/api`

**Global Node:** The server maintains a single global USD-N node instance with shared ledger state across all API requests.

---

## API Endpoints

### Node Status

#### `GET /api/status`

Get the current status of the USD-N node.

**Response:**
```json
{
  "status": "online",
  "supply": "0",
  "totalEvents": 0,
  "latestEventHash": "GENESIS"
}
```

---

### Ledger Operations

#### `GET /api/ledger/supply`

Get the current USD-N supply.

**Response:**
```json
{
  "supply": "0"
}
```

#### `GET /api/ledger/events`

Get all ledger events in the hash chain.

**Response:**
```json
{
  "events": [
    {
      "event": { ... },
      "hash": "abc123...",
      "prevHash": "GENESIS"
    }
  ],
  "count": 1
}
```

#### `POST /api/ledger/reset`

Reset the ledger to initial state (for testing only).

**Response:**
```json
{
  "success": true,
  "message": "Ledger reset"
}
```

---

### FIDES Protocol Operations

#### `POST /api/fides/step`

Execute a FIDES policy step with macroeconomic telemetry.

**Request Body:**
```json
{
  "at": "2024-01-01T00:00:00.000Z",
  "telemetry": {
    "at": "2024-01-01T00:00:00.000Z",
    "cpi_yoy_bps": 250,
    "gdp_qoq_bps": 200,
    "unemployment_bps": 450
  },
  "reserves": {
    "at": "2024-01-01T00:00:00.000Z",
    "total_value_usd": "100000000",
    "by_asset_usd": {
      "BTC": "100000000"
    },
    "attestation_id": "test-attestation"
  },
  "stress": {
    "btc_drawdown_pct": 10,
    "btc_volatility_pct": 5,
    "timestamp": 1704067200000
  }
}
```

**Response:**
```json
{
  "success": true,
  "events": [...],
  "newSupply": "1000000"
}
```

#### `POST /api/fides/btc-issue`

Issue USD-N backed by Bitcoin reserves.

**Request Body:**
```json
{
  "at": "2024-01-01T00:00:00.000Z",
  "reserves": {
    "at": "2024-01-01T00:00:00.000Z",
    "total_value_usd": "100000000",
    "by_asset_usd": {
      "BTC": "100000000"
    },
    "attestation_id": "test-attestation",
    "btc": {
      "asset": "BTC",
      "amount_btc": 1.0,
      "value_usd": "100000000",
      "price_snapshot": {
        "price_usd": 100000,
        "timestamp": 1704067200000,
        "source": "test"
      }
    }
  },
  "btc_amount": 0.5,
  "price_snapshot": {
    "price_usd": 100000,
    "timestamp": 1704067200000,
    "source": "test"
  },
  "proof": {
    "btc_address": "bc1qtest...",
    "message": "USD-N Reserve Attestation",
    "signature": "test-signature"
  },
  "memo": "BTC-backed issuance"
}
```

**Response:**
```json
{
  "success": true,
  "events": [...],
  "newSupply": "5000000000"
}
```

#### `POST /api/fides/btc-burn`

Burn USD-N and release Bitcoin reserves.

**Request Body:**
```json
{
  "at": "2024-01-01T00:00:00.000Z",
  "reserves": {
    "at": "2024-01-01T00:00:00.000Z",
    "total_value_usd": "100000000",
    "by_asset_usd": {
      "BTC": "100000000"
    },
    "attestation_id": "test-attestation",
    "btc": {
      "asset": "BTC",
      "amount_btc": 1.0,
      "value_usd": "100000000",
      "price_snapshot": {
        "price_usd": 100000,
        "timestamp": 1704067200000,
        "source": "test"
      }
    }
  },
  "amount": "2500000000",
  "price_snapshot": {
    "price_usd": 100000,
    "timestamp": 1704067200000,
    "source": "test"
  },
  "memo": "BTC-backed burn"
}
```

**Response:**
```json
{
  "success": true,
  "events": [...],
  "newSupply": "2500000000"
}
```

---

## Data Types

### Telemetry
- `cpi_yoy_bps`: CPI year-over-year in basis points (e.g., 250 = 2.50%)
- `gdp_qoq_bps`: GDP quarter-over-quarter in basis points
- `unemployment_bps`: Unemployment rate in basis points

### Reserve Snapshot
- `total_value_usd`: Total reserve value in USD cents (string to handle large numbers)
- `by_asset_usd`: Breakdown by reserve asset type
- `attestation_id`: External proof-of-reserve reference
- `btc`: Optional Bitcoin reserve details

### Stress Snapshot
- `btc_drawdown_pct`: Bitcoin drawdown percentage from recent peak
- `btc_volatility_pct`: Bitcoin volatility percentage
- `timestamp`: Unix timestamp in milliseconds

### BTC Price Snapshot
- `price_usd`: Bitcoin price in USD (number)
- `timestamp`: Unix timestamp in milliseconds
- `source`: Price data source identifier

### BTC Ownership Proof
- `btc_address`: Bitcoin address holding reserves
- `message`: Signed message content
- `signature`: Cryptographic signature

---

## Error Responses

All errors return a JSON object with an `error` field:

```json
{
  "error": "Error message",
  "details": "Stack trace (in development)"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad request (missing or invalid parameters)
- `404`: Endpoint not found
- `500`: Internal server error

---

## CORS

The API includes CORS headers allowing cross-origin requests from any origin for development purposes.

---

## Examples

### Check Node Status

```bash
curl http://localhost:3000/api/status
```

### Execute a Policy Step

```bash
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
      "by_asset_usd": {
        "BTC": "100000000"
      },
      "attestation_id": "test"
    },
    "stress": {
      "btc_drawdown_pct": 10,
      "btc_volatility_pct": 5,
      "timestamp": 1704067200000
    }
  }'
```

### Get Current Supply

```bash
curl http://localhost:3000/api/ledger/supply
```

---

## Notes

- All monetary values are in **integer cents** to avoid floating-point errors
- Supply values are returned as strings since JavaScript's `Number` type cannot safely represent large `bigint` values
- The global node persists state across requests until the server is restarted or `/api/ledger/reset` is called
- All timestamps should be in ISO 8601 format
- This API is for demonstration and development; production deployments would require authentication, rate limiting, and additional security measures
