/**
 * BTC Backing Router
 * Provides Bitcoin reserve and backing ratio information
 */

import { IncomingMessage, ServerResponse } from 'http';
import { Ledger } from '../src/engine/ledger.js';
import { FIDES } from '../src/engine/fides.js';
import { sendJSON } from './utils.js';

/**
 * GET /btc/backing - Return BTC-backing ratio and reserve model
 * 
 * Calculates the Bitcoin backing ratio based on:
 * - Current USD-N supply
 * - BTC reserves from latest snapshots
 * - Historical BTC-backed issuance/burn events
 */
export async function handleBtcBacking(
  _req: IncomingMessage,
  res: ServerResponse,
  ledger: Ledger,
  _fides: FIDES
): Promise<void> {
  const supply = ledger.getSupply();
  const events = ledger.getEvents();
  
  // Track BTC reserves from events
  let totalBtcReserveUsd = 0n;
  let totalBtcAmount = 0;
  let latestBtcPrice = 0;
  let latestReserveSnapshot = null;
  let btcBackedIssuance = 0n;
  let btcBackedBurns = 0n;
  
  // Scan events for BTC-related data
  for (const event of events) {
    switch (event.type) {
      case 'RESERVE_SNAPSHOT':
        latestReserveSnapshot = event.snapshot;
        if (event.snapshot.btc) {
          totalBtcReserveUsd = event.snapshot.btc.value_usd;
          totalBtcAmount = event.snapshot.btc.amount_btc;
          latestBtcPrice = event.snapshot.btc.price_snapshot.price_usd;
        }
        break;
      case 'BTC_BACKED_ISSUE':
        btcBackedIssuance += event.amount;
        latestBtcPrice = event.price_snapshot.price_usd;
        break;
      case 'BTC_BACKED_BURN':
        btcBackedBurns += event.amount;
        latestBtcPrice = event.price_snapshot.price_usd;
        break;
    }
  }
  
  // Calculate backing ratio
  const backingRatio = supply > 0n 
    ? Number(totalBtcReserveUsd * 10000n / supply) / 100 
    : 0;
  
  // Calculate BTC-backed portion of supply
  const btcBackedSupply = btcBackedIssuance - btcBackedBurns;
  const btcBackedRatio = supply > 0n
    ? Number(btcBackedSupply * 10000n / supply) / 100
    : 0;
  
  const data = {
    backing_ratio_percent: Math.round(backingRatio * 100) / 100,
    btc_reserves: {
      total_btc: totalBtcAmount,
      value_usd_cents: totalBtcReserveUsd.toString(),
      latest_btc_price_usd: latestBtcPrice,
      last_updated: latestReserveSnapshot?.at || null
    },
    supply_breakdown: {
      total_supply_cents: supply.toString(),
      btc_backed_supply_cents: btcBackedSupply.toString(),
      btc_backed_ratio_percent: Math.round(btcBackedRatio * 100) / 100,
      other_supply_cents: (supply - btcBackedSupply).toString()
    },
    reserve_model: {
      type: 'multi-asset',
      primary_reserve: 'BTC',
      backing_requirement: '100%',
      over_collateralization: backingRatio > 100,
      reserve_coverage_status: backingRatio >= 100 ? 'adequate' : 'insufficient'
    },
    interpretation: getBackingInterpretation(backingRatio),
    timestamp: new Date().toISOString()
  };
  
  sendJSON(res, 200, data);
}

function getBackingInterpretation(ratio: number): string {
  if (ratio >= 150) return 'Strongly over-collateralized - Excellent reserve position';
  if (ratio >= 120) return 'Over-collateralized - Strong reserve buffer';
  if (ratio >= 100) return 'Fully collateralized - Adequate reserves';
  if (ratio >= 80) return 'Under-collateralized - Reserve deficit';
  if (ratio >= 50) return 'Critically under-collateralized - Severe reserve shortage';
  return 'Insufficient reserves - System at risk';
}
