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

  // Fetch all returns with items
  const fetchReturns = async () => {
    try {
      setLoading(true)

      // Fetch return headers
      const { data: returnData, error: queryError } = await (supabase as any)
        .schema('compras')
        .from('material_returns')
        .select('*')
        .order('created_at', { ascending: false })

      if (queryError) throw queryError

      // Fetch all items for these returns
      const returnIds = returnData?.map(r => r.id) || []
      const { data: itemsData, error: itemsError } = await (supabase as any)
        .schema('compras')
        .from('return_items')
        .select('*')
        .in('return_id', returnIds)

      if (itemsError) throw itemsError

      // Fetch work centers
      const workCenterIds = returnData?.map(r => r.work_center_id) || []
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

      // Combine returns with their items and material names
      const returnsWithItems = returnData?.map(ret => ({
        ...ret,
        work_center: workCenterMap.get(ret.work_center_id),
        items: (itemsData?.filter(item => item.return_id === ret.id) || []).map(item => ({
          ...item,
          material_name: materialMap.get(item.material_id)?.name || 'Desconocido',
          unit_of_measure: item.unit_of_measure || materialMap.get(item.material_id)?.unit
        }))
      })) || []

      setReturns(returnsWithItems as MaterialReturnWithDetails[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching returns')
    } finally {
      setLoading(false)
    }
  }

  // Create return with multiple items - NEW INVENTORY SYSTEM
  const createReturn = async (workCenterId: string, items: Array<any>, reason?: string, notes?: string) => {
    try {
      setError(null)

      console.log('🔄 Creating return from work center:', workCenterId)
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

      // Create inventory movements for each returned item
      // Returns are OUT movements from work center back to warehouse
      const movementResults = []

      for (const item of items) {
        console.log('🔄 Processing return item:', {
          material_id: item.material_id,
          quantity: item.quantity_returned,
          from_location: workCenterData.location_id,
          to_location: warehouseLocation.id
        })

        // Use perform_transfer to move items back to warehouse
        const { data: transferResult, error: transferError } = await supabase
          .schema('inventario')
          .rpc('perform_transfer', {
            p_product_id: item.material_id,
            p_quantity: item.quantity_returned,
            p_location_id_from: workCenterData.location_id,
            p_location_id_to: warehouseLocation.id,
            p_reference_id: null,
            p_reference_type: 'material_return',
            p_notes: `Devolución desde ${workCenterData.name}: ${reason || item.notes || 'Material devuelto'}`,
            p_recorded_by: user?.id || null
          })

        if (transferError) {
          console.error('❌ Error creating return movement:', transferError)
          throw transferError
        }

        console.log('✅ Return movement created:', {
          out: transferResult.movement_out_number,
          in: transferResult.movement_in_number
        })

        movementResults.push(transferResult)
      }

      console.log(`✅ ${movementResults.length} return movements created successfully`)

      await fetchReturns()

      // Return a compatible object
      return {
        id: movementResults[0]?.movement_out_id,
        work_center_id: workCenterId,
        status: 'completed', // Returns are immediate in new system
        movements: movementResults
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creating return'
      console.error('❌ Return error:', err)
      setError(message)
      throw err
    }
  }

  // Accept return in compras module
  const acceptReturn = async (returnId: string) => {
    try {
      setError(null)

      // Update return status to received
      const { error: updateError } = await (supabase as any)
        .schema('compras')
        .from('material_returns')
        .update({
          status: 'received',
          accepted_by: user?.id,
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', returnId)

      if (updateError) throw updateError

      await fetchReturns()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error accepting return'
      setError(message)
      throw err
    }
  }

  // Get pending returns for compras module (not yet accepted)
  const getPendingReturns = () => {
    return returns.filter(r => r.status === 'pending_receipt')
  }

  // Get pending returns for a specific work center
  const getPendingReturnsByWorkCenter = (workCenterId: string) => {
    return returns.filter(r =>
      r.work_center_id === workCenterId && r.status === 'pending_receipt'
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
