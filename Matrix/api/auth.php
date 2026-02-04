<?php
/**
 * TIESSE Matrix Network - Authentication API
 * Version: 3.5.045
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

function handleLogin() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
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
    
    // Verify credentials
    if ($username === AUTH_USERNAME && verifyPassword($password)) {
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
