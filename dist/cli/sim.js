import { Ledger } from "../engine/ledger.js";
import { FIDES } from "../engine/fides.js";
import { makeReserveSnapshot } from "../engine/reserves.js";
import { buildAlignmentReport } from "../engine/alignment.js";
function isoNowPlusMinutes(m) {
    const d = new Date(Date.now() + m * 60_000);
    return d.toISOString();
}
export function runSim(steps = 12) {
    const ledger = new Ledger();
    const fides = new FIDES(ledger);
    for (let i = 0; i < steps; i++) {
        const at = isoNowPlusMinutes(i);
        const telemetry = {
            at,
            cpi_yoy_bps: i < 4 ? 420 : i < 8 ? 240 : 120, // high -> stable -> low
            gdp_qoq_bps: 200,
            unemployment_bps: 450
        };
        // reserves always cover supply in this toy sim; start with $1,000,000
        const reserves = makeReserveSnapshot(at, 100000000n, 30000000n);
        const stress = {
            btc_drawdown_pct: i < 4 ? 35 : i < 8 ? 12 : 4,
            btc_volatility_pct: i < 4 ? 18 : i < 8 ? 10 : 6,
            timestamp: Date.parse(at)
        };
        const events = fides.step(at, telemetry, reserves, stress);
        for (const e of events) {
            if (e.type === "MINT" || e.type === "BURN") {
                console.log(`${e.at} ${e.type} ${formatUSD(e.amount)} :: ${e.memo}`);
            }
            else if (e.type === "POLICY_ACTION") {
                console.log(`${e.at} POLICY ${e.action.kind} :: ${e.action.reason}`);
            }
            else if (e.type === "POLICY_REJECTED") {
                console.log(`${e.at} POLICY_REJECTED ${e.action.kind} :: ${e.reason}`);
            }
        }
        const report = buildAlignmentReport(ledger.getSupply(), reserves, stress);
        console.log(`${report.at} ALIGNMENT coverage=${formatBps(report.reserve_coverage_bps)}` +
            ` btc_share=${formatBps(report.btc_reserve_share_bps)}` +
            ` stress_mult=${formatBps(BigInt(report.stress_multiplier_bps))}`);
    }
    console.log(`\nFinal supply: ${formatUSD(ledger.getSupply())}`);
}
function formatUSD(cents) {
    const sign = cents < 0n ? "-" : "";
    const v = cents < 0n ? -cents : cents;
    const dollars = v / 100n;
    const rem = v % 100n;
    return `${sign}$${dollars}.${rem.toString().padStart(2, "0")}`;
}
function formatBps(bps) {
    const sign = bps < 0n ? "-" : "";
    const value = bps < 0n ? -bps : bps;
    const whole = value / 100n;
    const rem = value % 100n;
    return `${sign}${whole}.${rem.toString().padStart(2, "0")}%`;
}
if (import.meta.url === `file://${process.argv[1]}`) {
    runSim(12);
}
