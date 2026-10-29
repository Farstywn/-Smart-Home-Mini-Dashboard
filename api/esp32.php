<?php
/**
 * REST API Terpadu Khusus Komunikasi ESP32 / Wokwi
 * Endpoint: /api/esp32.php
 * 
 * Menghemat siklus HTTP ESP32: Sekali kirim data sensor, langsung dapat status relay terbaru!
 */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    // 1. Simpan data sensor jika dikirimkan (via POST atau GET query)
    $temperature = null;
    $humidity    = null;
    $lightLevel  = null;

    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $body = json_decode($raw, true) ?: $_POST;
        if (isset($body['temp']) || isset($body['temperature'])) {
            $temperature = (float)($body['temp'] ?? $body['temperature']);
        }
        if (isset($body['hum']) || isset($body['humidity'])) {
            $humidity = (float)($body['hum'] ?? $body['humidity']);
        }
        if (isset($body['light']) || isset($body['light_level'])) {
            $lightLevel = (float)($body['light'] ?? $body['light_level']);
        }
    } elseif ($method === 'GET') {
        if (isset($_GET['temp'])) $temperature = (float)$_GET['temp'];
        if (isset($_GET['hum']))  $humidity    = (float)$_GET['hum'];
        if (isset($_GET['light'])) $lightLevel = (float)$_GET['light'];
    }

    if ($temperature !== null && $humidity !== null) {
        $stmtInsert = $pdo->prepare("INSERT INTO sensor_logs (temperature, humidity, light_level) VALUES (?, ?, ?)");
        $stmtInsert->execute([$temperature, $humidity, $lightLevel]);
    }

    // 2. Ambil status seluruh relay / pin GPIO untuk diterapkan ESP32
    $stmtDevices = $pdo->query("SELECT id, device_code, pin_gpio, status FROM devices ORDER BY pin_gpio ASC");
    $devices = $stmtDevices->fetchAll();

    $relays = [];
    foreach ($devices as $d) {
        $relays[] = [
            'pin'    => (int)$d['pin_gpio'],
            'state'  => (int)$d['status'],
            'code'   => $d['device_code']
        ];
    }

    echo json_encode([
        'status'    => 'success',
        'timestamp' => time(),
        'relays'    => $relays
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => $e->getMessage()
    ]);
}
