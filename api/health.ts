/**
 * Health and Status Router
 * Provides system health checks and node status information
 */

import { IncomingMessage, ServerResponse } from 'http';
import { Ledger } from '../src/engine/ledger.js';
import { FIDES } from '../src/engine/fides.js';

const startTime = Date.now();
const VERSION = '4.1.0';

/**
 * GET /health - Basic health check
 */
export function handleHealth(
  _req: IncomingMessage,
  res: ServerResponse,
  _ledger: Ledger,
  _fides: FIDES
): void {
  const data = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'USD-N REST API'
  };
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * GET /status - Detailed node status
 */
export function handleStatus(
  _req: IncomingMessage,
  res: ServerResponse,
  ledger: Ledger,
  _fides: FIDES
): void {
  const supply = ledger.getSupply();
  const events = ledger.getEvents();
  const uptime = Date.now() - startTime;
  
  const data = {
    status: 'online',
    version: VERSION,
    uptime_ms: uptime,
    uptime_human: formatUptime(uptime),
    config: {
      environment: process.env.USDN_ENV || 'development',
      node_id: process.env.USDN_NODE_ID || 'default-node',
      log_level: process.env.USDN_LOG_LEVEL || 'info'
    },
    ledger: {
      supply: supply.toString(),
      total_events: events.length,
      latest_event_hash: events.length > 0 ? events[events.length - 1].hash : 'GENESIS'
    },
    timestamp: new Date().toISOString()
  };
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
