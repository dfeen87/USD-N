export type AttestorID = string;

export type ReserveAttestation = {
  attestor: AttestorID;
  at: string;
  total_value_usd_cents: bigint;
  signature: string; // opaque blob; protocol does not interpret
};

export interface ReserveOracle {
  latest(): Promise<ReserveAttestation>;
}
