"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"
import type {
  BillOfMaterialsWithOriginal,
  BillOfMaterialsInsertWithOriginal,
  BillOfMaterialsUpdateWithOriginal,
  ProductWithRecipeByGrams
} from "@/lib/database-extensions.types"

type BillOfMaterials = BillOfMaterialsWithOriginal
type BillOfMaterialsInsert = BillOfMaterialsInsertWithOriginal
type BillOfMaterialsUpdate = BillOfMaterialsUpdateWithOriginal

export function useBillOfMaterials() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Normalizes BOM quantities for products with recipe_by_grams enabled
   * All material quantities across all operations will sum to 1
   */
  const normalizeBOMQuantities = useCallback(async (productId: string) => {
    try {
      // Get product to check if normalization is needed
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("is_recipe_by_grams")
        .eq("id", productId)
        .single()

      if (productError) throw productError

      // If normalization is not enabled, do nothing
      if (!product?.is_recipe_by_grams) {
        return
      }

      // Get all BOM items for this product (across all operations)
      const { data: bomItems, error: bomError } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .select("id, original_quantity")
        .eq("product_id", productId)
        .eq("is_active", true)

      if (bomError) throw bomError
      if (!bomItems || bomItems.length === 0) return

      // Calculate total of all original quantities
      const total = bomItems.reduce((sum, item) => {
        return sum + (item.original_quantity || 0)
      }, 0)

      if (total === 0) return // Avoid division by zero

      // Update each BOM item with normalized quantity
      const updates = bomItems.map(item => {
        const normalizedQuantity = (item.original_quantity || 0) / total
        return supabase
          .schema("produccion")
          .from("bill_of_materials")
          .update({
            quantity_needed: normalizedQuantity,
            updated_at: new Date().toISOString()
          })
          .eq("id", item.id)
      })

      await Promise.all(updates)
    } catch (err) {
      console.error("Error normalizing BOM quantities:", err)
      throw err
    }
  }, [])

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

  const getBOMWithMaterialNames = useCallback(async (productId: string, operationId?: string) => {
    try {
      setError(null)
      setLoading(true)

      // Obtener el BOM con filtro opcional por operation_id
      let query = supabase
        .schema("produccion")
        .from("bill_of_materials")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true)

      if (operationId) {
        query = query.eq("operation_id", operationId)
      }

      const { data: bom, error: bomError } = await query.order("created_at", { ascending: true })

      if (bomError) throw bomError

      if (!bom || bom.length === 0) {
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
  }, [])

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

      // Set original_quantity to the user's input if not already set
      const itemToInsert = {
        ...bomItem,
        original_quantity: bomItem.original_quantity ?? bomItem.quantity_needed,
      }

      const { data, error } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .insert(itemToInsert)
        .select()
        .single()

      if (error) throw error

      // Normalize all BOM quantities for this product if recipe_by_grams is enabled
      if (data.product_id) {
        await normalizeBOMQuantities(data.product_id)
      }

      return data
    } catch (err) {
      console.error("Error creating BOM item:", err)
      setError(err instanceof Error ? err.message : "Error creating BOM item")
      throw err
    } finally {
      setLoading(false)
    }
  }, [normalizeBOMQuantities])

  const updateBOMItem = useCallback(async (
    id: string,
    updates: BillOfMaterialsUpdate
  ) => {
    try {
      setLoading(true)
      setError(null)

      // If quantity_needed is being updated, also update original_quantity
      const itemToUpdate = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      // If quantity_needed is provided but original_quantity is not, sync them
      if (updates.quantity_needed !== undefined && updates.original_quantity === undefined) {
        itemToUpdate.original_quantity = updates.quantity_needed
      }

      const { data, error } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .update(itemToUpdate)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      // Normalize all BOM quantities for this product if recipe_by_grams is enabled
      if (data.product_id) {
        await normalizeBOMQuantities(data.product_id)
      }

      return data
    } catch (err) {
      console.error("Error updating BOM item:", err)
      setError(err instanceof Error ? err.message : "Error updating BOM item")
      throw err
    } finally {
      setLoading(false)
    }
  }, [normalizeBOMQuantities])

  const deleteBOMItem = useCallback(async (id: string, productId?: string) => {
    try {
      setLoading(true)
      setError(null)

      // Get product_id before deleting if not provided
      let targetProductId = productId
      if (!targetProductId) {
        const { data: bomItem } = await supabase
          .schema("produccion")
          .from("bill_of_materials")
          .select("product_id")
          .eq("id", id)
          .single()
        targetProductId = bomItem?.product_id || undefined
      }

      const { error } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .delete()
        .eq("id", id)

      if (error) throw error

      // Normalize remaining items if recipe_by_grams is enabled
      if (targetProductId) {
        await normalizeBOMQuantities(targetProductId)
      }
    } catch (err) {
      console.error("Error deleting BOM item:", err)
      setError(err instanceof Error ? err.message : "Error deleting BOM item")
      throw err
    } finally {
      setLoading(false)
    }
  }, [normalizeBOMQuantities])

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
    normalizeBOMQuantities,
  }
}