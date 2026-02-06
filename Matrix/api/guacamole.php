<?php
/**
 * Guacamole API Proxy v3.6.019
 * Full integration with Guacamole REST API
 * 
 * Features:
 * - Input validation and sanitization
 * - Retry logic for failed requests
 * - Token caching (session-based)
 * - Configurable timeouts
 * - Structured error handling
 * - Rate limiting protection
 * - Health check endpoint
 * 
 * Usage: POST /api/guacamole.php
 * Body: { "action": "connect", "ip": "10.10.x.x", "protocol": "ssh", "deviceName": "Switch-1" }
 */

// ============================================
// CONSTANTS
// ============================================
define('GUAC_VERSION', '3.6.020');
define('GUAC_MAX_RETRIES', 3);
define('GUAC_RETRY_DELAY_MS', 300);
define('GUAC_DEFAULT_TIMEOUT', 30);
define('GUAC_CONNECT_TIMEOUT', 10);
define('GUAC_TOKEN_CACHE_KEY', 'guac_auth_token');
define('GUAC_TOKEN_EXPIRY', 300); // 5 minutes
define('GUAC_RATE_LIMIT_REQUESTS', 60);
define('GUAC_RATE_LIMIT_WINDOW', 60); // 1 minute

// ============================================
// CORS & HEADERS
// ============================================
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('X-Guac-Proxy-Version: ' . GUAC_VERSION);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit(0);
}

