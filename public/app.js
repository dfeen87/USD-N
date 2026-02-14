// Browser-compatible USD-N simulation
// Simplified version of the core protocol for web demonstration

class Ledger {
    constructor() {
        this.supply = 0n;
        this.events = [];
    }

    mint(amount, at, memo) {
        this.supply += amount;
        this.events.push({ type: 'MINT', at, amount, memo });
    }

    burn(amount, at, memo) {
        this.supply -= amount;
        this.events.push({ type: 'BURN', at, amount, memo });
    }

    getSupply() {
        return this.supply;
    }

    getEvents() {
        return this.events;
    }

    reset() {
        this.supply = 0n;
        this.events = [];
    }
}

class FIDESSimulator {
    constructor(ledger) {
        this.ledger = ledger;
    }

    step(at, telemetry, reserves, stress) {
        const events = [];
        
        // Simple policy logic: issue or burn based on CPI
        const supply = this.ledger.getSupply();
        const reserveValue = reserves.total_value_usd;
        
        // Calculate stress multiplier (simplified)
        const stressMultiplier = this.calculateStressMultiplier(stress);
        
        // Policy decision
        if (telemetry.cpi_yoy_bps > 300) {
            // High inflation -> burn to contract supply
            const burnAmount = BigInt(Math.floor(Number(supply) * 0.02));
            if (burnAmount > 0n && supply > 0n) {
                const actualBurn = burnAmount < supply ? burnAmount : supply;
                this.ledger.burn(actualBurn, at, "Counter-cyclical contraction");
                events.push({
                    type: 'POLICY_ACTION',
                    at,
                    action: { kind: 'BURN', amount: actualBurn, reason: 'High CPI detected' }
                });
            }
        } else if (telemetry.cpi_yoy_bps < 200) {
            // Low inflation -> potentially issue if reserves allow
            const maxIssue = BigInt(Math.floor(Number(reserveValue) * stressMultiplier * 0.05));
            if (maxIssue > 0n) {
                this.ledger.mint(maxIssue, at, "Counter-cyclical expansion");
                events.push({
                    type: 'POLICY_ACTION',
                    at,
                    action: { kind: 'ISSUE', amount: maxIssue, reason: 'Low CPI with reserve coverage' }
                });
            }
        } else {
            events.push({
                type: 'POLICY_ACTION',
                at,
                action: { kind: 'NOOP', reason: 'CPI within target range' }
            });
        }
        
        return events;
    }

    calculateStressMultiplier(stress) {
        // Higher stress = lower multiplier (tighter issuance)
        const drawdownFactor = 1 - (stress.btc_drawdown_pct / 100);
        const volatilityFactor = 1 - (stress.btc_volatility_pct / 100);
        return Math.max(0.1, Math.min(1.0, drawdownFactor * volatilityFactor));
    }
}

function makeReserveSnapshot(at, totalValueUsd) {
    return {
        at,
        total_value_usd: totalValueUsd,
        attestation_id: `attest-${at}`
    };
}

function buildAlignmentReport(supply, reserves, stress) {
    const coverage = reserves.total_value_usd > 0n
        ? (supply * 10000n) / reserves.total_value_usd
        : 0n;
    
    const stressMult = calculateStressMultiplier(stress);
    
    return {
        at: reserves.at,
        supply_usd_cents: supply,
        reserve_total_usd_cents: reserves.total_value_usd,
        reserve_coverage_bps: coverage,
        stress_multiplier_bps: Math.floor(stressMult * 10000)
    };
}

function calculateStressMultiplier(stress) {
    const drawdownFactor = 1 - (stress.btc_drawdown_pct / 100);
    const volatilityFactor = 1 - (stress.btc_volatility_pct / 100);
    return Math.max(0.1, Math.min(1.0, drawdownFactor * volatilityFactor));
}

function formatUSD(cents) {
    const sign = cents < 0n ? '-' : '';
    const v = cents < 0n ? -cents : cents;
    const dollars = v / 100n;
    const rem = v % 100n;
    return `${sign}$${dollars.toLocaleString()}.${rem.toString().padStart(2, '0')}`;
}

