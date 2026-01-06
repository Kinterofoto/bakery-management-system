/**
 * Database type extensions for recipe by grams functionality
 * These types extend the auto-generated database types until they are regenerated
 */

import type { Database } from './database.types'

// Extend products table with is_recipe_by_grams field
export type ProductWithRecipeByGrams = Database['public']['Tables']['products']['Row'] & {
  is_recipe_by_grams: boolean
}

export type ProductInsertWithRecipeByGrams = Database['public']['Tables']['products']['Insert'] & {
  is_recipe_by_grams?: boolean
}

export type ProductUpdateWithRecipeByGrams = Database['public']['Tables']['products']['Update'] & {
  is_recipe_by_grams?: boolean
}

// Extend bill_of_materials with original_quantity field
// Note: This assumes the produccion schema is available in Database types
// If not, you'll need to regenerate types with: supabase gen types typescript
export type BillOfMaterialsWithOriginal = {
  id: string
  product_id: string | null
  material_id: string | null
  operation_id: string | null
  quantity_needed: number
  original_quantity: number | null // New field for user's input before normalization
  unit_name: string
  unit_equivalence_grams: number
  tiempo_reposo_horas: number | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

export type BillOfMaterialsInsertWithOriginal = {
  id?: string
  product_id?: string | null
  material_id?: string | null
  operation_id?: string | null
  quantity_needed: number
  original_quantity?: number | null
  unit_name: string
  unit_equivalence_grams: number
  tiempo_reposo_horas?: number | null
  is_active?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

export type BillOfMaterialsUpdateWithOriginal = {
  id?: string
  product_id?: string | null
  material_id?: string | null
  operation_id?: string | null
  quantity_needed?: number
  original_quantity?: number | null
  unit_name?: string
  unit_equivalence_grams?: number
  tiempo_reposo_horas?: number | null
  is_active?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}
