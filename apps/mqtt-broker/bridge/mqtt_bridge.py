"""
MQTT-to-Supabase Bridge
Buffers 3 MQTT messages per device, inserts 1 combined row.
"""

import os
import logging
from threading import Lock

import paho.mqtt.client as mqtt
from supabase import create_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

MQTT_HOST = os.getenv("MQTT_HOST", "mosquitto")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

EXPECTED_METRICS = {"temperatura", "humedad", "indice_calor"}

buffer = {}
buffer_lock = Lock()


def parse_value(payload: str):
    try:
        return float(payload)
    except (ValueError, TypeError):
        return None


def on_connect(client, userdata, flags, reason_code, properties):
    logger.info(f"Connected to MQTT broker (rc={reason_code})")
    client.subscribe("#")
    logger.info("Subscribed to all topics (#)")


def on_message(client, userdata, msg):
    parts = msg.topic.split("/")
    if len(parts) < 2:
        return

    device_id = parts[0]
    metric = parts[1]

    if metric not in EXPECTED_METRICS:
        return

    value = parse_value(msg.payload.decode("utf-8", errors="replace").strip())
    if value is None:
        return

    # Buffer the metric
    flush_data = None
    with buffer_lock:
        if device_id not in buffer:
            buffer[device_id] = {}
        buffer[device_id][metric] = value

        # All 3 metrics collected? Pop and flush
        if EXPECTED_METRICS.issubset(buffer[device_id].keys()):
            flush_data = buffer.pop(device_id)

    # Insert combined row outside the lock
    if flush_data:
        row = {"device_id": device_id, **flush_data}
        logger.info(f"{device_id}: T={flush_data['temperatura']} H={flush_data['humedad']} IC={flush_data['indice_calor']}")
        try:
            userdata["supabase"].table("sensor_readings").insert(row).execute()
            logger.info("Inserted 1 row")
        except Exception as e:
            logger.error(f"Supabase insert error: {e}")


def main():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        logger.error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required")
        return

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    logger.info("Supabase client initialized")

    client = mqtt.Client(
        mqtt.CallbackAPIVersion.VERSION2,
        client_id="mqtt-bridge",
        userdata={"supabase": supabase},
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


if __name__ == "__main__":
    main()
