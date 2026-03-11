"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CorrectiveAction {
  id: string
  program_id: string
  internal_audit_id: string | null
  external_audit_id: string | null
  audit_item_result_id: string | null
  description: string
  scheduled_date: string | null
  due_date: string | null
  responsible_id: string | null
  status: "pendiente" | "en_progreso" | "completada" | "vencida"
  priority: "baja" | "media" | "alta" | "critica"
  resolution_notes: string | null
  completed_date: string | null
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
  internal_audits?: {
    id: string
    title: string
  } | null
  external_audits?: {
    id: string
    title: string
  } | null
}

export interface CorrectiveActionInsert {
  program_id: string
  internal_audit_id?: string
  external_audit_id?: string
  audit_item_result_id?: string
  description: string
  scheduled_date?: string
  due_date?: string
  responsible_id?: string
  priority?: string
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useQMSCorrectiveActions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getCorrectiveActions = useCallback(async (filters?: {
    programId?: string
    status?: string
    internalAuditId?: string
    externalAuditId?: string
  }) => {
    try {
      setLoading(true)
      let query = (supabase
        .schema("qms" as any))
        .from("corrective_actions")
        .select(`
          *,
          sanitation_programs(id, name, code, color, icon),
          internal_audits(id, title),
          external_audits(id, title)
        `)
        .order("created_at", { ascending: false })

      if (filters?.programId) {
        query = query.eq("program_id", filters.programId)
      }
      if (filters?.status) {
        query = query.eq("status", filters.status)
      }
      if (filters?.internalAuditId) {
        query = query.eq("internal_audit_id", filters.internalAuditId)
      }
      if (filters?.externalAuditId) {
        query = query.eq("external_audit_id", filters.externalAuditId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      return (data as unknown as CorrectiveAction[]) || []
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al obtener acciones correctivas")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const createCorrectiveAction = useCallback(async (actionData: CorrectiveActionInsert) => {
    try {
      setLoading(true)
      const { data, error: insertError } = await (supabase
        .schema("qms" as any))
        .from("corrective_actions")
        .insert({
          ...actionData,
          status: "pendiente",
        })
        .select(`
          *,
          sanitation_programs(id, name, code, color, icon)
        `)
        .single()

      if (insertError) throw insertError
      toast.success("Accion correctiva creada")
      return data as unknown as CorrectiveAction
    } catch (err) {
      toast.error("Error al crear accion correctiva")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateCorrectiveAction = useCallback(async (id: string, updates: Partial<{
    description: string
    scheduled_date: string | null
    due_date: string | null
    responsible_id: string | null
    status: string
    priority: string
    resolution_notes: string
  }>) => {
    try {
      setLoading(true)
      const { data, error: updateError } = await (supabase
        .schema("qms" as any))
        .from("corrective_actions")
        .update(updates)
        .eq("id", id)
        .select(`
          *,
          sanitation_programs(id, name, code, color, icon)
        `)
        .single()

      if (updateError) throw updateError
      toast.success("Accion correctiva actualizada")
      return data as unknown as CorrectiveAction
    } catch (err) {
      toast.error("Error al actualizar accion correctiva")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const completeCorrectiveAction = useCallback(async (id: string, resolutionNotes?: string) => {
    try {
      setLoading(true)
      const { data, error: updateError } = await (supabase
        .schema("qms" as any))
        .from("corrective_actions")
        .update({
          status: "completada",
          completed_date: new Date().toISOString(),
          resolution_notes: resolutionNotes || null,
        })
        .eq("id", id)
        .select()
        .single()

      if (updateError) throw updateError
      toast.success("Accion correctiva completada")
      return data as unknown as CorrectiveAction
    } catch (err) {
      toast.error("Error al completar accion correctiva")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteCorrectiveAction = useCallback(async (id: string) => {
    try {
      setLoading(true)
      const { error: deleteError } = await (supabase
        .schema("qms" as any))
        .from("corrective_actions")
        .delete()
        .eq("id", id)

      if (deleteError) throw deleteError
      toast.success("Accion correctiva eliminada")
      return true
    } catch (err) {
      toast.error("Error al eliminar accion correctiva")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getCorrectiveActions,
    createCorrectiveAction,
    updateCorrectiveAction,
    completeCorrectiveAction,
    deleteCorrectiveAction,
  }
}
