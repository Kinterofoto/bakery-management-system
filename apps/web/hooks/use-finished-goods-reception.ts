"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useInventoryMovements } from "./use-inventory-movements"

export interface PendingProduction {
  id: string
  shift_production_id: string
  shift_id: string
  product_id: string
  product_name: string
  product_code: string
  work_center_id: string
  work_center_name: string
  work_center_code: string
  quantity: number
  unit_type: "good" | "bad"
  unit_of_measure: string
  status: string
  started_at: string
  ended_at: string | null
  is_last_operation: boolean
  received_to_inventory: boolean
}

export interface ReceptionRecord {
  id: string
  shift_production_id: string
  product_name: string
  product_code: string
  quantity_received: number
  quantity_rejected: number
  unit_of_measure: string
  work_center_name: string
  received_at: string
  received_by_name: string
  notes: string | null
  movement_id: string
}

export interface ReceptionStats {
  pendingCount: number
  pendingValue: number
  todayReceived: number
  weekReceived: number
}

export function useFinishedGoodsReception() {
  const [pendingProductions, setPendingProductions] = useState<PendingProduction[]>([])
  const [receptionHistory, setReceptionHistory] = useState<ReceptionRecord[]>([])
  const [stats, setStats] = useState<ReceptionStats>({
    pendingCount: 0,
    pendingValue: 0,
    todayReceived: 0,
    weekReceived: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { createMovement } = useInventoryMovements()

  // Fetch pending productions from last work center operations
  const fetchPendingProductions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get all completed shift productions that haven't been received yet
      const { data: productions, error: prodError } = await supabase
        .schema("produccion")
        .from("shift_productions")
        .select(`
          id,
          shift_id,
          product_id,
          total_good_units,
          total_bad_units,
          status,
          started_at,
          ended_at,
          received_to_inventory
        `)
        .eq("status", "completed")
        .eq("received_to_inventory", false)
        .gt("total_good_units", 0)
        .order("ended_at", { ascending: false })

      if (prodError) throw prodError

      if (!productions || productions.length === 0) {
        setPendingProductions([])
        return
      }

      // Get unique product IDs and shift IDs
      const productIds = [...new Set(productions.map(p => p.product_id))]
      const shiftIds = [...new Set(productions.map(p => p.shift_id))]

      // Fetch shifts to get work center IDs
      const { data: shifts } = await supabase
        .schema("produccion")
        .from("production_shifts")
        .select("id, work_center_id")
        .in("id", shiftIds)

      const shiftsMap = new Map(shifts?.map(s => [s.id, s]) || [])
      const workCenterIds = [...new Set(shifts?.map(s => s.work_center_id).filter(Boolean) as string[] || [])]

      // Fetch products from public schema (shift_productions references public.products)
      const { data: products } = await supabase
        .from("products")
        .select("id, name, unit")
        .in("id", productIds)

      // Fetch work centers
      const { data: workCenters } = await supabase
        .schema("produccion")
        .from("work_centers")
        .select("id, code, name, is_last_operation")
        .in("id", workCenterIds)

      // Create maps for quick lookup
      const productsMap = new Map(products?.map(p => [p.id, p]) || [])
      const workCentersMap = new Map(workCenters?.map(w => [w.id, w]) || [])

      // Enrich productions with product and work center data
      // Create separate rows for good and bad units
      const enrichedProductions: PendingProduction[] = []

      productions.forEach(prod => {
        const product = productsMap.get(prod.product_id)
        const shift = shiftsMap.get(prod.shift_id)
        const workCenter = shift ? workCentersMap.get(shift.work_center_id) : null

        // Only include productions from last operation work centers
        if (!workCenter?.is_last_operation) return

        const baseData = {
          shift_production_id: prod.id,
          shift_id: prod.shift_id,
          product_id: prod.product_id,
          product_name: product?.name || "Producto sin nombre",
          product_code: product?.id?.substring(0, 8) || "",
          work_center_id: shift?.work_center_id || "",
          work_center_name: workCenter?.name || "Desconocido",
          work_center_code: workCenter?.code || "",
          unit_of_measure: product?.unit || "unidad",
          status: prod.status,
          started_at: prod.started_at,
          ended_at: prod.ended_at,
          is_last_operation: true,
          received_to_inventory: prod.received_to_inventory,
        }

        // Add row for good units if quantity > 0
        if (prod.total_good_units > 0) {
          enrichedProductions.push({
            ...baseData,
            id: `${prod.id}-good`,
            quantity: prod.total_good_units,
            unit_type: "good",
          })
        }

        // Add row for bad units if quantity > 0
        if (prod.total_bad_units > 0) {
          enrichedProductions.push({
            ...baseData,
            id: `${prod.id}-bad`,
            quantity: prod.total_bad_units,
            unit_type: "bad",
          })
        }
      })

      setPendingProductions(enrichedProductions)
    } catch (err) {
      console.error("Error fetching pending productions:", err)
      setError(err instanceof Error ? err.message : "Error al cargar producciones pendientes")
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch reception history
  const fetchReceptionHistory = useCallback(async () => {
    try {
      // Query inventory movements with reason_type = 'production' for finished goods
      const { data: movements, error: movError } = await supabase
        .schema("inventario")
        .from("inventory_movements")
        .select(`
          id,
          product_id,
          quantity,
          unit_of_measure,
          reference_id,
          notes,
          recorded_by,
          movement_date,
          created_at
        `)
        .eq("reason_type", "production")
        .eq("movement_type", "IN")
        .order("movement_date", { ascending: false })
        .limit(50)

      if (movError) throw movError

      if (!movements || movements.length === 0) {
        setReceptionHistory([])
        return
      }

      // Get unique product IDs and user IDs
      const productIds = [...new Set(movements.map(m => m.product_id))]
      const userIds = [...new Set(movements.map(m => m.recorded_by).filter(Boolean) as string[])]
      const shiftProductionIds = [...new Set(movements.map(m => m.reference_id).filter(Boolean) as string[])]

      // Fetch products from public schema
      const { data: products } = await supabase
        .from("products")
        .select("id, name, unit")
        .in("id", productIds)

      // Fetch users
      const { data: users } = await supabase
        .from("users")
        .select("id, email")
        .in("id", userIds)

      // Fetch shift productions to get work center info
      const { data: shiftProductions } = await supabase
        .schema("produccion")
        .from("shift_productions")
        .select("id, work_center_id")
        .in("id", shiftProductionIds)

      // Fetch work centers
      const workCenterIds = [...new Set(shiftProductions?.map(sp => sp.work_center_id) || [])]
      const { data: workCenters } = await supabase
        .schema("produccion")
        .from("work_centers")
        .select("id, code, name")
        .in("id", workCenterIds)

      // Create maps
      const productsMap = new Map(products?.map(p => [p.id, p]) || [])
      const usersMap = new Map(users?.map(u => [u.id, u]) || [])
      const shiftProductionsMap = new Map(shiftProductions?.map(sp => [sp.id, sp]) || [])
      const workCentersMap = new Map(workCenters?.map(w => [w.id, w]) || [])

      // Enrich movements
      const enrichedHistory: ReceptionRecord[] = movements.map(movement => {
        const product = productsMap.get(movement.product_id)
        const user = usersMap.get(movement.recorded_by || "")
        const shiftProduction = shiftProductionsMap.get(movement.reference_id || "")
        const workCenter = shiftProduction ? workCentersMap.get(shiftProduction.work_center_id) : null

        return {
          id: movement.id,
          shift_production_id: movement.reference_id || "",
          product_name: product?.name || "Producto sin nombre",
          product_code: product?.id?.substring(0, 8) || "",
          quantity_received: movement.quantity,
          quantity_rejected: 0, // Can be extracted from notes if needed
          unit_of_measure: movement.unit_of_measure,
          work_center_name: workCenter ? `${workCenter.code} - ${workCenter.name}` : "N/A",
          received_at: movement.movement_date,
          received_by_name: user?.email?.split("@")[0] || "Desconocido",
          notes: movement.notes,
          movement_id: movement.id,
        }
      })

      setReceptionHistory(enrichedHistory)
    } catch (err) {
      console.error("Error fetching reception history:", err)
    }
  }, [])

  // Calculate stats
  const calculateStats = useCallback(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const todayCount = receptionHistory.filter(r =>
      new Date(r.received_at) >= today
    ).length

    const weekCount = receptionHistory.filter(r =>
      new Date(r.received_at) >= weekAgo
    ).length

    setStats({
      pendingCount: pendingProductions.filter(p => p.unit_type === "good").length,
      pendingValue: pendingProductions.reduce((sum, p) => sum + p.quantity, 0),
      todayReceived: todayCount,
      weekReceived: weekCount,
    })
  }, [pendingProductions, receptionHistory])

  // Approve reception - create inventory movement and mark as received
  const approveReception = useCallback(async (params: {
    shiftProductionId: string
    productId: string
    quantityApproved: number
    quantityRejected?: number
    notes?: string
    locationId: string // WH3 location ID (WH3-GENERAL for good units, WH3-DEFECTS for bad units)
    unitType: "good" | "bad"
  }) => {
    try {
      setLoading(true)

      // Create inventory movement for approved quantity
      const movement = await createMovement({
        productId: params.productId,
        quantity: params.quantityApproved,
        movementType: "IN",
        reasonType: "production",
        locationIdTo: params.locationId,
        referenceId: params.shiftProductionId,
        referenceType: "shift_production",
        notes: params.notes || "Recepción de producto terminado",
      })

      // Mark shift production as received
      const { error: updateError } = await supabase
        .schema("produccion")
        .from("shift_productions")
        .update({
          received_to_inventory: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.shiftProductionId)

      if (updateError) throw updateError

      toast.success("Recepción aprobada exitosamente")

      // Refresh data
      await Promise.all([
        fetchPendingProductions(),
        fetchReceptionHistory(),
      ])

      return movement
    } catch (err) {
      console.error("Error approving reception:", err)
      toast.error(err instanceof Error ? err.message : "Error al aprobar recepción")
      throw err
    } finally {
      setLoading(false)
    }
  }, [createMovement, fetchPendingProductions, fetchReceptionHistory])

  // Reject reception
  const rejectReception = useCallback(async (params: {
    shiftProductionId: string
    reason: string
  }) => {
    try {
      setLoading(true)

      // For now, just mark as received with a rejection note
      // In the future, this could have a different status
      const { error: updateError } = await supabase
        .schema("produccion")
        .from("shift_productions")
        .update({
          received_to_inventory: true,
          notes: `RECHAZADO: ${params.reason}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.shiftProductionId)

      if (updateError) throw updateError

      toast.success("Recepción rechazada")

      // Refresh pending productions
      await fetchPendingProductions()
    } catch (err) {
      console.error("Error rejecting reception:", err)
      toast.error(err instanceof Error ? err.message : "Error al rechazar recepción")
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchPendingProductions])

  // Approve multiple receptions at once (batch approval)
  const approveBatchReceptions = useCallback(async (items: Array<{
    shiftProductionId: string
    productId: string
    quantity: number
    unitType: "good" | "bad"
    locationId: string
    notes?: string
  }>) => {
    try {
      setLoading(true)

      // Process all items in parallel for better performance
      const promises = items.map(async (item) => {
        try {
          // Create inventory movement
          const movement = await createMovement({
            productId: item.productId,
            quantity: item.quantity,
            movementType: "IN",
            reasonType: "production",
            locationIdTo: item.locationId,
            referenceId: item.shiftProductionId,
            referenceType: "shift_production",
            notes: item.notes || "Recepción de producto terminado",
          })

          // Mark shift production as received
          const { error: updateError } = await supabase
            .schema("produccion")
            .from("shift_productions")
            .update({
              received_to_inventory: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.shiftProductionId)

          if (updateError) throw updateError

          return { success: true, movement, item }
        } catch (err) {
          return { success: false, error: err, item }
        }
      })

      // Wait for all operations to complete
      const results = await Promise.all(promises)

      // Separate successful and failed operations
      const successful = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)

      // Refresh data once after all operations
      await Promise.all([
        fetchPendingProductions(),
        fetchReceptionHistory(),
      ])

      // Show appropriate toast message
      if (failed.length === 0) {
        toast.success(`${items.length} recepciones aprobadas exitosamente`)
      } else if (successful.length > 0) {
        toast.warning(`${successful.length} recepciones aprobadas, ${failed.length} fallaron`)
      } else {
        toast.error("Error al aprobar recepciones por lote")
      }

      return {
        results: successful.map(r => r.movement),
        errors: failed.map(r => ({ item: r.item, error: r.error }))
      }
    } catch (err) {
      console.error("Error in batch approval:", err)
      toast.error("Error al aprobar recepciones por lote")
      throw err
    } finally {
      setLoading(false)
    }
  }, [createMovement, fetchPendingProductions, fetchReceptionHistory])

  // Initial load
  useEffect(() => {
    fetchPendingProductions()
    fetchReceptionHistory()
  }, [fetchPendingProductions, fetchReceptionHistory])

  // Update stats when data changes
  useEffect(() => {
    calculateStats()
  }, [calculateStats])

  return {
    pendingProductions,
    receptionHistory,
    stats,
    loading,
    error,
    approveReception,
    approveBatchReceptions,
    rejectReception,
    refetch: () => {
      fetchPendingProductions()
      fetchReceptionHistory()
    },
  }
}
