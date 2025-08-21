"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type ProductivityParams = Database["produccion"]["Tables"]["production_productivity"]["Row"]
type ProductivityInsert = Database["produccion"]["Tables"]["production_productivity"]["Insert"]

interface TheoreticalProduction {
  productId: string
  productName: string
  theoreticalUnits: number
  actualUnits: number
  variance: number
  variancePercentage: number
  hoursWorked: number
  unitsPerHour: number
}

interface TheoreticalConsumption {
  materialId: string
  materialName: string
  theoreticalQuantity: number
  actualConsumed: number
  actualWasted: number
  totalActual: number
  variance: number
  variancePercentage: number
  unitName: string
}

export function useProductionAnalytics() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Gestión de parámetros de productividad
  const getProductivityParams = useCallback(async (productId?: string, workCenterId?: string) => {
    try {
      setError(null)
      let query = supabase
        .schema("produccion").from("production_productivity")
        .select("*")
        .eq("is_active", true)

      if (productId) {
        query = query.eq("product_id", productId)
      }
      if (workCenterId) {
        query = query.eq("work_center_id", workCenterId)
      }

      const { data, error } = await query
      if (error) throw error
      
      return data || []
    } catch (err) {
      console.error("Error fetching productivity params:", err)
      setError(err instanceof Error ? err.message : "Error fetching productivity params")
      return []
    }
  }, [])

  const createProductivityParam = useCallback(async (param: ProductivityInsert) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .schema("produccion").from("production_productivity")
        .insert(param)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.error("Error creating productivity param:", err)
      setError(err instanceof Error ? err.message : "Error creating productivity param")
      throw err
    }
  }, [])

  const updateProductivityParam = useCallback(async (
    id: string, 
    updates: Partial<ProductivityParams>
  ) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .schema("produccion").from("production_productivity")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.error("Error updating productivity param:", err)
      setError(err instanceof Error ? err.message : "Error updating productivity param")
      throw err
    }
  }, [])

  // Cálculo de producción teórica vs real
  const calculateTheoreticalProduction = useCallback(async (
    productId: string,
    workCenterId: string,
    startTime: string,
    endTime?: string
  ): Promise<number> => {
    try {
      setError(null)
      const { data, error } = await supabase
        .schema('produccion')
        .rpc('calculate_theoretical_production', {
          p_product_id: productId,
          p_work_center_id: workCenterId,
          p_start_time: startTime,
          p_end_time: endTime || new Date().toISOString()
        })

      if (error) throw error
      return data || 0
    } catch (err) {
      console.error("Error calculating theoretical production:", err)
      setError(err instanceof Error ? err.message : "Error calculating theoretical production")
      return 0
    }
  }, [])

  // Análisis completo de producción para un turno
  const analyzeShiftProduction = useCallback(async (shiftId: string): Promise<TheoreticalProduction[]> => {
    try {
      setLoading(true)
      setError(null)

      // Obtener producciones del turno con información del producto
      const { data: productions, error: prodError } = await supabase
        .schema("produccion").from("shift_productions")
        .select(`
          *,
          products:product_id (id, name),
          shift:shift_id (work_center_id, started_at)
        `)
        .eq("shift_id", shiftId)

      if (prodError) throw prodError

      const results: TheoreticalProduction[] = []

      for (const production of productions || []) {
        if (!production.products || !production.shift) continue

        const theoreticalUnits = await calculateTheoreticalProduction(
          production.product_id,
          production.shift.work_center_id,
          production.started_at,
          production.ended_at || undefined
        )

        const actualUnits = production.total_good_units
        const variance = actualUnits - theoreticalUnits
        const variancePercentage = theoreticalUnits > 0 ? (variance / theoreticalUnits) * 100 : 0

        // Calcular horas trabajadas
        const startTime = new Date(production.started_at)
        const endTime = production.ended_at ? new Date(production.ended_at) : new Date()
        const hoursWorked = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)

        // Obtener unidades por hora
        const productivityParams = await getProductivityParams(
          production.product_id, 
          production.shift.work_center_id
        )
        const unitsPerHour = productivityParams[0]?.units_per_hour || 0

        results.push({
          productId: production.product_id,
          productName: production.products.name,
          theoreticalUnits,
          actualUnits,
          variance,
          variancePercentage,
          hoursWorked,
          unitsPerHour
        })
      }

      return results
    } catch (err) {
      console.error("Error analyzing shift production:", err)
      setError(err instanceof Error ? err.message : "Error analyzing shift production")
      return []
    } finally {
      setLoading(false)
    }
  }, [calculateTheoreticalProduction, getProductivityParams])

  // Análisis de consumo de materiales
  const analyzeMaterialConsumption = useCallback(async (
    shiftProductionId: string
  ): Promise<TheoreticalConsumption[]> => {
    try {
      setLoading(true)
      setError(null)

      // Obtener información de la producción
      const { data: production, error: prodError } = await supabase
        .schema("produccion").from("shift_productions")
        .select("product_id, total_good_units")
        .eq("id", shiftProductionId)
        .single()

      if (prodError) throw prodError
      if (!production) return []

      // Calcular consumo teórico usando la función SQL
      const { data: theoreticalData, error: theoreticalError } = await supabase
        .schema('produccion')
        .rpc('calculate_theoretical_consumption', {
          p_product_id: production.product_id,
          p_units_produced: production.total_good_units
        })

      if (theoreticalError) throw theoreticalError

      // Obtener consumos reales
      const { data: consumptions, error: consumptionsError } = await supabase
        .schema("produccion").from("material_consumptions")
        .select(`
          material_id,
          quantity_consumed,
          consumption_type,
          materials:material_id (name)
        `)
        .eq("shift_production_id", shiftProductionId)

      if (consumptionsError) throw consumptionsError

      const results: TheoreticalConsumption[] = []

      for (const theoretical of theoreticalData || []) {
        const actualConsumed = consumptions
          ?.filter(c => c.material_id === theoretical.material_id && c.consumption_type === "consumed")
          .reduce((sum, c) => sum + c.quantity_consumed, 0) || 0

        const actualWasted = consumptions
          ?.filter(c => c.material_id === theoretical.material_id && c.consumption_type === "wasted")
          .reduce((sum, c) => sum + c.quantity_consumed, 0) || 0

        const totalActual = actualConsumed + actualWasted
        const variance = totalActual - theoretical.theoretical_quantity
        const variancePercentage = theoretical.theoretical_quantity > 0 
          ? (variance / theoretical.theoretical_quantity) * 100 
          : 0

        results.push({
          materialId: theoretical.material_id,
          materialName: theoretical.material_name,
          theoreticalQuantity: theoretical.theoretical_quantity,
          actualConsumed,
          actualWasted,
          totalActual,
          variance,
          variancePercentage,
          unitName: theoretical.unit_name
        })
      }

      return results
    } catch (err) {
      console.error("Error analyzing material consumption:", err)
      setError(err instanceof Error ? err.message : "Error analyzing material consumption")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // Análisis del embudo de producción
  const analyzeProductionFunnel = useCallback(async (
    productId: string,
    shiftDate: string
  ) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .schema("produccion").from("production_route_tracking")
        .select(`
          *,
          work_center:work_center_id (name, code)
        `)
        .eq("product_id", productId)
        .eq("shift_date", shiftDate)
        .order("created_at")

      if (error) throw error
      return data || []
    } catch (err) {
      console.error("Error analyzing production funnel:", err)
      setError(err instanceof Error ? err.message : "Error analyzing production funnel")
      return []
    }
  }, [])

  return {
    loading,
    error,
    getProductivityParams,
    createProductivityParam,
    updateProductivityParam,
    calculateTheoreticalProduction,
    analyzeShiftProduction,
    analyzeMaterialConsumption,
    analyzeProductionFunnel,
  }
}