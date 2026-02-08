export type ISODateTime = string;

export type USD = bigint;      // USD cents, integer only
export type USDN = bigint;     // USD-N cents, integer only

export type ReserveAsset =
  | "UST"        // U.S. Treasury instruments (proxy)
  | "GOLD"       // certified physical gold (proxy)
  | "ENERGY"     // clean energy credits (proxy)
  | "COMMODITY"  // industrial commodities (proxy)
  | "BTC";       // Bitcoin reserves

export type ReserveSnapshot = {
  at: ISODateTime;
  // value in USD cents for simplicity; later this can be per-asset quantities + pricing
  total_value_usd: USD;
  by_asset_usd: Record<ReserveAsset, USD>;
  attestation_id: string; // placeholder for audit/proof-of-reserve reference
  btc?: BtcReserve;
};

export type BtcPriceSnapshot = {
  price_usd: number;
  timestamp: number;
  source: string;
};

export type BtcOwnershipProof = {
  btc_address: string;
  message: string;
  signature: string;
};

export type BtcReserve = {
  asset: "BTC";
  amount_btc: number;
  value_usd: USD;
  price_snapshot: BtcPriceSnapshot;
};

export type MacroTelemetry = {
  at: ISODateTime;
  cpi_yoy_bps: number;   // CPI YoY in basis points (e.g., 320 = 3.20%)
  gdp_qoq_bps: number;   // GDP QoQ annualized in bps
  unemployment_bps: number;
};

export type StressSnapshot = {
  // % drawdown from recent BTC peak (0 = no drawdown)
  btc_drawdown_pct: number;
  // rolling BTC volatility estimate (%)
  btc_volatility_pct: number;
  timestamp: number;
};

export type AlignmentReport = {
  at: ISODateTime;
  supply_usd_cents: USDN;
  reserve_total_usd_cents: USD;
  reserve_coverage_bps: bigint;
  btc_reserve_usd_cents: USD;
  btc_reserve_share_bps: bigint;
  stress_multiplier_bps: number;
};

export type PolicyAction =
  | { kind: "ISSUE"; amount: USDN; reason: string }
  | { kind: "BURN"; amount: USDN; reason: string }
  | { kind: "NOOP"; reason: string }
  | {
      kind: "BTC_BACKED_ISSUE";
      amount: USDN;
      btc_amount: number;
      price_snapshot: BtcPriceSnapshot;
      proof: BtcOwnershipProof;
      reason: string;
    }
  | {
      kind: "BTC_BACKED_BURN";
      amount: USDN;
      btc_amount: number;
      price_snapshot: BtcPriceSnapshot;
      reason: string;
    };

export type LedgerEvent =
  | { type: "MINT"; at: ISODateTime; amount: USDN; memo: string }
  | { type: "BURN"; at: ISODateTime; amount: USDN; memo: string }
  | { type: "RESERVE_SNAPSHOT"; at: ISODateTime; snapshot: ReserveSnapshot }
  | { type: "STRESS_SNAPSHOT"; at: ISODateTime; snapshot: StressSnapshot }
  | { type: "POLICY_ACTION"; at: ISODateTime; action: PolicyAction }
  | { type: "POLICY_REJECTED"; at: ISODateTime; action: PolicyAction; reason: string }
  | {
      type: "BTC_BACKED_ISSUE";
      at: ISODateTime;
      amount: USDN;
      btc_amount: number;
      price_snapshot: BtcPriceSnapshot;
      proof: BtcOwnershipProof;
      memo: string;
    }
  | {
      type: "BTC_BACKED_BURN";
      at: ISODateTime;
      amount: USDN;
      btc_amount: number;
      price_snapshot: BtcPriceSnapshot;
      memo: string;
    };
