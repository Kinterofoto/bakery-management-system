#!/usr/bin/env node
// Smoke tests for migration 20260427000001_allow_negative_inventory_balances
// Crea fixtures temporales con prefijo __TEST_NEG_INV__ y los limpia al final.
// Usa el service role key (bypass RLS).

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')
const { createClient } = await import(
  join(repoRoot, 'apps', 'web', 'node_modules', '@supabase', 'supabase-js', 'dist', 'index.mjs')
)
const envPath = join(__dirname, '..', '..', 'apps', 'web', '.env.local')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } })

const TAG = '__TEST_NEG_INV__'
const results = []
let failed = false

function record(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log(`  ${ok ? 'OK' : 'FAIL'} — ${name}${detail ? `: ${detail}` : ''}`)
  if (!ok) failed = true
}

async function findUserId() {
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 1 })
  if (error) throw error
  return data?.users?.[0]?.id
}

async function setBalance(productId, locationId, qty) {
  const { error } = await sb
    .schema('inventario')
    .from('inventory_balances')
    .upsert(
      { product_id: productId, location_id: locationId, quantity_on_hand: qty },
      { onConflict: 'product_id,location_id' }
    )
  if (error) throw error
}

async function getBalance(productId, locationId) {
  const { data, error } = await sb
    .schema('inventario')
    .from('inventory_balances')
    .select('quantity_on_hand')
    .eq('product_id', productId)
    .eq('location_id', locationId)
    .maybeSingle()
  if (error) throw error
  return data ? Number(data.quantity_on_hand) : 0
}

async function setup() {
  console.log('\n=== SETUP ===')

  // 1) producto temporal
  const { data: prod, error: pErr } = await sb
    .from('products')
    .insert({
      name: `${TAG}-product-${Date.now()}`,
      unit: 'und',
      category: 'PT',
      weight: '0g',
      is_active: true,
    })
    .select('id')
    .single()
  if (pErr) throw pErr
  const productId = prod.id
  console.log(`  product: ${productId}`)

  // 2) almacén raíz + 2 bins
  const { data: wh, error: whErr } = await sb
    .schema('inventario')
    .from('locations')
    .insert({
      code: `${TAG}-WH-${Date.now()}`,
      name: 'Test Warehouse',
      location_type: 'warehouse',
      level: 1,
      is_active: true,
    })
    .select('id')
    .single()
  if (whErr) throw whErr
  const warehouseId = wh.id

  const { data: locs, error: lErr } = await sb
    .schema('inventario')
    .from('locations')
    .insert([
      {
        code: `${TAG}-A-${Date.now()}`,
        name: 'Test Bin A',
        location_type: 'bin',
        parent_id: warehouseId,
        level: 2,
        is_active: true,
      },
      {
        code: `${TAG}-B-${Date.now()}`,
        name: 'Test Bin B',
        location_type: 'bin',
        parent_id: warehouseId,
        level: 2,
        is_active: true,
      },
    ])
    .select('id, code')
  if (lErr) throw lErr
  const locA = locs.find(l => l.code.includes('-A-')).id
  const locB = locs.find(l => l.code.includes('-B-')).id
  console.log(`  loc_a: ${locA}, loc_b: ${locB}`)

  // 3) Balance inicial NEGATIVO en A
  await setBalance(productId, locA, -1952)
  console.log(`  loc_a balance set to -1952`)

  const userId = await findUserId()
  if (!userId) throw new Error('No hay usuarios en auth.users')
  console.log(`  user: ${userId}`)

  return { productId, warehouseId, locA, locB, userId }
}

