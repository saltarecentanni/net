<?php
// Simple /data endpoint for intranet deployment
// GET  -> returns network_manager.json (or empty template)
// POST -> writes JSON body to network_manager.json

header('Content-Type: application/json; charset=utf-8');

$file = __DIR__ . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'network_manager.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!file_exists($file)) {
        echo json_encode(["devices"=>[], "connections"=>[], "nextDeviceId"=>1]);
        exit;
    }
    $content = file_get_contents($file);
    if ($content === false) {
        http_response_code(500);
        echo json_encode(["error"=>"Unable to read data file"]);
        exit;
    }
    // validate JSON
    json_decode($content);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(500);
        echo json_encode(["error"=>"Invalid JSON in data file"]);
        exit;
    }
    echo $content;
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = file_get_contents('php://input');
    if ($body === false) {
        http_response_code(400);
        echo json_encode(["error"=>"Empty body"]);
        exit;
    }
    // basic validation: must decode to object/array with devices and connections
    $tmp = json_decode($body, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(["error"=>"Invalid JSON"]);
        exit;
    }
    
    // CRITICAL: Validate data structure to prevent corruption
    if (!isset($tmp['devices']) || !is_array($tmp['devices'])) {
        http_response_code(400);
        echo json_encode(["error"=>"Invalid data structure: missing or invalid 'devices' array"]);
        exit;
    }
    if (!isset($tmp['connections']) || !is_array($tmp['connections'])) {
        http_response_code(400);
        echo json_encode(["error"=>"Invalid data structure: missing or invalid 'connections' array"]);
        exit;
    }
    if (!isset($tmp['nextDeviceId']) || !is_int($tmp['nextDeviceId'])) {
        http_response_code(400);
        echo json_encode(["error"=>"Invalid data structure: missing or invalid 'nextDeviceId' integer"]);
        exit;
    }
    
    // ENHANCED: Validate content of devices array
    foreach ($tmp['devices'] as $index => $device) {
        if (!is_array($device)) {
            http_response_code(400);
            echo json_encode(["error"=>"Invalid device at index $index: must be an object"]);
            exit;
        }
        // Required fields for each device
        $requiredFields = ['id', 'rackId', 'name', 'type', 'status', 'ports'];
        foreach ($requiredFields as $field) {
            if (!isset($device[$field])) {
                http_response_code(400);
                echo json_encode(["error"=>"Invalid device at index $index: missing required field '$field'"]);
                exit;
            }
        }
        if (!is_int($device['id']) || $device['id'] < 1) {
            http_response_code(400);
            echo json_encode(["error"=>"Invalid device at index $index: 'id' must be a positive integer"]);
            exit;
        }
        if (!is_array($device['ports'])) {
            http_response_code(400);
            echo json_encode(["error"=>"Invalid device at index $index: 'ports' must be an array"]);
            exit;
        }
    }
    
    // ENHANCED: Validate content of connections array
    foreach ($tmp['connections'] as $index => $conn) {
        if (!is_array($conn)) {
            http_response_code(400);
            echo json_encode(["error"=>"Invalid connection at index $index: must be an object"]);
            exit;
        }
        // Required fields for each connection
        if (!isset($conn['from']) || !is_int($conn['from'])) {
            http_response_code(400);
            echo json_encode(["error"=>"Invalid connection at index $index: 'from' must be an integer"]);
            exit;
        }
        if (!isset($conn['type']) || !is_string($conn['type'])) {
            http_response_code(400);
            echo json_encode(["error"=>"Invalid connection at index $index: 'type' must be a string"]);
            exit;
        }
        if (!isset($conn['status']) || !is_string($conn['status'])) {
            http_response_code(400);
            echo json_encode(["error"=>"Invalid connection at index $index: 'status' must be a string"]);
            exit;
        }
    }
    
    // safe write with temp file
    $tmpFile = $file . '.tmp';
    $w = file_put_contents($tmpFile, json_encode($tmp, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));
    if ($w === false) {
        http_response_code(500);
        echo json_encode(["error"=>"Unable to write temp file"]);
        exit;
    }
    if (!rename($tmpFile, $file)) {
        http_response_code(500);
        echo json_encode(["error"=>"Unable to move temp file"]);
        exit;
    }
    echo json_encode(["ok"=>true]);
    exit;
}

http_response_code(405);
echo json_encode(["error"=>"Method not allowed"]);
