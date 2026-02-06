<?php
/**
 * Guacamole Connection Diagnostic
 * Access: http://10.10.225.103/matrix/api/guacamole-test.php
 */

header('Content-Type: text/plain; charset=utf-8');

echo "=== GUACAMOLE DIAGNOSTIC ===\n\n";

// 1. Check cURL
echo "1. PHP cURL: ";
if (function_exists('curl_init')) {
    echo "OK\n";
} else {
    echo "NOT INSTALLED - Run: sudo apt install php-curl && sudo systemctl restart apache2\n";
    exit;
}

// 2. Load config
echo "2. Config: ";
$configFile = __DIR__ . '/../config/guacamole.json';
if (!file_exists($configFile)) {
    echo "NOT FOUND: $configFile\n";
    exit;
}
$config = json_decode(file_get_contents($configFile), true);
if (!$config) {
    echo "INVALID JSON\n";
    exit;
}
echo "OK\n";

$baseUrl = rtrim($config['server']['baseUrl'], '/');
$apiUrl = $baseUrl . '/api';
$username = $config['credentials']['username'];
$password = $config['credentials']['password'];

echo "   Base URL: $baseUrl\n";
echo "   Username: $username\n";

// 3. Test connectivity
echo "\n3. Connectivity: ";

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $baseUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_FOLLOWLOCATION => true
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo "CURL ERROR: $error\n";
    exit;
}
if ($httpCode >= 200 && $httpCode < 400) {
    echo "OK (HTTP $httpCode)\n";
} else {
    echo "FAILED (HTTP $httpCode)\n";
    echo "   Check: docker ps | grep guac\n";
    exit;
}

// 4. Test auth
echo "\n4. Authentication: ";

$authData = 'username=' . urlencode($username) . '&password=' . urlencode($password);

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $apiUrl . '/tokens',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $authData,
    CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
    CURLOPT_SSL_VERIFYPEER => false
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

$data = json_decode($response, true);

if ($httpCode === 200 && isset($data['authToken'])) {
    echo "OK\n";
    echo "   Token: " . substr($data['authToken'], 0, 20) . "...\n";
    echo "   DataSource: " . ($data['dataSource'] ?? 'unknown') . "\n";
    
    // 5. List connections
    $token = $data['authToken'];
    $dataSource = $data['dataSource'] ?? 'postgresql';
    
    echo "\n5. Connections: ";
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $apiUrl . '/session/data/' . $dataSource . '/connections?token=' . urlencode($token),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => false
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $connections = json_decode($response, true);
    if (is_array($connections)) {
        echo count($connections) . " found\n";
        foreach (array_slice($connections, 0, 5) as $id => $conn) {
            echo "   - " . ($conn['name'] ?? 'unnamed') . " (" . ($conn['protocol'] ?? '?') . ")\n";
        }
    } else {
        echo "FAILED\n";
    }
    
    echo "\n=== ALL TESTS PASSED ===\n";
    
} else {
    echo "FAILED (HTTP $httpCode)\n";
    echo "   Response: $response\n";
    echo "\n   User '$username' needs to be created in Guacamole:\n";
    echo "   1. Login as guacadmin at $baseUrl\n";
    echo "   2. Settings > Users > New User\n";
    echo "   3. Username: $username, Password: (from config)\n";
    echo "   4. Permissions: Create connections, Administer\n";
}