async function cleanup({ productId, warehouseId, locA, locB }) {
  console.log('\n=== CLEANUP ===')

  // Order: adjustments → balances → movements → inventories → locations (children → parent) → product
  const { error: aErr } = await sb
    .from('inventory_adjustments')
    .delete()
    .eq('product_id', productId)
  if (aErr) console.warn('cleanup adjustments:', aErr.message)

  // Balances first (reference movements via last_movement_id)
  const { error: bErr } = await sb
    .schema('inventario')
    .from('inventory_balances')
    .delete()
    .eq('product_id', productId)
  if (bErr) console.warn('cleanup balances:', bErr.message)

  // Movements
  const { error: mErr } = await sb
    .schema('inventario')
    .from('inventory_movements')
    .delete()
    .eq('product_id', productId)
  if (mErr) console.warn('cleanup movements:', mErr.message)

  // Inventories (after adjustments)
  const { error: iErr } = await sb
    .from('inventories')
    .delete()
    .in('location_id', [locA, locB])
  if (iErr) console.warn('cleanup inventories:', iErr.message)

  // Locations: bins (children) first, then warehouse (parent)
  const { error: lcErr } = await sb
    .schema('inventario')
    .from('locations')
    .delete()
    .in('id', [locA, locB])
  if (lcErr) console.warn('cleanup loc bins:', lcErr.message)

  const { error: lwErr } = await sb
    .schema('inventario')
    .from('locations')
    .delete()
    .eq('id', warehouseId)
  if (lwErr) console.warn('cleanup loc wh:', lwErr.message)

  // Product
  const { error: pErr } = await sb.from('products').delete().eq('id', productId)
  if (pErr) console.warn('cleanup product:', pErr.message)

  console.log('  done')
}

