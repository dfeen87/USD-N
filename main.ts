/**
 * USD-N Production REST API Server
 * 
 * A production-ready REST API for the USD-N stablecoin protocol.
 * Exposes deterministic, safe, bounded endpoints for ledger operations,
 * FIDES trust scoring, and BTC backing analysis.
 * 
 * Environment Variables:
 * - USDN_ENV: Environment (production, development, test)
 * - USDN_JWT_SECRET: JWT secret for authentication (optional, auth disabled if not set)
 * - USDN_LOG_LEVEL: Logging level (info, debug, warn, error)
 * - USDN_NODE_ID: Unique node identifier
 * - PORT: Server port (default: 8080)
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Ledger } from './src/engine/ledger.js';
import { FIDES } from './src/engine/fides.js';
import { handleHealth, handleStatus } from './api/health.js';
import {
  handleLedgerState,
  handleLedgerTransactions,
  handleLedgerMint,
  handleLedgerBurn,
  handleLedgerTransfer
} from './api/ledger.js';
import { handleFidesScore } from './api/fides.js';
import { handleBtcBacking } from './api/btc.js';
import { sendJSON, checkRateLimit, getClientIdentifier, checkAuth } from './api/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration with validation
const CONFIG = {
  PORT: parseInt(process.env.PORT || '8080', 10),
  ENV: process.env.USDN_ENV || 'development',
  JWT_SECRET: process.env.USDN_JWT_SECRET || '',
  LOG_LEVEL: process.env.USDN_LOG_LEVEL || 'info',
  NODE_ID: process.env.USDN_NODE_ID || `node-${Math.random().toString(36).substring(2, 11)}`,
  VERSION: '4.1.0'
};

// Validate configuration
function validateConfig() {
  if (CONFIG.PORT < 1 || CONFIG.PORT > 65535) {
    throw new Error(`Invalid PORT: ${CONFIG.PORT}. Must be between 1 and 65535.`);
  }
  
  const validEnvs = ['production', 'development', 'test'];
  if (!validEnvs.includes(CONFIG.ENV)) {
    console.warn(`Warning: USDN_ENV '${CONFIG.ENV}' is not standard. Expected: ${validEnvs.join(', ')}`);
  }
  
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(CONFIG.LOG_LEVEL)) {
    console.warn(`Warning: USDN_LOG_LEVEL '${CONFIG.LOG_LEVEL}' is not standard. Expected: ${validLogLevels.join(', ')}`);
  }
  
  if (CONFIG.ENV === 'production' && !CONFIG.JWT_SECRET) {
    console.warn('Warning: Running in production without JWT_SECRET. Authentication is disabled.');
  }
}

// Print startup banner
function printBanner() {
  const authStatus = CONFIG.JWT_SECRET ? 'ENABLED' : 'DISABLED';
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                  USD-N REST API v${CONFIG.VERSION}                    ║
║         Bitcoin-Backed Stablecoin Simulation API              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

📋 Configuration
   Environment:      ${CONFIG.ENV}
   Node ID:          ${CONFIG.NODE_ID}
   Port:             ${CONFIG.PORT}
   Log Level:        ${CONFIG.LOG_LEVEL}
   Authentication:   ${authStatus}
   
🔧 Core Features
   ✓ Deterministic ledger operations
   ✓ FIDES trust scoring
   ✓ BTC backing analysis
   ✓ Rate limiting (100 req/min per IP)
   ✓ CORS enabled
   ✓ OpenAPI compatible
   
🚀 Starting server...
`);
}

// Global USD-N node instance
let globalLedger = new Ledger();
let globalFIDES = new FIDES(globalLedger);

const PUBLIC_DIR = join(__dirname, 'public');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

// Helper to convert reserves object with BigInt values
function prepareReserves(reserves: any): any {
  const result = {
    ...reserves,
    total_value_usd: BigInt(reserves.total_value_usd),
    by_asset_usd: {}
  };
  
  for (const [asset, value] of Object.entries(reserves.by_asset_usd || {})) {
    result.by_asset_usd[asset] = BigInt(value as string);
  }
  
  if (reserves.btc) {
    result.btc = {
      ...reserves.btc,
      value_usd: BigInt(reserves.btc.value_usd)
    };
  }
  
  return result;
}

// Helper to parse JSON request body
async function parseBody(req: IncomingMessage): Promise<any> {
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

// API route handlers
async function handleAPI(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    sendJSON(res, 200, { ok: true });
    return;
  }

  // Rate limiting
  const clientId = getClientIdentifier(req);
  if (!checkRateLimit(clientId)) {
    sendJSON(res, 429, { error: 'Rate limit exceeded. Please try again later.' });
    return;
  }

  // Authentication check for write operations (if JWT_SECRET is set)
  const isWriteOperation = method === 'POST' && !path.startsWith('/api/health') && !path.startsWith('/api/status');
  if (isWriteOperation && !checkAuth(req)) {
    sendJSON(res, 401, { error: 'Unauthorized. Valid bearer token required.' });
    return;
  }

  try {
    // Health and Status endpoints
    if (path === '/api/health' && method === 'GET') {
      return handleHealth(req, res, globalLedger, globalFIDES);
    }
    
    if (path === '/api/status' && method === 'GET') {
      return handleStatus(req, res, globalLedger, globalFIDES);
    }

    // Ledger endpoints
    if (path === '/api/ledger/state' && method === 'GET') {
      return await handleLedgerState(req, res, globalLedger, globalFIDES);
    }
    
    if (path === '/api/ledger/transactions' && method === 'GET') {
      return await handleLedgerTransactions(req, res, globalLedger, globalFIDES);
    }
    
    if (path === '/api/ledger/mint' && method === 'POST') {
      return await handleLedgerMint(req, res, globalLedger, globalFIDES);
    }
    
    if (path === '/api/ledger/burn' && method === 'POST') {
      return await handleLedgerBurn(req, res, globalLedger, globalFIDES);
    }
    
    if (path === '/api/ledger/transfer' && method === 'POST') {
      return await handleLedgerTransfer(req, res, globalLedger, globalFIDES);
    }

    // Legacy endpoints (for backwards compatibility)
    if (path === '/api/ledger/supply' && method === 'GET') {
      const supply = globalLedger.getSupply();
      sendJSON(res, 200, { supply: supply.toString() });
      return;
    }
    
    if (path === '/api/ledger/events' && method === 'GET') {
      const events = globalLedger.getEvents();
      sendJSON(res, 200, { events, count: events.length });
      return;
    }

    // FIDES endpoints
    if (path === '/api/fides/score' && method === 'GET') {
      return await handleFidesScore(req, res, globalLedger, globalFIDES);
    }
    
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

    // BTC backing endpoint
    if (path === '/api/btc/backing' && method === 'GET') {
      return await handleBtcBacking(req, res, globalLedger, globalFIDES);
    }

    // Admin endpoints
    if (path === '/api/ledger/reset' && method === 'POST') {
      globalLedger = new Ledger();
      globalFIDES = new FIDES(globalLedger);
      sendJSON(res, 200, { success: true, message: 'Ledger reset' });
      return;
    }

    // Route not found
    sendJSON(res, 404, { error: 'API endpoint not found' });
  } catch (error) {
    console.error('API Error:', error);
    const response: any = { 
      error: error instanceof Error ? error.message : 'Internal server error'
    };
    if (CONFIG.ENV !== 'production') {
      response.details = error instanceof Error ? error.stack : String(error);
    }
    sendJSON(res, 500, response);
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
    filePath = filePath.split('?')[0];
    const resolvedPath = join(PUBLIC_DIR, filePath);
    
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
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
    }
  }
});

// Start server
try {
  validateConfig();
  printBanner();
  
  server.listen(CONFIG.PORT, () => {
    console.log(`✅ Server running on port ${CONFIG.PORT}`);
    console.log(`📡 Health check: http://localhost:${CONFIG.PORT}/api/health`);
    console.log(`📊 API Status:   http://localhost:${CONFIG.PORT}/api/status`);
    console.log(`\n⏳ Ready to accept requests\n`);
  });
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}
