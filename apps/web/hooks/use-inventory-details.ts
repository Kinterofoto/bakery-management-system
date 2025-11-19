"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export interface ProductionRecord {
  record_id: string
  shift_date: string
  good_units: number
  bad_units: number
  notes: string | null
  recorded_by: string | null
}

export interface DispatchRecord {
  delivery_id: string
  delivery_date: string
  order_id: string
  order_number: string
  client_name: string
  quantity_delivered: number
  quantity_rejected: number
  delivery_status: string
  rejection_reason: string | null
}

export function useInventoryDetails() {
  const [productionHistory, setProductionHistory] = useState<ProductionRecord[]>([])
  const [dispatchHistory, setDispatchHistory] = useState<DispatchRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInventoryDetails = useCallback(async (productId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Fetch production history
      const { data: prodData, error: prodError } = await supabase.rpc(
        "get_product_production_history",
        { p_product_id: productId }
      )

      if (prodError) throw prodError

      // Fetch dispatch history
      const { data: dispData, error: dispError } = await supabase.rpc(
        "get_product_dispatch_history",
        { p_product_id: productId }
      )

      if (dispError) throw dispError

      setProductionHistory(prodData || [])
      setDispatchHistory(dispData || [])
    } catch (err) {
      console.error("Error fetching inventory details:", err)
      setError(err instanceof Error ? err.message : "Error fetching details")
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    productionHistory,
    dispatchHistory,
    loading,
    error,
    fetchInventoryDetails
  }
}
