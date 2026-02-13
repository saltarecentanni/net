<?php
/**
 * LibreNMS API Proxy v4.1.009
 * Consulta portos de switches via LibreNMS
 * Integração PHP pura com LibreNMS
 * 
 * Endpoints disponíveis:
 * - ?action=health              → Verifica conexão com LibreNMS
 * - ?action=devices             → Lista todos os devices
 * - ?action=ports&device_id=1   → Lista portos de um device
 * - ?action=port_status&device_id=1&port_id=1 → Status de um porto
 * - ?action=device_by_ip&ip=X.X.X.X → Busca device por IP
 * - ?action=device_by_hostname&hostname=name → Busca device por hostname
 * - ?action=info               → Informações do LibreNMS
 */

define('LIBRENMS_API_VERSION', '4.1.009');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');

// CORS - permitir requisições locais e do servidor
$allowedOrigins = [
    'http://localhost',
    'http://127.0.0.1',
    'http://10.10.225.103',
    'https://10.10.225.103',
    'http://localhost:80',
    'http://127.0.0.1:80',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$server_host = $_SERVER['HTTP_HOST'] ?? '';

// Permitir localhost e o servidor atual
if (in_array($origin, $allowedOrigins, true) || 
    strpos($server_host, 'localhost') !== false || 
    strpos($server_host, '127.0.0.1') !== false ||
    strpos($server_host, '10.10.225.103') !== false) {
    header('Access-Control-Allow-Origin: ' . ($origin ?: '*'));
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Auth-Token, Authorization');
header('Access-Control-Allow-Credentials: true');

// Responder a requisição OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit(0);
}

// Configurar tratamento de erros
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Tentar criar log em múltiplos locais
$log_paths = [
    '/var/log/matrix/librenms.log',
    '/var/log/matrix-librenms.log',
    __DIR__ . '/../../logs/librenms.log',
    __DIR__ . '/librenms.log'
];

foreach ($log_paths as $log_path) {
    if (is_writable(dirname($log_path)) || (file_exists($log_path) && is_writable($log_path))) {
        ini_set('error_log', $log_path);
        break;
    }
}

// ============================================================
// CARREGAMENTO DE CONFIGURAÇÃO
// ============================================================

// Tentar carregar do .env.librenms primeiro, depois .env
$librenms_config = [
    'host' => 'http://10.10.225.103:8000',
    'token' => '',
    'timeout' => 10,
    'verify_ssl' => false
];

// Tentar ler .env.librenms
$env_file = __DIR__ . '/../../.env.librenms';
if (file_exists($env_file) && is_readable($env_file)) {
    loadEnvFile($env_file);
}

// Tentar ler .env
$env_file_main = __DIR__ . '/../../.env';
if (file_exists($env_file_main) && is_readable($env_file_main)) {
    loadEnvFile($env_file_main);
}

// Obter do getenv (pode ter sido carregado via putenv)
$librenms_host = getenv('LIBRENMS_HOST');
$librenms_token = getenv('LIBRENMS_API_TOKEN');

if ($librenms_host) {
    $librenms_config['host'] = $librenms_host;
}

if ($librenms_token) {
    $librenms_config['token'] = $librenms_token;
}

// Validar que token foi configurado
if (empty($librenms_config['token'])) {
    http_response_code(500);
    echo json_encode([
        'error' => 'LibreNMS API token não configurado',
        'message' => 'Configure a variável LIBRENMS_API_TOKEN no arquivo .env ou .env.librenms',
        'example' => 'LIBRENMS_API_TOKEN=seu_token_aqui',
        'debug' => [
            'ENV checked' => [
                '.env.librenms' => file_exists(__DIR__ . '/../../.env.librenms'),
                '.env' => file_exists(__DIR__ . '/../../.env')
            ]
        ]
    ]);
    exit(1);
}

// ============================================================
// ROUTER - PROCESSA AÇÕES
// ============================================================

$action = $_GET['action'] ?? 'health';

try {
    switch ($action) {
        case 'health':
            getLibreNMSHealth();
            break;
        case 'devices':
            getLibreNMSDevices();
            break;
        case 'ports':
            $device_id = intval($_GET['device_id'] ?? 0);
            getDevicePorts($device_id);
            break;
        case 'port_status':
            $device_id = intval($_GET['device_id'] ?? 0);
            $port_id = intval($_GET['port_id'] ?? 0);
            getPortStatus($device_id, $port_id);
            break;
        case 'device_by_ip':
            $ip = $_GET['ip'] ?? '';
            getDeviceByIP($ip);
            break;
        case 'device_by_hostname':
            $hostname = $_GET['hostname'] ?? '';
            getDeviceByHostname($hostname);
            break;
        case 'info':
            getLibreNMSInfo();
            break;
        default:
            http_response_code(400);
            echo json_encode([
                'error' => 'Ação inválida',
                'action' => $action,
                'available_actions' => [
                    'health' => 'Verifica conexão com LibreNMS',
                    'devices' => 'Lista todos os dispositivos',
                    'ports' => 'Lista portos de um dispositivo (ex: ?device_id=1)',
                    'port_status' => 'Status de um porto específico (ex: ?device_id=1&port_id=1)',
                    'device_by_ip' => 'Busca um dispositivo por IP (ex: ?ip=10.10.4.220)',
                    'device_by_hostname' => 'Busca um dispositivo por hostname (ex: ?hostname=switch1)',
                    'info' => 'Informações gerais do LibreNMS'
                ]
            ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Erro ao processar requisição',
        'message' => $e->getMessage(),
        'action' => $action
    ]);
}


// ============================================================
// FUNÇÕES DE REQUISIÇÃO E UTILIDADE
// ============================================================

/**
 * Faz uma requisição cURL para a API do LibreNMS
 */
function callLibreNMS($endpoint, $params = []) {
    global $librenms_config;
    
    $url = rtrim($librenms_config['host'], '/') . '/api/v0/' . ltrim($endpoint, '/');
    
    if (!empty($params)) {
        $url .= '?' . http_build_query($params);
    }
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_HTTPHEADER => [
            'X-Auth-Token: ' . $librenms_config['token'],
            'Content-Type: application/json',
            'Accept: application/json'
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => $librenms_config['timeout'],
        CURLOPT_SSL_VERIFYPEER => $librenms_config['verify_ssl'],
        CURLOPT_SSL_VERIFYHOST => $librenms_config['verify_ssl'] ? 2 : 0
    ]);
    
    $result = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        throw new Exception("Erro de conexão: $error");
    }
    
    if ($http_code !== 200) {
        $error_msg = "API LibreNMS retornou HTTP $http_code";
        if ($result) {
            $data = json_decode($result, true);
            if (isset($data['message'])) {
                $error_msg .= ": " . $data['message'];
            }
        }
        throw new Exception($error_msg);
    }
    
    $data = json_decode($result, true);
    if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Resposta inválida do LibreNMS: " . json_last_error_msg());
    }
    
    return $data ?? [];
}

