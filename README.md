# ⚡ LuminaSmart IoT - Smart Home Mini Dashboard

Proyek sistem kendali dan pemantauan rumah pintar (Smart Home Automation & Telemetry) berbasis **ESP32**, **Simulasi Wokwi**, dan **Web Dashboard Modern** dengan backend PHP & MySQL (XAMPP).

Proyek ini dirancang agar sangat mudah dipahami untuk pemula hingga menengah yang ingin mempelajari integrasi perangkat keras IoT dengan antarmuka web secara langsung.

---

## 🌟 Fitur Utama

1. **Kontrol Aktuator Dua Arah (Aktuasi)**:
   - Saklar lampu & peralatan listrik interaktif (ON / OFF) secara real-time dari web.
   - Kontrol massal: *Nyalakan Semua* & *Matikan Semua*.
   - Animasi status dinamis (lampu berpijar neon, kipas angin berputar).
2. **Telemetri & Monitoring Sensor Lingkungan**:
   - Pembacaan sensor suhu dan kelembaban udara (**DHT22**).
   - Pembacaan sensor intensitas cahaya (**LDR**).
   - Grafik tren perubahan suhu & kelembaban real-time menggunakan **Chart.js**.
3. **Simulasi Penuh di Wokwi (Tanpa Alat Fisik)**:
   - Dilengkapi file diagram wiring (`diagram.json`) dan firmware Arduino C++ (`sketch.ino`).
   - Dapat langsung dijalankan di Visual Studio Code via ekstensi **Wokwi Simulator**.
4. **Desain Web Dashboard Premium**:
   - Tampilan *Dark Mode* modern dengan estetika *Glassmorphism*.
   - Tipografi modern (*Plus Jakarta Sans*), micro-animations, dan tata letak responsif untuk HP, tablet, maupun desktop.
5. **Mode Pengujian Mandiri (Simulator Web)**:
   - Tombol *Tes Simulasi Sensor* untuk menguji grafik dan telemetri langsung dari browser tanpa harus menyalakan mikrokontroler.

---

## 🏗️ Arsitektur & Alur Kerja Sistem

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│     ESP32 (Wokwi Simulator)     │           │       Web Dashboard (Browser)   │
│ ─────────────────────────────── │           │ ─────────────────────────────── │
│ • DHT22 (Suhu & Kelembaban)     │           │ • Kontrol Saklar Lampu / Kipas  │
│ • LDR (Intensitas Cahaya)       │           │ • Grafik Tren Sensor (Chart.js) │
│ • LED / Relay (Lampu & Kipas)   │           │ • Polling Real-time (Fetch API) │
└───────────────┬─────────────────┘           └────────────────┬────────────────┘
                │                                              │
                │  HTTP POST (Telemetri + Polling Relay)       │  HTTP GET / POST
                ▼                                              ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                          Backend API (PHP & XAMPP)                            │
│ ───────────────────────────────────────────────────────────────────────────── │
│ • api/esp32.php    : Endpoint sinkronisasi cepat khusus ESP32                 │
│ • api/devices.php  : Endpoint kontrol status perangkat / saklar               │
│ • api/sensors.php  : Endpoint log telemetri dan data riwayat                  │
└───────────────────────────────────────┬───────────────────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                             Database (MySQL)                                  │
│ ───────────────────────────────────────────────────────────────────────────── │
│ • Tabel `devices`     : Menyimpan pin GPIO, ruangan, dan status (ON/OFF)      │
│ • Tabel `sensor_logs` : Menyimpan riwayat pembacaan sensor berkala            │
│ • Tabel `device_logs` : Menyimpan log aktivitas pergantian saklar             │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Struktur Direktori Proyek

```
iot/
├── api/
│   ├── devices.php          # REST API kontrol saklar peralatan
│   ├── esp32.php            # REST API terpadu untuk mikrokontroler ESP32
│   └── sensors.php          # REST API telemetri & grafik sensor
├── assets/
│   ├── css/
│   │   └── style.css        # Desain Dark Glassmorphism modern
│   └── js/
│       └── app.js           # Logika interaktif & polling real-time
├── config/
│   └── database.php         # Koneksi database PDO MySQL
├── database/
│   └── schema.sql           # Skema tabel & data awal (seed)
├── diagram.json             # Skema rangkaian Wokwi Simulator
├── libraries.txt            # Dependensi pustaka Arduino ESP32
├── sketch.ino               # Kode sumber program C++ ESP32
├── wokwi.toml               # Konfigurasi ekstensi Wokwi di VS Code
├── index.html               # Halaman utama Web Dashboard
├── index.php                # Entrypoint server lokal Apache
└── README.md                # Dokumentasi lengkap proyek
```

---

## 🔌 Pemetaan Pin GPIO ESP32

