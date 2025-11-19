"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export interface FinishedGoodsItem {
  productId: string
  productName: string
  quantity: number
  producedQuantity: number
  dispatchedQuantity: number
  lastUpdated?: Date
}

export function useFinishedGoodsInventory() {
  const [inventory, setInventory] = useState<FinishedGoodsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFinishedGoodsInventory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Call the Supabase function that calculates inventory
      const { data, error: inventoryError } = await supabase
        .rpc("get_finished_goods_inventory")

      if (inventoryError) throw inventoryError

      if (!data || data.length === 0) {
        setInventory([])
        return
      }

      // Map the function results to our FinishedGoodsItem interface
      const inventoryItems: FinishedGoodsItem[] = data.map((item: any) => ({
        productId: item.product_id,
        productName: item.product_name,
        quantity: Math.max(0, item.available_quantity || 0),
        producedQuantity: item.produced_quantity || 0,
        dispatchedQuantity: item.dispatched_quantity || 0,
        lastUpdated: new Date()
      }))

      setInventory(inventoryItems)
    } catch (err) {
      console.error("Error fetching finished goods inventory:", err)
      setError(err instanceof Error ? err.message : "Error fetching inventory")
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchFinishedGoodsInventory()

    // Subscribe to production records changes
    const productionChannel = supabase
      .channel("finished-goods-production")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "produccion",
          table: "production_records"
        },
        () => {
          fetchFinishedGoodsInventory()
        }
      )
      .subscribe()

    // Subscribe to order items changes (for dispatch)
    const dispatchChannel = supabase
      .channel("finished-goods-dispatch")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "order_items"
        },
        () => {
          fetchFinishedGoodsInventory()
        }
      )
      .subscribe()

    return () => {
      productionChannel.unsubscribe()
      dispatchChannel.unsubscribe()
    }
  }, [fetchFinishedGoodsInventory])

  const refetch = useCallback(() => {
    fetchFinishedGoodsInventory()
  }, [fetchFinishedGoodsInventory])

  return {
    inventory,
    loading,
    error,
    refetch
  }
}
