"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface ActivityRecord {
  id: string
  activity_id: string
  program_id: string
  scheduled_date: string
  completed_date: string | null
  status: "pendiente" | "en_progreso" | "completado" | "vencido" | "no_aplica"
  recorded_by: string | null
  observations: string | null
  values: Record<string, any>
  created_at: string
  updated_at: string
  // Joined
  program_activities?: {
    id: string
    title: string
    activity_type: string
    area: string | null
    form_fields: any[]
    requires_evidence: boolean
    sanitation_programs?: {
      id: string
      name: string
      code: string
      color: string | null
      icon: string | null
    }
  }
  record_attachments?: {
    id: string
    file_url: string
    file_name: string
    file_type: string | null
  }[]
}

export interface ActivityRecordInsert {
  activity_id: string
  program_id: string
  scheduled_date: string
  completed_date?: string | null
  status?: string
  recorded_by?: string | null
  observations?: string | null
  values?: Record<string, any>
}

export interface RecordFilters {
  programId?: string
  activityId?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export function useQMSRecords() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getRecords = useCallback(async (filters?: RecordFilters) => {
    try {
      setLoading(true)
      let query = (supabase
        .schema("qms" as any))
        .from("activity_records")
        .select(`
          *,
          program_activities(
            id, title, activity_type, area, form_fields, requires_evidence,
            sanitation_programs(id, name, code, color, icon)
          ),
          record_attachments(id, file_url, file_name, file_type)
        `)
        .order("scheduled_date", { ascending: false })

      if (filters?.programId) {
        query = query.eq("program_id", filters.programId)
      }
      if (filters?.activityId) {
        query = query.eq("activity_id", filters.activityId)
      }
      if (filters?.status) {
        query = query.eq("status", filters.status)
      }
      if (filters?.dateFrom) {
        query = query.gte("scheduled_date", filters.dateFrom)
      }
      if (filters?.dateTo) {
        query = query.lte("scheduled_date", filters.dateTo)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      return (data as unknown as ActivityRecord[]) || []
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al obtener registros")
      toast.error("Error al obtener registros")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const getRecordById = useCallback(async (id: string) => {
    try {
      const { data, error: fetchError } = await (supabase
        .schema("qms" as any))
        .from("activity_records")
        .select(`
          *,
          program_activities(
            id, title, activity_type, area, form_fields, requires_evidence,
            sanitation_programs(id, name, code, color, icon)
          ),
          record_attachments(id, file_url, file_name, file_type)
        `)
        .eq("id", id)
        .single()

      if (fetchError) throw fetchError
      return data as unknown as ActivityRecord
    } catch (err) {
      console.error("Error fetching record:", err)
      return null
    }
  }, [])

  const createRecord = useCallback(async (recordData: ActivityRecordInsert) => {
    try {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()

      const { data, error: insertError } = await (supabase
        .schema("qms" as any))
        .from("activity_records")
        .insert({
          ...recordData,
          recorded_by: userData?.user?.id || null,
        })
        .select()
        .single()

      if (insertError) throw insertError
      toast.success("Registro creado exitosamente")
      return data as unknown as ActivityRecord
    } catch (err) {
      toast.error("Error al crear registro")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateRecord = useCallback(async (id: string, updates: Partial<ActivityRecordInsert>) => {
    try {
      setLoading(true)
      const { data, error: updateError } = await (supabase
        .schema("qms" as any))
        .from("activity_records")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (updateError) throw updateError
      toast.success("Registro actualizado")
      return data as unknown as ActivityRecord
    } catch (err) {
      toast.error("Error al actualizar registro")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const completeRecord = useCallback(async (id: string, values: Record<string, any>, observations?: string) => {
    try {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()

      const { data, error: updateError } = await (supabase
        .schema("qms" as any))
        .from("activity_records")
        .update({
          status: "completado",
          completed_date: new Date().toISOString(),
          recorded_by: userData?.user?.id || null,
          values,
          observations: observations || null,
        })
        .eq("id", id)
        .select()
        .single()

      if (updateError) throw updateError
      toast.success("Actividad completada")
      return data as unknown as ActivityRecord
    } catch (err) {
      toast.error("Error al completar actividad")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteRecord = useCallback(async (id: string) => {
    try {
      setLoading(true)
      const { error: deleteError } = await (supabase
        .schema("qms" as any))
        .from("activity_records")
        .delete()
        .eq("id", id)

      if (deleteError) throw deleteError
      toast.success("Registro eliminado")
      return true
    } catch (err) {
      toast.error("Error al eliminar registro")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const uploadAttachment = useCallback(async (recordId: string, file: File) => {
    try {
      setLoading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${recordId}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('qms-attachments')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('qms-attachments')
        .getPublicUrl(fileName)

      const { data: userData } = await supabase.auth.getUser()

      const { data, error: insertError } = await (supabase
        .schema("qms" as any))
        .from("record_attachments")
        .insert({
          record_id: recordId,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: file.type,
          uploaded_by: userData?.user?.id || null,
        })
        .select()
        .single()

      if (insertError) throw insertError
      toast.success("Evidencia adjuntada")
      return data
    } catch (err) {
      toast.error("Error al subir archivo")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getRecords,
    getRecordById,
    createRecord,
    updateRecord,
    completeRecord,
    deleteRecord,
    uploadAttachment,
  }
}
