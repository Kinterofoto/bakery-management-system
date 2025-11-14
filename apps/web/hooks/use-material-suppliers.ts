"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Database } from "@/lib/database.types"

type MaterialSupplier = Database['compras']['Tables']['material_suppliers']['Row']
type MaterialSupplierInsert = Database['compras']['Tables']['material_suppliers']['Insert']
type MaterialSupplierUpdate = Database['compras']['Tables']['material_suppliers']['Update']
type Product = Database['public']['Tables']['products']['Row']
type Supplier = Database['compras']['Tables']['suppliers']['Row']

type MaterialSupplierWithDetails = MaterialSupplier & {
  material?: Product
  supplier?: Supplier
}

export function useMaterialSuppliers() {
  const [materialSuppliers, setMaterialSuppliers] = useState<MaterialSupplierWithDetails[]>([])
  const [materials, setMaterials] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMaterialSuppliers = async () => {
    try {
      setLoading(true)

      // Fetch materials and suppliers (these are essential)
      const [materialsResponse, suppliersResponse] = await Promise.all([
        supabase.from('products').select('*').or('category.eq.mp,category.eq.MP').order('name', { ascending: true }),
        supabase.schema('compras').from('suppliers').select('*').order('company_name', { ascending: true })
      ])

      if (materialsResponse.error) throw materialsResponse.error
      if (suppliersResponse.error) throw suppliersResponse.error

      const materialsData = materialsResponse.data || []
      const suppliersData = suppliersResponse.data || []

      console.log('Materials loaded:', materialsData.length, materialsData)
      console.log('Suppliers loaded:', suppliersData.length)

      setMaterials(materialsData)
      setSuppliers(suppliersData)

      // Try to fetch existing material_suppliers relationships
      // This may fail initially if no assignments exist yet (that's OK)
      try {
        const { data: materialSuppliersData, error: mError } = await supabase
          .schema('compras')
          .from('material_suppliers')
          .select('*')
          .order('created_at', { ascending: false })

        if (!mError && materialSuppliersData) {
          const materialSuppliersWithDetails: MaterialSupplierWithDetails[] = materialSuppliersData.map(ms => ({
            ...ms,
            material: materialsData.find(m => m.id === ms.material_id),
            supplier: suppliersData.find(s => s.id === ms.supplier_id)
          }))
          setMaterialSuppliers(materialSuppliersWithDetails)
        }
      } catch (innerErr) {
        // Silently ignore material_suppliers fetch errors
        console.debug('Material suppliers not yet available (this is normal on first load)')
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching material suppliers:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const getMaterialSuppliersByMaterial = (materialId: string): MaterialSupplierWithDetails[] => {
    return materialSuppliers.filter(ms => ms.material_id === materialId)
  }

  const getMaterialSuppliersBySupplier = (supplierId: string): MaterialSupplierWithDetails[] => {
    return materialSuppliers.filter(ms => ms.supplier_id === supplierId)
  }

  const getPreferredSupplier = (materialId: string): MaterialSupplierWithDetails | null => {
    return materialSuppliers.find(ms => ms.material_id === materialId && ms.is_preferred) || null
  }

  const getBestPriceSupplier = (materialId: string): MaterialSupplierWithDetails | null => {
    const suppliers = getMaterialSuppliersByMaterial(materialId).filter(ms => ms.status === 'active')
    if (suppliers.length === 0) return null

    return suppliers.reduce((best, current) => {
      return current.unit_price < best.unit_price ? current : best
    })
  }

  const createMaterialSupplier = async (materialSupplierData: MaterialSupplierInsert): Promise<MaterialSupplier | null> => {
    try {
      // Check if relationship already exists
      const existing = materialSuppliers.find(
        ms => ms.material_id === materialSupplierData.material_id && ms.supplier_id === materialSupplierData.supplier_id
      )

      if (existing) {
        setError('Esta relación material-proveedor ya existe')
        return null
      }

      const { data, error } = await supabase
        .schema('compras')
        .from('material_suppliers')
        .insert([materialSupplierData])
        .select()
        .single()

      if (error) throw error

      await fetchMaterialSuppliers() // Refresh the list
      return data
    } catch (err) {
      console.error('Error creating material supplier:', err)
      setError(err instanceof Error ? err.message : 'Error al crear relación material-proveedor')
      return null
    }
  }

  const updateMaterialSupplier = async (id: string, updates: MaterialSupplierUpdate): Promise<boolean> => {
    try {
      const { error } = await supabase
        .schema('compras')
        .from('material_suppliers')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      await fetchMaterialSuppliers() // Refresh the list
      return true
    } catch (err) {
      console.error('Error updating material supplier:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar relación')
      return false
    }
  }

  const setPreferredSupplier = async (materialId: string, supplierId: string): Promise<boolean> => {
    try {
      // First, unset any existing preferred supplier for this material
      const currentPreferred = materialSuppliers.filter(
        ms => ms.material_id === materialId && ms.is_preferred
      )

      for (const ms of currentPreferred) {
        await supabase
          .schema('compras')
          .from('material_suppliers')
          .update({ is_preferred: false })
          .eq('id', ms.id)
      }

      // Then set the new preferred supplier
      const targetMs = materialSuppliers.find(
        ms => ms.material_id === materialId && ms.supplier_id === supplierId
      )

      if (!targetMs) {
        setError('Relación material-proveedor no encontrada')
        return false
      }

      return await updateMaterialSupplier(targetMs.id, { is_preferred: true })
    } catch (err) {
      console.error('Error setting preferred supplier:', err)
      setError(err instanceof Error ? err.message : 'Error al configurar proveedor preferido')
      return false
    }
  }

  const toggleMaterialSupplierStatus = async (id: string, currentStatus: string): Promise<boolean> => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    return updateMaterialSupplier(id, { status: newStatus })
  }

  const deleteMaterialSupplier = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .schema('compras')
        .from('material_suppliers')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchMaterialSuppliers() // Refresh the list
      return true
    } catch (err) {
      console.error('Error deleting material supplier:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar relación')
      return false
    }
  }

  const getActiveMaterialSuppliers = (materialId?: string): MaterialSupplierWithDetails[] => {
    let filtered = materialSuppliers.filter(ms => ms.status === 'active')
    if (materialId) {
      filtered = filtered.filter(ms => ms.material_id === materialId)
    }
    return filtered
  }

  const searchMaterialSuppliers = (query: string): MaterialSupplierWithDetails[] => {
    const lowerQuery = query.toLowerCase()
    return materialSuppliers.filter(ms =>
      ms.material?.name.toLowerCase().includes(lowerQuery) ||
      ms.supplier?.company_name.toLowerCase().includes(lowerQuery) ||
      ms.presentation?.toLowerCase().includes(lowerQuery)
    )
  }

  const calculateOrderQuantity = (quantityNeeded: number, packagingUnit: number): number => {
    // Round up to the nearest packaging unit
    return Math.ceil(quantityNeeded / packagingUnit) * packagingUnit
  }

  const calculateOrderCost = (quantityNeeded: number, materialSupplierId: string): number | null => {
    const ms = materialSuppliers.find(item => item.id === materialSupplierId)
    if (!ms) return null

    const orderQuantity = calculateOrderQuantity(quantityNeeded, ms.packaging_unit || 1)
    return orderQuantity * ms.unit_price
  }

  useEffect(() => {
    fetchMaterialSuppliers()
  }, [])

  return {
    materialSuppliers,
    materials,
    suppliers,
    loading,
    error,
    fetchMaterialSuppliers,
    getMaterialSuppliersByMaterial,
    getMaterialSuppliersBySupplier,
    getPreferredSupplier,
    getBestPriceSupplier,
    createMaterialSupplier,
    updateMaterialSupplier,
    setPreferredSupplier,
    toggleMaterialSupplierStatus,
    deleteMaterialSupplier,
    getActiveMaterialSuppliers,
    searchMaterialSuppliers,
    calculateOrderQuantity,
    calculateOrderCost,
  }
}
