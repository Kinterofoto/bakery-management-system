"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"

export interface AdjustmentReason {
  id: string
  reason: string
  description: string | null
  is_active: boolean
}

export interface InventoryAdjustment {
  id: string
  inventory_id: string
  product_id: string
  counted_quantity: number
  actual_quantity: number
  difference: number
  adjustment_type: 'positive' | 'negative'
  adjustment_quantity: number
  reason_id: string | null
  custom_reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  approved_by: string | null
  approved_at: string | null
  movement_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ProductWithInventory {
  product_id: string
  product_name: string
  product_category: string
  counted_quantity: number
  counted_grams_per_unit: number
  counted_total_grams: number
  snapshot_quantity: number // Inventory at the moment count was finalized
  current_quantity: number // Current inventory (informative only)
  actual_quantity: number // Legacy - kept for compatibility
  difference: number // counted - snapshot (used for adjustment)
  current_difference: number // counted - current (informative only)
  adjustment_type: 'positive' | 'negative' | 'none'
  adjustment_needed: boolean
}

export function useInventoryAdjustments(inventoryId?: string) {
  const { user } = useAuth()
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([])
  const [reasons, setReasons] = useState<AdjustmentReason[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchReasons()
    if (inventoryId) {
      fetchAdjustments()
    } else {
      setLoading(false)
    }
  }, [inventoryId])

  const fetchReasons = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("adjustment_reasons")
        .select("*")
        .eq('is_active', true)
        .order("reason", { ascending: true })

      if (fetchError) throw fetchError

      setReasons(data || [])
    } catch (err) {
      console.error("Error fetching adjustment reasons:", err)
    }
  }

  const fetchAdjustments = async () => {
    if (!inventoryId) return

    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from("inventory_adjustments")
        .select("*")
        .eq("inventory_id", inventoryId)
        .order("created_at", { ascending: false })

      if (fetchError) throw fetchError

      setAdjustments(data || [])
      setError(null)
    } catch (err) {
      console.error("Error fetching adjustments:", err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  const getProductsWithInventoryComparison = async (
    inventoryId: string
  ): Promise<ProductWithInventory[]> => {
    try {
      // 1. Get inventory location_id directly
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventories')
        .select('location_id')
        .eq('id', inventoryId)
        .single()

      if (inventoryError) throw inventoryError

      const locationId = inventoryData?.location_id

      if (!locationId) {
        throw new Error('El inventario no tiene una ubicación asignada')
      }

      // 2. Get final results with snapshots from the last completed count
      const { data: finalResults, error: resultsError } = await supabase
        .from('inventory_final_results')
        .select(`
          product_id,
          final_quantity,
          final_grams_per_unit,
          final_total_grams,
          products!inner (
            id,
            name,
            category
          ),
          inventory:inventory_id (
            inventory_counts!inner (
              inventory_count_items (
                id,
                product_id,
                snapshot_quantity
              )
            )
          )
        `)
        .eq('inventory_id', inventoryId)

      if (resultsError) throw resultsError

      // 3. Get current inventory balances for the specific location
      const productIds = finalResults?.map((r: any) => r.product_id) || []

      const { data: currentBalances, error: balancesError } = await supabase
        .schema('inventario')
        .from('inventory_balances')
        .select('product_id, quantity_on_hand')
        .eq('location_id', locationId)
        .in('product_id', productIds)

      if (balancesError) throw balancesError

      // Create maps for quick lookup
      const snapshotMap = new Map<string, number>()
      const currentBalanceMap = new Map<string, number>()

      // Build snapshot map from count items
      finalResults?.forEach((result: any) => {
        const countItems = result.inventory?.inventory_counts?.[0]?.inventory_count_items || []
        const matchingItem = countItems.find((item: any) => item.product_id === result.product_id)
        if (matchingItem) {
          snapshotMap.set(result.product_id, matchingItem.snapshot_quantity || 0)
        }
      })

      // Build current balance map for the specific location
      currentBalances?.forEach((balance: any) => {
        currentBalanceMap.set(balance.product_id, balance.quantity_on_hand || 0)
      })

      // 5. Combine data and calculate differences
      const productsWithComparison: ProductWithInventory[] = (finalResults || []).map((result: any) => {
        const countedQty = result.final_total_grams || 0
        const snapshotQty = snapshotMap.get(result.product_id) || 0
        const currentQty = currentBalanceMap.get(result.product_id) || 0

        // Main difference: Counted - Snapshot (this is what we'll adjust)
        const difference = countedQty - snapshotQty

        // Informative difference: Counted - Current
        const currentDifference = countedQty - currentQty

        let adjustmentType: 'positive' | 'negative' | 'none' = 'none'
        if (difference > 0) adjustmentType = 'positive'
        else if (difference < 0) adjustmentType = 'negative'

        return {
          product_id: result.product_id,
          product_name: result.products.name,
          product_category: result.products.category,
          counted_quantity: countedQty,
          counted_grams_per_unit: result.final_grams_per_unit || 0,
          counted_total_grams: result.final_total_grams || 0,
          snapshot_quantity: snapshotQty,
          current_quantity: currentQty,
          actual_quantity: snapshotQty, // Legacy - use snapshot for compatibility
          difference: difference,
          current_difference: currentDifference,
          adjustment_type: adjustmentType,
          adjustment_needed: Math.abs(difference) > 0
        }
      })

      return productsWithComparison
    } catch (err) {
      console.error("Error getting products with inventory comparison:", err)
      toast.error("Error al obtener comparación de inventarios")
      return []
    }
  }

  const createAdjustment = async (
    adjustment: Omit<InventoryAdjustment, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'approved_by' | 'approved_at' | 'movement_id' | 'status'>
  ) => {
    try {
      const { data, error: createError } = await supabase
        .from("inventory_adjustments")
        .insert({
          ...adjustment,
          created_by: user?.id,
          status: 'pending'
        })
        .select()
        .single()

      if (createError) throw createError

      toast.success("Ajuste creado exitosamente")
      await fetchAdjustments()
      return data
    } catch (err) {
      console.error("Error creating adjustment:", err)
      toast.error("Error al crear el ajuste")
      throw err
    }
  }

  const applyAdjustment = async (adjustmentId: string) => {
    try {
      if (!user?.id) throw new Error("Usuario no autenticado")

      // Call the database function to apply the adjustment directly to location_id
      const { data, error} = await supabase.rpc('apply_inventory_adjustment', {
        p_adjustment_id: adjustmentId,
        p_user_id: user.id
      })

      if (error) throw error

      toast.success("Ajuste aplicado exitosamente")
      await fetchAdjustments()
      return data
    } catch (err: any) {
      console.error("Error applying adjustment:", err)
      toast.error(err.message || "Error al aplicar el ajuste")
      throw err
    }
  }

  const rejectAdjustment = async (adjustmentId: string) => {
    try {
      const { error } = await supabase
        .from("inventory_adjustments")
        .update({
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', adjustmentId)

      if (error) throw error

      toast.success("Ajuste rechazado")
      await fetchAdjustments()
    } catch (err) {
      console.error("Error rejecting adjustment:", err)
      toast.error("Error al rechazar el ajuste")
      throw err
    }
  }

  return {
    adjustments,
    reasons,
    loading,
    error,
    refetch: fetchAdjustments,
    getProductsWithInventoryComparison,
    createAdjustment,
    applyAdjustment,
    rejectAdjustment
  }
}
