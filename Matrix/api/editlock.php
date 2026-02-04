<?php
/**
 * TIESSE Matrix Network - Edit Lock API
 * Prevents concurrent editing conflicts
 * Version: 3.5.047
 */

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

// Lock file path
define('LOCK_FILE', __DIR__ . '/../data/edit.lock');
define('LOCK_TIMEOUT', 300); // 5 minutes of inactivity releases lock

/**
 * Get lock status
 */
function getLockStatus() {
    if (!file_exists(LOCK_FILE)) {
        return ['locked' => false];
    }
    
    $data = json_decode(file_get_contents(LOCK_FILE), true);
    if (!$data) {
        return ['locked' => false];
    }
    
    // Check if lock expired
    $elapsed = time() - $data['timestamp'];
    if ($elapsed > LOCK_TIMEOUT) {
        @unlink(LOCK_FILE);
        return ['locked' => false, 'expired' => true];
    }
    
    $data['locked'] = true;
    $data['elapsed'] = $elapsed;
    $data['remaining'] = LOCK_TIMEOUT - $elapsed;
    
    return $data;
}

/**
 * Acquire edit lock
 */
function acquireLock($editor) {
    $currentLock = getLockStatus();
    
    // Check if already locked by someone else
    if ($currentLock['locked'] && $currentLock['editor'] !== $editor) {
        return [
            'success' => false,
            'error' => 'edit_locked',
            'message' => "Modifica in corso da: {$currentLock['editor']}",
            'lockedBy' => $currentLock['editor'],
            'lockedAt' => $currentLock['lockedAt'],
            'remaining' => $currentLock['remaining']
        ];
    }
    
    // Acquire or refresh lock
    $lockData = [
        'editor' => $editor,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'timestamp' => time(),
        'lockedAt' => date('Y-m-d H:i:s')
    ];
    
    if (file_put_contents(LOCK_FILE, json_encode($lockData, JSON_PRETTY_PRINT), LOCK_EX)) {
        return [
            'success' => true,
            'message' => 'Lock acquisito',
            'editor' => $editor,
            'timeout' => LOCK_TIMEOUT
        ];
    }
    
    return ['success' => false, 'error' => 'write_error'];
}

/**
 * Release edit lock
 */
function releaseLock($editor) {
    $currentLock = getLockStatus();
    
    // Only the lock owner can release
    if ($currentLock['locked'] && $currentLock['editor'] !== $editor) {
        return [
            'success' => false,
            'error' => 'not_owner',
            'message' => 'Non puoi rilasciare un lock di un altro utente'
        ];
    }
    
    if (file_exists(LOCK_FILE)) {
        @unlink(LOCK_FILE);
    }
    
    return ['success' => true, 'message' => 'Lock rilasciato'];
}

/**
 * Heartbeat - refresh lock timestamp
 */
function heartbeat($editor) {
    $currentLock = getLockStatus();
    
    if (!$currentLock['locked']) {
        return ['success' => false, 'error' => 'no_lock'];
    }
    
    if ($currentLock['editor'] !== $editor) {
        return [
            'success' => false,
            'error' => 'not_owner',
            'lockedBy' => $currentLock['editor']
        ];
    }
    
    // Refresh timestamp
    return acquireLock($editor);
}

// Route request
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? 'status';

switch ($method) {
    case 'GET':
        // Get lock status
        echo json_encode(getLockStatus());
        break;
        
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $editor = $input['editor'] ?? 'unknown';
        $action = $input['action'] ?? 'acquire';
        
        switch ($action) {
            case 'acquire':
                echo json_encode(acquireLock($editor));
                break;
            case 'release':
                echo json_encode(releaseLock($editor));
                break;
            case 'heartbeat':
                echo json_encode(heartbeat($editor));
                break;
            default:
                http_response_code(400);
                echo json_encode(['error' => 'Invalid action']);
        }
        break;
        
    case 'DELETE':
        $input = json_decode(file_get_contents('php://input'), true);
        $editor = $input['editor'] ?? 'unknown';
        echo json_encode(releaseLock($editor));
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
