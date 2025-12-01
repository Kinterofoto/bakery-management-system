/**
 * Unified Inventory Movements Hook
 *
 * Professional WMS-level inventory management
 * Single source of truth for ALL inventory movements
 *
 * Usage:
 * - Purchase reception: createMovement({ type: 'IN', reason: 'purchase', ... })
 * - Production output: createMovement({ type: 'IN', reason: 'production', ... })
 * - Sale: createMovement({ type: 'OUT', reason: 'sale', ... })
 * - Consumption: createMovement({ type: 'OUT', reason: 'consumption', ... })
 * - Transfer: createTransfer({ from, to, ... })
 * - Adjustment: createMovement({ type: 'IN' or 'OUT', reason: 'adjustment', ... })
 */

"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

// =====================================================
// Types
// =====================================================

export type MovementType = 'IN' | 'OUT' | 'TRANSFER_IN' | 'TRANSFER_OUT'

export type ReasonType =
  | 'purchase'      // Compra a proveedor
  | 'production'    // Producción terminada
  | 'sale'          // Venta
  | 'consumption'   // Consumo de producción
  | 'adjustment'    // Ajuste de inventario
  | 'return'        // Devolución
  | 'waste'         // Desperdicio
  | 'transfer'      // Transferencia
  | 'initial'       // Inventario inicial

export interface InventoryMovement {
  id: string
  movement_number: string
  product_id: string
  quantity: number
  unit_of_measure: string
  movement_type: MovementType
  reason_type: ReasonType
  location_id_from: string | null
  location_id_to: string | null
  linked_movement_id: string | null
  balance_after: number
  reference_id: string | null
  reference_type: string | null
  notes: string | null
  recorded_by: string
  movement_date: string
  created_at: string
}

export interface InventoryBalance {
  id: string
  product_id: string
  location_id: string
  quantity_on_hand: number
  last_movement_id: string | null
  last_updated_at: string
}

export interface Location {
  id: string
  code: string
  name: string
  location_type: 'warehouse' | 'zone' | 'aisle' | 'bin'
  parent_id: string | null
  path: string
  level: number
  is_virtual: boolean
  bin_type: string | null
  is_active: boolean
}

export interface CreateMovementParams {
  productId: string
  quantity: number
  movementType: MovementType
  reasonType: ReasonType
  locationIdFrom?: string | null
  locationIdTo?: string | null
  referenceId?: string | null
  referenceType?: string | null
  notes?: string | null
  batchNumber?: string | null
  expiryDate?: string | null
}

export interface CreateTransferParams {
  productId: string
  quantity: number
  locationIdFrom: string
  locationIdTo: string
  referenceId?: string | null
  referenceType?: string | null
  notes?: string | null
}

// =====================================================
// Hook
// =====================================================

