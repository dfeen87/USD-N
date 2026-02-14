/**
 * API Utilities
 * Common helper functions for API handlers
 */

import { IncomingMessage, ServerResponse } from 'http';

/**
 * Parse JSON request body
 */
export async function parseBody(req: IncomingMessage): Promise<any> {
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

/**
 * Send JSON response with CORS headers
 */
export function sendJSON(res: ServerResponse, statusCode: number, data: any): void {
  res.writeHead(statusCode, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v));
}

/**
 * Simple rate limiter (in-memory)
 * Returns true if request should be allowed
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute

export function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  entry.count++;
  return true;
}

/**
 * Extract client identifier for rate limiting
 */
export function getClientIdentifier(req: IncomingMessage): string {
  // Use X-Forwarded-For if behind proxy, otherwise use socket address
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Verify JWT token (if JWT auth is enabled)
 * For now, this is a placeholder - JWT auth is optional and off by default
 */
export function verifyJWT(token: string): boolean {
  const jwtSecret = process.env.USDN_JWT_SECRET;
  
  // If no JWT secret is configured, JWT auth is disabled
  if (!jwtSecret) {
    return true;
  }
  
  // TODO: Implement proper JWT verification when needed
  // For now, just check if token matches secret (simple bearer token)
  return token === jwtSecret;
}

/**
 * Extract and verify authorization header
 */
export function checkAuth(req: IncomingMessage): boolean {
  const jwtSecret = process.env.USDN_JWT_SECRET;
  
  // If no JWT secret is configured, auth is disabled
  if (!jwtSecret) {
    return true;
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return false;
  }
  
  // Handle both string and array types
  const authHeaderStr = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const parts = authHeaderStr.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return false;
  }
  
  return verifyJWT(parts[1]);
}
