"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type Material = Database["produccion"]["Tables"]["materials"]["Row"]
type MaterialInsert = Database["produccion"]["Tables"]["materials"]["Insert"]
type MaterialUpdate = Database["produccion"]["Tables"]["materials"]["Update"]
type BillOfMaterial = Database["produccion"]["Tables"]["bill_of_materials"]["Row"]
type BillOfMaterialInsert = Database["produccion"]["Tables"]["bill_of_materials"]["Insert"]
type BillOfMaterialUpdate = Database["produccion"]["Tables"]["bill_of_materials"]["Update"]
type MaterialConsumption = Database["produccion"]["Tables"]["material_consumptions"]["Row"]
type MaterialConsumptionInsert = Database["produccion"]["Tables"]["material_consumptions"]["Insert"]

export function useMaterials() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      // Obtener productos que son materias primas (MP) o productos en proceso (PP)
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .in("category", ["MP", "PP"])
        .order("name")

      if (error) throw error
      // Adaptar la estructura de products para que sea compatible con Material
      const adaptedMaterials = (data || []).map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        base_unit: product.unit === 'kg' ? 'gramos' : product.unit === 'litros' ? 'gramos' : product.unit,
        is_active: true, // Los products no tienen is_active, asumimos true
        created_at: product.created_at,
        category: product.category // Agregar categoría para poder diferenciar PP de MP
      }))
      setMaterials(adaptedMaterials)
    } catch (err) {
      console.error("Error fetching materials:", err)
      setError(err instanceof Error ? err.message : "Error fetching materials")
    } finally {
      setLoading(false)
    }
  }, [])

  const createMaterial = useCallback(async (materialData: { name: string, description?: string, unit: string }) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: materialData.name,
          description: materialData.description || null,
          unit: materialData.unit,
          category: "MP"
        })
        .select()
        .single()

      if (error) throw error

      const adaptedMaterial = {
        id: data.id,
        name: data.name,
        description: data.description,
        base_unit: data.unit === 'kg' ? 'gramos' : data.unit === 'litros' ? 'gramos' : data.unit,
        is_active: true,
        created_at: data.created_at
      }

      setMaterials(prev => [...prev, adaptedMaterial])
      return adaptedMaterial
    } catch (err) {
      console.error("Error creating material:", err)
      setError(err instanceof Error ? err.message : "Error creating material")
      throw err
    }
  }, [])

  const updateMaterial = useCallback(async (id: string, updates: { name?: string, description?: string, unit?: string }) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from("products")
        .update({
          name: updates.name,
          description: updates.description,
          unit: updates.unit
        })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      const adaptedMaterial = {
        id: data.id,
        name: data.name,
        description: data.description,
        base_unit: data.unit === 'kg' ? 'gramos' : data.unit === 'litros' ? 'gramos' : data.unit,
        is_active: true,
        created_at: data.created_at
      }

      setMaterials(prev =>
        prev.map(mat => mat.id === id ? adaptedMaterial : mat)
      )
      return adaptedMaterial
    } catch (err) {
      console.error("Error updating material:", err)
      setError(err instanceof Error ? err.message : "Error updating material")
      throw err
    }
  }, [])

  const deleteMaterial = useCallback(async (id: string) => {
    try {
      setError(null)
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id)

      if (error) throw error

      setMaterials(prev => prev.filter(mat => mat.id !== id))
    } catch (err) {
      console.error("Error deleting material:", err)
      setError(err instanceof Error ? err.message : "Error deleting material")
      throw err
    }
  }, [])

  const getActiveMaterials = useCallback(() => {
    return materials.filter(mat => mat.is_active)
  }, [materials])

  const getMaterialById = useCallback((id: string) => {
    return materials.find(mat => mat.id === id)
  }, [materials])

  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])

  return {
    materials,
    loading,
    error,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    getActiveMaterials,
    getMaterialById,
    refetch: fetchMaterials,
  }
}

