"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface MaterialRequirement {
  material_id: string
  material_name: string
  material_unit: string
  date: string // Fecha de entrega (2 días antes de la producción)
  production_date: string // Fecha original de producción
  quantity_needed: number // Cantidad en gramos
  products: {
    product_id: string
    product_name: string
    production_quantity: number
    material_quantity_needed: number // Cantidad en gramos
  }[]
}

export interface MaterialExplosionData {
  materials: {
    id: string
    name: string
    unit: string
  }[]
  dates: string[] // Fechas únicas ordenadas
  requirements: Map<string, Map<string, MaterialRequirement>> // material_id -> date -> requirement
}

const LEAD_TIME_DAYS = 2 // Tiempo de anticipación en días

export function useMaterialExplosion() {
  const [data, setData] = useState<MaterialExplosionData>({
    materials: [],
    dates: [],
    requirements: new Map()
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Función para restar días a una fecha
  const subtractDays = (date: string, days: number): string => {
    const d = new Date(date)
    d.setDate(d.getDate() - days)
    return d.toISOString().split('T')[0]
  }

  // Función para formatear fecha como YYYY-MM-DD
  const formatDate = (date: string): string => {
    return new Date(date).toISOString().split('T')[0]
  }

  const calculateMaterialExplosion = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. Obtener todos los production schedules
      const { data: schedules, error: schedulesError } = await supabase
        .schema('produccion')
        .from('production_schedules')
        .select('*')
        .order('start_date', { ascending: true })

      if (schedulesError) throw schedulesError

      if (!schedules || schedules.length === 0) {
        setData({
          materials: [],
          dates: [],
          requirements: new Map()
        })
        setLoading(false)
        return
      }

      // 2. Obtener todos los productos únicos en los schedules
      const productIds = [...new Set(schedules.map(s => s.product_id))]

      // 3. Obtener información de productos
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, unit, category')
        .in('id', productIds)

      if (productsError) throw productsError

      // 4. Obtener todos los BOMs para estos productos
      const { data: boms, error: bomsError } = await supabase
        .schema('produccion')
        .from('bill_of_materials')
        .select('*')
        .in('product_id', productIds)
        .eq('is_active', true)

      if (bomsError) throw bomsError

      if (!boms || boms.length === 0) {
        toast.info('No hay bill of materials configurado para los productos programados')
        setData({
          materials: [],
          dates: [],
          requirements: new Map()
        })
        setLoading(false)
        return
      }

      // 5. Obtener información de materiales (productos MP)
      const materialIds = [...new Set(boms.map(b => b.material_id))]
      const { data: materials, error: materialsError } = await supabase
        .from('products')
        .select('id, name, unit')
        .in('id', materialIds)
        .eq('category', 'MP')

      if (materialsError) throw materialsError

      // 6. Calcular explosión de materiales
      const requirementsMap = new Map<string, Map<string, MaterialRequirement>>()
      const datesSet = new Set<string>()

      schedules.forEach(schedule => {
        // Calcular fecha de entrega (restar LEAD_TIME_DAYS días)
        const productionDate = formatDate(schedule.start_date)
        const deliveryDate = subtractDays(schedule.start_date, LEAD_TIME_DAYS)
        datesSet.add(deliveryDate)

        // Obtener BOM del producto
        const productBoms = boms.filter(b => b.product_id === schedule.product_id)
        const product = products?.find(p => p.id === schedule.product_id)

        productBoms.forEach(bom => {
          const material = materials?.find(m => m.id === bom.material_id)
          if (!material) return

          // Calcular cantidad total de material necesario
          const materialQuantity = bom.quantity_needed * schedule.quantity

          // Obtener o crear el mapa de fechas para este material
          if (!requirementsMap.has(material.id)) {
            requirementsMap.set(material.id, new Map())
          }
          const materialDatesMap = requirementsMap.get(material.id)!

          // Obtener o crear el requirement para esta fecha
          if (!materialDatesMap.has(deliveryDate)) {
            materialDatesMap.set(deliveryDate, {
              material_id: material.id,
              material_name: material.name,
              material_unit: material.unit,
              date: deliveryDate,
              production_date: productionDate,
              quantity_needed: 0,
              products: []
            })
          }

          const requirement = materialDatesMap.get(deliveryDate)!
          requirement.quantity_needed += materialQuantity
          requirement.products.push({
            product_id: schedule.product_id,
            product_name: product?.name || 'Producto desconocido',
            production_quantity: schedule.quantity,
            material_quantity_needed: materialQuantity
          })
        })
      })

      // 7. Ordenar fechas
      const sortedDates = Array.from(datesSet).sort()

      // 8. Ordenar materiales alfabéticamente
      const sortedMaterials = materials
        ? [...materials].sort((a, b) => a.name.localeCompare(b.name))
        : []

      setData({
        materials: sortedMaterials,
        dates: sortedDates,
        requirements: requirementsMap
      })

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error calculando explosión de materiales'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Obtener requirement para un material en una fecha específica
  const getRequirement = useCallback((materialId: string, date: string): MaterialRequirement | null => {
    const materialMap = data.requirements.get(materialId)
    if (!materialMap) return null
    return materialMap.get(date) || null
  }, [data.requirements])

  // Cargar datos al montar
  useEffect(() => {
    calculateMaterialExplosion()
  }, [calculateMaterialExplosion])

  return {
    data,
    loading,
    error,
    refresh: calculateMaterialExplosion,
    getRequirement
  }
}
