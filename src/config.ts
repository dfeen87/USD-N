export const CONFIG = {
  // parity: 1 USD == 1 USD-N (both represent cents here)
  parity_enabled: true,

  // guardrails
  max_issue_per_step_cents: 50_000_00n, // $50,000.00 per step (simulation)
  max_burn_per_step_cents:  50_000_00n,

  // inflation targeting (toy defaults, but deterministic)
  target_cpi_yoy_bps: 250,       // 2.50%
  upper_cpi_yoy_bps:  350,       // >3.50%: contract
  lower_cpi_yoy_bps:  150,       // <1.50%: expand

  // reserve coverage requirement
  min_reserve_coverage_bps: 10_000 // 100.00% coverage
} as const;
