"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

type BillOfMaterials = Database["produccion"]["Tables"]["bill_of_materials"]["Row"]
type BillOfMaterialsInsert = Database["produccion"]["Tables"]["bill_of_materials"]["Insert"]
type BillOfMaterialsUpdate = Database["produccion"]["Tables"]["bill_of_materials"]["Update"]

export function useBillOfMaterials() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getBOMByProduct = useCallback(async (productId: string) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("created_at", { ascending: true })

      if (error) throw error
      return data || []
    } catch (err) {
      console.error("Error fetching BOM:", err)
      setError(err instanceof Error ? err.message : "Error fetching BOM")
      return []
    }
  }, [])

  const getBOMWithMaterialNames = useCallback(async (productId: string) => {
    try {
      setError(null)
      setLoading(true)
      
      // Primero obtener el BOM
      const bom = await getBOMByProduct(productId)
      
      if (bom.length === 0) {
        return []
      }

      // Luego obtener los nombres de los materiales (productos con categoría MP)
      const materialIds = bom.map(item => item.material_id)
      const { data: materials, error: materialsError } = await supabase
        .from("products")
        .select("id, name, unit")
        .in("id", materialIds)
        .eq("category", "MP")

      if (materialsError) throw materialsError

      // Combinar BOM con nombres de materiales
      const bomWithNames = bom.map(bomItem => {
        const material = materials?.find(m => m.id === bomItem.material_id)
        return {
          ...bomItem,
          material_name: material?.name || "Material no encontrado",
          material_unit: material?.unit || bomItem.unit_name
        }
      })

      return bomWithNames
    } catch (err) {
      console.error("Error fetching BOM with material names:", err)
      setError(err instanceof Error ? err.message : "Error fetching BOM with material names")
      return []
    } finally {
      setLoading(false)
    }
  }, [getBOMByProduct])

  const checkProductHasBOM = useCallback(async (productId: string): Promise<boolean> => {
    try {
      const bom = await getBOMByProduct(productId)
      return bom.length > 0
    } catch (err) {
      console.error("Error checking if product has BOM:", err)
      return false
    }
  }, [getBOMByProduct])

  const createBOMItem = useCallback(async (bomItem: BillOfMaterialsInsert) => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .insert(bomItem)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.error("Error creating BOM item:", err)
      setError(err instanceof Error ? err.message : "Error creating BOM item")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateBOMItem = useCallback(async (
    id: string,
    updates: BillOfMaterialsUpdate
  ) => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.error("Error updating BOM item:", err)
      setError(err instanceof Error ? err.message : "Error updating BOM item")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteBOMItem = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .delete()
        .eq("id", id)

      if (error) throw error
    } catch (err) {
      console.error("Error deleting BOM item:", err)
      setError(err instanceof Error ? err.message : "Error deleting BOM item")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getAllBOMs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Obtener todos los BOMs con información de productos
      const { data: bomData, error: bomError } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (bomError) throw bomError

      if (!bomData || bomData.length === 0) {
        return []
      }

      // Obtener información de productos (tanto productos finales como materiales)
      const productIds = [...new Set([
        ...bomData.map(item => item.product_id),
        ...bomData.map(item => item.material_id)
      ])]

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, category, unit")
        .in("id", productIds)

      if (productsError) throw productsError

      // Combinar datos
      const enrichedBOM = bomData.map(bomItem => {
        const product = products?.find(p => p.id === bomItem.product_id)
        const material = products?.find(p => p.id === bomItem.material_id)
        
        return {
          ...bomItem,
          product_name: product?.name || "Producto no encontrado",
          product_category: product?.category || "",
          material_name: material?.name || "Material no encontrado",
          material_unit: material?.unit || bomItem.unit_name
        }
      })

      return enrichedBOM
    } catch (err) {
      console.error("Error fetching all BOMs:", err)
      setError(err instanceof Error ? err.message : "Error fetching all BOMs")
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getBOMByProduct,
    getBOMWithMaterialNames,
    checkProductHasBOM,
    createBOMItem,
    updateBOMItem,
    deleteBOMItem,
    getAllBOMs,
  }
}