| Komponen Hardware | Pin GPIO ESP32 | Keterangan / Fungsi |
|---|---|---|
| **Sensor DHT22** (Data) | **GPIO 15** | Membaca Suhu (°C) & Kelembaban (%) |
| **Sensor LDR** (Analog) | **GPIO 34** | Membaca Intensitas Cahaya (ADC 0 - 4095) |
| **LED Merah** | **GPIO 18** | Simulasi Lampu Utama Ruang Tamu |
| **LED Hijau** | **GPIO 19** | Simulasi Lampu Teras Depan |
| **LED Kuning** | **GPIO 23** | Simulasi Kipas Angin Kamar Tidur |
| **VCC Sensor** | **3V3** | Sumber Daya 3.3V |
| **GND** | **GND** | Ground bersama |

---

## 🚀 Panduan Instalasi & Menjalankan Proyek

### 1. Menyiapkan XAMPP & Database
1. Buka aplikasi **XAMPP Control Panel**, lalu klik **Start** pada modul **Apache** dan **MySQL**.
2. Buka browser dan kunjungi: `http://localhost/phpmyadmin`.
3. Buat database baru bernama: `smarthome_db`.
4. Klik tab **Import**, pilih file `database/schema.sql` dari folder proyek ini, lalu klik **Go / Kirim**.

### 2. Membuka Dashboard di Browser
1. Buka browser dan akses alamat:
   ```
   http://localhost/iot/
   ```
2. Anda akan langsung melihat dashboard aktif. Coba klik saklar pada kartu lampu atau klik tombol **Tes Simulasi Sensor** untuk melihat respon langsung pada grafik!

---

### 3. Menjalankan Simulasi Wokwi di VS Code
1. Pastikan ekstensi **Wokwi Simulator** telah terpasang di VS Code Anda.
2. Buka file `diagram.json` di VS Code.
3. Klik tombol hijau **Start Simulation** (atau tekan `F1` lalu ketik `Wokwi: Start Simulator`).
4. Buka tab **Serial Monitor** di Wokwi untuk melihat proses koneksi WiFi dan pertukaran data telemetri.

> 💡 **Penting mengenai Wokwi & Localhost:**
> Simulasi Wokwi berjalan di sandbox cloud browser, sehingga Wokwi tidak dapat mengakses `http://localhost` secara langsung tanpa tunnel.
> **Cara termudah:**
> 1. Unduh dan jalankan [ngrok](https://ngrok.com/):
>    ```bash
>    ngrok http 80
>    ```
> 2. Salin URL publik ngrok Anda (contoh: `https://abcd-1234.ngrok-free.app`).
> 3. Buka file `sketch.ino` baris ke-35, lalu ubah variabel `API_URL`:
>    ```cpp
>    const char* API_URL = "https://abcd-1234.ngrok-free.app/iot/api/esp32.php";
>    ```
> 4. Jalankan ulang simulasi Wokwi. Sekarang ESP32 di Wokwi dan XAMPP di laptop Anda tersinkronisasi 100%!

---

## 📡 Referensi REST API

### 1. Perangkat & Saklar (`/api/devices.php`)
- **GET `/api/devices.php`**
  - Mengambil daftar seluruh saklar, status aktif (ON/OFF), dan total konsumsi daya watt.
- **POST `/api/devices.php`**
  - Memperbarui status perangkat.
  - Body (JSON):
    ```json
    { "id": 1, "status": 1 }
    ```
    atau toggle otomatis:
    ```json
    { "id": 1, "toggle": true }
    ```
  - Kontrol massal:
    ```json
    { "action_all": "all_on" } atau { "action_all": "all_off" }
    ```

### 2. Sensor & Telemetri (`/api/sensors.php`)
- **GET `/api/sensors.php?limit=15`**
  - Mengambil pembacaan sensor paling mutakhir dan riwayat untuk grafik tren.
- **POST `/api/sensors.php`**
  - Mengunggah data pembacaan sensor baru ke database.
  - Body (JSON):
    ```json
    {
      "temperature": 28.5,
      "humidity": 65.0,
      "light_level": 450,
      "motion_detected": 0
    }
    ```

### 3. Komunikasi Khusus ESP32 (`/api/esp32.php`)
- **POST `/api/esp32.php`**
  - Mengirim telemetri sensor sekaligus menerima status seluruh relay dalam 1 kali request HTTP.
  - Respon:
    ```json
    {
      "status": "success",
      "relays": [
        { "pin": 18, "state": 1, "code": "lamp_living" },
        { "pin": 19, "state": 0, "code": "lamp_porch" },
        { "pin": 23, "state": 0, "code": "fan_bedroom" }
      ]
    }
    ```

---

## 🛠️ Pengembangan Lanjutan (Roadmap)
- [ ] Integrasi protokol **MQTT** (broker HiveMQ / EMQX) untuk komunikasi sub-detik tanpa jeda HTTP polling.
- [ ] Otomatisasi berbasis aturan (misalnya: *Jika suhu > 30°C, nyalakan kipas otomatis*).
- [ ] Pengiriman notifikasi darurat via Bot Telegram atau WhatsApp Gateway.
- [ ] Peningkatan ke framework **Laravel** atau **Vue.js** untuk manajemen multi-user dan otentikasi role.

---

## 📄 Lisensi
Proyek ini dibuat untuk tujuan edukasi dan pengembangan IoT terbuka. Bebas digunakan, dipelajari, dan dikembangkan kembali.
