"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"

type MaterialReturn = any
type ReturnItem = any
type WorkCenter = any

type MaterialReturnWithDetails = MaterialReturn & {
  items?: ReturnItem[]
  work_center?: WorkCenter
}

export function useMaterialReturns() {
  const { user } = useAuth()
  const [returns, setReturns] = useState<MaterialReturnWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all returns with items - NEW INVENTORY SYSTEM
  const fetchReturns = async () => {
    try {
      setLoading(true)

      console.log('🔄 Fetching returns from new inventory system...')

      // Fetch TRANSFER_IN movements with reason_type='return'
      const { data: movementsData, error: queryError } = await supabase
        .schema('inventario')
        .from('inventory_movements')
        .select('*')
        .eq('reason_type', 'return')
        .eq('movement_type', 'TRANSFER_IN') // Only get incoming returns to warehouse
        .order('created_at', { ascending: false })
        .limit(100)

      console.log('🔄 Return movements:', { count: movementsData?.length, error: queryError })

      if (queryError) throw queryError

      // Get unique product IDs and location IDs
      const productIds = [...new Set(movementsData?.map(m => m.product_id) || [])]
      const locationIds = [...new Set(movementsData?.map(m => m.location_id_from).filter(Boolean) || [])]

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

      // Each TRANSFER_IN return movement becomes a return
      const returnsArray = movementsData?.map(movement => {
        const product = productMap.get(movement.product_id)
        const location = locationMap.get(movement.location_id_from)

        return {
          id: movement.id,
          return_number: movement.movement_number,
          work_center_id: movement.location_id_from,
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
          accepted_at: movement.received_at,
          accepted_by: movement.received_by,
          notes: movement.notes,
          items: [{
            id: movement.id,
            material_id: movement.product_id,
            material_name: product?.name || 'Desconocido',
            quantity_returned: movement.quantity,
            unit_of_measure: movement.unit_of_measure || product?.unit,
            batch_number: movement.batch_number,
            expiry_date: movement.expiry_date,
            notes: movement.notes
          }]
        }
      }) || []

      console.log('✅ Formatted returns:', returnsArray.length)

      setReturns(returnsArray as MaterialReturnWithDetails[])
      setError(null)
    } catch (err) {
      console.error('❌ Error fetching returns:', err)
      setError(err instanceof Error ? err.message : 'Error fetching returns')
    } finally {
      setLoading(false)
    }
  }

  // Create return with multiple items - NEW PENDING RETURN SYSTEM
  const createReturn = async (workCenterId: string, items: Array<any>, reason?: string, notes?: string) => {
    try {
      setError(null)

      console.log('🔄 Creating pending return from work center:', workCenterId)
      console.log('🔄 Items:', items)

      // Get the work center location
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
        throw new Error(`El centro de trabajo ${workCenterData.name} no tiene una ubicación asignada`)
      }

      console.log('✅ Work center location:', workCenterData.location_id, workCenterData.code)

      // Get the warehouse receiving location (WH1-RECEIVING)
      const { data: warehouseLocation, error: whError } = await supabase
        .schema('inventario')
        .from('locations')
        .select('id, code, name')
        .eq('code', 'WH1-RECEIVING')
        .single()

      if (whError || !warehouseLocation) {
        console.error('❌ Error fetching warehouse location:', whError)
        throw new Error('No se pudo obtener la ubicación de bodega')
      }

      console.log('✅ Warehouse location:', warehouseLocation.id, warehouseLocation.code)

      // Create PENDING return movements for each item
      // These will NOT update inventory until approved by warehouse
      const movementResults = []

      for (const item of items) {
        console.log('🔄 Processing pending return item:', {
          material_id: item.material_id,
          quantity: item.quantity_returned,
          from_location: workCenterData.location_id,
          to_location: warehouseLocation.id
        })

        // Use create_pending_return to create pending return
        const { data: returnResult, error: returnError } = await supabase
          .schema('inventario')
          .rpc('create_pending_return', {
            p_product_id: item.material_id,
            p_quantity: item.quantity_returned,
            p_location_id_from: workCenterData.location_id,
            p_location_id_to: warehouseLocation.id,
            p_reference_id: null,
            p_reference_type: 'material_return',
            p_notes: `${reason ? reason + ': ' : ''}${item.notes || 'Material devuelto desde ' + workCenterData.name}`,
            p_recorded_by: user?.id || null
          })

        if (returnError) {
          console.error('❌ Error creating pending return:', returnError)
          throw returnError
        }

        console.log('✅ Pending return created:', {
          out: returnResult.movement_out_number,
          in: returnResult.movement_in_number,
          status: returnResult.status
        })

        movementResults.push(returnResult)
      }

      console.log(`✅ ${movementResults.length} pending returns created successfully`)

      await fetchReturns()

      // Return a compatible object
      return {
        id: movementResults[0]?.movement_in_id,
        work_center_id: workCenterId,
        status: 'pending', // Returns are pending until warehouse accepts
        movements: movementResults
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creating return'
      console.error('❌ Return error:', err)
      setError(message)
      throw err
    }
  }

  // Accept return in compras module - NEW PENDING SYSTEM
  const acceptReturn = async (movementInId: string) => {
    try {
      setError(null)

      console.log('✅ Accepting pending return:', movementInId)

      // Confirm the pending return - this will update balances
      const { data: result, error: acceptError } = await supabase
        .schema('inventario')
        .rpc('accept_pending_return', {
          p_movement_in_id: movementInId,
          p_accepted_by: user?.id || null
        })

      if (acceptError) {
        console.error('❌ Error accepting return:', acceptError)
        throw acceptError
      }

      console.log('✅ Return accepted:', result)

      await fetchReturns()

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error accepting return'
      console.error('❌ Accept error:', err)
      setError(message)
      throw err
    }
  }

  // Get pending returns for compras module (not yet accepted)
  const getPendingReturns = () => {
    return returns.filter(r => r.status === 'pending')
  }

  // Get pending returns for a specific work center
  const getPendingReturnsByWorkCenter = (workCenterId: string) => {
    return returns.filter(r =>
      r.work_center_id === workCenterId && r.status === 'pending'
    )
  }

  // Get returns by work center
  const getReturnsByWorkCenter = (workCenterId: string) => {
    return returns.filter(r => r.work_center_id === workCenterId)
  }

  // Get returns by status
  const getReturnsByStatus = (status: string) => {
    return returns.filter(r => r.status === status)
  }

  // Get return by ID with full details
  const getReturnById = (returnId: string) => {
    return returns.find(r => r.id === returnId)
  }

  useEffect(() => {
    fetchReturns()
  }, [])

  return {
    returns,
    loading,
    error,
    fetchReturns,
    createReturn,
    acceptReturn,
    getPendingReturns,
    getPendingReturnsByWorkCenter,
    getReturnsByWorkCenter,
    getReturnsByStatus,
    getReturnById
  }
}
