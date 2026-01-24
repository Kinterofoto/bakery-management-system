"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { startOfDay, addDays, setHours, setMinutes, setSeconds, setMilliseconds, format } from "date-fns"
import { es } from "date-fns/locale"
import { useAuth } from "@/contexts/AuthContext"

export interface ConsolidatedMaterial {
  material_id: string
  material_name: string
  total_quantity: number
  unit: string
  available_stock: number
  has_warning: boolean
  is_delivered: boolean  // true if already has a transfer for this window
  delivered_quantity: number  // quantity already transferred
}

interface PesajeWorkCenter {
  id: string
  name: string
  location_id: string | null
}

/**
 * Set time to 14:00:00.000
 */
function setTo14Hours(date: Date): Date {
  return setMilliseconds(setSeconds(setMinutes(setHours(date, 14), 0), 0), 0)
}

/**
 * Hook para obtener las entregas pendientes consolidadas para el centro de trabajo PESAJE
 * Calcula los materiales necesarios basado en los schedules de la ventana 14:00-14:00
 */
export function usePendingDeliveries(date?: Date) {
  const { user } = useAuth()
  const [consolidatedMaterials, setConsolidatedMaterials] = useState<ConsolidatedMaterial[]>([])
  const [pesajeWorkCenter, setPesajeWorkCenter] = useState<PesajeWorkCenter | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [schedulesCount, setSchedulesCount] = useState(0)

  // Stabilize the date and window dates
  const { dateKey, windowStartISO, windowEndISO } = useMemo(() => {
    const now = new Date()
    const key = date
      ? startOfDay(date).toISOString()
      : startOfDay(now).toISOString()
    const baseDate = new Date(key)

    let start: Date
    if (!date && now.getHours() >= 14) {
      // Si ya pasaron las 14:00 de hoy, la ventana empieza mañana a las 14:00
      start = setTo14Hours(addDays(baseDate, 1))
    } else {
      // Si es antes de las 14:00, o si hay fecha especificada, usar la fecha base
      start = setTo14Hours(baseDate)
    }

    const end = setTo14Hours(addDays(start, 1))

    return {
      dateKey: key,
      windowStartISO: start.toISOString(),
      windowEndISO: end.toISOString()
    }
  }, [date?.getFullYear(), date?.getMonth(), date?.getDate()])

  // Parse window dates for display (stable references)
  const windowStart = useMemo(() => new Date(windowStartISO), [windowStartISO])
  const windowEnd = useMemo(() => new Date(windowEndISO), [windowEndISO])

  const fetchPendingDeliveries = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // 1. Obtener work center PESAJE
      const { data: workCenterData, error: wcError } = await (supabase as any)
        .schema('produccion')
        .from('work_centers')
        .select('id, name, location_id')
        .ilike('name', '%PESAJE%')
        .eq('is_active', true)
        .single()

      if (wcError || !workCenterData) {
        console.error('Error fetching PESAJE work center:', wcError)
        setError('No se encontró el centro de trabajo PESAJE')
        setConsolidatedMaterials([])
        return
      }

      setPesajeWorkCenter(workCenterData)

      // 2. Obtener schedules en ventana 14:00-14:00
      const { data: schedules, error: schedulesError } = await (supabase as any)
        .schema('produccion')
        .from('production_schedules')
        .select('id, product_id, quantity')
        .eq('resource_id', workCenterData.id)
        .gte('start_date', windowStartISO)
        .lt('start_date', windowEndISO)

      if (schedulesError) {
        console.error('Error fetching schedules:', schedulesError)
        setError('Error al obtener los schedules programados')
        return
      }

      if (!schedules || schedules.length === 0) {
        setConsolidatedMaterials([])
        setSchedulesCount(0)
        return
      }

      setSchedulesCount(schedules.length)

      // 3. Obtener product IDs únicos
      const productIds = [...new Set(schedules.map((s: any) => s.product_id))] as string[]

      // 4. Obtener BOMs de todos los productos
      const { data: bomItems, error: bomError } = await (supabase as any)
        .schema('produccion')
        .from('bill_of_materials')
        .select('product_id, material_id, quantity_needed')
        .in('product_id', productIds)
        .eq('is_active', true)

      if (bomError) {
        console.error('Error fetching BOMs:', bomError)
        setError('Error al obtener las recetas de materiales')
        return
      }

      if (!bomItems || bomItems.length === 0) {
        setConsolidatedMaterials([])
        return
      }

      // 5. Obtener IDs de materiales únicos
      const materialIds = [...new Set(bomItems.map((b: any) => b.material_id))] as string[]

      // 6. Obtener información de materiales (solo MP - Materias Primas)
      const { data: materials, error: materialsError } = await supabase
        .from('products')
        .select('id, name, unit, category')
        .in('id', materialIds)
        .eq('category', 'MP')

      if (materialsError) {
        console.error('Error fetching materials:', materialsError)
        setError('Error al obtener información de materiales')
        return
      }

      const materialMap = new Map(materials?.map(m => [m.id, m]) || [])

      // 7. Calcular cantidades consolidadas
      const consolidationMap = new Map<string, {
        material_id: string
        material_name: string
        total_quantity: number
        unit: string
      }>()

      for (const schedule of schedules) {
        // Filtrar BOMs para este producto
        const productBom = bomItems.filter((b: any) => b.product_id === schedule.product_id)

        for (const bomItem of productBom) {
          const material = materialMap.get(bomItem.material_id)
          if (!material) continue // Skip si no es MP

          const qty = bomItem.quantity_needed * schedule.quantity
          const existing = consolidationMap.get(bomItem.material_id)

          if (existing) {
            existing.total_quantity += qty
          } else {
            consolidationMap.set(bomItem.material_id, {
              material_id: bomItem.material_id,
              material_name: material.name,
              total_quantity: qty,
              unit: material.unit || 'kg'
            })
          }
        }
      }

      // 8. Obtener stock disponible en inventario central (WH1-RECEIVING)
      const { data: warehouseLocation } = await supabase
        .schema('inventario')
        .from('locations')
        .select('id')
        .eq('code', 'WH1-RECEIVING')
        .single()

      let stockMap = new Map<string, number>()

      if (warehouseLocation) {
        const consolidatedMaterialIds = [...consolidationMap.keys()]

        if (consolidatedMaterialIds.length > 0) {
          const { data: balances } = await supabase
            .schema('inventario')
            .from('inventory_balances')
            .select('product_id, quantity_on_hand')
            .eq('location_id', warehouseLocation.id)
            .in('product_id', consolidatedMaterialIds)

          stockMap = new Map((balances || []).map(b => [b.product_id, b.quantity_on_hand]))
        }
      }

      // 9. Consultar transferencias ya creadas para esta ventana
      const consolidatedMaterialIds = [...consolidationMap.keys()]
      const deliveryMap = new Map<string, number>()

      if (consolidatedMaterialIds.length > 0 && workCenterData.location_id) {
        const windowLabel = `${format(new Date(windowStartISO), "EEEE d", { locale: es })} 14:00 - ${format(new Date(windowEndISO), "EEEE d", { locale: es })} 14:00`

        const { data: existingTransfers } = await supabase
          .schema('inventario')
          .from('inventory_movements')
          .select('product_id, quantity')
          .eq('reference_type', 'consolidated_pesaje_delivery')
          .eq('location_id_to', workCenterData.location_id)
          .ilike('notes', `%${windowLabel}%`)
          .eq('movement_type', 'TRANSFER_IN')
          .in('product_id', consolidatedMaterialIds)

        for (const transfer of existingTransfers || []) {
          const existing = deliveryMap.get(transfer.product_id) || 0
          deliveryMap.set(transfer.product_id, existing + transfer.quantity)
        }
      }

      // 10. Crear array final con información de stock y entregas
      const result: ConsolidatedMaterial[] = [...consolidationMap.values()].map(item => {
        const availableStock = stockMap.get(item.material_id) || 0
        const deliveredQty = deliveryMap.get(item.material_id) || 0
        return {
          ...item,
          available_stock: availableStock,
          has_warning: availableStock < item.total_quantity,
          is_delivered: deliveredQty > 0,
          delivered_quantity: deliveredQty
        }
      })

      // Ordenar por nombre
      result.sort((a, b) => a.material_name.localeCompare(b.material_name))

      setConsolidatedMaterials(result)
    } catch (err) {
      console.error('Error in fetchPendingDeliveries:', err)
      setError(err instanceof Error ? err.message : 'Error al calcular entregas pendientes')
    } finally {
      setLoading(false)
    }
  }, [windowStartISO, windowEndISO])

  // Initial fetch
  useEffect(() => {
    fetchPendingDeliveries()
  }, [fetchPendingDeliveries])

  // Crear transferencia consolidada
  const createConsolidatedTransfer = useCallback(async (
    materialsWithQuantities: Array<{ material_id: string, quantity: number }>
  ) => {
    if (!pesajeWorkCenter) {
      throw new Error('Centro de trabajo PESAJE no encontrado')
    }

    if (!pesajeWorkCenter.location_id) {
      throw new Error('El centro de trabajo PESAJE no tiene una ubicación asignada')
    }

    if (!materialsWithQuantities || materialsWithQuantities.length === 0) {
      throw new Error('No hay materiales para transferir')
    }

    // Obtener ubicación del warehouse
    const { data: warehouseLocation, error: whError } = await supabase
      .schema('inventario')
      .from('locations')
      .select('id, code, name')
      .eq('code', 'WH1-RECEIVING')
      .single()

    if (whError || !warehouseLocation) {
      throw new Error('No se pudo obtener la ubicación de área de recepción')
    }

    const windowLabel = `${format(windowStart, "EEEE d", { locale: es })} 14:00 - ${format(windowEnd, "EEEE d", { locale: es })} 14:00`

    // Crear transferencia para cada material
    const results = []
    for (const item of materialsWithQuantities) {
      if (item.quantity <= 0) continue

      const { data: transferResult, error: transferError } = await supabase
        .schema('inventario')
        .rpc('create_pending_transfer', {
          p_product_id: item.material_id,
          p_quantity: item.quantity,
          p_location_id_from: warehouseLocation.id,
          p_location_id_to: pesajeWorkCenter.location_id,
          p_reference_id: null,
          p_reference_type: 'consolidated_pesaje_delivery',
          p_notes: `Entrega consolidada PESAJE - ${windowLabel}`,
          p_recorded_by: user?.id || null
        })

      if (transferError) {
        console.error('Error creating transfer for material:', item.material_id, transferError)
        throw transferError
      }

      results.push(transferResult)
    }

    return results
  }, [pesajeWorkCenter, windowStartISO, windowEndISO, user?.id, windowStart])

  // Format window for display
  const windowLabel = useMemo(() => {
    return `${format(windowStart, "EEEE d", { locale: es })} 14:00 - ${format(windowEnd, "EEEE d", { locale: es })} 14:00`
  }, [windowStart, windowEnd])

  return {
    consolidatedMaterials,
    pesajeWorkCenter,
    loading,
    error,
    schedulesCount,
    windowStart,
    windowEnd,
    windowLabel,
    refetch: fetchPendingDeliveries,
    createConsolidatedTransfer
  }
}
