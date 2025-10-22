"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type ProductionRoute = Database["produccion"]["Tables"]["production_routes"]["Row"] & {
  work_center?: Database["produccion"]["Tables"]["work_centers"]["Row"] | null
  operation?: Database["produccion"]["Tables"]["operations"]["Row"] | null
}
type ProductionRouteInsert = Database["produccion"]["Tables"]["production_routes"]["Insert"]
type ProductionRouteUpdate = Database["produccion"]["Tables"]["production_routes"]["Update"]

export function useProductionRoutes() {
  const [routes, setRoutes] = useState<ProductionRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRoutes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .schema("produccion")
        .from("production_routes")
        .select(`
          *,
          work_center:work_centers(
            *,
            operation:operations(*)
          )
        `)
        .order("product_id")
        .order("sequence_order")

      if (error) throw error

      // Manual combination for operation
      const processedData = data?.map(route => ({
        ...route,
        operation: route.work_center?.operation || null
      })) || []

      setRoutes(processedData)
    } catch (err) {
      console.error("Error fetching production routes:", err)
      setError(err instanceof Error ? err.message : "Error fetching production routes")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRoutesByProduct = useCallback(async (productId: string) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .schema("produccion")
        .from("production_routes")
        .select(`
          *,
          work_center:work_centers(
            *,
            operation:operations(*)
          )
        `)
        .eq("product_id", productId)
        .order("sequence_order")

      if (error) throw error

      // Manual combination for operation
      const processedData = data?.map(route => ({
        ...route,
        operation: route.work_center?.operation || null
      })) || []

      return processedData
    } catch (err) {
      console.error("Error fetching product routes:", err)
      setError(err instanceof Error ? err.message : "Error fetching product routes")
      return []
    }
  }, [])

  const createRoute = useCallback(async (route: ProductionRouteInsert) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .schema("produccion")
        .from("production_routes")
        .insert(route)
        .select()
        .single()

      if (error) throw error

      setRoutes(prev => [...prev, data])
      return data
    } catch (err) {
      console.error("Error creating production route:", err)
      setError(err instanceof Error ? err.message : "Error creating production route")
      throw err
    }
  }, [])

  const updateRoute = useCallback(async (id: string, updates: ProductionRouteUpdate) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .schema("produccion")
        .from("production_routes")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      setRoutes(prev =>
        prev.map(route => route.id === id ? data : route)
      )
      return data
    } catch (err) {
      console.error("Error updating production route:", err)
      setError(err instanceof Error ? err.message : "Error updating production route")
      throw err
    }
  }, [])

  const deleteRoute = useCallback(async (id: string) => {
    try {
      setError(null)
      const { error } = await supabase
        .schema("produccion")
        .from("production_routes")
        .delete()
        .eq("id", id)

      if (error) throw error

      setRoutes(prev => prev.filter(route => route.id !== id))
    } catch (err) {
      console.error("Error deleting production route:", err)
      setError(err instanceof Error ? err.message : "Error deleting production route")
      throw err
    }
  }, [])

  const getRoutesByProduct = useCallback((productId: string) => {
    return routes.filter(route => route.product_id === productId)
  }, [routes])

  useEffect(() => {
    fetchRoutes()
  }, [fetchRoutes])

  return {
    routes,
    loading,
    error,
    createRoute,
    updateRoute,
    deleteRoute,
    getRoutesByProduct,
    fetchRoutesByProduct,
    refetch: fetchRoutes,
  }
}