// Enable error logging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// ============================================
// ERROR CODES ENUM
// ============================================
class GuacError {
    const CONFIG_NOT_FOUND = ['code' => 'CONFIG_001', 'message' => 'Configuration file not found', 'http' => 500];
    const CONFIG_INVALID = ['code' => 'CONFIG_002', 'message' => 'Invalid configuration file', 'http' => 500];
    const CONFIG_DISABLED = ['code' => 'CONFIG_003', 'message' => 'Guacamole integration is disabled', 'http' => 503];
    const AUTH_FAILED = ['code' => 'AUTH_001', 'message' => 'Guacamole authentication failed', 'http' => 401];
    const AUTH_EXPIRED = ['code' => 'AUTH_002', 'message' => 'Authentication token expired', 'http' => 401];
    const INVALID_IP = ['code' => 'INPUT_001', 'message' => 'Invalid IP address or hostname', 'http' => 400];
    const INVALID_PROTOCOL = ['code' => 'INPUT_002', 'message' => 'Invalid protocol', 'http' => 400];
    const INVALID_ACTION = ['code' => 'INPUT_003', 'message' => 'Invalid action', 'http' => 400];
    const MISSING_IP = ['code' => 'INPUT_004', 'message' => 'IP address is required', 'http' => 400];
    const CONNECTION_FAILED = ['code' => 'CONN_001', 'message' => 'Failed to create connection', 'http' => 500];
    const CONNECTION_NOT_FOUND = ['code' => 'CONN_002', 'message' => 'Connection not found', 'http' => 404];
    const SERVER_UNREACHABLE = ['code' => 'NET_001', 'message' => 'Guacamole server unreachable', 'http' => 503];
    const SERVER_ERROR = ['code' => 'NET_002', 'message' => 'Guacamole server error', 'http' => 502];
    const RATE_LIMITED = ['code' => 'RATE_001', 'message' => 'Too many requests, please wait', 'http' => 429];
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Log message with timestamp and level
 */
function guacLog($level, $message, $context = []) {
    $timestamp = date('Y-m-d H:i:s');
    $contextStr = !empty($context) ? ' | ' . json_encode($context, JSON_UNESCAPED_SLASHES) : '';
    error_log("[Guac-$level][$timestamp] $message$contextStr");
}

/**
 * Send JSON error response and exit
 */
function sendError($error, $detail = null, $extra = []) {
    $httpCode = is_array($error) ? ($error['http'] ?? 500) : 500;
    http_response_code($httpCode);
    
    $response = [
        'success' => false,
        'error' => is_array($error) ? $error['message'] : $error,
        'errorCode' => is_array($error) ? $error['code'] : 'UNKNOWN',
        'version' => GUAC_VERSION
    ];
    
    if ($detail !== null) {
        $response['detail'] = $detail;
    }
    
    $response = array_merge($response, $extra);
    
    guacLog('ERROR', $response['error'], ['code' => $response['errorCode'], 'detail' => $detail]);
    
    echo json_encode($response, JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Send JSON success response and exit
 */
function sendSuccess($data) {
    http_response_code(200);
    $response = array_merge(['success' => true, 'version' => GUAC_VERSION], $data);
    echo json_encode($response, JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Validate IPv4/IPv6 address or hostname
 */
function isValidHost($host) {
    if (empty($host)) return false;
    
    // Check IPv4
    if (filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) return true;
    
    // Check IPv6
    if (filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) return true;
    
    // Check valid hostname (FQDN)
    if (preg_match('/^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/', $host)) {
        return true;
    }
    
    return false;
}

/**
 * Validate protocol
 */
function isValidProtocol($protocol) {
    return in_array(strtolower($protocol), ['ssh', 'rdp', 'vnc', 'telnet']);
}

/**
 * Sanitize string input - remove dangerous characters
 */
function sanitizeString($str, $maxLength = 255) {
    if (!is_string($str)) return '';
    $str = trim($str);
    $str = strip_tags($str);
    // Allow alphanumeric, spaces, dots, dashes, parentheses, underscores
    $str = preg_replace('/[^\w\s\.\-\(\)\_@]/', '', $str);
    return mb_substr($str, 0, $maxLength);
}

/**
 * Simple rate limiting using file-based tracking
 */
function checkRateLimit() {
    $clientIP = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $rateLimitFile = sys_get_temp_dir() . '/guac_rate_' . md5($clientIP . '_' . date('Ymd'));
    
    $data = ['count' => 0, 'window_start' => time()];
    
    if (file_exists($rateLimitFile)) {
        $content = @file_get_contents($rateLimitFile);
        if ($content) {
            $data = json_decode($content, true) ?: $data;
        }
    }
    
    // Reset window if expired
    if (time() - $data['window_start'] > GUAC_RATE_LIMIT_WINDOW) {
        $data = ['count' => 0, 'window_start' => time()];
    }
    
    $data['count']++;
    @file_put_contents($rateLimitFile, json_encode($data), LOCK_EX);
    
    return $data['count'] <= GUAC_RATE_LIMIT_REQUESTS;
}

/**
 * Get cached token if still valid
 */
function getCachedToken() {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        @session_start();
    }
    
    $cacheKey = GUAC_TOKEN_CACHE_KEY;
    if (isset($_SESSION[$cacheKey]) && is_array($_SESSION[$cacheKey])) {
        $cached = $_SESSION[$cacheKey];
        if (isset($cached['expires']) && time() < $cached['expires']) {
            guacLog('DEBUG', 'Using cached authentication token');
            return $cached;
        }
    }
    return null;
}

/**
 * Cache authentication token
 */
function cacheToken($token, $dataSource, $username) {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        @session_start();
    }
    
    $_SESSION[GUAC_TOKEN_CACHE_KEY] = [
        'token' => $token,
        'dataSource' => $dataSource,
        'username' => $username,
        'expires' => time() + GUAC_TOKEN_EXPIRY
    ];
    
    guacLog('DEBUG', 'Cached new authentication token', ['expires_in' => GUAC_TOKEN_EXPIRY]);
}

/**
 * Clear cached token
 */
function clearCachedToken() {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        @session_start();
    }
    unset($_SESSION[GUAC_TOKEN_CACHE_KEY]);
}

// ============================================
// LOAD CONFIGURATION
// ============================================
$configFile = __DIR__ . '/../config/guacamole.json';

if (!file_exists($configFile)) {
    guacLog('ERROR', 'Config file not found', ['path' => $configFile]);
    sendError(GuacError::CONFIG_NOT_FOUND, null, ['path' => $configFile]);
}

$configContent = @file_get_contents($configFile);
if ($configContent === false) {
    sendError(GuacError::CONFIG_NOT_FOUND, 'Cannot read configuration file');
}

$config = json_decode($configContent, true);
if (!$config || !is_array($config)) {
    guacLog('ERROR', 'Invalid JSON in config file');
    sendError(GuacError::CONFIG_INVALID, 'JSON parse error');
}

// Check if enabled
if (isset($config['enabled']) && !$config['enabled']) {
    sendError(GuacError::CONFIG_DISABLED);
}

// Extract server settings with backward compatibility
$baseUrl = rtrim(
    $config['server']['baseUrl'] ?? $config['baseUrl'] ?? 'http://localhost:8080/guacamole',
    '/'
);
$apiUrl = $baseUrl . '/api';

// Admin credentials - for creating/managing connections
$username = $config['credentials']['username'] ?? $config['username'] ?? 'guacadmin';
$password = $config['credentials']['password'] ?? $config['password'] ?? 'guacadmin';

// Viewer credentials - for opening connections (no admin access)
// Falls back to admin credentials if not configured
$viewerUsername = $config['viewerCredentials']['username'] ?? $username;
$viewerPassword = $config['viewerCredentials']['password'] ?? $password;

$timeout = $config['timeout'] ?? GUAC_DEFAULT_TIMEOUT;

// ============================================
// RATE LIMITING CHECK
// ============================================
if (!checkRateLimit()) {
    $clientIP = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    guacLog('WARN', 'Rate limit exceeded', ['ip' => $clientIP]);
    sendError(GuacError::RATE_LIMITED, 'Please wait before making more requests');
}

// ============================================
// GET INPUT PARAMETERS
// ============================================
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true) ?? [];

// Support both GET and POST parameters
$action = strtolower($_GET['action'] ?? $input['action'] ?? 'status');
$protocol = strtolower($_GET['protocol'] ?? $input['protocol'] ?? 'ssh');
$ip = trim($_GET['ip'] ?? $input['ip'] ?? $input['hostname'] ?? '');
$deviceName = sanitizeString($_GET['deviceName'] ?? $input['deviceName'] ?? 'Matrix Device', 100);
$debug = isset($_GET['debug']) || (!empty($input['debug']) && $input['debug']);

// Validate action
$validActions = ['status', 'connect', 'health', 'version', 'test'];
if (!in_array($action, $validActions)) {
    sendError(GuacError::INVALID_ACTION, 'Valid actions: ' . implode(', ', $validActions));
}

// ============================================
// HTTP REQUEST FUNCTION WITH RETRY
// ============================================

/**
 * Make HTTP request to Guacamole API with retry logic
 */
function guacRequest($url, $method = 'GET', $data = null, $token = null, $retries = null) {
    global $timeout;
    
    if ($retries === null) {
        $retries = GUAC_MAX_RETRIES;
    }
    
    $attempt = 0;
    $lastResult = null;
    
    while ($attempt < $retries) {
        $attempt++;
        
        $ch = curl_init();
        
        // Build URL with token
        $fullUrl = $url;
        if ($token) {
            $separator = (strpos($url, '?') === false) ? '?' : '&';
            $fullUrl .= $separator . 'token=' . urlencode($token);
        }
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $fullUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => GUAC_CONNECT_TIMEOUT,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 3,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_ENCODING => '', // Accept any encoding
        ]);
        
