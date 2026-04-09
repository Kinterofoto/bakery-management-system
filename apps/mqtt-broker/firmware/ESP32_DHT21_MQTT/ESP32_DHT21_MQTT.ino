/*
 * PastryChef IoT - Sensor DHT21 (AM2301) con MQTT
 * Lee temperatura y humedad cada 60 segundos
 * Publica JSON via MQTT al broker
 * Hardware watchdog habilitado
 */

#include "DHT.h"
#include <WiFi.h>
#include <PubSubClient.h>
#include <esp_task_wdt.h>

// ===== CONFIGURACION =====
#define WIFI_SSID     "TP-Link_9384"
#define WIFI_PASSWORD "44693381"

// MQTT Broker
const char* MQTT_HOST = "35.224.65.166";
#define MQTT_PORT 1883

// MQTT Topic (arbol escalable)
// pastry/<site>/<area>/<device>/data
#define MQTT_TOPIC "pastry/site1/coldroom/cuarto1/data"
#define MQTT_CLIENT_ID "esp32-cuarto1"

// Sensor DHT21
#define DHTPIN  23
#define DHTTYPE DHT21

// Intervalo de lectura (ms)
#define READ_INTERVAL 60000

// Watchdog timeout (segundos)
#define WDT_TIMEOUT 120
// ===========================

DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient mqtt(espClient);

unsigned long previousMillis = 0;

void connectWiFi() {
  Serial.print("Conectando WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    esp_task_wdt_reset();
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(" OK! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(" FALLO!");
  }
}

void connectMQTT() {
  if (mqtt.connected()) return;

  int attempts = 0;
  while (!mqtt.connected() && attempts < 3) {
    Serial.print("Conectando MQTT...");
    if (mqtt.connect(MQTT_CLIENT_ID)) {
      Serial.println(" OK!");
      return;
    }
    Serial.print(" FALLO rc=");
    Serial.println(mqtt.state());
    attempts++;
    delay(2000);
    esp_task_wdt_reset();
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("=== PastryChef IoT - cuarto1 ===");

  // Hardware watchdog: reinicia el ESP32 si se cuelga
  esp_task_wdt_init(WDT_TIMEOUT, true);
  esp_task_wdt_add(NULL);
  Serial.printf("Watchdog habilitado (%ds)\n", WDT_TIMEOUT);

  dht.begin();
  connectWiFi();

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(256);
  connectMQTT();
}

void loop() {
  esp_task_wdt_reset();

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }
  if (!mqtt.connected()) {
    connectMQTT();
  }
  mqtt.loop();

  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis < READ_INTERVAL) return;
  previousMillis = currentMillis;

  float humedad = dht.readHumidity();
  float temperatura = dht.readTemperature();

  if (isnan(humedad) || isnan(temperatura)) {
    Serial.println("Error: No se pudo leer el sensor DHT21");
    return;
  }

  float indiceCalor = dht.computeHeatIndex(temperatura, humedad, false);

  // JSON payload consolidado
  char payload[128];
  snprintf(payload, sizeof(payload),
           "{\"temp\":%.1f,\"hum\":%.1f,\"hi\":%.1f}",
           temperatura, humedad, indiceCalor);

  mqtt.publish(MQTT_TOPIC, payload, true);

  Serial.printf("T: %.1f°C | H: %.1f%% | IC: %.1f°C\n",
                temperatura, humedad, indiceCalor);
}
