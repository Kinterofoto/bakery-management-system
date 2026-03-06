"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import {
  calculateMaterialCost,
  calculateLaborCost,
  calculateCostPerUnit,
  type MaterialForCalc,
  type OperationForCalc,
} from "@/lib/id-calculations"

export interface PrototypeCostEstimate {
  id: string
  prototype_id: string
  total_material_cost: number | null
  total_labor_cost: number | null
  total_cost: number | null
  total_units_produced: number | null
  material_cost_per_unit: number | null
  labor_cost_per_unit: number | null
  total_cost_per_unit: number | null
}

// Costo de mano de obra por minuto (configurable)
const DEFAULT_LABOR_COST_PER_MINUTE = 200 // COP

export function usePrototypeCosts() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getCostsByPrototype = useCallback(async (prototypeId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_cost_estimates")
        .select("*")
        .eq("prototype_id", prototypeId)
        .order("created_at", { ascending: false })

      if (fetchError) throw fetchError
      return (data as PrototypeCostEstimate[]) || []
    } catch (err) {
      console.error("Error al obtener estimaciones de costos:", err)
      setError(err instanceof Error ? err.message : "Error al obtener estimaciones de costos")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const calculateAndSaveCosts = useCallback(async (
    prototypeId: string,
    laborCostPerMinute: number = DEFAULT_LABOR_COST_PER_MINUTE
  ) => {
    try {
      setLoading(true)
      setError(null)

      // Obtener materiales del prototipo
      const { data: materials, error: matError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_materials")
        .select("*")
        .eq("prototype_id", prototypeId)

      if (matError) throw matError

      // Obtener operaciones del prototipo
      const { data: operations, error: opError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_operations")
        .select("*")
        .eq("prototype_id", prototypeId)

      if (opError) throw opError

      // Obtener datos de rendimiento para unidades producidas
      const { data: yieldData, error: yieldError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_yield_tracking")
        .select("total_units_produced")
        .eq("prototype_id", prototypeId)
        .order("created_at", { ascending: false })
        .limit(1)

      if (yieldError) throw yieldError

      // Preparar datos para calculo
      const materialsForCalc: MaterialForCalc[] = (materials || []).map((m) => ({
        original_quantity: m.original_quantity || 0,
        unit_equivalence_grams: m.unit_equivalence_grams || 1,
        is_base_ingredient: m.is_base_ingredient || false,
        unit_cost: m.unit_cost,
      }))

      const operationsForCalc: OperationForCalc[] = (operations || []).map((op) => ({
        duration_minutes: op.duration_minutes,
        people_count: op.people_count,
        timer_elapsed_seconds: op.timer_elapsed_seconds,
        input_weight_grams: op.input_weight_grams,
        output_weight_grams: op.output_weight_grams,
      }))

      // Calcular costos
      const totalMaterialCost = calculateMaterialCost(materialsForCalc)
      const { totalLaborCost } = calculateLaborCost(operationsForCalc, laborCostPerMinute)
      const totalCost = totalMaterialCost + totalLaborCost

      const unitsProduced = yieldData?.[0]?.total_units_produced || 0
      const perUnit = calculateCostPerUnit(totalMaterialCost, totalLaborCost, unitsProduced)

      // Verificar si ya existe un registro de costos para este prototipo
      const { data: existing, error: existError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_cost_estimates")
        .select("id")
        .eq("prototype_id", prototypeId)
        .limit(1)

      if (existError) throw existError

      const costData = {
        prototype_id: prototypeId,
        total_material_cost: totalMaterialCost,
        total_labor_cost: totalLaborCost,
        total_cost: totalCost,
        total_units_produced: unitsProduced,
        material_cost_per_unit: perUnit.materialCostPerUnit,
        labor_cost_per_unit: perUnit.laborCostPerUnit,
        total_cost_per_unit: perUnit.totalCostPerUnit,
      }

      let result
      if (existing && existing.length > 0) {
        // Actualizar existente
        const { data, error: updateError } = await (supabase
          .schema("investigacion" as any))
          .from("prototype_cost_estimates")
          .update(costData)
          .eq("id", existing[0].id)
          .select()
          .single()

        if (updateError) throw updateError
        result = data
      } else {
        // Crear nuevo
        const { data, error: insertError } = await (supabase
          .schema("investigacion" as any))
          .from("prototype_cost_estimates")
          .insert(costData)
          .select()
          .single()

        if (insertError) throw insertError
        result = data
      }

      toast.success("Costos calculados y guardados exitosamente")
      return result as PrototypeCostEstimate
    } catch (err) {
      console.error("Error al calcular y guardar costos:", err)
      setError(err instanceof Error ? err.message : "Error al calcular y guardar costos")
      toast.error("Error al calcular costos")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getCostsByPrototype,
    calculateAndSaveCosts,
  }
}
