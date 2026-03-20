FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY mqtt_bridge.py .

CMD ["python", "-u", "mqtt_bridge.py"]