        $headers = ['Accept: application/json'];
        
        if ($method === 'POST' || $method === 'PUT') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
            
            if (is_array($data)) {
                $headers[] = 'Content-Type: application/json';
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            } else {
                $headers[] = 'Content-Type: application/x-www-form-urlencoded';
                curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
            }
        } elseif ($method === 'DELETE') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        }
        
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        $errno = curl_errno($ch);
        $totalTime = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
        curl_close($ch);
        
        $lastResult = [
            'code' => $httpCode,
            'body' => $response,
            'error' => $error,
            'errno' => $errno,
            'data' => @json_decode($response, true),
            'attempt' => $attempt,
            'time' => round($totalTime, 3)
        ];
        
        // Success (2xx) or client error (4xx) - don't retry
        if ($httpCode >= 200 && $httpCode < 500) {
            if ($httpCode >= 200 && $httpCode < 300) {
                guacLog('DEBUG', "Request successful", ['url' => $url, 'code' => $httpCode, 'time' => $totalTime]);
            }
            return $lastResult;
        }
        
        // Server error (5xx) or network error - retry with exponential backoff
        if ($attempt < $retries) {
            $delay = GUAC_RETRY_DELAY_MS * $attempt;
            guacLog('WARN', "Request failed, retrying in {$delay}ms", [
                'url' => $url,
                'attempt' => $attempt,
                'code' => $httpCode,
                'error' => $error ?: 'HTTP ' . $httpCode
            ]);
            usleep($delay * 1000);
        }
    }
    
    guacLog('ERROR', "Request failed after $retries attempts", [
        'url' => $url,
        'lastCode' => $lastResult['code'] ?? 0,
        'lastError' => $lastResult['error'] ?? 'unknown'
    ]);
    
    return $lastResult;
}

