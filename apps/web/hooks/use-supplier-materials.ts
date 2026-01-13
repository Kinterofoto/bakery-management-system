"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type SupplierWithToken = {
  id: string
  company_name: string
  nit: string
  access_token: string
  delivery_days?: any
  contact_person_name?: string
  contact_email?: string
  contact_phone?: string
}

type Material = {
  id: string
  name: string
  code?: string
  unit?: string
  description?: string
}

type MaterialSupplier = {
  id: string
  material_id: string
  supplier_id: string
  presentation: string
  unit_price: number
  packaging_weight_grams: number // Total weight in grams per package
  status: string
  material?: Material
}

type MaterialSupplierInsert = {
  material_id: string
  supplier_id: string
  presentation: string
  unit_price: number
  packaging_weight_grams: number
  status?: string
}

type MaterialSupplierUpdate = {
  presentation?: string
  unit_price?: number
  packaging_weight_grams?: number
  status?: string
}

export function useSupplierMaterials(accessToken: string) {
  const [supplier, setSupplier] = useState<SupplierWithToken | null>(null)
  const [materials, setMaterials] = useState<MaterialSupplier[]>([])
  const [allMaterials, setAllMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch supplier by access token
  const fetchSupplier = async () => {
    try {
      const { data, error } = await supabase
        .schema('compras')
        .from('suppliers')
        .select('id, company_name, nit, access_token, delivery_days, contact_person_name, contact_email, contact_phone')
        .eq('access_token', accessToken)
        .single()

      if (error) throw error

      setSupplier(data)
      return data
    } catch (err) {
      console.error('Error fetching supplier:', err)
      setError(err instanceof Error ? err.message : 'Error al obtener proveedor')
      return null
    }
  }

  // Fetch materials assigned to this supplier
  const fetchMaterials = async (supplierId: string) => {
    try {
      // Step 1: Fetch material_suppliers
      const { data: assignments, error: assignmentsError } = await supabase
        .schema('compras')
        .from('material_suppliers')
        .select('id, material_id, supplier_id, presentation, unit_price, packaging_weight_grams, status')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false })

      if (assignmentsError) throw assignmentsError

      if (!assignments || assignments.length === 0) {
        setMaterials([])
        return
      }

      // Step 2: Fetch corresponding products
      const materialIds = assignments.map(a => a.material_id)
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, code, unit, description')
        .in('id', materialIds)

      if (productsError) throw productsError

      // Step 3: Combine data manually
      const productsMap = new Map(products?.map(p => [p.id, p]) || [])
      const combinedData = assignments.map(assignment => ({
        ...assignment,
        material: productsMap.get(assignment.material_id) || null
      }))

      setMaterials(combinedData)
    } catch (err) {
      console.error('Error fetching materials:', err)
      setError(err instanceof Error ? err.message : 'Error al obtener materiales')
    }
  }

  // Fetch all available materials (category MP)
  const fetchAllMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or('category.eq.MP,category.eq.mp')
        .order('name', { ascending: true })

      if (error) throw error

      // Filter only active materials (is_active !== false, including null)
      const activeMaterials = (data || []).filter((m: any) => m.is_active !== false)
      setAllMaterials(activeMaterials)
    } catch (err) {
      console.error('Error fetching all materials:', err)
    }
  }

  // Create a new material (if it doesn't exist)
  const createMaterial = async (materialData: {
    name: string
    code?: string
    unit?: string
    description?: string
  }): Promise<Material | null> => {
    try {
      const insertData: any = {
        name: materialData.name,
        unit: materialData.unit || 'g',
        category: 'MP',
        is_active: true
      }

      // Add optional fields only if provided
      if (materialData.code) {
        insertData.code = materialData.code
      }
      if (materialData.description) {
        insertData.description = materialData.description
      }

      const { data, error } = await supabase
        .from('products')
        .insert([insertData])
        .select()
        .single()

      if (error) throw error

      // Refresh all materials list
      await fetchAllMaterials()

      return data
    } catch (err) {
      console.error('Error creating material:', err)
      setError(err instanceof Error ? err.message : 'Error al crear material')
      return null
    }
  }

  // Assign material to supplier
  const assignMaterial = async (materialAssignment: MaterialSupplierInsert): Promise<boolean> => {
    try {
      const { error } = await supabase
        .schema('compras')
        .from('material_suppliers')
        .insert([materialAssignment])

      if (error) throw error

      // Refresh materials list
      if (supplier) {
        await fetchMaterials(supplier.id)
      }
      return true
    } catch (err) {
      console.error('Error assigning material:', err)
      setError(err instanceof Error ? err.message : 'Error al asignar material')
      return false
    }
  }

  // Update material assignment
  const updateMaterialAssignment = async (
    assignmentId: string,
    updates: MaterialSupplierUpdate
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .schema('compras')
        .from('material_suppliers')
        .update(updates)
        .eq('id', assignmentId)

      if (error) throw error

      // Refresh materials list
      if (supplier) {
        await fetchMaterials(supplier.id)
      }
      return true
    } catch (err) {
      console.error('Error updating material assignment:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar asignación')
      return false
    }
  }

  // Delete material assignment
  const deleteMaterialAssignment = async (assignmentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .schema('compras')
        .from('material_suppliers')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error

      // Refresh materials list
      if (supplier) {
        await fetchMaterials(supplier.id)
      }
      return true
    } catch (err) {
      console.error('Error deleting material assignment:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar asignación')
      return false
    }
  }

  // Update supplier delivery days
  const updateDeliveryDays = async (deliveryDays: any): Promise<boolean> => {
    try {
      if (!supplier) return false

      const { error } = await supabase
        .schema('compras')
        .from('suppliers')
        .update({ delivery_days: deliveryDays })
        .eq('id', supplier.id)

      if (error) throw error

      // Refresh supplier data
      await fetchSupplier()
      return true
    } catch (err) {
      console.error('Error updating delivery days:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar días de entrega')
      return false
    }
  }

  // Calculate price per gram
  const calculatePricePerGram = (unitPrice: number, packagingWeightGrams: number): number => {
    if (packagingWeightGrams === 0) return 0
    return unitPrice / packagingWeightGrams
  }

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true)
      const supplierData = await fetchSupplier()
      if (supplierData) {
        await Promise.all([
          fetchMaterials(supplierData.id),
          fetchAllMaterials()
        ])
      }
      setLoading(false)
    }

    initializeData()
  }, [accessToken])

  return {
    supplier,
    materials,
    allMaterials,
    loading,
    error,
    createMaterial,
    assignMaterial,
    updateMaterialAssignment,
    deleteMaterialAssignment,
    updateDeliveryDays,
    calculatePricePerGram,
    refreshMaterials: () => supplier && fetchMaterials(supplier.id),
    refreshAllMaterials: fetchAllMaterials,
  }
}
