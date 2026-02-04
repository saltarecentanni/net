<?php
/**
 * TIESSE Matrix Network - Configuration
 * Version: 3.5.041
 */

// Prevent direct access
if (basename($_SERVER['PHP_SELF']) === 'config.php') {
    http_response_code(403);
    exit('Access denied');
}

// =============================================================================
// LOAD ENVIRONMENT VARIABLES FROM .env FILE
// =============================================================================

$envPath = __DIR__ . '/../.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Skip comments
        if (strpos(trim($line), '#') === 0) continue;
        // Skip lines without =
        if (strpos($line, '=') === false) continue;
        
        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        
        // Remove quotes if present
        $value = trim($value, '"\'\'');
        
        if (!empty($key) && !getenv($key)) {
            putenv("$key=$value");
        }
    }
}

// =============================================================================
// AUTHENTICATION (reads from .env or uses defaults)
// =============================================================================

// Username for edit mode
define('AUTH_USERNAME', getenv('AUTH_USERNAME') ?: 'tiesse');

// Password hash - CHANGE THIS IN PRODUCTION!
// To change password, run: php -r "echo password_hash('your_new_password', PASSWORD_DEFAULT);"
// Then replace the hash below with the generated value
define('AUTH_PASSWORD_HASH', getenv('AUTH_PASSWORD_HASH') ?: '$2y$10$e1nfIfvV2sZag1oARGD89.bG9emt6QxSQyHoreh9Ep5cFrFpgXlpm');

// Session timeout in seconds (8 hours)
define('SESSION_TIMEOUT', (int)(getenv('SESSION_TIMEOUT') ?: 28800));

// =============================================================================
// PATHS
// =============================================================================

define('DATA_DIR', __DIR__ . '/../data/');
define('DATA_FILE', DATA_DIR . 'network_manager.json');

// =============================================================================
// SECURITY
// =============================================================================

// Start session with secure settings
function initSession() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start([
            'cookie_httponly' => true,
            'cookie_samesite' => 'Strict',
            'gc_maxlifetime' => SESSION_TIMEOUT
        ]);
    }
}

// Check if user is authenticated
function isAuthenticated() {
    initSession();
    
    if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
        return false;
    }
    
    // Check session timeout
    if (isset($_SESSION['last_activity'])) {
        if (time() - $_SESSION['last_activity'] > SESSION_TIMEOUT) {
            // Session expired
            session_destroy();
            return false;
        }
        $_SESSION['last_activity'] = time();
    }
    
    return true;
}

// Verify password
function verifyPassword($password) {
    return password_verify($password, AUTH_PASSWORD_HASH);
}
