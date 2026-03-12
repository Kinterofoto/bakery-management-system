/**
 * Generate descriptions for all PT products based on their BOM (recursive).
 *
 * - Recursively resolves PP sub-products (rellenos, masas, decorados) to find
 *   actual raw ingredients (MP).
 * - Products without BOM get a description based on their name/subcategory.
 *
 * Usage:
 *   npx tsx scripts/generate-pt-descriptions.ts [--dry-run]
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load env from .env.local
const envPath = path.resolve(__dirname, '../.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  const val = trimmed.slice(eqIdx + 1).trim()
  if (!process.env[key]) process.env[key] = val
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)
const DRY_RUN = process.argv.includes('--dry-run')

interface ProductInfo {
  id: string
  name: string
  category: string | null
  weight: string | null
  subcategory: string | null
}

interface BOMEntry {
  product_id: string
  material_id: string
  quantity_needed: number
  original_quantity: number | null
}

interface ResolvedIngredient {
  name: string
  category: string | null
  proportion: number
  via: string | null
}

// ──────────────────────────────────────────────────────────────────────
// Data loading
// ──────────────────────────────────────────────────────────────────────

let productMap: Map<string, ProductInfo>
let bomByProduct: Map<string, BOMEntry[]>

async function loadData() {
  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id, name, category, weight, subcategory')

  if (pErr) { console.error('Error fetching products:', pErr); process.exit(1) }

  productMap = new Map()
  for (const p of products!) productMap.set(p.id, p)
  console.log(`Loaded ${productMap.size} products`)

  const { data: bom, error: bErr } = await supabase
    .schema('produccion' as any)
    .from('bill_of_materials')
    .select('product_id, material_id, quantity_needed, original_quantity')
    .eq('is_active', true)

  if (bErr) { console.error('Error fetching BOM:', bErr); process.exit(1) }

  bomByProduct = new Map()
  for (const item of bom!) {
    const pid = (item as any).product_id
    if (!bomByProduct.has(pid)) bomByProduct.set(pid, [])
    bomByProduct.get(pid)!.push(item as any)
  }
  console.log(`Loaded ${bom!.length} BOM entries across ${bomByProduct.size} products\n`)
}

// ──────────────────────────────────────────────────────────────────────
// Recursive BOM resolution
// ──────────────────────────────────────────────────────────────────────

function resolveIngredients(
  productId: string,
  parentProportion: number = 1,
  visited: Set<string> = new Set(),
  via: string | null = null,
): ResolvedIngredient[] {
  if (visited.has(productId)) return []
  visited.add(productId)

  const bom = bomByProduct.get(productId)
  if (!bom || bom.length === 0) return []

  const totalQty = bom.reduce((s, b) => s + (b.original_quantity || b.quantity_needed || 0), 0)
  if (totalQty === 0) return []

  const results: ResolvedIngredient[] = []

  for (const entry of bom) {
    const mat = productMap.get(entry.material_id)
    if (!mat) continue

    const qty = entry.original_quantity || entry.quantity_needed || 0
    const proportion = (qty / totalQty) * parentProportion

    if (mat.category === 'PP') {
      const subVia = via ? `${via} > ${mat.name}` : mat.name
      const subIngredients = resolveIngredients(mat.id, proportion, new Set(visited), subVia)
      if (subIngredients.length > 0) {
        // If all resolved sub-ingredients are boring/dough, use the PP name instead
        // (e.g., "RELLENO PAN DE CHOCOLATE" resolves to sugar+butter → use PP name)
        const hasInteresting = subIngredients.some(
          i => !isBoringIngredient(i.name) && !isDoughIngredient(i.name)
        )
        if (hasInteresting) {
          results.push(...subIngredients)
        } else {
          results.push({ name: mat.name, category: mat.category, proportion, via })
        }
      } else {
        results.push({ name: mat.name, category: mat.category, proportion, via })
      }
    } else {
      results.push({ name: mat.name, category: mat.category, proportion, via })
    }
  }

  return results
}

// ──────────────────────────────────────────────────────────────────────
// Ingredient classification
// ──────────────────────────────────────────────────────────────────────

/** Ingredients that should NEVER appear in descriptions - basic/technical */
const BORING_PATTERNS = [
  'brillo', 'agua', /\bsal\b/, 'levadura', 'mejorador', 'huevo', 'margarina',
  'grasa', 'aceite', 'colorante', 'esencia', 'preservante', 'antimoho',
  'propionato', 'vinagre', 'bicarbonato', 'fecula', 'almidon',
  'emulsificante', 'lecitina', 'desmoldante', 'polvo para hornear',
  'recorte', 'leche', 'color caramelo', 'premezcla', 'proteina',
  'cebolla', 'decorado', 'semillas de', 'semillas ajo', 'queso parmesano',
]

