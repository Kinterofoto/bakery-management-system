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
  actual_quantity: number
  difference: number
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
      // 1. Get final results from inventory
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
          )
        `)
        .eq('inventory_id', inventoryId)

      if (resultsError) throw resultsError

      // 2. Get actual inventory from compras.material_inventory_status
      const { data: actualInventory, error: inventoryError } = await (supabase as any)
        .schema('compras')
        .from('material_inventory_status')
        .select('*')

      if (inventoryError) throw inventoryError

      // Create a map for quick lookup
      const inventoryMap = new Map(
        actualInventory?.map(item => [item.id, item.current_stock]) || []
      )

      // 3. Combine data and calculate differences
      const productsWithComparison: ProductWithInventory[] = (finalResults || []).map((result: any) => {
        const systemQty = inventoryMap.get(result.product_id) || 0

        // Use final_total_grams as the counted quantity (the actual amount counted in grams)
        const countedQty = result.final_total_grams || 0

        // Difference = Counted (reality) - System (what system thinks)
        // Positive = we have more than system thinks (need to add to system)
        // Negative = we have less than system thinks (need to subtract from system)
        const difference = countedQty - systemQty

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
          actual_quantity: systemQty,
          difference: difference,
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

      // Call the database function to apply the adjustment
      const { data, error } = await supabase.rpc('apply_inventory_adjustment', {
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
