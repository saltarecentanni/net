/**
 * Simple Node.js server for Tiesse Matrix Network
 * Run: node server.js
 * Access: http://localhost:3000/ or http://YOUR-IP:3000/
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'network_manager.json');

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(data));
}

function handleDataRequest(req, res) {
    if (req.method === 'GET') {
        // Read data
        if (!fs.existsSync(DATA_FILE)) {
            return sendJSON(res, 200, { devices: [], connections: [], nextDeviceId: 1 });
        }
        try {
            const content = fs.readFileSync(DATA_FILE, 'utf8');
            const data = JSON.parse(content);
            sendJSON(res, 200, data);
        } catch (e) {
            sendJSON(res, 500, { error: 'Failed to read data file' });
        }
    } else if (req.method === 'POST') {
        // Write data
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                
                // Validate structure
                if (!data.devices || !Array.isArray(data.devices)) {
                    return sendJSON(res, 400, { error: 'Invalid: missing devices array' });
                }
                if (!data.connections || !Array.isArray(data.connections)) {
                    return sendJSON(res, 400, { error: 'Invalid: missing connections array' });
                }
                if (typeof data.nextDeviceId !== 'number') {
                    return sendJSON(res, 400, { error: 'Invalid: missing nextDeviceId' });
                }
                
                // Write to file
                fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
                sendJSON(res, 200, { ok: true });
            } catch (e) {
                sendJSON(res, 400, { error: 'Invalid JSON: ' + e.message });
            }
        });
    } else if (req.method === 'OPTIONS') {
        // CORS preflight
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
    } else {
        sendJSON(res, 405, { error: 'Method not allowed' });
    }
}

function serveStaticFile(req, res, filePath) {
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
            return;
        }
        
        const ext = path.extname(filePath);
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
}

const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    
    // Data API - support multiple endpoint variations
    if (url === '/data' || url === '/data.php' || url === 'data.php') {
        return handleDataRequest(req, res);
    }
    
    // Static files
    let filePath = path.join(__dirname, url === '/' ? 'index.html' : url);
    
    // Security: prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        return res.end('Forbidden');
    }
    
    serveStaticFile(req, res, filePath);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║     TIESSE Matrix Network Server v2.5.0            ║');
    console.log('╠════════════════════════════════════════════════════╣');
    console.log(`║  Local:    http://localhost:${PORT}/                  ║`);
    console.log('║  Network:  http://<YOUR-IP>:' + PORT + '/                  ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
});
