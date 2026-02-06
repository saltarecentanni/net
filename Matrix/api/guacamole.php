<?php
/**
 * Guacamole API Proxy
 * Creates connections and returns direct connection URLs
 * 
 * Usage: POST /api/guacamole.php
 * Body: { "action": "connect", "ip": "10.10.x.x", "protocol": "ssh", "deviceName": "Switch-1" }
 */

header('Content-Type: application/json');
header('Cache-Control: no-cache');

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Debug mode
$debug = isset($_GET['debug']) || (isset($input['debug']) && $input['debug']);

// Load configuration
$configFile = __DIR__ . '/../config/guacamole.json';
if (!file_exists($configFile)) {
    http_response_code(500);
    echo json_encode(['error' => 'Guacamole config not found']);
    exit;
}

$config = json_decode(file_get_contents($configFile), true);
if (!$config || !$config['enabled']) {
    http_response_code(400);
    echo json_encode(['error' => 'Guacamole not enabled']);
    exit;
}

$baseUrl = rtrim($config['server']['baseUrl'], '/');
$apiUrl = $baseUrl . '/api';
$username = $config['credentials']['username'];
$password = $config['credentials']['password'];

// Get request
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? $_GET['action'] ?? 'connect';
$ip = $input['ip'] ?? $_GET['ip'] ?? '';
$protocol = $input['protocol'] ?? $_GET['protocol'] ?? 'ssh';
$deviceName = $input['deviceName'] ?? $_GET['deviceName'] ?? 'Matrix Device';

if ($action === 'connect' && empty($ip)) {
    http_response_code(400);
    echo json_encode(['error' => 'IP address required']);
    exit;
}

/**
 * Make HTTP request to Guacamole API
 */
function guacRequest($url, $method = 'GET', $data = null, $token = null) {
    $ch = curl_init();
    
    $headers = ['Content-Type: application/json'];
    if ($token) {
        // Token goes in query string for Guacamole API
        $url .= (strpos($url, '?') === false ? '?' : '&') . 'token=' . urlencode($token);
    }
    
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false
    ]);
    
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($data) {
            if (is_array($data)) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            } else {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
                curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
            }
        }
    } elseif ($method === 'PUT') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
        if ($data && is_array($data)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    return [
        'code' => $httpCode,
        'body' => $response,
        'error' => $error,
        'data' => json_decode($response, true)
    ];
}

/**
 * Authenticate with Guacamole
 */
function authenticate($apiUrl, $username, $password) {
    $authData = 'username=' . urlencode($username) . '&password=' . urlencode($password);
    $result = guacRequest($apiUrl . '/tokens', 'POST', $authData);
    
    if ($result['code'] === 200 && isset($result['data']['authToken'])) {
        return [
            'token' => $result['data']['authToken'],
            'dataSource' => $result['data']['dataSource'] ?? 'postgresql',
            'username' => $result['data']['username'] ?? $username
        ];
    }
    
    return null;
}

/**
 * Find existing connection by hostname/protocol OR by name
 */
