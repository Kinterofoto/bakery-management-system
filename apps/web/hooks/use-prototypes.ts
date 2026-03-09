"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface Prototype {
  id: string
  product_id: string | null
  product_name: string | null
  product_category: string | null
  is_new_product: boolean
  code: string | null
  version: number
  parent_prototype_id: string | null
  status: string
  description: string | null
  objectives: string | null
  conclusions: string | null
  units_per_flow_pack: number | null
  units_per_box: number | null
  wizard_step: number
  wizard_completed: boolean
  sensory_token: string | null
  pp_status: string | null
  cost_per_gram: number | null
  total_input_grams: number | null
  total_output_grams: number | null
  project_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface PrototypeInsert {
  product_id?: string | null
  product_name?: string | null
  product_category?: string | null
  is_new_product?: boolean
  code?: string | null
  version?: number
  parent_prototype_id?: string | null
  status?: string
  description?: string | null
  objectives?: string | null
  conclusions?: string | null
  units_per_flow_pack?: number | null
  units_per_box?: number | null
  wizard_step?: number
  wizard_completed?: boolean
  pp_status?: string | null
  cost_per_gram?: number | null
  total_input_grams?: number | null
  total_output_grams?: number | null
  project_id?: string | null
  created_by?: string | null
}

export interface PrototypeUpdate {
  product_id?: string | null
  product_name?: string | null
  product_category?: string | null
  is_new_product?: boolean
  code?: string | null
  version?: number
  parent_prototype_id?: string | null
  status?: string
  description?: string | null
  objectives?: string | null
  conclusions?: string | null
  units_per_flow_pack?: number | null
  units_per_box?: number | null
  wizard_step?: number
  wizard_completed?: boolean
  sensory_token?: string | null
  pp_status?: string | null
  cost_per_gram?: number | null
  total_input_grams?: number | null
  total_output_grams?: number | null
  project_id?: string | null
}

export function usePrototypes() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getPrototypes = useCallback(async (category?: "PT" | "PP") => {
    try {
      setLoading(true)
      setError(null)

      let query = (supabase
        .schema("investigacion" as any))
        .from("prototypes")
        .select("*")
        .order("created_at", { ascending: false })

      // By default show only PT (root prototypes), not PP children
      if (category) {
        query = query.eq("product_category", category)
      } else {
        query = query.eq("product_category", "PT")
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      return (data as Prototype[]) || []
    } catch (err) {
      console.error("Error al obtener prototipos:", err)
      setError(err instanceof Error ? err.message : "Error al obtener prototipos")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const getPrototypeById = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await (supabase
        .schema("investigacion" as any))
        .from("prototypes")
        .select("*")
        .eq("id", id)
        .single()

      if (fetchError) throw fetchError
      return data as Prototype
    } catch (err) {
      console.error("Error al obtener prototipo:", err)
      setError(err instanceof Error ? err.message : "Error al obtener prototipo")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const generateCode = useCallback(async (): Promise<string> => {
    try {
      const currentYear = new Date().getFullYear()
      const prefix = `PRO-${currentYear}-`

      // Get existing codes for this year to determine next sequence
      const { data, error: fetchError } = await (supabase
        .schema("investigacion" as any))
        .from("prototypes")
        .select("code")
        .like("code", `${prefix}%`)
        .order("code", { ascending: false })
        .limit(1)

      if (fetchError) throw fetchError

      let nextSeq = 1
      if (data && data.length > 0 && data[0].code) {
        const match = data[0].code.match(/PRO-\d{4}-(\d+)/)
        if (match) {
          nextSeq = parseInt(match[1], 10) + 1
        }
      }

      return `${prefix}${String(nextSeq).padStart(3, "0")}`
    } catch (err) {
      console.error("Error al generar codigo:", err)
      // Fallback: generate with timestamp
      return `PRO-${new Date().getFullYear()}-${Date.now().toString().slice(-3)}`
    }
  }, [])

  const createPrototype = useCallback(async (prototypeData: PrototypeInsert) => {
    try {
      setLoading(true)
      setError(null)

      // Obtener usuario actual para created_by
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id || null

      const { data, error: insertError } = await (supabase
        .schema("investigacion" as any))
        .from("prototypes")
        .insert({
          ...prototypeData,
          created_by: userId,
        })
        .select()
        .single()

      if (insertError) throw insertError

      toast.success("Prototipo creado exitosamente")
      return data as Prototype
    } catch (err) {
      console.error("Error al crear prototipo:", err)
      setError(err instanceof Error ? err.message : "Error al crear prototipo")
      toast.error("Error al crear prototipo")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updatePrototype = useCallback(async (id: string, updates: PrototypeUpdate) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: updateError } = await (supabase
        .schema("investigacion" as any))
        .from("prototypes")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single()

      if (updateError) throw updateError

      toast.success("Prototipo actualizado exitosamente")
      return data as Prototype
    } catch (err) {
      console.error("Error al actualizar prototipo:", err)
      setError(err instanceof Error ? err.message : "Error al actualizar prototipo")
      toast.error("Error al actualizar prototipo")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deletePrototype = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const { error: deleteError } = await (supabase
        .schema("investigacion" as any))
        .from("prototypes")
        .delete()
        .eq("id", id)

      if (deleteError) throw deleteError

      toast.success("Prototipo eliminado exitosamente")
      return true
    } catch (err) {
      console.error("Error al eliminar prototipo:", err)
      setError(err instanceof Error ? err.message : "Error al eliminar prototipo")
      toast.error("Error al eliminar prototipo")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getPrototypes,
    getPrototypeById,
    createPrototype,
    updatePrototype,
    deletePrototype,
    generateCode,
  }
}
