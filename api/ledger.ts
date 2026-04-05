/**
 * Ledger Router
 * Handles ledger state queries and monetary operations
 */

import { IncomingMessage, ServerResponse } from 'http';
import { Ledger } from '../src/engine/ledger.js';
import { FIDES } from '../src/engine/fides.js';
import { parseBody, sendJSON } from './utils.js';

// Maximum amounts for bounded operations (in cents)
const MAX_MINT_AMOUNT = 1_000_000_00n; // $1M max mint per operation
const MAX_BURN_AMOUNT = 1_000_000_00n; // $1M max burn per operation
const MAX_TRANSFER_AMOUNT = 100_000_00n; // $100K max transfer per operation

/**
 * GET /ledger/state - Get full ledger state snapshot
 */
export async function handleLedgerState(
  _req: IncomingMessage,
  res: ServerResponse,
  ledger: Ledger,
  _fides: FIDES
): Promise<void> {
  const supply = ledger.getSupply();
  const events = ledger.getEvents();
  
  const data = {
    supply: supply.toString(),
    total_events: events.length,
    latest_event_hash: events.length > 0 ? events[events.length - 1].hash : 'GENESIS',
    timestamp: new Date().toISOString()
  };
  
  sendJSON(res, 200, data);
}

/**
 * GET /ledger/transactions - Get paginated transaction history
 */
export async function handleLedgerTransactions(
  req: IncomingMessage,
  res: ServerResponse,
  ledger: Ledger,
  _fides: FIDES
): Promise<void> {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const perPage = Math.min(parseInt(url.searchParams.get('per_page') || '50', 10), 100);
  
  if (page < 1 || perPage < 1) {
    sendJSON(res, 400, { error: 'Invalid pagination parameters' });
    return;
  }
  
  const events = ledger.getEvents();
  const total = events.length;
  const totalPages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  const end = Math.min(start + perPage, total);
  const pageEvents = events.slice(start, end);
  
  const data = {
    transactions: pageEvents,
    pagination: {
      page,
      per_page: perPage,
      total_items: total,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1
    }
  };
  
  sendJSON(res, 200, data);
}

/**
 * POST /ledger/mint - Mint USD-N (bounded, safe, deterministic)
 */
export async function handleLedgerMint(
  req: IncomingMessage,
  res: ServerResponse,
  ledger: Ledger,
  _fides: FIDES
): Promise<void> {
  try {
    const body = await parseBody(req);
    const { amount, memo } = body;
    
    if (!amount || !memo) {
      sendJSON(res, 400, { error: 'Missing required fields: amount, memo' });
      return;
    }
    
    const amountBigInt = BigInt(amount);
    
    // Validate bounds
    if (amountBigInt <= 0n) {
      sendJSON(res, 400, { error: 'Amount must be positive' });
      return;
    }
    
    if (amountBigInt > MAX_MINT_AMOUNT) {
      sendJSON(res, 400, { 
        error: `Amount exceeds maximum mint limit of ${MAX_MINT_AMOUNT.toString()} cents` 
      });
      return;
    }
    
    const at = body.at || new Date().toISOString();
    ledger.mint(at, amountBigInt, memo);
    
    sendJSON(res, 200, {
      success: true,
      amount: amountBigInt.toString(),
      new_supply: ledger.getSupply().toString(),
      timestamp: at
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendJSON(res, 500, { error: message });
  }
}

/**
 * POST /ledger/burn - Burn USD-N (bounded, safe, deterministic)
 */
export async function handleLedgerBurn(
  req: IncomingMessage,
  res: ServerResponse,
  ledger: Ledger,
  _fides: FIDES
): Promise<void> {
  try {
    const body = await parseBody(req);
    const { amount, memo } = body;
    
    if (!amount || !memo) {
      sendJSON(res, 400, { error: 'Missing required fields: amount, memo' });
      return;
    }
    
    const amountBigInt = BigInt(amount);
    
    // Validate bounds
    if (amountBigInt <= 0n) {
      sendJSON(res, 400, { error: 'Amount must be positive' });
      return;
    }
    
    if (amountBigInt > MAX_BURN_AMOUNT) {
      sendJSON(res, 400, { 
        error: `Amount exceeds maximum burn limit of ${MAX_BURN_AMOUNT.toString()} cents` 
      });
      return;
    }
    
    const currentSupply = ledger.getSupply();
    if (amountBigInt > currentSupply) {
      sendJSON(res, 400, { 
        error: `Burn amount exceeds current supply (${currentSupply.toString()})` 
      });
      return;
    }
    
    const at = body.at || new Date().toISOString();
    ledger.burn(at, amountBigInt, memo);
    
    sendJSON(res, 200, {
      success: true,
      amount: amountBigInt.toString(),
      new_supply: ledger.getSupply().toString(),
      timestamp: at
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendJSON(res, 500, { error: message });
  }
}

/**
 * POST /ledger/transfer - Transfer USD-N between accounts
 * Note: This is a simulation endpoint as the core ledger tracks supply, not accounts
 */
export async function handleLedgerTransfer(
  req: IncomingMessage,
  res: ServerResponse,
  ledger: Ledger,
  _fides: FIDES
): Promise<void> {
  try {
    const body = await parseBody(req);
    const { from, to, amount, memo } = body;
    
    if (!from || !to || !amount) {
      sendJSON(res, 400, { error: 'Missing required fields: from, to, amount' });
      return;
    }
    
    const amountBigInt = BigInt(amount);
    
    // Validate bounds
    if (amountBigInt <= 0n) {
      sendJSON(res, 400, { error: 'Amount must be positive' });
      return;
    }
    
    if (amountBigInt > MAX_TRANSFER_AMOUNT) {
      sendJSON(res, 400, { 
        error: `Amount exceeds maximum transfer limit of ${MAX_TRANSFER_AMOUNT.toString()} cents` 
      });
      return;
    }
    
    const at = body.at || new Date().toISOString();
    
    // Record as a ledger event (informational)
    // In a real implementation, this would involve account balances
    ledger.record({
      type: 'POLICY_ACTION',
      at,
      action: {
        kind: 'NOOP',
        reason: `Transfer: ${from} → ${to}, amount: ${amountBigInt.toString()}, memo: ${memo || 'transfer'}`
      }
    });
    
    sendJSON(res, 200, {
      success: true,
      from,
      to,
      amount: amountBigInt.toString(),
      timestamp: at,
      note: 'Transfer recorded as ledger event. Core ledger tracks supply, not individual accounts.'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendJSON(res, 500, { error: message });
  }
}
