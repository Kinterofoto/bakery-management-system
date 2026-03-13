"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface InfrastructureSchedule {
  id: string
  area: string
  category: "electrico" | "hidraulico" | "estructural" | "sanitario" | "ventilacion" | "iluminacion" | "pisos" | "otro"
  title: string
  description: string | null
  frequency: string
  responsible: string | null
  next_due_date: string | null
  last_completed_date: string | null
  status: "activo" | "inactivo" | "vencido"
  notes: string | null
  created_at: string
  updated_at: string
}

export function useMaintenanceInfrastructure() {
  const [loading, setLoading] = useState(false)

  const getInfrastructureSchedules = useCallback(async (filters?: { category?: string; status?: string }) => {
    try {
      setLoading(true)
      let query = (supabase.schema("mantenimiento" as any))
        .from("infrastructure_schedules")
        .select("*")
        .order("next_due_date", { ascending: true })

      if (filters?.category) query = query.eq("category", filters.category)
      if (filters?.status) query = query.eq("status", filters.status)

      const { data, error } = await query
      if (error) throw error
      return (data as unknown as InfrastructureSchedule[]) || []
    } catch (err) {
      toast.error("Error al obtener cronograma de infraestructura")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const updateInfrastructureSchedule = useCallback(async (id: string, updates: Partial<InfrastructureSchedule>) => {
    try {
      setLoading(true)
      const { data, error } = await (supabase.schema("mantenimiento" as any))
        .from("infrastructure_schedules")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      toast.success("Cronograma actualizado")
      return data as unknown as InfrastructureSchedule
    } catch (err) {
      toast.error("Error al actualizar")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, getInfrastructureSchedules, updateInfrastructureSchedule }
}
