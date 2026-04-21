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

// NUMERIC(15,6) column: keep fractions at 6 decimals so that a user entering
// a specific gram amount round-trips cleanly (e.g. 5000 / 8030 × 8030 == 5000).
const FRACTION_SCALE = 1_000_000

function roundFraction(x: number): number {
  return Math.round(x * FRACTION_SCALE) / FRACTION_SCALE
}

/**
 * Round each fraction to 6 decimals and push any residual onto the largest
 * entry so the total sums to exactly 1.000000.
 */
function adjustFractionsToOne<T extends { quantity_needed: number }>(items: T[]): T[] {
  if (items.length === 0) return items
  const rounded = items.map(it => ({ ...it, quantity_needed: roundFraction(it.quantity_needed) }))
  const sum = rounded.reduce((s, it) => s + it.quantity_needed, 0)
  const diff = roundFraction(1 - sum)
  if (diff !== 0) {
    let idx = 0
    for (let i = 1; i < rounded.length; i++) {
      if (rounded[i].quantity_needed > rounded[idx].quantity_needed) idx = i
    }
    rounded[idx].quantity_needed = roundFraction(rounded[idx].quantity_needed + diff)
  }
  return rounded
}

export function useBillOfMaterials() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch a product's is_recipe_by_grams flag.
   */
  const getIsRecipeByGrams = useCallback(async (productId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("products")
      .select("is_recipe_by_grams")
      .eq("id", productId)
      .single()
    if (error) throw error
    return !!data?.is_recipe_by_grams
  }, [])

  /**
   * Resolve the default variant id for a product. Creates one lazily if the
   * product has no variants yet (first-ever BOM edit).
   */
  const resolveDefaultVariantId = useCallback(async (productId: string): Promise<string> => {
    const { data: existing, error: selectErr } = await supabase
      .schema("produccion")
      .from("bom_variants")
      .select("id")
      .eq("product_id", productId)
      .eq("is_default", true)
      .maybeSingle()
    if (selectErr) throw selectErr
    if (existing?.id) return existing.id as string

    const { data: created, error: insertErr } = await supabase
      .schema("produccion")
      .from("bom_variants")
      .insert({ product_id: productId, name: "Principal", is_default: true, sort_order: 0 })
      .select("id")
      .single()
    if (insertErr) throw insertErr
    return created.id as string
  }, [])

  /**
   * Fetch active BOM fractions for a given variant.
   */
  const fetchActiveFractions = useCallback(async (variantId: string) => {
    const { data, error } = await supabase
      .schema("produccion")
      .from("bill_of_materials")
      .select("id, quantity_needed")
      .eq("variant_id", variantId)
      .eq("is_active", true)
    if (error) throw error
    return (data || []).map(x => ({ id: x.id as string, quantity_needed: (x.quantity_needed as number) || 0 }))
  }, [])

  /**
   * Persist a set of fractions to the DB (quantity_needed + original_quantity kept in sync).
   */
  const persistFractions = useCallback(async (items: Array<{ id: string; quantity_needed: number }>) => {
    await Promise.all(items.map(it =>
      supabase
        .schema("produccion")
        .from("bill_of_materials")
        .update({
          quantity_needed: it.quantity_needed,
          original_quantity: it.quantity_needed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", it.id)
    ))
  }, [])

  /**
   * Legacy utility: normalize all BOM rows of a variant so they sum to 1 based on original_quantity.
   * Kept for scripts/migrations; the main hook flows no longer call it automatically.
   */
  const normalizeBOMQuantities = useCallback(async (productId: string, variantId?: string) => {
    try {
      const isRecipe = await getIsRecipeByGrams(productId)
      if (!isRecipe) return

      const vid = variantId ?? await resolveDefaultVariantId(productId)

      const { data: bomItems, error: bomError } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .select("id, original_quantity")
        .eq("variant_id", vid)
        .eq("is_active", true)

      if (bomError) throw bomError
      if (!bomItems || bomItems.length === 0) return

      const total = bomItems.reduce((sum, item) => sum + (item.original_quantity || 0), 0)
      if (total === 0) return

      const adjusted = adjustFractionsToOne(
        bomItems.map(item => ({
          id: item.id as string,
          quantity_needed: (item.original_quantity || 0) / total,
        }))
      )
      await persistFractions(adjusted)
    } catch (err) {
      console.error("Error normalizing BOM quantities:", err)
      throw err
    }
  }, [getIsRecipeByGrams, persistFractions, resolveDefaultVariantId])

  /**
   * Fetch BOM rows for a product. If `variantId` is omitted, returns the rows
   * of the default variant (safe fallback for purchasing / planning / reports).
   */
  const getBOMByProduct = useCallback(async (productId: string, variantId?: string) => {
    try {
      setError(null)
      const vid = variantId ?? await resolveDefaultVariantId(productId)
      const { data, error } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .select("*")
        .eq("variant_id", vid)
        .eq("is_active", true)
        .order("created_at", { ascending: true })

      if (error) throw error
      return data || []
    } catch (err) {
      console.error("Error fetching BOM:", err)
      setError(err instanceof Error ? err.message : "Error fetching BOM")
      return []
    }
  }, [resolveDefaultVariantId])

  /**
   * Default-variant convenience wrapper. Use from any non-pesaje caller.
   */
  const getDefaultBOMByProduct = useCallback(async (productId: string) => {
    return getBOMByProduct(productId)
  }, [getBOMByProduct])

  const getBOMWithMaterialNames = useCallback(async (
    productId: string,
    operationId?: string,
    variantId?: string,
  ) => {
    try {
      setError(null)
      setLoading(true)

      const vid = variantId ?? await resolveDefaultVariantId(productId)

      let query = supabase
        .schema("produccion")
        .from("bill_of_materials")
        .select("*")
        .eq("variant_id", vid)
        .eq("is_active", true)

      if (operationId) {
        query = query.eq("operation_id", operationId)
      }

      const { data: bom, error: bomError } = await query.order("created_at", { ascending: true })

      if (bomError) throw bomError

      if (!bom || bom.length === 0) {
        return []
      }

      const materialIds = bom.map(item => item.material_id)
      const { data: materials, error: materialsError } = await supabase
        .from("products")
        .select("id, name, unit")
        .in("id", materialIds as any)

      if (materialsError) throw materialsError

      const bomWithNames = bom.map(bomItem => {
        const material = materials?.find((m: any) => m.id === bomItem.material_id)
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
  }, [resolveDefaultVariantId])

  const checkProductHasBOM = useCallback(async (productId: string, variantId?: string): Promise<boolean> => {
    try {
      const bom = await getBOMByProduct(productId, variantId)
      return bom.length > 0
    } catch (err) {
      console.error("Error checking if product has BOM:", err)
      return false
    }
  }, [getBOMByProduct])

  const createBOMItem = useCallback(async (
    bomItem: BillOfMaterialsInsert & { variant_id?: string }
  ) => {
    try {
      setLoading(true)
      setError(null)

      const productId = bomItem.product_id as string | undefined
      if (!productId) throw new Error("createBOMItem: product_id is required")

      const variantId = bomItem.variant_id ?? await resolveDefaultVariantId(productId)

      const isRecipe = await getIsRecipeByGrams(productId)

      const existingBefore = isRecipe
        ? await fetchActiveFractions(variantId)
        : []

      const itemToInsert = {
        ...bomItem,
        variant_id: variantId,
        original_quantity: bomItem.original_quantity ?? bomItem.quantity_needed,
      }

      const { data, error } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .insert(itemToInsert as any)
        .select()
        .single()

      if (error) throw error

      if (isRecipe && data) {
        const rawInput = Number(bomItem.quantity_needed) || 0
        const S = existingBefore.reduce((s, it) => s + it.quantity_needed, 0)

        let scaled: Array<{ id: string; quantity_needed: number }>
        if (existingBefore.length === 0) {
          scaled = [{ id: data.id, quantity_needed: 1 }]
        } else if (rawInput >= 1 || S <= 0) {
          const total = S + Math.max(rawInput, 0)
          if (total > 0) {
            scaled = [
              ...existingBefore.map(it => ({ id: it.id, quantity_needed: it.quantity_needed / total })),
              { id: data.id, quantity_needed: Math.max(rawInput, 0) / total },
            ]
          } else {
            scaled = [
              ...existingBefore.map(it => ({ id: it.id, quantity_needed: 0 })),
              { id: data.id, quantity_needed: 1 },
            ]
          }
        } else {
          const X = Math.max(rawInput, 0)
          const remaining = 1 - X
          const scale = remaining > 0 ? remaining / S : 0
          scaled = [
            ...existingBefore.map(it => ({ id: it.id, quantity_needed: it.quantity_needed * scale })),
            { id: data.id, quantity_needed: X },
          ]
        }

        const adjusted = adjustFractionsToOne(scaled)
        await persistFractions(adjusted)
      }

      return data
    } catch (err) {
      console.error("Error creating BOM item:", err)
      setError(err instanceof Error ? err.message : "Error creating BOM item")
      throw err
    } finally {
      setLoading(false)
    }
  }, [getIsRecipeByGrams, fetchActiveFractions, persistFractions, resolveDefaultVariantId])

  const updateBOMItem = useCallback(async (
    id: string,
    updates: BillOfMaterialsUpdate
  ) => {
    try {
      setLoading(true)
      setError(null)

      const itemToUpdate: BillOfMaterialsUpdate & { updated_at: string } = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

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

      const quantityChanged = updates.quantity_needed !== undefined
      const anyData = data as any
      if (quantityChanged && anyData?.product_id && anyData?.variant_id) {
        const isRecipe = await getIsRecipeByGrams(anyData.product_id)
        if (isRecipe) {
          const allItems = await fetchActiveFractions(anyData.variant_id)
          const others = allItems.filter(it => it.id !== id)

          const rawInput = Number(updates.quantity_needed) || 0
          const S = others.reduce((s, it) => s + it.quantity_needed, 0)

          let scaled: Array<{ id: string; quantity_needed: number }>
          if (others.length === 0) {
            scaled = [{ id, quantity_needed: 1 }]
          } else if (rawInput >= 1 || S <= 0) {
            const total = S + Math.max(rawInput, 0)
            if (total > 0) {
              scaled = [
                ...others.map(it => ({ id: it.id, quantity_needed: it.quantity_needed / total })),
                { id, quantity_needed: Math.max(rawInput, 0) / total },
              ]
            } else {
              scaled = [
                ...others.map(it => ({ id: it.id, quantity_needed: 0 })),
                { id, quantity_needed: 1 },
              ]
            }
          } else {
            const X = Math.max(rawInput, 0)
            const remaining = 1 - X
            const scale = remaining > 0 ? remaining / S : 0
            scaled = [
              ...others.map(it => ({ id: it.id, quantity_needed: it.quantity_needed * scale })),
              { id, quantity_needed: X },
            ]
          }

          const adjusted = adjustFractionsToOne(scaled)
          await persistFractions(adjusted)
        }
      }

      return data
    } catch (err) {
      console.error("Error updating BOM item:", err)
      setError(err instanceof Error ? err.message : "Error updating BOM item")
      throw err
    } finally {
      setLoading(false)
    }
  }, [getIsRecipeByGrams, fetchActiveFractions, persistFractions])

  const deleteBOMItem = useCallback(async (id: string, productId?: string) => {
    try {
      setLoading(true)
      setError(null)

      let targetProductId = productId
      let targetVariantId: string | undefined
      const { data: bomItem } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .select("product_id, variant_id")
        .eq("id", id)
        .single()
      if (bomItem) {
        targetProductId = targetProductId || (bomItem.product_id as string | undefined)
        targetVariantId = bomItem.variant_id as string | undefined
      }

      const { error } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .delete()
        .eq("id", id)

      if (error) throw error

      if (targetProductId && targetVariantId) {
        const isRecipe = await getIsRecipeByGrams(targetProductId)
        if (isRecipe) {
          const remaining = await fetchActiveFractions(targetVariantId)
          if (remaining.length > 0) {
            const S = remaining.reduce((s, it) => s + it.quantity_needed, 0)
            const scaled = S > 0
              ? remaining.map(it => ({ id: it.id, quantity_needed: it.quantity_needed / S }))
              : remaining.map((it, idx) => ({ id: it.id, quantity_needed: idx === 0 ? 1 : 0 }))
            const adjusted = adjustFractionsToOne(scaled)
            await persistFractions(adjusted)
          }
        }
      }
    } catch (err) {
      console.error("Error deleting BOM item:", err)
      setError(err instanceof Error ? err.message : "Error deleting BOM item")
      throw err
    } finally {
      setLoading(false)
    }
  }, [getIsRecipeByGrams, fetchActiveFractions, persistFractions])

  /**
   * Reporting helper. When `defaultOnly` is true (default), returns only rows
   * belonging to each product's default BOM variant — matches the semantics
   * expected by planning/purchasing UIs that used to see one row per material.
   */
  const getAllBOMs = useCallback(async (opts: { defaultOnly?: boolean } = {}) => {
    const defaultOnly = opts.defaultOnly ?? true
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .schema("produccion")
        .from("bill_of_materials")
        .select("*, bom_variants!inner(is_default)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (defaultOnly) {
        query = query.eq("bom_variants.is_default", true)
      }

      const { data: bomData, error: bomError } = await query

      if (bomError) throw bomError

      if (!bomData || bomData.length === 0) {
        return []
      }

      const productIds = [...new Set([
        ...bomData.map((item: any) => item.product_id),
        ...bomData.map((item: any) => item.material_id)
      ])]

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, category, unit")
        .in("id", productIds)

      if (productsError) throw productsError

      const enrichedBOM = bomData.map((bomItem: any) => {
        const product = products?.find((p: any) => p.id === bomItem.product_id)
        const material = products?.find((p: any) => p.id === bomItem.material_id)

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
    resolveDefaultVariantId,
    getBOMByProduct,
    getDefaultBOMByProduct,
    getBOMWithMaterialNames,
    checkProductHasBOM,
    createBOMItem,
    updateBOMItem,
    deleteBOMItem,
    getAllBOMs,
    normalizeBOMQuantities,
  }
}
