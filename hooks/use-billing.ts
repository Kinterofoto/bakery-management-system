"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"
import { useToast } from "@/hooks/use-toast"

type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  client: Database["public"]["Tables"]["clients"]["Row"]
  branch?: Database["public"]["Tables"]["branches"]["Row"]
  order_items: (Database["public"]["Tables"]["order_items"]["Row"] & {
    product: Database["public"]["Tables"]["products"]["Row"]
  })[]
}

export function useBilling() {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([])
  const [selectedOrders, setSelectedOrders] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [isBilling, setIsBilling] = useState(false)
  const { toast } = useToast()

  // Fetch orders ready for billing (status = ready_dispatch)
  const fetchPendingOrders = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          client:clients(*),
          branch:branches(*),
          order_items(
            *,
            product:products(*)
          )
        `)
        .eq("status", "ready_dispatch")
        .eq("is_invoiced", false)
        .order("created_at", { ascending: false })

      if (error) throw error

      setPendingOrders(data || [])
    } catch (err) {
      console.error("Error fetching pending orders:", err)
      toast({
        title: "Error",
        description: "No se pudieron cargar los pedidos pendientes",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Toggle order selection
  const toggleOrderSelection = useCallback((orderId: string) => {
    setSelectedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }))
  }, [])

  // Select all orders
  const selectAllOrders = useCallback(() => {
    const allSelected = pendingOrders.every(order => selectedOrders[order.id])

    if (allSelected) {
      // Deselect all
      setSelectedOrders({})
    } else {
      // Select all
      const newSelection: Record<string, boolean> = {}
      pendingOrders.forEach(order => {
        newSelection[order.id] = true
      })
      setSelectedOrders(newSelection)
    }
  }, [pendingOrders, selectedOrders])

  // Get selected order count
  const getSelectedOrderCount = useCallback(() => {
    return Object.values(selectedOrders).filter(Boolean).length
  }, [selectedOrders])

  // Get selected orders data
  const getSelectedOrdersData = useCallback(() => {
    return pendingOrders.filter(order => selectedOrders[order.id])
  }, [pendingOrders, selectedOrders])

  // Generate billing summary
  const generateBillingSummary = useCallback(() => {
    const selectedOrdersData = getSelectedOrdersData()

    const directBillingOrders = selectedOrdersData.filter(
      order => order.client?.billing_type === 'facturable' || !order.requires_remision
    )

    const remisionOrders = selectedOrdersData.filter(
      order => order.client?.billing_type === 'remision' || order.requires_remision
    )

    const totalDirectBilling = directBillingOrders.reduce(
      (sum, order) => sum + (order.total_value || 0),
      0
    )

    const totalRemisions = remisionOrders.reduce(
      (sum, order) => sum + (order.total_value || 0),
      0
    )

    return {
      totalOrders: selectedOrdersData.length,
      directBillingOrders,
      remisionOrders,
      totalDirectBilling,
      totalRemisions,
      totalAmount: totalDirectBilling + totalRemisions,
      orderNumbers: selectedOrdersData.map(o => o.order_number)
    }
  }, [getSelectedOrdersData])

  // Bill selected orders
  const billSelectedOrders = useCallback(async (user: any) => {
    try {
      setIsBilling(true)
      const summary = generateBillingSummary()

      if (summary.totalOrders === 0) {
        toast({
          title: "Sin selección",
          description: "No hay pedidos seleccionados para facturar",
          variant: "destructive"
        })
        return
      }

      // Process direct billing orders
      if (summary.directBillingOrders.length > 0) {
        const orderIds = summary.directBillingOrders.map(o => o.id)

        const { error } = await supabase
          .from("orders")
          .update({
            is_invoiced: true,
            invoiced_at: new Date().toISOString()
          })
          .in("id", orderIds)

        if (error) throw error
      }

      // Process remision orders (create remisions)
      if (summary.remisionOrders.length > 0) {
        for (const order of summary.remisionOrders) {
          // Get next remision number
          const { data: configData } = await supabase
            .from("system_config")
            .select("config_value")
            .eq("config_key", "remision_number_current")
            .single()

          const remisionNumber = `REM-${String(parseInt(configData?.config_value || "1")).padStart(6, "0")}`

          // Create remision
          const { error: remisionError } = await supabase
            .from("remisions")
            .insert({
              order_id: order.id,
              remision_number: remisionNumber,
              client_data: {
                name: order.client?.name,
                nit: order.client?.nit,
                address: order.branch?.address || order.client?.address,
                phone: order.branch?.phone || order.client?.phone
              },
              total_amount: order.total_value || 0,
              created_by: user.id
            })

          if (remisionError) throw remisionError

          // Update remision number
          await supabase
            .from("system_config")
            .update({ config_value: String(parseInt(configData?.config_value || "1") + 1) })
            .eq("config_key", "remision_number_current")
        }
      }

      toast({
        title: "Facturación exitosa",
        description: `Se facturaron ${summary.totalOrders} pedidos correctamente`,
      })

      // Clear selection and refetch
      setSelectedOrders({})
      await fetchPendingOrders()

    } catch (err) {
      console.error("Error billing orders:", err)
      toast({
        title: "Error",
        description: "No se pudo completar la facturación",
        variant: "destructive"
      })
      throw err
    } finally {
      setIsBilling(false)
    }
  }, [generateBillingSummary, fetchPendingOrders, toast])

  useEffect(() => {
    fetchPendingOrders()
  }, [fetchPendingOrders])

  return {
    pendingOrders,
    loading,
    isBilling,
    selectedOrders,
    toggleOrderSelection,
    selectAllOrders,
    getSelectedOrderCount,
    getSelectedOrdersData,
    generateBillingSummary,
    billSelectedOrders,
    refetch: fetchPendingOrders
  }
}
