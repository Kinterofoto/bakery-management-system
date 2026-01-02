"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { startOfWeek, addDays, format } from "date-fns"
import { es } from "date-fns/locale"

export interface DailyForecast {
  dayIndex: number // 0=Sunday, 6=Saturday
  date: Date
  dayName: string
  historicalAverage: number
  currentOrders: number
  forecast: number // MAX(historicalAverage, currentOrders)
}

export interface ProductWeeklyForecast {
  productId: string
  productName: string
  dailyForecasts: DailyForecast[]
  weeklyTotal: number
}

export interface ClientDemandBreakdown {
  clientId: string
  clientName: string
  orderId: string
  orderNumber: string
  quantityUnits: number
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

/**
 * Hook para obtener el forecast semanal por día de la semana
 * Usa las funciones SQL de la base de datos para calcular:
 * - Promedio histórico por día de semana (últimas 8 semanas)
 * - Pedidos reales para cada día
 * - Forecast = MAX(historicalAverage, currentOrders)
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

      const weekStartStr = format(normalizedWeekStart, 'yyyy-MM-dd')

      // Use the RPC function to get weekly forecast
      const { data, error: rpcError } = await supabase.rpc('get_weekly_forecast', {
        p_week_start_date: weekStartStr
      })

      if (rpcError) {
        console.error('RPC error:', rpcError)
        // Fallback to manual calculation if RPC fails
        await fetchWeeklyForecastManual()
        return
      }

      if (!data || data.length === 0) {
        setForecasts([])
        return
      }

      // Transform RPC response to our format
      const forecastData: ProductWeeklyForecast[] = data.map((row: any) => {
        const dailyForecasts: DailyForecast[] = []

        for (let i = 0; i <= 6; i++) {
          const dayForecast = row[`day_${i}_forecast`] || 0
          dailyForecasts.push({
            dayIndex: i,
            date: addDays(normalizedWeekStart, i),
            dayName: DAY_NAMES[i],
            historicalAverage: dayForecast, // RPC returns already computed MAX
            currentOrders: 0, // Not exposed separately by RPC
            forecast: dayForecast
          })
        }

        return {
          productId: row.product_id,
          productName: row.product_name,
          dailyForecasts,
          weeklyTotal: row.weekly_total || 0
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

  // Manual fallback calculation if RPC is not available
  const fetchWeeklyForecastManual = async () => {
    try {
      // Get all PT products
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

      // Get historical orders for last 8 weeks
      const eightWeeksAgo = addDays(normalizedWeekStart, -56)
      const { data: historicalOrders, error: histError } = await supabase
        .from("orders")
        .select(`
          id,
          expected_delivery_date,
          status,
          order_items (
            product_id,
            quantity_requested,
            quantity_delivered
          )
        `)
        .not("status", "in", "(cancelled,returned)")
        .gte("expected_delivery_date", format(eightWeeksAgo, 'yyyy-MM-dd'))
        .lte("expected_delivery_date", format(addDays(normalizedWeekStart, 6), 'yyyy-MM-dd'))

      if (histError) throw histError

      // Build historical data by product and day of week
      const historicalByProductDay = new Map<string, Map<number, number[]>>()

      historicalOrders?.forEach(order => {
        if (!order.expected_delivery_date) return
        const orderDate = new Date(order.expected_delivery_date)
        const dayOfWeek = orderDate.getDay()
        const isCurrentWeek = orderDate >= normalizedWeekStart

        order.order_items?.forEach((item: any) => {
          const productConfig = products.find(p => p.id === item.product_id)
          const unitsPerPackage = (productConfig as any)?.product_config?.[0]?.units_per_package || 1
          const quantity = (item.quantity_requested - (item.quantity_delivered || 0)) * unitsPerPackage

          if (!historicalByProductDay.has(item.product_id)) {
            historicalByProductDay.set(item.product_id, new Map())
          }

          const productMap = historicalByProductDay.get(item.product_id)!
          if (!productMap.has(dayOfWeek)) {
            productMap.set(dayOfWeek, [])
          }

          // Historical data (past weeks)
          if (!isCurrentWeek) {
            productMap.get(dayOfWeek)!.push(quantity)
          }
        })
      })

      // Get current week orders
      const currentWeekOrders = historicalOrders?.filter(order => {
        if (!order.expected_delivery_date) return false
        const orderDate = new Date(order.expected_delivery_date)
        return orderDate >= normalizedWeekStart && orderDate <= addDays(normalizedWeekStart, 6)
      }) || []

      // Build current orders by product and day
      const currentByProductDay = new Map<string, Map<number, number>>()
      currentWeekOrders.forEach(order => {
        if (!order.expected_delivery_date) return
        const orderDate = new Date(order.expected_delivery_date)
        const dayOfWeek = orderDate.getDay()

        order.order_items?.forEach((item: any) => {
          const productConfig = products.find(p => p.id === item.product_id)
          const unitsPerPackage = (productConfig as any)?.product_config?.[0]?.units_per_package || 1
          const quantity = (item.quantity_requested - (item.quantity_delivered || 0)) * unitsPerPackage

          if (!currentByProductDay.has(item.product_id)) {
            currentByProductDay.set(item.product_id, new Map())
          }

          const productMap = currentByProductDay.get(item.product_id)!
          productMap.set(dayOfWeek, (productMap.get(dayOfWeek) || 0) + quantity)
        })
      })

      // Calculate forecasts
      const forecastData: ProductWeeklyForecast[] = products.map((product: any) => {
        const productHistorical = historicalByProductDay.get(product.id) || new Map()
        const productCurrent = currentByProductDay.get(product.id) || new Map()

        const dailyForecasts: DailyForecast[] = []
        let weeklyTotal = 0

        for (let i = 0; i <= 6; i++) {
          const historicalValues = productHistorical.get(i) || []
          const historicalAvg = historicalValues.length > 0
            ? Math.ceil(historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length)
            : 0
          const currentOrders = productCurrent.get(i) || 0
          const forecast = Math.max(historicalAvg, currentOrders)

          dailyForecasts.push({
            dayIndex: i,
            date: addDays(normalizedWeekStart, i),
            dayName: DAY_NAMES[i],
            historicalAverage: historicalAvg,
            currentOrders,
            forecast
          })

          weeklyTotal += forecast
        }

        return {
          productId: product.id,
          productName: product.name,
          dailyForecasts,
          weeklyTotal
        }
      })

      setForecasts(forecastData)
    } catch (err) {
      console.error("Error in manual forecast calculation:", err)
      throw err
    }
  }

  // Fetch demand breakdown by client for a specific day and product
  const getDemandBreakdown = useCallback(async (
    productId: string,
    targetDate: Date
  ): Promise<ClientDemandBreakdown[]> => {
    try {
      const dateStr = format(targetDate, 'yyyy-MM-dd')

      // Try RPC first
      const { data, error: rpcError } = await supabase.rpc('get_demand_breakdown_by_client', {
        p_product_id: productId,
        p_target_date: dateStr
      })

      if (rpcError) {
        console.error('RPC error for breakdown:', rpcError)
        // Fallback to manual query
        return await getDemandBreakdownManual(productId, targetDate)
      }

      return (data || []).map((row: any) => ({
        clientId: row.client_id,
        clientName: row.client_name,
        orderId: row.order_id,
        orderNumber: row.order_number,
        quantityUnits: row.quantity_units
      }))
    } catch (err) {
      console.error("Error fetching demand breakdown:", err)
      return []
    }
  }, [])

  // Manual fallback for demand breakdown
  const getDemandBreakdownManual = async (
    productId: string,
    targetDate: Date
  ): Promise<ClientDemandBreakdown[]> => {
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
      console.error("Error in manual breakdown:", error)
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
  }

  // Initial fetch and real-time subscriptions
  useEffect(() => {
    fetchWeeklyForecast()

    // Subscribe to order changes
    const ordersChannel = supabase
      .channel("weekly-forecast-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchWeeklyForecast()
      )
      .subscribe()

    const orderItemsChannel = supabase
      .channel("weekly-forecast-items")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => fetchWeeklyForecast()
      )
      .subscribe()

    return () => {
      ordersChannel.unsubscribe()
      orderItemsChannel.unsubscribe()
    }
  }, [fetchWeeklyForecast])

  // Helper to get forecast for a specific product and day
  const getForecastForDay = useCallback((productId: string, dayIndex: number): number => {
    const product = forecasts.find(f => f.productId === productId)
    if (!product) return 0
    const day = product.dailyForecasts.find(d => d.dayIndex === dayIndex)
    return day?.forecast || 0
  }, [forecasts])

  // Helper to get weekly total for a product
  const getWeeklyTotal = useCallback((productId: string): number => {
    const product = forecasts.find(f => f.productId === productId)
    return product?.weeklyTotal || 0
  }, [forecasts])

  // Get grand total across all products
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
