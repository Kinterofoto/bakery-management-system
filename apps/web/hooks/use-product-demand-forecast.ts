"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export interface ProductDemandForecast {
  productId: string
  productName: string
  emaForecast: number
}

export function useProductDemandForecast() {
  const [forecast, setForecast] = useState<ProductDemandForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDemandForecast = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get all active PT products
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name")
        .eq("category", "PT")
        .eq("is_active", true)

      if (productsError) throw productsError

      if (!products || products.length === 0) {
        setForecast([])
        return
      }

      // Get EMA forecast for each product using RPC function
      const forecastData: ProductDemandForecast[] = []

      for (const product of products) {
        const { data: emaValue, error: rpcError } = await supabase
          .rpc("get_product_demand_ema", {
            p_product_id: product.id,
            p_weeks: 8,
            p_alpha: 0.3
          })

        if (rpcError) {
          console.warn(`Error getting EMA for product ${product.id}:`, rpcError)
          forecastData.push({
            productId: product.id,
            productName: product.name,
            emaForecast: 0
          })
        } else {
          forecastData.push({
            productId: product.id,
            productName: product.name,
            emaForecast: emaValue || 0
          })
        }
      }

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

  const refetch = useCallback(() => {
    fetchDemandForecast()
  }, [fetchDemandForecast])

  return {
    forecast,
    loading,
    error,
    getForecastByProductId,
    refetch
  }
}
