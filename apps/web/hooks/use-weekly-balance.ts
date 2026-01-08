"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { startOfWeek, addDays, format } from "date-fns"

export interface DailyBalance {
  dayIndex: number // 0=Sunday, 6=Saturday
  date: Date
  dayName: string
  openingBalance: number
  plannedProduction: number
  forecastDemand: number
  closingBalance: number
  isDeficit: boolean
}

export interface ProductWeeklyBalance {
  productId: string
  productName: string
  initialInventory: number
  dailyBalances: DailyBalance[]
  weekEndBalance: number
  hasAnyDeficit: boolean
}

export interface BalanceSummary {
  totalInitialInventory: number
  totalWeekEndBalance: number
  productsWithDeficit: number
  totalProducts: number
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

/**
 * Hook para calcular el balance semanal proyectado de productos terminados
 * Usa el inventario real del schema inventario.inventory_balances
 * y calcula: saldo = saldo_anterior + producción - forecast
 */
export function useWeeklyBalance(weekStartDate: Date) {
  const [balances, setBalances] = useState<ProductWeeklyBalance[]>([])
  const [summary, setSummary] = useState<BalanceSummary>({
    totalInitialInventory: 0,
    totalWeekEndBalance: 0,
    productsWithDeficit: 0,
    totalProducts: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Normalize week start to Sunday at 6am
  const normalizedWeekStart = useMemo(() => {
    const date = startOfWeek(weekStartDate, { weekStartsOn: 0 })
    date.setHours(6, 0, 0, 0)
    return date
  }, [weekStartDate])

  const fetchWeeklyBalance = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

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
        setBalances([])
        return
      }

      // Get inventory balances from the new inventory schema
      const productIds = products.map(p => p.id)
      const { data: inventoryData, error: invError } = await supabase
        .schema('inventario')
        .from('inventory_balances')
        .select('product_id, quantity_on_hand, location_id')
        .in('product_id', productIds)

      if (invError) {
        console.error('Error fetching inventory:', invError)
        // Continue with zero inventory if query fails
      }

      // Aggregate inventory by product (sum across all locations)
      const inventoryByProduct = new Map<string, number>()
      inventoryData?.forEach(inv => {
        const current = inventoryByProduct.get(inv.product_id) || 0
        inventoryByProduct.set(inv.product_id, current + (parseFloat(inv.quantity_on_hand) || 0))
      })

      // Get production schedules for this week
      const weekEndDate = addDays(normalizedWeekStart, 7)
      const { data: schedules, error: schedError } = await supabase
        .schema('produccion')
        .from('production_schedules')
        .select('product_id, quantity, start_date')
        .gte('start_date', format(normalizedWeekStart, 'yyyy-MM-dd'))
        .lt('start_date', format(weekEndDate, 'yyyy-MM-dd'))

      if (schedError) {
        console.error('Error fetching schedules:', schedError)
      }

      // Aggregate production by product and day
      const productionByProductDay = new Map<string, Map<number, number>>()
      schedules?.forEach(sched => {
        const schedDate = new Date(sched.start_date)
        const dayIndex = schedDate.getDay()

        if (!productionByProductDay.has(sched.product_id)) {
          productionByProductDay.set(sched.product_id, new Map())
        }

        const dayMap = productionByProductDay.get(sched.product_id)!
        dayMap.set(dayIndex, (dayMap.get(dayIndex) || 0) + (sched.quantity || 0))
      })

      // Get forecast for this week (try RPC first, fallback to manual)
      const weekStartStr = format(normalizedWeekStart, 'yyyy-MM-dd')
      let forecastByProduct = new Map<string, number[]>()

      try {
        const { data: forecastData, error: forecastError } = await supabase.rpc('get_weekly_forecast', {
          p_week_start_date: weekStartStr
        })

        if (!forecastError && forecastData) {
          forecastData.forEach((row: any) => {
            const dailyForecasts = [
              row.day_0_forecast || 0,
              row.day_1_forecast || 0,
              row.day_2_forecast || 0,
              row.day_3_forecast || 0,
              row.day_4_forecast || 0,
              row.day_5_forecast || 0,
              row.day_6_forecast || 0
            ]
            forecastByProduct.set(row.product_id, dailyForecasts)
          })
        }
      } catch (err) {
        // Silently fail and fallback to manual calculation
      }

      // If RPC failed or returned no data, use manual calculation
      if (forecastByProduct.size === 0) {
        forecastByProduct = await calculateForecastManually(products, normalizedWeekStart)
      }

      // Calculate balances for each product
      const balanceData: ProductWeeklyBalance[] = products.map((product: any) => {
        const initialInventory = inventoryByProduct.get(product.id) || 0
        const productProduction = productionByProductDay.get(product.id) || new Map()
        const productForecast = forecastByProduct.get(product.id) || Array(7).fill(0)

        const dailyBalances: DailyBalance[] = []
        let currentBalance = initialInventory
        let hasAnyDeficit = false

        for (let i = 0; i <= 6; i++) {
          const production = productProduction.get(i) || 0
          const forecast = productForecast[i] || 0
          const closingBalance = currentBalance + production - forecast
          const isDeficit = closingBalance < 0

          if (isDeficit) hasAnyDeficit = true

          dailyBalances.push({
            dayIndex: i,
            date: addDays(normalizedWeekStart, i),
            dayName: DAY_NAMES[i],
            openingBalance: currentBalance,
            plannedProduction: production,
            forecastDemand: forecast,
            closingBalance,
            isDeficit
          })

          currentBalance = closingBalance
        }

        return {
          productId: product.id,
          productName: product.name,
          initialInventory,
          dailyBalances,
          weekEndBalance: currentBalance,
          hasAnyDeficit
        }
      })

      setBalances(balanceData)

      // Calculate summary
      const totalInitial = balanceData.reduce((sum, b) => sum + b.initialInventory, 0)
      const totalEnd = balanceData.reduce((sum, b) => sum + b.weekEndBalance, 0)
      const withDeficit = balanceData.filter(b => b.hasAnyDeficit).length

      setSummary({
        totalInitialInventory: totalInitial,
        totalWeekEndBalance: totalEnd,
        productsWithDeficit: withDeficit,
        totalProducts: balanceData.length
      })
    } catch (err) {
      console.error("Error fetching weekly balance:", err)
      setError(err instanceof Error ? err.message : "Error fetching balance")
    } finally {
      setLoading(false)
    }
  }, [normalizedWeekStart])

  // Manual forecast calculation fallback
  const calculateForecastManually = async (
    products: any[],
    weekStart: Date
  ): Promise<Map<string, number[]>> => {
    const forecastMap = new Map<string, number[]>()

    // Get historical orders for last 8 weeks
    const eightWeeksAgo = addDays(weekStart, -56)
    const weekEnd = addDays(weekStart, 6)

    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        id,
        expected_delivery_date,
        status,
        order_items (product_id, quantity_requested, quantity_delivered)
      `)
      .not("status", "in", "(cancelled,returned)")
      .gte("expected_delivery_date", format(eightWeeksAgo, 'yyyy-MM-dd'))
      .lte("expected_delivery_date", format(weekEnd, 'yyyy-MM-dd'))

    if (error) {
      console.error('Error fetching orders for forecast:', error)
      return forecastMap
    }

    // Build historical data
    const historicalByProductDay = new Map<string, Map<number, number[]>>()
    const currentByProductDay = new Map<string, Map<number, number>>()

    orders?.forEach(order => {
      if (!order.expected_delivery_date) return
      const orderDate = new Date(order.expected_delivery_date)
      const dayOfWeek = orderDate.getDay()
      const isCurrentWeek = orderDate >= weekStart

      order.order_items?.forEach((item: any) => {
        const product = products.find(p => p.id === item.product_id)
        if (!product) return

        const unitsPerPackage = product.product_config?.[0]?.units_per_package || 1
        const quantity = (item.quantity_requested - (item.quantity_delivered || 0)) * unitsPerPackage

        if (isCurrentWeek) {
          // Current week orders
          if (!currentByProductDay.has(item.product_id)) {
            currentByProductDay.set(item.product_id, new Map())
          }
          const dayMap = currentByProductDay.get(item.product_id)!
          dayMap.set(dayOfWeek, (dayMap.get(dayOfWeek) || 0) + quantity)
        } else {
          // Historical data
          if (!historicalByProductDay.has(item.product_id)) {
            historicalByProductDay.set(item.product_id, new Map())
          }
          const dayMap = historicalByProductDay.get(item.product_id)!
          if (!dayMap.has(dayOfWeek)) {
            dayMap.set(dayOfWeek, [])
          }
          dayMap.get(dayOfWeek)!.push(quantity)
        }
      })
    })

    // Calculate forecast for each product
    products.forEach((product: any) => {
      const historical = historicalByProductDay.get(product.id) || new Map()
      const current = currentByProductDay.get(product.id) || new Map()
      const dailyForecasts: number[] = []

      for (let i = 0; i <= 6; i++) {
        const histValues = historical.get(i) || []
        const histAvg = histValues.length > 0
          ? Math.ceil(histValues.reduce((a, b) => a + b, 0) / histValues.length)
          : 0
        const currentOrders = current.get(i) || 0
        dailyForecasts.push(Math.max(histAvg, currentOrders))
      }

      forecastMap.set(product.id, dailyForecasts)
    })

    return forecastMap
  }

  // Initial fetch and subscriptions
  useEffect(() => {
    fetchWeeklyBalance()

    // Subscribe to schedule changes
    const schedulesChannel = supabase
      .channel("weekly-balance-schedules")
      .on(
        "postgres_changes",
        { event: "*", schema: "produccion", table: "production_schedules" },
        () => fetchWeeklyBalance()
      )
      .subscribe()

    // Subscribe to order changes
    const ordersChannel = supabase
      .channel("weekly-balance-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchWeeklyBalance()
      )
      .subscribe()

    // Subscribe to inventory changes
    const inventoryChannel = supabase
      .channel("weekly-balance-inventory")
      .on(
        "postgres_changes",
        { event: "*", schema: "inventario", table: "inventory_balances" },
        () => fetchWeeklyBalance()
      )
      .subscribe()

    return () => {
      schedulesChannel.unsubscribe()
      ordersChannel.unsubscribe()
      inventoryChannel.unsubscribe()
    }
  }, [fetchWeeklyBalance])

  // Helper to get balance for a specific product
  const getBalanceByProduct = useCallback((productId: string): ProductWeeklyBalance | undefined => {
    return balances.find(b => b.productId === productId)
  }, [balances])

  // Helper to get daily balance for a specific product and day
  const getDailyBalance = useCallback((productId: string, dayIndex: number): DailyBalance | undefined => {
    const product = balances.find(b => b.productId === productId)
    if (!product) return undefined
    return product.dailyBalances.find(d => d.dayIndex === dayIndex)
  }, [balances])

  // Helper to check if a product has deficit on a specific day
  const hasDeficitOnDay = useCallback((productId: string, dayIndex: number): boolean => {
    const daily = getDailyBalance(productId, dayIndex)
    return daily?.isDeficit || false
  }, [getDailyBalance])

  // Update production for a specific product and day (optimistic update)
  const updateProduction = useCallback((productId: string, dayIndex: number, quantity: number) => {
    setBalances(prev => {
      return prev.map(product => {
        if (product.productId !== productId) return product

        const newDailyBalances = [...product.dailyBalances]
        let currentBalance = product.initialInventory
        let hasAnyDeficit = false

        for (let i = 0; i <= 6; i++) {
          const day = newDailyBalances[i]
          const production = i === dayIndex ? quantity : day.plannedProduction
          const closingBalance = currentBalance + production - day.forecastDemand
          const isDeficit = closingBalance < 0

          if (isDeficit) hasAnyDeficit = true

          newDailyBalances[i] = {
            ...day,
            openingBalance: currentBalance,
            plannedProduction: production,
            closingBalance,
            isDeficit
          }

          currentBalance = closingBalance
        }

        return {
          ...product,
          dailyBalances: newDailyBalances,
          weekEndBalance: currentBalance,
          hasAnyDeficit
        }
      })
    })
  }, [])

  return {
    balances,
    summary,
    loading,
    error,
    weekStartDate: normalizedWeekStart,
    getBalanceByProduct,
    getDailyBalance,
    hasDeficitOnDay,
    updateProduction,
    refetch: fetchWeeklyBalance
  }
}
