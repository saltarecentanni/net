<?php
/**
 * TIESSE Matrix Network - Authentication API
 * Version: 4.1.003
 * 
 * Endpoints:
 *   POST /api/auth.php?action=login   - Login with username/password
 *   POST /api/auth.php?action=logout  - Logout
 *   GET  /api/auth.php?action=check   - Check if authenticated
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/config.php';

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        handleLogin();
        break;
    case 'logout':
        handleLogout();
        break;
    case 'check':
        handleCheck();
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
}

// Rate limiting constants
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOCKOUT_TIME', 900); // 15 minutes
define('RATE_LIMIT_FILE', __DIR__ . '/../data/.login_attempts.json');

function getRateLimitData() {
    if (!file_exists(RATE_LIMIT_FILE)) return [];
    $data = @json_decode(file_get_contents(RATE_LIMIT_FILE), true);
    return is_array($data) ? $data : [];
}

function saveRateLimitData($data) {
    file_put_contents(RATE_LIMIT_FILE, json_encode($data), LOCK_EX);
}

function isRateLimited($ip) {
    $data = getRateLimitData();
    $key = $ip;
    if (!isset($data[$key])) return false;
    $entry = $data[$key];
    if ($entry['count'] >= MAX_LOGIN_ATTEMPTS) {
        if (time() - $entry['lastAttempt'] < LOCKOUT_TIME) {
            return true;
        }
        // Lockout expired, reset
        unset($data[$key]);
        saveRateLimitData($data);
    }
    return false;
}

function recordFailedAttempt($ip) {
    $data = getRateLimitData();
    $key = $ip;
    if (!isset($data[$key])) {
        $data[$key] = ['count' => 0, 'lastAttempt' => 0];
    }
    $data[$key]['count']++;
    $data[$key]['lastAttempt'] = time();
    saveRateLimitData($data);
}

function clearAttempts($ip) {
    $data = getRateLimitData();
    unset($data[$ip]);
    saveRateLimitData($data);
}

function handleLogin() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }
    
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    
    // Rate limiting check
    if (isRateLimited($ip)) {
        http_response_code(429);
        echo json_encode(['error' => 'Too many login attempts. Try again in 15 minutes.']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Username and password required']);
        return;
    }
    
    // Constant-time delay to prevent timing attacks
    usleep(random_int(100000, 200000)); // 100-200ms
    
    // Verify credentials
    if ($username === AUTH_USERNAME && verifyPassword($password)) {
        clearAttempts($ip);
        initSession();
        $_SESSION['authenticated'] = true;
        $_SESSION['username'] = $username;
        $_SESSION['last_activity'] = time();
        $_SESSION['login_time'] = time();
        
        echo json_encode([
            'ok' => true,
            'message' => 'Login successful',
            'user' => $username
        ]);
    } else {
        recordFailedAttempt($ip);
        http_response_code(401);
        echo json_encode(['error' => 'Invalid credentials']);
    }
}

function handleLogout() {
    initSession();
    
    $_SESSION = [];
    
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params['path'], $params['domain'],
            $params['secure'], $params['httponly']
        );
    }
    
    session_destroy();
    
    echo json_encode(['ok' => true, 'message' => 'Logged out']);
}

function handleCheck() {
    $authenticated = isAuthenticated();
    
    echo json_encode([
        'authenticated' => $authenticated,
        'user' => $authenticated ? ($_SESSION['username'] ?? null) : null
    ]);
}
