"use client"

import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

export interface SensorReading {
  id: number
  device_id: string
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

      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

      let query = supabase
        .from("sensor_readings")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(5000)

      if (deviceId) query = query.eq("device_id", deviceId)

      const { data, error } = await query

      if (error) throw error
      setReadings((data as SensorReading[]) || [])
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
