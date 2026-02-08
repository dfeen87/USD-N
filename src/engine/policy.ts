import { CONFIG } from "../config.js";
import type {
  BtcPriceSnapshot,
  MacroTelemetry,
  PolicyAction,
  StressSnapshot,
  USDN
} from "../types.js";
import { btcToUsdCents, usdCentsToBtc } from "./invariants.js";

export function fidesPolicyDecision(
  telemetry: MacroTelemetry,
  currentSupply: USDN
): PolicyAction {
  assertTelemetryBounds(telemetry);
  const cpi = telemetry.cpi_yoy_bps;
  const amount = policyAmount(currentSupply);

  if (cpi >= CONFIG.upper_cpi_yoy_bps) {
    return {
      kind: "BURN",
      amount,
      reason: `CPI high (${cpi} bps) -> contract supply`
    };
  }

  if (cpi <= CONFIG.lower_cpi_yoy_bps) {
    return {
      kind: "ISSUE",
      amount,
      reason: `CPI low (${cpi} bps) -> expand supply`
    };
  }

  return { kind: "NOOP", reason: `CPI within band (${cpi} bps) -> hold` };
}

export function btcBackedMintAmount(
  btc_amount: number,
  price_snapshot: BtcPriceSnapshot
): USDN {
  return btcToUsdCents(btc_amount, price_snapshot.price_usd);
}

export function btcBackedBurnAmount(
  amount: USDN,
  price_snapshot: BtcPriceSnapshot
): number {
  return usdCentsToBtc(amount, price_snapshot.price_usd);
}

export function issuanceMultiplier(stress: StressSnapshot): number {
  // Economic intent: tighten issuance when BTC stress is elevated, loosen in calm.
  // Deterministic, monotonic, and bounded in (0, 1].
  const stressScore = Math.max(
    0,
    stress.btc_drawdown_pct + stress.btc_volatility_pct
  );
  const multiplier = 1 / (1 + stressScore / 50);
  return Math.min(1, Math.max(0, multiplier));
}

export function stressAdjustedIssuanceAmount(
  proposed: USDN,
  stress: StressSnapshot
): USDN {
  const stressScore = Math.max(
    0,
    stress.btc_drawdown_pct + stress.btc_volatility_pct
  );
  const multiplierBps = Math.min(
    10_000,
    Math.max(0, Math.floor(50_000 / (50 + stressScore)))
  );
  return (proposed * BigInt(multiplierBps)) / 10_000n;
}

function policyAmount(currentSupply: USDN): USDN {
  const scaled = (currentSupply * BigInt(CONFIG.policy_step_bps)) / 10_000n;
  if (scaled <= 0n) return CONFIG.min_policy_step_cents;
  return scaled;
}

function assertTelemetryBounds(telemetry: MacroTelemetry): void {
  assertFinite("cpi_yoy_bps", telemetry.cpi_yoy_bps);
  assertFinite("gdp_qoq_bps", telemetry.gdp_qoq_bps);
  assertFinite("unemployment_bps", telemetry.unemployment_bps);

  assertInRange(
    "cpi_yoy_bps",
    telemetry.cpi_yoy_bps,
    CONFIG.min_cpi_yoy_bps,
    CONFIG.max_cpi_yoy_bps
  );
  assertInRange(
    "gdp_qoq_bps",
    telemetry.gdp_qoq_bps,
    CONFIG.min_gdp_qoq_bps,
    CONFIG.max_gdp_qoq_bps
  );
  assertInRange(
    "unemployment_bps",
    telemetry.unemployment_bps,
    CONFIG.min_unemployment_bps,
    CONFIG.max_unemployment_bps
  );
}

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`INVARIANT_FAIL: ${name} is not finite`);
  }
}

function assertInRange(
  name: string,
  value: number,
  min: number,
  max: number
): void {
  if (value < min || value > max) {
    throw new Error(`INVARIANT_FAIL: ${name} out of range (${value})`);
  }
}
