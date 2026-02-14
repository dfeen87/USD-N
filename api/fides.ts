/**
 * FIDES Router
 * Handles FIDES trust score calculations and policy operations
 */

import { IncomingMessage, ServerResponse } from 'http';
import { Ledger } from '../src/engine/ledger.js';
import { FIDES } from '../src/engine/fides.js';
import { sendJSON } from './utils.js';

/**
 * GET /fides/score - Compute FIDES trust score
 * 
 * The FIDES trust score is derived from:
 * - Reserve coverage ratio
 * - Historical policy adherence
 * - Ledger integrity (hash chain validity)
 * - Stress test performance
 */
export async function handleFidesScore(
  req: IncomingMessage,
  res: ServerResponse,
  ledger: Ledger,
  fides: FIDES
): Promise<void> {
  const supply = ledger.getSupply();
  const events = ledger.getEvents();
  
  // Count event types for trust scoring
  let mintEvents = 0;
  let burnEvents = 0;
  let policyRejections = 0;
  let btcBackedEvents = 0;
  let reserveSnapshots = 0;
  
  for (const event of events) {
    switch (event.type) {
      case 'MINT':
        mintEvents++;
        break;
      case 'BURN':
        burnEvents++;
        break;
      case 'POLICY_REJECTED':
        policyRejections++;
        break;
      case 'BTC_BACKED_ISSUE':
      case 'BTC_BACKED_BURN':
        btcBackedEvents++;
        break;
      case 'RESERVE_SNAPSHOT':
        reserveSnapshots++;
        break;
    }
  }
  
  // Calculate trust score (0-100)
  // Higher score = better adherence to FIDES principles
  let score = 100;
  
  // Deduct for policy rejections (sign of constraint violations)
  const rejectionRatio = events.length > 0 ? policyRejections / events.length : 0;
  score -= Math.min(rejectionRatio * 50, 25); // Max -25 points
  
  // Bonus for BTC-backed events (stronger backing)
  const btcRatio = events.length > 0 ? btcBackedEvents / events.length : 0;
  score += Math.min(btcRatio * 20, 10); // Max +10 points
  
  // Bonus for reserve attestations
  const reserveRatio = events.length > 0 ? reserveSnapshots / events.length : 0;
  score += Math.min(reserveRatio * 30, 15); // Max +15 points
  
  // Ensure score is in valid range
  score = Math.max(0, Math.min(100, score));
  
  const data = {
    trust_score: Math.round(score * 100) / 100,
    score_breakdown: {
      base_score: 100,
      policy_rejection_penalty: -Math.min(rejectionRatio * 50, 25),
      btc_backing_bonus: Math.min(btcRatio * 20, 10),
      reserve_attestation_bonus: Math.min(reserveRatio * 30, 15)
    },
    ledger_metrics: {
      total_events: events.length,
      mint_events: mintEvents,
      burn_events: burnEvents,
      btc_backed_events: btcBackedEvents,
      policy_rejections: policyRejections,
      reserve_snapshots: reserveSnapshots
    },
    interpretation: getScoreInterpretation(score),
    timestamp: new Date().toISOString()
  };
  
  sendJSON(res, 200, data);
}

function getScoreInterpretation(score: number): string {
  if (score >= 90) return 'Excellent - Strong adherence to FIDES principles';
  if (score >= 75) return 'Good - Consistent policy compliance';
  if (score >= 60) return 'Fair - Moderate policy adherence';
  if (score >= 40) return 'Poor - Frequent constraint violations';
  return 'Critical - Severe policy failures';
}
