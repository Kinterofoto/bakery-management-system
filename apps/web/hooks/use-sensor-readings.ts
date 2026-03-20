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
  realtime?: boolean
}

export function useSensorReadings({
  deviceId,
  metric,
  hours = 24,
  realtime = true,
}: UseSensorReadingsOptions = {}) {
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchReadings = useCallback(async () => {
    try {
      setLoading(true)

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
      toast.error("Error al cargar lecturas de sensores")
    } finally {
      setLoading(false)
    }
  }, [deviceId, metric, hours])

  // Real-time subscription
  useEffect(() => {
    if (!realtime) return

    const channel = supabase
      .channel("sensor_readings_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sensor_readings",
        },
        (payload) => {
          const newReading = payload.new as SensorReading

          // Filter by device/metric if specified
          if (deviceId && newReading.device_id !== deviceId) return
          if (metric && newReading.metric !== metric) return

          setReadings((prev) => [...prev, newReading])
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [deviceId, metric, realtime])

  useEffect(() => {
    fetchReadings()
  }, [fetchReadings])

  return {
    readings,
    loading,
    refetch: fetchReadings,
  }
}

export function useLatestReadings(deviceId?: string) {
  const [latest, setLatest] = useState<Record<string, SensorReading>>({})
  const [loading, setLoading] = useState(true)

  const fetchLatest = useCallback(async () => {
    try {
      setLoading(true)

      // Get the most recent reading per metric for the device
      let query = supabase
        .from("sensor_readings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)

      if (deviceId) query = query.eq("device_id", deviceId)

      const { data, error } = await query

      if (error) throw error

      // Group by metric, keep only the latest
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

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("sensor_latest_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sensor_readings",
        },
        (payload) => {
          const newReading = payload.new as SensorReading
          if (deviceId && newReading.device_id !== deviceId) return

          const key = `${newReading.device_id}:${newReading.metric}`
          setLatest((prev) => ({ ...prev, [key]: newReading }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [deviceId])

  useEffect(() => {
    fetchLatest()
  }, [fetchLatest])

  return { latest, loading, refetch: fetchLatest }
}
