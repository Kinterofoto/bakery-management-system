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

type RouteGroupedReturn = {
  route_id: string | null
  route_name: string
  route: Database["public"]["Tables"]["routes"]["Row"] | null
  total_value: number
  total_quantity: number
  products: ProductGroupedReturn[]
}

type ProductGroupedReturn = {
  product_id: string
  product_name: string
  product_price: number
  total_quantity: number
  total_value: number
  orders: OrderReturn[]
  status: "pending" | "accepted" | "rejected"
}

type OrderReturn = {
  order_id: string
  order_number: string
  client_name: string
  quantity_returned: number
  return_reason: string
  rejection_reason?: string
  return_date: string
  value: number
}

export function useReturns() {
  const [returns, setReturns] = useState<Return[]>([])
  const [consolidatedReturns, setConsolidatedReturns] = useState<ConsolidatedReturn[]>([])
  const [routeGroupedReturns, setRouteGroupedReturns] = useState<RouteGroupedReturn[]>([])
  const [acceptedReturns, setAcceptedReturns] = useState<RouteGroupedReturn[]>([])
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
        supabase.from("orders").select("*, client:clients(*)"),
        supabase.from("products").select("*"),
        supabase.from("routes").select("*")
      ])

      // Combinar datos manualmente
      const enrichedReturns = returnsData?.map(returnItem => {
        const order = ordersData.data?.find(order => order.id === returnItem.order_id) || null
        const product = productsData.data?.find(product => product.id === returnItem.product_id) || null
        const route = routesData.data?.find(route => route.id === returnItem.route_id) || null
        
        // Debug: log para verificar la estructura del cliente
        if (order && returnItem.order_id) {
          console.log(`Order ${returnItem.order_id}:`, {
            order_number: order.order_number,
            client_data: order.client,
            client_name: order.client?.name
          })
        }
        
        return {
          ...returnItem,
          order: order,
          product: product,
          route: route,
        }
      }) || []

      setReturns(enrichedReturns as Return[])
      
      // Consolidar devoluciones por producto (legacy)
      const consolidated = consolidateReturns(enrichedReturns as Return[])
      setConsolidatedReturns(consolidated)
      
      // Separar por status real de la base de datos
      const pendingReturns = enrichedReturns.filter(r => r.status === "pending")
      const acceptedReturns = enrichedReturns.filter(r => r.status === "accepted")
      
      setRouteGroupedReturns(groupReturnsByRoute(pendingReturns as Return[]))
      setAcceptedReturns(groupReturnsByRoute(acceptedReturns as Return[]))
      
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

  const groupReturnsByRoute = (returnsData: Return[]): RouteGroupedReturn[] => {
    // Primero agrupamos por ruta
    const routeGroups = returnsData.reduce((acc, returnItem) => {
      const routeKey = returnItem.route_id || "no-route"
      
      if (!acc[routeKey]) {
        acc[routeKey] = {
          route_id: returnItem.route_id,
          route_name: returnItem.route?.route_name || "Sin ruta asignada",
          route: returnItem.route,
          total_value: 0,
          total_quantity: 0,
          products: {}
        }
      }
      
      // Dentro de cada ruta, agrupamos por producto
      const productKey = returnItem.product_id
      
      if (!acc[routeKey].products[productKey]) {
        acc[routeKey].products[productKey] = {
          product_id: returnItem.product_id,
          product_name: returnItem.product?.name || "Producto desconocido",
          product_price: returnItem.product?.price || 0,
          total_quantity: 0,
          total_value: 0,
          orders: [],
          status: returnItem.status || "pending" as const
        }
      }
      
      // Agregamos la orden individual
      const orderReturn: OrderReturn = {
        order_id: returnItem.order_id,
        order_number: returnItem.order?.order_number || "N/A",
        client_name: returnItem.order?.client?.name || "Cliente desconocido",
        quantity_returned: returnItem.quantity_returned,
        return_reason: returnItem.return_reason || "Sin motivo",
        rejection_reason: returnItem.rejection_reason || undefined,
        return_date: returnItem.return_date,
        value: returnItem.quantity_returned * (returnItem.product?.price || 0)
      }
      
      acc[routeKey].products[productKey].orders.push(orderReturn)
      acc[routeKey].products[productKey].total_quantity += returnItem.quantity_returned
      acc[routeKey].products[productKey].total_value += orderReturn.value
      
      // Actualizamos totales de la ruta
      acc[routeKey].total_quantity += returnItem.quantity_returned
      acc[routeKey].total_value += orderReturn.value
      
      return acc
    }, {} as Record<string, any>)
    
    // Convertimos a array y transformamos productos a array también
    return Object.values(routeGroups).map(routeGroup => ({
      ...routeGroup,
      products: Object.values(routeGroup.products) as ProductGroupedReturn[]
    }))
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

  const acceptReturn = async (routeId: string | null, productId: string) => {
    try {
      // Encontrar todas las devoluciones de este producto en esta ruta
      const productReturns = returns.filter(r => 
        r.product_id === productId && 
        (r.route_id === routeId || (!r.route_id && !routeId))
      )
      
      console.log(`Aceptando devolución para producto ${productId} en ruta ${routeId || 'sin ruta'}`, productReturns)
      
      if (productReturns.length === 0) {
        throw new Error("No se encontraron devoluciones para procesar")
      }

      // Actualizar el status en la base de datos para todas las devoluciones del producto en esta ruta
      const returnIds = productReturns.map(r => r.id)
      
      const { error: updateError } = await supabase
        .from('returns')
        .update({ 
          status: 'accepted',
          status_updated_at: new Date().toISOString()
        })
        .in('id', returnIds)

      if (updateError) {
        throw updateError
      }

      console.log(`✅ Status actualizado en BD para ${returnIds.length} devoluciones`)
      
      // Refrescar los datos para obtener el estado actualizado
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
    routeGroupedReturns,
    acceptedReturns,
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
