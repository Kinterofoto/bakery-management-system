"""
IoT sensor data endpoints — reads from InfluxDB.
"""

from fastapi import APIRouter, Query
from datetime import datetime
from typing import Optional

from influxdb_client import InfluxDBClient

from ...core.config import get_settings

router = APIRouter(prefix="/iot", tags=["iot"])


def _get_influx_client():
    settings = get_settings()
    return InfluxDBClient(
        url=settings.influxdb_url,
        token=settings.influxdb_token,
        org=settings.influxdb_org,
    )


@router.get("/readings")
async def get_readings(
    device_id: Optional[str] = Query(None, description="Filter by device ID"),
    hours: int = Query(24, ge=1, le=720, description="Hours of history"),
    limit: int = Query(5000, ge=1, le=50000),
):
    """Get sensor readings from InfluxDB."""
    settings = get_settings()
    client = _get_influx_client()
    query_api = client.query_api()

    device_filter = ""
    if device_id:
        device_filter = f'|> filter(fn: (r) => r["device_id"] == "{device_id}")'

    query = f'''
    from(bucket: "{settings.influxdb_bucket}")
        |> range(start: -{hours}h)
        |> filter(fn: (r) => r["_measurement"] == "sensor_reading")
        {device_filter}
        |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: {limit})
    '''

    tables = query_api.query(query, org=settings.influxdb_org)

    readings = []
    for table in tables:
        for record in table.records:
            readings.append({
                "device_id": record.values.get("device_id", ""),
                "site": record.values.get("site", ""),
                "area": record.values.get("area", ""),
                "temperatura": record.values.get("temperatura"),
                "humedad": record.values.get("humedad"),
                "indice_calor": record.values.get("indice_calor"),
                "created_at": record.get_time().isoformat(),
            })

    client.close()
    return {"data": readings, "count": len(readings)}


@router.get("/devices")
async def get_devices():
    """List all known devices with their last reading."""
    settings = get_settings()
    client = _get_influx_client()
    query_api = client.query_api()

    query = f'''
    from(bucket: "{settings.influxdb_bucket}")
        |> range(start: -24h)
        |> filter(fn: (r) => r["_measurement"] == "sensor_reading")
        |> filter(fn: (r) => r["_field"] == "temperatura")
        |> group(columns: ["device_id", "site", "area"])
        |> last()
    '''

    tables = query_api.query(query, org=settings.influxdb_org)

    devices = []
    for table in tables:
        for record in table.records:
            devices.append({
                "device_id": record.values.get("device_id", ""),
                "site": record.values.get("site", ""),
                "area": record.values.get("area", ""),
                "last_seen": record.get_time().isoformat(),
            })

    client.close()
    return {"devices": devices}


@router.get("/stats")
async def get_stats(
    device_id: str = Query(..., description="Device ID"),
    hours: int = Query(24, ge=1, le=720),
):
    """Get min/max/avg stats for a device."""
    settings = get_settings()
    client = _get_influx_client()
    query_api = client.query_api()

    stats = {}
    for field in ["temperatura", "humedad", "indice_calor"]:
        for agg in ["min", "max", "mean"]:
            query = f'''
            from(bucket: "{settings.influxdb_bucket}")
                |> range(start: -{hours}h)
                |> filter(fn: (r) => r["_measurement"] == "sensor_reading")
                |> filter(fn: (r) => r["device_id"] == "{device_id}")
                |> filter(fn: (r) => r["_field"] == "{field}")
                |> {agg}()
            '''
            tables = query_api.query(query, org=settings.influxdb_org)
            value = None
            for table in tables:
                for record in table.records:
                    value = record.get_value()
            if field not in stats:
                stats[field] = {}
            stats[field][agg] = round(value, 2) if value is not None else None

    client.close()
    return {"device_id": device_id, "hours": hours, "stats": stats}
