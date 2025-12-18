import { CONFIG } from "../config.js";
import type { MacroTelemetry, PolicyAction, USDN } from "../types.js";

export function fidesPolicyDecision(
  telemetry: MacroTelemetry,
  currentSupply: USDN
): PolicyAction {
  const cpi = telemetry.cpi_yoy_bps;

  if (cpi >= CONFIG.upper_cpi_yoy_bps) {
    return {
      kind: "BURN",
      amount: clampAmount(25_000_00n), // $25,000
      reason: `CPI high (${cpi} bps) -> contract supply`
    };
  }

  if (cpi <= CONFIG.lower_cpi_yoy_bps) {
    return {
      kind: "ISSUE",
      amount: clampAmount(25_000_00n),
      reason: `CPI low (${cpi} bps) -> expand supply`
    };
  }

  return { kind: "NOOP", reason: `CPI within band (${cpi} bps) -> hold` };
}

function clampAmount(a: USDN): USDN {
  // keep step bounded
  if (a < 0n) return 0n;
  return a;
}
