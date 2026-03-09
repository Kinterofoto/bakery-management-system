"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface PrototypeVersion {
  id: string
  pt_prototype_id: string
  version_number: number
  version_name: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PrototypeVersionComponent {
  id: string
  version_id: string
  component_id: string
  quantity_grams: number
  created_at: string
}

export function usePrototypeVersions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getVersionsByPrototype = useCallback(async (ptPrototypeId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_versions")
        .select("*")
        .eq("pt_prototype_id", ptPrototypeId)
        .order("version_number", { ascending: true })

      if (fetchError) throw fetchError
      return (data as PrototypeVersion[]) || []
    } catch (err) {
      console.error("Error al obtener versiones:", err)
      setError(err instanceof Error ? err.message : "Error al obtener versiones")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const createVersion = useCallback(async (
    ptPrototypeId: string,
    versionName: string,
    notes?: string
  ) => {
    try {
      setLoading(true)
      setError(null)

      // Get next version number
      const { data: existing } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_versions")
        .select("version_number")
        .eq("pt_prototype_id", ptPrototypeId)
        .order("version_number", { ascending: false })
        .limit(1)

      const nextVersion = (existing && existing.length > 0)
        ? existing[0].version_number + 1
        : 1

      const { data, error: insertError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_versions")
        .insert({
          pt_prototype_id: ptPrototypeId,
          version_number: nextVersion,
          version_name: versionName,
          notes,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Copy component quantities from base prototype_components
      const { data: components } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_components")
        .select("id, quantity_grams")
        .eq("pt_prototype_id", ptPrototypeId)

      if (components && components.length > 0) {
        const versionComponents = components.map((c: any) => ({
          version_id: data.id,
          component_id: c.id,
          quantity_grams: c.quantity_grams,
        }))

        await (supabase
          .schema("investigacion" as any))
          .from("prototype_version_components")
          .insert(versionComponents)
      }

      toast.success(`Versión ${nextVersion} creada`)
      return data as PrototypeVersion
    } catch (err) {
      console.error("Error al crear versión:", err)
      setError(err instanceof Error ? err.message : "Error al crear versión")
      toast.error("Error al crear versión")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getVersionComponents = useCallback(async (versionId: string) => {
    try {
      const { data, error: fetchError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_version_components")
        .select("*")
        .eq("version_id", versionId)

      if (fetchError) throw fetchError
      return (data as PrototypeVersionComponent[]) || []
    } catch (err) {
      console.error("Error al obtener componentes de versión:", err)
      return []
    }
  }, [])

  const updateVersionComponent = useCallback(async (
    id: string,
    quantityGrams: number
  ) => {
    try {
      const { error: updateError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_version_components")
        .update({ quantity_grams: quantityGrams })
        .eq("id", id)

      if (updateError) throw updateError
      return true
    } catch (err) {
      console.error("Error al actualizar componente de versión:", err)
      toast.error("Error al actualizar cantidad")
      return false
    }
  }, [])

  const deleteVersion = useCallback(async (id: string) => {
    try {
      setLoading(true)
      const { error: deleteError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_versions")
        .delete()
        .eq("id", id)

      if (deleteError) throw deleteError

      toast.success("Versión eliminada")
      return true
    } catch (err) {
      console.error("Error al eliminar versión:", err)
      toast.error("Error al eliminar versión")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getVersionsByPrototype,
    createVersion,
    getVersionComponents,
    updateVersionComponent,
    deleteVersion,
  }
}