// ============================================
// GUACAMOLE API FUNCTIONS
// ============================================

/**
 * Authenticate with Guacamole (with caching)
 */
function authenticate($apiUrl, $username, $password, $useCache = true) {
    // Try cached token first
    if ($useCache) {
        $cached = getCachedToken();
        if ($cached) {
            return $cached;
        }
    }
    
    guacLog('INFO', 'Authenticating with Guacamole', ['user' => $username]);
    
    $authData = 'username=' . urlencode($username) . '&password=' . urlencode($password);
    $result = guacRequest($apiUrl . '/tokens', 'POST', $authData, null, 2);
    
    if ($result['code'] === 200 && isset($result['data']['authToken'])) {
        $auth = [
            'token' => $result['data']['authToken'],
            'dataSource' => $result['data']['dataSource'] ?? 'postgresql',
            'username' => $result['data']['username'] ?? $username
        ];
        
        // Cache the token
        cacheToken($auth['token'], $auth['dataSource'], $auth['username']);
        
        guacLog('INFO', 'Authentication successful', ['dataSource' => $auth['dataSource']]);
        return $auth;
    }
    
    guacLog('ERROR', 'Authentication failed', ['code' => $result['code'], 'body' => substr($result['body'] ?? '', 0, 200)]);
    
    // Clear any stale cached token
    clearCachedToken();
    
    return null;
}

/**
 * Find existing connection by hostname/protocol OR by exact name
 */
function findConnection($apiUrl, $token, $dataSource, $hostname, $protocol, $exactName = null) {
    $result = guacRequest(
        $apiUrl . '/session/data/' . $dataSource . '/connections',
        'GET',
        null,
        $token
    );
    
    if ($result['code'] !== 200 || !is_array($result['data'])) {
        guacLog('WARN', 'Failed to get connections list', ['code' => $result['code']]);
        return null;
    }
    
    $exactNameUpper = $exactName ? strtoupper(trim($exactName)) : null;
    $protocolLower = strtolower($protocol);
    
    foreach ($result['data'] as $id => $conn) {
        $connName = $conn['name'] ?? '';
        $connNameUpper = strtoupper($connName);
        $connProtocol = strtolower($conn['protocol'] ?? '');
        
        // Priority 1: Exact name match
        if ($exactNameUpper && $connNameUpper === $exactNameUpper) {
            guacLog('DEBUG', 'Found connection by exact name', ['name' => $connName, 'id' => $id]);
            return [
                'identifier' => $conn['identifier'] ?? $id,
                'name' => $connName,
                'protocol' => $conn['protocol'] ?? ''
            ];
        }
        
        // Priority 2: Protocol matches and name contains hostname
        if ($connProtocol === $protocolLower) {
            // Check if connection name contains the IP/hostname
            if (stripos($connName, $hostname) !== false) {
                guacLog('DEBUG', 'Found connection by hostname in name', ['name' => $connName, 'hostname' => $hostname]);
                return [
                    'identifier' => $conn['identifier'] ?? $id,
                    'name' => $connName,
                    'protocol' => $conn['protocol'] ?? ''
                ];
            }
            
            // Check by hostname in parameters (requires additional API call)
            $params = $conn['parameters'] ?? [];
            if (isset($params['hostname']) && $params['hostname'] === $hostname) {
                guacLog('DEBUG', 'Found connection by hostname in params', ['name' => $connName, 'hostname' => $hostname]);
                return [
                    'identifier' => $conn['identifier'] ?? $id,
                    'name' => $connName,
                    'protocol' => $conn['protocol'] ?? ''
                ];
            }
        }
    }
    
    return null;
}

