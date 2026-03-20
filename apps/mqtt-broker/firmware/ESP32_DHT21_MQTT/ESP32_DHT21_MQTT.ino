/*
 * PastryChef IoT - Sensor DHT21 (AM2301) con MQTT
 * Lee temperatura y humedad cada 5 segundos
 * y publica via MQTT al broker
 */

#include "DHT.h"
#include <WiFi.h>
#include <PubSubClient.h>

// ===== CONFIGURACION =====
#define WIFI_SSID     "PASTRY_CHEF"
#define WIFI_PASSWORD "P4stry900ch3f"

// MQTT Broker
const char* MQTT_HOST = "35.224.65.166";
#define MQTT_PORT 1883

// Sensor DHT21
#define DHTPIN  23
#define DHTTYPE DHT21

// Intervalo de lectura (ms)
#define READ_INTERVAL 60000
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
  Serial.print("Conectando MQTT...");
  if (mqtt.connect("esp32-cuarto1")) {
    Serial.println(" OK!");
  } else {
    Serial.print(" FALLO rc=");
    Serial.println(mqtt.state());
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("=== PastryChef IoT - cuarto1 ===");

  dht.begin();

  connectWiFi();

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  connectMQTT();
}

void loop() {
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

  mqtt.publish("cuarto1/temperatura", String(temperatura).c_str(), true);
  mqtt.publish("cuarto1/humedad", String(humedad).c_str(), true);
  mqtt.publish("cuarto1/indice_calor", String(indiceCalor).c_str(), true);

  Serial.printf("T: %.1f°C | H: %.1f%% | IC: %.1f°C\n", temperatura, humedad, indiceCalor);
}
