/**
 * One-time script to generate descriptions for all PT products based on their BOM.
 *
 * Usage:
 *   npx tsx scripts/generate-pt-descriptions.ts [--dry-run]
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load env from .env.local (manual parse to avoid dotenv dependency)
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

interface BOMItem {
  material_id: string
  quantity_needed: number
  original_quantity: number | null
  unit_name: string
}

interface MaterialInfo {
  id: string
  name: string
  category: string | null
}

interface Product {
  id: string
  name: string
  weight: string | null
  subcategory: string | null
}

/** Clean up a material name for display in description */
function cleanMaterialName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(relleno|masa|empaste|cobertura|decorado|granillo)\s+(de\s+)?/i, '')
    .replace(/\s+(cr|econo|generico|villaseca|belcosteak|semiamargo)\b/gi, '')
    .replace(/\s+\d+g?\b/gi, '')
    .replace(/\s+(con|sin)\s+proteina/gi, '')
    .replace(/\s+(premium|especial)\b/gi, '')
    .replace(/\bpan de\s+/gi, '')
    .replace(/\bf\.\s*/gi, 'frutos ')
    .replace(/\bpalito de\s+/gi, '')
    .replace(/\bcroissant\s*/gi, '')
    .replace(/\bpañuelo\b/gi, '')
    .replace(/\bpastel de\s+/gi, '')
    .replace(/\bmanjar blanco\b/gi, '')
    .replace(/\bblanco\b/gi, '')
    .replace(/\bdoble crema\b/gi, '')
    .replace(/\brollo de\s+/gi, '')
    .replace(/\by queso\b/gi, '')
    .replace(/\bcrookies?\b/gi, '')
    .replace(/\broscon\b/gi, '')
    .replace(/\bpan blando\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function generateDescription(
  product: Product,
  materials: { name: string; percentage: number }[]
): string {
  if (materials.length === 0) return ''

  const sorted = [...materials].sort((a, b) => b.percentage - a.percentage)

  // Classify ingredients
  const isFilling = (n: string) => {
    const l = n.toLowerCase()
    return l.includes('relleno') || l.includes('chocolate') || l.includes('arequipe') ||
      l.includes('queso') || l.includes('jamon') || l.includes('bocadillo') ||
      l.includes('guayaba') || l.includes('frutos') || l.includes('manzana') ||
      l.includes('canela') || l.includes('pollo') || l.includes('carne') ||
      l.includes('espinaca') || l.includes('almendra') || l.includes('avellana') ||
      l.includes('salsa') || l.includes('napolitana')
  }
  const isDough = (n: string) => {
    const l = n.toLowerCase()
    return l.includes('masa') || l.includes('hojaldre') || l.includes('empaste') ||
      l.includes('croissant') || l.includes('harina')
  }
  const isMinor = (n: string) => {
    const l = n.toLowerCase()
    return l.includes('brillo') || l.includes('agua') || l.includes('sal') ||
      l.includes('levadura') || l.includes('mejorador') || l.includes('huevo')
  }

  const fillings = sorted.filter((m) => isFilling(m.name) && m.percentage >= 2)
  const dough = sorted.filter((m) => isDough(m.name))
  const fillingPct = fillings.reduce((s, m) => s + m.percentage, 0)
  const doughPct = dough.reduce((s, m) => s + m.percentage, 0)

  // Determine product type
  const pn = product.name.toLowerCase()
  let base: string
  if (pn.includes('croissant')) base = 'Croissant de masa laminada'
  else if (pn.includes('flauta')) base = 'Flauta de hojaldre'
  else if (pn.includes('palito')) base = 'Palito de hojaldre crujiente'
  else if (pn.includes('pastel') || pn.includes('hojaldre')) base = 'Hojaldre laminado'
  else if (pn.includes('danes') || pn.includes('danesa')) base = 'Danes de masa laminada'
  else if (pn.includes('roll') || pn.includes('rollo')) base = 'Roll de masa laminada'
  else if (pn.includes('empanada')) base = 'Empanada de masa hojaldrada'
  else if (pn.includes('strudel')) base = 'Strudel de hojaldre'
  else if (pn.includes('volovan') || pn.includes('vol ')) base = 'Volovan de hojaldre'
  else if (pn.includes('lamina')) base = 'Lamina de hojaldre lista para hornear'
  else if (pn.includes('napolitana')) base = 'Napolitana de masa laminada'
  else if (pn.includes('crookie')) base = 'Crookie artesanal'
  else if (pn.includes('pan ')) base = 'Pan de masa laminada'
  else if (pn.includes('pera')) base = 'Roscon artesanal'
  else if (pn.includes('costen')) base = 'Pan artesanal'
  else base = 'Producto de panaderia artesanal'

  // Add filling description - deduplicate names
  if (fillings.length > 0) {
    const seen = new Set<string>()
    const names: string[] = []
    for (const m of fillings) {
      const clean = cleanMaterialName(m.name)
      if (clean.length <= 1 || seen.has(clean)) continue
      seen.add(clean)
      names.push(clean)
      if (names.length >= 2) break
    }
    if (names.length > 0) {
      base += ` con ${names.join(' y ')}`
    }
  }

  // Add composition ratio (only when both are significant and sum makes sense)
  const parts = [base]
  const totalClassified = fillingPct + doughPct
  if (fillingPct >= 10 && doughPct >= 10 && totalClassified <= 110) {
    parts.push(`${Math.round(doughPct)}% masa y ${Math.round(fillingPct)}% relleno`)
  }

  return parts.join('. ') + '.'
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== UPDATING DESCRIPTIONS ===')

  // 1. Get all active PT products visible in ecommerce
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, name, weight, subcategory, description')
    .eq('category', 'PT')
    .eq('is_active', true)
    .order('subcategory')
    .order('name')

  if (prodError) {
    console.error('Error fetching products:', prodError)
    process.exit(1)
  }

  console.log(`Found ${products.length} PT products\n`)

  // 2. Get all BOM items
  const { data: bomItems, error: bomError } = await supabase
    .schema('produccion' as any)
    .from('bill_of_materials')
    .select('product_id, material_id, quantity_needed, original_quantity, unit_name')
    .eq('is_active', true)

  if (bomError) {
    console.error('Error fetching BOM:', bomError)
    process.exit(1)
  }

  console.log(`Found ${bomItems.length} BOM items\n`)

  // 3. Get all material names
  const materialIds = [...new Set(bomItems.map((b: any) => b.material_id).filter(Boolean))]
  const { data: materials, error: matError } = await supabase
    .from('products')
    .select('id, name, category')
    .in('id', materialIds)

  if (matError) {
    console.error('Error fetching materials:', matError)
    process.exit(1)
  }

  const materialMap = new Map<string, MaterialInfo>()
  for (const m of materials) {
    materialMap.set(m.id, m)
  }

  // 4. Group BOM by product
  const bomByProduct = new Map<string, typeof bomItems>()
  for (const item of bomItems) {
    const pid = (item as any).product_id
    if (!bomByProduct.has(pid)) bomByProduct.set(pid, [])
    bomByProduct.get(pid)!.push(item)
  }

  // 5. Generate descriptions
  let updated = 0
  let skipped = 0

  for (const product of products) {
    const bom = bomByProduct.get(product.id)
    if (!bom || bom.length === 0) {
      console.log(`  SKIP (no BOM): ${product.name}`)
      skipped++
      continue
    }

    // Calculate percentages
    const totalQty = bom.reduce(
      (s: number, b: any) => s + (b.original_quantity || b.quantity_needed || 0),
      0
    )
    if (totalQty === 0) {
      console.log(`  SKIP (zero qty): ${product.name}`)
      skipped++
      continue
    }

    const materialsWithPct = bom
      .map((b: any) => {
        const mat = materialMap.get(b.material_id)
        const qty = b.original_quantity || b.quantity_needed || 0
        return {
          name: mat?.name || 'Desconocido',
          percentage: (qty / totalQty) * 100,
        }
      })
      .filter((m) => m.name !== 'Desconocido')

    const description = generateDescription(product, materialsWithPct)

    if (!description) {
      console.log(`  SKIP (empty desc): ${product.name}`)
      skipped++
      continue
    }

    console.log(`\n  ${product.name}`)
    console.log(`    BOM: ${materialsWithPct.map((m) => `${m.name} (${m.percentage.toFixed(1)}%)`).join(', ')}`)
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
  console.log(`Updated: ${updated}, Skipped: ${skipped}, Total: ${products.length}`)
}

main().catch(console.error)
