#!/bin/bash
# Deploy Mosquitto + MQTT Bridge to Google Compute Engine
# Usage: ./deploy.sh

set -e

PROJECT_ID=$(gcloud config get-value project)
ZONE="us-central1-a"
INSTANCE_NAME="mqtt-broker"
MACHINE_TYPE="e2-micro"

echo "=== PastryChef MQTT Broker - GCE Deploy ==="
echo "Project: $PROJECT_ID"
echo "Zone: $ZONE"
echo "Instance: $INSTANCE_NAME"
echo ""

# 1. Reserve static IP (if not exists)
echo "--- Reserving static IP ---"
gcloud compute addresses create mqtt-broker-ip \
  --region=us-central1 \
  --description="Static IP for MQTT broker" 2>/dev/null || echo "IP already reserved"

STATIC_IP=$(gcloud compute addresses describe mqtt-broker-ip --region=us-central1 --format='get(address)')
echo "Static IP: $STATIC_IP"

# 2. Create firewall rule for MQTT (if not exists)
echo "--- Creating firewall rule ---"
gcloud compute firewall-rules create allow-mqtt \
  --allow=tcp:1883 \
  --target-tags=mqtt-broker \
  --description="Allow MQTT traffic" 2>/dev/null || echo "Firewall rule already exists"

# 3. Create VM instance (if not exists)
echo "--- Creating VM instance ---"
gcloud compute instances create $INSTANCE_NAME \
  --zone=$ZONE \
  --machine-type=$MACHINE_TYPE \
  --address=$STATIC_IP \
  --tags=mqtt-broker \
  --image-family=cos-stable \
  --image-project=cos-cloud \
  --boot-disk-size=10GB 2>/dev/null || echo "Instance already exists"

# 4. Copy files to VM
echo "--- Copying files ---"
gcloud compute scp --recurse \
  docker-compose.yml mosquitto/ bridge/ .env \
  $INSTANCE_NAME:~/mqtt-broker/ \
  --zone=$ZONE

# 5. Start services on VM
echo "--- Starting services ---"
gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="
  cd ~/mqtt-broker
  docker compose pull
  docker compose build
  docker compose up -d
  docker compose ps
"

echo ""
echo "=== Deploy complete ==="
echo "MQTT Broker IP: $STATIC_IP"
echo "MQTT Port: 1883"
echo ""
echo "Update ESP32 firmware with:"
echo "  #define MQTT_HOST IPAddress(${STATIC_IP//\./, })"