/**
 * Carrega variáveis de arquivo .env
 */
function loadEnvFile($filepath) {
    if (!file_exists($filepath) || !is_readable($filepath)) {
        return;
    }
    
    $lines = @file($filepath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!$lines) return;
    
    foreach ($lines as $line) {
        $line = trim($line);
        
        // Ignorar comentários
        if (empty($line) || strpos($line, '#') === 0) {
            continue;
        }
        
        // Parse da variável
        if (strpos($line, '=') === false) {
            continue;
        }
        
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        
        // Remover aspas
        if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
            (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
            $value = substr($value, 1, -1);
        }
        
        // Definir via putenv
        putenv("$name=$value");
    }
}

// ============================================================
// FUNÇÕES DE AÇÃO
// ============================================================

/**
 * Verifica a saúde e conectividade com LibreNMS
 */
function getLibreNMSHealth() {
    try {
        $response = callLibreNMS('system');
        
        echo json_encode([
            'status' => 'ok',
            'message' => 'Conectado ao LibreNMS',
            'timestamp' => date('c'),
            'system' => [
                'version' => $response['system']['version'] ?? 'unknown',
                'hostname' => $response['system']['hostname'] ?? 'N/A'
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(503);
        echo json_encode([
            'status' => 'error',
            'error' => 'LibreNMS não disponível',
            'message' => $e->getMessage(),
            'timestamp' => date('c')
        ]);
    }
}

/**
 * Lista todos os dispositivos no LibreNMS
 */
function getLibreNMSDevices() {
    try {
        $response = callLibreNMS('devices');
        
        $devices = [];
        if (isset($response['devices']) && is_array($response['devices'])) {
            foreach ($response['devices'] as $device) {
                $devices[] = [
                    'device_id' => $device['device_id'] ?? null,
                    'hostname' => $device['hostname'] ?? null,
                    'ip' => $device['ip'] ?? null,
                    'status' => $device['status'] ?? null,
                    'type' => $device['type'] ?? null,
                    'os' => $device['os'] ?? null,
                    'uptime' => $device['uptime'] ?? null
                ];
            }
        }
        
        echo json_encode([
            'status' => 'ok',
            'count' => count($devices),
            'devices' => $devices,
            'timestamp' => date('c')
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'error' => 'Falha ao listar dispositivos',
            'message' => $e->getMessage()
        ]);
    }
}

/**
 * Lista os portos de um dispositivo específico
 */
function getDevicePorts($device_id) {
    if (empty($device_id)) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'error' => 'device_id obrigatório',
            'example' => '?action=ports&device_id=1'
        ]);
        return;
    }
    
    try {
        $response = callLibreNMS("devices/$device_id/ports");
        
        $ports = [];
        if (isset($response['ports']) && is_array($response['ports'])) {
            foreach ($response['ports'] as $port) {
                $ports[] = [
                    'port_id' => $port['port_id'] ?? null,
                    'ifName' => $port['ifName'] ?? null,
                    'ifAlias' => $port['ifAlias'] ?? null,
                    'ifDescription' => $port['ifDescription'] ?? null,
                    'ifType' => $port['ifType'] ?? null,
                    'ifSpeed' => $port['ifSpeed'] ?? null,
                    'ifMtu' => $port['ifMtu'] ?? null,
                    'ifAdminStatus' => $port['ifAdminStatus'] ?? null,
                    'ifOperStatus' => $port['ifOperStatus'] ?? null,
                    'status' => ($port['ifOperStatus'] ?? null) === 'up' ? 'UP' : 'DOWN',
                    'ifLastChange' => $port['ifLastChange'] ?? null
                ];
            }
        }
        
        echo json_encode([
            'status' => 'ok',
            'device_id' => $device_id,
            'count' => count($ports),
            'ports' => $ports,
            'timestamp' => date('c')
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'error' => 'Falha ao buscar portos',
            'device_id' => $device_id,
            'message' => $e->getMessage()
        ]);
    }
}

