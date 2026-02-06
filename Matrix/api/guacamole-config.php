<?php
/**
 * Guacamole Configuration API
 * Returns guacamole.json content (without sensitive credentials)
 * Works on Apache without Node.js
 */

header('Content-Type: application/json');
header('Cache-Control: no-cache');

$configFile = __DIR__ . '/../config/guacamole.json';

if (!file_exists($configFile)) {
    http_response_code(404);
    echo json_encode(['error' => 'Config not found', 'enabled' => false]);
    exit;
}

$config = json_decode(file_get_contents($configFile), true);

if (!$config) {
    http_response_code(500);
    echo json_encode(['error' => 'Invalid config', 'enabled' => false]);
    exit;
}

// Return only necessary fields (hide credentials)
$safeConfig = [
    'enabled' => $config['enabled'] ?? false,
    'server' => [
        'baseUrl' => $config['server']['baseUrl'] ?? null
    ],
    'ui' => $config['ui'] ?? [
        'showProtocolButtons' => ['ssh', 'rdp', 'vnc', 'telnet'],
        'openInNewTab' => true
    ]
];

echo json_encode($safeConfig);