async function runTests(ctx) {
  const { productId, locA, locB, userId } = ctx

  console.log('\n=== TESTS ===')

  // T1: IN sobre balance negativo
  try {
    const { data, error } = await sb.schema('inventario').rpc('perform_inventory_movement', {
      p_product_id: productId,
      p_quantity: 1529.6,
      p_movement_type: 'IN',
      p_reason_type: 'production',
      p_location_id_from: null,
      p_location_id_to: locA,
      p_reference_id: null,
      p_reference_type: null,
      p_notes: TAG,
      p_recorded_by: userId,
      p_batch_number: null,
      p_expiry_date: null,
    })
    if (error) throw error
    if (!data?.success) throw new Error(`RPC retornó success=false: ${JSON.stringify(data)}`)
    const bal = await getBalance(productId, locA)
    const expected = -1952 + 1529.6
    if (Math.abs(bal - expected) > 0.001) throw new Error(`balance=${bal}, esperado=${expected}`)
    record('T1 IN sobre balance negativo (-1952 → -422.4)', true)
  } catch (e) {
    record('T1 IN sobre balance negativo', false, e.message)
  }

  // T2: OUT que cruza a negativo (loc_b empieza en 0)
  try {
    const { data, error } = await sb.schema('inventario').rpc('perform_inventory_movement', {
      p_product_id: productId,
      p_quantity: 100,
      p_movement_type: 'OUT',
      p_reason_type: 'consumption',
      p_location_id_from: locB,
      p_location_id_to: null,
      p_reference_id: null,
      p_reference_type: null,
      p_notes: TAG,
      p_recorded_by: userId,
      p_batch_number: null,
      p_expiry_date: null,
    })
    if (error) throw error
    if (!data?.success) throw new Error(`success=false: ${JSON.stringify(data)}`)
    const bal = await getBalance(productId, locB)
    if (bal !== -100) throw new Error(`balance=${bal}, esperado=-100`)
    record('T2 OUT que cruza a negativo (0 → -100)', true)
  } catch (e) {
    record('T2 OUT que cruza a negativo', false, e.message)
  }

  // T3: TRANSFER cruzando negativos en ambos extremos
  try {
    const { data: out, error: oErr } = await sb
      .schema('inventario')
      .rpc('perform_inventory_movement', {
        p_product_id: productId,
        p_quantity: 50,
        p_movement_type: 'TRANSFER_OUT',
        p_reason_type: 'transfer',
        p_location_id_from: locB,
        p_location_id_to: locA,
        p_reference_id: null,
        p_reference_type: null,
        p_notes: TAG,
        p_recorded_by: userId,
        p_batch_number: null,
        p_expiry_date: null,
      })
    if (oErr) throw oErr
    if (!out?.success) throw new Error(`OUT success=false: ${JSON.stringify(out)}`)

    const { data: inn, error: iErr } = await sb
      .schema('inventario')
      .rpc('perform_inventory_movement', {
        p_product_id: productId,
        p_quantity: 50,
        p_movement_type: 'TRANSFER_IN',
        p_reason_type: 'transfer',
        p_location_id_from: locB,
        p_location_id_to: locA,
        p_reference_id: null,
        p_reference_type: null,
        p_notes: TAG,
        p_recorded_by: userId,
        p_batch_number: null,
        p_expiry_date: null,
      })
    if (iErr) throw iErr
    if (!inn?.success) throw new Error(`IN success=false: ${JSON.stringify(inn)}`)

    const balA = await getBalance(productId, locA)
    const balB = await getBalance(productId, locB)
    if (Math.abs(balA - -372.4) > 0.001) throw new Error(`balA=${balA}, esp=-372.4`)
    if (balB !== -150) throw new Error(`balB=${balB}, esp=-150`)
    record('T3 TRANSFER cruzando negativos (loc_a=-372.4, loc_b=-150)', true)
  } catch (e) {
    record('T3 TRANSFER cruzando negativos', false, e.message)
  }

  // T4: apply_inventory_adjustment positivo desde balance negativo
  try {
    const { data: inv, error: invErr } = await sb
      .from('inventories')
      .insert({ location_id: locA, name: TAG, status: 'in_progress', created_by: userId })
      .select('id')
      .single()
    if (invErr) throw invErr

    const { data: adj, error: adjErr } = await sb
      .from('inventory_adjustments')
      .insert({
        inventory_id: inv.id,
        product_id: productId,
        counted_quantity: 500,
        actual_quantity: 0,
        difference: 500,
        adjustment_type: 'positive',
        adjustment_quantity: 500,
        custom_reason: TAG,
        status: 'pending',
        created_by: userId,
      })
      .select('id')
      .single()
    if (adjErr) throw adjErr

    const { data, error } = await sb.rpc('apply_inventory_adjustment', {
      p_adjustment_id: adj.id,
      p_user_id: userId,
    })
    if (error) throw error
    if (!data) throw new Error('apply_inventory_adjustment retornó NULL')

    const bal = await getBalance(productId, locA)
    // -372.4 + 500 = 127.6
    if (Math.abs(bal - 127.6) > 0.001) throw new Error(`balance=${bal}, esp=127.6`)
    record('T4 ajuste (+) desde balance negativo (-372.4 → 127.6)', true)
  } catch (e) {
    record('T4 ajuste (+) desde balance negativo', false, e.message)
  }

  // T5: apply_inventory_adjustment negativo cruzando a negativo
  try {
    const { data: inv, error: invErr } = await sb
      .from('inventories')
      .insert({ location_id: locA, name: TAG, status: 'in_progress', created_by: userId })
      .select('id')
      .single()
    if (invErr) throw invErr

    const { data: adj, error: adjErr } = await sb
      .from('inventory_adjustments')
      .insert({
        inventory_id: inv.id,
        product_id: productId,
        counted_quantity: 0,
        actual_quantity: 200,
        difference: -200,
        adjustment_type: 'negative',
        adjustment_quantity: 200,
        custom_reason: TAG,
        status: 'pending',
        created_by: userId,
      })
      .select('id')
      .single()
    if (adjErr) throw adjErr

    const { error } = await sb.rpc('apply_inventory_adjustment', {
      p_adjustment_id: adj.id,
      p_user_id: userId,
    })
    if (error) throw error

    const bal = await getBalance(productId, locA)
    // 127.6 - 200 = -72.4
    if (Math.abs(bal - -72.4) > 0.001) throw new Error(`balance=${bal}, esp=-72.4`)
    record('T5 ajuste (−) cruzando a negativo (127.6 → -72.4)', true)
  } catch (e) {
    record('T5 ajuste (−) cruzando a negativo', false, e.message)
  }

  // T6: dispatch sigue funcionando con allow_dispatch_without_inventory=true
  try {
    const { data: cfg } = await sb
      .from('dispatch_inventory_config')
      .select('allow_dispatch_without_inventory')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .maybeSingle()
    if (cfg && cfg.allow_dispatch_without_inventory === false) {
      record('T6 dispatch (skipped: allow_dispatch_without_inventory=false en BD)', true, 'skipped')
    } else {
      const { data, error } = await sb.schema('inventario').rpc('perform_dispatch_movement', {
        p_product_id: productId,
        p_quantity: 100,
        p_location_id_from: locB,
        p_order_id: '00000000-0000-0000-0000-000000000999',
        p_order_number: `${TAG}-DSP`,
        p_notes: TAG,
        p_recorded_by: userId,
      })
      if (error) throw error
      if (!data?.success) throw new Error(`success=false: ${JSON.stringify(data)}`)
      record('T6 dispatch sigue funcionando', true)
    }
  } catch (e) {
    record('T6 dispatch sigue funcionando', false, e.message)
  }

  // T7: get_product_balance_by_location oculta negativos (comportamiento existente)
  try {
    const { data, error } = await sb
      .schema('inventario')
      .rpc('get_product_balance_by_location', { p_product_id: productId })
    if (error) throw error
    // En este punto loc_a y loc_b están negativos (después de T2/T3/T5/T6).
    // El reporte filtra > 0 → debe haber 0 filas.
    const negCount = (data || []).length
    if (negCount !== 0) {
      throw new Error(`reporte devolvió ${negCount} filas con balance negativo`)
    }
    record('T7 get_product_balance_by_location filtra negativos (preservado)', true)
  } catch (e) {
    record('T7 get_product_balance_by_location', false, e.message)
  }

  // T8: ledger consistente con balance final
  try {
    const { data: movs, error: mErr } = await sb
      .schema('inventario')
      .from('inventory_movements')
      .select('quantity, movement_type, location_id_from, location_id_to')
      .eq('product_id', productId)
    if (mErr) throw mErr

    const ledgerA = (movs || []).reduce((acc, m) => {
      if ((m.movement_type === 'IN' || m.movement_type === 'TRANSFER_IN') && m.location_id_to === locA)
        return acc + Number(m.quantity)
      if ((m.movement_type === 'OUT' || m.movement_type === 'TRANSFER_OUT') && m.location_id_from === locA)
        return acc - Number(m.quantity)
      return acc
    }, 0)
    const balA = await getBalance(productId, locA)
    // balance esperado = semilla(-1952) + ledger
    if (Math.abs(balA - (-1952 + ledgerA)) > 0.001) {
      throw new Error(`balA=${balA}, esp=${-1952 + ledgerA} (semilla -1952 + ledger ${ledgerA})`)
    }
    record('T8 ledger consistente con balance final', true, `loc_a=${balA}`)
  } catch (e) {
    record('T8 ledger consistente con balance final', false, e.message)
  }
}

async function main() {
  let ctx
  try {
    ctx = await setup()
    await runTests(ctx)
  } catch (e) {
    console.error('\nFATAL en setup:', e.message)
    failed = true
  } finally {
    if (ctx) {
      try {
        await cleanup(ctx)
      } catch (e) {
        console.error('cleanup error:', e.message)
      }
    }
  }

  console.log('\n=== RESUMEN ===')
  const ok = results.filter(r => r.ok).length
  const total = results.length
  console.log(`${ok}/${total} tests pasaron`)
  results.forEach(r => console.log(`  [${r.ok ? 'OK' : 'FAIL'}] ${r.name}`))
  process.exit(failed ? 1 : 0)
}

main()
