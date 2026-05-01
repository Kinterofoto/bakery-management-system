"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { fetchPtReceptionEnabled } from "@/hooks/use-pt-reception-enabled"
import { fetchWcInventoryEnabled } from "@/hooks/use-wc-inventory-enabled"
import { toast } from "sonner"
import type { Database } from "@/lib/database.types"

type ShiftProduction = Database["produccion"]["Tables"]["shift_productions"]["Row"]
type ShiftProductionInsert = Database["produccion"]["Tables"]["shift_productions"]["Insert"]
type ShiftProductionUpdate = Database["produccion"]["Tables"]["shift_productions"]["Update"]
type ProductionRecord = Database["produccion"]["Tables"]["production_records"]["Row"]
type ProductionRecordInsert = Database["produccion"]["Tables"]["production_records"]["Insert"]

async function autoReceiveCompletedProduction(production: ShiftProduction) {
  if (!production.shift_id || !production.product_id) return
  if (production.received_to_inventory) return

  // Resolve work center for this shift to check if it's the last operation.
  const { data: shift, error: shiftError } = await supabase
    .schema("produccion")
    .from("production_shifts")
    .select("work_center_id")
    .eq("id", production.shift_id)
    .maybeSingle()

  if (shiftError) throw shiftError
  if (!shift?.work_center_id) return

  const { data: workCenter, error: wcError } = await supabase
    .schema("produccion")
    .from("work_centers")
    .select("id, is_last_operation")
    .eq("id", shift.work_center_id)
    .maybeSingle()

  if (wcError) throw wcError
  if (!workCenter?.is_last_operation) return

  const goodUnits = production.total_good_units ?? 0
  const badUnits = production.total_bad_units ?? 0

  if (goodUnits === 0 && badUnits === 0) {
    await supabase
      .schema("produccion")
      .from("shift_productions")
      .update({
        received_to_inventory: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", production.id)
    return
  }

  const { data: locations, error: locError } = await supabase
    .schema("inventario")
    .from("locations")
    .select("id, code")
    .in("code", ["WH3-GENERAL", "WH3-DEFECTS"])

  if (locError) throw locError

  const generalLocation = locations?.find((loc) => loc.code === "WH3-GENERAL")
  const defectsLocation = locations?.find((loc) => loc.code === "WH3-DEFECTS")

  if (goodUnits > 0) {
    if (!generalLocation) {
      throw new Error("No se encontró la ubicación WH3-GENERAL para auto-recepción")
    }
    const { error: rpcError } = await supabase
      .schema("inventario")
      .rpc("perform_inventory_movement", {
        p_product_id: production.product_id,
        p_quantity: goodUnits,
        p_movement_type: "IN",
        p_reason_type: "production",
        p_location_id_to: generalLocation.id,
        p_reference_id: production.id,
        p_reference_type: "shift_production",
        p_notes: "Auto-recepción al empacar (módulo recepción PT desactivado)",
      })
    if (rpcError) throw rpcError
  }

  if (badUnits > 0 && defectsLocation) {
    const { error: rpcError } = await supabase
      .schema("inventario")
      .rpc("perform_inventory_movement", {
        p_product_id: production.product_id,
        p_quantity: badUnits,
        p_movement_type: "IN",
        p_reason_type: "production",
        p_location_id_to: defectsLocation.id,
        p_reference_id: production.id,
        // reference_type distinto para que el RPC NO cree lote (defectos no se consumen aguas abajo)
        p_reference_type: "shift_production_defects",
        p_notes: "Auto-recepción de unidades defectuosas (módulo recepción PT desactivado)",
      })
    if (rpcError) throw rpcError
  }

  const { error: updateError } = await supabase
    .schema("produccion")
    .from("shift_productions")
    .update({
      received_to_inventory: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", production.id)

  if (updateError) throw updateError
}

export function useShiftProductions(shiftId?: string) {
  const [productions, setProductions] = useState<ShiftProduction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProductions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      let query = supabase
        .schema("produccion").from("shift_productions")
        .select("*")
        .order("started_at", { ascending: false })

      if (shiftId) {
        query = query.eq("shift_id", shiftId)
      }

      const { data, error } = await query

      if (error) throw error
      setProductions(data || [])
    } catch (err) {
      console.error("Error fetching shift productions:", err)
      setError(err instanceof Error ? err.message : "Error fetching shift productions")
    } finally {
      setLoading(false)
    }
  }, [shiftId])

  const createProduction = useCallback(async (production: ShiftProductionInsert) => {
    try {
      setError(null)

      const wcInventoryEnabled = await fetchWcInventoryEnabled()
      const payload: ShiftProductionInsert = {
        ...production,
        wc_inventory_mode: production.wc_inventory_mode ?? wcInventoryEnabled,
      }

      const { data, error } = await supabase
        .schema("produccion").from("shift_productions")
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      setProductions(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error("Error creating production:", err)
      setError(err instanceof Error ? err.message : "Error creating production")
      throw err
    }
  }, [])

  const updateProduction = useCallback(async (id: string, updates: ShiftProductionUpdate) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .schema("produccion").from("shift_productions")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      
      setProductions(prev => 
        prev.map(prod => prod.id === id ? data : prod)
      )
      return data
    } catch (err) {
      console.error("Error updating production:", err)
      setError(err instanceof Error ? err.message : "Error updating production")
      throw err
    }
  }, [])

  const endProduction = useCallback(async (id: string, notes?: string) => {
    try {
      const updated = await updateProduction(id, {
        status: "completed",
        ended_at: new Date().toISOString(),
        notes
      })

      // Snapshot del modo al iniciar la producción manda. Si la columna
      // viene null (producciones previas a la migración) se asume true.
      const wcInventoryModeForRun = updated?.wc_inventory_mode === false ? false : true

      if (!wcInventoryModeForRun && updated) {
        try {
          const { error: rpcError } = await supabase
            .schema("produccion")
            .rpc("finalize_production_auto_consume", {
              p_shift_production_id: updated.id,
            })
          if (rpcError) throw rpcError
        } catch (autoErr) {
          console.error("Auto-consumo BOM falló:", autoErr)
          toast.error(
            autoErr instanceof Error
              ? `Producción finalizada pero el descuento automático de materiales falló: ${autoErr.message}`
              : "Producción finalizada pero el descuento automático de materiales falló"
          )
        }
      }

      const ptReceptionEnabled = await fetchPtReceptionEnabled()
      if (!ptReceptionEnabled && updated) {
        try {
          await autoReceiveCompletedProduction(updated)
        } catch (autoErr) {
          console.error("Auto-recepción falló:", autoErr)
          toast.error(
            autoErr instanceof Error
              ? `Producción finalizada pero auto-recepción falló: ${autoErr.message}`
              : "Producción finalizada pero auto-recepción falló"
          )
        }
      }

      return updated
    } catch (err) {
      console.error("Error ending production:", err)
      throw err
    }
  }, [updateProduction])

  const addProductionRecord = useCallback(async (record: ProductionRecordInsert) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .schema("produccion").from("production_records")
        .insert(record)
        .select()
        .single()

      if (error) throw error
      
      // Refetch productions to update totals (trigger handles this automatically)
      fetchProductions()
      
      return data
    } catch (err) {
      console.error("Error adding production record:", err)
      setError(err instanceof Error ? err.message : "Error adding production record")
      throw err
    }
  }, [fetchProductions])

  const getProductionRecords = useCallback(async (shiftProductionId: string) => {
    try {
      const { data, error } = await supabase
        .schema("produccion").from("production_records")
        .select("*")
        .eq("shift_production_id", shiftProductionId)
        .order("recorded_at", { ascending: false })

      if (error) throw error
      return data || []
    } catch (err) {
      console.error("Error fetching production records:", err)
      return []
    }
  }, [])

  const getActiveProductions = useCallback(() => {
    return productions.filter(prod => prod.status === "active")
  }, [productions])

  const getProductionById = useCallback((id: string) => {
    return productions.find(prod => prod.id === id)
  }, [productions])

  const getProductionsByProduct = useCallback((productId: string) => {
    return productions.filter(prod => prod.product_id === productId)
  }, [productions])

  const getTotalUnitsProduced = useCallback(() => {
    return productions.reduce((total, prod) => total + (prod.total_good_units ?? 0), 0)
  }, [productions])

  const getTotalBadUnits = useCallback(() => {
    return productions.reduce((total, prod) => total + (prod.total_bad_units ?? 0), 0)
  }, [productions])

  useEffect(() => {
    fetchProductions()
  }, [fetchProductions])

  return {
    productions,
    loading,
    error,
    createProduction,
    updateProduction,
    endProduction,
    addProductionRecord,
    getProductionRecords,
    getActiveProductions,
    getProductionById,
    getProductionsByProduct,
    getTotalUnitsProduced,
    getTotalBadUnits,
    refetch: fetchProductions,
  }
}