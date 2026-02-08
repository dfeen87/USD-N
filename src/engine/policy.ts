import { CONFIG } from "../config.js";
import type { BtcPriceSnapshot, MacroTelemetry, PolicyAction, USDN } from "../types.js";
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
