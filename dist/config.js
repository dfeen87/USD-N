export const CONFIG = {
    // parity: 1 USD == 1 USD-N (both represent cents here)
    parity_enabled: true,
    // guardrails
    max_issue_per_step_cents: 5000000n, // $50,000.00 per step (simulation)
    max_burn_per_step_cents: 5000000n,
    // inflation targeting (toy defaults, but deterministic)
    target_cpi_yoy_bps: 250, // 2.50%
    upper_cpi_yoy_bps: 350, // >3.50%: contract
    lower_cpi_yoy_bps: 150, // <1.50%: expand
    policy_step_bps: 25, // 0.25% of current supply per step
    min_policy_step_cents: 1000000n, // $10,000 floor for early bootstrap
    // reserve coverage requirement
    min_reserve_coverage_bps: 10000n, // 100.00% coverage
    // telemetry guardrails (bps)
    min_cpi_yoy_bps: -500, // -5.00%
    max_cpi_yoy_bps: 2_000, // 20.00%
    min_gdp_qoq_bps: -2_000, // -20.00%
    max_gdp_qoq_bps: 2_000, // 20.00%
    min_unemployment_bps: 0, // 0.00%
    max_unemployment_bps: 2_500 // 25.00%
};
