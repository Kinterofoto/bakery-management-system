"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  client: Database["public"]["Tables"]["clients"]["Row"]
  order_items: (Database["public"]["Tables"]["order_items"]["Row"] & {
    product: Database["public"]["Tables"]["products"]["Row"]
  })[]
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          client:clients(*),
          order_items(
            *,
            product:products(*)
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching orders")
    } finally {
      setLoading(false)
    }
  }

  // Manual calculation function as fallback
  const calculateOrderTotalManually = async (
    orderId: string,
    items: { quantity_requested: number; unit_price: number }[],
  ) => {
    const total = items.reduce((sum, item) => sum + item.quantity_requested * item.unit_price, 0)

    const { error } = await supabase.from("orders").update({ total_value: total }).eq("id", orderId)

    if (error) {
      console.error("Error updating total manually:", error)
      throw error
    }

    return total
  }

  const createOrder = async (orderData: {
    client_id: string
    expected_delivery_date: string
    observations?: string
    items: {
      product_id: string
      quantity_requested: number
      unit_price: number
    }[]
  }) => {
    try {
      // Obtener el último número de pedido
      const { data: lastOrder } = await supabase
        .from("orders")
        .select("order_number")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()
      let nextOrderNumber = "000001"
      if (lastOrder && lastOrder.order_number) {
        const lastNum = parseInt(lastOrder.order_number, 10)
        if (!isNaN(lastNum)) {
          nextOrderNumber = (lastNum + 1).toString().padStart(6, "0")
        }
      }
      // Get current user (for now use admin user)
      const { data: adminUser } = await supabase.from("users").select("id").eq("role", "admin").limit(1).single()
      if (!adminUser) {
        throw new Error("No admin user found")
      }
      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: nextOrderNumber,
          client_id: orderData.client_id,
          expected_delivery_date: orderData.expected_delivery_date,
          observations: orderData.observations,
          status: "received",
          created_by: adminUser.id,
        })
        .select()
        .single()
      if (orderError) {
        console.error("Order creation error:", orderError)
        throw orderError
      }

      // Create order items
      const orderItems = orderData.items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity_requested: item.quantity_requested,
        unit_price: item.unit_price,
        availability_status: "pending" as const,
        quantity_available: 0,
        quantity_missing: item.quantity_requested,
        quantity_dispatched: 0,
        quantity_delivered: 0,
        quantity_returned: 0,
      }))

      console.log("Creating order items:", orderItems)

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems)

      if (itemsError) {
        console.error("Order items creation error:", itemsError)
        throw itemsError
      }

      // Calculate total - try database function first, fallback to manual calculation
      try {
        const { data, error: rpcError } = await supabase.rpc("calculate_order_total", {
          order_uuid: order.id,
        })

        if (rpcError) {
          console.warn("Database function failed, using manual calculation:", rpcError)
          await calculateOrderTotalManually(order.id, orderData.items)
        }
      } catch (rpcErr) {
        console.warn("RPC call failed, using manual calculation:", rpcErr)
        await calculateOrderTotalManually(order.id, orderData.items)
      }

      await fetchOrders()
      return order
    } catch (err) {
      console.error("Full error in createOrder:", err)
      setError(err instanceof Error ? err.message : "Error creating order")
      throw err
    }
  }

  const updateOrderStatus = async (orderId: string, status: Order["status"]) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", orderId)

      if (error) throw error
      await fetchOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating order status")
      throw err
    }
  }

  const updateItemAvailability = async (
    itemId: string,
    availability_status: "available" | "partial" | "unavailable",
    quantity_available: number,
  ) => {
    try {
      // Get the original item to calculate missing quantity correctly
      const { data: currentItem } = await supabase
        .from("order_items")
        .select("quantity_requested")
        .eq("id", itemId)
        .single()

      if (!currentItem) throw new Error("Item not found")

      const quantity_missing = Math.max(0, currentItem.quantity_requested - quantity_available)

      const { error } = await supabase
        .from("order_items")
        .update({
          availability_status,
          quantity_available,
          quantity_missing,
        })
        .eq("id", itemId)

      if (error) throw error
      await fetchOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating item availability")
      throw err
    }
  }

  const completeArea2Review = async (itemId: string, completed_quantity: number, notes?: string) => {
    try {
      const { error } = await supabase
        .from("order_items")
        .update({
          quantity_available: completed_quantity,
          quantity_missing: 0,
        })
        .eq("id", itemId)

      if (error) throw error
      await fetchOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error completing area 2 review")
      throw err
    }
  }

  const updateItemDispatched = async (
    itemId: string,
    quantity_dispatched: number,
  ) => {
    try {
      const { error } = await supabase
        .from("order_items")
        .update({ quantity_dispatched })
        .eq("id", itemId)

      if (error) throw error
      await fetchOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating dispatched quantity")
      throw err
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  // Filtrar pedidos reales por estado
  const readyOrders = orders.filter(order => order.status === "ready_dispatch")
  const dispatchedOrders = orders.filter(order => order.status === "dispatched")

  return {
    orders,
    loading,
    error,
    createOrder,
    updateOrderStatus,
    updateItemAvailability,
    completeArea2Review,
    updateItemDispatched,
    refetch: fetchOrders,
  }
}
