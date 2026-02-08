/**
 * TIESSE Matrix Network - Node.js Server
 * Version: 3.6.000
 * Run: node server.js
 * Access: http://localhost:3000/ or http://YOUR-IP:3000/
 * 
 * Security Features (v3.5.044):
 * - bcrypt password hashing (compatible with PHP)
 * - CORS whitelist (configurable)
 * - CSRF token validation
 * - Enhanced rate limiting (IP + username)
 * - Edit lock verification on save
 * 
 * NOTE: This server is designed for INTERNAL/INTRANET use only.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Try to load bcrypt, fall back to bcryptjs if not available
let bcrypt;
try {
    bcrypt = require('bcrypt');
} catch (e) {
    try {
        bcrypt = require('bcryptjs');
    } catch (e2) {
        console.error('❌ ERROR: bcrypt or bcryptjs not installed. Run: npm install bcrypt');
        process.exit(1);
    }
}

// Load .env file if exists (simple implementation)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match && !process.env[match[1].trim()]) {
            let value = match[2].trim();
            // Remove surrounding quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            process.env[match[1].trim()] = value;
        }
    });
}

const PORT = parseInt(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Use 127.0.0.1 for local-only access
const DATA_FILE = path.join(__dirname, process.env.DATA_FILE || 'data/network_manager.json');
const LOCK_FILE = path.join(__dirname, 'data/edit.lock');
const LOCK_TIMEOUT = 300; // 5 minutes in seconds

// Authentication settings - MUST use environment variables in production!
const AUTH_USERNAME = process.env.AUTH_USERNAME || 'tiesse';
// Password hash - use bcrypt hash from .env (same format as PHP)
// Generate with: node -e "require('bcrypt').hash('yourpassword', 10).then(console.log)"
const AUTH_PASSWORD_HASH = process.env.AUTH_PASSWORD_HASH || 
    '$2y$10$e1nfIfvV2sZag1oARGD89.bG9emt6QxSQyHoreh9Ep5cFrFpgXlpm'; // Default: 'tiesse' - CHANGE IN PRODUCTION!

const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT) || 8 * 60 * 60 * 1000; // 8 hours in ms
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

// CORS Configuration - whitelist allowed origins
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
const CORS_ALLOW_ALL = process.env.CORS_ALLOW_ALL === 'true'; // Only for development!

// Validate required configuration
if (!process.env.AUTH_PASSWORD_HASH) {
    console.warn('⚠️  WARNING: AUTH_PASSWORD_HASH not set in environment.');
    console.warn('   Using default password hash. CHANGE THIS IN PRODUCTION!');
    console.warn('   Generate a hash with: node -e "require(\'bcrypt\').hash(\'yourpassword\', 10).then(console.log)"');
}

// Rate limiting for login attempts (enhanced: by IP AND username)
const loginAttempts = new Map(); // key -> { count, lastAttempt, backoffLevel }
const MAX_LOGIN_ATTEMPTS = 5;
const BASE_LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes base
const MAX_BACKOFF_LEVEL = 4; // Max 4 hours lockout

// Simple in-memory session store with CSRF tokens
const sessions = new Map();

// CSRF token store
const csrfTokens = new Map(); // sessionId -> csrfToken

// Serialize data writes to prevent concurrent file corruption
let dataWriteQueue = Promise.resolve();
function enqueueDataWrite(task) {
    dataWriteQueue = dataWriteQueue.then(task, task);
    return dataWriteQueue;
}

function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

function generateCSRFToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Get rate limit key (combination of IP and username for better protection)
function getRateLimitKey(ip, username = '') {
    return `${ip}:${username.toLowerCase()}`;
}

// Calculate lockout time with exponential backoff
function getLockoutTime(backoffLevel) {
    return BASE_LOCKOUT_TIME * Math.pow(2, Math.min(backoffLevel, MAX_BACKOFF_LEVEL));
}

// Cleanup expired sessions periodically
function cleanupExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (now - session.lastActivity > SESSION_TIMEOUT) {
            sessions.delete(sessionId);
            csrfTokens.delete(sessionId);
        }
    }
    // Also cleanup old rate limit entries
    for (const [key, data] of loginAttempts.entries()) {
        const lockoutTime = getLockoutTime(data.backoffLevel || 0);
        if (now - data.lastAttempt > lockoutTime * 2) {
            loginAttempts.delete(key);
        }
    }
}

setInterval(cleanupExpiredSessions, 30 * 60 * 1000); // every 30 minutes

function getSessionFromCookie(req) {
    const cookies = req.headers.cookie || '';
    const match = cookies.match(/session=([^;]+)/);
    if (match) {
        const sessionId = match[1];
        const session = sessions.get(sessionId);
        if (session && Date.now() - session.lastActivity < SESSION_TIMEOUT) {
            session.lastActivity = Date.now();
            return { ...session, sessionId };
        }
        if (session) {
            sessions.delete(sessionId);
            csrfTokens.delete(sessionId);
        }
    }
    return null;
}

// Validate CSRF token
function validateCSRFToken(req, sessionId) {
    const providedToken = req.headers['x-csrf-token'] || '';
    const storedToken = csrfTokens.get(sessionId);
    
    if (!storedToken || !providedToken) {
        return false;
    }
    
    // Timing-safe comparison
    try {
        const providedBuf = Buffer.from(providedToken, 'utf8');
        const storedBuf = Buffer.from(storedToken, 'utf8');
        if (providedBuf.length !== storedBuf.length) {
            return false;
        }
        return crypto.timingSafeEqual(providedBuf, storedBuf);
    } catch (e) {
        return false;
    }
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

// Get allowed CORS origin
function getCORSOrigin(req) {
    const origin = req.headers.origin || '';
    
    if (CORS_ALLOW_ALL) {
        return '*'; // Only for development!
    }
    
    if (CORS_ORIGINS.includes(origin)) {
        return origin;
    }
    
    // For same-origin requests (no Origin header)
    if (!origin) {
        return CORS_ORIGINS[0] || 'null';
    }
    
    return 'null'; // Deny
}

function sendJSON(res, statusCode, data, req = null) {
    const headers = { 
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
    };
    
    if (req) {
        headers['Access-Control-Allow-Origin'] = getCORSOrigin(req);
        headers['Access-Control-Allow-Credentials'] = 'true';
    }
    
    res.writeHead(statusCode, headers);
    res.end(JSON.stringify(data));
}

// Verify edit lock before allowing data writes
function verifyEditLock(editor) {
    if (!fs.existsSync(LOCK_FILE)) {
        return { valid: false, error: 'No edit lock active' };
    }
    
    try {
        const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
        const elapsed = Math.floor(Date.now() / 1000) - lockData.timestamp;
        
        if (elapsed > LOCK_TIMEOUT) {
            return { valid: false, error: 'Edit lock expired' };
        }
        
        if (lockData.editor !== editor) {
            return { valid: false, error: `Edit lock held by ${lockData.editor}` };
        }
        
        return { valid: true };
    } catch (e) {
        return { valid: false, error: 'Invalid lock file' };
    }
}

function handleDataRequest(req, res) {
    if (req.method === 'GET') {
        // Read data - public access
        if (!fs.existsSync(DATA_FILE)) {
            return sendJSON(res, 200, { devices: [], connections: [], nextDeviceId: 1 }, req);
        }
        try {
            const content = fs.readFileSync(DATA_FILE, 'utf8');
            const data = JSON.parse(content);
            sendJSON(res, 200, data, req);
        } catch (e) {
            if (DEBUG_MODE) console.error('Error reading data file:', e.message);
            sendJSON(res, 500, { error: 'Failed to read data file' }, req);
        }
    } else if (req.method === 'POST') {
        // Write data - requires authentication AND valid edit lock
        const session = getSessionFromCookie(req);
        
        if (!session) {
            return sendJSON(res, 401, { error: 'Authentication required', code: 'AUTH_REQUIRED' }, req);
        }
        
        // Validate CSRF token for POST requests
        if (!validateCSRFToken(req, session.sessionId)) {
            return sendJSON(res, 403, { error: 'Invalid CSRF token', code: 'CSRF_INVALID' }, req);
        }
        
        // Write data with size limit (50MB max to prevent DoS)
        const MAX_REQUEST_SIZE = 52428800; // 50MB in bytes
        let body = '';
        let requestTooLarge = false;
        
        req.on('data', chunk => {
            body += chunk;
            if (body.length > MAX_REQUEST_SIZE) {
                requestTooLarge = true;
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Payload too large. Maximum size is 50MB.' }));
                req.connection.destroy();
            }
        });
        req.on('end', async () => {
            if (requestTooLarge) return;
            
            try {
                const data = JSON.parse(body);
                
                // Verify edit lock before saving
                const lockCheck = verifyEditLock(session.username);
                if (!lockCheck.valid) {
                    return sendJSON(res, 403, { 
                        error: lockCheck.error, 
                        code: 'LOCK_INVALID' 
                    }, req);
                }
                
                // Validate structure
                if (!data.devices || !Array.isArray(data.devices)) {
                    return sendJSON(res, 400, { error: 'Invalid: missing devices array' }, req);
                }
                if (!data.connections || !Array.isArray(data.connections)) {
                    return sendJSON(res, 400, { error: 'Invalid: missing connections array' }, req);
                }
                if (typeof data.nextDeviceId !== 'number') {
                    return sendJSON(res, 400, { error: 'Invalid: missing nextDeviceId' }, req);
                }
                
                // Basic per-item validation (ids and names)
                for (let i = 0; i < data.devices.length; i++) {
                    const d = data.devices[i];
                    if (typeof d.id !== 'number' || d.id <= 0) {
                        return sendJSON(res, 400, { error: `Invalid device at index ${i}: id must be positive number` }, req);
                    }
                    if (typeof d.name !== 'string' || d.name.length === 0 || d.name.length > 255) {
                        return sendJSON(res, 400, { error: `Invalid device at index ${i}: name must be 1-255 characters` }, req);
                    }
                    if (!Array.isArray(d.ports)) {
                        return sendJSON(res, 400, { error: `Invalid device at index ${i}: ports must be an array` }, req);
                    }
                }
                for (let j = 0; j < data.connections.length; j++) {
                    const c = data.connections[j];
                    if (typeof c.from !== 'number' || c.from <= 0) {
                        return sendJSON(res, 400, { error: `Invalid connection at index ${j}: from must be positive number` }, req);
                    }
                    if (c.to !== null && c.to !== undefined && (typeof c.to !== 'number' || c.to <= 0)) {
                        return sendJSON(res, 400, { error: `Invalid connection at index ${j}: to must be positive number or null` }, req);
                    }
                }
                
                // Write to file asynchronously with serialization
                await enqueueDataWrite(async () => {
                    const tempFile = DATA_FILE + '.tmp';
                    const backupFile = DATA_FILE + '.bak';
                    await fs.promises.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
                    if (fs.existsSync(DATA_FILE)) {
                        await fs.promises.copyFile(DATA_FILE, backupFile);
                    }
                    await fs.promises.rename(tempFile, DATA_FILE);
                });
                
                sendJSON(res, 200, { ok: true }, req);
            } catch (e) {
                if (DEBUG_MODE) console.error('Error handling data POST:', e.message);
                sendJSON(res, 400, { error: 'Invalid JSON: ' + e.message }, req);
            }
        });
    } else if (req.method === 'OPTIONS') {
        // CORS preflight
        const origin = getCORSOrigin(req);
        res.writeHead(200, {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400'
        });
        res.end();
    } else {
        sendJSON(res, 405, { error: 'Method not allowed' }, req);
    }
}

// Authentication handlers
function handleAuthRequest(req, res, action) {
    const clientIP = req.socket.remoteAddress || 'unknown';
    
    if (action === 'check') {
        // Check auth status
        const session = getSessionFromCookie(req);
        const csrfToken = session ? csrfTokens.get(session.sessionId) : null;
        sendJSON(res, 200, {
            authenticated: !!session,
            user: session ? session.username : null,
            csrfToken: csrfToken // Send CSRF token on auth check
        }, req);
    } else if (action === 'login') {
        if (req.method !== 'POST') {
            return sendJSON(res, 405, { error: 'Method not allowed' }, req);
        }
        
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { username, password } = data;
                
                // Enhanced rate limiting check (by IP + username)
                const rateLimitKey = getRateLimitKey(clientIP, username);
                const attempts = loginAttempts.get(rateLimitKey);
                
                if (attempts && attempts.count >= MAX_LOGIN_ATTEMPTS) {
                    const lockoutTime = getLockoutTime(attempts.backoffLevel || 0);
                    const timeSinceLast = Date.now() - attempts.lastAttempt;
                    
                    if (timeSinceLast < lockoutTime) {
                        const remainingTime = Math.ceil((lockoutTime - timeSinceLast) / 60000);
                        return sendJSON(res, 429, { 
                            error: `Too many login attempts. Try again in ${remainingTime} minutes.`,
                            retryAfter: remainingTime
                        }, req);
                    } else {
                        // Reset count but keep backoff level
                        attempts.count = 0;
                    }
                }
                
                // Verify username first (timing-safe)
                let usernameMatch = false;
                try {
                    const userBuf = Buffer.from(username || '', 'utf8');
                    const authUserBuf = Buffer.from(AUTH_USERNAME, 'utf8');
                    
                    // Pad to same length to prevent timing leak
                    const maxLen = Math.max(userBuf.length, authUserBuf.length);
                    const paddedUser = Buffer.alloc(maxLen, 0);
                    const paddedAuth = Buffer.alloc(maxLen, 0);
                    userBuf.copy(paddedUser);
                    authUserBuf.copy(paddedAuth);
                    
                    usernameMatch = crypto.timingSafeEqual(paddedUser, paddedAuth) && 
                                   userBuf.length === authUserBuf.length;
                } catch (e) {
                    usernameMatch = false;
                }
                
                // Verify password using bcrypt (async, compatible with PHP)
                let passwordMatch = false;
                if (password) {
                    try {
                        // bcrypt.compare handles $2y$ (PHP) and $2b$ (Node) prefixes
                        passwordMatch = await bcrypt.compare(password, AUTH_PASSWORD_HASH);
                    } catch (e) {
                        if (DEBUG_MODE) console.error('bcrypt error:', e.message);
                        passwordMatch = false;
                    }
                }
                
                // Add constant delay to prevent timing attacks
                await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
                
                if (usernameMatch && passwordMatch) {
                    // Successful login - clear attempts for this key
                    loginAttempts.delete(rateLimitKey);
                    
                    const sessionId = generateSessionId();
                    const csrfToken = generateCSRFToken();
                    
                    sessions.set(sessionId, {
                        username: username,
                        loginTime: Date.now(),
                        lastActivity: Date.now(),
                        ip: clientIP
                    });
                    csrfTokens.set(sessionId, csrfToken);
                    
                    const cookieOptions = [
                        `session=${sessionId}`,
                        'Path=/',
                        'HttpOnly',
                        'SameSite=Strict'
                    ];
                    
                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Set-Cookie': cookieOptions.join('; '),
                        'Access-Control-Allow-Origin': getCORSOrigin(req),
                        'Access-Control-Allow-Credentials': 'true'
                    });
                    res.end(JSON.stringify({
                        ok: true,
                        message: 'Login successful',
                        user: username,
                        csrfToken: csrfToken // Send CSRF token on login
                    }));
                } else {
                    // Track failed login attempt with exponential backoff
                    const current = loginAttempts.get(rateLimitKey) || { 
                        count: 0, 
                        lastAttempt: 0,
                        backoffLevel: 0 
                    };
                    current.count++;
                    current.lastAttempt = Date.now();
                    
                    // Increase backoff level when max attempts reached
                    if (current.count >= MAX_LOGIN_ATTEMPTS) {
                        current.backoffLevel = Math.min(
                            (current.backoffLevel || 0) + 1, 
                            MAX_BACKOFF_LEVEL
                        );
                    }
                    
                    loginAttempts.set(rateLimitKey, current);
                    
                    const remaining = MAX_LOGIN_ATTEMPTS - current.count;
                    if (DEBUG_MODE) console.log(`Failed login from ${clientIP} for user ${username}. Attempts: ${current.count}`);
                    
                    sendJSON(res, 401, { 
                        error: 'Invalid credentials',
                        attemptsRemaining: remaining > 0 ? remaining : 0
                    }, req);
                }
            } catch (e) {
                if (DEBUG_MODE) console.error('Login error:', e.message);
                sendJSON(res, 400, { error: 'Invalid request' }, req);
            }
        });
    } else if (action === 'logout') {
        const cookies = req.headers.cookie || '';
        const match = cookies.match(/session=([^;]+)/);
        if (match) {
            sessions.delete(match[1]);
            csrfTokens.delete(match[1]);
        }
        
        const cookieOptions = [
            'session=',
            'Path=/',
            'HttpOnly',
            'SameSite=Strict',
            'Max-Age=0'
        ];
        
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Set-Cookie': cookieOptions.join('; '),
            'Access-Control-Allow-Origin': getCORSOrigin(req),
            'Access-Control-Allow-Credentials': 'true'
        });
        res.end(JSON.stringify({ ok: true, message: 'Logged out' }));
    } else {
        sendJSON(res, 400, { error: 'Invalid action' }, req);
    }
}

// Edit Lock handlers
function getLockStatus() {
    if (!fs.existsSync(LOCK_FILE)) {
        return { locked: false };
    }
    
    try {
        const data = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
        const elapsed = Math.floor(Date.now() / 1000) - data.timestamp;
        
        if (elapsed > LOCK_TIMEOUT) {
            fs.unlinkSync(LOCK_FILE);
            return { locked: false, expired: true };
        }
        
        return {
            locked: true,
            editor: data.editor,
            lockedAt: data.lockedAt,
            elapsed: elapsed,
            remaining: LOCK_TIMEOUT - elapsed
        };
    } catch (e) {
        // Corrupted lock file - remove it
        try { fs.unlinkSync(LOCK_FILE); } catch (err) {}
        return { locked: false };
    }
}

function handleEditLockRequest(req, res) {
    if (req.method === 'GET') {
        // Get lock status - public
        return sendJSON(res, 200, getLockStatus(), req);
    }
    
    if (req.method === 'POST') {
        // Require authentication for lock operations
        const session = getSessionFromCookie(req);
        if (!session) {
            return sendJSON(res, 401, { error: 'Authentication required' }, req);
        }
        
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const action = data.action;
                const editor = data.editor || session.username;
                
                if (action === 'acquire') {
                    const currentLock = getLockStatus();
                    
                    // Check if already locked by someone else
                    if (currentLock.locked && currentLock.editor !== editor) {
                        return sendJSON(res, 200, {
                            success: false,
                            error: 'edit_locked',
                            message: 'Modifica in corso da: ' + currentLock.editor,
                            lockedBy: currentLock.editor,
                            lockedAt: currentLock.lockedAt,
                            remaining: currentLock.remaining
                        }, req);
                    }
                    
                    // Acquire or refresh lock
                    const lockData = {
                        editor: editor,
                        timestamp: Math.floor(Date.now() / 1000),
                        lockedAt: new Date().toISOString()
                    };
                    
                    fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2));
                    
                    return sendJSON(res, 200, {
                        success: true,
                        message: 'Lock acquisito',
                        editor: editor,
                        timeout: LOCK_TIMEOUT
                    }, req);
                    
                } else if (action === 'release') {
                    const currentLock = getLockStatus();
                    
                    // Only the lock owner can release
                    if (currentLock.locked && currentLock.editor !== editor) {
                        return sendJSON(res, 200, {
                            success: false,
                            error: 'not_owner',
                            message: 'Non puoi rilasciare un lock di un altro utente'
                        }, req);
                    }
                    
                    if (fs.existsSync(LOCK_FILE)) {
                        fs.unlinkSync(LOCK_FILE);
                    }
                    
                    return sendJSON(res, 200, { success: true, message: 'Lock rilasciato' }, req);
                    
                } else if (action === 'heartbeat') {
                    const currentLock = getLockStatus();
                    
                    if (currentLock.locked && currentLock.editor === editor) {
                        // Refresh the lock
                        const lockData = {
                            editor: editor,
                            timestamp: Math.floor(Date.now() / 1000),
                            lockedAt: currentLock.lockedAt
                        };
                        fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2));
                        return sendJSON(res, 200, { success: true, message: 'Heartbeat received' }, req);
                    }
                    
                    return sendJSON(res, 200, { success: false, error: 'no_lock' }, req);
                    
                } else {
                    return sendJSON(res, 400, { error: 'Invalid action' }, req);
                }
            } catch (e) {
                if (DEBUG_MODE) console.error('Edit lock error:', e.message);
                sendJSON(res, 400, { error: 'Invalid request' }, req);
            }
        });
    } else if (req.method === 'OPTIONS') {
        const origin = getCORSOrigin(req);
        res.writeHead(200, {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token',
            'Access-Control-Allow-Credentials': 'true'
        });
        res.end();
    } else {
        sendJSON(res, 405, { error: 'Method not allowed' }, req);
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
        
        // Security headers for all responses
        const headers = { 
            'Content-Type': contentType,
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'SAMEORIGIN'
        };
        
        // Add CSP for HTML files
        if (ext === '.html') {
            headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;";
        }
        
        res.writeHead(200, headers);
        res.end(content);
    });
}

// Request handler
function requestHandler(req, res) {
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
    
    // Edit Lock API
    if (url === '/api/editlock.php') {
        return handleEditLockRequest(req, res);
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
}

// Create HTTP server (internal/intranet use)
const server = http.createServer(requestHandler);

server.listen(PORT, HOST, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     TIESSE Matrix Network Server v3.5.044                  ║');
    console.log('║              🏢 Internal/Intranet Use Only                 ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Local:    http://localhost:${PORT}/                          ║`);
    console.log(`║  Network:  http://<YOUR-IP>:${PORT}/                          ║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
});
