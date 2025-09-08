"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type Route = Database["public"]["Tables"]["routes"]["Row"] & {
  vehicles?: Database["public"]["Tables"]["vehicles"]["Row"] | null
  route_orders?: (Database["public"]["Tables"]["route_orders"]["Row"] & {
    orders?: Database["public"]["Tables"]["orders"]["Row"] & {
      clients?: Database["public"]["Tables"]["clients"]["Row"]
      order_items?: (Database["public"]["Tables"]["order_items"]["Row"] & {
        products?: Database["public"]["Tables"]["products"]["Row"]
        order_item_deliveries?: Database["public"]["Tables"]["order_item_deliveries"]["Row"][]
      })[]
    }
  })[]
}

export function useRoutes() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRoutes = async () => {
    try {
      setLoading(true)
      
      // Consulta manual por separado debido a problemas con foreign keys en Supabase
      const { data: basicRoutes, error: basicError } = await supabase
        .from("routes")
        .select("*")
        .order("created_at", { ascending: false })
        
      if (basicError) {
        throw basicError
      }
      
      // Obtener datos relacionados por separado
      // Nota: vehicles tabla podría no existir, manejamos el error
      const [routeOrdersData, ordersData] = await Promise.all([
        supabase.from("route_orders").select("*"),
        supabase.from("orders").select(`
          *,
          clients(*),
          order_items(
            *,
            products(*)
          )
        `)
        // Note: For routes module, we should filter orders by status="dispatched"
        // But for dispatch module, we need to see "ready_dispatch" orders too
      ])
      
      // Intentar obtener vehicles, pero manejar si no existe
      let vehiclesData = { data: [], error: null }
      try {
        vehiclesData = await supabase.from("vehicles").select("*")
      } catch (vehicleErr) {
        console.warn("Tabla vehicles no existe, continuando sin información de vehículos")
      }
      
      // Combinar manualmente los datos
      const enrichedRoutes = basicRoutes?.map(route => {
        const routeOrders = routeOrdersData.data?.filter(ro => ro.route_id === route.id) || []
        const enrichedRouteOrders = routeOrders.map(ro => ({
          ...ro,
          orders: ordersData.data?.find(order => order.id === ro.order_id) || null
        }))
        
        return {
          ...route,
          vehicles: vehiclesData.data?.find(v => v.id === route.vehicle_id) || null,
          route_orders: enrichedRouteOrders
        }
      }) || []
      
      const data = enrichedRoutes
      const error = routeOrdersData.error || ordersData.error || (vehiclesData.error && !(vehiclesData.error as any)?.message?.includes("does not exist") ? vehiclesData.error : null)

      if (error) {
        console.error("Error fetching route data:", error)
        setError(`Error cargando datos: ${error.message}`)
        setRoutes([])
      } else {
        setRoutes(data || [])
        setError(null)
      }
    } catch (err) {
      console.error("Fetch routes error:", err)
      setError(err instanceof Error ? err.message : "Error fetching routes")
    } finally {
      setLoading(false)
    }
  }

  const createRoute = async (routeData: {
    route_name: string
    driver_id: string
    vehicle_id?: string
    route_date: string
  }) => {
    try {
      // Crear la ruta con vehicle_id incluido
      const routeToInsert = {
        route_name: routeData.route_name,
        driver_id: routeData.driver_id,
        vehicle_id: routeData.vehicle_id || null,
        route_date: routeData.route_date,
        status: "planned" as const,
      }
      
      const { data, error } = await supabase
        .from("routes")
        .insert(routeToInsert)
        .select()
        .single()

      if (error) throw error
      await fetchRoutes()
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating route")
      throw err
    }
  }

  const assignOrderToRoute = async (routeId: string, orderId: string, sequence: number) => {
    try {
      if (!routeId || !orderId) {
        console.error("assignOrderToRoute: routeId u orderId inválido", { routeId, orderId })
        throw new Error("ID de ruta o pedido inválido. No se puede asignar la ruta.")
      }
      const { error: insertError } = await supabase.from("route_orders").insert({
        route_id: routeId,
        order_id: orderId,
        delivery_sequence: sequence,
      })
      if (insertError) throw insertError

      // Log antes del update
      console.log("Actualizando pedido:", orderId, "con ruta:", routeId)
      const updateBody = {
        assigned_route_id: routeId,
        // DO NOT change status here - it stays "ready_dispatch" until "Enviar a Ruta" from dispatch
      }
      console.log("Body del update:", updateBody)

      // Update order to assign route but keep status
      const { error: updateError } = await supabase
        .from("orders")
        .update(updateBody)
        .eq("id", orderId)
      if (updateError) {
        console.error("Error al actualizar el pedido:", updateError)
        throw updateError
      }

      await fetchRoutes()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error asignando pedido a la ruta")
      throw err
    }
  }

  const updateDeliveryStatus = async (
    routeOrderId: string,
    orderItemId: string,
    deliveryData: {
      delivery_status: "delivered" | "partial" | "rejected"
      quantity_delivered: number
      quantity_rejected?: number
      rejection_reason?: string
      evidence_url?: string
      delivery_notes?: string
    },
  ) => {
    try {
      console.log("UpdateDeliveryStatus called with:", { routeOrderId, orderItemId, deliveryData })
      
      // Try to update order_item_deliveries table if it exists
      try {
        // Check if delivery record already exists
        const { data: existingDelivery } = await supabase
          .from("order_item_deliveries")
          .select("id")
          .eq("route_order_id", routeOrderId)
          .eq("order_item_id", orderItemId)
          .single()

        let deliveryError = null
        if (existingDelivery) {
          // Update existing record
          const { error } = await supabase
            .from("order_item_deliveries")
            .update({
              ...deliveryData,
              delivered_at: new Date().toISOString(),
            })
            .eq("route_order_id", routeOrderId)
            .eq("order_item_id", orderItemId)
          deliveryError = error
        } else {
          // Create new record
          const { error } = await supabase.from("order_item_deliveries").insert({
            route_order_id: routeOrderId,
            order_item_id: orderItemId,
            ...deliveryData,
            delivered_at: new Date().toISOString(),
          })
          deliveryError = error
        }

        if (deliveryError) {
          console.error("Error in order_item_deliveries operation:", deliveryError)
          throw deliveryError
        }
      } catch (deliveryTableError: any) {
        console.warn("order_item_deliveries table not found, skipping detailed delivery tracking:", deliveryTableError)
        // Continue without detailed delivery tracking - just update order_items
      }

      // Update order_items quantities
      const { error: itemError } = await supabase
        .from("order_items")
        .update({
          quantity_delivered: deliveryData.quantity_delivered,
          quantity_returned: deliveryData.quantity_rejected || 0,
        })
        .eq("id", orderItemId)

      if (itemError) {
        console.error("Error in order_items update:", itemError)
        throw itemError
      }

      // Create return record if rejected
      if (deliveryData.quantity_rejected && deliveryData.quantity_rejected > 0) {
        console.log("Creating return record for rejected items")
        
        const { data: routeOrder, error: routeOrderError } = await supabase
          .from("route_orders")
          .select("order_id, route_id")
          .eq("id", routeOrderId)
          .single()

        if (routeOrderError) {
          console.error("Error fetching route order:", routeOrderError)
        }

        const { data: orderItem, error: orderItemError } = await supabase
          .from("order_items")
          .select("product_id")
          .eq("id", orderItemId)
          .single()

        if (orderItemError) {
          console.error("Error fetching order item:", orderItemError)
        }

        if (routeOrder && orderItem && routeOrder.order_id && orderItem.product_id) {
          // Try to get a real admin user for processed_by field, but don't fail if none exists
          let adminUserId = null
          try {
            const { data: adminUser } = await supabase
              .from("users")
              .select("id")
              .eq("role", "admin")
              .limit(1)
              .single()
            adminUserId = adminUser?.id
          } catch (adminError) {
            console.warn("No admin user found, proceeding without processed_by:", adminError)
          }

          // Prepare return data with proper field mapping and validation
          const returnReason = deliveryData.rejection_reason ? 
            deliveryData.rejection_reason.substring(0, 255) : 'Devolución'
          
          // Create minimal return data with only required fields first
          const baseReturnData = {
            order_id: routeOrder.order_id,
            product_id: orderItem.product_id,
            quantity_returned: Math.max(1, deliveryData.quantity_rejected || 1),
          }
          
          // Add optional fields only if they have valid values
          const returnData: any = { ...baseReturnData }
          
          if (routeOrder.route_id) {
            returnData.route_id = routeOrder.route_id
          }
          
          if (returnReason && returnReason.trim()) {
            returnData.return_reason = returnReason
          }
          
          if (deliveryData.rejection_reason && deliveryData.rejection_reason.trim()) {
            returnData.rejection_reason = deliveryData.rejection_reason
          }
          
          if (adminUserId) {
            returnData.processed_by = adminUserId
          }
          
          // Let return_date default to NOW() in database instead of setting explicitly
          
          console.log("Attempting to create return record with data:", returnData)
          
          const { error: returnError } = await supabase.from("returns").insert(returnData)
          
          if (returnError) {
            console.error("Error creating return record with full data:", {
              error: returnError,
              errorMessage: returnError?.message,
              errorDetails: returnError?.details,
              errorHint: returnError?.hint,
              errorCode: returnError?.code,
              data: returnData,
              routeOrder: routeOrder,
              orderItem: orderItem
            })
            
            // Try with minimal data as fallback
            console.log("Attempting fallback insert with minimal data...")
            const minimalReturnData = {
              order_id: routeOrder.order_id,
              product_id: orderItem.product_id,
              quantity_returned: Math.max(1, deliveryData.quantity_rejected || 1),
              return_reason: "Devolución de entrega"
            }
            
            const { error: fallbackError } = await supabase.from("returns").insert(minimalReturnData)
            
            if (fallbackError) {
              console.error("Fallback insert also failed:", {
                error: fallbackError,
                data: minimalReturnData
              })
            } else {
              console.log("Fallback return record created successfully")
            }
          } else {
            console.log("Return record created successfully")
          }
        }
      }

      // Update order status to 'delivered' after all items are processed
      console.log("Updating order status to delivered...")
      
      // First get the actual order_id from route_orders
      const { data: routeOrderData } = await supabase
        .from("route_orders")
        .select("order_id")
        .eq("id", routeOrderId)
        .single()

      if (routeOrderData?.order_id) {
        const { error: orderUpdateError } = await supabase
          .from("orders")
          .update({ status: "delivered" })
          .eq("id", routeOrderData.order_id)

        if (orderUpdateError) {
          console.error("Error updating order status:", orderUpdateError)
        } else {
          console.log("Order status updated to delivered successfully")
        }
      }

      await fetchRoutes()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating delivery status")
      throw err
    }
  }

  const updateRouteStatus = async (routeId: string, status: Route["status"]) => {
    try {
      const { error } = await supabase.from("routes").update({ status }).eq("id", routeId)

      if (error) throw error
      await fetchRoutes()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating route status")
      throw err
    }
  }

  const getUnassignedOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          clients(*),
          order_items(
            *,
            products(*)
          )
        `)
        .eq("status", "ready_dispatch")
        .is("assigned_route_id", null)
        .order("created_at", { ascending: true })

      if (error) throw error
      return data || []
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching unassigned orders")
      throw err
    }
  }

  const assignMultipleOrdersToRoute = async (routeId: string, orderIds: string[]) => {
    try {
      // Insert route_orders for each order with sequence
      const routeOrdersData = orderIds.map((orderId, index) => ({
        route_id: routeId,
        order_id: orderId,
        delivery_sequence: index + 1,
      }))

      const { error: insertError } = await supabase
        .from("route_orders")
        .insert(routeOrdersData)

      if (insertError) throw insertError

      // Update orders to assign them to the route but keep status as ready_dispatch
      // They will only change to "dispatched" when "Enviar a Ruta" is clicked from dispatch
      const { error: updateError } = await supabase
        .from("orders")
        .update({ assigned_route_id: routeId })
        .in("id", orderIds)

      if (updateError) throw updateError

      await fetchRoutes()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error assigning orders to route")
      throw err
    }
  }

  // Don't auto-fetch on hook initialization - let each component decide which fetch to use
  // useEffect(() => {
  //   fetchRoutes()
  // }, [])

  const fetchRoutesForDrivers = async () => {
    try {
      setLoading(true)
      
      // Similar to fetchRoutes but only include dispatched orders
      const { data: basicRoutes, error: basicError } = await supabase
        .from("routes")
        .select("*")
        .order("created_at", { ascending: false })
        
      if (basicError) {
        throw basicError
      }
      
      const [routeOrdersData, ordersData] = await Promise.all([
        supabase.from("route_orders").select("*"),
        supabase.from("orders").select(`
          *,
          clients(*),
          order_items(
            *,
            products(*)
          )
        `).eq("status", "dispatched") // Only dispatched orders for drivers
      ])
      
      let vehiclesData = { data: [], error: null }
      try {
        vehiclesData = await supabase.from("vehicles").select("*")
      } catch (vehicleErr) {
        console.warn("Tabla vehicles no existe, continuando sin información de vehículos")
      }
      
      // Combinar manualmente los datos - solo incluir route_orders que tienen orders "dispatched"
      const enrichedRoutes = basicRoutes?.map(route => {
        const routeOrders = routeOrdersData.data?.filter(ro => ro.route_id === route.id) || []
        const enrichedRouteOrders = routeOrders.map(ro => ({
          ...ro,
          orders: ordersData.data?.find(order => order.id === ro.order_id) || null
        })).filter(ro => ro.orders !== null) // Only include route_orders that have matching dispatched orders
        
        return {
          ...route,
          vehicles: vehiclesData.data?.find(v => v.id === route.vehicle_id) || null,
          route_orders: enrichedRouteOrders
        }
      }) || []
      
      console.log("fetchRoutesForDrivers - enriched routes:", enrichedRoutes)
      
      const data = enrichedRoutes
      const error = routeOrdersData.error || ordersData.error || (vehiclesData.error && !(vehiclesData.error as any)?.message?.includes("does not exist") ? vehiclesData.error : null)

      if (error) {
        console.error("Error fetching route data:", error)
        setError(`Error cargando datos: ${error.message}`)
        setRoutes([])
      } else {
        setRoutes(data || [])
        setError(null)
      }
    } catch (err) {
      console.error("Fetch routes error:", err)
      setError(err instanceof Error ? err.message : "Error fetching routes")
    } finally {
      setLoading(false)
    }
  }

  return {
    routes,
    loading,
    error,
    createRoute,
    assignOrderToRoute,
    assignMultipleOrdersToRoute,
    getUnassignedOrders,
    updateDeliveryStatus,
    updateRouteStatus,
    refetch: fetchRoutes,
    refetchForDrivers: fetchRoutesForDrivers,
  }
}
