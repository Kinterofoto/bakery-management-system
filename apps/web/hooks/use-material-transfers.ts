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

  // Fetch all transfers with items - NEW INVENTORY SYSTEM
  const fetchTransfers = async () => {
    try {
      setLoading(true)

      console.log('🔄 Fetching transfers from new inventory system...')

      // Fetch TRANSFER_IN movements only (these represent incoming transfers to work centers)
      // Each TRANSFER_IN is paired with a TRANSFER_OUT via linked_movement_id
      const { data: movementsData, error: queryError } = await supabase
        .schema('inventario')
        .from('inventory_movements')
        .select('*')
        .eq('reason_type', 'transfer')
        .eq('movement_type', 'TRANSFER_IN') // Only get TRANSFER_IN movements
        .order('created_at', { ascending: false })
        .limit(100)

      console.log('🔄 TRANSFER_IN movements:', { count: movementsData?.length, error: queryError })

      if (queryError) throw queryError

      // Get unique product IDs and location IDs
      const productIds = [...new Set(movementsData?.map(m => m.product_id) || [])]
      const locationIds = [...new Set(movementsData?.map(m => m.location_id_to).filter(Boolean) || [])]

      // Fetch product details
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, unit')
        .in('id', productIds)

      const productMap = new Map((productsData || []).map(p => [p.id, p]))

      // Fetch location details (work centers)
      const { data: locationsData } = await supabase
        .schema('inventario')
        .from('locations')
        .select('id, code, name, location_type')
        .in('id', locationIds)

      const locationMap = new Map((locationsData || []).map(l => [l.id, l]))

      // Each TRANSFER_IN movement becomes a transfer item
      // Group by linked_movement_id to group items from same transfer batch
      const groupedTransfers: Record<string, any> = {}

      for (const movement of movementsData || []) {
        // Use movement ID as key (each TRANSFER_IN is independent)
        const key = movement.id
        const product = productMap.get(movement.product_id)
        const location = locationMap.get(movement.location_id_to)

        groupedTransfers[key] = {
          id: movement.id,
          transfer_number: movement.movement_number,
          work_center_id: movement.location_id_to,
          work_center: location ? {
            id: location.id,
            code: location.code,
            name: location.name,
            is_active: true
          } : null,
          status: movement.status || 'completed',
          requested_by: movement.recorded_by,
          requested_at: movement.created_at,
          created_at: movement.created_at,
          received_at: movement.received_at,
          received_by: movement.received_by,
          items: [{
            id: movement.id,
            material_id: movement.product_id,
            material_name: product?.name || 'Desconocido',
            quantity_requested: movement.quantity,
            quantity_received: movement.quantity,
            unit_of_measure: movement.unit_of_measure || product?.unit,
            batch_number: movement.batch_number,
            expiry_date: movement.expiry_date,
            notes: movement.notes
          }]
        }
      }

      const transfersArray = Object.values(groupedTransfers)
      console.log('✅ Grouped transfers:', transfersArray.length)

      setTransfers(transfersArray as MaterialTransferWithDetails[])
      setError(null)
    } catch (err) {
      console.error('❌ Error fetching transfers:', err)
      setError(err instanceof Error ? err.message : 'Error fetching transfers')
    } finally {
      setLoading(false)
    }
  }

  // Create transfer with multiple items - NEW PENDING TRANSFER SYSTEM
  const createTransfer = async (workCenterId: string, items: Array<any>) => {
    try {
      setError(null)

      console.log('🔄 Creating pending transfer for work center:', workCenterId)
      console.log('🔄 Items:', items)

      // First, get the location_id for this work center
      const { data: workCenterData, error: wcError } = await supabase
        .schema('produccion')
        .from('work_centers')
        .select('location_id, code, name')
        .eq('id', workCenterId)
        .single()

      if (wcError || !workCenterData) {
        console.error('❌ Error fetching work center:', wcError)
        throw new Error('No se pudo obtener el centro de trabajo')
      }

      if (!workCenterData.location_id) {
        console.error('❌ Work center has no location_id:', workCenterData)
        throw new Error(`El centro de trabajo ${workCenterData.name} no tiene una ubicación asignada`)
      }

      console.log('✅ Work center location:', workCenterData.location_id, workCenterData.code)

      // Get the receiving area location (WH1-RECEIVING)
      const { data: warehouseLocation, error: whError } = await supabase
        .schema('inventario')
        .from('locations')
        .select('id, code, name')
        .eq('code', 'WH1-RECEIVING')
        .single()

      if (whError || !warehouseLocation) {
        console.error('❌ Error fetching warehouse location:', whError)
        throw new Error('No se pudo obtener la ubicación de área de recepción')
      }

      console.log('✅ Warehouse location:', warehouseLocation.id, warehouseLocation.code)

      // NEW SYSTEM: Use create_pending_transfer RPC for each item
      // This creates TRANSFER_OUT and TRANSFER_IN in 'pending' status
      // Balance is NOT updated until the work center confirms receipt
      const movementResults = []

      for (const item of items) {
        console.log('🔄 Processing item:', {
          material_id: item.material_id,
          quantity: item.quantity_requested,
          from_location: warehouseLocation.id,
          to_location: workCenterData.location_id
        })

        // Use create_pending_transfer to create pending movements
        const { data: transferResult, error: transferError } = await supabase
          .schema('inventario')
          .rpc('create_pending_transfer', {
            p_product_id: item.material_id,
            p_quantity: item.quantity_requested,
            p_location_id_from: warehouseLocation.id,
            p_location_id_to: workCenterData.location_id,
            p_reference_id: null,
            p_reference_type: 'work_center_transfer',
            p_notes: item.notes || `Traslado a ${workCenterData.name} (${workCenterData.code})`,
            p_recorded_by: user?.id || null
          })

        if (transferError) {
          console.error('❌ Error creating pending transfer:', transferError)
          throw transferError
        }

        console.log('✅ Pending transfer created:', {
          out: transferResult.movement_out_number,
          in: transferResult.movement_in_number,
          status: transferResult.status
        })

        movementResults.push(transferResult)
      }

      console.log(`✅ ${movementResults.length} pending transfers created successfully`)

      await fetchTransfers()

      // Return a transfer-like object for compatibility
      return {
        id: movementResults[0]?.movement_in_id,
        transfer_number: movementResults[0]?.movement_in_number,
        work_center_id: workCenterId,
        status: 'pending',
        movements: movementResults
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creating transfer'
      console.error('❌ Transfer error:', err)
      setError(message)
      throw err
    }
  }

  // Receive/confirm transfer in work center - NEW PENDING SYSTEM
  const receiveTransfer = async (movementInId: string) => {
    try {
      setError(null)

      console.log('🔄 Confirming pending transfer:', movementInId)

      // Confirm the pending transfer - this will update balances
      const { data: result, error: confirmError } = await supabase
        .schema('inventario')
        .rpc('confirm_pending_transfer', {
          p_movement_in_id: movementInId,
          p_confirmed_by: user?.id || null
        })

      if (confirmError) {
        console.error('❌ Error confirming transfer:', confirmError)
        throw confirmError
      }

      console.log('✅ Transfer confirmed:', result)

      await fetchTransfers()

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error confirming transfer'
      console.error('❌ Confirm error:', err)
      setError(message)
      throw err
    }
  }

  // Get pending transfers for a work center
  const getPendingTransfersForWorkCenter = (workCenterId: string) => {
    return transfers.filter(t =>
      t.work_center_id === workCenterId && t.status === 'pending'
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