function findConnection($apiUrl, $token, $dataSource, $hostname, $protocol, $name = null) {
    $result = guacRequest(
        $apiUrl . '/session/data/' . $dataSource . '/connections',
        'GET',
        null,
        $token
    );
    
    if ($result['code'] === 200 && is_array($result['data'])) {
        $nameUpper = $name ? strtoupper($name) : null;
        $hostParts = explode('.', $hostname);
        
        foreach ($result['data'] as $id => $conn) {
            $connName = $conn['name'] ?? '';
            $connNameUpper = strtoupper($connName);
            
            // Check by exact name match
            if ($nameUpper && $connNameUpper === $nameUpper) {
                return [
                    'identifier' => $conn['identifier'] ?? $id,
                    'name' => $connName,
                    'protocol' => $conn['protocol'] ?? ''
                ];
            }
            
            // Check if name contains hostname and protocol matches
            if (($conn['protocol'] ?? '') === $protocol) {
                // Check if connection name contains the IP
                if (strpos($connName, $hostname) !== false) {
                    return [
                        'identifier' => $conn['identifier'] ?? $id,
                        'name' => $connName,
                        'protocol' => $conn['protocol'] ?? ''
                    ];
                }
                
                // Check by hostname in parameters
                $params = $conn['parameters'] ?? [];
                if (($params['hostname'] ?? '') === $hostname) {
                    return [
                        'identifier' => $conn['identifier'] ?? $id,
                        'name' => $connName,
                        'protocol' => $conn['protocol'] ?? ''
                    ];
                }
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
    $port = $defaults['port'] ?? ($protocol === 'rdp' ? 3389 : ($protocol === 'vnc' ? 5900 : 22));
    
    $params = [
        'hostname' => $hostname,
        'port' => (string)$port
    ];
    
    if ($protocol === 'ssh' || $protocol === 'telnet') {
        $params['color-scheme'] = $defaults['colorScheme'] ?? 'green-black';
        $params['font-size'] = (string)($defaults['fontSize'] ?? 14);
        $params['terminal-width'] = (string)($defaults['terminalWidth'] ?? 100);
        $params['terminal-height'] = (string)($defaults['terminalHeight'] ?? 30);
    } elseif ($protocol === 'rdp') {
        $params['security'] = $defaults['security'] ?? 'any';
        $params['ignore-cert'] = ($defaults['ignoreCert'] ?? false) ? 'true' : 'false';
        $params['width'] = (string)($defaults['width'] ?? 1920);
        $params['height'] = (string)($defaults['height'] ?? 1080);
    } elseif ($protocol === 'vnc') {
        $params['color-depth'] = (string)($defaults['colorDepth'] ?? 24);
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
    
    error_log("Guacamole updateConnection: HTTP " . $result['code']);
    
    return ($result['code'] === 200 || $result['code'] === 204);
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
    
    $result = guacRequest(
        $apiUrl . '/session/data/' . $dataSource . '/connections',
        'POST',
        $connectionData,
        $token
    );
    
    // Log result for debugging
    error_log("Guacamole createConnection: HTTP " . $result['code'] . " - " . $result['body']);
    
    // Success can be 200 or 201 (Created)
    if (($result['code'] === 200 || $result['code'] === 201) && isset($result['data']['identifier'])) {
        return [
            'identifier' => $result['data']['identifier'],
            'name' => $result['data']['name'] ?? $name,
            'protocol' => $protocol
        ];
    }
    
    // Capture error detail
    $errorDetail = "HTTP " . $result['code'];
    if (isset($result['data']['message'])) {
        $errorDetail .= ": " . $result['data']['message'];
    } elseif ($result['body']) {
        $errorDetail .= ": " . substr($result['body'], 0, 200);
    }
    if ($result['error']) {
        $errorDetail .= " (cURL: " . $result['error'] . ")";
    }
    
    return null;
}

/**
 * Build client URL for connection (with token for auto-login)
 */
function buildClientUrl($baseUrl, $identifier, $dataSource, $protocol, $token) {
    // Guacamole client URL format: /#/client/{encoded}?token={token}
    // Where encoded = base64(identifier + \0 + c + \0 + dataSource)
    $clientId = $identifier . "\0" . "c" . "\0" . $dataSource;
    $encoded = base64_encode($clientId);
    // Make URL safe
    $encoded = str_replace(['+', '/'], ['-', '_'], $encoded);
    $encoded = rtrim($encoded, '=');
    
    // Include token for automatic authentication
    return $baseUrl . '/#/client/' . $encoded . '?token=' . urlencode($token);
}

// Main logic
try {
    if ($action === 'status') {
        // Check if Guacamole is reachable
        $auth = authenticate($apiUrl, $username, $password);
        if ($auth) {
            echo json_encode([
                'status' => 'ok',
                'baseUrl' => $baseUrl,
                'dataSource' => $auth['dataSource']
            ]);
        } else {
            echo json_encode([
                'status' => 'error',
                'error' => 'Authentication failed'
            ]);
        }
        exit;
    }
    
    if ($action === 'connect') {
        // 1. Authenticate
        $auth = authenticate($apiUrl, $username, $password);
        if (!$auth) {
            http_response_code(401);
            echo json_encode([
                'error' => 'Guacamole authentication failed',
                'detail' => 'Could not authenticate with Guacamole API',
                'apiUrl' => $apiUrl,
                'ip' => $ip
            ]);
            exit;
        }
        
        $token = $auth['token'];
        $dataSource = $auth['dataSource'];
        
        // Connection name includes IP to avoid duplicates
        $connName = $deviceName . ' - ' . $ip . ' (' . strtoupper($protocol) . ')';
        $oldConnName = $deviceName . ' (' . strtoupper($protocol) . ')'; // Legacy format
        
        // 2. Check if connection exists (by hostname/protocol OR by name)
        $connection = findConnection($apiUrl, $token, $dataSource, $ip, $protocol, $connName);
        
        // Also check old format name
        if (!$connection) {
            $connection = findConnection($apiUrl, $token, $dataSource, $ip, $protocol, $oldConnName);
        }
        
        // 3. If exists, update parameters to ensure they're current
        if ($connection) {
            error_log("Connection exists, updating parameters: " . $connection['identifier']);
            updateConnection($apiUrl, $token, $dataSource, $connection['identifier'], 
                           $connection['name'], $protocol, $ip, $config);
        }
        
        // 4. Create if not exists
        if (!$connection) {
            $createError = null;
            $connection = createConnection($apiUrl, $token, $dataSource, $connName, $protocol, $ip, $config, $createError);
            
            // If creation failed with "already exists", search again
            if (!$connection && strpos($createError, 'already exists') !== false) {
                error_log("Connection already exists, searching again...");
                
                // Try to extract name from error message
                if (preg_match('/"([^"]+)" already exists/', $createError, $matches)) {
                    $existingName = $matches[1];
                    error_log("Found existing connection name in error: $existingName");
                    $connection = findConnection($apiUrl, $token, $dataSource, $ip, $protocol, $existingName);
                }
                
                // If still not found, search more broadly
                if (!$connection) {
                    $connection = findConnection($apiUrl, $token, $dataSource, $ip, $protocol, $connName);
                }
                if (!$connection) {
                    $connection = findConnection($apiUrl, $token, $dataSource, $ip, $protocol, $oldConnName);
                }
            }
            
            if (!$connection) {
                http_response_code(500);
                echo json_encode([
                    'error' => 'Failed to create connection',
                    'detail' => $createError ?? 'Unknown error from Guacamole API',
                    'ip' => $ip,
                    'protocol' => $protocol
                ]);
                exit;
            }
        }
        
        // 4. Build client URL with token for auto-login
        $clientUrl = buildClientUrl($baseUrl, $connection['identifier'], $dataSource, $protocol, $token);
        
        echo json_encode([
            'success' => true,
            'url' => $clientUrl,
            'connection' => [
                'identifier' => $connection['identifier'],
                'name' => $connection['name'],
                'protocol' => $protocol,
                'hostname' => $ip
            ]
        ]);
        exit;
    }
    
    http_response_code(400);
    echo json_encode(['error' => 'Unknown action: ' . $action]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
