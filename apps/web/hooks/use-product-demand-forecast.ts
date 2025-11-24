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

// Get week key for grouping orders by week (Monday as start)
function getWeekKey(dateStr: string | Date): string {
  let date: Date
  if (typeof dateStr === 'string') {
    // Parse date string as local date, not UTC
    const [year, month, day] = dateStr.split('T')[0].split('-')
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  } else {
    date = new Date(dateStr)
  }
  
  // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = date.getDay()
  // Convert to 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  
  const weekStart = new Date(date)
  weekStart.setDate(date.getDate() - daysSinceMonday)
  
  // Format as YYYY-MM-DD
  const year = weekStart.getFullYear()
  const month = String(weekStart.getMonth() + 1).padStart(2, '0')
  const day = String(weekStart.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
        .select("product_id, quantity_requested, quantity_delivered, quantity_returned, order_id")
        .not("order_id", "is", null)

      if (orderError) throw orderError

      // Get ALL orders (including completed/delivered) for historical demand forecast
      // We need full history to calculate meaningful EMA, not just pending orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, status, expected_delivery_date")
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
          const productsItems = orderItems.filter(item => item.product_id === product.id)
          
          productsItems.forEach(item => {
            const order = orderMap.get(item.order_id)
            if (order && order.expected_delivery_date) {
              // Calculate demand: requested - returned (ignoring cancelled since orders status is already filtered)
              const demand = ((item.quantity_requested || 0) - (item.quantity_returned || 0)) * unitsPerPackage
              // Only include items with positive demand
              if (demand > 0) {
                const weekKey = getWeekKey(order.expected_delivery_date)
                weeklyDemands.set(
                  weekKey,
                  (weeklyDemands.get(weekKey) || 0) + demand
                )
              }
            }
          })
        }

        // Get all weeks with data, sorted by date
        const allWeeksWithData = Array.from(weeklyDemands.entries())
          .sort(([a], [b]) => a.localeCompare(b))
        
        // If we have more than 8 weeks, take the last 8; otherwise take all
        const weeksToUse = allWeeksWithData.length > 8 
          ? allWeeksWithData.slice(-8)
          : allWeeksWithData
        
        const sortedWeeks = weeksToUse
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
