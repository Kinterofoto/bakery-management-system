"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"

type MaterialTransfer = any
type TransferItem = any
type WorkCenter = any

type MaterialTransferWithDetails = MaterialTransfer & {
  items?: TransferItem[]
  work_center?: WorkCenter
}

export function useMaterialTransfers() {
  const { user } = useAuth()
  const [transfers, setTransfers] = useState<MaterialTransferWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all transfers with items
  const fetchTransfers = async () => {
    try {
      setLoading(true)

      // Fetch transfer headers
      const { data: transferData, error: queryError } = await (supabase as any)
        .schema('compras')
        .from('material_transfers')
        .select('*')
        .order('created_at', { ascending: false })

      if (queryError) throw queryError

      // Fetch all items for these transfers
      const transferIds = transferData?.map(t => t.id) || []
      const { data: itemsData, error: itemsError } = await (supabase as any)
        .schema('compras')
        .from('transfer_items')
        .select('*')
        .in('transfer_id', transferIds)

      if (itemsError) throw itemsError

      // Fetch work centers
      const workCenterIds = transferData?.map(t => t.work_center_id) || []
      const { data: workCentersData } = await (supabase as any)
        .schema('produccion')
        .from('work_centers')
        .select('id, code, name, is_active')
        .in('id', workCenterIds)

      const workCenterMap = new Map((workCentersData || []).map(wc => [wc.id, wc]))

      // Fetch product names for all materials
      const materialIds = itemsData?.map(item => item.material_id) || []
      const { data: materialsData } = await supabase
        .from('products')
        .select('id, name, unit')
        .in('id', materialIds)

      const materialMap = new Map((materialsData || []).map(m => [m.id, m]))

      // Combine transfers with their items and material names
      const transfersWithItems = transferData?.map(transfer => ({
        ...transfer,
        work_center: workCenterMap.get(transfer.work_center_id),
        items: (itemsData?.filter(item => item.transfer_id === transfer.id) || []).map(item => ({
          ...item,
          material_name: materialMap.get(item.material_id)?.name || 'Desconocido',
          unit_of_measure: item.unit_of_measure || materialMap.get(item.material_id)?.unit
        }))
      })) || []

      setTransfers(transfersWithItems as MaterialTransferWithDetails[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching transfers')
    } finally {
      setLoading(false)
    }
  }

  // Create transfer with multiple items - NEW INVENTORY SYSTEM
  const createTransfer = async (workCenterId: string, items: Array<any>) => {
    try {
      setError(null)

      console.log('🔄 Creating transfer for work center:', workCenterId)
      console.log('🔄 Items:', items)

      // NEW SYSTEM: Use perform_inventory_movement RPC for each item
      // This creates TRANSFER_OUT from warehouse and TRANSFER_IN to work center
      const movementResults = []

      for (const item of items) {
        console.log('🔄 Processing item:', item.material_id, item.quantity_requested)

        // Perform transfer movement (OUT from warehouse, IN to work center)
        const { data: movementData, error: movementError } = await supabase
          .schema('inventario')
          .rpc('perform_inventory_movement', {
            p_product_id: item.material_id,
            p_quantity: item.quantity_requested,
            p_movement_type: 'TRANSFER_OUT',
            p_reason_type: 'transfer',
            p_location_id_from: null, // Will use default warehouse location
            p_location_id_to: workCenterId, // Transfer to work center (treated as location)
            p_reference_id: null,
            p_reference_type: 'work_center_transfer',
            p_notes: item.notes || `Traslado a centro de trabajo`,
            p_recorded_by: user?.id || null,
            p_batch_number: item.batch_number || null,
            p_expiry_date: item.expiry_date || null
          })

        if (movementError) {
          console.error('❌ Error creating movement:', movementError)
          throw movementError
        }

        movementResults.push(movementData)
        console.log('✅ Movement created:', movementData.movement_number)
      }

      console.log(`✅ ${movementResults.length} movements created successfully`)

      await fetchTransfers()

      // Return a transfer-like object for compatibility
      return {
        id: movementResults[0]?.movement_id,
        transfer_number: movementResults[0]?.movement_number,
        work_center_id: workCenterId,
        status: 'completed',
        movements: movementResults
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creating transfer'
      console.error('❌ Transfer error:', err)
      setError(message)
      throw err
    }
  }

  // Receive transfer in work center
  const receiveTransfer = async (transferId: string, items: Array<any>) => {
    try {
      setError(null)

      // Update transfer items with received quantities
      for (const item of items) {
        const { error: updateError } = await (supabase as any)
          .schema('compras')
          .from('transfer_items')
          .update({
            quantity_received: item.quantity_received,
            notes: item.notes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)

        if (updateError) throw updateError
      }

      // Determine transfer status based on quantities
      const transfer = transfers.find(t => t.id === transferId)
      const allItems = transfer?.items || []
      const allReceived = allItems.every(item => {
        const receivedItem = items.find(i => i.id === item.id)
        return receivedItem?.quantity_received === item.quantity_requested
      })

      const newStatus = allReceived ? 'received' : 'partially_received'

      // Update transfer status
      const { error: statusError } = await (supabase as any)
        .schema('compras')
        .from('material_transfers')
        .update({
          status: newStatus,
          received_by: user?.id,
          received_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', transferId)

      if (statusError) throw statusError

      await fetchTransfers()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error receiving transfer'
      setError(message)
      throw err
    }
  }

  // Get pending transfers for a work center
  const getPendingTransfersForWorkCenter = (workCenterId: string) => {
    return transfers.filter(t =>
      t.work_center_id === workCenterId && t.status === 'pending_receipt'
    )
  }

  // Get transfers by status
  const getTransfersByStatus = (status: string) => {
    return transfers.filter(t => t.status === status)
  }

  // Get transfers by work center
  const getTransfersByWorkCenter = (workCenterId: string) => {
    return transfers.filter(t => t.work_center_id === workCenterId)
  }

  useEffect(() => {
    fetchTransfers()
  }, [])

  return {
    transfers,
    loading,
    error,
    fetchTransfers,
    createTransfer,
    receiveTransfer,
    getPendingTransfersForWorkCenter,
    getTransfersByStatus,
    getTransfersByWorkCenter
  }
}