function formatBps(bps) {
    const sign = bps < 0n ? '-' : '';
    const value = bps < 0n ? -bps : bps;
    const whole = value / 100n;
    const rem = value % 100n;
    return `${sign}${whole}.${rem.toString().padStart(2, '0')}%`;
}

function isoNowPlusMinutes(m) {
    const d = new Date(Date.now() + m * 60_000);
    return d.toISOString();
}

function runSimulation(steps) {
    const ledger = new Ledger();
    const fides = new FIDESSimulator(ledger);
    const log = [];
    
    for (let i = 0; i < steps; i++) {
        const at = isoNowPlusMinutes(i);
        const telemetry = {
            at,
            cpi_yoy_bps: i < 4 ? 420 : i < 8 ? 240 : 120, // high -> stable -> low
            gdp_qoq_bps: 200,
            unemployment_bps: 450
        };
        
        const reserves = makeReserveSnapshot(at, 1_000_000_00n);
        
        const stress = {
            btc_drawdown_pct: i < 4 ? 35 : i < 8 ? 12 : 4,
            btc_volatility_pct: i < 4 ? 18 : i < 8 ? 10 : 6,
            timestamp: Date.parse(at)
        };
        
        const events = fides.step(at, telemetry, reserves, stress);
        for (const e of events) {
            if (e.type === 'POLICY_ACTION') {
                log.push(`${at} POLICY ${e.action.kind} :: ${e.action.reason}`);
            }
        }
        
        const report = buildAlignmentReport(ledger.getSupply(), reserves, stress);
        log.push(
            `${report.at} ALIGNMENT coverage=${formatBps(report.reserve_coverage_bps)}` +
            ` stress_mult=${(report.stress_multiplier_bps / 100).toFixed(2)}%`
        );
    }
    
    return {
        log,
        finalSupply: ledger.getSupply(),
        totalEvents: ledger.getEvents().length,
        ledger
    };
}

// UI Controller
document.addEventListener('DOMContentLoaded', () => {
    const runBtn = document.getElementById('runSim');
    const resetBtn = document.getElementById('resetSim');
    const stepsInput = document.getElementById('steps');
    const eventLog = document.getElementById('eventLog');
    const statusDiv = document.getElementById('status');
    const supplyDiv = document.getElementById('supply');
    const coverageDiv = document.getElementById('coverage');
    const eventsDiv = document.getElementById('events');
    
    let currentResults = null;
    
    runBtn.addEventListener('click', () => {
        const steps = parseInt(stepsInput.value) || 12;
        
        runBtn.disabled = true;
        statusDiv.className = 'status';
        statusDiv.textContent = 'Running simulation...';
        statusDiv.classList.add('success');
        
        // Simulate async execution for better UX
        setTimeout(() => {
            try {
                currentResults = runSimulation(steps);
                
                eventLog.textContent = currentResults.log.join('\n');
                supplyDiv.textContent = formatUSD(currentResults.finalSupply);
                
                // Calculate final coverage
                const reserves = 1_000_000_00n;
                const coverage = currentResults.finalSupply > 0n
                    ? Number((reserves * 10000n) / currentResults.finalSupply) / 100
                    : 0;
                coverageDiv.textContent = coverage.toFixed(2) + '%';
                eventsDiv.textContent = currentResults.totalEvents.toString();
                
                statusDiv.textContent = `✓ Simulation completed: ${steps} steps processed`;
                statusDiv.classList.remove('error');
                statusDiv.classList.add('success');
            } catch (error) {
                statusDiv.textContent = `✗ Error: ${error.message}`;
                statusDiv.classList.remove('success');
                statusDiv.classList.add('error');
            } finally {
                runBtn.disabled = false;
            }
        }, 100);
    });
    
    resetBtn.addEventListener('click', () => {
        eventLog.textContent = '';
        supplyDiv.textContent = '$0.00';
        coverageDiv.textContent = '0.00%';
        eventsDiv.textContent = '0';
        statusDiv.className = 'status';
        currentResults = null;
    });
});
