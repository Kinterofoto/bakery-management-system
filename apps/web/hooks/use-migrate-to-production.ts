"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface MigrationResult {
  productId: string
  materialsCreated: number
  bomItemsInserted: number
  operationsCreated: number
}

export function useMigrateToProduction() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Migra un prototipo aprobado a produccion:
   * 1. Si is_new_product, crea el producto en public.products
   * 2. Si algun material es is_new_material, lo crea en public.products (category=MP)
   * 3. Si alguna operacion es is_custom_operation, la crea en produccion.operations
   * 4. Inserta todos los materiales en produccion.bill_of_materials
   * 5. Actualiza el estado del prototipo a 'approved'
   */
  const migrateToProduction = useCallback(async (prototypeId: string) => {
    try {
      setLoading(true)
      setError(null)

      // 1. Obtener el prototipo completo
      const { data: prototype, error: protoError } = await (supabase
        .schema("investigacion" as any))
        .from("prototypes")
        .select("*")
        .eq("id", prototypeId)
        .single()

      if (protoError) throw protoError
      if (!prototype) throw new Error("Prototipo no encontrado")

      // 2. Obtener materiales del prototipo
      const { data: materials, error: matError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_materials")
        .select("*")
        .eq("prototype_id", prototypeId)

      if (matError) throw matError

      // 3. Obtener operaciones del prototipo
      const { data: operations, error: opError } = await (supabase
        .schema("investigacion" as any))
        .from("prototype_operations")
        .select("*")
        .eq("prototype_id", prototypeId)
        .order("step_number", { ascending: true })

      if (opError) throw opError

      let productId = prototype.product_id
      let materialsCreated = 0
      let operationsCreated = 0

      // 4. Si es un producto nuevo, crearlo en public.products
      if (prototype.is_new_product) {
        const { data: newProduct, error: productError } = await supabase
          .from("products")
          .insert({
            name: prototype.product_name || "Nuevo Producto",
            category: prototype.product_category || "PT",
            is_recipe_by_grams: true,
          })
          .select()
          .single()

        if (productError) throw productError
        productId = newProduct.id
      }

      if (!productId) throw new Error("No se pudo determinar el ID del producto")

      // 5. Crear materiales nuevos en public.products (category=MP)
      const materialIdMapping: Record<string, string> = {}

      for (const material of materials || []) {
        if (material.is_new_material && material.material_name) {
          const { data: newMaterial, error: newMatError } = await supabase
            .from("products")
            .insert({
              name: material.material_name,
              category: "MP",
              unit: material.unit_name || "g",
            })
            .select()
            .single()

          if (newMatError) throw newMatError
          materialIdMapping[material.id] = newMaterial.id
          materialsCreated++
        } else if (material.material_id) {
          materialIdMapping[material.id] = material.material_id
        }
      }

      // 6. Crear operaciones personalizadas en produccion.operations
      const operationIdMapping: Record<string, string> = {}

      for (const operation of operations || []) {
        if (operation.is_custom_operation && operation.operation_name) {
          // Generar un codigo unico para la operacion basado en el nombre
          const opCode = operation.operation_name
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "_")
            .substring(0, 10)
            + "_" + Date.now().toString(36)

          const { data: newOp, error: newOpError } = await supabase
            .schema("produccion")
            .from("operations")
            .insert({
              name: operation.operation_name,
              code: opCode,
            })
            .select()
            .single()

          if (newOpError) throw newOpError
          operationIdMapping[operation.id] = newOp.id
          operationsCreated++
        } else if (operation.operation_id) {
          operationIdMapping[operation.id] = operation.operation_id
        }
      }

      // 7. Insertar materiales en produccion.bill_of_materials
      const bomItems = (materials || []).map((material) => {
        const resolvedMaterialId = materialIdMapping[material.id]
        // Buscar la operacion asociada a este material
        const resolvedOperationId = material.operation_id
          ? operationIdMapping[material.operation_id] || material.operation_id
          : null

        return {
          product_id: productId!,
          material_id: resolvedMaterialId,
          quantity_needed: material.quantity_needed || 0,
          original_quantity: material.original_quantity || 0,
          unit_name: material.unit_name || "g",
          unit_equivalence_grams: material.unit_equivalence_grams || 1,
          operation_id: resolvedOperationId,
          is_active: true,
        }
      })

      if (bomItems.length > 0) {
        const { error: bomError } = await supabase
          .schema("produccion")
          .from("bill_of_materials")
          .insert(bomItems)

        if (bomError) throw bomError
      }

      // 8. Actualizar estado del prototipo a 'approved'
      const { error: statusError } = await (supabase
        .schema("investigacion" as any))
        .from("prototypes")
        .update({
          status: "approved",
          product_id: productId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", prototypeId)

      if (statusError) throw statusError

      const result: MigrationResult = {
        productId,
        materialsCreated,
        bomItemsInserted: bomItems.length,
        operationsCreated,
      }

      toast.success("Prototipo migrado a produccion exitosamente")
      return result
    } catch (err) {
      console.error("Error al migrar prototipo a produccion:", err)
      setError(err instanceof Error ? err.message : "Error al migrar a produccion")
      toast.error("Error al migrar prototipo a produccion")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    migrateToProduction,
  }
}
