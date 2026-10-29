-- ====================================================================
-- Smart Home Mini Dashboard - Database Schema
-- Database: smarthome_db
-- ====================================================================

CREATE DATABASE IF NOT EXISTS `smarthome_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `smarthome_db`;

-- 1. Table: devices (Peralatan Listrik & Lampu)
DROP TABLE IF EXISTS `devices`;
CREATE TABLE `devices` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `device_code` VARCHAR(50) NOT NULL UNIQUE,
    `device_name` VARCHAR(100) NOT NULL,
    `room` VARCHAR(50) NOT NULL,
    `device_type` ENUM('light', 'fan', 'ac', 'switch', 'socket') DEFAULT 'light',
    `pin_gpio` INT NOT NULL,
    `status` TINYINT(1) DEFAULT 0 COMMENT '0: OFF, 1: ON',
    `power_watt` INT DEFAULT 15 COMMENT 'Estimasi daya dalam Watt saat aktif',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Table: sensor_logs (Riwayat pembacaan sensor IoT)
DROP TABLE IF EXISTS `sensor_logs`;
CREATE TABLE `sensor_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `temperature` FLOAT NOT NULL COMMENT 'Suhu dalam derajat Celcius',
    `humidity` FLOAT NOT NULL COMMENT 'Kelembaban dalam persen (%)',
    `light_level` FLOAT DEFAULT NULL COMMENT 'Intensitas cahaya (Lux / Nilai ADC 0-4095)',
    `motion_detected` TINYINT(1) DEFAULT 0 COMMENT 'Sensor gerak PIR (0: Tidak ada, 1: Ada)',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB;

-- 3. Table: device_logs (Riwayat aktivitas saklar / kontrol)
DROP TABLE IF EXISTS `device_logs`;
CREATE TABLE `device_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `device_id` INT NOT NULL,
    `action` ENUM('ON', 'OFF') NOT NULL,
    `triggered_by` VARCHAR(50) DEFAULT 'WEB_USER' COMMENT 'WEB_USER, ESP32_AUTO, TIMER',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ====================================================================
-- SEED DATA AWAL
-- ====================================================================

-- Data Perangkat Default untuk Simulasi
INSERT INTO `devices` (`id`, `device_code`, `device_name`, `room`, `device_type`, `pin_gpio`, `status`, `power_watt`) VALUES
(1, 'lamp_living', 'Lampu Utama Ruang Tamu', 'Ruang Tamu', 'light', 18, 0, 20),
(2, 'lamp_porch', 'Lampu Teras Depan', 'Luar Rumah', 'light', 19, 0, 15),
(3, 'fan_bedroom', 'Kipas Angin Kamar', 'Kamar Tidur', 'fan', 23, 0, 45),
(4, 'socket_kitchen', 'Stop Kontak Dapur', 'Dapur', 'socket', 22, 0, 100);

-- Data Log Sensor Dummy Awal agar grafik langsung terisi
INSERT INTO `sensor_logs` (`temperature`, `humidity`, `light_level`, `motion_detected`, `created_at`) VALUES
(28.4, 65.2, 450, 0, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(28.6, 64.8, 520, 0, DATE_SUB(NOW(), INTERVAL 25 MINUTE)),
(28.9, 63.5, 610, 1, DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
(29.1, 62.0, 700, 0, DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
(29.0, 62.8, 680, 0, DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
(28.8, 64.0, 590, 0, DATE_SUB(NOW(), INTERVAL 5 MINUTE)),
(28.5, 65.0, 500, 0, NOW());
