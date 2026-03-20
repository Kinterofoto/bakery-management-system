"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

export interface SensorReading {
  id: number
  device_id: string
  metric: string
  value: number
  created_at: string
}

interface UseSensorReadingsOptions {
  deviceId?: string
  metric?: string
  hours?: number
  pollInterval?: number
}

export function useSensorReadings({
  deviceId,
  metric,
  hours = 24,
  pollInterval = 5000,
}: UseSensorReadingsOptions = {}) {
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReadings = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)

      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

      let query = supabase
        .from("sensor_readings")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: true })

      if (deviceId) query = query.eq("device_id", deviceId)
      if (metric) query = query.eq("metric", metric)

      const { data, error } = await query

      if (error) throw error
      setReadings((data as SensorReading[]) || [])
    } catch (err) {
      console.error("Error fetching sensor readings:", err)
      if (showLoading) toast.error("Error al cargar lecturas de sensores")
    } finally {
      setLoading(false)
    }
  }, [deviceId, metric, hours])

  // Initial fetch
  useEffect(() => {
    fetchReadings(true)
  }, [fetchReadings])

  // Poll every N seconds
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

export function useLatestReadings(deviceId?: string, pollInterval = 5000) {
  const [latest, setLatest] = useState<Record<string, SensorReading>>({})
  const [loading, setLoading] = useState(true)

  const fetchLatest = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)

      let query = supabase
        .from("sensor_readings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)

      if (deviceId) query = query.eq("device_id", deviceId)

      const { data, error } = await query

      if (error) throw error

      const latestByMetric: Record<string, SensorReading> = {}
      for (const reading of (data as SensorReading[]) || []) {
        const key = `${reading.device_id}:${reading.metric}`
        if (!latestByMetric[key]) {
          latestByMetric[key] = reading
        }
      }
      setLatest(latestByMetric)
    } catch (err) {
      console.error("Error fetching latest readings:", err)
    } finally {
      setLoading(false)
    }
  }, [deviceId])

  // Initial fetch
  useEffect(() => {
    fetchLatest(true)
  }, [fetchLatest])

  // Poll every N seconds
  useEffect(() => {
    const interval = setInterval(() => fetchLatest(), pollInterval)
    return () => clearInterval(interval)
  }, [fetchLatest, pollInterval])

  return { latest, loading, refetch: () => fetchLatest(true) }
}
