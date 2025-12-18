export type ISODateTime = string;

export type USD = bigint;      // USD cents, integer only
export type USDN = bigint;     // USD-N cents, integer only

export type ReserveAsset =
  | "UST"        // U.S. Treasury instruments (proxy)
  | "GOLD"       // certified physical gold (proxy)
  | "ENERGY"     // clean energy credits (proxy)
  | "COMMODITY"; // industrial commodities (proxy)

export type ReserveSnapshot = {
  at: ISODateTime;
  // value in USD cents for simplicity; later this can be per-asset quantities + pricing
  total_value_usd: USD;
  by_asset_usd: Record<ReserveAsset, USD>;
  attestation_id: string; // placeholder for audit/proof-of-reserve reference
};

export type MacroTelemetry = {
  at: ISODateTime;
  cpi_yoy_bps: number;   // CPI YoY in basis points (e.g., 320 = 3.20%)
  gdp_qoq_bps: number;   // GDP QoQ annualized in bps
  unemployment_bps: number;
};

export type PolicyAction =
  | { kind: "ISSUE"; amount: USDN; reason: string }
  | { kind: "BURN"; amount: USDN; reason: string }
  | { kind: "NOOP"; reason: string };

export type LedgerEvent =
  | { type: "MINT"; at: ISODateTime; amount: USDN; memo: string }
  | { type: "BURN"; at: ISODateTime; amount: USDN; memo: string }
  | { type: "RESERVE_SNAPSHOT"; at: ISODateTime; snapshot: ReserveSnapshot }
  | { type: "POLICY_ACTION"; at: ISODateTime; action: PolicyAction };
