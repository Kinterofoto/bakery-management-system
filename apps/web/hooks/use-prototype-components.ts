"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface PrototypeComponent {
  id: string
  pt_prototype_id: string
  component_type: "PP" | "MP"
  pp_prototype_id: string | null
  material_id: string | null
  material_name: string | null
  is_new_material: boolean
  quantity_grams: number
  unit_cost: number | null
  cost_per_gram: number | null
  display_order: number
  created_at: string
  updated_at: string
}

export interface PrototypeComponentInsert {
  pt_prototype_id: string
  component_type: "PP" | "MP"
  pp_prototype_id?: string | null
  material_id?: string | null
  material_name?: string | null
  is_new_material?: boolean
  quantity_grams: number
  unit_cost?: number | null
  cost_per_gram?: number | null
  display_order?: number
}

export interface PrototypeComponentUpdate {
  component_type?: "PP" | "MP"
  pp_prototype_id?: string | null
  material_id?: string | null
  material_name?: string | null
  is_new_material?: boolean
  quantity_grams?: number
  unit_cost?: number | null
  cost_per_gram?: number | null
  display_order?: number
}

export function usePrototypeComponents() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getComponentsByPrototype = useCallback(async (ptPrototypeId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_components")
        .select("*")
        .eq("pt_prototype_id", ptPrototypeId)
        .order("display_order", { ascending: true })

      if (fetchError) throw fetchError
      return (data as PrototypeComponent[]) || []
    } catch (err) {
      console.error("Error al obtener componentes:", err)
      setError(err instanceof Error ? err.message : "Error al obtener componentes")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const addComponent = useCallback(async (componentData: PrototypeComponentInsert) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: insertError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_components")
        .insert(componentData)
        .select()
        .single()

      if (insertError) throw insertError

      toast.success("Componente agregado")
      return data as PrototypeComponent
    } catch (err) {
      console.error("Error al agregar componente:", err)
      setError(err instanceof Error ? err.message : "Error al agregar componente")
      toast.error("Error al agregar componente")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateComponent = useCallback(async (id: string, updates: PrototypeComponentUpdate) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: updateError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_components")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (updateError) throw updateError

      toast.success("Componente actualizado")
      return data as PrototypeComponent
    } catch (err) {
      console.error("Error al actualizar componente:", err)
      setError(err instanceof Error ? err.message : "Error al actualizar componente")
      toast.error("Error al actualizar componente")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const removeComponent = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const { error: deleteError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_components")
        .delete()
        .eq("id", id)

      if (deleteError) throw deleteError

      toast.success("Componente eliminado")
      return true
    } catch (err) {
      console.error("Error al eliminar componente:", err)
      setError(err instanceof Error ? err.message : "Error al eliminar componente")
      toast.error("Error al eliminar componente")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getComponentsByPrototype,
    addComponent,
    updateComponent,
    removeComponent,
  }
}
