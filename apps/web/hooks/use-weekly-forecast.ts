"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { startOfWeek, addDays, format } from "date-fns"
import { es } from "date-fns/locale"

export interface DailyForecast {
  dayIndex: number // 0=Sunday, 6=Saturday
  date: Date
  dayName: string
  forecast: number // EMA weekly * daily distribution %
  distributionPercent: number // Historical % for this day
}

export interface ProductWeeklyForecast {
  productId: string
  productName: string
  dailyForecasts: DailyForecast[]
  weeklyTotal: number // EMA forecast
}

export interface ClientDemandBreakdown {
  clientId: string
  clientName: string
  orderId: string
  orderNumber: string
  quantityUnits: number
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// Calculate EMA (same as useProductDemandForecast)
function calculateEMA(values: number[], alpha: number = 0.3): number {
  if (values.length === 0) return 0
  let ema = values[0]
  for (let i = 1; i < values.length; i++) {
    ema = (alpha * values[i]) + ((1 - alpha) * ema)
  }
  return ema
}

// Get week key for grouping (Sunday as start for this view)
function getWeekKey(dateStr: string | Date): string {
  let date: Date
  if (typeof dateStr === 'string') {
    const [year, month, day] = dateStr.split('T')[0].split('-')
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  } else {
    date = new Date(dateStr)
  }

  // Get Sunday of the week
  const dayOfWeek = date.getDay()
  const weekStart = new Date(date)
  weekStart.setDate(date.getDate() - dayOfWeek)

  const year = weekStart.getFullYear()
  const month = String(weekStart.getMonth() + 1).padStart(2, '0')
  const day = String(weekStart.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Hook para obtener el forecast semanal usando EMA
 *
 * Lógica:
 * 1. Calcula EMA semanal (últimas 8 semanas) para cada producto
 * 2. Calcula distribución histórica por día de semana (% de cada día)
 * 3. Forecast diario = EMA semanal × % distribución del día
 */
export function useWeeklyForecast(weekStartDate: Date) {
  const [forecasts, setForecasts] = useState<ProductWeeklyForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Normalize week start to Sunday at 6am
  const normalizedWeekStart = useMemo(() => {
    const date = startOfWeek(weekStartDate, { weekStartsOn: 0 }) // Sunday
    date.setHours(6, 0, 0, 0)
    return date
  }, [weekStartDate])

  const fetchWeeklyForecast = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get all order items with pagination
      let allOrderItems: any[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: orderItems, error: orderError } = await supabase
          .from("order_items")
          .select("product_id, quantity_requested, quantity_delivered, quantity_returned, order_id")
          .not("order_id", "is", null)
          .range(from, from + pageSize - 1)

        if (orderError) throw orderError

        if (orderItems && orderItems.length > 0) {
          allOrderItems = [...allOrderItems, ...orderItems]
          from += pageSize
          hasMore = orderItems.length === pageSize
        } else {
          hasMore = false
        }
      }

      // Get ALL orders for historical demand
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, status, expected_delivery_date")
        .not("status", "in", "(cancelled,returned)")

      if (ordersError) throw ordersError

      // Get all active PT products with units_per_package
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
        setForecasts([])
        return
      }

      const orderMap = new Map(orders?.map(o => [o.id, o]) || [])

      // Calculate forecast for each product
      const forecastData: ProductWeeklyForecast[] = products.map((product: any) => {
        const unitsPerPackage = product.product_config?.[0]?.units_per_package || 1

        // Group demand by week AND by day of week
        const weeklyDemands = new Map<string, number>()
        const dailyDemands = new Map<number, number>() // dayOfWeek -> total demand
        const dailyCounts = new Map<number, number>() // dayOfWeek -> count of weeks with data

        // Initialize daily maps
        for (let i = 0; i < 7; i++) {
          dailyDemands.set(i, 0)
          dailyCounts.set(i, 0)
        }

        // Track which weeks have data for each day
        const weekDayData = new Map<string, Map<number, number>>() // weekKey -> (dayOfWeek -> demand)

        if (allOrderItems) {
          const productItems = allOrderItems.filter(item => item.product_id === product.id)

          productItems.forEach(item => {
            const order = orderMap.get(item.order_id)
            if (order && order.expected_delivery_date) {
              const demand = (item.quantity_requested || 0) * unitsPerPackage
              if (demand > 0) {
                const dateStr = order.expected_delivery_date.split('T')[0]
                const [year, month, day] = dateStr.split('-')
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
                const dayOfWeek = date.getDay()
                const weekKey = getWeekKey(order.expected_delivery_date)

                // Add to weekly totals
                weeklyDemands.set(weekKey, (weeklyDemands.get(weekKey) || 0) + demand)

                // Track daily demand per week
                if (!weekDayData.has(weekKey)) {
                  weekDayData.set(weekKey, new Map())
                }
                const weekData = weekDayData.get(weekKey)!
                weekData.set(dayOfWeek, (weekData.get(dayOfWeek) || 0) + demand)
              }
            }
          })
        }

        // Calculate daily totals and counts
        weekDayData.forEach((dayData, weekKey) => {
          dayData.forEach((demand, dayOfWeek) => {
            dailyDemands.set(dayOfWeek, (dailyDemands.get(dayOfWeek) || 0) + demand)
            dailyCounts.set(dayOfWeek, (dailyCounts.get(dayOfWeek) || 0) + 1)
          })
        })

        // Calculate EMA from weekly data (last 8 weeks)
        const allWeeks = Array.from(weeklyDemands.entries())
          .sort(([a], [b]) => a.localeCompare(b))

        const weeksForEMA = allWeeks.length > 1
          ? (allWeeks.length > 9 ? allWeeks.slice(-9, -1) : allWeeks.slice(0, -1))
          : allWeeks

        const weeklyValues = weeksForEMA.map(([_, demand]) => demand)
        const emaWeekly = calculateEMA(weeklyValues, 0.3)

        // Calculate daily distribution percentages
        const totalDailyDemand = Array.from(dailyDemands.values()).reduce((a, b) => a + b, 0)
        const dailyDistribution = new Map<number, number>()

        for (let i = 0; i < 7; i++) {
          const dayDemand = dailyDemands.get(i) || 0
          // If no historical data, distribute evenly (14.28% per day)
          const percent = totalDailyDemand > 0
            ? dayDemand / totalDailyDemand
            : 1 / 7
          dailyDistribution.set(i, percent)
        }

        // Build daily forecasts
        const dailyForecasts: DailyForecast[] = []
        for (let i = 0; i < 7; i++) {
          const percent = dailyDistribution.get(i) || (1 / 7)
          const dayForecast = Math.ceil(emaWeekly * percent)

          dailyForecasts.push({
            dayIndex: i,
            date: addDays(normalizedWeekStart, i),
            dayName: DAY_NAMES[i],
            forecast: dayForecast,
            distributionPercent: percent * 100
          })
        }

        return {
          productId: product.id,
          productName: product.name,
          dailyForecasts,
          weeklyTotal: Math.ceil(emaWeekly)
        }
      })

      setForecasts(forecastData)
    } catch (err) {
      console.error("Error fetching weekly forecast:", err)
      setError(err instanceof Error ? err.message : "Error fetching forecast")
    } finally {
      setLoading(false)
    }
  }, [normalizedWeekStart])

  // Fetch demand breakdown by client for a specific day and product
  const getDemandBreakdown = useCallback(async (
    productId: string,
    targetDate: Date
  ): Promise<ClientDemandBreakdown[]> => {
    try {
      const dateStr = format(targetDate, 'yyyy-MM-dd')

      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          client:clients(id, name),
          order_items!inner(
            product_id,
            quantity_requested,
            quantity_delivered
          )
        `)
        .eq("order_items.product_id", productId)
        .eq("expected_delivery_date", dateStr)
        .not("status", "in", "(cancelled,returned,delivered,partially_delivered)")

      if (error) {
        console.error("Error fetching breakdown:", error)
        return []
      }

      // Get units per package
      const { data: productConfig } = await supabase
        .from("product_config")
        .select("units_per_package")
        .eq("product_id", productId)
        .single()

      const unitsPerPackage = productConfig?.units_per_package || 1

      const breakdown: ClientDemandBreakdown[] = []
      orders?.forEach((order: any) => {
        order.order_items?.forEach((item: any) => {
          if (item.product_id === productId) {
            const quantity = (item.quantity_requested - (item.quantity_delivered || 0)) * unitsPerPackage
            if (quantity > 0) {
              breakdown.push({
                clientId: order.client?.id || '',
                clientName: order.client?.name || 'Sin cliente',
                orderId: order.id,
                orderNumber: order.order_number || '',
                quantityUnits: quantity
              })
            }
          }
        })
      })

      return breakdown
    } catch (err) {
      console.error("Error fetching demand breakdown:", err)
      return []
    }
  }, [])

  // Initial fetch and subscriptions
  useEffect(() => {
    fetchWeeklyForecast()

    const ordersChannel = supabase
      .channel("weekly-forecast-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchWeeklyForecast())
      .subscribe()

    const orderItemsChannel = supabase
      .channel("weekly-forecast-items")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => fetchWeeklyForecast())
      .subscribe()

    return () => {
      ordersChannel.unsubscribe()
      orderItemsChannel.unsubscribe()
    }
  }, [fetchWeeklyForecast])

  // Helpers
  const getForecastForDay = useCallback((productId: string, dayIndex: number): number => {
    const product = forecasts.find(f => f.productId === productId)
    if (!product) return 0
    const day = product.dailyForecasts.find(d => d.dayIndex === dayIndex)
    return day?.forecast || 0
  }, [forecasts])

  const getWeeklyTotal = useCallback((productId: string): number => {
    const product = forecasts.find(f => f.productId === productId)
    return product?.weeklyTotal || 0
  }, [forecasts])

  const grandTotal = useMemo(() => {
    return forecasts.reduce((sum, f) => sum + f.weeklyTotal, 0)
  }, [forecasts])

  return {
    forecasts,
    loading,
    error,
    weekStartDate: normalizedWeekStart,
    getForecastForDay,
    getWeeklyTotal,
    getDemandBreakdown,
    grandTotal,
    refetch: fetchWeeklyForecast
  }
}
