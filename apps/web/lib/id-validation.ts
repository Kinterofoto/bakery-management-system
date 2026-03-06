import { z } from 'zod'

// Step 1: Product Selection
export const productSelectionSchema = z.object({
  product_id: z.string().uuid().nullable(),
  product_name: z.string().min(1, 'El nombre del producto es requerido'),
  product_category: z.enum(['PT', 'PP']),
  is_new_product: z.boolean(),
  code: z.string().min(1, 'El código es requerido'),
  description: z.string().optional().default(''),
  objectives: z.string().optional().default(''),
})

// Step 2: Single material
export const materialSchema = z.object({
  id: z.string().optional(),
  material_id: z.string().uuid().nullable(),
  material_name: z.string().min(1, 'Nombre requerido'),
  is_new_material: z.boolean().default(false),
  is_base_ingredient: z.boolean().default(false),
  original_quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  unit_name: z.string().min(1).default('gramos'),
  unit_equivalence_grams: z.number().positive().default(1),
  unit_cost: z.number().min(0).nullable().optional(),
  operation_id: z.string().uuid().nullable().optional(),
  tiempo_reposo_horas: z.number().min(0).nullable().optional(),
})

export const materialsStepSchema = z.object({
  materials: z.array(materialSchema).min(1, 'Debe agregar al menos un material'),
}).refine(
  data => data.materials.filter(m => m.is_base_ingredient).length === 1,
  { message: 'Debe seleccionar exactamente un ingrediente base para el porcentaje panadero' }
)

// Step 3: Single operation
export const operationSchema = z.object({
  id: z.string().optional(),
  operation_id: z.string().uuid().nullable(),
  operation_name: z.string().min(1, 'Nombre de operación requerido'),
  step_number: z.number().int().positive(),
  is_custom_operation: z.boolean().default(false),
  produces_sub_product: z.boolean().default(false),
  sub_product_name: z.string().optional().default(''),
  is_filling: z.boolean().default(false),
  instructions: z.string().optional().default(''),
  // Material IDs assigned to this operation
  assigned_material_ids: z.array(z.string()).optional().default([]),
})

export const processDesignSchema = z.object({
  operations: z.array(operationSchema).min(1, 'Debe definir al menos una operación'),
})

// Step 4: Operation detail (live tracking)
export const operationDetailSchema = z.object({
  duration_minutes: z.number().min(0).nullable().optional(),
  temperature_celsius: z.number().nullable().optional(),
  humidity_percentage: z.number().min(0).max(100).nullable().optional(),
  speed_rpm: z.number().nullable().optional(),
  timer_elapsed_seconds: z.number().int().min(0).nullable().optional(),
  input_weight_grams: z.number().min(0).nullable().optional(),
  output_weight_grams: z.number().min(0).nullable().optional(),
  people_count: z.number().int().min(1).default(1),
  labor_time_minutes: z.number().min(0).nullable().optional(),
  avg_assembly_time_seconds: z.number().min(0).nullable().optional(),
  sub_product_input_grams: z.number().min(0).nullable().optional(),
  sub_product_output_grams: z.number().min(0).nullable().optional(),
  has_trim: z.boolean().default(false),
  weight_before_trim_grams: z.number().min(0).nullable().optional(),
  trim_weight_grams: z.number().min(0).nullable().optional(),
  observations: z.string().optional().default(''),
})

// Step 5: Quality assessment
export const qualitySchema = z.object({
  texture_score: z.number().int().min(1).max(5).nullable().optional(),
  texture_notes: z.string().optional().default(''),
  color_score: z.number().int().min(1).max(5).nullable().optional(),
  color_notes: z.string().optional().default(''),
  appearance_score: z.number().int().min(1).max(5).nullable().optional(),
  appearance_notes: z.string().optional().default(''),
  taste_score: z.number().int().min(1).max(5).nullable().optional(),
  taste_notes: z.string().optional().default(''),
  aroma_score: z.number().int().min(1).max(5).nullable().optional(),
  aroma_notes: z.string().optional().default(''),
  crumb_structure_score: z.number().int().min(1).max(5).nullable().optional(),
  crumb_structure_notes: z.string().optional().default(''),
  overall_notes: z.string().optional().default(''),
})

// Step 6: Yield and waste
export const yieldSchema = z.object({
  total_input_weight_grams: z.number().positive().nullable().optional(),
  total_output_weight_grams: z.number().positive().nullable().optional(),
  total_output_units: z.number().int().positive().nullable().optional(),
  formulation_with_trim: z.boolean().default(false),
  weight_before_trim_grams: z.number().min(0).nullable().optional(),
  trim_weight_grams: z.number().min(0).nullable().optional(),
  notes: z.string().optional().default(''),
})

// Step 7: Packaging
export const packagingSchema = z.object({
  units_per_flow_pack: z.number().int().positive().nullable().optional(),
  units_per_box: z.number().int().positive().nullable().optional(),
})

// Step 8: Cost summary
export const costSchema = z.object({
  labor_cost_per_minute: z.number().min(0).default(0),
  notes: z.string().optional().default(''),
})

// Sensory evaluation (public form)
export const sensoryEvaluationSchema = z.object({
  evaluator_name: z.string().min(1, 'El nombre es requerido'),
  evaluator_role: z.string().optional().default(''),
  texture_score: z.number().int().min(1).max(5).nullable().optional(),
  texture_notes: z.string().optional().default(''),
  color_score: z.number().int().min(1).max(5).nullable().optional(),
  color_notes: z.string().optional().default(''),
  appearance_score: z.number().int().min(1).max(5).nullable().optional(),
  appearance_notes: z.string().optional().default(''),
  taste_score: z.number().int().min(1).max(5).nullable().optional(),
  taste_notes: z.string().optional().default(''),
  aroma_score: z.number().int().min(1).max(5).nullable().optional(),
  aroma_notes: z.string().optional().default(''),
  crumb_structure_score: z.number().int().min(1).max(5).nullable().optional(),
  crumb_structure_notes: z.string().optional().default(''),
  overall_notes: z.string().optional().default(''),
  purchase_intent: z.number().int().min(1).max(5).nullable().optional(),
})

// Type exports
export type ProductSelectionForm = z.infer<typeof productSelectionSchema>
export type MaterialForm = z.infer<typeof materialSchema>
export type MaterialsStepForm = z.infer<typeof materialsStepSchema>
export type OperationForm = z.infer<typeof operationSchema>
export type ProcessDesignForm = z.infer<typeof processDesignSchema>
export type OperationDetailForm = z.infer<typeof operationDetailSchema>
export type QualityForm = z.infer<typeof qualitySchema>
export type YieldForm = z.infer<typeof yieldSchema>
export type PackagingForm = z.infer<typeof packagingSchema>
export type CostForm = z.infer<typeof costSchema>
export type SensoryEvaluationForm = z.infer<typeof sensoryEvaluationSchema>