/**
 * Get connection parameters based on protocol and config
 */
function getConnectionParams($protocol, $hostname, $config) {
    $defaults = $config['defaults'][$protocol] ?? [];
    
    // Default ports
    $defaultPorts = [
        'ssh' => 22,
        'telnet' => 23,
        'rdp' => 3389,
        'vnc' => 5900
    ];
    $port = $defaults['port'] ?? $defaultPorts[$protocol] ?? 22;
    
    $params = [
        'hostname' => $hostname,
        'port' => (string)$port
    ];
    
    switch ($protocol) {
        case 'ssh':
        case 'telnet':
            $params['color-scheme'] = $defaults['colorScheme'] ?? 'green-black';
            $params['font-size'] = (string)($defaults['fontSize'] ?? 14);
            $params['terminal-width'] = (string)($defaults['terminalWidth'] ?? 100);
            $params['terminal-height'] = (string)($defaults['terminalHeight'] ?? 30);
            
            // Optional scrollback
            if (isset($defaults['scrollbackSize'])) {
                $params['scrollback'] = (string)$defaults['scrollbackSize'];
            }
            break;
            
        case 'rdp':
            $params['security'] = $defaults['security'] ?? 'any';
            $params['ignore-cert'] = ($defaults['ignoreCert'] ?? true) ? 'true' : 'false';
            $params['width'] = (string)($defaults['width'] ?? 1920);
            $params['height'] = (string)($defaults['height'] ?? 1080);
            $params['color-depth'] = (string)($defaults['colorDepth'] ?? 24);
            $params['enable-wallpaper'] = ($defaults['enableWallpaper'] ?? false) ? 'true' : 'false';
            $params['enable-font-smoothing'] = ($defaults['enableFontSmoothing'] ?? true) ? 'true' : 'false';
            break;
            
        case 'vnc':
            $params['color-depth'] = (string)($defaults['colorDepth'] ?? 24);
            if (isset($defaults['password'])) {
                $params['password'] = $defaults['password'];
            }
            break;
    }
    
    return $params;
}

/**
 * Update existing connection parameters
 */
function updateConnection($apiUrl, $token, $dataSource, $identifier, $name, $protocol, $hostname, $config) {
    $params = getConnectionParams($protocol, $hostname, $config);
    
    $connectionData = [
        'parentIdentifier' => 'ROOT',
        'name' => $name,
        'identifier' => $identifier,
        'protocol' => $protocol,
        'parameters' => $params,
        'attributes' => [
            'max-connections' => '',
            'max-connections-per-user' => ''
        ]
    ];
    
    $result = guacRequest(
        $apiUrl . '/session/data/' . $dataSource . '/connections/' . $identifier,
        'PUT',
        $connectionData,
        $token
    );
    
    $success = ($result['code'] === 200 || $result['code'] === 204);
    guacLog($success ? 'INFO' : 'WARN', "Update connection: " . ($success ? 'success' : 'failed'), [
        'id' => $identifier,
        'code' => $result['code']
    ]);
    
    return $success;
}

/**
 * Create new connection
 */
function createConnection($apiUrl, $token, $dataSource, $name, $protocol, $hostname, $config, &$errorDetail = null) {
    $params = getConnectionParams($protocol, $hostname, $config);
    
    $connectionData = [
        'parentIdentifier' => 'ROOT',
        'name' => $name,
        'protocol' => $protocol,
        'parameters' => $params,
        'attributes' => [
            'max-connections' => '',
            'max-connections-per-user' => ''
        ]
    ];
    
    guacLog('INFO', 'Creating connection', ['name' => $name, 'protocol' => $protocol, 'hostname' => $hostname]);
    
    $result = guacRequest(
        $apiUrl . '/session/data/' . $dataSource . '/connections',
        'POST',
        $connectionData,
        $token
    );
    
    // Success: 200 or 201
    if (($result['code'] === 200 || $result['code'] === 201) && isset($result['data']['identifier'])) {
        guacLog('INFO', 'Connection created successfully', ['id' => $result['data']['identifier']]);
        return [
            'identifier' => $result['data']['identifier'],
            'name' => $result['data']['name'] ?? $name,
            'protocol' => $protocol
        ];
    }
    
    // Build detailed error message
    $errorParts = ["HTTP " . $result['code']];
    
    if (isset($result['data']['message'])) {
        $errorParts[] = $result['data']['message'];
    } elseif ($result['body']) {
        $errorParts[] = substr($result['body'], 0, 200);
    }
    
    if ($result['error']) {
        $errorParts[] = "(cURL: " . $result['error'] . ")";
    }
    
    $errorDetail = implode(' - ', $errorParts);
    guacLog('ERROR', 'Failed to create connection', ['error' => $errorDetail]);
    
    return null;
}

