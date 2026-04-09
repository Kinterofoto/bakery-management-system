"""
MQTT-to-InfluxDB Bridge
Receives sensor data via MQTT and writes to InfluxDB.

Supports two payload formats:
  1. JSON (new): topic "pastry/+/+/+/data" with {"temp", "hum", "hi"}
  2. Legacy:     topic "<device>/<metric>" with plain float value
"""

import os
import json
import logging
from threading import Lock

import paho.mqtt.client as mqtt
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# --- Config ---
MQTT_HOST = os.getenv("MQTT_HOST", "mosquitto")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))

INFLUXDB_URL = os.getenv("INFLUXDB_URL", "http://influxdb:8086")
INFLUXDB_TOKEN = os.getenv("INFLUXDB_TOKEN")
INFLUXDB_ORG = os.getenv("INFLUXDB_ORG", "pastrychef")
INFLUXDB_BUCKET = os.getenv("INFLUXDB_BUCKET", "sensors")

# --- Legacy buffering (3 separate messages -> 1 point) ---
EXPECTED_METRICS = {"temperatura", "humedad", "indice_calor"}
buffer: dict[str, dict[str, float]] = {}
buffer_lock = Lock()


def parse_float(raw: str):
    try:
        return float(raw)
    except (ValueError, TypeError):
        return None


def write_point(write_api, device_id: str, site: str, area: str,
                temp: float, hum: float, hi: float):
    """Write a single sensor reading to InfluxDB."""
    point = (
        Point("sensor_reading")
        .tag("device_id", device_id)
        .tag("site", site)
        .tag("area", area)
        .field("temperatura", temp)
        .field("humedad", hum)
        .field("indice_calor", hi)
    )
    write_api.write(bucket=INFLUXDB_BUCKET, org=INFLUXDB_ORG, record=point)
    logger.info(f"{device_id}: T={temp} H={hum} IC={hi}")


def handle_json_payload(write_api, topic: str, payload: str):
    """Handle new JSON format: pastry/<site>/<area>/<device>/data"""
    parts = topic.split("/")
    if len(parts) != 5 or parts[4] != "data":
        return False

    _, site, area, device_id, _ = parts
    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        return False

    temp = data.get("temp")
    hum = data.get("hum")
    hi = data.get("hi")

    if temp is None or hum is None or hi is None:
        logger.warning(f"Incomplete JSON payload from {device_id}: {data}")
        return True  # Was JSON, just incomplete

    write_point(write_api, device_id, site, area, temp, hum, hi)
    return True


def handle_legacy_payload(write_api, topic: str, payload: str):
    """Handle legacy format: <device>/<metric> with plain float."""
    parts = topic.split("/")
    if len(parts) != 2:
        return

    device_id, metric = parts
    if metric not in EXPECTED_METRICS:
        return

    value = parse_float(payload)
    if value is None:
        return

    flush_data = None
    with buffer_lock:
        if device_id not in buffer:
            buffer[device_id] = {}
        buffer[device_id][metric] = value

        if EXPECTED_METRICS.issubset(buffer[device_id].keys()):
            flush_data = buffer.pop(device_id)

    if flush_data:
        write_point(
            write_api, device_id,
            site="default", area="coldroom",
            temp=flush_data["temperatura"],
            hum=flush_data["humedad"],
            hi=flush_data["indice_calor"],
        )


# --- MQTT callbacks ---
def on_connect(client, userdata, flags, reason_code, properties):
    logger.info(f"Connected to MQTT broker (rc={reason_code})")
    client.subscribe("pastry/#")
    client.subscribe("+/+")  # legacy topics like cuarto1/temperatura
    logger.info("Subscribed to pastry/# and +/+ (legacy)")


def on_message(client, userdata, msg):
    write_api = userdata["write_api"]
    payload = msg.payload.decode("utf-8", errors="replace").strip()

    # Try new JSON format first, fall back to legacy
    if not handle_json_payload(write_api, msg.topic, payload):
        handle_legacy_payload(write_api, msg.topic, payload)


def main():
    if not INFLUXDB_TOKEN:
        logger.error("INFLUXDB_TOKEN is required")
        return

    influx = InfluxDBClient(
        url=INFLUXDB_URL, token=INFLUXDB_TOKEN, org=INFLUXDB_ORG
    )
    write_api = influx.write_api(write_options=SYNCHRONOUS)
    logger.info(f"InfluxDB client ready ({INFLUXDB_URL})")

    client = mqtt.Client(
        mqtt.CallbackAPIVersion.VERSION2,
        client_id="mqtt-bridge",
        userdata={"write_api": write_api},
    )
    client.on_connect = on_connect
    client.on_message = on_message
    client.reconnect_delay_set(min_delay=1, max_delay=30)

    logger.info(f"Connecting to MQTT broker at {MQTT_HOST}:{MQTT_PORT}")
    client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)

    try:
        client.loop_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down")
        client.disconnect()
        influx.close()


if __name__ == "__main__":
    main()
