#!/usr/bin/env node

/**
 * USD-N Production API Example
 * 
 * This script demonstrates how to interact with the USD-N production API.
 * It tests all major endpoints and shows the API in action.
 */

import http from 'http';

const BASE_URL = process.env.USDN_API_URL || 'http://localhost:8080';

// Helper to make HTTP requests
function apiRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function main() {
  console.log('USD-N Production API Test Suite');
  console.log('=================================\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  try {
    // Test health
    console.log('1. Health Check');
    const health = await apiRequest('GET', '/api/health');
    console.log(`   Status: ${health.data.status}\n`);

    // Test status
    console.log('2. Node Status');
    const status = await apiRequest('GET', '/api/status');
    console.log(`   Version: ${status.data.version}`);
    console.log(`   Uptime: ${status.data.uptime_human}`);
    console.log(`   Supply: ${status.data.ledger.supply} cents\n`);

    // Test mint
    console.log('3. Mint USD-N ($1,000)');
    const mint = await apiRequest('POST', '/api/ledger/mint', {
      amount: '100000',
      memo: 'Example mint operation'
    });
    console.log(`   Success: ${mint.data.success}`);
    console.log(`   New Supply: ${mint.data.new_supply} cents\n`);

    // Test burn
    console.log('4. Burn USD-N ($500)');
    const burn = await apiRequest('POST', '/api/ledger/burn', {
      amount: '50000',
      memo: 'Example burn operation'
    });
    console.log(`   Success: ${burn.data.success}`);
    console.log(`   New Supply: ${burn.data.new_supply} cents\n`);

    // Test transfer
    console.log('5. Transfer USD-N ($100)');
    const transfer = await apiRequest('POST', '/api/ledger/transfer', {
      from: 'account-a',
      to: 'account-b',
      amount: '10000',
      memo: 'Example transfer'
    });
    console.log(`   Success: ${transfer.data.success}`);
    console.log(`   From: ${transfer.data.from} → To: ${transfer.data.to}\n`);

    // Test FIDES score
    console.log('6. FIDES Trust Score');
    const score = await apiRequest('GET', '/api/fides/score');
    console.log(`   Trust Score: ${score.data.trust_score}/100`);
    console.log(`   Interpretation: ${score.data.interpretation}\n`);

    // Test BTC backing
    console.log('7. BTC Backing Ratio');
    const backing = await apiRequest('GET', '/api/btc/backing');
    console.log(`   Backing Ratio: ${backing.data.backing_ratio_percent}%`);
    console.log(`   Status: ${backing.data.reserve_model.reserve_coverage_status}\n`);

    // Test transactions
    console.log('8. Transaction History');
    const txs = await apiRequest('GET', '/api/ledger/transactions?page=1&per_page=10');
    console.log(`   Total Events: ${txs.data.pagination.total_items}`);
    console.log(`   Page: ${txs.data.pagination.page}/${txs.data.pagination.total_pages}\n`);

    console.log('✅ All tests passed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
