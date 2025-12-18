import { Ledger } from "../engine/ledger.js";
import { FIDES } from "../engine/fides.js";
import { makeReserveSnapshot } from "../engine/reserves.js";
import type { MacroTelemetry } from "../types.js";

function isoNowPlusMinutes(m: number): string {
  const d = new Date(Date.now() + m * 60_000);
  return d.toISOString();
}

export function runSim(steps = 12): void {
  const ledger = new Ledger();
  const fides = new FIDES(ledger);

  for (let i = 0; i < steps; i++) {
    const at = isoNowPlusMinutes(i);
    const telemetry: MacroTelemetry = {
      at,
      cpi_yoy_bps: i < 4 ? 420 : i < 8 ? 240 : 120, // high -> stable -> low
      gdp_qoq_bps: 200,
      unemployment_bps: 450
    };

    // reserves always cover supply in this toy sim; start with $1,000,000
    const reserves = makeReserveSnapshot(at, 1_000_000_00n);

    const events = fides.step(at, telemetry, reserves);
    for (const e of events) {
      if (e.type === "MINT" || e.type === "BURN") {
        console.log(`${e.at} ${e.type} ${formatUSD(e.amount)} :: ${e.memo}`);
      } else if (e.type === "POLICY_ACTION") {
        console.log(`${e.at} POLICY ${e.action.kind} :: ${e.action.reason}`);
      }
    }
  }

  console.log(`\nFinal supply: ${formatUSD(ledger.getSupply())}`);
}

function formatUSD(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const v = cents < 0n ? -cents : cents;
  const dollars = v / 100n;
  const rem = v % 100n;
  return `${sign}$${dollars}.${rem.toString().padStart(2, "0")}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSim(12);
}
