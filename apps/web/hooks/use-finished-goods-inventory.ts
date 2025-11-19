"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type Product = Database["public"]["Tables"]["products"]["Row"]

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

      // Get all products
      const { data: allProducts, error: productsError } = await supabase
        .from("products")
        .select("*")

      if (productsError) throw productsError

      if (!allProducts || allProducts.length === 0) {
        setInventory([])
        return
      }

      // Filter for finished goods (PT - Producto Terminado)
      const products = allProducts.filter((p: any) => p.category === "PT")

      if (products.length === 0) {
        setInventory([])
        return
      }

      // For now, create inventory items from products without detailed calculations
      // This is a placeholder that will be expanded once production schema queries work
      const inventoryItems: FinishedGoodsItem[] = products.map((product: any) => ({
        productId: product.id,
        productName: product.name,
        sku: product.sku || "",
        quantity: 0, // Placeholder - will be calculated from production data
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
