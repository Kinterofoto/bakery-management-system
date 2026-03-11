"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string
  question: string
  category: string
  weight?: number
}

export interface AuditChecklist {
  id: string
  name: string
  level: "basica" | "intermedia" | "avanzada"
  description: string | null
  items: ChecklistItem[]
  status: string
  created_at: string
  updated_at: string
}

export interface InternalAudit {
  id: string
  checklist_id: string
  title: string
  audit_date: string
  auditor_id: string | null
  overall_score: number | null
  total_items: number
  conforming_items: number
  status: "en_progreso" | "completada" | "cerrada"
  observations: string | null
  created_at: string
  updated_at: string
  // Joined
  audit_checklists?: AuditChecklist
  audit_item_results?: AuditItemResult[]
}

export interface AuditItemResult {
  id: string
  audit_id: string
  item_id: string
  question: string
  category: string | null
  result: "conforme" | "no_conforme" | "no_aplica"
  observations: string | null
  created_at: string
}

export interface ExternalAudit {
  id: string
  title: string
  audit_date: string
  auditor_name: string | null
  organization: string | null
  observations: string | null
  status: "en_progreso" | "completada" | "cerrada"
  created_at: string
  updated_at: string
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useQMSAudits() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Checklists ─────────────────────────────────────────────────────

  const getChecklists = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await (supabase
        .schema("qms" as any))
        .from("audit_checklists")
        .select("*")
        .eq("status", "activo")
        .order("level", { ascending: true })

      if (fetchError) throw fetchError
      return (data as unknown as AuditChecklist[]) || []
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al obtener checklists")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const getChecklistById = useCallback(async (id: string) => {
    try {
      const { data, error: fetchError } = await (supabase
        .schema("qms" as any))
        .from("audit_checklists")
        .select("*")
        .eq("id", id)
        .single()

      if (fetchError) throw fetchError
      return data as unknown as AuditChecklist
    } catch (err) {
      console.error("Error fetching checklist:", err)
      return null
    }
  }, [])

  // ─── Internal Audits ────────────────────────────────────────────────

  const getInternalAudits = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await (supabase
        .schema("qms" as any))
        .from("internal_audits")
        .select(`
          *,
          audit_checklists(id, name, level, description)
        `)
        .order("audit_date", { ascending: false })

      if (fetchError) throw fetchError
      return (data as unknown as InternalAudit[]) || []
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al obtener auditorias")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const getInternalAuditById = useCallback(async (id: string) => {
    try {
      const { data, error: fetchError } = await (supabase
        .schema("qms" as any))
        .from("internal_audits")
        .select(`
          *,
          audit_checklists(*),
          audit_item_results(*)
        `)
        .eq("id", id)
        .single()

      if (fetchError) throw fetchError
      return data as unknown as InternalAudit
    } catch (err) {
      console.error("Error fetching audit:", err)
      return null
    }
  }, [])

  const createInternalAudit = useCallback(async (auditData: {
    checklist_id: string
    title: string
    audit_date: string
    observations?: string
  }) => {
    try {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()

      const { data, error: insertError } = await (supabase
        .schema("qms" as any))
        .from("internal_audits")
        .insert({
          ...auditData,
          auditor_id: userData?.user?.id || null,
          status: "en_progreso",
        })
        .select()
        .single()

      if (insertError) throw insertError
      toast.success("Auditoria interna creada")
      return data as unknown as InternalAudit
    } catch (err) {
      toast.error("Error al crear auditoria")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateInternalAudit = useCallback(async (id: string, updates: Partial<{
    status: string
    overall_score: number
    total_items: number
    conforming_items: number
    observations: string
  }>) => {
    try {
      setLoading(true)
      const { data, error: updateError } = await (supabase
        .schema("qms" as any))
        .from("internal_audits")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (updateError) throw updateError
      return data as unknown as InternalAudit
    } catch (err) {
      toast.error("Error al actualizar auditoria")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Item Results ───────────────────────────────────────────────────

  const saveItemResults = useCallback(async (auditId: string, results: {
    item_id: string
    question: string
    category?: string
    result: "conforme" | "no_conforme" | "no_aplica"
    observations?: string
  }[]) => {
    try {
      setLoading(true)

      // Delete existing results for this audit first
      await (supabase
        .schema("qms" as any))
        .from("audit_item_results")
        .delete()
        .eq("audit_id", auditId)

      // Insert new results
      const rows = results.map((r) => ({
        audit_id: auditId,
        item_id: r.item_id,
        question: r.question,
        category: r.category || null,
        result: r.result,
        observations: r.observations || null,
      }))

      const { error: insertError } = await (supabase
        .schema("qms" as any))
        .from("audit_item_results")
        .insert(rows)

      if (insertError) throw insertError

      // Update audit totals
      const total = results.filter((r) => r.result !== "no_aplica").length
      const conforming = results.filter((r) => r.result === "conforme").length
      const score = total > 0 ? Math.round((conforming / total) * 10000) / 100 : 0

      await (supabase
        .schema("qms" as any))
        .from("internal_audits")
        .update({
          total_items: total,
          conforming_items: conforming,
          overall_score: score,
        })
        .eq("id", auditId)

      toast.success("Resultados guardados")
      return true
    } catch (err) {
      toast.error("Error al guardar resultados")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── External Audits ────────────────────────────────────────────────

  const getExternalAudits = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await (supabase
        .schema("qms" as any))
        .from("external_audits")
        .select("*")
        .order("audit_date", { ascending: false })

      if (fetchError) throw fetchError
      return (data as unknown as ExternalAudit[]) || []
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al obtener auditorias externas")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const createExternalAudit = useCallback(async (auditData: {
    title: string
    audit_date: string
    auditor_name?: string
    organization?: string
    observations?: string
  }) => {
    try {
      setLoading(true)
      const { data, error: insertError } = await (supabase
        .schema("qms" as any))
        .from("external_audits")
        .insert({
          ...auditData,
          status: "en_progreso",
        })
        .select()
        .single()

      if (insertError) throw insertError
      toast.success("Auditoria externa creada")
      return data as unknown as ExternalAudit
    } catch (err) {
      toast.error("Error al crear auditoria externa")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateExternalAudit = useCallback(async (id: string, updates: Partial<{
    title: string
    auditor_name: string
    organization: string
    observations: string
    status: string
  }>) => {
    try {
      setLoading(true)
      const { data, error: updateError } = await (supabase
        .schema("qms" as any))
        .from("external_audits")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (updateError) throw updateError
      toast.success("Auditoria actualizada")
      return data as unknown as ExternalAudit
    } catch (err) {
      toast.error("Error al actualizar auditoria")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getChecklists,
    getChecklistById,
    getInternalAudits,
    getInternalAuditById,
    createInternalAudit,
    updateInternalAudit,
    saveItemResults,
    getExternalAudits,
    createExternalAudit,
    updateExternalAudit,
  }
}
