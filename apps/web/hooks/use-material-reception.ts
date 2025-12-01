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

  // Fetch all receptions from NEW SYSTEM (inventory movements)
  const fetchReceptions = async () => {
    try {
      setLoading(true)

      // Fetch movements with reason 'purchase' from new inventory system
      // Note: Fetch without joins due to cross-schema PostgREST limitations
      const { data: movementsData, error: queryError } = await supabase
        .schema('inventario')
        .from('inventory_movements')
        .select('*')
        .eq('reason_type', 'purchase')
        .order('movement_date', { ascending: false })
        .limit(50)

      console.log('📦 Fetch receptions result:', {
        movementsData,
        queryError,
        errorDetails: queryError ? {
          message: queryError.message,
          code: queryError.code,
          details: queryError.details,
          hint: queryError.hint
        } : null
      })

      if (queryError) {
        console.error('❌ Error fetching movements:', queryError)

        // Special handling for schema not exposed error
        if (queryError.code === 'PGRST204' || queryError.message?.includes('schema')) {
          setError('El esquema "inventario" no está configurado en Supabase. Ve a Settings → API → Exposed schemas y agrega "inventario"')
          setReceptions([])
          return
        }

        throw queryError
      }

      if (!movementsData || movementsData.length === 0) {
        console.log('ℹ️ No movements found with reason_type = purchase')
        setReceptions([])
        setError(null)
        return
      }

      // Fetch product details separately (cross-schema join)
      const productIds = [...new Set(movementsData.map(m => m.product_id))]
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, code, unit')
        .in('id', productIds)

      if (productsError) {
        console.warn('⚠️ Error fetching products:', productsError)
      }

      // Create product lookup map
      const productsMap = new Map(
        (productsData || []).map(p => [p.id, p])
      )

      // Fetch location details separately
      const locationIds = [...new Set(movementsData.map(m => m.location_id_to).filter(Boolean))]
      const { data: locationsData, error: locationsError } = await supabase
        .schema('inventario')
        .from('locations')
        .select('id, code, name')
        .in('id', locationIds)

      if (locationsError) {
        console.warn('⚠️ Error fetching locations:', locationsError)
      }

      // Create location lookup map
      const locationsMap = new Map(
        (locationsData || []).map(l => [l.id, l])
      )

      // Group movements by reference (if they have one) or by date
      const groupedMovements: Record<string, any> = {}

      for (const movement of movementsData) {
        const key = movement.reference_id || movement.movement_date.split('T')[0] + '-' + movement.id
        const product = productsMap.get(movement.product_id)
        const location = locationsMap.get(movement.location_id_to)

        if (!groupedMovements[key]) {
          groupedMovements[key] = {
            id: movement.reference_id || movement.id,
            reception_number: movement.movement_number,
            reception_date: movement.movement_date.split('T')[0],
            quantity_received: 0,
            items: [],
            purchase_order: movement.reference_type === 'purchase_order' ? { order_number: movement.reference_id } : null,
            location: location
          }
        }

        groupedMovements[key].quantity_received += movement.quantity
        groupedMovements[key].items.push({
          id: movement.id,
          material_id: movement.product_id,
          material_name: product?.name || 'Desconocido',
          material_code: product?.code || '',
          quantity_received: movement.quantity,
          unit: product?.unit || movement.unit_of_measure,
          batch_number: movement.batch_number || '',
          expiry_date: movement.expiry_date || '',
          location: location
        })
      }

      const receptionsArray = Object.values(groupedMovements)
      console.log('✅ Grouped receptions:', receptionsArray.length, receptionsArray)
      setReceptions(receptionsArray as MaterialReceptionWithDetails[])
      setError(null)
    } catch (err) {
      console.error('❌ fetchReceptions error:', err)
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

  // Create reception with multiple items (NEW SYSTEM ONLY)
  const createReception = async (data: MaterialReceptionInsert & { items?: Array<any> }) => {
    try {
      setError(null)

      if (!data.items || data.items.length === 0) {
        throw new Error('No hay materiales para recibir')
      }

      // =====================================================
      // NEW INVENTORY SYSTEM: Register movements directly
      // =====================================================
      const movementResults = []

      for (const item of data.items) {
        const { data: movementData, error: movementError } = await supabase
          .schema('inventario')
          .rpc('perform_inventory_movement', {
            p_product_id: item.material_id,
            p_quantity: item.quantity_received,
            p_movement_type: 'IN',
            p_reason_type: 'purchase',
            p_location_id_from: null,
            p_location_id_to: null, // Will use default location (WH1-RECEIVING)
            p_reference_id: data.purchase_order_id || null,
            p_reference_type: data.purchase_order_id ? 'purchase_order' : 'direct_reception',
            p_notes: item.notes || null,
            p_recorded_by: user?.id || null,
            p_batch_number: item.batch_number || null,
            p_expiry_date: item.expiry_date || null
          })

        if (movementError) {
          console.error('Error creating movement:', movementError)
          throw movementError
        }

        movementResults.push(movementData)
        console.log('✅ Movement registered:', movementData.movement_number)
      }

      console.log(`✅ ${movementResults.length} movements registered successfully`)

      // Update purchase order status if this is an order reception
      if (data.purchase_order_id) {
        await updatePurchaseOrderStatus(data.purchase_order_id, data.items)
      }

      await fetchReceptions()

      return {
        success: true,
        movements: movementResults
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creating reception'
      setError(message)
      console.error('❌ Reception error:', err)
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
