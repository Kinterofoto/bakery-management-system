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

      // Get all pending orders directly from order_items (join with orders to filter by status)
      // Fetch ALL order items using pagination to bypass Supabase's 1000 row limit
      let orderItems: any[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from("order_items")
          .select("product_id, quantity_requested, quantity_delivered, order_id")
          .not("order_id", "is", null)
          .range(from, from + pageSize - 1)

        if (error) throw error

        if (data && data.length > 0) {
          orderItems = [...orderItems, ...data]
          from += pageSize
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
      }

      console.log("Total Order Items fetched:", orderItems?.length)

      // Get ALL orders first to debug what statuses exist
      const { data: allOrders, error: allOrdersError } = await supabase
        .from("orders")
        .select("id, status, order_number")

      if (allOrdersError) throw allOrdersError

      console.log("🔍 All order statuses:", [...new Set((allOrders as any)?.map((o: any) => o.status))])

      // Debug: Find Almojábana orders (000527 and 000839)
      const almojabanaOrders = (allOrders as any)?.filter((o: any) =>
        o.order_number === '000527' || o.order_number === '000839'
      )
      console.log("🔍 Almojábana orders (000527, 000839):", almojabanaOrders)

      // Get orders to filter by status (only active pending orders - same as DemandBreakdownModal)
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, status")
        .not("client_id", "is", null)
        .in("status", ["received", "review_area1", "review_area2", "ready_dispatch", "dispatched", "in_delivery"])

      if (ordersError) throw ordersError

      // Create a set of valid order IDs (only active pending orders)
      const validOrderIds = new Set(
        (orders as any)?.map((o: any) => o.id) || []
      )
      console.log("Valid Order IDs:", validOrderIds.size, "out of", allOrders?.length || 0, "total orders")
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

      // Get product config separately to ensure we get units_per_package
      const { data: productConfigs, error: configError } = await supabase
        .from("product_config")
        .select("product_id, units_per_package")

      if (configError) throw configError

      // Create a map for quick lookup of units_per_package
      const configMap = new Map(
        (productConfigs as any)?.map((pc: any) => [pc.product_id, pc.units_per_package]) || []
      )
      console.log("Product Configs:", productConfigs)
      console.log("Config Map:", Array.from(configMap.entries()))

      // Calculate demand for each product
      const demandMap = new Map<string, number>()

      // Initialize all products with 0 demand
      products.forEach((p: any) => {
        demandMap.set(p.id, 0)
      })

      // Debug: Check specifically for Almojábana items
      const almojabanaItems = (orderItems as any)?.filter((item: any) =>
        item.product_id === '00007972-0000-4000-8000-000079720000'
      )
      console.log(`🔍 Found ${almojabanaItems?.length || 0} Almojábana items in order_items:`, almojabanaItems)

      // Get the actual orders for these items
      const almojabanaOrderIds = almojabanaItems?.map((item: any) => item.order_id) || []
      const almojabanaOrdersDetails = (allOrders as any)?.filter((o: any) =>
        almojabanaOrderIds.includes(o.id)
      )
      console.log(`🔍 Almojábana orders details:`, almojabanaOrdersDetails)

      // Sum pending quantities per product (convert to units)
      if (orderItems) {
        orderItems.forEach((item: any) => {
          // Debug Almojábana specifically
          const isAlmojabana = item.product_id === '00007972-0000-4000-8000-000079720000'

          // Only include items from valid orders
          if (!validOrderIds.has(item.order_id)) {
            if (isAlmojabana) {
              console.log(`⚠️ ALMOJÁBANA item from order ${item.order_id} - NOT in valid orders list`)
            }
            return
          }

          const pending = (item.quantity_requested || 0) - (item.quantity_delivered || 0)

          if (isAlmojabana) {
            console.log(`🔍 ALMOJÁBANA: order_id=${item.order_id}, requested=${item.quantity_requested}, delivered=${item.quantity_delivered}, pending=${pending}`)
          }

          if (pending > 0) {
            // Get units_per_package from configMap
            const unitsPerPackage = configMap.get(item.product_id) || 1
            const pendingUnits = pending * (unitsPerPackage as number)

            if (isAlmojabana) {
              console.log(`✅ ALMOJÁBANA: Adding ${pendingUnits} units (${pending} packages × ${unitsPerPackage})`)
            }

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

      console.log("Final Demand Data:", demandData)
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
