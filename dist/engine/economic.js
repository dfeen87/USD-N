export async function resolveReserves(oracle) {
    const attestation = await oracle.latest();
    return {
        at: attestation.at,
        total_value_usd: attestation.total_value_usd_cents,
        by_asset_usd: {
            UST: attestation.total_value_usd_cents,
            GOLD: 0n,
            ENERGY: 0n,
            COMMODITY: 0n,
            BTC: 0n
        },
        attestation_id: attestation.signature
    };
}
