#!/usr/bin/env node
// Limpia fixtures de tests con prefijo __TEST_NEG_INV__ que hayan quedado huérfanos.

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')
const { createClient } = await import(
  join(repoRoot, 'apps', 'web', 'node_modules', '@supabase', 'supabase-js', 'dist', 'index.mjs')
)

const env = Object.fromEntries(
  readFileSync(join(repoRoot, 'apps', 'web', '.env.local'), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const TAG = '__TEST_NEG_INV__'

const { data: prods } = await sb.from('products').select('id, name').like('name', `${TAG}%`)
const productIds = (prods || []).map(p => p.id)
console.log(`products to remove: ${productIds.length}`)

const { data: locs } = await sb
  .schema('inventario')
  .from('locations')
  .select('id, code, parent_id, level')
  .like('code', `${TAG}%`)
const locIds = (locs || []).map(l => l.id)
console.log(`locations to remove: ${locIds.length}`)

if (productIds.length) {
  await sb.from('inventory_adjustments').delete().in('product_id', productIds)
  await sb.schema('inventario').from('inventory_balances').delete().in('product_id', productIds)
  await sb.schema('inventario').from('inventory_movements').delete().in('product_id', productIds)
}
if (locIds.length) {
  await sb.from('inventories').delete().in('location_id', locIds)
}

// bins first (level 2), then warehouses (level 1)
const bins = (locs || []).filter(l => l.level === 2).map(l => l.id)
const whs = (locs || []).filter(l => l.level === 1).map(l => l.id)
if (bins.length) await sb.schema('inventario').from('locations').delete().in('id', bins)
if (whs.length) await sb.schema('inventario').from('locations').delete().in('id', whs)
if (productIds.length) await sb.from('products').delete().in('id', productIds)

console.log('cleanup done')
