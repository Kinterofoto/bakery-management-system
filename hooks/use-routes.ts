"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"
import { useAuth } from "@/contexts/AuthContext"

type Route = Database["public"]["Tables"]["routes"]["Row"] & {
  vehicles?: Database["public"]["Tables"]["vehicles"]["Row"] | null
  route_orders?: (Database["public"]["Tables"]["route_orders"]["Row"] & {
    orders?: Database["public"]["Tables"]["orders"]["Row"] & {
      clients?: Database["public"]["Tables"]["clients"]["Row"]
      branches?: Database["public"]["Tables"]["branches"]["Row"]
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
  const { user } = useAuth()

  const fetchRoutes = async () => {
    try {
      setLoading(true)
      
      // Consulta manual por separado debido a problemas con foreign keys en Supabase
      // Excluir rutas completadas para evitar asignaciones adicionales
      const { data: basicRoutes, error: basicError } = await supabase
        .from("routes")
        .select("*")
        .neq("status", "completed")
        .order("route_number", { ascending: false })
        
      if (basicError) {
        throw basicError
      }
      
      // Obtener datos relacionados por separado
      // Nota: vehicles tabla podría no existir, manejamos el error
      const [routeOrdersData, ordersData, receivingSchedulesData] = await Promise.all([
        supabase.from("route_orders").select("*"),
        supabase.from("orders").select(`
          *,
          clients(*),
          branches(*),
          order_items(
            *,
            products(*)
          )
        `),
        supabase.from("receiving_schedules").select("*")
        // Note: For routes module, we should filter orders by status="dispatched"
        // But for dispatch module, we need to see "ready_dispatch" orders too
      ])
      
      // Intentar obtener vehicles, pero manejar si no existe
      let vehiclesData: { data: any[] | null, error: any } = { data: [], error: null }
      try {
        vehiclesData = await supabase.from("vehicles").select("*")
      } catch (vehicleErr) {
        console.warn("Tabla vehicles no existe, continuando sin información de vehículos")
      }
      
      // Función para obtener el horario de recibo basado en la fecha de entrega
      const getReceivingScheduleForOrder = (order: any) => {
        if (!order || !receivingSchedulesData.data) return null
        
        const deliveryDate = new Date(order.expected_delivery_date)
        const dayOfWeek = deliveryDate.getDay() // 0=Sunday, 6=Saturday
        
        // Buscar horario por sucursal primero, luego por cliente
        let schedule = null
        if (order.branch_id) {
          schedule = receivingSchedulesData.data.find((rs: any) => 
            rs.branch_id === order.branch_id && rs.day_of_week === dayOfWeek
          )
        }
        if (!schedule && order.client_id) {
          schedule = receivingSchedulesData.data.find((rs: any) => 
            rs.client_id === order.client_id && rs.day_of_week === dayOfWeek
          )
        }
        
        return schedule
      }

      // Combinar manualmente los datos
      const enrichedRoutes = basicRoutes?.map(route => {
        const routeOrders = routeOrdersData.data?.filter(ro => ro.route_id === route.id) || []
        const enrichedRouteOrders = routeOrders.map(ro => {
          const order = ordersData.data?.find(order => order.id === ro.order_id) || null
          const receivingSchedule = order ? getReceivingScheduleForOrder(order) : null
          
          return {
            ...ro,
            orders: order,
            receiving_schedule: receivingSchedule
          }
        })
        
        return {
          ...route,
          vehicles: vehiclesData.data?.find((v: any) => v.id === route.vehicle_id) || null,
          route_orders: enrichedRouteOrders
        }
      }) || []
      
      const data = enrichedRoutes
      const error = routeOrdersData.error || ordersData.error || receivingSchedulesData.error || (vehiclesData.error && !(vehiclesData.error as any)?.message?.includes("does not exist") ? vehiclesData.error : null)

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
      // Crear la ruta con vehicle_id incluido y capturar created_by
      const routeToInsert = {
        route_name: routeData.route_name,
        driver_id: routeData.driver_id,
        vehicle_id: routeData.vehicle_id || null,
        route_date: routeData.route_date,
        status: "planned" as const,
        created_by: user?.id || null,
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

      // Don't update order status here - let the handleCompleteDelivery function handle it
      // after all items are processed collectively
      console.log("Individual item delivery status updated successfully")

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

  const updateOrderStatusAfterDelivery = async (routeOrderId: string) => {
    try {
      console.log("Updating final order status after all items processed...")
      
      // First get the actual order_id and route_id from route_orders
      const { data: routeOrderData } = await supabase
        .from("route_orders")
        .select("order_id, route_id")
        .eq("id", routeOrderId)
        .single()

      if (routeOrderData?.order_id) {
        // Check if all items were delivered or if it's a partial delivery
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("quantity_requested, quantity_delivered, quantity_returned")
          .eq("order_id", routeOrderData.order_id)

        if (orderItems && orderItems.length > 0) {
          // Determine the appropriate status
          const totalRequested = orderItems.reduce((sum, item) => sum + (item.quantity_requested || 0), 0)
          const totalDelivered = orderItems.reduce((sum, item) => sum + (item.quantity_delivered || 0), 0)
          const totalReturned = orderItems.reduce((sum, item) => sum + (item.quantity_returned || 0), 0)

          console.log("Detailed order items:", orderItems.map((item, index) => ({
            index,
            quantity_requested: item.quantity_requested,
            quantity_delivered: item.quantity_delivered,
            quantity_returned: item.quantity_returned
          })))

          let newStatus: string
          if (totalReturned > 0 && totalDelivered === 0) {
            // Todo fue devuelto explícitamente
            newStatus = "returned"
          } else if (totalDelivered > 0 && totalDelivered < totalRequested) {
            // Se entregó algo, pero no todo lo solicitado (entrega parcial)
            newStatus = "partially_delivered"
          } else if (totalDelivered >= totalRequested) {
            // Se entregó todo lo solicitado (o más)
            newStatus = "delivered"
          } else {
            // Caso edge: nada entregado, nada devuelto - mantener como dispatched
            // Esto podría pasar si quantity_available era 0 y el conductor no hizo cambios
            newStatus = "dispatched"
          }

          console.log("Order delivery summary:", {
            orderId: routeOrderData.order_id,
            totalRequested,
            totalDelivered,
            totalReturned,
            newStatus,
            reasoning: totalDelivered === 0 && totalReturned > 0 ? "Nothing delivered, items returned" :
                      totalDelivered === 0 ? "Nothing delivered, no returns (error state?)" :
                      totalDelivered < totalRequested ? "Partial delivery" : "Full delivery"
          })

          const { error: orderUpdateError } = await supabase
            .from("orders")
            .update({ status: newStatus })
            .eq("id", routeOrderData.order_id)

          if (orderUpdateError) {
            console.error("Error updating order status:", orderUpdateError)
            throw orderUpdateError
          } else {
            console.log(`Order status updated to ${newStatus} successfully`)
          }
        }

        // After updating the order status, check if all orders in the route are completed
        // and update route status if needed
        if (routeOrderData.route_id) {
          await checkAndUpdateRouteCompletion(routeOrderData.route_id)
        }
      }
    } catch (err) {
      console.error("Error updating final order status:", err)
      throw err
    }
  }

  const checkAndUpdateRouteCompletion = async (routeId: string) => {
    try {
      console.log("Checking route completion for route:", routeId)
      
      // Get all orders in this route with their current status
      const { data: routeOrders } = await supabase
        .from("route_orders")
        .select(`
          id,
          order_id,
          orders (
            id,
            status,
            order_number
          )
        `)
        .eq("route_id", routeId)

      if (routeOrders && routeOrders.length > 0) {
        const orderStatuses = routeOrders.map(ro => (ro.orders as any)?.status).filter(Boolean)
        const completedStatuses = ['delivered', 'partially_delivered', 'returned']
        const allCompleted = orderStatuses.every(status => completedStatuses.includes(status))

        console.log("Route completion check:", {
          routeId,
          totalOrders: routeOrders.length,
          orderStatuses,
          allCompleted
        })

        if (allCompleted && orderStatuses.length > 0) {
          // All orders are completed, mark route as completed
          const { error: routeUpdateError } = await supabase
            .from("routes")
            .update({ status: "completed" })
            .eq("id", routeId)

          if (routeUpdateError) {
            console.error("Error updating route status to completed:", routeUpdateError)
          } else {
            console.log("Route marked as completed successfully")
          }
        }
      }
    } catch (err) {
      console.error("Error checking route completion:", err)
      // Don't throw - this shouldn't block the delivery process
    }
  }

  const getUnassignedOrders = async () => {
    try {
      // Get all orders with ready_dispatch status and no assigned route
      // Includes BOTH direct billed and remisioned orders
      const { data: allOrders, error } = await supabase
        .from("orders")
        .select(`
          *,
          clients(*),
          branches(*),
          order_items(
            *,
            products(*)
          )
        `)
        .eq("status", "ready_dispatch")
        .is("assigned_route_id", null)
        .order("created_at", { ascending: true })

      if (error) throw error

      if (!allOrders || allOrders.length === 0) {
        return []
      }

      console.log(`🔍 DEBUG: Found ${allOrders.length} ready_dispatch orders with no assigned route`)
      console.log('🔍 DEBUG: Orders details:', allOrders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        status: o.status,
        assigned_route_id: o.assigned_route_id,
        is_invoiced: o.is_invoiced,
        client_name: o.clients?.name
      })))
      
      return allOrders
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

  const removeOrderFromRoute = async (routeId: string, orderId: string) => {
    try {
      // Remove from route_orders table
      const { error: deleteError } = await supabase
        .from("route_orders")
        .delete()
        .eq("route_id", routeId)
        .eq("order_id", orderId)

      if (deleteError) throw deleteError

      // Update order to remove route assignment
      const { error: updateError } = await supabase
        .from("orders")
        .update({ assigned_route_id: null })
        .eq("id", orderId)

      if (updateError) throw updateError

      await fetchRoutes()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error removing order from route")
      throw err
    }
  }

  // Don't auto-fetch on hook initialization - let each component decide which fetch to use
  // useEffect(() => {
  //   fetchRoutes()
  // }, [])

  const fetchRoutesForDrivers = async (currentUserId?: string, userRole?: string) => {
    try {
      setLoading(true)
      
      // Similar to fetchRoutes but only include dispatched orders
      // Excluir rutas completadas para conductores también
      // If user is a driver, filter routes by driver_id
      let query = supabase
        .from("routes")
        .select("*")
        .neq("status", "completed")
        .order("route_number", { ascending: false })
      
      // Filter by driver if user is a driver
      if (userRole === 'driver' && currentUserId) {
        query = query.eq("driver_id", currentUserId)
      }
      
      const { data: basicRoutes, error: basicError } = await query
        
      if (basicError) {
        throw basicError
      }
      
      const [routeOrdersData, ordersData, receivingSchedulesData] = await Promise.all([
        supabase.from("route_orders").select("*"),
        supabase.from("orders").select(`
          *,
          clients(*),
          branches(*),
          order_items(
            *,
            products(*)
          )
        `).in("status", ["dispatched", "in_delivery", "delivered", "partially_delivered", "returned"]), // Orders relevant for drivers
        supabase.from("receiving_schedules").select("*")
      ])
      
      let vehiclesData: { data: any[] | null, error: any } = { data: [], error: null }
      try {
        vehiclesData = await supabase.from("vehicles").select("*")
      } catch (vehicleErr) {
        console.warn("Tabla vehicles no existe, continuando sin información de vehículos")
      }
      
      // Función para obtener el horario de recibo basado en la fecha de entrega
      const getReceivingScheduleForOrder = (order: any) => {
        if (!order || !receivingSchedulesData.data) return null
        
        const deliveryDate = new Date(order.expected_delivery_date)
        const dayOfWeek = deliveryDate.getDay() // 0=Sunday, 6=Saturday
        
        // Buscar horario por sucursal primero, luego por cliente
        let schedule = null
        if (order.branch_id) {
          schedule = receivingSchedulesData.data.find((rs: any) => 
            rs.branch_id === order.branch_id && rs.day_of_week === dayOfWeek
          )
        }
        if (!schedule && order.client_id) {
          schedule = receivingSchedulesData.data.find((rs: any) => 
            rs.client_id === order.client_id && rs.day_of_week === dayOfWeek
          )
        }
        
        return schedule
      }

      // Combinar manualmente los datos - incluir todos los route_orders de rutas activas
      const enrichedRoutes = basicRoutes?.map(route => {
        const routeOrders = routeOrdersData.data?.filter(ro => ro.route_id === route.id) || []
        const enrichedRouteOrders = routeOrders.map(ro => {
          const order = ordersData.data?.find(order => order.id === ro.order_id) || null
          const receivingSchedule = order ? getReceivingScheduleForOrder(order) : null
          
          return {
            ...ro,
            orders: order,
            receiving_schedule: receivingSchedule
          }
        }).filter(ro => ro.orders !== null) // Include all orders that exist
        
        return {
          ...route,
          vehicles: vehiclesData.data?.find((v: any) => v.id === route.vehicle_id) || null,
          route_orders: enrichedRouteOrders
        }
      }) || []
      
      console.log("fetchRoutesForDrivers - enriched routes:", enrichedRoutes)
      
      const data = enrichedRoutes
      const error = routeOrdersData.error || ordersData.error || receivingSchedulesData.error || (vehiclesData.error && !(vehiclesData.error as any)?.message?.includes("does not exist") ? vehiclesData.error : null)

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

  const getCompletedRoutes = async (currentUserId?: string, userRole?: string) => {
    try {
      // Obtener solo rutas completadas para historial
      // If user is a driver, filter routes by driver_id
      let query = supabase
        .from("routes")
        .select("*")
        .eq("status", "completed")
        .order("route_number", { ascending: false })
      
      // Filter by driver if user is a driver
      if (userRole === 'driver' && currentUserId) {
        query = query.eq("driver_id", currentUserId)
      }
      
      const { data: basicRoutes, error: basicError } = await query
        
      if (basicError) {
        throw basicError
      }
      
      // Get related data for completed routes
      const [routeOrdersData, ordersData] = await Promise.all([
        supabase.from("route_orders").select("*"),
        supabase.from("orders").select(`
          *,
          clients(*),
          branches(*),
          order_items(
            *,
            products(*)
          )
        `)
      ])
      
      let vehiclesData: { data: any[] | null, error: any } = { data: [], error: null }
      try {
        vehiclesData = await supabase.from("vehicles").select("*")
      } catch (vehicleErr) {
        console.warn("Tabla vehicles no existe, continuando sin información de vehículos")
      }
      
      // Combine data manually
      const enrichedRoutes = basicRoutes?.map(route => {
        const routeOrders = routeOrdersData.data?.filter(ro => ro.route_id === route.id) || []
        const enrichedRouteOrders = routeOrders.map(ro => ({
          ...ro,
          orders: ordersData.data?.find(order => order.id === ro.order_id) || null
        }))
        
        return {
          ...route,
          vehicles: vehiclesData.data?.find((v: any) => v.id === route.vehicle_id) || null,
          route_orders: enrichedRouteOrders
        }
      }) || []
      
      return enrichedRoutes
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching completed routes")
      throw err
    }
  }

  return {
    routes,
    loading,
    error,
    createRoute,
    assignOrderToRoute,
    assignMultipleOrdersToRoute,
    removeOrderFromRoute,
    getUnassignedOrders,
    updateDeliveryStatus,
    updateRouteStatus,
    updateOrderStatusAfterDelivery,
    getCompletedRoutes,
    refetch: fetchRoutes,
    refetchForDrivers: fetchRoutesForDrivers,
  }
}
