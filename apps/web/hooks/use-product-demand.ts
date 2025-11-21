"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export interface ProductDemand {
  productId: string
  productName: string
  pendingOrders: number
}

export function useProductDemand() {
  const [demand, setDemand] = useState<ProductDemand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProductDemand = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get all products with pending orders
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name")
        .eq("category", "PT")
        .eq("is_active", true)

      if (productsError) throw productsError

      if (!products || products.length === 0) {
        setDemand([])
        return
      }

      // For each product, get pending orders using the RPC function
      const demandData: ProductDemand[] = []

      for (const product of products) {
        const { data, error: rpcError } = await supabase
          .rpc("get_product_pending_orders", { p_product_id: product.id })

        if (rpcError) {
          console.error(`Error getting demand for product ${product.id}:`, rpcError)
          demandData.push({
            productId: product.id,
            productName: product.name,
            pendingOrders: 0
          })
        } else {
          demandData.push({
            productId: product.id,
            productName: product.name,
            pendingOrders: data || 0
          })
        }
      }

      setDemand(demandData)
    } catch (err) {
      console.error("Error fetching product demand:", err)
      setError(err instanceof Error ? err.message : "Error fetching demand")
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchProductDemand()

    // Subscribe to order changes
    const ordersChannel = supabase
      .channel("product-demand-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders"
        },
        () => {
          fetchProductDemand()
        }
      )
      .subscribe()

    // Subscribe to order items changes
    const orderItemsChannel = supabase
      .channel("product-demand-order-items")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items"
        },
        () => {
          fetchProductDemand()
        }
      )
      .subscribe()

    // Subscribe to delivery changes
    const deliveriesChannel = supabase
      .channel("product-demand-deliveries")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_item_deliveries"
        },
        () => {
          fetchProductDemand()
        }
      )
      .subscribe()

    return () => {
      ordersChannel.unsubscribe()
      orderItemsChannel.unsubscribe()
      deliveriesChannel.unsubscribe()
    }
  }, [fetchProductDemand])

  const getDemandByProductId = useCallback((productId: string) => {
    const demandItem = demand.find(d => d.productId === productId)
    return demandItem?.pendingOrders || 0
  }, [demand])

  const refetch = useCallback(() => {
    fetchProductDemand()
  }, [fetchProductDemand])

  return {
    demand,
    loading,
    error,
    getDemandByProductId,
    refetch
  }
}
