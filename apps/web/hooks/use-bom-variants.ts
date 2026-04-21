"use client"

import { useCallback, useState } from "react"
import { supabase } from "@/lib/supabase"

export interface BomVariant {
  id: string
  product_id: string
  name: string
  description: string | null
  is_default: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export function useBomVariants() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const listByProduct = useCallback(async (productId: string): Promise<BomVariant[]> => {
    setError(null)
    const { data, error } = await supabase
      .schema("produccion")
      .from("bom_variants")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
    if (error) {
      setError(error.message)
      throw error
    }
    return (data ?? []) as BomVariant[]
  }, [])

  /**
   * Resolve (or lazily create) the default variant for a product.
   * Use this from any read path that has to fall back to "the default variant"
   * when the caller hasn't selected one.
   */
  const getOrCreateDefault = useCallback(async (productId: string): Promise<BomVariant> => {
    const { data: existing } = await supabase
      .schema("produccion")
      .from("bom_variants")
      .select("*")
      .eq("product_id", productId)
      .eq("is_default", true)
      .maybeSingle()
    if (existing) return existing as BomVariant

    const { data, error } = await supabase
      .schema("produccion")
      .from("bom_variants")
      .insert({ product_id: productId, name: "Principal", is_default: true, sort_order: 0 })
      .select()
      .single()
    if (error) {
      setError(error.message)
      throw error
    }
    return data as BomVariant
  }, [])

  const create = useCallback(async (input: {
    product_id: string
    name: string
    description?: string | null
    sort_order?: number
  }): Promise<BomVariant> => {
    setLoading(true)
    setError(null)
    try {
      const { data: existing } = await supabase
        .schema("produccion")
        .from("bom_variants")
        .select("id")
        .eq("product_id", input.product_id)
        .limit(1)

      const isFirst = !existing || existing.length === 0

      const { data, error } = await supabase
        .schema("produccion")
        .from("bom_variants")
        .insert({
          product_id: input.product_id,
          name: input.name,
          description: input.description ?? null,
          sort_order: input.sort_order ?? (isFirst ? 0 : 100),
          is_default: isFirst,
        })
        .select()
        .single()
      if (error) throw error
      return data as BomVariant
    } catch (err: any) {
      setError(err?.message || "Error creating variant")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const rename = useCallback(async (variantId: string, name: string): Promise<void> => {
    const { error } = await supabase
      .schema("produccion")
      .from("bom_variants")
      .update({ name })
      .eq("id", variantId)
    if (error) throw error
  }, [])

  const reorder = useCallback(async (variantId: string, sortOrder: number): Promise<void> => {
    const { error } = await supabase
      .schema("produccion")
      .from("bom_variants")
      .update({ sort_order: sortOrder })
      .eq("id", variantId)
    if (error) throw error
  }, [])

  /**
   * Promote `variantId` to default. Atomically flips the previous default
   * off first to respect the partial unique index on (product_id) WHERE is_default.
   */
  const setDefault = useCallback(async (productId: string, variantId: string): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const { error: clearErr } = await supabase
        .schema("produccion")
        .from("bom_variants")
        .update({ is_default: false })
        .eq("product_id", productId)
        .neq("id", variantId)
      if (clearErr) throw clearErr

      const { error: setErr } = await supabase
        .schema("produccion")
        .from("bom_variants")
        .update({ is_default: true })
        .eq("id", variantId)
      if (setErr) throw setErr
    } catch (err: any) {
      setError(err?.message || "Error setting default variant")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Delete a variant. Refuses to delete the last remaining variant for a
   * product. If the target is the default, auto-promotes the next variant by
   * sort_order to default first.
   */
  const remove = useCallback(async (variantId: string): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const { data: target, error: fetchErr } = await supabase
        .schema("produccion")
        .from("bom_variants")
        .select("id, product_id, is_default")
        .eq("id", variantId)
        .single()
      if (fetchErr) throw fetchErr

      const { data: siblings, error: sibErr } = await supabase
        .schema("produccion")
        .from("bom_variants")
        .select("id, sort_order, created_at")
        .eq("product_id", target.product_id)
        .neq("id", variantId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
      if (sibErr) throw sibErr

      if (!siblings || siblings.length === 0) {
        throw new Error("No puedes eliminar la única variante del producto.")
      }

      if (target.is_default) {
        const { error: promoteErr } = await supabase
          .schema("produccion")
          .from("bom_variants")
          .update({ is_default: true })
          .eq("id", siblings[0].id)
        if (promoteErr) throw promoteErr
      }

      const { error: delErr } = await supabase
        .schema("produccion")
        .from("bom_variants")
        .delete()
        .eq("id", variantId)
      if (delErr) throw delErr
    } catch (err: any) {
      setError(err?.message || "Error deleting variant")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Duplicate a variant's BOM rows under a new variant. Existing BOM rows are
   * copied with their quantities/fractions, operation, unit info and rest time.
   */
  const cloneVariant = useCallback(async (input: {
    source_variant_id: string
    new_name: string
    description?: string | null
  }): Promise<BomVariant> => {
    setLoading(true)
    setError(null)
    try {
      const { data: source, error: srcErr } = await supabase
        .schema("produccion")
        .from("bom_variants")
        .select("id, product_id, sort_order")
        .eq("id", input.source_variant_id)
        .single()
      if (srcErr) throw srcErr

      const { data: created, error: createErr } = await supabase
        .schema("produccion")
        .from("bom_variants")
        .insert({
          product_id: source.product_id,
          name: input.new_name,
          description: input.description ?? null,
          is_default: false,
          sort_order: source.sort_order + 1,
        })
        .select()
        .single()
      if (createErr) throw createErr

      const { data: rows, error: rowsErr } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .select("*")
        .eq("variant_id", input.source_variant_id)
      if (rowsErr) throw rowsErr

      if (rows && rows.length > 0) {
        const inserts = rows.map(r => ({
          product_id: r.product_id,
          material_id: r.material_id,
          operation_id: r.operation_id,
          variant_id: created.id,
          quantity_needed: r.quantity_needed,
          original_quantity: r.original_quantity,
          unit_name: r.unit_name,
          unit_equivalence_grams: r.unit_equivalence_grams,
          tiempo_reposo_horas: r.tiempo_reposo_horas,
          is_active: r.is_active ?? true,
        }))
        const { error: insErr } = await supabase
          .schema("produccion")
          .from("bill_of_materials")
          .insert(inserts)
        if (insErr) throw insErr
      }

      return created as BomVariant
    } catch (err: any) {
      setError(err?.message || "Error cloning variant")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    listByProduct,
    getOrCreateDefault,
    create,
    rename,
    reorder,
    setDefault,
    remove,
    cloneVariant,
  }
}
