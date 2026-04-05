# USD-N Production REST API Documentation

## Overview

The USD-N Production REST API (`main.ts`) is a production-ready, deterministic REST API for the USD-N stablecoin protocol. It exposes safe, bounded endpoints for ledger operations, FIDES trust scoring, and Bitcoin backing analysis.

**Production Base URL:** `http://localhost:8080/api`  
**Development Base URL:** `http://localhost:3000/api`

**Key Features:**
- ✅ Deterministic operations
- ✅ Safe, bounded writes
- ✅ Rate limiting (100 req/min per IP)
- ✅ Optional JWT authentication
- ✅ CORS enabled
- ✅ OpenAPI compatible
- ✅ JSON-only responses

---

## Authentication

Authentication is **optional** and disabled by default. To enable JWT authentication:

1. Set `USDN_JWT_SECRET` environment variable
2. Include bearer token in requests:

```bash
curl -H "Authorization: Bearer YOUR_JWT_SECRET" \
  http://localhost:8080/api/ledger/mint \
  -X POST -d '{"amount": "1000", "memo": "test"}'
```

**Note:** When `USDN_JWT_SECRET` is not set, all endpoints are accessible without authentication.

---

## Rate Limiting

All endpoints are rate-limited to **100 requests per minute per IP address**.

When rate limit is exceeded, the API returns:
```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```
HTTP Status: 429 (Too Many Requests)

---

## Endpoints

### Health & Status

#### `GET /api/health`

