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
 * Find existing connection by hostname and protocol
 */
function findConnection($apiUrl, $token, $dataSource, $hostname, $protocol) {
    $result = guacRequest(
        $apiUrl . '/session/data/' . $dataSource . '/connections',
        'GET',
        null,
        $token
    );
    
    if ($result['code'] === 200 && is_array($result['data'])) {
        foreach ($result['data'] as $id => $conn) {
            $params = $conn['parameters'] ?? [];
            if (($params['hostname'] ?? '') === $hostname && 
                ($conn['protocol'] ?? '') === $protocol) {
                return [
                    'identifier' => $conn['identifier'] ?? $id,
                    'name' => $conn['name'] ?? '',
                    'protocol' => $conn['protocol'] ?? ''
                ];
            }
        }
    }
    
    return null;
}

/**
 * Create new connection
 */
function createConnection($apiUrl, $token, $dataSource, $name, $protocol, $hostname, $config) {
    $defaults = $config['defaults'][$protocol] ?? [];
    $port = $defaults['port'] ?? ($protocol === 'rdp' ? 3389 : ($protocol === 'vnc' ? 5900 : 22));
    
    $connectionData = [
        'parentIdentifier' => 'ROOT',
        'name' => $name,
        'protocol' => $protocol,
        'parameters' => [
            'hostname' => $hostname,
            'port' => (string)$port
        ],
        'attributes' => [
            'max-connections' => '',
            'max-connections-per-user' => ''
        ]
    ];
    
    // Add protocol-specific parameters
    if ($protocol === 'ssh') {
        $connectionData['parameters']['color-scheme'] = $defaults['colorScheme'] ?? 'green-black';
        $connectionData['parameters']['font-size'] = (string)($defaults['fontSize'] ?? 12);
    } elseif ($protocol === 'rdp') {
        $connectionData['parameters']['security'] = $defaults['security'] ?? 'any';
        $connectionData['parameters']['ignore-cert'] = $defaults['ignoreCert'] ? 'true' : 'false';
        $connectionData['parameters']['width'] = (string)($defaults['width'] ?? 1920);
        $connectionData['parameters']['height'] = (string)($defaults['height'] ?? 1080);
    } elseif ($protocol === 'vnc') {
        $connectionData['parameters']['color-depth'] = (string)($defaults['colorDepth'] ?? 24);
    }
    
    $result = guacRequest(
        $apiUrl . '/session/data/' . $dataSource . '/connections',
        'POST',
        $connectionData,
        $token
    );
    
    if ($result['code'] === 200 && isset($result['data']['identifier'])) {
        return [
            'identifier' => $result['data']['identifier'],
            'name' => $result['data']['name'] ?? $name,
            'protocol' => $protocol
        ];
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
        
        // 2. Check if connection exists
        $connection = findConnection($apiUrl, $token, $dataSource, $ip, $protocol);
        
        // 3. Create if not exists
        if (!$connection) {
            $connName = $deviceName . ' (' . strtoupper($protocol) . ')';
            $connection = createConnection($apiUrl, $token, $dataSource, $connName, $protocol, $ip, $config);
            
            if (!$connection) {
                http_response_code(500);
                echo json_encode([
                    'error' => 'Failed to create connection',
                    'detail' => 'Could not create connection in Guacamole',
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