export function useInventoryMovements() {
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [balances, setBalances] = useState<InventoryBalance[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)

  // =====================================================
  // Fetch Locations
  // =====================================================

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .schema('inventario')
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('path')

      if (error) throw error
      setLocations(data || [])
      return data
    } catch (error: any) {
      console.error('Error fetching locations:', error)
      toast.error(error.message || 'Error cargando ubicaciones')
      return null
    }
  }

  // =====================================================
  // Create Movement (Core function)
  // =====================================================

  const createMovement = async (params: CreateMovementParams) => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .schema('inventario')
        .rpc('perform_inventory_movement', {
          p_product_id: params.productId,
          p_quantity: params.quantity,
          p_movement_type: params.movementType,
          p_reason_type: params.reasonType,
          p_location_id_from: params.locationIdFrom || null,
          p_location_id_to: params.locationIdTo || null,
          p_reference_id: params.referenceId || null,
          p_reference_type: params.referenceType || null,
          p_notes: params.notes || null,
          p_recorded_by: null, // Will use auth.uid() in the function
          p_batch_number: params.batchNumber || null,
          p_expiry_date: params.expiryDate || null
        })

      if (error) throw error

      toast.success(`Movimiento ${data.movement_number} creado exitosamente`)

      return data
    } catch (error: any) {
      console.error('Error creating movement:', error)
      toast.error(error.message || 'Error creando movimiento de inventario')
      throw error
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // Create Transfer (Atomic - 2 linked movements)
  // =====================================================

  const createTransfer = async (params: CreateTransferParams) => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .schema('inventario')
        .rpc('perform_transfer', {
          p_product_id: params.productId,
          p_quantity: params.quantity,
          p_location_id_from: params.locationIdFrom,
          p_location_id_to: params.locationIdTo,
          p_reference_id: params.referenceId || null,
          p_reference_type: params.referenceType || null,
          p_notes: params.notes || null,
          p_recorded_by: null, // Will use auth.uid() in the function
        })

      if (error) throw error

      toast.success(`Transferencia completada: ${data.movement_out_number} / ${data.movement_in_number}`)

      return data
    } catch (error: any) {
      console.error('Error creating transfer:', error)
      toast.error(error.message || 'Error creando transferencia')
      throw error
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // Get Product Balance Total
  // =====================================================

  const getProductBalanceTotal = async (productId: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .schema('inventario')
        .rpc('get_product_balance_total', { p_product_id: productId })

      if (error) throw error
      return data || 0
    } catch (error: any) {
      console.error('Error getting product balance:', error)
      return 0
    }
  }

  // =====================================================
  // Get Product Balance By Location
  // =====================================================

  const getProductBalanceByLocation = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .schema('inventario')
        .rpc('get_product_balance_by_location', { p_product_id: productId })

      if (error) throw error
      return data || []
    } catch (error: any) {
      console.error('Error getting product balance by location:', error)
      toast.error(error.message || 'Error cargando balances por ubicación')
      return []
    }
  }

  // =====================================================
  // Fetch Movements (Kardex)
  // =====================================================

  const fetchMovements = async (productId?: string, limit: number = 100) => {
    try {
      setLoading(true)

      let query = supabase
        .schema('inventario')
        .from('inventory_movements')
        .select(`
          *,
          product:product_id(id, name, code),
          location_from:location_id_from(id, code, name),
          location_to:location_id_to(id, code, name)
        `)
        .order('movement_date', { ascending: false })
        .limit(limit)

      if (productId) {
        query = query.eq('product_id', productId)
      }

      const { data, error } = await query

      if (error) throw error
      setMovements(data || [])
      return data
    } catch (error: any) {
      console.error('Error fetching movements:', error)
      toast.error(error.message || 'Error cargando movimientos')
      return []
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // Fetch Balances
  // =====================================================

  const fetchBalances = async (productId?: string) => {
    try {
      setLoading(true)

      let query = supabase
        .schema('inventario')
        .from('inventory_balances')
        .select(`
          *,
          product:product_id(id, name, code),
          location:location_id(id, code, name, location_type)
        `)
        .gt('quantity_on_hand', 0)
        .order('quantity_on_hand', { ascending: false })

      if (productId) {
        query = query.eq('product_id', productId)
      }

      const { data, error } = await query

      if (error) throw error
      setBalances(data || [])
      return data
    } catch (error: any) {
      console.error('Error fetching balances:', error)
      toast.error(error.message || 'Error cargando balances')
      return []
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // Utility Functions
  // =====================================================

  const getMovementTypeLabel = (type: MovementType): string => {
    const labels: Record<MovementType, string> = {
      'IN': 'Entrada',
      'OUT': 'Salida',
      'TRANSFER_IN': 'Transfer. Entrada',
      'TRANSFER_OUT': 'Transfer. Salida',
    }
    return labels[type] || type
  }

  const getReasonTypeLabel = (reason: ReasonType): string => {
    const labels: Record<ReasonType, string> = {
      'purchase': 'Compra',
      'production': 'Producción',
      'sale': 'Venta',
      'consumption': 'Consumo',
      'adjustment': 'Ajuste',
      'return': 'Devolución',
      'waste': 'Desperdicio',
      'transfer': 'Transferencia',
      'initial': 'Inicial',
    }
    return labels[reason] || reason
  }

  const getReasonTypeColor = (reason: ReasonType): string => {
    const colors: Record<ReasonType, string> = {
      'purchase': 'bg-green-100 text-green-800 border-green-300',
      'production': 'bg-blue-100 text-blue-800 border-blue-300',
      'sale': 'bg-purple-100 text-purple-800 border-purple-300',
      'consumption': 'bg-orange-100 text-orange-800 border-orange-300',
      'adjustment': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'return': 'bg-cyan-100 text-cyan-800 border-cyan-300',
      'waste': 'bg-red-100 text-red-800 border-red-300',
      'transfer': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'initial': 'bg-gray-100 text-gray-800 border-gray-300',
    }
    return colors[reason] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  // =====================================================
  // Load locations on mount
  // =====================================================

  useEffect(() => {
    fetchLocations()
  }, [])

  // =====================================================
  // Return
  // =====================================================

  return {
    // State
    movements,
    balances,
    locations,
    loading,

    // Core operations
    createMovement,
    createTransfer,

    // Queries
    getProductBalanceTotal,
    getProductBalanceByLocation,
    fetchMovements,
    fetchBalances,
    fetchLocations,

    // Utilities
    getMovementTypeLabel,
    getReasonTypeLabel,
    getReasonTypeColor,
  }
}

// =====================================================
// Convenience Hooks for Specific Operations
// =====================================================

/**
 * Hook for purchase receptions
 */
export function usePurchaseReception() {
  const { createMovement, loading } = useInventoryMovements()

  const registerReception = async (params: {
    productId: string
    quantity: number
    locationId?: string
    referenceId?: string
    notes?: string
  }) => {
    return createMovement({
      productId: params.productId,
      quantity: params.quantity,
      movementType: 'IN',
      reasonType: 'purchase',
      locationIdTo: params.locationId,
      referenceId: params.referenceId,
      referenceType: 'reception',
      notes: params.notes,
    })
  }

  return { registerReception, loading }
}

/**
 * Hook for production output
 */
export function useProductionOutput() {
  const { createMovement, loading } = useInventoryMovements()

  const registerProductionOutput = async (params: {
    productId: string
    quantity: number
    locationId?: string
    referenceId?: string
    notes?: string
  }) => {
    return createMovement({
      productId: params.productId,
      quantity: params.quantity,
      movementType: 'IN',
      reasonType: 'production',
      locationIdTo: params.locationId,
      referenceId: params.referenceId,
      referenceType: 'production_order',
      notes: params.notes,
    })
  }

  return { registerProductionOutput, loading }
}

/**
 * Hook for material consumption
 */
export function useMaterialConsumption() {
  const { createMovement, loading } = useInventoryMovements()

  const registerConsumption = async (params: {
    productId: string
    quantity: number
    locationId?: string
    referenceId?: string
    notes?: string
  }) => {
    return createMovement({
      productId: params.productId,
      quantity: params.quantity,
      movementType: 'OUT',
      reasonType: 'consumption',
      locationIdFrom: params.locationId,
      referenceId: params.referenceId,
      referenceType: 'production_order',
      notes: params.notes,
    })
  }

  return { registerConsumption, loading }
}
