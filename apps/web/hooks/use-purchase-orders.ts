"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Database } from "@/lib/database.types"

type PurchaseOrder = Database['compras']['Tables']['purchase_orders']['Row']
type PurchaseOrderInsert = Database['compras']['Tables']['purchase_orders']['Insert']
type PurchaseOrderUpdate = Database['compras']['Tables']['purchase_orders']['Update']
type PurchaseOrderItem = Database['compras']['Tables']['purchase_order_items']['Row']
type PurchaseOrderItemInsert = Database['compras']['Tables']['purchase_order_items']['Insert']
type PurchaseOrderItemUpdate = Database['compras']['Tables']['purchase_order_items']['Update']
type Supplier = Database['compras']['Tables']['suppliers']['Row']
type Product = Database['public']['Tables']['products']['Row']

type PurchaseOrderWithDetails = PurchaseOrder & {
  supplier?: Supplier
  items?: PurchaseOrderItemWithDetails[]
}

type PurchaseOrderItemWithDetails = PurchaseOrderItem & {
  material?: Product
}

type CreatePurchaseOrderData = {
  supplier_id: string
  expected_delivery_date?: string
  notes?: string
  items: Array<{
    material_id: string
    material_supplier_id?: string
    quantity_ordered: number
    unit_price: number
    notes?: string
  }>
}

type PurchaseOrderStats = {
  totalOrders: number
  pendingOrders: number
  orderedOrders: number
  receivedOrders: number
  totalValue: number
  pendingValue: number
}

