/**
 * ====================================================================
 * LuminaSmart IoT - Firmware ESP32 (Wokwi Simulator / Hardware Fisik)
 * ====================================================================
 * 
 * Fitur:
 * 1. Menghubungkan ke WiFi (Wokwi-GUEST untuk simulator, atau SSID rumah)
 * 2. Membaca Sensor Lingkungan:
 *    - DHT22 (Suhu & Kelembaban) di GPIO 15
 *    - LDR Photoresistor (Intensitas Cahaya) di GPIO 34 (ADC)
 * 3. Mengontrol Aktuator / Lampu (Relay):
 *    - Lampu Utama Ruang Tamu: GPIO 18
 *    - Lampu Teras: GPIO 19
 *    - Kipas Angin: GPIO 23
 * 4. Sinkronisasi Real-time 2-Arah via REST API (api/esp32.php)
 * ====================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// --- KONFIGURASI WIFI ---
// Pada Wokwi Simulator, WiFi bawaan bernama "Wokwi-GUEST" tanpa password
const char* WIFI_SSID     = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

// --- KONFIGURASI API BACKEND ---
// CATATAN PENTING UNTUK WOKWI:
// Karena simulasi Wokwi berjalan di cloud browser sandbox, Wokwi tidak bisa
// langsung memanggil 'http://localhost'.
// 
// Cara termudah menghubungkan Wokwi ke XAMPP lokal Anda:
// 1. Jalankan ngrok di terminal laptop: `ngrok http 80`
// 2. Ganti API_URL di bawah ini dengan URL ngrok Anda, contoh:
//    "https://xxxx-xx-xx-xx.ngrok-free.app/iot/api/esp32.php"
// 
// Jika menggunakan ESP32 Fisik (bukan simulator), cukup gunakan IP lokal laptop:
//    "http://192.168.1.10/iot/api/esp32.php"
const char* API_URL = "http://localhost/iot/api/esp32.php"; 

// --- DEFINISI PIN GPIO ---
#define DHTPIN        15    // Pin data sensor DHT22
#define DHTTYPE       DHT22 // Tipe sensor DHT 22 (AM2302)
#define LDRPIN        34    // Pin analog LDR Cahaya

#define PIN_LAMP_LIVING  18 // Lampu Ruang Tamu
#define PIN_LAMP_PORCH   19 // Lampu Teras
#define PIN_FAN_BEDROOM  23 // Kipas Angin

DHT dht(DHTPIN, DHTTYPE);

// Interval sinkronisasi (dalam milidetik)
const unsigned long SYNC_INTERVAL = 3000;
unsigned long lastSyncTime = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n==============================================");
  Serial.println("⚡ LuminaSmart IoT - ESP32 Firmware Starting");
  Serial.println("==============================================");

  // Inisialisasi Pin Output Relay / LED
  pinMode(PIN_LAMP_LIVING, OUTPUT);
  pinMode(PIN_LAMP_PORCH, OUTPUT);
  pinMode(PIN_FAN_BEDROOM, OUTPUT);

  // Status awal: Matikan semua lampu
  digitalWrite(PIN_LAMP_LIVING, LOW);
  digitalWrite(PIN_LAMP_PORCH, LOW);
  digitalWrite(PIN_FAN_BEDROOM, LOW);

  // Inisialisasi Sensor DHT22
  dht.begin();
  Serial.println("✅ Sensor DHT22 diinisialisasi pada GPIO 15");

  // Hubungkan ke WiFi
  connectToWiFi();
}

void loop() {
  // Pastikan koneksi WiFi tetap aktif
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }

  // Siklus sinkronisasi berkala
  unsigned long currentMillis = millis();
  if (currentMillis - lastSyncTime >= SYNC_INTERVAL) {
    lastSyncTime = currentMillis;

    // 1. Baca Data Sensor
    float temperature = dht.readTemperature();
    float humidity    = dht.readHumidity();
    int   ldrRaw      = analogRead(LDRPIN);

    // Validasi pembacaan DHT22
    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("⚠️ Gagal membaca dari sensor DHT22! Gunakan nilai default...");
      temperature = 28.5;
      humidity = 65.0;
    }

    // Tampilkan data telemetri di Serial Monitor
    Serial.println("\n----------------------------------------------");
    Serial.printf("📊 [TELEMETRI SENSOR] Suhu: %.1f °C | Kelembaban: %.1f %% | Cahaya (ADC): %d\n", 
                  temperature, humidity, ldrRaw);

    // 2. Kirim data sensor & ambil status relay terbaru dari Web API
    syncWithBackend(temperature, humidity, ldrRaw);
  }
}

/**
 * Menghubungkan ESP32 ke Access Point WiFi
 */
void connectToWiFi() {
  Serial.printf("📡 Menghubungkan ke WiFi: %s ", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Terhubung!");
    Serial.printf("📶 IP ESP32: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n❌ Gagal terhubung ke WiFi. Akan mencoba lagi...");
  }
}

/**
 * Sinkronisasi 2-Arah: Mengirim Telemetri & Menerima Perintah Relay
 */
void syncWithBackend(float temp, float hum, int light) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi tidak terhubung, sinkronisasi dibatalkan.");
    return;
  }

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");

  // Siapkan Payload JSON pengiriman telemetri
  StaticJsonDocument<256> docSend;
  docSend["temp"]  = round(temp * 10) / 10.0;
  docSend["hum"]   = round(hum * 10) / 10.0;
  docSend["light"] = light;

  String requestBody;
  serializeJson(docSend, requestBody);

  Serial.printf("📤 Mengirim data ke: %s\n", API_URL);
  int httpResponseCode = http.POST(requestBody);

  if (httpResponseCode > 0) {
    String responseString = http.getString();
    Serial.printf("📥 Respon HTTP (%d): %s\n", httpResponseCode, responseString.c_str());

    // Parse JSON respon dari backend
    StaticJsonDocument<512> docReceive;
    DeserializationError error = deserializeJson(docReceive, responseString);

    if (!error && docReceive.containsKey("relays")) {
      JsonArray relays = docReceive["relays"].as<JsonArray>();

      Serial.println("🔌 [STATUS RELAY DITERIMA]");
      for (JsonObject relay : relays) {
        int pin   = relay["pin"];
        int state = relay["state"];
        String code = relay["code"] | "perangkat";

        // Terapkan ke pin GPIO ESP32
        pinMode(pin, OUTPUT);
        digitalWrite(pin, state == 1 ? HIGH : LOW);

        Serial.printf("   ➜ GPIO %d (%s) => %s\n", pin, code.c_str(), state == 1 ? "ON (HIGH)" : "OFF (LOW)");
      }
    } else {
      Serial.println("⚠️ Respon backend tidak berisi array relays.");
    }
  } else {
    Serial.printf("❌ HTTP POST Gagal. Kode error: %d (%s)\n", httpResponseCode, http.errorToString(httpResponseCode).c_str());
    Serial.println("💡 Tips: Untuk Wokwi, gunakan tunnel seperti ngrok untuk mengekspos http://localhost/iot.");
  }

  http.end();
}