/** Dough/base ingredients - not interesting as fillings */
const DOUGH_PATTERNS = [
  'masa', 'hojaldre', 'empaste', 'harina', /\bazucar\b/i, /\bazúcar\b/i,
  'panela', 'mantequilla', 'margarina de empaste',
]

function matchesPatterns(name: string, patterns: (string | RegExp)[]): boolean {
  const l = name.toLowerCase()
  return patterns.some(p => {
    if (typeof p === 'string') return l.includes(p)
    return p.test(l)
  })
}

function isBoringIngredient(name: string): boolean {
  return matchesPatterns(name, BORING_PATTERNS)
}

function isDoughIngredient(name: string): boolean {
  return matchesPatterns(name, DOUGH_PATTERNS)
}

/** Clean a raw material name into something customer-friendly */
function cleanIngredientName(rawName: string): string {
  let n = rawName.toLowerCase()

  // Map specific raw material names to friendly versions
  const mappings: [RegExp, string][] = [
    [/pechuga de pollo/i, 'pollo'],
    [/carne molida/i, 'carne molida'],
    [/carne descargue/i, 'carne'],
    [/cernido de guayaba/i, 'guayaba'],
    [/bocadillo solido/i, 'bocadillo'],
    [/arequipe manjar blanco/i, 'arequipe'],
    [/queso doble crema/i, 'mezcla de queso'],
    [/queso mozzarella entero/i, 'queso mozzarella'],
    [/queso campesino/i, 'queso campesino'],
    [/queso costeno/i, 'queso costeño'],
    [/queso costeño/i, 'queso costeño'],
    [/queso parmesano/i, 'queso parmesano'],
    [/queso ricotta/i, 'queso ricotta'],
    [/queso crema/i, 'mezcla de queso'],
    [/tocineta ahumada/i, 'tocineta'],
    [/jamon villaseca/i, 'jamon'],
    [/chocolate belcosteak/i, 'chocolate'],
    [/chocolate semiamargo/i, 'chocolate'],
    [/chunks de chocolate/i, 'chocolate'],
    [/granillo chocolate/i, 'chocolate'],
    [/almendra tajada/i, 'almendras filadas'],
    [/harina almendra/i, 'almendras'],
    [/manzana gala/i, 'manzana'],
    [/manzana verde/i, 'manzana verde'],
    [/semillas de ajonjoli/i, 'ajonjoli'],
    [/semillas ajonjoli/i, 'ajonjoli'],
    [/semillas de chia/i, 'chia'],
    [/relleno de avellanas/i, 'avellanas'],
    [/relleno pan de chocolate/i, 'chocolate'],
    [/relleno de canela/i, 'canela'],
    [/relleno manzana/i, 'manzana'],
    [/relleno queso/i, 'queso'],
    [/relleno de pollo/i, 'pollo'],
    [/relleno de bocadillo/i, 'bocadillo'],
    [/relleno f\. rojos/i, 'frutos rojos'],
    [/relleno frutos rojos/i, 'frutos rojos'],
    [/tomate/i, 'tomate'],
    [/salsa napolitana/i, 'salsa napolitana'],
    [/espinaca/i, 'espinaca'],
    [/picadillo/i, 'vegetales'],
    [/decorado semillas/i, 'semillas'],
    [/decorado mogolla/i, 'semillas'],
    [/cebolla/i, 'cebolla'],
  ]

  for (const [pattern, replacement] of mappings) {
    if (pattern.test(rawName)) return replacement
  }

  // Generic cleanup
  n = n
    .replace(/^(relleno|cobertura|decorado|granillo|salsa|crema)\s+(de\s+)?/i, '')
    .replace(/\s+(cr|econo|generico|villaseca|belcosteak|semiamargo|premium|especial)\b/gi, '')
    .replace(/\s+\d+\s*g?\b/gi, '')
    .replace(/\s+(con|sin)\s+proteina/gi, '')
    .replace(/\s*x\s*\d+\s*(kg|g|lb|und|ml|lt)?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  return n
}

// ──────────────────────────────────────────────────────────────────────
// Product type mapping
// ──────────────────────────────────────────────────────────────────────

interface ProductType {
  base: string
  dough: string
  /** 'con' for mixed-in ingredients, 'relleno de' for stuffed */
  fillingWord: string
}

function getProductType(name: string): ProductType {
  const n = name.toLowerCase()

  // Empanadas (maiz vs trigo)
  if (n.includes('empanada') && n.includes('maiz'))
    return { base: 'Empanada de maíz', dough: 'auténtica masa de maíz', fillingWord: 'rellena de' }
  if (n.includes('empanada'))
    return { base: 'Empanada de hojaldre', dough: 'delicada masa hojaldrada', fillingWord: 'rellena de' }
  if (n.includes('empanatica'))
    return { base: 'Empanatica', dough: 'masa artesanal dorada', fillingWord: 'rellena de' }

  // Croissants - check if margarina variant
  if (n.includes('croissant') && n.includes('margarina'))
    return { base: 'Croissant', dough: 'finas capas de masa laminada', fillingWord: 'relleno de' }
  if (n.includes('croissant'))
    return { base: 'Croissant', dough: 'finas capas de masa laminada con mantequilla', fillingWord: 'relleno de' }

  // Hojaldre family
  if (n.includes('flauta'))
    return { base: 'Flauta de hojaldre', dough: 'crujiente masa hojaldrada dorada', fillingWord: 'rellena de' }
  if (n.includes('palito'))
    return { base: 'Palito de hojaldre', dough: 'crujiente masa hojaldrada', fillingWord: 'relleno de' }
  if (n.includes('strudel'))
    return { base: 'Strudel de hojaldre', dough: 'delicadas capas de masa hojaldrada', fillingWord: 'relleno de' }
  if (n.includes('volovan') || n.includes('vol '))
    return { base: 'Volován de hojaldre', dough: 'ligera masa hojaldrada', fillingWord: 'relleno de' }
  if (n.includes('lamina'))
    return { base: 'Lámina de hojaldre', dough: 'masa hojaldrada lista para hornear', fillingWord: 'con' }
  if (n.includes('pañuelo'))
    return { base: 'Pañuelo de hojaldre', dough: 'suave masa laminada', fillingWord: 'relleno de' }
  if (n.includes('trenza'))
    return { base: 'Trenza de hojaldre', dough: 'masa hojaldrada trenzada a mano', fillingWord: 'rellena de' }
  if (n.includes('oreja'))
    return { base: 'Oreja de hojaldre', dough: 'masa hojaldrada caramelizada', fillingWord: 'con' }
  if (n.includes('pastel') || n.includes('hojaldre'))
    return { base: 'Hojaldre', dough: 'crujiente masa hojaldrada de múltiples capas', fillingWord: 'relleno de' }

  // Danes / napolitana
  if (n.includes('napolitana'))
    return { base: 'Napolitana', dough: 'suave masa laminada', fillingWord: 'rellena de' }
  if (n.includes('danes') || n.includes('danesa') || n.includes('danés'))
    return { base: 'Danés', dough: 'delicada masa laminada con mantequilla', fillingWord: 'relleno de' }

  // Rolls
  if (n.includes('cinnamon') || (n.includes('roll') && n.includes('canela')))
    return { base: 'Rollo de canela', dough: 'esponjosa masa laminada con mantequilla', fillingWord: 'con' }
  if (n.includes('roll') || n.includes('rollo'))
    return { base: 'Roll de masa laminada', dough: 'suave masa laminada', fillingWord: 'relleno de' }

  // Crookie
  if (n.includes('crookie'))
    return { base: 'Crookie', dough: 'irresistible fusión de cookie y croissant', fillingWord: 'con' }

  // Roscones
  if (n.includes('roscon') || n.includes('roscón') || n.includes('pera'))
    return { base: 'Roscón', dough: 'tradicional masa dulce', fillingWord: 'relleno de' }

  // Traditional Colombian
  if (n.includes('arepa'))
    return { base: 'Arepa', dough: 'auténtica masa de maíz', fillingWord: 'con' }
  if (n.includes('buñuelo') || n.includes('bunuelo'))
    return { base: 'Buñuelo', dough: 'esponjosa masa de queso y almidón', fillingWord: 'con' }
  if (n.includes('almojabana') || n.includes('almojábana'))
    return { base: 'Almojábana', dough: 'tradicional masa de queso y maíz', fillingWord: 'con' }
  if (n.includes('pan de bono'))
    return { base: 'Pan de bono', dough: 'masa de queso y almidón de yuca', fillingWord: 'con' }
  if (n.includes('pan de yuca'))
    return { base: 'Pan de yuca', dough: 'suave masa de almidón de yuca y queso', fillingWord: 'con' }
  if (n.includes('pan de coco'))
    return { base: 'Pan de coco', dough: 'dulce masa perfumada con coco', fillingWord: 'con' }
  if (n.includes('pan de chocolate') || n.includes('pan chocolate'))
    return { base: 'Pain au chocolat', dough: 'finas capas de masa laminada con mantequilla', fillingWord: 'relleno de' }
  if (n.includes('mogolla'))
    return { base: 'Mogolla integral', dough: 'nutritiva masa integral con semillas', fillingWord: 'con' }
  if (n.includes('mojicon') || n.includes('mojicón'))
    return { base: 'Mojicón', dough: 'esponjosa masa dulce tradicional', fillingWord: 'con' }
  if (n.includes('cucas') || n.includes('cuca'))
    return { base: 'Cucas', dough: 'tradicional masa de panela y especias', fillingWord: 'con' }
  if (n.includes('calentano'))
    return { base: 'Calentano', dough: 'auténtica masa de maíz tradicional', fillingWord: 'con' }
  if (n.includes('kibbeh'))
    return { base: 'Kibbeh', dough: 'masa de trigo y carne especiada', fillingWord: 'relleno de' }
  if (n.includes('panecillo'))
    return { base: 'Panecillo', dough: 'suave masa artesanal', fillingWord: 'con' }

  // Pan family
  if (n.includes('pan blando') || n.includes('blandito') || n.includes('costen'))
    return { base: 'Pan blandito', dough: 'suave masa esponjosa', fillingWord: 'relleno de' }
  if (n.includes('pan '))
    return { base: 'Pan de masa laminada', dough: 'delicada masa laminada', fillingWord: 'relleno de' }

  return { base: 'Producto de panadería', dough: 'masa artesanal', fillingWord: 'con' }
}

// ──────────────────────────────────────────────────────────────────────
// Description generation
// ──────────────────────────────────────────────────────────────────────

function generateDescriptionFromBOM(
  product: ProductInfo,
  ingredients: ResolvedIngredient[],
): string {
  const sorted = [...ingredients].sort((a, b) => b.proportion - a.proportion)
  const type = getProductType(product.name)

  // Find flavor-defining ingredients (not boring, not dough)
  const flavorIngredients = sorted
    .filter(i => !isBoringIngredient(i.name) && !isDoughIngredient(i.name) && i.proportion >= 0.015)
    .map(i => cleanIngredientName(i.name))
    .filter(n => n.length > 1)

  // Deduplicate
  const seen = new Set<string>()
  const uniqueFlavors = flavorIngredients.filter(n => {
    const key = n.toLowerCase()
    if (seen.has(key)) return false
    // Also check if a substring already exists (e.g., "queso" covers "queso crema")
    for (const existing of seen) {
      if (key.includes(existing) && existing.length >= 4) return false
    }
    seen.add(key)
    return true
  })

  // Pick top 2-3 ingredients
  const topFlavors = uniqueFlavors.slice(0, 3)

  // Filter out ingredients already mentioned in the base/dough description
  const doughLower = type.dough.toLowerCase()
  const baseLower = type.base.toLowerCase()
  const filteredFlavors = topFlavors.filter(n => {
    const nl = n.toLowerCase()
    // Don't repeat "coco" if base is "Pan de coco" or dough mentions coco
    if (doughLower.includes(nl) || baseLower.includes(nl)) return false
    // Don't repeat "queso" if base mentions queso
    if (nl === 'queso' && (doughLower.includes('queso') || baseLower.includes('queso'))) return false
    return true
  })

  let desc = `${type.base} elaborado con ${type.dough}`

  if (filteredFlavors.length > 0) {
    const names = filteredFlavors
    if (names.length === 1) {
      desc += `, ${type.fillingWord} ${names[0]}`
    } else if (names.length === 2) {
      desc += `, ${type.fillingWord} ${names[0]} y ${names[1]}`
    } else {
      desc += `, ${type.fillingWord} ${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
    }
  }

  desc += '.'
  return desc
}

function generateDescriptionFromName(product: ProductInfo): string {
  const type = getProductType(product.name)
  const pn = product.name.toLowerCase()

  // Try to extract filling from product name
  const fillingPatterns: [RegExp, string][] = [
    [/chocolate/i, 'chocolate'],
    [/arequipe/i, 'arequipe'],
    [/queso\s*(y\s*)?jamon|jamon\s*(y\s*)?queso/i, 'jamon y queso'],
    [/queso(?!\s*y\s*jamon)/i, 'queso'],
    [/jamon(?!\s*y\s*queso)/i, 'jamon'],
    [/bocadillo/i, 'bocadillo y guayaba'],
    [/guayaba/i, 'guayaba'],
    [/pollo/i, 'pollo'],
    [/carne/i, 'carne'],
    [/espinaca/i, 'espinaca, queso ricotta y variedad de semillas'],
    [/manzana/i, 'manzana'],
    [/canela/i, 'canela'],
    [/frutos\s*secos/i, 'frutos secos'],
    [/frutos\s*rojos/i, 'frutos rojos'],
    [/almendra/i, 'almendras'],
    [/avellana/i, 'avellanas'],
    [/hawaian/i, 'jamon y piña'],
    [/napolitana/i, 'jamon, queso y salsa napolitana'],
    [/mixto/i, 'jamon y queso'],
    [/gloria/i, 'arequipe y queso'],
    [/carbonara/i, 'pollo y salsa carbonara'],
    [/coco/i, 'coco'],
  ]

  let filling: string | null = null
  for (const [pattern, f] of fillingPatterns) {
    if (pattern.test(pn)) {
      filling = f
      break
    }
  }

  let desc = `${type.base} elaborado con ${type.dough}`

  // Filter out fillings that are redundant with the base/dough description
  if (filling) {
    const doughLower = type.dough.toLowerCase()
    const baseLower = type.base.toLowerCase()
    const fillingParts = filling.split(/,\s*| y /)
    const filteredParts = fillingParts.filter(f => {
      const fl = f.trim().toLowerCase()
      return !doughLower.includes(fl) && !baseLower.includes(fl)
    })
    if (filteredParts.length > 0) {
      const rejoined = filteredParts.length === 1
        ? filteredParts[0]
        : filteredParts.slice(0, -1).join(', ') + ' y ' + filteredParts[filteredParts.length - 1]
      desc += `, ${type.fillingWord} ${rejoined}`
    }
  }

  desc += '.'
  return desc
}

// ──────────────────────────────────────────────────────────────────────
// Manual description overrides (product name pattern → description)
// ──────────────────────────────────────────────────────────────────────

const MANUAL_OVERRIDES: [RegExp, string][] = [
  // Croissant de jamón y queso es en margarina (no mantequilla)
  [/croissant.*jam[oó]n.*queso|croissant.*queso.*jam[oó]n/i,
    'Croissant elaborado con finas capas de masa laminada en margarina, relleno de jamón y queso.'],
  // Pastel de manzana: almendras filadas
  [/pastel.*manzana|hojaldre.*manzana/i,
    'Hojaldre elaborado con crujiente masa hojaldrada de múltiples capas, relleno de manzana y cubierto de almendras filadas.'],
  // Pastel de carne ranchero: incluir maíz
  [/pastel.*carne.*ranchero|hojaldre.*carne.*ranchero/i,
    'Hojaldre elaborado con crujiente masa hojaldrada de múltiples capas, relleno de carne y maíz.'],
  // Pastel de espinaca queso ricota: variedad de semillas, sin parmesano
  [/pastel.*espinaca.*ricot|hojaldre.*espinaca.*ricot/i,
    'Hojaldre elaborado con crujiente masa hojaldrada de múltiples capas, relleno de espinaca, queso ricotta y variedad de semillas.'],
  // Pastel de pollo carbonara: salsa carbonara (must be before generic pollo)
  [/pastel.*pollo.*carbonara|hojaldre.*pollo.*carbonara/i,
    'Hojaldre elaborado con crujiente masa hojaldrada de múltiples capas, relleno de pollo y salsa carbonara.'],
  // Pastel de pollo: relleno de pollo (generic, after carbonara)
  [/pastel.*pollo|hojaldre.*pollo/i,
    'Hojaldre elaborado con crujiente masa hojaldrada de múltiples capas, relleno de pollo.'],
  // Pan costeñito: mezcla de queso dulce + queso costeño
  [/coste[ñn]ito/i,
    'Pan blandito elaborado con suave masa esponjosa, relleno de mezcla de queso dulce y cubierto con queso costeño.'],
]

function getManualOverride(productName: string): string | null {
  for (const [pattern, description] of MANUAL_OVERRIDES) {
    if (pattern.test(productName)) return description
  }
  return null
}

// ──────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== UPDATING DESCRIPTIONS ===')

  await loadData()

  const ptProducts = [...productMap.values()]
    .filter(p => p.category === 'PT')
    .sort((a, b) => {
      const sc = (a.subcategory || '').localeCompare(b.subcategory || '')
      return sc !== 0 ? sc : a.name.localeCompare(b.name)
    })

  console.log(`Found ${ptProducts.length} PT products\n`)

  let updated = 0
  let fromBOM = 0
  let fromName = 0

  for (const product of ptProducts) {
    let description: string
    let source: string

    // Check manual overrides first
    const override = getManualOverride(product.name)
    if (override) {
      description = override
      source = 'OVERRIDE'
      console.log(`\n  [OVERRIDE] ${product.name}`)
    } else {
      const ingredients = resolveIngredients(product.id)

      if (ingredients.length > 0) {
        description = generateDescriptionFromBOM(product, ingredients)
        source = 'BOM'
        fromBOM++

        const topIngredients = [...ingredients]
          .sort((a, b) => b.proportion - a.proportion)
          .slice(0, 6)
          .map(i => `${i.name} (${(i.proportion * 100).toFixed(1)}%${i.via ? ` via ${i.via}` : ''})`)
        console.log(`\n  [BOM] ${product.name}`)
        console.log(`    Ingredients: ${topIngredients.join(', ')}`)
      } else {
        description = generateDescriptionFromName(product)
        source = 'NAME'
        fromName++
        console.log(`\n  [NAME] ${product.name}`)
      }
    }

    console.log(`    DESC: ${description}`)

    if (!DRY_RUN) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ description })
        .eq('id', product.id)

      if (updateError) {
        console.error(`    ERROR updating: ${updateError.message}`)
      } else {
        updated++
      }
    } else {
      updated++
    }
  }

  console.log(`\n=== DONE ===`)
  console.log(`Updated: ${updated} (${fromBOM} from BOM, ${fromName} from name)`)
  console.log(`Total PT products: ${ptProducts.length}`)
}

main().catch(console.error)
