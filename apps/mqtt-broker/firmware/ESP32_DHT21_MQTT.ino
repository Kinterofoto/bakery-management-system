/*
 * PastryChef IoT - Sensor DHT21 (AM2301) con MQTT
 * Lee temperatura y humedad cada 5 segundos
 * y publica via MQTT al broker
 *
 * Conexiones:
 *   DHT21 VCC  -> 3.3V del ESP32
 *   DHT21 GND  -> GND del ESP32
 *   DHT21 DATA -> GPIO 4 del ESP32
 */

#include "DHT.h"
#include <WiFi.h>
#include <AsyncMqttClient.h>

extern "C" {
  #include "freertos/FreeRTOS.h"
  #include "freertos/timers.h"
}

// ===== CONFIGURACION =====
// WiFi
#define WIFI_SSID     "PASTRY_CHEF"
#define WIFI_PASSWORD "P4stry900ch3f"

// MQTT Broker (cambiar por IP del VM de GCE)
#define MQTT_HOST IPAddress(192, 168, 1, 254)
#define MQTT_PORT 1883

// Identificador del dispositivo
#define DEVICE_ID "cuarto1"

// MQTT Topics
#define MQTT_PUB_TEMP       DEVICE_ID "/temperatura"
#define MQTT_PUB_HUMEDAD    DEVICE_ID "/humedad"
#define MQTT_PUB_INDICE     DEVICE_ID "/indice_calor"

// Sensor DHT21
#define DHTPIN  4
#define DHTTYPE DHT21

// Intervalo de lectura (ms)
#define READ_INTERVAL 5000
// ===========================

DHT dht(DHTPIN, DHTTYPE);
AsyncMqttClient mqttClient;
TimerHandle_t mqttReconnectTimer;
TimerHandle_t wifiReconnectTimer;

unsigned long previousMillis = 0;

void connectToWifi() {
  Serial.println("Connecting to Wi-Fi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void connectToMqtt() {
  Serial.println("Connecting to MQTT...");
  mqttClient.connect();
}

void WiFiEvent(WiFiEvent_t event) {
  switch (event) {
    case SYSTEM_EVENT_STA_GOT_IP:
      Serial.print("WiFi connected, IP: ");
      Serial.println(WiFi.localIP());
      connectToMqtt();
      break;
    case SYSTEM_EVENT_STA_DISCONNECTED:
      Serial.println("WiFi lost connection");
      xTimerStop(mqttReconnectTimer, 0);
      xTimerStart(wifiReconnectTimer, 0);
      break;
  }
}

void onMqttConnect(bool sessionPresent) {
  Serial.println("Connected to MQTT broker");
}

void onMqttDisconnect(AsyncMqttClientDisconnectReason reason) {
  Serial.println("Disconnected from MQTT");
  if (WiFi.isConnected()) {
    xTimerStart(mqttReconnectTimer, 0);
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("=== PastryChef IoT - " DEVICE_ID " ===");

  dht.begin();

  mqttReconnectTimer = xTimerCreate("mqttTimer", pdMS_TO_TICKS(2000), pdFALSE, (void*)0,
    reinterpret_cast<TimerCallbackFunction_t>(connectToMqtt));
  wifiReconnectTimer = xTimerCreate("wifiTimer", pdMS_TO_TICKS(2000), pdFALSE, (void*)0,
    reinterpret_cast<TimerCallbackFunction_t>(connectToWifi));

  WiFi.onEvent(WiFiEvent);
  mqttClient.onConnect(onMqttConnect);
  mqttClient.onDisconnect(onMqttDisconnect);
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);

  connectToWifi();
  delay(2000);
}

void loop() {
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

  // Publish to MQTT
  mqttClient.publish(MQTT_PUB_TEMP, 1, true, String(temperatura).c_str());
  mqttClient.publish(MQTT_PUB_HUMEDAD, 1, true, String(humedad).c_str());
  mqttClient.publish(MQTT_PUB_INDICE, 1, true, String(indiceCalor).c_str());

  Serial.printf("T: %.1f°C | H: %.1f%% | IC: %.1f°C\n", temperatura, humedad, indiceCalor);
}
