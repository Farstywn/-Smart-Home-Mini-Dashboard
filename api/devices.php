<?php
/**
 * REST API: Manajemen & Kontrol Perangkat (Lampu, Kipas, Stop Kontak)
 * Endpoint: /api/devices.php
 */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetDevices($pdo);
        break;

    case 'POST':
        handleUpdateDevice($pdo);
        break;

    default:
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Metode HTTP tidak diizinkan. Gunakan GET atau POST.']);
        break;
}

/**
 * Mengambil daftar seluruh perangkat atau perangkat spesifik
 */
function handleGetDevices(PDO $pdo) {
    try {
        if (isset($_GET['id'])) {
            $stmt = $pdo->prepare("SELECT * FROM devices WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $device = $stmt->fetch();

            if (!$device) {
                http_response_code(404);
                echo json_encode(['status' => 'error', 'message' => 'Perangkat tidak ditemukan']);
                return;
            }

            echo json_encode(['status' => 'success', 'data' => $device]);
            return;
        }

        // Ambil semua perangkat
        $stmt = $pdo->query("SELECT * FROM devices ORDER BY id ASC");
        $devices = $stmt->fetchAll();

        // Hitung total daya yang sedang aktif (Watt)
        $activePower = 0;
        $activeCount = 0;
        foreach ($devices as $d) {
            if ($d['status'] == 1) {
                $activePower += (int)$d['power_watt'];
                $activeCount++;
            }
        }

        echo json_encode([
            'status' => 'success',
            'summary' => [
                'total_devices' => count($devices),
                'active_devices' => $activeCount,
                'total_active_power_watt' => $activePower
            ],
            'data' => $devices
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

/**
 * Memperbarui status perangkat (ON/OFF atau Toggle)
 */
function handleUpdateDevice(PDO $pdo) {
    try {
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);

        if (!$input) {
            $input = $_POST;
        }

        // Fitur Massal: Matikan / Nyalakan Semua
        if (isset($input['action_all'])) {
            $newStatus = ($input['action_all'] === 'all_on') ? 1 : 0;
            $stmt = $pdo->prepare("UPDATE devices SET status = ?");
            $stmt->execute([$newStatus]);

            echo json_encode([
                'status'  => 'success',
                'message' => 'Semua perangkat berhasil diatur ke ' . ($newStatus ? 'ON' : 'OFF'),
                'new_status' => $newStatus
            ]);
            return;
        }

        $deviceId   = $input['id'] ?? null;
        $deviceCode = $input['device_code'] ?? null;
        $status     = isset($input['status']) ? (int)$input['status'] : null;
        $isToggle   = isset($input['toggle']) && $input['toggle'] == true;
        $triggerBy  = $input['triggered_by'] ?? 'WEB_USER';

        if (!$deviceId && !$deviceCode) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'ID atau Device Code perangkat wajib diisi']);
            return;
        }

        // Cari perangkat
        if ($deviceId) {
            $stmt = $pdo->prepare("SELECT * FROM devices WHERE id = ?");
            $stmt->execute([$deviceId]);
        } else {
            $stmt = $pdo->prepare("SELECT * FROM devices WHERE device_code = ?");
            $stmt->execute([$deviceCode]);
        }
        $device = $stmt->fetch();

        if (!$device) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Perangkat tidak ditemukan']);
            return;
        }

        // Tentukan status baru
        if ($isToggle) {
            $newStatus = ($device['status'] == 1) ? 0 : 1;
        } else {
            $newStatus = ($status === 1) ? 1 : 0;
        }

        // Update database
        $updateStmt = $pdo->prepare("UPDATE devices SET status = ? WHERE id = ?");
        $updateStmt->execute([$newStatus, $device['id']]);

        // Catat ke log aktivitas
        $logStmt = $pdo->prepare("INSERT INTO device_logs (device_id, action, triggered_by) VALUES (?, ?, ?)");
        $logStmt->execute([$device['id'], $newStatus ? 'ON' : 'OFF', $triggerBy]);

        echo json_encode([
            'status'     => 'success',
            'message'    => "Perangkat '{$device['device_name']}' berhasil diubah menjadi " . ($newStatus ? 'ON' : 'OFF'),
            'device_id'  => (int)$device['id'],
            'pin_gpio'   => (int)$device['pin_gpio'],
            'new_status' => $newStatus
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}
