import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Ledger } from './dist/engine/ledger.js';
import { FIDES } from './dist/engine/fides.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

// Global USD-N node instance
const globalLedger = new Ledger();
const globalFIDES = new FIDES(globalLedger);

// Helper to parse JSON request body
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Helper to convert numeric values to BigInt where needed
function convertToBigInt(obj, fields) {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = BigInt(result[field]);
    }
  }
  return result;
}

// Helper to convert reserves object
function prepareReserves(reserves) {
  const result = {
    ...reserves,
    total_value_usd: BigInt(reserves.total_value_usd),
    by_asset_usd: {}
  };
  
  // Convert each asset value to BigInt
  for (const [asset, value] of Object.entries(reserves.by_asset_usd || {})) {
    result.by_asset_usd[asset] = BigInt(value);
  }
  
  // Convert BTC reserve if present
  if (reserves.btc) {
    result.btc = {
      ...reserves.btc,
      value_usd: BigInt(reserves.btc.value_usd)
    };
  }
  
  return result;
}

// Helper to send JSON response
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v));
}

// API route handlers
async function handleAPI(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    sendJSON(res, 200, { ok: true });
    return;
  }

  try {
    // GET /api/status - Get node status
    if (path === '/api/status' && method === 'GET') {
      const supply = globalLedger.getSupply();
      const events = globalLedger.getEvents();
      sendJSON(res, 200, {
        status: 'online',
        supply: supply.toString(),
        totalEvents: events.length,
        latestEventHash: events.length > 0 ? events[events.length - 1].hash : 'GENESIS'
      });
      return;
    }

    // GET /api/ledger/supply - Get current supply
    if (path === '/api/ledger/supply' && method === 'GET') {
      const supply = globalLedger.getSupply();
      sendJSON(res, 200, { supply: supply.toString() });
      return;
    }

    // GET /api/ledger/events - Get all ledger events
    if (path === '/api/ledger/events' && method === 'GET') {
      const events = globalLedger.getEvents();
      sendJSON(res, 200, { events, count: events.length });
      return;
    }

    // POST /api/fides/step - Execute a FIDES policy step
    if (path === '/api/fides/step' && method === 'POST') {
      const body = await parseBody(req);
      const { telemetry, reserves, stress } = body;
      
      if (!telemetry || !reserves || !stress) {
        sendJSON(res, 400, { error: 'Missing required fields: telemetry, reserves, stress' });
        return;
      }

      const at = body.at || new Date().toISOString();
      const preparedReserves = prepareReserves(reserves);
      const events = globalFIDES.step(at, telemetry, preparedReserves, stress);
      
      sendJSON(res, 200, { 
        success: true, 
        events,
        newSupply: globalLedger.getSupply().toString()
      });
      return;
    }

    // POST /api/fides/btc-issue - Issue BTC-backed USD-N
    if (path === '/api/fides/btc-issue' && method === 'POST') {
      const body = await parseBody(req);
      const { reserves, btc_amount, price_snapshot, proof, memo } = body;
      
      if (!reserves || !btc_amount || !price_snapshot || !proof) {
        sendJSON(res, 400, { 
          error: 'Missing required fields: reserves, btc_amount, price_snapshot, proof' 
        });
        return;
      }

      const at = body.at || new Date().toISOString();
      const preparedReserves = prepareReserves(reserves);
      const events = globalFIDES.issueBtcBacked(
        at, preparedReserves, btc_amount, price_snapshot, proof, memo || 'BTC-backed issue'
      );
      
      sendJSON(res, 200, { 
        success: true, 
        events,
        newSupply: globalLedger.getSupply().toString()
      });
      return;
    }

    // POST /api/fides/btc-burn - Burn BTC-backed USD-N
    if (path === '/api/fides/btc-burn' && method === 'POST') {
      const body = await parseBody(req);
      const { reserves, amount, price_snapshot, memo } = body;
      
      if (!reserves || !amount || !price_snapshot) {
        sendJSON(res, 400, { 
          error: 'Missing required fields: reserves, amount, price_snapshot' 
        });
        return;
      }

      const at = body.at || new Date().toISOString();
      const amountBigInt = BigInt(amount);
      const preparedReserves = prepareReserves(reserves);
      const events = globalFIDES.burnBtcBacked(
        at, preparedReserves, amountBigInt, price_snapshot, memo || 'BTC-backed burn'
      );
      
      sendJSON(res, 200, { 
        success: true, 
        events,
        newSupply: globalLedger.getSupply().toString()
      });
      return;
    }

    // POST /api/ledger/reset - Reset the ledger (for testing)
    if (path === '/api/ledger/reset' && method === 'POST') {
      // Create new instances
      Object.assign(globalLedger, new Ledger());
      sendJSON(res, 200, { success: true, message: 'Ledger reset' });
      return;
    }

    // Route not found
    sendJSON(res, 404, { error: 'API endpoint not found' });
  } catch (error) {
    console.error('API Error:', error);
    sendJSON(res, 500, { 
      error: error.message || 'Internal server error',
      details: error.stack 
    });
  }
}

const server = createServer(async (req, res) => {
  const url = req.url || '/';
  
  // Route API requests
  if (url.startsWith('/api/')) {
    await handleAPI(req, res);
    return;
  }

  // Serve static files
  try {
    let filePath = url === '/' ? '/index.html' : url;
    
    // Remove query string and sanitize path
    filePath = filePath.split('?')[0];
    
    // Resolve the full path
    const resolvedPath = join(PUBLIC_DIR, filePath);
    
    // Security check: ensure the resolved path is within PUBLIC_DIR
    if (!resolvedPath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('403 Forbidden');
      return;
    }
    
    const ext = extname(resolvedPath);
    const contentType = MIME_TYPES[ext] || 'text/plain';
    
    const content = await readFile(resolvedPath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
    }
  }
});

server.listen(PORT, () => {
  console.log(`
USD-N Web Interface & REST API
==============================
Server running at http://localhost:${PORT}
  
Web Interface:
  → http://localhost:${PORT}

REST API Endpoints:
  → GET  /api/status              - Node status
  → GET  /api/ledger/supply       - Current supply
  → GET  /api/ledger/events       - All ledger events
  → POST /api/fides/step          - Execute policy step
  → POST /api/fides/btc-issue     - Issue BTC-backed USD-N
  → POST /api/fides/btc-burn      - Burn BTC-backed USD-N
  → POST /api/ledger/reset        - Reset ledger (testing)
  
Press Ctrl+C to stop the server
`);
});
