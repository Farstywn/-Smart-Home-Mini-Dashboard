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
// PENTING UNTUK WOKWI SIMULATOR:
// Di dalam Wokwi, kata 'localhost' merujuk ke ESP32 itu sendiri (bukan laptop Anda).
// Wokwi menyediakan hostname khusus: "host.wokwi.internal" untuk mengakses localhost PC.
// Jika host.wokwi.internal tidak merespon, firmware akan otomatis mencoba IP laptop Anda.
const char* API_URL          = "http://host.wokwi.internal:8080/iot/api/esp32.php"; 
const char* API_FALLBACK_URL = "http://192.168.1.4:8080/iot/api/esp32.php";

// --- DEFINISI PIN GPIO ---
#define DHTPIN        15    // Pin data sensor DHT22
#define DHTTYPE       DHT22 // Tipe sensor DHT 22 (AM2302)
#define LDRPIN        34    // Pin analog LDR Cahaya

#define PIN_LAMP_LIVING  18 // Lampu Ruang Tamu (LED Merah)
#define PIN_LAMP_PORCH   19 // Lampu Teras (LED Hijau)
#define PIN_FAN_BEDROOM  23 // Kipas Angin (LED Kuning)

DHT dht(DHTPIN, DHTTYPE);

// Interval sinkronisasi (dalam milidetik - 1.5 detik agar respon cepat)
const unsigned long SYNC_INTERVAL = 1500;
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

  // Siapkan Payload JSON pengiriman telemetri
  StaticJsonDocument<256> docSend;
  docSend["temp"]  = round(temp * 10) / 10.0;
  docSend["hum"]   = round(hum * 10) / 10.0;
  docSend["light"] = light;

  String requestBody;
  serializeJson(docSend, requestBody);

  HTTPClient http;
  
  // Coba URL Utama (host.wokwi.internal)
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(2000);

  int httpResponseCode = http.POST(requestBody);
  String activeUrl = API_URL;

  // Jika gagal, coba URL Fallback (IP LAN Laptop)
  if (httpResponseCode <= 0) {
    http.end();
    http.begin(API_FALLBACK_URL);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(2000);
    httpResponseCode = http.POST(requestBody);
    activeUrl = API_FALLBACK_URL;
  }

  if (httpResponseCode > 0) {
    String responseString = http.getString();

    // Parse JSON respon dari backend
    StaticJsonDocument<512> docReceive;
    DeserializationError error = deserializeJson(docReceive, responseString);

    if (!error && docReceive.containsKey("relays")) {
      JsonArray relays = docReceive["relays"].as<JsonArray>();

      for (JsonObject relay : relays) {
        int pin   = relay["pin"];
        int state = relay["state"];
        String code = relay["code"] | "perangkat";

        // Terapkan ke pin GPIO ESP32 & LED Simulator
        pinMode(pin, OUTPUT);
        digitalWrite(pin, state == 1 ? HIGH : LOW);

        if (state == 1) {
          Serial.printf("💡 [AKTIF] GPIO %d (%s) => MENYALA\n", pin, code.c_str());
        }
      }
    }
  } else {
    Serial.printf("❌ Gagal terhubung ke API (%s). Error: %d\n", activeUrl.c_str(), httpResponseCode);
    Serial.println("💡 Tips: Pastikan Apache XAMPP aktif di port 8080.");
  }

  http.end();
}
