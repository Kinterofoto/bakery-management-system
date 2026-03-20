"""
MQTT-to-Supabase Bridge
Subscribes to all sensor topics and inserts readings into Supabase.
"""

import os
import json
import logging
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt
from supabase import create_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Config
MQTT_HOST = os.getenv("MQTT_HOST", "mosquitto")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Topics to numeric metrics (values we want to store)
NUMERIC_METRICS = {"temperatura", "humedad", "puerta", "tiempo", "indice_calor"}


def parse_value(payload: str):
    """Try to parse payload as a number."""
    try:
        return float(payload)
    except (ValueError, TypeError):
        return None


def on_connect(client, userdata, flags, reason_code, properties):
    """Subscribe to all sensor topics on connect."""
    logger.info(f"Connected to MQTT broker (rc={reason_code})")
    # Subscribe to all topics under device prefixes
    client.subscribe("#")
    logger.info("Subscribed to all topics (#)")


def on_message(client, userdata, msg):
    """Process incoming MQTT messages and insert into Supabase."""
    topic = msg.topic
    payload = msg.payload.decode("utf-8", errors="replace").strip()

    # Parse topic: expected format "device_id/metric" e.g. "cuarto1/temperatura"
    parts = topic.split("/")
    if len(parts) < 2:
        return

    device_id = parts[0]
    metric = parts[1]

    # Only store numeric metrics
    value = parse_value(payload)
    if value is None:
        logger.debug(f"Skipping non-numeric: {topic} = {payload}")
        return

    logger.info(f"{topic} = {value}")

    try:
        supabase = userdata["supabase"]
        supabase.table("sensor_readings").insert({
            "device_id": device_id,
            "metric": metric,
            "value": value,
        }).execute()
    except Exception as e:
        logger.error(f"Supabase insert error: {e}")


def main():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        logger.error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required")
        return

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    logger.info("Supabase client initialized")

    userdata = {"supabase": supabase}

    client = mqtt.Client(
        mqtt.CallbackAPIVersion.VERSION2,
        client_id="mqtt-bridge",
        userdata=userdata,
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
