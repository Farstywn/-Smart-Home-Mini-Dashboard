<?php
/**
 * REST API: Monitoring Data Sensor IoT (Suhu, Kelembaban, Cahaya, Gerak)
 * Endpoint: /api/sensors.php
 */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetSensorData($pdo);
        break;

    case 'POST':
        handlePostSensorData($pdo);
        break;

    default:
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Metode HTTP tidak diizinkan. Gunakan GET atau POST.']);
        break;
}

/**
 * Mengambil data sensor terbaru dan data historis untuk grafik
 */
function handleGetSensorData(PDO $pdo) {
    try {
        // Ambil data terbaru (1 record)
        $latestStmt = $pdo->query("SELECT * FROM sensor_logs ORDER BY id DESC LIMIT 1");
        $latest = $latestStmt->fetch();

        // Ambil 20 data terakhir untuk grafik tren
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 15;
        $historyStmt = $pdo->prepare("SELECT * FROM (
            SELECT id, temperature, humidity, light_level, motion_detected, created_at 
            FROM sensor_logs 
            ORDER BY id DESC 
            LIMIT ?
        ) AS sub ORDER BY id ASC");
        $historyStmt->execute([$limit]);
        $history = $historyStmt->fetchAll();

        // Hitung rata-rata dan min/max jika data ada
        $avgTemp = 0;
        $avgHum  = 0;
        if (!empty($history)) {
            $temps = array_column($history, 'temperature');
            $hums  = array_column($history, 'humidity');
            $avgTemp = round(array_sum($temps) / count($temps), 1);
            $avgHum  = round(array_sum($hums) / count($hums), 1);
        }

        echo json_encode([
            'status' => 'success',
            'latest' => $latest ?: [
                'temperature' => 0,
                'humidity' => 0,
                'light_level' => 0,
                'motion_detected' => 0,
                'created_at' => date('Y-m-d H:i:s')
            ],
            'statistics' => [
                'average_temp' => $avgTemp,
                'average_humidity' => $avgHum,
                'data_points' => count($history)
            ],
            'history' => $history
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

/**
 * Menyimpan data pembacaan sensor baru dari ESP32 atau simulasi
 */
function handlePostSensorData(PDO $pdo) {
    try {
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);

        if (!$input) {
            $input = $_POST;
        }

        $temperature    = isset($input['temperature']) ? (float)$input['temperature'] : null;
        $humidity       = isset($input['humidity']) ? (float)$input['humidity'] : null;
        $lightLevel     = isset($input['light_level']) ? (float)$input['light_level'] : (isset($input['light']) ? (float)$input['light'] : null);
        $motionDetected = isset($input['motion_detected']) ? (int)$input['motion_detected'] : 0;

        if ($temperature === null || $humidity === null) {
            http_response_code(400);
            echo json_encode([
                'status'  => 'error',
                'message' => 'Parameter temperature dan humidity wajib dikirimkan.'
            ]);
            return;
        }

        $stmt = $pdo->prepare("INSERT INTO sensor_logs (temperature, humidity, light_level, motion_detected) VALUES (?, ?, ?, ?)");
        $stmt->execute([$temperature, $humidity, $lightLevel, $motionDetected]);
        $insertedId = $pdo->lastInsertId();

        echo json_encode([
            'status'     => 'success',
            'message'    => 'Data sensor berhasil disimpan.',
            'log_id'     => $insertedId,
            'received'   => [
                'temperature' => $temperature,
                'humidity'    => $humidity,
                'light_level' => $lightLevel,
                'motion'      => $motionDetected
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}
