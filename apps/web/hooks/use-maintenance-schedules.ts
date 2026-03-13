"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface MaintenanceSchedule {
  id: string
  equipment_id: string
  title: string
  description: string | null
  maintenance_type: "preventivo" | "correctivo" | "predictivo"
  frequency: string
  checklist: Array<{ item: string; done: boolean }>
  responsible: string | null
  estimated_duration_minutes: number | null
  next_due_date: string | null
  status: "activo" | "inactivo"
  created_at: string
  updated_at: string
  // Joined
  equipment?: {
    id: string
    name: string
    code: string | null
    equipment_categories?: { id: string; name: string; color: string | null }
  }
}

export function useMaintenanceSchedules() {
  const [loading, setLoading] = useState(false)

  const getSchedules = useCallback(async (filters?: { equipmentId?: string; type?: string; status?: string }) => {
    try {
      setLoading(true)
      let query = (supabase.schema("mantenimiento" as any))
        .from("maintenance_schedules")
        .select("*, equipment(id, name, code, equipment_categories(id, name, color))")
        .order("next_due_date", { ascending: true })

      if (filters?.equipmentId) query = query.eq("equipment_id", filters.equipmentId)
      if (filters?.type) query = query.eq("maintenance_type", filters.type)
      if (filters?.status) query = query.eq("status", filters.status)

      const { data, error } = await query
      if (error) throw error
      return (data as unknown as MaintenanceSchedule[]) || []
    } catch (err) {
      toast.error("Error al obtener cronogramas")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const createSchedule = useCallback(async (scheduleData: Partial<MaintenanceSchedule>) => {
    try {
      setLoading(true)
      const { data, error } = await (supabase.schema("mantenimiento" as any))
        .from("maintenance_schedules")
        .insert(scheduleData)
        .select()
        .single()

      if (error) throw error
      toast.success("Cronograma creado")
      return data as unknown as MaintenanceSchedule
    } catch (err) {
      toast.error("Error al crear cronograma")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSchedule = useCallback(async (id: string, updates: Partial<MaintenanceSchedule>) => {
    try {
      setLoading(true)
      const { data, error } = await (supabase.schema("mantenimiento" as any))
        .from("maintenance_schedules")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      toast.success("Cronograma actualizado")
      return data as unknown as MaintenanceSchedule
    } catch (err) {
      toast.error("Error al actualizar cronograma")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, getSchedules, createSchedule, updateSchedule }
}
