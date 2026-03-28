"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface SanitationProgram {
  id: string
  name: string
  description: string | null
  code: string
  icon: string | null
  color: string | null
  frequency: string
  responsible_id: string | null
  status: string
  program_document: string | null
  created_at: string
  updated_at: string
}

export interface SanitationProgramInsert {
  name: string
  description?: string | null
  code: string
  icon?: string | null
  color?: string | null
  frequency?: string
  responsible_id?: string | null
  status?: string
  program_document?: string | null
}

export function useQMSPrograms() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getPrograms = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await (supabase
        .schema("qms" as any))
        .from("sanitation_programs")
        .select("*")
        .order("created_at", { ascending: true })

      if (fetchError) throw fetchError
      return (data as unknown as SanitationProgram[]) || []
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al obtener programas")
      toast.error("Error al obtener programas")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const getProgramByCode = useCallback(async (code: string) => {
    try {
      const { data, error: fetchError } = await (supabase
        .schema("qms" as any))
        .from("sanitation_programs")
        .select("*")
        .eq("code", code)
        .single()

      if (fetchError) throw fetchError
      return data as unknown as SanitationProgram
    } catch (err) {
      console.error("Error fetching program:", err)
      return null
    }
  }, [])

  const createProgram = useCallback(async (programData: SanitationProgramInsert) => {
    try {
      setLoading(true)
      const { data, error: insertError } = await (supabase
        .schema("qms" as any))
        .from("sanitation_programs")
        .insert(programData)
        .select()
        .single()

      if (insertError) throw insertError
      toast.success("Programa creado exitosamente")
      return data as unknown as SanitationProgram
    } catch (err) {
      toast.error("Error al crear programa")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateProgram = useCallback(async (id: string, updates: Partial<SanitationProgramInsert>) => {
    try {
      setLoading(true)
      const { data, error: updateError } = await (supabase
        .schema("qms" as any))
        .from("sanitation_programs")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (updateError) throw updateError
      toast.success("Programa actualizado")
      return data as unknown as SanitationProgram
    } catch (err) {
      toast.error("Error al actualizar programa")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteProgram = useCallback(async (id: string) => {
    try {
      setLoading(true)
      const { error: deleteError } = await (supabase
        .schema("qms" as any))
        .from("sanitation_programs")
        .delete()
        .eq("id", id)

      if (deleteError) throw deleteError
      toast.success("Programa eliminado")
      return true
    } catch (err) {
      toast.error("Error al eliminar programa")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getPrograms,
    getProgramByCode,
    createProgram,
    updateProgram,
    deleteProgram,
  }
}
