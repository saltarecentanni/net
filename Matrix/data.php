<?php
/**
 * TIESSE Matrix Network - Data API
 * Version: 3.5.010
 * 
 * GET  - Public (anyone can view)
 * POST - Requires authentication (edit mode)
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config/config.php';

// Ensure data directory exists
if (!is_dir(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}

// =============================================================================
// Online Users Tracking
// =============================================================================
define('ONLINE_FILE', DATA_DIR . '/online_users.json');
define('ONLINE_TIMEOUT', 60); // Seconds before user is considered offline

function getOnlineUsers() {
    if (!file_exists(ONLINE_FILE)) {
        return [];
    }
    $content = @file_get_contents(ONLINE_FILE);
    if ($content === false) return [];
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

function saveOnlineUsers($users) {
    $json = json_encode($users, JSON_PRETTY_PRINT);
    file_put_contents(ONLINE_FILE, $json, LOCK_EX);
}

function cleanExpiredUsers(&$users) {
    $now = time();
    foreach ($users as $id => $user) {
        if (($now - $user['lastSeen']) > ONLINE_TIMEOUT) {
            unset($users[$id]);
        }
    }
}

function registerUserPresence($userId, $isEditor = false) {
    $users = getOnlineUsers();
    cleanExpiredUsers($users);
    
    $users[$userId] = [
        'lastSeen' => time(),
        'isEditor' => $isEditor,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ];
    
    saveOnlineUsers($users);
    return $users;
}

function getOnlineCount() {
    $users = getOnlineUsers();
    cleanExpiredUsers($users);
    saveOnlineUsers($users);
    
    $viewers = 0;
    $editors = 0;
    foreach ($users as $user) {
        if ($user['isEditor']) {
            $editors++;
        } else {
            $viewers++;
        }
    }
    return ['total' => count($users), 'viewers' => $viewers, 'editors' => $editors];
}

// =============================================================================
// GET - Public access (view data)
// =============================================================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Special action: get online users count
    if (isset($_GET['action']) && $_GET['action'] === 'online') {
        $userId = $_GET['userId'] ?? uniqid('user_');
        $isEditor = isset($_GET['isEditor']) && $_GET['isEditor'] === 'true';
        
        registerUserPresence($userId, $isEditor);
        $count = getOnlineCount();
        
        echo json_encode([
            'online' => $count['total'],
            'viewers' => $count['viewers'],
            'editors' => $count['editors'],
            'userId' => $userId
        ]);
        exit;
    }
    
    if (!file_exists(DATA_FILE)) {
        echo json_encode(["devices" => [], "connections" => [], "nextDeviceId" => 1]);
        exit;
    }
    
    $content = file_get_contents(DATA_FILE);
    if ($content === false) {
        http_response_code(500);
        echo json_encode(["error" => "Unable to read data file"]);
        exit;
    }
    
    // Validate JSON
    json_decode($content);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(500);
        echo json_encode(["error" => "Invalid JSON in data file"]);
        exit;
    }
    
    echo $content;
    exit;
}

// =============================================================================
// POST - Requires authentication (save data) or special actions
// =============================================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Check for special actions first
    if (isset($_POST['action'])) {
        $action = $_POST['action'];
        
        // Verify password action (for Clear All confirmation)
        if ($action === 'verify_password') {
            $password = $_POST['password'] ?? '';
            $valid = password_verify($password, AUTH_PASSWORD_HASH);
            echo json_encode(['valid' => $valid]);
            exit;
        }
    }
    
    // Check authentication for data operations
    if (!isAuthenticated()) {
        http_response_code(401);
        echo json_encode(["error" => "Authentication required", "code" => "AUTH_REQUIRED"]);
        exit;
    }
    
    $body = file_get_contents('php://input');
    if ($body === false) {
        http_response_code(400);
        echo json_encode(["error" => "Empty body"]);
        exit;
    }
    
    $tmp = json_decode($body, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid JSON"]);
        exit;
    }
    
    // Validate data structure
    if (!isset($tmp['devices']) || !is_array($tmp['devices'])) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid data structure: missing or invalid 'devices' array"]);
        exit;
    }
    if (!isset($tmp['connections']) || !is_array($tmp['connections'])) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid data structure: missing or invalid 'connections' array"]);
        exit;
    }
    if (!isset($tmp['nextDeviceId']) || !is_int($tmp['nextDeviceId'])) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid data structure: missing or invalid 'nextDeviceId' integer"]);
        exit;
    }
    
    // Validate devices
    foreach ($tmp['devices'] as $index => $device) {
        if (!is_array($device)) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid device at index $index: must be an object"]);
            exit;
        }
        $requiredFields = ['id', 'rackId', 'name', 'type', 'status', 'ports'];
        foreach ($requiredFields as $field) {
            if (!isset($device[$field])) {
                http_response_code(400);
                echo json_encode(["error" => "Invalid device at index $index: missing required field '$field'"]);
                exit;
            }
        }
        if (!is_int($device['id']) || $device['id'] < 1) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid device at index $index: 'id' must be a positive integer"]);
            exit;
        }
        if (!is_array($device['ports'])) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid device at index $index: 'ports' must be an array"]);
            exit;
        }
    }
    
    // Validate connections
    foreach ($tmp['connections'] as $index => $conn) {
        if (!is_array($conn)) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid connection at index $index: must be an object"]);
            exit;
        }
        if (!isset($conn['from']) || !is_int($conn['from'])) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid connection at index $index: 'from' must be an integer"]);
            exit;
        }
        if (!isset($conn['type']) || !is_string($conn['type'])) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid connection at index $index: 'type' must be a string"]);
            exit;
        }
        if (!isset($conn['status']) || !is_string($conn['status'])) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid connection at index $index: 'status' must be a string"]);
            exit;
        }
    }
    
    // Safe write with file locking for concurrent access
    $tmpFile = DATA_FILE . '.tmp.' . uniqid();
    $jsonData = json_encode($tmp, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
    // Write to temp file with exclusive lock
    $w = file_put_contents($tmpFile, $jsonData, LOCK_EX);
    if ($w === false) {
        http_response_code(500);
        echo json_encode(["error" => "Unable to write temp file"]);
        exit;
    }
    
    // Atomic rename (safe on same filesystem)
    if (!rename($tmpFile, DATA_FILE)) {
        @unlink($tmpFile); // Clean up temp file on failure
        http_response_code(500);
        echo json_encode(["error" => "Unable to save data file"]);
        exit;
    }
    
    echo json_encode(["ok" => true]);
    exit;
}

http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);
