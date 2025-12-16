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
