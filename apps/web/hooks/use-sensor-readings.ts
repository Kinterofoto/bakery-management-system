"use client"

import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"

export interface SensorReading {
  device_id: string
  site: string
  area: string
  temperatura: number | null
  humedad: number | null
  indice_calor: number | null
  created_at: string
}

interface UseSensorReadingsOptions {
  deviceId?: string
  hours?: number
  pollInterval?: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function useSensorReadings({
  deviceId,
  hours = 24,
  pollInterval = 30000,
}: UseSensorReadingsOptions = {}) {
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReadings = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)

      const params = new URLSearchParams({
        hours: hours.toString(),
        limit: "5000",
      })
      if (deviceId) params.set("device_id", deviceId)

      const res = await fetch(`${API_URL}/api/iot/readings?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const json = await res.json()
      // API returns desc order, reverse for charts (ascending)
      setReadings((json.data as SensorReading[])?.reverse() || [])
    } catch (err) {
      console.error("Error fetching sensor readings:", err)
      if (showLoading) toast.error("Error al cargar lecturas de sensores")
    } finally {
      setLoading(false)
    }
  }, [deviceId, hours])

  useEffect(() => {
    fetchReadings(true)
  }, [fetchReadings])

  useEffect(() => {
    const interval = setInterval(() => fetchReadings(), pollInterval)
    return () => clearInterval(interval)
  }, [fetchReadings, pollInterval])

  return {
    readings,
    loading,
    refetch: () => fetchReadings(true),
  }
}