/**
 * Build client URL for connection (with token for auto-login)
 */
function buildClientUrl($baseUrl, $identifier, $dataSource, $protocol, $token) {
    // Guacamole client URL format: /#/client/{encoded}?token={token}
    // Where encoded = base64url(identifier + NUL + "c" + NUL + dataSource)
    $clientId = $identifier . "\0" . "c" . "\0" . $dataSource;
    $encoded = base64_encode($clientId);
    
    // Make URL-safe base64
    $encoded = str_replace(['+', '/'], ['-', '_'], $encoded);
    $encoded = rtrim($encoded, '=');
    
    // Include token for automatic authentication (bypasses login page)
    return $baseUrl . '/#/client/' . $encoded . '?token=' . urlencode($token);
}

// ============================================
// MAIN LOGIC
// ============================================

try {
    // Action: version - just return version info
    if ($action === 'version') {
        sendSuccess([
            'version' => GUAC_VERSION,
            'php' => PHP_VERSION,
            'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
        ]);
    }
    
    // Action: health - quick health check
    if ($action === 'health') {
        $curlEnabled = function_exists('curl_init');
        $configOk = !empty($baseUrl) && !empty($username);
        
        sendSuccess([
            'healthy' => $curlEnabled && $configOk,
            'checks' => [
                'curl' => $curlEnabled,
                'config' => $configOk,
                'baseUrl' => $baseUrl
            ]
        ]);
    }
    
    // Action: status - check Guacamole connectivity
    if ($action === 'status') {
        $auth = authenticate($apiUrl, $username, $password, true);
        
        if ($auth) {
            sendSuccess([
                'status' => 'ok',
                'guacamole' => [
                    'baseUrl' => $baseUrl,
                    'dataSource' => $auth['dataSource'],
                    'authenticated' => true
                ]
            ]);
        } else {
            sendError(GuacError::AUTH_FAILED, 'Cannot connect to Guacamole API', ['baseUrl' => $baseUrl]);
        }
    }
    
    // Action: test - like connect but with verbose output
    if ($action === 'test') {
        if (empty($ip)) {
            sendError(GuacError::MISSING_IP);
        }
        
        $results = [
            'ip' => $ip,
            'protocol' => $protocol,
            'validIp' => isValidHost($ip),
            'validProtocol' => isValidProtocol($protocol),
            'baseUrl' => $baseUrl
        ];
        
        $auth = authenticate($apiUrl, $username, $password, false);
        $results['auth'] = $auth ? 'success' : 'failed';
        
        if ($auth) {
            $connection = findConnection($apiUrl, $auth['token'], $auth['dataSource'], $ip, $protocol);
            $results['existingConnection'] = $connection ? $connection['name'] : null;
        }
        
        sendSuccess(['test' => $results]);
    }
    
    // Action: connect - main connection flow
    if ($action === 'connect') {
        // Validate inputs
        if (empty($ip)) {
            sendError(GuacError::MISSING_IP);
        }
        
        if (!isValidHost($ip)) {
            sendError(GuacError::INVALID_IP, "Invalid: '$ip'", ['ip' => $ip]);
        }
        
        if (!isValidProtocol($protocol)) {
            sendError(GuacError::INVALID_PROTOCOL, "Valid protocols: ssh, rdp, vnc, telnet", ['protocol' => $protocol]);
        }
        
        // 1. Authenticate
        $auth = authenticate($apiUrl, $username, $password, true);
        if (!$auth) {
            // Try again without cache
            $auth = authenticate($apiUrl, $username, $password, false);
        }
        
        if (!$auth) {
            sendError(GuacError::AUTH_FAILED, 'Could not authenticate with Guacamole', [
                'apiUrl' => $apiUrl,
                'hint' => 'Check credentials in guacamole.json'
            ]);
        }
        
        $token = $auth['token'];
        $dataSource = $auth['dataSource'];
        
        // Connection naming convention: "DeviceName - IP (PROTOCOL)"
        $connName = $deviceName . ' - ' . $ip . ' (' . strtoupper($protocol) . ')';
        $legacyConnName = $deviceName . ' (' . strtoupper($protocol) . ')'; // Old format
        
        // 2. Check if connection exists
        $connection = findConnection($apiUrl, $token, $dataSource, $ip, $protocol, $connName);
        
        // Try legacy name format
        if (!$connection) {
            $connection = findConnection($apiUrl, $token, $dataSource, $ip, $protocol, $legacyConnName);
        }
        
        // 3. If exists, update parameters to ensure they're current
        if ($connection) {
            guacLog('INFO', 'Found existing connection, updating', ['id' => $connection['identifier']]);
            updateConnection($apiUrl, $token, $dataSource, $connection['identifier'], 
                           $connection['name'], $protocol, $ip, $config);
        }
        
        // 4. Create if not exists
        if (!$connection) {
            $createError = null;
            $connection = createConnection($apiUrl, $token, $dataSource, $connName, $protocol, $ip, $config, $createError);
            
            // Handle "already exists" error
            if (!$connection && $createError && stripos($createError, 'already exists') !== false) {
                guacLog('INFO', 'Connection exists per error, searching...', ['error' => $createError]);
                
                // Extract name from error: "Connection already exists: ..."
                if (preg_match('/"([^"]+)" already exists/i', $createError, $matches)) {
                    $existingName = $matches[1];
                    guacLog('DEBUG', 'Extracted name from error', ['name' => $existingName]);
                    $connection = findConnection($apiUrl, $token, $dataSource, $ip, $protocol, $existingName);
                }
                
                // Fallback searches
                if (!$connection) {
                    $connection = findConnection($apiUrl, $token, $dataSource, $ip, $protocol, $connName);
                }
                if (!$connection) {
                    $connection = findConnection($apiUrl, $token, $dataSource, $ip, $protocol, null);
                }
            }
            
            if (!$connection) {
                sendError(GuacError::CONNECTION_FAILED, $createError ?? 'Unknown error', [
                    'ip' => $ip,
                    'protocol' => $protocol,
                    'attemptedName' => $connName
                ]);
            }
        }
        
        // 5. Get viewer token for the URL (limited permissions, no admin access)
        // This ensures users can't access admin panel even if they click "Home"
        $viewerAuth = authenticate($apiUrl, $viewerUsername, $viewerPassword, false);
        $viewerToken = $viewerAuth ? $viewerAuth['token'] : $token; // Fallback to admin if viewer fails
        
        if (!$viewerAuth) {
            guacLog('WARN', 'Viewer auth failed, using admin token (security risk!)', ['viewer' => $viewerUsername]);
        }
        
        // 6. Build client URL with VIEWER token for auto-login (limited access)
        $clientUrl = buildClientUrl($baseUrl, $connection['identifier'], $dataSource, $protocol, $viewerToken);
        
        guacLog('INFO', 'Connection ready', [
            'id' => $connection['identifier'],
            'name' => $connection['name'],
            'ip' => $ip
        ]);
        
        sendSuccess([
            'url' => $clientUrl,
            'connection' => [
                'identifier' => $connection['identifier'],
                'name' => $connection['name'],
                'protocol' => $protocol,
                'hostname' => $ip
            ]
        ]);
    }
    
    // Unknown action (shouldn't reach here due to validation above)
    sendError(GuacError::INVALID_ACTION, $action);
    
} catch (Exception $e) {
    guacLog('ERROR', 'Unhandled exception', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    sendError('Internal error', $e->getMessage());
} catch (Error $e) {
    guacLog('ERROR', 'Fatal error', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    sendError('Internal error', 'A fatal error occurred');
}
