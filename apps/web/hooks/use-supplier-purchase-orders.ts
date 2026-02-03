"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Database } from "@/lib/database.types"

type PurchaseOrder = Database['compras']['Tables']['purchase_orders']['Row']
type PurchaseOrderItem = Database['compras']['Tables']['purchase_order_items']['Row']
type Product = Database['public']['Tables']['products']['Row']

type PurchaseOrderWithDetails = PurchaseOrder & {
  items?: PurchaseOrderItemWithDetails[]
}

type PurchaseOrderItemWithDetails = PurchaseOrderItem & {
  material?: Product
}

export function useSupplierPurchaseOrders(supplierToken: string) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supplierId, setSupplierId] = useState<string | null>(null)

  const fetchSupplierPurchaseOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      // First, get supplier ID from token
      const { data: supplier, error: supplierError } = await supabase
        .schema('compras')
        .from('suppliers')
        .select('id')
        .eq('access_token', supplierToken)
        .single()

      if (supplierError) throw supplierError
      if (!supplier) throw new Error('Proveedor no encontrado')

      setSupplierId(supplier.id)

      // Fetch orders for this supplier
      const { data: ordersData, error: ordersError } = await supabase
        .schema('compras')
        .from('purchase_orders')
        .select('*')
        .eq('supplier_id', supplier.id)
        .order('order_date', { ascending: false })

      if (ordersError) throw ordersError

      // Fetch all items for these orders
      const orderIds = ordersData?.map(order => order.id) || []

      if (orderIds.length === 0) {
        setPurchaseOrders([])
        return
      }

      const { data: itemsData, error: itemsError } = await supabase
        .schema('compras')
        .from('purchase_order_items')
        .select('*')
        .in('purchase_order_id', orderIds)

      if (itemsError) throw itemsError

      // Fetch materials
      const materialIds = itemsData?.map(item => item.material_id) || []
      const { data: materialsData, error: materialsError } = await supabase
        .from('products')
        .select('*')
        .in('id', materialIds)

      if (materialsError) throw materialsError

      // Combine all data
      const ordersWithDetails: PurchaseOrderWithDetails[] = ordersData?.map(order => {
        const orderItems = itemsData?.filter(item => item.purchase_order_id === order.id) || []
        const itemsWithDetails: PurchaseOrderItemWithDetails[] = orderItems.map(item => ({
          ...item,
          material: materialsData?.find(m => m.id === item.material_id)
        }))

        return {
          ...order,
          items: itemsWithDetails
        }
      }) || []

      setPurchaseOrders(ordersWithDetails)
    } catch (err) {
      console.error('Error fetching supplier purchase orders:', err)
      setError(err instanceof Error ? err.message : 'Error al obtener órdenes de compra')
    } finally {
      setLoading(false)
    }
  }

  const getOrdersByStatus = (status: string): PurchaseOrderWithDetails[] => {
    return purchaseOrders.filter(order => order.status === status)
  }

  const getOrderCompletion = (order: PurchaseOrderWithDetails): number => {
    if (!order.items || order.items.length === 0) return 0

    const totalItems = order.items.length
    const fullyReceivedItems = order.items.filter(
      item => (item.quantity_received || 0) >= item.quantity_ordered
    ).length

    return (fullyReceivedItems / totalItems) * 100
  }

  const getOrderStats = () => {
    const pending = purchaseOrders.filter(o => o.status === 'pending')
    const ordered = purchaseOrders.filter(o => o.status === 'ordered')
    const partiallyReceived = purchaseOrders.filter(o => o.status === 'partially_received')
    const received = purchaseOrders.filter(o => o.status === 'received')
    const cancelled = purchaseOrders.filter(o => o.status === 'cancelled')

    return {
      totalOrders: purchaseOrders.length,
      pendingOrders: pending.length,
      orderedOrders: ordered.length,
      partiallyReceivedOrders: partiallyReceived.length,
      receivedOrders: received.length,
      cancelledOrders: cancelled.length,
      totalValue: purchaseOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
      activeValue: [...pending, ...ordered, ...partiallyReceived].reduce((sum, order) => sum + (order.total_amount || 0), 0)
    }
  }

  useEffect(() => {
    if (supplierToken) {
      fetchSupplierPurchaseOrders()
    }
  }, [supplierToken])

  return {
    purchaseOrders,
    loading,
    error,
    supplierId,
    fetchSupplierPurchaseOrders,
    getOrdersByStatus,
    getOrderCompletion,
    getOrderStats
  }
}
