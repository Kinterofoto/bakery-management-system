"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type Product = Database["public"]["Tables"]["products"]["Row"]
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"]

export interface FinishedGoodsItem {
  productId: string
  productName: string
  sku: string
  quantity: number
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

      // Get all products that are finished goods (PT - Producto Terminado)
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("category", "PT")

      if (productsError) throw productsError

      if (!products || products.length === 0) {
        setInventory([])
        return
      }

      // For each product, calculate finished goods quantity from production
      const inventoryItems: FinishedGoodsItem[] = []

      for (const product of products) {
        // Get total good units produced in packaging work center (empaque)
        const { data: shiftProductions, error: shiftError } = await supabase
          .schema("produccion")
          .from("shift_productions")
          .select("id, total_good_units, product_id, work_center_id")
          .eq("product_id", product.id)
          .order("started_at", { ascending: false })

        if (shiftError) throw shiftError

        // Get total dispatched quantities
        const { data: dispatchedItems, error: dispatchError } = await supabase
          .from("order_items")
          .select("quantity_available")
          .eq("product_id", product.id)
          .not("availability_status", "is", null) // Only count dispatched items

        if (dispatchError) throw dispatchError

        // Calculate produced quantity (only from empaque/packaging center)
        let producedQuantity = 0
        if (shiftProductions && shiftProductions.length > 0) {
          producedQuantity = shiftProductions.reduce(
            (sum, sp) => sum + (sp.total_good_units || 0),
            0
          )
        }

        // Calculate dispatched quantity
        let dispatchedQuantity = 0
        if (dispatchedItems && dispatchedItems.length > 0) {
          dispatchedQuantity = dispatchedItems.reduce(
            (sum, item) => sum + (item.quantity_available || 0),
            0
          )
        }

        // Current inventory = produced - dispatched
        const currentQuantity = Math.max(0, producedQuantity - dispatchedQuantity)

        inventoryItems.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku || "",
          quantity: currentQuantity,
          lastUpdated: new Date()
        })
      }

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
