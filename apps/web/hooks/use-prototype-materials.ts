"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import {
  calculateBakerPercentages,
  calculateEngineeringPercentages,
  calculateTotalGrams,
  normalizeToOneGram,
  type MaterialForCalc,
} from "@/lib/id-calculations"

export interface PrototypeMaterial {
  id: string
  prototype_id: string
  material_id: string | null
  material_name: string | null
  is_new_material: boolean
  is_base_ingredient: boolean
  quantity_needed: number | null
  original_quantity: number
  unit_name: string | null
  unit_equivalence_grams: number
  baker_percentage: number | null
  engineering_percentage: number | null
  unit_cost: number | null
  total_cost: number | null
  operation_id: string | null
  tiempo_reposo_horas: number | null
  display_order: number | null
}

export interface PrototypeMaterialInsert {
  prototype_id: string
  material_id?: string | null
  material_name?: string | null
  is_new_material?: boolean
  is_base_ingredient?: boolean
  original_quantity: number
  unit_name?: string | null
  unit_equivalence_grams?: number
  unit_cost?: number | null
  operation_id?: string | null
  tiempo_reposo_horas?: number | null
  display_order?: number | null
}

export interface PrototypeMaterialUpdate {
  material_id?: string | null
  material_name?: string | null
  is_new_material?: boolean
  is_base_ingredient?: boolean
  original_quantity?: number
  unit_name?: string | null
  unit_equivalence_grams?: number
  unit_cost?: number | null
  operation_id?: string | null
  tiempo_reposo_horas?: number | null
  display_order?: number | null
}

export function usePrototypeMaterials() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Recalcula baker_percentage, engineering_percentage, quantity_needed y total_cost
   * para todos los materiales de un prototipo
   */
  const recalculatePercentages = useCallback(async (prototypeId: string) => {
    try {
      // Obtener todos los materiales del prototipo
      const { data: materials, error: fetchError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_materials")
        .select("*")
        .eq("prototype_id", prototypeId)
        .order("display_order", { ascending: true })

      if (fetchError) throw fetchError
      if (!materials || materials.length === 0) return

      // Preparar datos para calculo
      const materialsForCalc: MaterialForCalc[] = materials.map((m) => ({
        original_quantity: m.original_quantity || 0,
        unit_equivalence_grams: m.unit_equivalence_grams || 1,
        is_base_ingredient: m.is_base_ingredient || false,
        unit_cost: m.unit_cost,
      }))

      const bakerPercentages = calculateBakerPercentages(materialsForCalc)
      const engineeringPercentages = calculateEngineeringPercentages(materialsForCalc)
      const totalGrams = calculateTotalGrams(materialsForCalc)

      // Actualizar cada material con los porcentajes calculados
      const updates = materials.map((material, index) => {
        const quantityNeeded = normalizeToOneGram(
          material.original_quantity || 0,
          material.unit_equivalence_grams || 1,
          totalGrams
        )
        const totalCost = (material.original_quantity || 0) * (material.unit_cost || 0)

        return (supabase
          .schema("investigacion" as any))
          .from("prototype_materials")
          .update({
            baker_percentage: bakerPercentages[index],
            engineering_percentage: engineeringPercentages[index],
            quantity_needed: quantityNeeded,
            total_cost: totalCost,
          })
          .eq("id", material.id)
      })

      await Promise.all(updates)
    } catch (err) {
      console.error("Error al recalcular porcentajes:", err)
      throw err
    }
  }, [])

  const getMaterialsByPrototype = useCallback(async (prototypeId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_materials")
        .select("*")
        .eq("prototype_id", prototypeId)
        .order("display_order", { ascending: true })

      if (fetchError) throw fetchError
      return (data as PrototypeMaterial[]) || []
    } catch (err) {
      console.error("Error al obtener materiales:", err)
      setError(err instanceof Error ? err.message : "Error al obtener materiales")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const addMaterial = useCallback(async (materialData: PrototypeMaterialInsert) => {
    try {
      setLoading(true)
      setError(null)

      // Calcular quantity_needed y total_cost al insertar
      const originalQty = materialData.original_quantity || 0
      const totalCost = originalQty * (materialData.unit_cost || 0)
      // quantity_needed se inicializa igual a original_quantity; recalculatePercentages lo normaliza después
      const quantityNeeded = originalQty

      const { data, error: insertError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_materials")
        .insert({
          ...materialData,
          quantity_needed: quantityNeeded,
          total_cost: totalCost,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Recalcular porcentajes para todos los materiales del prototipo
      await recalculatePercentages(materialData.prototype_id)

      toast.success("Material agregado exitosamente")
      return data as PrototypeMaterial
    } catch (err) {
      console.error("Error al agregar material:", err)
      setError(err instanceof Error ? err.message : "Error al agregar material")
      toast.error("Error al agregar material")
      return null
    } finally {
      setLoading(false)
    }
  }, [recalculatePercentages])

  const updateMaterial = useCallback(async (
    id: string,
    prototypeId: string,
    updates: PrototypeMaterialUpdate
  ) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: updateError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_materials")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (updateError) throw updateError

      // Recalcular porcentajes para todos los materiales del prototipo
      await recalculatePercentages(prototypeId)

      toast.success("Material actualizado exitosamente")
      return data as PrototypeMaterial
    } catch (err) {
      console.error("Error al actualizar material:", err)
      setError(err instanceof Error ? err.message : "Error al actualizar material")
      toast.error("Error al actualizar material")
      return null
    } finally {
      setLoading(false)
    }
  }, [recalculatePercentages])

  const removeMaterial = useCallback(async (id: string, prototypeId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { error: deleteError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_materials")
        .delete()
        .eq("id", id)

      if (deleteError) throw deleteError

      // Recalcular porcentajes para los materiales restantes
      await recalculatePercentages(prototypeId)

      toast.success("Material eliminado exitosamente")
      return true
    } catch (err) {
      console.error("Error al eliminar material:", err)
      setError(err instanceof Error ? err.message : "Error al eliminar material")
      toast.error("Error al eliminar material")
      return false
    } finally {
      setLoading(false)
    }
  }, [recalculatePercentages])

  return {
    loading,
    error,
    getMaterialsByPrototype,
    addMaterial,
    updateMaterial,
    removeMaterial,
    recalculatePercentages,
  }
}