/**
 * Obtém o status de um porto específico
 */
function getPortStatus($device_id, $port_id) {
    if (empty($device_id) || empty($port_id)) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'error' => 'device_id e port_id obrigatórios',
            'example' => '?action=port_status&device_id=1&port_id=1'
        ]);
        return;
    }
    
    try {
        $response = callLibreNMS("devices/$device_id/ports/$port_id");
        
        $port = $response['port'] ?? [];
        if (is_array($port) && empty($port)) {
            throw new Exception("Porto não encontrado");
        }
        
        // Se é array de arrays (às vezes LibreNMS retorna assim)
        if (is_array($port) && isset($port[0]) && is_array($port[0])) {
            $port = $port[0];
        }
        
        echo json_encode([
            'status' => 'ok',
            'device_id' => $device_id,
            'port_id' => $port_id,
            'ifName' => $port['ifName'] ?? null,
            'ifAlias' => $port['ifAlias'] ?? null,
            'ifDescription' => $port['ifDescription'] ?? null,
            'port_status' => $port['ifOperStatus'] ?? null,
            'is_up' => ($port['ifOperStatus'] ?? null) === 'up',
            'ifAdminStatus' => $port['ifAdminStatus'] ?? null,
            'ifSpeed' => $port['ifSpeed'] ?? null,
            'ifType' => $port['ifType'] ?? null,
            'timestamp' => date('c')
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'error' => 'Falha ao buscar status do porto',
            'device_id' => $device_id,
            'port_id' => $port_id,
            'message' => $e->getMessage()
        ]);
    }
}

/**
 * Busca um dispositivo pelo IP
 */
function getDeviceByIP($ip) {
    if (empty($ip)) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'error' => 'IP obrigatório',
            'example' => '?action=device_by_ip&ip=10.10.4.220'
        ]);
        return;
    }
    
    // Validar formato de IP
    if (!filter_var($ip, FILTER_VALIDATE_IP)) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'error' => 'IP inválido',
            'ip' => $ip
        ]);
        return;
    }
    
    try {
        $response = callLibreNMS('devices');
        
        $found = null;
        if (isset($response['devices']) && is_array($response['devices'])) {
            foreach ($response['devices'] as $device) {
                if (($device['ip'] ?? null) === $ip) {
                    $found = $device;
                    break;
                }
            }
        }
        
        if (empty($found)) {
            http_response_code(404);
            echo json_encode([
                'status' => 'not_found',
                'error' => 'Dispositivo não encontrado',
                'ip' => $ip
            ]);
        } else {
            echo json_encode([
                'status' => 'ok',
                'device' => $found,
                'timestamp' => date('c')
            ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'error' => 'Falha ao buscar dispositivo',
            'ip' => $ip,
            'message' => $e->getMessage()
        ]);
    }
}

/**
 * Busca um dispositivo pelo hostname
 */
function getDeviceByHostname($hostname) {
    if (empty($hostname)) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'error' => 'hostname obrigatório',
            'example' => '?action=device_by_hostname&hostname=switch1'
        ]);
        return;
    }
    
    try {
        $response = callLibreNMS('devices');
        
        $found = null;
        if (isset($response['devices']) && is_array($response['devices'])) {
            foreach ($response['devices'] as $device) {
                if (($device['hostname'] ?? null) === $hostname || 
                    ($device['sysName'] ?? null) === $hostname) {
                    $found = $device;
                    break;
                }
            }
        }
        
        if (empty($found)) {
            http_response_code(404);
            echo json_encode([
                'status' => 'not_found',
                'error' => 'Dispositivo não encontrado',
                'hostname' => $hostname
            ]);
        } else {
            echo json_encode([
                'status' => 'ok',
                'device' => $found,
                'timestamp' => date('c')
            ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'error' => 'Falha ao buscar dispositivo',
            'hostname' => $hostname,
            'message' => $e->getMessage()
        ]);
    }
}

/**
 * Informações gerais do LibreNMS
 */
function getLibreNMSInfo() {
    try {
        $response = callLibreNMS('system');
        
        echo json_encode([
            'status' => 'ok',
            'system' => $response['system'] ?? [],
            'timestamp' => date('c')
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'error' => 'Falha ao obter informações',
            'message' => $e->getMessage()
        ]);
    }
}

?>