export function useBillOfMaterials(productId?: string) {
  const [billOfMaterials, setBillOfMaterials] = useState<BillOfMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBillOfMaterials = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      let query = supabase
        .schema("produccion").from("bill_of_materials")
        .select("*")
        .order("created_at")

      if (productId) {
        query = query.eq("product_id", productId)
      }

      const { data, error } = await query

      if (error) throw error
      setBillOfMaterials(data || [])
    } catch (err) {
      console.error("Error fetching bill of materials:", err)
      setError(err instanceof Error ? err.message : "Error fetching bill of materials")
    } finally {
      setLoading(false)
    }
  }, [productId])

  const createBillOfMaterial = useCallback(async (bom: BillOfMaterialInsert) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .schema("produccion").from("bill_of_materials")
        .insert(bom)
        .select()
        .single()

      if (error) throw error
      
      setBillOfMaterials(prev => [...prev, data])
      return data
    } catch (err) {
      console.error("Error creating bill of material:", err)
      setError(err instanceof Error ? err.message : "Error creating bill of material")
      throw err
    }
  }, [])

  const updateBillOfMaterial = useCallback(async (id: string, updates: BillOfMaterialUpdate) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .schema("produccion").from("bill_of_materials")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      
      setBillOfMaterials(prev => 
        prev.map(bom => bom.id === id ? data : bom)
      )
      return data
    } catch (err) {
      console.error("Error updating bill of material:", err)
      setError(err instanceof Error ? err.message : "Error updating bill of material")
      throw err
    }
  }, [])

  const deleteBillOfMaterial = useCallback(async (id: string) => {
    try {
      setError(null)
      const { error } = await supabase
        .schema("produccion").from("bill_of_materials")
        .delete()
        .eq("id", id)

      if (error) throw error
      
      setBillOfMaterials(prev => prev.filter(bom => bom.id !== id))
    } catch (err) {
      console.error("Error deleting bill of material:", err)
      setError(err instanceof Error ? err.message : "Error deleting bill of material")
      throw err
    }
  }, [])

  const getActiveBillOfMaterials = useCallback(() => {
    return billOfMaterials.filter(bom => bom.is_active)
  }, [billOfMaterials])

  useEffect(() => {
    fetchBillOfMaterials()
  }, [fetchBillOfMaterials])

  return {
    billOfMaterials,
    loading,
    error,
    createBillOfMaterial,
    updateBillOfMaterial,
    deleteBillOfMaterial,
    getActiveBillOfMaterials,
    refetch: fetchBillOfMaterials,
  }
}

export function useMaterialConsumptions(shiftProductionId?: string) {
  const [consumptions, setConsumptions] = useState<MaterialConsumption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConsumptions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      let query = supabase
        .schema("produccion").from("material_consumptions")
        .select("*")
        .order("recorded_at", { ascending: false })

      if (shiftProductionId) {
        query = query.eq("shift_production_id", shiftProductionId)
      }

      const { data, error } = await query

      if (error) throw error
      setConsumptions(data || [])
    } catch (err) {
      console.error("Error fetching material consumptions:", err)
      setError(err instanceof Error ? err.message : "Error fetching material consumptions")
    } finally {
      setLoading(false)
    }
  }, [shiftProductionId])

  const addConsumption = useCallback(async (consumption: MaterialConsumptionInsert) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .schema("produccion").from("material_consumptions")
        .insert(consumption)
        .select()
        .single()

      if (error) throw error
      
      setConsumptions(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error("Error adding material consumption:", err)
      setError(err instanceof Error ? err.message : "Error adding material consumption")
      throw err
    }
  }, [])

  const getTotalConsumed = useCallback((materialId: string) => {
    return consumptions
      .filter(c => c.material_id === materialId && c.consumption_type === "consumed")
      .reduce((total, c) => total + c.quantity_consumed, 0)
  }, [consumptions])

  const getTotalWasted = useCallback((materialId: string) => {
    return consumptions
      .filter(c => c.material_id === materialId && c.consumption_type === "wasted")
      .reduce((total, c) => total + c.quantity_consumed, 0)
  }, [consumptions])

  useEffect(() => {
    fetchConsumptions()
  }, [fetchConsumptions])

  return {
    consumptions,
    loading,
    error,
    addConsumption,
    getTotalConsumed,
    getTotalWasted,
    refetch: fetchConsumptions,
  }
}