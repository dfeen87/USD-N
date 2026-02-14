import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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

const server = createServer(async (req, res) => {
  try {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    
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
USD-N Web Interface
===================
Server running at http://localhost:${PORT}
  
Access the protocol demonstration at:
  → http://localhost:${PORT}
  
Press Ctrl+C to stop the server
`);
});