export function usePurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true)

      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .schema('compras')
        .from('purchase_orders')
        .select('*')
        .order('order_date', { ascending: false })

      if (ordersError) throw ordersError

      // Fetch all items for these orders
      const orderIds = ordersData?.map(order => order.id) || []
      const { data: itemsData, error: itemsError } = await supabase
        .schema('compras')
        .from('purchase_order_items')
        .select('*')
        .in('purchase_order_id', orderIds)

      if (itemsError) throw itemsError

      // Fetch suppliers
      const supplierIds = ordersData?.map(order => order.supplier_id) || []
      const { data: suppliersData, error: suppliersError } = await supabase
        .schema('compras')
        .from('suppliers')
        .select('*')
        .in('id', supplierIds)

      if (suppliersError) throw suppliersError

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
          supplier: suppliersData?.find(s => s.id === order.supplier_id),
          items: itemsWithDetails
        }
      }) || []

      setPurchaseOrders(ordersWithDetails)
      setError(null)
    } catch (err) {
      console.error('Error fetching purchase orders:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const getPurchaseOrderById = async (id: string): Promise<PurchaseOrderWithDetails | null> => {
    try {
      const { data: order, error: orderError } = await supabase
        .schema('compras')
        .from('purchase_orders')
        .select('*')
        .eq('id', id)
        .single()

      if (orderError) throw orderError

      // Fetch items
      const { data: items, error: itemsError } = await supabase
        .schema('compras')
        .from('purchase_order_items')
        .select('*')
        .eq('purchase_order_id', id)

      if (itemsError) throw itemsError

      // Fetch supplier
      const { data: supplier, error: supplierError } = await supabase
        .schema('compras')
        .from('suppliers')
        .select('*')
        .eq('id', order.supplier_id)
        .single()

      if (supplierError) throw supplierError

      // Fetch materials for items
      const materialIds = items?.map(item => item.material_id) || []
      const { data: materials, error: materialsError } = await supabase
        .from('products')
        .select('*')
        .in('id', materialIds)

      if (materialsError) throw materialsError

      const itemsWithDetails: PurchaseOrderItemWithDetails[] = items?.map(item => ({
        ...item,
        material: materials?.find(m => m.id === item.material_id)
      })) || []

      return {
        ...order,
        supplier,
        items: itemsWithDetails
      }
    } catch (err) {
      console.error('Error fetching purchase order:', err)
      setError(err instanceof Error ? err.message : 'Error al obtener orden de compra')
      return null
    }
  }

  const createPurchaseOrder = async (orderData: CreatePurchaseOrderData, userId?: string): Promise<PurchaseOrder | null> => {
    try {
      // Create order header
      const { data: order, error: orderError } = await supabase
        .schema('compras')
        .from('purchase_orders')
        .insert([{
          supplier_id: orderData.supplier_id,
          expected_delivery_date: orderData.expected_delivery_date || null,
          notes: orderData.notes || null,
          created_by: userId || null,
          status: 'pending'
        }])
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const items = orderData.items.map(item => ({
        purchase_order_id: order.id,
        material_id: item.material_id,
        material_supplier_id: item.material_supplier_id || null,
        quantity_ordered: item.quantity_ordered,
        unit_price: item.unit_price,
        notes: item.notes || null
      }))

      const { error: itemsError } = await supabase
        .schema('compras')
        .from('purchase_order_items')
        .insert(items)

      if (itemsError) throw itemsError

      await fetchPurchaseOrders() // Refresh the list
      return order
    } catch (err) {
      console.error('Error creating purchase order:', err)
      setError(err instanceof Error ? err.message : 'Error al crear orden de compra')
      return null
    }
  }

  const updatePurchaseOrder = async (id: string, updates: PurchaseOrderUpdate): Promise<boolean> => {
    try {
      const { error } = await supabase
        .schema('compras')
        .from('purchase_orders')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      await fetchPurchaseOrders() // Refresh the list
      return true
    } catch (err) {
      console.error('Error updating purchase order:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar orden de compra')
      return false
    }
  }

  const updateOrderStatus = async (id: string, status: string): Promise<boolean> => {
    const updates: PurchaseOrderUpdate = { status }

    // Set actual delivery date if marking as received
    if (status === 'received') {
      updates.actual_delivery_date = new Date().toISOString().split('T')[0]
    }

    return updatePurchaseOrder(id, updates)
  }

  const updateOrderItem = async (itemId: string, updates: PurchaseOrderItemUpdate): Promise<boolean> => {
    try {
      const { error } = await supabase
        .schema('compras')
        .from('purchase_order_items')
        .update(updates)
        .eq('id', itemId)

      if (error) throw error

      await fetchPurchaseOrders() // Refresh the list
      return true
    } catch (err) {
      console.error('Error updating order item:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar item')
      return false
    }
  }

  const receiveOrderItem = async (itemId: string, quantityReceived: number): Promise<boolean> => {
    return updateOrderItem(itemId, { quantity_received: quantityReceived })
  }

  const receiveFullOrder = async (orderId: string): Promise<boolean> => {
    try {
      const order = await getPurchaseOrderById(orderId)
      if (!order || !order.items) return false

      // Update all items to received full quantity
      for (const item of order.items) {
        await updateOrderItem(item.id, { quantity_received: item.quantity_ordered })
      }

      return true
    } catch (err) {
      console.error('Error receiving full order:', err)
      setError(err instanceof Error ? err.message : 'Error al recibir orden completa')
      return false
    }
  }

  const cancelPurchaseOrder = async (id: string): Promise<boolean> => {
    return updateOrderStatus(id, 'cancelled')
  }

  const deletePurchaseOrder = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .schema('compras')
        .from('purchase_orders')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchPurchaseOrders() // Refresh the list
      return true
    } catch (err) {
      console.error('Error deleting purchase order:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar orden de compra')
      return false
    }
  }

  const getPurchaseOrdersBySupplier = (supplierId: string): PurchaseOrderWithDetails[] => {
    return purchaseOrders.filter(order => order.supplier_id === supplierId)
  }

  const getPurchaseOrdersByStatus = (status: string): PurchaseOrderWithDetails[] => {
    return purchaseOrders.filter(order => order.status === status)
  }

  const getOverdueOrders = (): PurchaseOrderWithDetails[] => {
    const today = new Date().toISOString().split('T')[0]
    return purchaseOrders.filter(
      order =>
        order.expected_delivery_date &&
        order.expected_delivery_date < today &&
        order.status !== 'received' &&
        order.status !== 'cancelled'
    )
  }

  const getPurchaseOrderStats = (): PurchaseOrderStats => {
    const pending = purchaseOrders.filter(o => o.status === 'pending')
    const ordered = purchaseOrders.filter(o => o.status === 'ordered')
    const received = purchaseOrders.filter(o => o.status === 'received')

    return {
      totalOrders: purchaseOrders.length,
      pendingOrders: pending.length,
      orderedOrders: ordered.length,
      receivedOrders: received.length,
      totalValue: purchaseOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
      pendingValue: [...pending, ...ordered].reduce((sum, order) => sum + (order.total_amount || 0), 0)
    }
  }

  const searchPurchaseOrders = (query: string): PurchaseOrderWithDetails[] => {
    const lowerQuery = query.toLowerCase()
    return purchaseOrders.filter(order =>
      order.order_number.toLowerCase().includes(lowerQuery) ||
      order.supplier?.company_name.toLowerCase().includes(lowerQuery) ||
      order.notes?.toLowerCase().includes(lowerQuery)
    )
  }

  const getOrderCompletion = (order: PurchaseOrderWithDetails): number => {
    if (!order.items || order.items.length === 0) return 0

    const totalItems = order.items.length
    const fullyReceivedItems = order.items.filter(
      item => item.quantity_received >= item.quantity_ordered
    ).length

    return (fullyReceivedItems / totalItems) * 100
  }

  // Crear orden de compra desde explosión de materiales
  const createOrderFromExplosion = async (
    supplierId: string,
    deliveryDate: string,
    items: Array<{
      material_id: string
      quantity: number
      unitPrice: number
    }>,
    userId?: string
  ): Promise<{ orderId: string | null; error: string | null }> => {
    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .schema('compras')
        .from('purchase_orders')
        .insert([{
          supplier_id: supplierId,
          expected_delivery_date: deliveryDate,
          created_by: userId || null,
          status: 'pending'
        }])
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = items.map(item => ({
        purchase_order_id: order.id,
        material_id: item.material_id,
        quantity_ordered: item.quantity,
        unit_price: item.unitPrice
      }))

      const { error: itemsError } = await supabase
        .schema('compras')
        .from('purchase_order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      // Update tracking status to 'ordered' for each item
      for (const item of items) {
        // We need to find the tracking record that corresponds to this material and delivery date
        // The tracking update will be handled by the UI after this order is created
      }

      await fetchPurchaseOrders()
      return { orderId: order.id, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear orden desde explosión'
      console.error('Error creating order from explosion:', err)
      return { orderId: null, error: message }
    }
  }

  useEffect(() => {
    fetchPurchaseOrders()
  }, [])

  return {
    purchaseOrders,
    loading,
    error,
    fetchPurchaseOrders,
    getPurchaseOrderById,
    createPurchaseOrder,
    updatePurchaseOrder,
    updateOrderStatus,
    updateOrderItem,
    receiveOrderItem,
    receiveFullOrder,
    cancelPurchaseOrder,
    deletePurchaseOrder,
    getPurchaseOrdersBySupplier,
    getPurchaseOrdersByStatus,
    getOverdueOrders,
    getPurchaseOrderStats,
    searchPurchaseOrders,
    getOrderCompletion,
    createOrderFromExplosion
  }
}
