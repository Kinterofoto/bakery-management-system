"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export interface WeeklyDemandData {
  weekStart: string
  demand: number
}

export interface ProductDemandForecast {
  productId: string
  productName: string
  emaForecast: number
  weeklyData?: WeeklyDemandData[]
}

// Calculate EMA in memory without RPC calls
function calculateEMA(weeklyDemands: number[], alpha: number = 0.3): number {
  if (weeklyDemands.length === 0) return 0

  let ema = weeklyDemands[0]
  for (let i = 1; i < weeklyDemands.length; i++) {
    ema = (alpha * weeklyDemands[i]) + ((1 - alpha) * ema)
  }
  return ema
}

// Get week key for grouping orders by week
function getWeekKey(date: Date): string {
  const d = new Date(date)
  const weekStart = new Date(d)
  weekStart.setDate(d.getDate() - d.getDay())
  return weekStart.toISOString().split('T')[0]
}

export function useProductDemandForecast() {
  const [forecast, setForecast] = useState<ProductDemandForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDemandForecast = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get all order items with product and order info
      const { data: orderItems, error: orderError } = await supabase
        .from("order_items")
        .select("product_id, quantity_requested, quantity_delivered, order_id")
        .not("order_id", "is", null)

      if (orderError) throw orderError

      // Get ALL orders (including completed/delivered) for historical demand forecast
      // We need full history to calculate meaningful EMA, not just pending orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, status, created_at")
        .not("status", "in", "(cancelled,returned)")

      if (ordersError) throw ordersError

      // Get all active PT products with their units_per_package
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
        setForecast([])
        return
      }

      // Create order lookup for fast access
      const orderMap = new Map(orders?.map(o => [o.id, o]) || [])

      // Calculate EMA for each product
      const forecastData: ProductDemandForecast[] = products.map((product: any) => {
        // Get units_per_package for this product
        const unitsPerPackage = product.product_config?.[0]?.units_per_package || 1

        // Group demand by week for this product
        const weeklyDemands = new Map<string, number>()

        if (orderItems) {
          orderItems
            .filter(item => item.product_id === product.id)
            .forEach(item => {
              const order = orderMap.get(item.order_id)
              if (order) {
                const weekKey = getWeekKey(new Date(order.created_at))
                // Convert packages to units by multiplying with units_per_package
                const demand = ((item.quantity_requested || 0) - (item.quantity_delivered || 0)) * unitsPerPackage
                weeklyDemands.set(
                  weekKey,
                  (weeklyDemands.get(weekKey) || 0) + Math.max(0, demand)
                )
              }
            })
        }

        // Get last 8 weeks of data
        const sortedWeeks = Array.from(weeklyDemands.entries())
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, 8)
          .reverse()

        const demands = sortedWeeks.map(([_, demand]) => demand)
        const ema = calculateEMA(demands, 0.3)

        // Store weekly data for modal use
        const weeklyData: WeeklyDemandData[] = sortedWeeks.map(([weekStart, demand]) => ({
          weekStart,
          demand: Math.ceil(demand)
        }))

        return {
          productId: product.id,
          productName: product.name,
          emaForecast: ema,
          weeklyData
        }
      })

      setForecast(forecastData)
    } catch (err) {
      console.error("Error fetching demand forecast:", err)
      setError(err instanceof Error ? err.message : "Error fetching forecast")
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchDemandForecast()

    // Subscribe to order changes to refresh forecast
    const ordersChannel = supabase
      .channel("demand-forecast-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders"
        },
        () => {
          fetchDemandForecast()
        }
      )
      .subscribe()

    // Subscribe to order items changes
    const orderItemsChannel = supabase
      .channel("demand-forecast-order-items")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items"
        },
        () => {
          fetchDemandForecast()
        }
      )
      .subscribe()

    return () => {
      ordersChannel.unsubscribe()
      orderItemsChannel.unsubscribe()
    }
  }, [fetchDemandForecast])

  const getForecastByProductId = useCallback((productId: string) => {
    const forecastItem = forecast.find(f => f.productId === productId)
    return forecastItem?.emaForecast || 0
  }, [forecast])

  const getWeeklyDataByProductId = useCallback((productId: string) => {
    const forecastItem = forecast.find(f => f.productId === productId)
    return forecastItem?.weeklyData || []
  }, [forecast])

  const refetch = useCallback(() => {
    fetchDemandForecast()
  }, [fetchDemandForecast])

  return {
    forecast,
    loading,
    error,
    getForecastByProductId,
    getWeeklyDataByProductId,
    refetch
  }
}
