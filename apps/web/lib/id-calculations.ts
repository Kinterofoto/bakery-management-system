/**
 * Calculation utilities for I+D (Investigacion y Desarrollo) module
 * Baker's percentage, engineering percentage, yield, and cost formulas
 */

export interface MaterialForCalc {
  original_quantity: number
  unit_equivalence_grams: number
  is_base_ingredient: boolean
  unit_cost?: number | null
}

export interface OperationForCalc {
  duration_minutes?: number | null
  people_count?: number | null
  timer_elapsed_seconds?: number | null
  input_weight_grams?: number | null
  output_weight_grams?: number | null
}

/**
 * Convert material quantity to grams
 */
export function toGrams(quantity: number, unitEquivalenceGrams: number): number {
  return quantity * unitEquivalenceGrams
}

/**
 * Calculate baker's percentage for all materials
 * Baker's %: (material_grams / base_ingredient_grams) * 100
 * Base ingredient is always 100%
 */
export function calculateBakerPercentages(
  materials: MaterialForCalc[]
): number[] {
  const baseIngredient = materials.find(m => m.is_base_ingredient)
  if (!baseIngredient) return materials.map(() => 0)

  const baseGrams = toGrams(baseIngredient.original_quantity, baseIngredient.unit_equivalence_grams)
  if (baseGrams === 0) return materials.map(() => 0)

  return materials.map(m => {
    const grams = toGrams(m.original_quantity, m.unit_equivalence_grams)
    return (grams / baseGrams) * 100
  })
}

/**
 * Calculate engineering percentage for all materials
 * Engineering %: (material_grams / sum_all_grams) * 100
 * All percentages sum to 100%
 */
export function calculateEngineeringPercentages(
  materials: MaterialForCalc[]
): number[] {
  const totalGrams = materials.reduce(
    (sum, m) => sum + toGrams(m.original_quantity, m.unit_equivalence_grams),
    0
  )
  if (totalGrams === 0) return materials.map(() => 0)

  return materials.map(m => {
    const grams = toGrams(m.original_quantity, m.unit_equivalence_grams)
    return (grams / totalGrams) * 100
  })
}

/**
 * Normalize quantity to 1 gram (for BOM compatibility)
 * Same as engineering_percentage / 100
 */
export function normalizeToOneGram(
  originalQuantity: number,
  unitEquivalenceGrams: number,
  totalGramsAllMaterials: number
): number {
  if (totalGramsAllMaterials === 0) return 0
  const grams = toGrams(originalQuantity, unitEquivalenceGrams)
  return grams / totalGramsAllMaterials
}

/**
 * Calculate total grams for all materials
 */
export function calculateTotalGrams(materials: MaterialForCalc[]): number {
  return materials.reduce(
    (sum, m) => sum + toGrams(m.original_quantity, m.unit_equivalence_grams),
    0
  )
}

/**
 * Calculate yield percentage
 */
export function calculateYield(
  inputWeightGrams: number,
  outputWeightGrams: number
): { yieldPercentage: number; wasteGrams: number; wastePercentage: number } {
  if (inputWeightGrams === 0) {
    return { yieldPercentage: 0, wasteGrams: 0, wastePercentage: 0 }
  }
  const wasteGrams = inputWeightGrams - outputWeightGrams
  return {
    yieldPercentage: (outputWeightGrams / inputWeightGrams) * 100,
    wasteGrams,
    wastePercentage: (wasteGrams / inputWeightGrams) * 100,
  }
}

/**
 * Calculate total material cost
 */
export function calculateMaterialCost(materials: MaterialForCalc[]): number {
  return materials.reduce((sum, m) => {
    if (!m.unit_cost) return sum
    return sum + m.original_quantity * m.unit_cost
  }, 0)
}

/**
 * Calculate labor cost from operations
 */
export function calculateLaborCost(
  operations: OperationForCalc[],
  laborCostPerMinute: number
): { totalLaborMinutes: number; totalLaborCost: number } {
  const totalLaborMinutes = operations.reduce((sum, op) => {
    const minutes = op.timer_elapsed_seconds
      ? op.timer_elapsed_seconds / 60
      : op.duration_minutes || 0
    const people = op.people_count || 1
    return sum + minutes * people
  }, 0)

  return {
    totalLaborMinutes,
    totalLaborCost: totalLaborMinutes * laborCostPerMinute,
  }
}

/**
 * Calculate total cost per unit
 */
export function calculateCostPerUnit(
  totalMaterialCost: number,
  totalLaborCost: number,
  unitsProduced: number
): { materialCostPerUnit: number; laborCostPerUnit: number; totalCostPerUnit: number } {
  if (unitsProduced === 0) {
    return { materialCostPerUnit: 0, laborCostPerUnit: 0, totalCostPerUnit: 0 }
  }
  return {
    materialCostPerUnit: totalMaterialCost / unitsProduced,
    laborCostPerUnit: totalLaborCost / unitsProduced,
    totalCostPerUnit: (totalMaterialCost + totalLaborCost) / unitsProduced,
  }
}

/**
 * Format a number as percentage string
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format grams to a readable string
 */
export function formatGrams(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`
  }
  return `${grams.toFixed(1)} g`
}

/**
 * Format currency (COP)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format time from seconds to human-readable
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}