Basic health check endpoint for monitoring and load balancers.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "USD-N REST API"
}
```

**Status Codes:**
- `200` - Service is healthy

---

#### `GET /api/status`

Detailed node status including version, uptime, and configuration.

**Response:**
```json
{
  "status": "online",
  "version": "4.1.0",
  "uptime_ms": 123456,
  "uptime_human": "2h 3m",
  "config": {
    "environment": "production",
    "node_id": "node-abc123",
    "log_level": "info"
  },
  "ledger": {
    "supply": "0",
    "total_events": 0,
    "latest_event_hash": "GENESIS"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `200` - Success

---

### Ledger Operations

#### `GET /api/ledger/state`

Get full ledger state snapshot.

**Response:**
```json
{
  "supply": "1000000",
  "total_events": 5,
  "latest_event_hash": "abc123...",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `200` - Success

---

#### `GET /api/ledger/transactions`

Get paginated transaction history.

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `per_page` (optional) - Items per page (default: 50, max: 100)

**Example Request:**
```bash
curl "http://localhost:8080/api/ledger/transactions?page=1&per_page=25"
```

**Response:**
```json
{
  "transactions": [
    {
      "event": {
        "type": "MINT",
        "at": "2024-01-01T00:00:00.000Z",
        "amount": "1000000",
        "memo": "Initial issuance"
      },
      "hash": "abc123...",
      "prevHash": "GENESIS"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total_items": 100,
    "total_pages": 4,
    "has_next": true,
    "has_prev": false
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid pagination parameters

---

#### `POST /api/ledger/mint`

Mint USD-N tokens. **Bounded to $1M per operation** for safety.

**Authentication:** Required if `USDN_JWT_SECRET` is set

**Request Body:**
```json
{
  "amount": "1000000",
  "memo": "Initial issuance",
  "at": "2024-01-01T00:00:00.000Z"
}
```

**Fields:**
- `amount` (required) - Amount in cents (string or number), must be positive, max: 100000000
- `memo` (required) - Description of mint operation
- `at` (optional) - ISO 8601 timestamp (default: current time)

**Response:**
```json
{
  "success": true,
  "amount": "1000000",
  "new_supply": "1000000",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request (missing fields, negative amount, exceeds limit)
- `401` - Unauthorized (if JWT auth enabled)
- `500` - Server error

**Example:**
```bash
curl -X POST http://localhost:8080/api/ledger/mint \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "1000000",
    "memo": "Test mint"
  }'
```

---

#### `POST /api/ledger/burn`

Burn USD-N tokens. **Bounded to $1M per operation** for safety.

**Authentication:** Required if `USDN_JWT_SECRET` is set

**Request Body:**
```json
{
  "amount": "500000",
  "memo": "Burn excess supply",
  "at": "2024-01-01T00:00:00.000Z"
}
```

**Fields:**
- `amount` (required) - Amount in cents (string or number), must be positive, max: 100000000
- `memo` (required) - Description of burn operation
- `at` (optional) - ISO 8601 timestamp (default: current time)

**Response:**
```json
{
  "success": true,
  "amount": "500000",
  "new_supply": "500000",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request (amount exceeds supply, exceeds limit)
- `401` - Unauthorized (if JWT auth enabled)
- `500` - Server error

---

#### `POST /api/ledger/transfer`

Transfer USD-N between accounts. **Bounded to $100K per operation** for safety.

**Note:** This is a simulation endpoint. The core ledger tracks supply, not individual account balances. Transfers are recorded as ledger events.

**Authentication:** Required if `USDN_JWT_SECRET` is set

**Request Body:**
```json
{
  "from": "account-1",
  "to": "account-2",
  "amount": "50000",
  "memo": "Payment for services",
  "at": "2024-01-01T00:00:00.000Z"
}
```

**Fields:**
- `from` (required) - Source account identifier
- `to` (required) - Destination account identifier
- `amount` (required) - Amount in cents (string or number), must be positive, max: 10000000
- `memo` (optional) - Description of transfer
- `at` (optional) - ISO 8601 timestamp (default: current time)

**Response:**
```json
{
  "success": true,
  "from": "account-1",
  "to": "account-2",
  "amount": "50000",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "note": "Transfer recorded as ledger event. Core ledger tracks supply, not individual accounts."
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request (exceeds limit)
- `401` - Unauthorized (if JWT auth enabled)
- `500` - Server error

---

### FIDES Protocol

#### `GET /api/fides/score`

Compute FIDES trust score based on ledger history and policy adherence.

**Response:**
```json
{
  "trust_score": 87.5,
  "score_breakdown": {
    "base_score": 100,
    "policy_rejection_penalty": -10,
    "btc_backing_bonus": 5,
    "reserve_attestation_bonus": 2.5
  },
  "ledger_metrics": {
    "total_events": 100,
    "mint_events": 20,
    "burn_events": 10,
    "btc_backed_events": 15,
    "policy_rejections": 5,
    "reserve_snapshots": 10
  },
  "interpretation": "Good - Consistent policy compliance",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Trust Score Interpretation:**
- 90-100: Excellent - Strong adherence to FIDES principles
- 75-89: Good - Consistent policy compliance
- 60-74: Fair - Moderate policy adherence
- 40-59: Poor - Frequent constraint violations
- 0-39: Critical - Severe policy failures

**Status Codes:**
- `200` - Success

---

#### `POST /api/fides/step`

Execute a FIDES policy step with macroeconomic telemetry.

**Authentication:** Required if `USDN_JWT_SECRET` is set

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

**Status Codes:**
- `200` - Success
- `400` - Missing required fields
- `401` - Unauthorized (if JWT auth enabled)
- `500` - Server error

---

#### `POST /api/fides/btc-issue`

Issue USD-N backed by Bitcoin reserves.

**Authentication:** Required if `USDN_JWT_SECRET` is set

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

**Status Codes:**
- `200` - Success
- `400` - Missing required fields
- `401` - Unauthorized (if JWT auth enabled)
- `500` - Server error

---

#### `POST /api/fides/btc-burn`

Burn USD-N and release Bitcoin reserves.

**Authentication:** Required if `USDN_JWT_SECRET` is set

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
    "attestation_id": "test-attestation"
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

**Status Codes:**
- `200` - Success
- `400` - Missing required fields
- `401` - Unauthorized (if JWT auth enabled)
- `500` - Server error

---

### BTC Backing

#### `GET /api/btc/backing`

Get Bitcoin backing ratio and reserve model analysis.

**Response:**
```json
{
  "backing_ratio_percent": 150.5,
  "btc_reserves": {
    "total_btc": 1.5,
    "value_usd_cents": "150000000",
    "latest_btc_price_usd": 100000,
    "last_updated": "2024-01-01T00:00:00.000Z"
  },
  "supply_breakdown": {
    "total_supply_cents": "100000000",
    "btc_backed_supply_cents": "80000000",
    "btc_backed_ratio_percent": 80.0,
    "other_supply_cents": "20000000"
  },
  "reserve_model": {
    "type": "multi-asset",
    "primary_reserve": "BTC",
    "backing_requirement": "100%",
    "over_collateralization": true,
    "reserve_coverage_status": "adequate"
  },
  "interpretation": "Strongly over-collateralized - Excellent reserve position",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Backing Ratio Interpretation:**
- ≥150%: Strongly over-collateralized
- 120-149%: Over-collateralized
- 100-119%: Fully collateralized
- 80-99%: Under-collateralized
- 50-79%: Critically under-collateralized
- <50%: Insufficient reserves

**Status Codes:**
- `200` - Success

---

### Legacy Endpoints (Backwards Compatibility)

These endpoints maintain compatibility with the original API:

#### `GET /api/ledger/supply`
#### `GET /api/ledger/events`
#### `POST /api/ledger/reset`

See original [API.md](./API.md) for documentation.

---

## Error Responses

All errors return JSON with an `error` field:

```json
{
  "error": "Error message"
}
```

In non-production environments, errors may include a `details` field with stack traces.

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing/invalid JWT)
- `404` - Endpoint not found
- `429` - Rate limit exceeded
- `500` - Internal server error

---

## CORS

All endpoints support CORS with these headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

---

## Examples

### Check Health

```bash
curl http://localhost:8080/api/health
```

### Get Node Status

```bash
curl http://localhost:8080/api/status
```

### Mint USD-N

```bash
curl -X POST http://localhost:8080/api/ledger/mint \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "1000000",
    "memo": "Initial mint"
  }'
```

### Get Paginated Transactions

```bash
curl "http://localhost:8080/api/ledger/transactions?page=1&per_page=25"
```

### Get FIDES Trust Score

```bash
curl http://localhost:8080/api/fides/score
```

### Get BTC Backing Ratio

```bash
curl http://localhost:8080/api/btc/backing
```

### With Authentication (if enabled)

```bash
curl -H "Authorization: Bearer YOUR_JWT_SECRET" \
  -X POST http://localhost:8080/api/ledger/mint \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "500000",
    "memo": "Authenticated mint"
  }'
```

---

## Production Deployment Notes

1. **Always use HTTPS** in production
2. **Enable JWT authentication** by setting `USDN_JWT_SECRET`
3. **Monitor rate limits** and adjust if needed
4. **Use health checks** for load balancer configuration
5. **Set appropriate environment** via `USDN_ENV=production`
6. **Review logs** regularly via `USDN_LOG_LEVEL=info`
7. **Never commit** `.env` files with secrets

---

## OpenAPI/Swagger Specification

The API is OpenAPI 3.0 compatible. An OpenAPI specification file can be generated from this documentation or by using tools like [openapi-generator](https://openapi-generator.tech/).

---

## Support

For issues, questions, or contributions, please refer to the main repository documentation.
