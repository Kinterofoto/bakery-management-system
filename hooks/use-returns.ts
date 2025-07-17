"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type Return = Database["public"]["Tables"]["returns"]["Row"] & {
  order: Database["public"]["Tables"]["orders"]["Row"] & {
    client: Database["public"]["Tables"]["clients"]["Row"]
  }
  product: Database["public"]["Tables"]["products"]["Row"]
  route: Database["public"]["Tables"]["routes"]["Row"] | null
}

type ConsolidatedReturn = {
  product_id: string
  product_name: string
  total_quantity: number
  returns: Return[]
  status: "pending" | "accepted" | "rejected"
}

export function useReturns() {
  const [returns, setReturns] = useState<Return[]>([])
  const [consolidatedReturns, setConsolidatedReturns] = useState<ConsolidatedReturn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReturns = async (routeId?: string, date?: string) => {
    try {
      setLoading(true)
      
      // Consulta básica de returns
      let returnsQuery = supabase.from("returns").select("*")
      
      if (routeId) {
        returnsQuery = returnsQuery.eq("route_id", routeId)
      }
      
      if (date) {
        returnsQuery = returnsQuery.gte("return_date", `${date}T00:00:00`).lt("return_date", `${date}T23:59:59`)
      }
      
      const { data: returnsData, error: returnsError } = await returnsQuery.order("return_date", { ascending: false })
      
      console.log("Fetched returns data:", { returnsData, returnsError })
      
      if (returnsError) throw returnsError

      // Obtener datos relacionados por separado
      const [ordersData, productsData, routesData] = await Promise.all([
        supabase.from("orders").select("*, clients(*)"),
        supabase.from("products").select("*"),
        supabase.from("routes").select("*")
      ])

      // Combinar datos manualmente
      const enrichedReturns = returnsData?.map(returnItem => ({
        ...returnItem,
        order: ordersData.data?.find(order => order.id === returnItem.order_id) || null,
        product: productsData.data?.find(product => product.id === returnItem.product_id) || null,
        route: routesData.data?.find(route => route.id === returnItem.route_id) || null,
      })) || []

      setReturns(enrichedReturns as Return[])
      
      // Consolidar devoluciones por producto
      const consolidated = consolidateReturns(enrichedReturns as Return[])
      setConsolidatedReturns(consolidated)
      
      console.log("Returns processed:", { 
        totalReturns: enrichedReturns.length, 
        consolidatedGroups: consolidated.length 
      })
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching returns")
    } finally {
      setLoading(false)
    }
  }

  const consolidateReturns = (returnsData: Return[]): ConsolidatedReturn[] => {
    const grouped = returnsData.reduce((acc, returnItem) => {
      const productId = returnItem.product_id
      if (!acc[productId]) {
        acc[productId] = {
          product_id: productId,
          product_name: returnItem.product?.name || "Producto desconocido",
          total_quantity: 0,
          returns: [],
          status: "pending" as const
        }
      }
      
      acc[productId].total_quantity += returnItem.quantity_returned
      acc[productId].returns.push(returnItem)
      
      return acc
    }, {} as Record<string, ConsolidatedReturn>)

    return Object.values(grouped)
  }

  const getReturnsByRoute = (routeId?: string, date?: string) => {
    const filteredReturns = returns.filter((returnItem) => {
      const matchesRoute = !routeId || returnItem.route_id === routeId
      const matchesDate = !date || returnItem.return_date.startsWith(date)
      return matchesRoute && matchesDate
    })

    // Group by route
    const groupedByRoute = filteredReturns.reduce(
      (acc, returnItem) => {
        const routeKey = returnItem.route?.id || "no-route"
        if (!acc[routeKey]) {
          acc[routeKey] = {
            route: returnItem.route,
            returns: [],
            totalValue: 0,
            totalQuantity: 0,
          }
        }
        acc[routeKey].returns.push(returnItem)
        acc[routeKey].totalQuantity += returnItem.quantity_returned
        acc[routeKey].totalValue += returnItem.quantity_returned * (returnItem.product.price || 0)
        return acc
      },
      {} as Record<string, any>,
    )

    return Object.values(groupedByRoute)
  }

  useEffect(() => {
    fetchReturns()
  }, [])

  const createReturn = async (returnData: {
    order_id: string
    product_id: string
    quantity_returned: number
    return_reason: string
    route_id?: string
    rejection_reason?: string
  }) => {
    try {
      // Obtener usuario admin como procesador
      const { data: adminUser } = await supabase
        .from("users")
        .select("id")
        .eq("role", "admin")
        .limit(1)
        .single()

      const { data, error } = await supabase
        .from("returns")
        .insert({
          ...returnData,
          processed_by: adminUser?.id || null,
          return_date: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      await fetchReturns()
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating return")
      throw err
    }
  }

  const acceptReturn = async (productId: string) => {
    try {
      // Marcar todas las devoluciones de este producto como aceptadas
      const productReturns = returns.filter(r => r.product_id === productId)
      
      console.log(`Devolución aceptada para producto ${productId}`, productReturns)
      
      // En una implementación completa, aquí harías:
      // 1. Actualizar el stock
      // 2. Generar crédito al cliente
      // 3. Marcar como procesado
      
      // Refrescar datos
      await fetchReturns()
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error accepting return")
      throw err
    }
  }

  const updateReturn = async (returnId: string, updates: Partial<Return>) => {
    try {
      const { error } = await supabase
        .from("returns")
        .update(updates)
        .eq("id", returnId)

      if (error) throw error
      await fetchReturns()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating return")
      throw err
    }
  }

  return {
    returns,
    consolidatedReturns,
    loading,
    error,
    fetchReturns,
    getReturnsByRoute,
    createReturn,
    acceptReturn,
    updateReturn,
    refetch: fetchReturns,
  }
}
