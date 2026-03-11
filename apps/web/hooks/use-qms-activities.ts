"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface FormField {
  name: string
  label: string
  type: "text" | "number" | "select" | "date"
  options?: string[]
  required?: boolean
  min?: number
  max?: number
}

export interface ProgramActivity {
  id: string
  program_id: string
  title: string
  description: string | null
  activity_type: string
  frequency: string
  day_of_week: number | null
  day_of_month: number | null
  month_of_year: number | null
  area: string | null
  responsible_id: string | null
  requires_evidence: boolean
  form_fields: FormField[]
  status: string
  created_at: string
  updated_at: string
  // Joined
  sanitation_programs?: {
    id: string
    name: string
    code: string
    color: string | null
    icon: string | null
  }
}

export interface ProgramActivityInsert {
  program_id: string
  title: string
  description?: string | null
  activity_type?: string
  frequency?: string
  day_of_week?: number | null
  day_of_month?: number | null
  month_of_year?: number | null
  area?: string | null
  responsible_id?: string | null
  requires_evidence?: boolean
  form_fields?: FormField[]
  status?: string
}

export function useQMSActivities() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getActivities = useCallback(async (programId?: string) => {
    try {
      setLoading(true)
      let query = (supabase
        .schema("qms" as any))
        .from("program_activities")
        .select("*, sanitation_programs(id, name, code, color, icon)")
        .eq("status", "activo")
        .order("title", { ascending: true })

      if (programId) {
        query = query.eq("program_id", programId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      return (data as unknown as ProgramActivity[]) || []
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al obtener actividades")
      toast.error("Error al obtener actividades")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const getActivityById = useCallback(async (id: string) => {
    try {
      const { data, error: fetchError } = await (supabase
        .schema("qms" as any))
        .from("program_activities")
        .select("*, sanitation_programs(id, name, code, color, icon)")
        .eq("id", id)
        .single()

      if (fetchError) throw fetchError
      return data as unknown as ProgramActivity
    } catch (err) {
      console.error("Error fetching activity:", err)
      return null
    }
  }, [])

  const createActivity = useCallback(async (activityData: ProgramActivityInsert) => {
    try {
      setLoading(true)
      const { data, error: insertError } = await (supabase
        .schema("qms" as any))
        .from("program_activities")
        .insert(activityData)
        .select("*, sanitation_programs(id, name, code, color, icon)")
        .single()

      if (insertError) throw insertError
      toast.success("Actividad creada exitosamente")
      return data as unknown as ProgramActivity
    } catch (err) {
      toast.error("Error al crear actividad")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateActivity = useCallback(async (id: string, updates: Partial<ProgramActivityInsert>) => {
    try {
      setLoading(true)
      const { data, error: updateError } = await (supabase
        .schema("qms" as any))
        .from("program_activities")
        .update(updates)
        .eq("id", id)
        .select("*, sanitation_programs(id, name, code, color, icon)")
        .single()

      if (updateError) throw updateError
      toast.success("Actividad actualizada")
      return data as unknown as ProgramActivity
    } catch (err) {
      toast.error("Error al actualizar actividad")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteActivity = useCallback(async (id: string) => {
    try {
      setLoading(true)
      const { error: deleteError } = await (supabase
        .schema("qms" as any))
        .from("program_activities")
        .delete()
        .eq("id", id)

      if (deleteError) throw deleteError
      toast.success("Actividad eliminada")
      return true
    } catch (err) {
      toast.error("Error al eliminar actividad")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getActivities,
    getActivityById,
    createActivity,
    updateActivity,
    deleteActivity,
  }
}
