#!/usr/bin/env node

/**
 * USD-N REST API Example - Basic Usage
 * 
 * This script demonstrates basic usage of the USD-N REST API
 * including checking node status, executing policy steps, and
 * querying ledger state.
 */

const API_BASE = 'http://localhost:3000/api';

async function request(method, path, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_BASE}${path}`, options);
  return await response.json();
}

async function main() {
  console.log('USD-N REST API Example\n');
  
  // 1. Check node status
  console.log('1. Checking node status...');
  const status = await request('GET', '/status');
  console.log('   Status:', JSON.stringify(status, null, 2));
  console.log('');
  
  // 2. Reset ledger for clean test
  console.log('2. Resetting ledger...');
  await request('POST', '/ledger/reset');
  console.log('   Ledger reset successful\n');
  
  // 3. Execute a FIDES policy step
  console.log('3. Executing FIDES policy step (low CPI -> expansion)...');
  const stepResult = await request('POST', '/fides/step', {
    telemetry: {
      at: new Date().toISOString(),
      cpi_yoy_bps: 120,    // 1.20% - below target
      gdp_qoq_bps: 200,    // 2.00%
      unemployment_bps: 450 // 4.50%
    },
    reserves: {
      at: new Date().toISOString(),
      total_value_usd: 100000000, // $1,000,000 in cents
      by_asset_usd: {
        BTC: 100000000
      },
      attestation_id: 'example-attestation-1',
      btc: {
        asset: 'BTC',
        amount_btc: 10.0,
        value_usd: 100000000,
        price_snapshot: {
          price_usd: 100000,
          timestamp: Date.now(),
          source: 'example'
        }
      }
    },
    stress: {
      btc_drawdown_pct: 5,  // Low stress
      btc_volatility_pct: 3,
      timestamp: Date.now()
    }
  });
  console.log('   Result:', stepResult.success ? 'SUCCESS' : 'FAILED');
  console.log('   New Supply:', stepResult.newSupply, 'cents');
  console.log('   Events:', stepResult.events.length);
  console.log('');
  
  // 4. Issue BTC-backed USD-N
  console.log('4. Issuing BTC-backed USD-N...');
  const issueResult = await request('POST', '/fides/btc-issue', {
    reserves: {
      at: new Date().toISOString(),
      total_value_usd: 200000000,
      by_asset_usd: {
        BTC: 200000000
      },
      attestation_id: 'example-attestation-2',
      btc: {
        asset: 'BTC',
        amount_btc: 20.0,
        value_usd: 200000000,
        price_snapshot: {
          price_usd: 100000,
          timestamp: Date.now(),
          source: 'example'
        }
      }
    },
    btc_amount: 5.0,
    price_snapshot: {
      price_usd: 100000,
      timestamp: Date.now(),
      source: 'example'
    },
    proof: {
      btc_address: 'bc1qexample123',
      message: 'USD-N Reserve Proof',
      signature: 'example-signature'
    },
    memo: 'Example BTC-backed issuance'
  });
  console.log('   Result:', issueResult.success ? 'SUCCESS' : 'FAILED');
  console.log('   New Supply:', issueResult.newSupply, 'cents');
  console.log('   Issued:', Number(BigInt(issueResult.newSupply) / 100n), 'USD');
  console.log('');
  
  // 5. Get current supply
  console.log('5. Checking current supply...');
  const supply = await request('GET', '/ledger/supply');
  console.log('   Supply:', supply.supply, 'cents =', Number(BigInt(supply.supply) / 100n), 'USD');
  console.log('');
  
  // 6. Get all events
  console.log('6. Retrieving ledger events...');
  const events = await request('GET', '/ledger/events');
  console.log('   Total events:', events.count);
  console.log('   Event types:', events.events.map(e => e.type).join(', '));
  console.log('');
  
  console.log('Example completed successfully!');
}

main().catch(console.error);
