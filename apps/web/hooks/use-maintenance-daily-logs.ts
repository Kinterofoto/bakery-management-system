"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface DailyLog {
  id: string
  equipment_id: string
  log_date: string
  shift: "manana" | "tarde" | "noche"
  checks: Record<string, boolean>
  temperature: number | null
  vibration: number | null
  observations: string | null
  recorded_by: string | null
  created_at: string
  // Joined
  equipment?: {
    id: string
    name: string
    code: string | null
    equipment_categories?: { id: string; name: string }
  }
}

export interface DailyLogInsert {
  equipment_id: string
  log_date?: string
  shift?: string
  checks?: Record<string, boolean>
  temperature?: number | null
  vibration?: number | null
  observations?: string | null
}

export function useMaintenanceDailyLogs() {
  const [loading, setLoading] = useState(false)

  const getDailyLogs = useCallback(async (filters?: { equipmentId?: string; date?: string; dateFrom?: string; dateTo?: string }) => {
    try {
      setLoading(true)
      let query = (supabase.schema("mantenimiento" as any))
        .from("daily_logs")
        .select("*, equipment(id, name, code, equipment_categories(id, name))")
        .order("log_date", { ascending: false })

      if (filters?.equipmentId) query = query.eq("equipment_id", filters.equipmentId)
      if (filters?.date) query = query.eq("log_date", filters.date)
      if (filters?.dateFrom) query = query.gte("log_date", filters.dateFrom)
      if (filters?.dateTo) query = query.lte("log_date", filters.dateTo)

      const { data, error } = await query
      if (error) throw error
      return (data as unknown as DailyLog[]) || []
    } catch (err) {
      toast.error("Error al obtener registros diarios")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const createDailyLog = useCallback(async (logData: DailyLogInsert) => {
    try {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()

      const { data, error } = await (supabase.schema("mantenimiento" as any))
        .from("daily_logs")
        .insert({
          ...logData,
          recorded_by: userData?.user?.id || null,
        })
        .select()
        .single()

      if (error) throw error
      toast.success("Registro guardado")
      return data as unknown as DailyLog
    } catch (err) {
      toast.error("Error al guardar registro")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, getDailyLogs, createDailyLog }
}
