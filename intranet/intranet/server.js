/**
 * TIESSE Matrix Network - Node.js Server
 * Version: 3.1.2
 * Run: node server.js
 * Access: http://localhost:3000/ or http://YOUR-IP:3000/
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'network_manager.json');

// Authentication settings
const AUTH_USERNAME = 'tiesse';
const AUTH_PASSWORD = 'tiesseadm';
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours in ms

// Simple in-memory session store
const sessions = new Map();

function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

function getSessionFromCookie(req) {
    const cookies = req.headers.cookie || '';
    const match = cookies.match(/session=([^;]+)/);
    if (match) {
        const sessionId = match[1];
        const session = sessions.get(sessionId);
        if (session && Date.now() - session.lastActivity < SESSION_TIMEOUT) {
            session.lastActivity = Date.now();
            return session;
        }
        if (session) {
            sessions.delete(sessionId); // Expired
        }
    }
    return null;
}

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
            console.error('Error reading data file:', e.message);
            sendJSON(res, 500, { error: 'Failed to read data file: ' + e.message });
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

// Authentication handlers
function handleAuthRequest(req, res, action) {
    if (action === 'check') {
        // Check auth status
        const session = getSessionFromCookie(req);
        sendJSON(res, 200, {
            authenticated: !!session,
            user: session ? session.username : null
        });
    } else if (action === 'login') {
        if (req.method !== 'POST') {
            return sendJSON(res, 405, { error: 'Method not allowed' });
        }
        
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { username, password } = data;
                
                if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
                    const sessionId = generateSessionId();
                    sessions.set(sessionId, {
                        username: username,
                        loginTime: Date.now(),
                        lastActivity: Date.now()
                    });
                    
                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Set-Cookie': `session=${sessionId}; Path=/; HttpOnly; SameSite=Strict`
                    });
                    res.end(JSON.stringify({
                        ok: true,
                        message: 'Login successful',
                        user: username
                    }));
                } else {
                    sendJSON(res, 401, { error: 'Invalid credentials' });
                }
            } catch (e) {
                console.error('Login error:', e.message);
                sendJSON(res, 400, { error: 'Invalid request: ' + e.message });
            }
        });
    } else if (action === 'logout') {
        const cookies = req.headers.cookie || '';
        const match = cookies.match(/session=([^;]+)/);
        if (match) {
            sessions.delete(match[1]);
        }
        
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Set-Cookie': 'session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
        });
        res.end(JSON.stringify({ ok: true, message: 'Logged out' }));
    } else {
        sendJSON(res, 400, { error: 'Invalid action' });
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
    const urlParts = req.url.split('?');
    const url = urlParts[0];
    const queryString = urlParts[1] || '';
    const query = {};
    queryString.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key) query[key] = decodeURIComponent(value || '');
    });
    
    // Auth API
    if (url === '/api/auth.php') {
        return handleAuthRequest(req, res, query.action);
    }
    
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
    console.log('║     TIESSE Matrix Network Server v3.1.2            ║');
    console.log('╠════════════════════════════════════════════════════╣');
    console.log(`║  Local:    http://localhost:${PORT}/                  ║`);
    console.log('║  Network:  http://<YOUR-IP>:' + PORT + '/                  ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
});
