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

      // Fetch transfer movements (reason_type = 'transfer')
      const { data: movementsData, error: queryError } = await supabase
        .schema('inventario')
        .from('inventory_movements')
        .select('*')
        .eq('reason_type', 'transfer')
        .order('created_at', { ascending: false })
        .limit(50)

      console.log('🔄 Movements result:', { count: movementsData?.length, error: queryError })

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

      // Group movements by movement_number (each transfer can have multiple items)
      const groupedTransfers: Record<string, any> = {}

      for (const movement of movementsData || []) {
        const key = movement.movement_number
        const product = productMap.get(movement.product_id)
        const location = locationMap.get(movement.location_id_to)

        if (!groupedTransfers[key]) {
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
            status: 'completed', // Transfers via movements are immediate
            requested_by: movement.recorded_by,
            requested_at: movement.created_at,
            created_at: movement.created_at,
            items: []
          }
        }

        groupedTransfers[key].items.push({
          id: movement.id,
          material_id: movement.product_id,
          material_name: product?.name || 'Desconocido',
          quantity_requested: movement.quantity,
          quantity_received: movement.quantity,
          unit_of_measure: movement.unit_of_measure || product?.unit,
          batch_number: movement.batch_number,
          expiry_date: movement.expiry_date,
          notes: movement.notes
        })
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

  // Create transfer with multiple items - NEW INVENTORY SYSTEM
  const createTransfer = async (workCenterId: string, items: Array<any>) => {
    try {
      setError(null)

      console.log('🔄 Creating transfer for work center:', workCenterId)
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

      // Get the main warehouse location (WH1-GENERAL)
      const { data: warehouseLocation, error: whError } = await supabase
        .schema('inventario')
        .from('locations')
        .select('id, code, name')
        .eq('code', 'WH1-GENERAL')
        .single()

      if (whError || !warehouseLocation) {
        console.error('❌ Error fetching warehouse location:', whError)
        throw new Error('No se pudo obtener la ubicación de bodega principal')
      }

      console.log('✅ Warehouse location:', warehouseLocation.id, warehouseLocation.code)

      // NEW SYSTEM: Use perform_transfer RPC for each item
      // This creates TRANSFER_OUT and TRANSFER_IN atomically with proper linking
      const movementResults = []

      for (const item of items) {
        console.log('🔄 Processing item:', item.material_id, item.quantity_requested)

        // Use perform_transfer to create both movements atomically
        const { data: transferResult, error: transferError } = await supabase
          .schema('inventario')
          .rpc('perform_transfer', {
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
          console.error('❌ Error creating transfer:', transferError)
          throw transferError
        }

        console.log('✅ Transfer created:', {
          out: transferResult.movement_out_number,
          in: transferResult.movement_in_number
        })

        movementResults.push(transferResult)
      }

      console.log(`✅ ${movementResults.length} transfers created successfully`)

      await fetchTransfers()

      // Return a transfer-like object for compatibility
      return {
        id: movementResults[0]?.movement_out_id,
        transfer_number: movementResults[0]?.movement_out_number,
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

  // Receive transfer in work center - DEPRECATED in new system
  // In the new inventory system, transfers are immediate (no pending state)
  const receiveTransfer = async (transferId: string, items: Array<any>) => {
    console.warn('⚠️ receiveTransfer is deprecated in the new inventory system')
    console.log('Transfers are now immediate and do not require separate receipt')

    // In new system, transfers are already completed when created
    // This function is kept for backward compatibility but does nothing
    await fetchTransfers()
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
