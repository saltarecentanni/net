<?php
/**
 * Guacamole API Proxy v4.1.003
 * Simplified and stable version
 */

define('GUAC_VERSION', '4.1.003');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

// CORS — restrict to same-origin (do NOT use wildcard * in production)
$allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    header('Access-Control-Allow-Origin: null');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit(0);
}

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Load config
$configFile = __DIR__ . '/../config/guacamole.json';
if (!file_exists($configFile)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Config not found']);
    exit;
}

$config = json_decode(file_get_contents($configFile), true);
if (!$config || !$config['enabled']) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Guacamole disabled']);
    exit;
}

$baseUrl = rtrim($config['server']['baseUrl'], '/');
$apiUrl = $baseUrl . '/api';
$username = $config['credentials']['username'];
$password = $config['credentials']['password'];

// Get input
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $_GET['action'] ?? $input['action'] ?? 'connect';
$ip = trim($input['ip'] ?? $_GET['ip'] ?? '');
$protocol = strtolower($input['protocol'] ?? $_GET['protocol'] ?? 'ssh');
$deviceName = $input['deviceName'] ?? $_GET['deviceName'] ?? 'Device';

/**
 * HTTP Request to Guacamole
 */
function guacRequest($url, $method = 'GET', $data = null, $token = null) {
    $ch = curl_init();
    
    if ($token) {
        $url .= (strpos($url, '?') === false ? '?' : '&') . 'token=' . urlencode($token);
    }
    
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false
    ]);
    
    if ($method === 'POST' || $method === 'PUT') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        if (is_array($data)) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        } else {
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
        }
    }
    
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    return ['code' => $code, 'body' => $response, 'data' => json_decode($response, true), 'error' => $error];
}

/**
 * Authenticate
 */
function authenticate($apiUrl, $username, $password) {
    $result = guacRequest($apiUrl . '/tokens', 'POST', 'username=' . urlencode($username) . '&password=' . urlencode($password));
    
    if ($result['code'] === 200 && isset($result['data']['authToken'])) {
        return [
            'token' => $result['data']['authToken'],
            'dataSource' => $result['data']['dataSource'] ?? 'postgresql'
        ];
    }
    return null;
}

/**
 * Find connection
 */
function findConnection($apiUrl, $token, $dataSource, $ip, $protocol) {
    $result = guacRequest($apiUrl . '/session/data/' . $dataSource . '/connections', 'GET', null, $token);
    
    if ($result['code'] === 200 && is_array($result['data'])) {
        foreach ($result['data'] as $id => $conn) {
            if (($conn['protocol'] ?? '') === $protocol) {
                if (strpos($conn['name'] ?? '', $ip) !== false) {
                    return ['identifier' => $conn['identifier'] ?? $id, 'name' => $conn['name']];
                }
            }
        }
    }
    return null;
}

/**
 * Create connection
 */
function createConnection($apiUrl, $token, $dataSource, $name, $protocol, $ip, $config) {
    $defaults = $config['defaults'][$protocol] ?? [];
    $port = $defaults['port'] ?? ($protocol === 'rdp' ? 3389 : 22);
    
    $params = ['hostname' => $ip, 'port' => (string)$port];
    
    if ($protocol === 'ssh' || $protocol === 'telnet') {
        $params['color-scheme'] = $defaults['colorScheme'] ?? 'green-black';
        $params['font-size'] = (string)($defaults['fontSize'] ?? 14);
        $params['terminal-width'] = (string)($defaults['terminalWidth'] ?? 100);
        $params['terminal-height'] = (string)($defaults['terminalHeight'] ?? 30);
    } elseif ($protocol === 'rdp') {
        $params['security'] = $defaults['security'] ?? 'any';
        $params['ignore-cert'] = 'true';
        $params['width'] = (string)($defaults['width'] ?? 1920);
        $params['height'] = (string)($defaults['height'] ?? 1080);
    }
    
    $data = [
        'parentIdentifier' => 'ROOT',
        'name' => $name,
        'protocol' => $protocol,
        'parameters' => $params,
        'attributes' => ['max-connections' => '', 'max-connections-per-user' => '']
    ];
    
    $result = guacRequest($apiUrl . '/session/data/' . $dataSource . '/connections', 'POST', $data, $token);
    
    if (($result['code'] === 200 || $result['code'] === 201) && isset($result['data']['identifier'])) {
        return ['identifier' => $result['data']['identifier'], 'name' => $name];
    }
    
    // If already exists, try to find it
    if (strpos($result['body'] ?? '', 'already exists') !== false) {
        return findConnection($apiUrl, $token, $dataSource, $ip, $protocol);
    }
    
    return null;
}

/**
 * Build client URL
 */
function buildClientUrl($baseUrl, $identifier, $dataSource, $token) {
    $clientId = $identifier . "\0" . "c" . "\0" . $dataSource;
    $encoded = base64_encode($clientId);
    $encoded = str_replace(['+', '/'], ['-', '_'], $encoded);
    $encoded = rtrim($encoded, '=');
    return $baseUrl . '/#/client/' . $encoded . '?token=' . urlencode($token);
}

// Main
try {
    if ($action === 'status' || $action === 'health') {
        $auth = authenticate($apiUrl, $username, $password);
        echo json_encode([
            'success' => (bool)$auth,
            'status' => $auth ? 'ok' : 'error',
            'version' => GUAC_VERSION,
            'baseUrl' => $baseUrl
        ]);
        exit;
    }
    
    if ($action === 'connect') {
        if (empty($ip)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'IP required']);
            exit;
        }
        
        // Auth
        $auth = authenticate($apiUrl, $username, $password);
        if (!$auth) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Auth failed', 'hint' => 'Check guacamole.json credentials']);
            exit;
        }
        
        $token = $auth['token'];
        $dataSource = $auth['dataSource'];
        $connName = $deviceName . ' - ' . $ip . ' (' . strtoupper($protocol) . ')';
        
        // Find or create
        $connection = findConnection($apiUrl, $token, $dataSource, $ip, $protocol);
        if (!$connection) {
            $connection = createConnection($apiUrl, $token, $dataSource, $connName, $protocol, $ip, $config);
        }
        
        if (!$connection) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to create connection']);
            exit;
        }
        
        // URL
        $url = buildClientUrl($baseUrl, $connection['identifier'], $dataSource, $token);
        
        echo json_encode([
            'success' => true,
            'url' => $url,
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
    echo json_encode(['success' => false, 'error' => 'Unknown action: ' . $action]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
