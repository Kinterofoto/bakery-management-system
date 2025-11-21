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

      // Get all pending orders directly from order_items
      const { data: orderItems, error: orderError } = await supabase
        .from("order_items")
        .select("product_id, quantity_requested, quantity_delivered")
        .not("order_id", "is", null)

      if (orderError) throw orderError

      // Get product names and units_per_package
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select(`
          id,
          name,
          product_config (units_per_package)
        `)
        .eq("category", "PT")
        .eq("is_active", true)

      if (productsError) throw productsError

      if (!products || products.length === 0) {
        setDemand([])
        return
      }

      // Calculate demand for each product
      const demandMap = new Map<string, number>()

      // Initialize all products with 0 demand
      products.forEach((p: any) => {
        demandMap.set(p.id, 0)
      })

      // Sum pending quantities per product (convert to units)
      if (orderItems) {
        orderItems.forEach(item => {
          const pending = (item.quantity_requested || 0) - (item.quantity_delivered || 0)
          if (pending > 0) {
            // Find product to get units_per_package
            const product = products.find((p: any) => p.id === item.product_id)
            const unitsPerPackage = product?.product_config?.[0]?.units_per_package || 1
            const pendingUnits = pending * unitsPerPackage

            demandMap.set(
              item.product_id,
              (demandMap.get(item.product_id) || 0) + pendingUnits
            )
          }
        })
      }

      // Build demand array
      const demandData: ProductDemand[] = products.map((p: any) => ({
        productId: p.id,
        productName: p.name,
        pendingOrders: demandMap.get(p.id) || 0
      }))

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
