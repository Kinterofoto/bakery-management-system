"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"

type MaterialReception = any
type MaterialReceptionInsert = any
type MaterialReceptionUpdate = any
type ReceptionItem = any
type PurchaseOrder = any
type Product = any

type MaterialReceptionWithDetails = MaterialReception & {
  purchase_order?: PurchaseOrder
  items?: ReceptionItem[]
}

export function useMaterialReception() {
  const { user } = useAuth()
  const [receptions, setReceptions] = useState<MaterialReceptionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all receptions with items
  const fetchReceptions = async () => {
    try {
      setLoading(true)

      // Fetch reception headers
      const { data: receptionData, error: queryError } = await (supabase as any)
        .schema('compras')
        .from('material_receptions')
        .select('*')
        .order('reception_date', { ascending: false })

      if (queryError) throw queryError

      // Fetch all items for these receptions
      const receptionIds = receptionData?.map(r => r.id) || []
      const { data: itemsData, error: itemsError } = await (supabase as any)
        .schema('compras')
        .from('reception_items')
        .select('*')
        .in('reception_id', receptionIds)

      if (itemsError) throw itemsError

      // Fetch product names for all materials
      const materialIds = itemsData?.map(item => item.material_id) || []
      const { data: materialsData } = await supabase
        .from('products')
        .select('id, name')
        .in('id', materialIds)

      // Create a map of material_id -> name
      const materialMap = new Map((materialsData || []).map(m => [m.id, m.name]))

      // Combine receptions with their items and material names
      const receptionWithItems = receptionData?.map(reception => ({
        ...reception,
        items: (itemsData?.filter(item => item.reception_id === reception.id) || []).map(item => ({
          ...item,
          material_name: materialMap.get(item.material_id) || 'Desconocido'
        }))
      })) || []

      setReceptions(receptionWithItems as MaterialReceptionWithDetails[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching receptions')
    } finally {
      setLoading(false)
    }
  }

  // Update purchase order status based on reception
  const updatePurchaseOrderStatus = async (orderId: string, receptionItems: Array<any>) => {
    try {
      // Fetch all items from the purchase order
      const { data: orderItems, error: orderItemsError } = await (supabase as any)
        .schema('compras')
        .from('purchase_order_items')
        .select('*')
        .eq('purchase_order_id', orderId)

      if (orderItemsError) {
        console.warn('Error fetching order items:', orderItemsError)
        return
      }

      // Fetch all reception items for this order (including the ones we just created)
      const { data: allReceptionItems, error: allReceptionItemsError } = await (supabase as any)
        .schema('compras')
        .from('reception_items')
        .select('*, reception:material_receptions!inner(purchase_order_id)')
        .eq('reception.purchase_order_id', orderId)

      if (allReceptionItemsError) {
        console.warn('Error fetching all reception items:', allReceptionItemsError)
        return
      }

      // Calculate total received per material
      const receivedByMaterial = new Map<string, number>()
      for (const receptionItem of allReceptionItems || []) {
        const currentTotal = receivedByMaterial.get(receptionItem.material_id) || 0
        receivedByMaterial.set(receptionItem.material_id, currentTotal + (receptionItem.quantity_received || 0))
      }

      // Check if all items are fully received
      let allReceived = true
      let anyReceived = false

      for (const orderItem of orderItems || []) {
        const totalReceived = receivedByMaterial.get(orderItem.material_id) || 0

        if (totalReceived >= orderItem.quantity_ordered) {
          anyReceived = true
        } else if (totalReceived > 0) {
          anyReceived = true
          allReceived = false
        } else {
          allReceived = false
        }
      }

      // Determine the new status
      let newStatus = 'ordered'
      if (allReceived && anyReceived) {
        newStatus = 'received'
      } else if (anyReceived) {
        newStatus = 'partially_received'
      }

      // Update the purchase order status
      const { error: updateError } = await (supabase as any)
        .schema('compras')
        .from('purchase_orders')
        .update({
          status: newStatus,
          actual_delivery_date: allReceived ? new Date().toISOString().split('T')[0] : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (updateError) {
        console.warn('Error updating purchase order status:', updateError)
      } else {
        console.log(`Purchase order ${orderId} updated to status: ${newStatus}`)
      }
    } catch (err) {
      console.warn('Error updating purchase order status:', err)
      // Don't throw - reception should complete even if status update fails
    }
  }

  // Update tracking status when items are received
  const updateTrackingForReception = async (receptionItems: Array<any>) => {
    try {
      // For each reception item, find related tracking records and update them
      for (const item of receptionItems) {
        // Find tracking records for this material from all dates
        const { data: trackingRecords, error: trackingError } = await (supabase as any)
          .schema('compras')
          .from('explosion_purchase_tracking')
          .select('*')
          .eq('material_id', item.material_id)

        if (trackingError) {
          console.warn('Error fetching tracking records:', trackingError)
          continue
        }

        // Update tracking records to mark as received
        for (const tracking of trackingRecords || []) {
          if (tracking.status === 'ordered' && tracking.quantity_ordered > 0) {
            const { error: updateError } = await (supabase as any)
              .schema('compras')
              .from('explosion_purchase_tracking')
              .update({
                quantity_received: (tracking.quantity_received || 0) + item.quantity_received,
                status: item.quantity_received >= tracking.quantity_ordered ? 'received' : 'partially_received',
                updated_at: new Date().toISOString()
              })
              .eq('id', tracking.id)

            if (updateError) {
              console.warn('Error updating tracking:', updateError)
            } else {
              break // Only update the first matching tracking record
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error updating tracking for reception:', err)
      // Don't throw - reception should complete even if tracking fails
    }
  }

  // Create reception with multiple items
  const createReception = async (data: MaterialReceptionInsert & { items?: Array<any> }) => {
    try {
      setError(null)

      // Calculate total quantity from items
      const totalQuantity = data.items?.reduce((sum, item) => sum + (item.quantity_received || 0), 0) || 0

      // Create reception header (reception_number is auto-generated by trigger)
      const { data: newReception, error: insertError } = await (supabase as any)
        .schema('compras')
        .from('material_receptions')
        .insert({
          type: data.type,
          purchase_order_id: data.purchase_order_id || null,
          quantity_received: totalQuantity, // Sum of all items
          operator_id: user?.id,
          reception_date: new Date().toISOString().split('T')[0],
          reception_time: new Date().toISOString().split('T')[1]?.substring(0, 8) || null,
          supplier_id: data.supplier_id || null,
          notes: data.notes || null
        })
        .select()
        .single()

      console.log('New reception created:', newReception)

      if (insertError) throw insertError

      // Create reception items if provided
      if (data.items && data.items.length > 0) {
        const itemsToInsert = data.items.map(item => ({
          reception_id: newReception.id,
          purchase_order_item_id: item.purchase_order_item_id || null,
          material_id: item.material_id,
          quantity_received: item.quantity_received,
          batch_number: item.batch_number || null,
          expiry_date: item.expiry_date || null,
          notes: item.notes || null
        }))

        const { error: itemsError } = await (supabase as any)
          .schema('compras')
          .from('reception_items')
          .insert(itemsToInsert)

        if (itemsError) throw itemsError

        // Update tracking for received items
        await updateTrackingForReception(itemsToInsert)

        // Update purchase order status if this is an order reception
        if (data.purchase_order_id) {
          await updatePurchaseOrderStatus(data.purchase_order_id, itemsToInsert)
        }
      }

      await fetchReceptions()
      return newReception
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creating reception'
      setError(message)
      throw err
    }
  }

  // Update reception header
  const updateReception = async (id: string, data: MaterialReceptionUpdate) => {
    try {
      setError(null)
      const { data: updated, error: updateError } = await (supabase as any)
        .schema('compras')
        .from('material_receptions')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      await fetchReceptions()
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error updating reception'
      setError(message)
      throw err
    }
  }

  // Update reception item
  const updateReceptionItem = async (itemId: string, data: any) => {
    try {
      setError(null)
      const { data: updated, error: updateError } = await (supabase as any)
        .schema('compras')
        .from('reception_items')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .select()
        .single()

      if (updateError) throw updateError

      await fetchReceptions()
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error updating reception item'
      setError(message)
      throw err
    }
  }

  // Delete reception
  const deleteReception = async (id: string) => {
    try {
      setError(null)
      const { error: deleteError } = await (supabase as any)
        .schema('compras')
        .from('material_receptions')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      
      setReceptions(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error deleting reception'
      setError(message)
      throw err
    }
  }

  // Get receptions containing a specific material
  const getReceptionsByMaterial = (materialId: string) => {
    return receptions.filter(r =>
      r.items?.some(item => item.material_id === materialId)
    )
  }

  // Get receptions by purchase order
  const getReceptionsByOrder = (orderId: string) => {
    return receptions.filter(r => r.purchase_order_id === orderId)
  }

  // Get receptions by date range
  const getReceptionsByDateRange = (startDate: string, endDate: string) => {
    return receptions.filter(r => {
      const date = r.reception_date
      return date >= startDate && date <= endDate
    })
  }

  // Get today's receptions
  const getTodayReceptions = () => {
    const today = new Date().toISOString().split('T')[0]
    return receptions.filter(r => r.reception_date === today)
  }

  // Add reception item
  const addReceptionItem = async (receptionId: string, item: any) => {
    try {
      setError(null)
      const { data, error } = await (supabase as any)
        .schema('compras')
        .from('reception_items')
        .insert({
          reception_id: receptionId,
          purchase_order_item_id: item.purchase_order_item_id || null,
          material_id: item.material_id,
          quantity_received: item.quantity_received,
          batch_number: item.batch_number || null,
          expiry_date: item.expiry_date || null,
          notes: item.notes || null
        })
        .select()
        .single()

      if (error) throw error

      await fetchReceptions()
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error adding reception item'
      setError(message)
      throw err
    }
  }

  useEffect(() => {
    fetchReceptions()
  }, [])

  return {
    receptions,
    loading,
    error,
    fetchReceptions,
    createReception,
    updateReception,
    updateReceptionItem,
    deleteReception,
    getReceptionsByMaterial,
    getReceptionsByOrder,
    getReceptionsByDateRange,
    getTodayReceptions,
    addReceptionItem
  }
}
