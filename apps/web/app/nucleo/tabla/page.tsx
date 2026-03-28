'use client'

import { useState, useRef, useCallback, useMemo, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  ChevronLeft, Search, Loader2, Save,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProductRow {
  id: string
  name: string
  weight: string | null
  category: string | null
  subcategory: string | null
  unit: string
  price: number | null
  tax_rate: number | null
  codigo_wo: string | null
  nombre_wo: string | null
  lote_minimo: number | null
  is_active: boolean
  visible_in_ecommerce: boolean
  description: string | null
  // technical specs
  ts_shelf_life_days: number | null
  ts_storage_conditions: string | null
  ts_packaging_type: string | null
  ts_packaging_units_per_box: number | null
  ts_net_weight: number | null
  ts_gross_weight: number | null
  ts_allergens: string | null
  ts_trazas_alergenos: string | null
  ts_notificacion_sanitaria: string | null
  ts_empaque_primario: string | null
  ts_empaque_secundario: string | null
  ts_peso_medio: number | null
  ts_peso_minimo: number | null
  ts_peso_maximo: number | null
  ts_vida_util_ambiente_horas: number | null
  ts_codigo_ficha: string | null
  ts_version_ficha: string | null
  // quality specs
  qs_control_frequency: string | null
  qs_rejection_criteria: string | null
  // costs
  cost_material: number | null
  cost_labor: number | null
  cost_overhead: number | null
  cost_packaging: number | null
  cost_total: number | null
  cost_profit_margin: number | null
  // commercial
  com_brand: string | null
  com_commercial_name: string | null
  com_seasonality: string | null
  // inventory
  inv_reorder_point: number | null
  inv_safety_stock: number | null
  inv_lead_time_days: number | null
  inv_abc_classification: string | null
  inv_storage_location: string | null
  inv_requires_cold_chain: boolean | null
}

// ─── Column definitions ─────────────────────────────────────────────────────

interface ColDef {
  key: keyof ProductRow
  label: string
  width?: number
  type?: 'text' | 'select' | 'number' | 'boolean'
  options?: string[]
  table?: string // which supabase table to update
  dbKey?: string // actual DB column name if different
}

interface ColGroup {
  id: string
  label: string
  icon: string
  columns: ColDef[]
}

const COLUMN_GROUPS: ColGroup[] = [
  {
    id: 'basico', label: 'Datos Basicos', icon: '📋',
    columns: [
      { key: 'category', label: 'Categoria', width: 80, type: 'select', options: ['PT', 'PP', 'MP'], table: 'products' },
      { key: 'subcategory', label: 'Subcategoria', width: 130, table: 'products' },
      { key: 'unit', label: 'Unidad', width: 80, table: 'products' },
      { key: 'weight', label: 'Peso', width: 80, table: 'products' },
      { key: 'price', label: 'Precio', width: 100, type: 'number', table: 'products' },
      { key: 'tax_rate', label: 'IVA %', width: 70, type: 'number', table: 'products' },
      { key: 'lote_minimo', label: 'Lote Min', width: 80, type: 'number', table: 'products' },
      { key: 'description', label: 'Descripcion', width: 250, table: 'products' },
    ],
  },
  {
    id: 'codigos', label: 'Codigos', icon: '🔗',
    columns: [
      { key: 'codigo_wo', label: 'Cod. WO', width: 120, table: 'products' },
      { key: 'nombre_wo', label: 'Nombre WO', width: 180, table: 'products' },
      { key: 'visible_in_ecommerce', label: 'E-Commerce', width: 100, type: 'boolean', table: 'products' },
      { key: 'is_active', label: 'Activo', width: 80, type: 'boolean', table: 'products' },
    ],
  },
  {
    id: 'ficha', label: 'Ficha Tecnica', icon: '📄',
    columns: [
      { key: 'ts_codigo_ficha', label: 'Cod. Ficha', width: 90, table: 'product_technical_specs', dbKey: 'codigo_ficha' },
      { key: 'ts_version_ficha', label: 'Version', width: 80, table: 'product_technical_specs', dbKey: 'version_ficha' },
      { key: 'ts_notificacion_sanitaria', label: 'Not. Sanitaria', width: 160, table: 'product_technical_specs', dbKey: 'notificacion_sanitaria' },
      { key: 'ts_allergens', label: 'Alergenos', width: 200, table: 'product_technical_specs', dbKey: 'allergens' },
      { key: 'ts_trazas_alergenos', label: 'Trazas', width: 200, table: 'product_technical_specs', dbKey: 'trazas_alergenos' },
    ],
  },
  {
    id: 'pesos', label: 'Pesos', icon: '⚖️',
    columns: [
      { key: 'ts_peso_medio', label: 'Peso Medio (g)', width: 110, type: 'number', table: 'product_technical_specs', dbKey: 'peso_medio' },
      { key: 'ts_peso_minimo', label: 'Peso Min (g)', width: 100, type: 'number', table: 'product_technical_specs', dbKey: 'peso_minimo' },
      { key: 'ts_peso_maximo', label: 'Peso Max (g)', width: 100, type: 'number', table: 'product_technical_specs', dbKey: 'peso_maximo' },
      { key: 'ts_net_weight', label: 'Peso Neto (kg)', width: 110, type: 'number', table: 'product_technical_specs', dbKey: 'net_weight' },
      { key: 'ts_gross_weight', label: 'Peso Bruto (kg)', width: 110, type: 'number', table: 'product_technical_specs', dbKey: 'gross_weight' },
    ],
  },
  {
    id: 'empaque', label: 'Empaque / Vida Util', icon: '📦',
    columns: [
      { key: 'ts_packaging_type', label: 'Tipo Empaque', width: 130, table: 'product_technical_specs', dbKey: 'packaging_type' },
      { key: 'ts_packaging_units_per_box', label: 'Uds/Caja', width: 90, type: 'number', table: 'product_technical_specs', dbKey: 'packaging_units_per_box' },
      { key: 'ts_empaque_primario', label: 'Emp. Primario', width: 180, table: 'product_technical_specs', dbKey: 'empaque_primario' },
      { key: 'ts_empaque_secundario', label: 'Emp. Secundario', width: 180, table: 'product_technical_specs', dbKey: 'empaque_secundario' },
      { key: 'ts_shelf_life_days', label: 'Vida Util (dias)', width: 110, type: 'number', table: 'product_technical_specs', dbKey: 'shelf_life_days' },
      { key: 'ts_vida_util_ambiente_horas', label: 'Vida Util Amb (h)', width: 120, type: 'number', table: 'product_technical_specs', dbKey: 'vida_util_ambiente_horas' },
      { key: 'ts_storage_conditions', label: 'Cond. Almacenamiento', width: 200, table: 'product_technical_specs', dbKey: 'storage_conditions' },
    ],
  },
  {
    id: 'calidad', label: 'Calidad', icon: '🏅',
    columns: [
      { key: 'qs_control_frequency', label: 'Frec. Control', width: 130, table: 'product_quality_specs', dbKey: 'control_frequency' },
      { key: 'qs_rejection_criteria', label: 'Criterio Rechazo', width: 200, table: 'product_quality_specs', dbKey: 'rejection_criteria' },
    ],
  },
  {
    id: 'costos', label: 'Costos', icon: '💰',
    columns: [
      { key: 'cost_material', label: 'Costo Material', width: 110, type: 'number', table: 'product_costs', dbKey: 'material_cost' },
      { key: 'cost_labor', label: 'Mano Obra', width: 100, type: 'number', table: 'product_costs', dbKey: 'labor_cost' },
      { key: 'cost_overhead', label: 'Gastos Gen.', width: 100, type: 'number', table: 'product_costs', dbKey: 'overhead_cost' },
      { key: 'cost_packaging', label: 'Costo Empaque', width: 110, type: 'number', table: 'product_costs', dbKey: 'packaging_cost' },
      { key: 'cost_total', label: 'Costo Total', width: 110, type: 'number', table: 'product_costs', dbKey: 'total_production_cost' },
      { key: 'cost_profit_margin', label: 'Margen %', width: 90, type: 'number', table: 'product_costs', dbKey: 'profit_margin_percentage' },
    ],
  },
  {
    id: 'comercial', label: 'Comercial', icon: '🏪',
    columns: [
      { key: 'com_brand', label: 'Marca', width: 120, table: 'product_commercial_info', dbKey: 'brand' },
      { key: 'com_commercial_name', label: 'Nombre Comercial', width: 180, table: 'product_commercial_info', dbKey: 'commercial_name' },
      { key: 'com_seasonality', label: 'Estacionalidad', width: 120, table: 'product_commercial_info', dbKey: 'seasonality' },
    ],
  },
  {
    id: 'inventario', label: 'Inventario', icon: '🏭',
    columns: [
      { key: 'inv_reorder_point', label: 'Pto Reorden', width: 100, type: 'number', table: 'product_inventory_config', dbKey: 'reorder_point' },
      { key: 'inv_safety_stock', label: 'Stock Seg.', width: 100, type: 'number', table: 'product_inventory_config', dbKey: 'safety_stock' },
      { key: 'inv_lead_time_days', label: 'Lead Time (d)', width: 100, type: 'number', table: 'product_inventory_config', dbKey: 'lead_time_days' },
      { key: 'inv_abc_classification', label: 'ABC', width: 60, type: 'select', options: ['A', 'B', 'C'], table: 'product_inventory_config', dbKey: 'abc_classification' },
      { key: 'inv_storage_location', label: 'Ubicacion', width: 120, table: 'product_inventory_config', dbKey: 'storage_location' },
      { key: 'inv_requires_cold_chain', label: 'Cadena Frio', width: 100, type: 'boolean', table: 'product_inventory_config', dbKey: 'requires_cold_chain' },
    ],
  },
]

// ─── EditableCell ───────────────────────────────────────────────────────────

function EditableCell({
  value,
  onChange,
  type = 'text',
  options,
  width,
}: {
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'select' | 'number' | 'boolean'
  options?: string[]
  width?: number
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => { setDraft(value) }, [value])

  const commit = useCallback(() => {
    setEditing(false)
    if (draft !== value) onChange(draft)
  }, [draft, value, onChange])

  if (type === 'boolean') {
    const boolVal = value === 'true' || value === 'Si'
    return (
      <div
        onClick={() => onChange(boolVal ? 'false' : 'true')}
        className="w-full h-full px-2 py-1 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center justify-center min-h-[28px]"
        style={{ minWidth: width || 80 }}
      >
        <span className={`text-xs font-medium ${boolVal ? 'text-green-600' : 'text-gray-400'}`}>
          {boolVal ? 'Si' : 'No'}
        </span>
      </div>
    )
  }

  if (type === 'select' && editing) {
    return (
      <select
        autoFocus
        className="w-full h-full bg-blue-50 dark:bg-blue-950 border-2 border-blue-400 rounded px-1 text-xs outline-none"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        style={{ minWidth: width || 80 }}
      >
        <option value="">—</option>
        {options?.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type === 'number' ? 'number' : 'text'}
        className="w-full h-full bg-blue-50 dark:bg-blue-950 border-2 border-blue-400 rounded px-2 text-xs outline-none"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        }}
        style={{ minWidth: width || 80 }}
      />
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="w-full h-full px-2 py-1 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded truncate text-xs leading-6 min-h-[28px]"
      style={{ minWidth: width || 80 }}
      title={value || '(vacio)'}
    >
      {value || <span className="text-gray-300 dark:text-gray-600 italic">—</span>}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function NucleoTablaPageWrapper() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>}>
      <NucleoTablaPage />
    </Suspense>
  )
}

function NucleoTablaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialCategory = (searchParams.get('cat') || 'PT') as 'PT' | 'PP'

  const [data, setData] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'PT' | 'PP'>(initialCategory)
  const [activeGroups, setActiveGroups] = useState<Set<string>>(new Set(['basico', 'codigos']))

  // Load all product data with joins
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch products
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .in('category', ['PT', 'PP'])
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      if (!products || products.length === 0) { setData([]); return }

      const ids = products.map(p => p.id)

      // Fetch related data in parallel
      const [techRes, qualRes, costRes, comRes, invRes] = await Promise.all([
        supabase.from('product_technical_specs').select('*').in('product_id', ids),
        supabase.from('product_quality_specs').select('*').in('product_id', ids),
        supabase.from('product_costs').select('*').in('product_id', ids),
        supabase.from('product_commercial_info').select('*').in('product_id', ids),
        supabase.from('product_inventory_config').select('*').in('product_id', ids),
      ])

      const techMap = new Map((techRes.data || []).map(t => [t.product_id, t]))
      const qualMap = new Map((qualRes.data || []).map(q => [q.product_id, q]))
      const costMap = new Map((costRes.data || []).map(c => [c.product_id, c]))
      const comMap = new Map((comRes.data || []).map(c => [c.product_id, c]))
      const invMap = new Map((invRes.data || []).map(i => [i.product_id, i]))

      const rows: ProductRow[] = products.map(p => {
        const ts = techMap.get(p.id) as any
        const qs = qualMap.get(p.id) as any
        const co = costMap.get(p.id) as any
        const cm = comMap.get(p.id) as any
        const iv = invMap.get(p.id) as any

        return {
          id: p.id,
          name: p.name,
          weight: p.weight,
          category: p.category,
          subcategory: p.subcategory,
          unit: p.unit,
          price: p.price,
          tax_rate: p.tax_rate,
          codigo_wo: p.codigo_wo,
          nombre_wo: p.nombre_wo,
          lote_minimo: p.lote_minimo,
          is_active: p.is_active,
          visible_in_ecommerce: p.visible_in_ecommerce,
          description: p.description,
          // tech specs
          ts_shelf_life_days: ts?.shelf_life_days ?? null,
          ts_storage_conditions: ts?.storage_conditions ?? null,
          ts_packaging_type: ts?.packaging_type ?? null,
          ts_packaging_units_per_box: ts?.packaging_units_per_box ?? null,
          ts_net_weight: ts?.net_weight ?? null,
          ts_gross_weight: ts?.gross_weight ?? null,
          ts_allergens: ts?.allergens?.join(', ') ?? null,
          ts_trazas_alergenos: ts?.trazas_alergenos?.join(', ') ?? null,
          ts_notificacion_sanitaria: ts?.notificacion_sanitaria ?? null,
          ts_empaque_primario: ts?.empaque_primario?.join(', ') ?? null,
          ts_empaque_secundario: ts?.empaque_secundario?.join(', ') ?? null,
          ts_peso_medio: ts?.peso_medio ?? null,
          ts_peso_minimo: ts?.peso_minimo ?? null,
          ts_peso_maximo: ts?.peso_maximo ?? null,
          ts_vida_util_ambiente_horas: ts?.vida_util_ambiente_horas ?? null,
          ts_codigo_ficha: ts?.codigo_ficha ?? null,
          ts_version_ficha: ts?.version_ficha ?? null,
          // quality
          qs_control_frequency: qs?.control_frequency ?? null,
          qs_rejection_criteria: qs?.rejection_criteria ?? null,
          // costs
          cost_material: co?.material_cost ?? null,
          cost_labor: co?.labor_cost ?? null,
          cost_overhead: co?.overhead_cost ?? null,
          cost_packaging: co?.packaging_cost ?? null,
          cost_total: co?.total_production_cost ?? null,
          cost_profit_margin: co?.profit_margin_percentage ?? null,
          // commercial
          com_brand: cm?.brand ?? null,
          com_commercial_name: cm?.commercial_name ?? null,
          com_seasonality: cm?.seasonality ?? null,
          // inventory
          inv_reorder_point: iv?.reorder_point ?? null,
          inv_safety_stock: iv?.safety_stock ?? null,
          inv_lead_time_days: iv?.lead_time_days ?? null,
          inv_abc_classification: iv?.abc_classification ?? null,
          inv_storage_location: iv?.storage_location ?? null,
          inv_requires_cold_chain: iv?.requires_cold_chain ?? null,
        }
      })

      setData(rows)
    } catch (err) {
      console.error('Error loading data:', err)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Update a field in the DB
  const updateField = useCallback(async (productId: string, col: ColDef, rawValue: string) => {
    const tableName = col.table || 'products'
    const dbColumn = col.dbKey || col.key

    // Parse value
    let value: any = rawValue
    if (col.type === 'number') value = rawValue === '' ? null : parseFloat(rawValue)
    if (col.type === 'boolean') value = rawValue === 'true'
    // Arrays stored as comma-separated
    if (['allergens', 'trazas_alergenos', 'empaque_primario', 'empaque_secundario'].includes(dbColumn)) {
      value = rawValue ? rawValue.split(',').map((s: string) => s.trim()).filter(Boolean) : null
    }

    try {
      if (tableName === 'products') {
        const { error } = await supabase
          .from('products')
          .update({ [dbColumn]: value })
          .eq('id', productId)
        if (error) throw error
      } else {
        // Upsert for related tables
        const { error } = await supabase
          .from(tableName as any)
          .upsert({ product_id: productId, [dbColumn]: value } as any)
        if (error) throw error
      }

      // Optimistic update
      setData(prev => prev.map(row => {
        if (row.id !== productId) return row
        return { ...row, [col.key]: col.type === 'number' ? value : rawValue }
      }))
    } catch (err) {
      console.error('Error updating:', err)
      toast.error('Error al guardar')
    }
  }, [])

  // Filter
  const filtered = useMemo(() => {
    let rows = data.filter(r => r.category === categoryFilter)
    if (search) {
      const s = search.toLowerCase()
      rows = rows.filter(r =>
        r.name.toLowerCase().includes(s) ||
        r.description?.toLowerCase().includes(s) ||
        r.codigo_wo?.toLowerCase().includes(s) ||
        r.subcategory?.toLowerCase().includes(s)
      )
    }
    return rows
  }, [data, categoryFilter, search])

  // Active columns
  const activeColumns = useMemo(() => {
    const cols: ColDef[] = []
    COLUMN_GROUPS.forEach(g => {
      if (activeGroups.has(g.id)) cols.push(...g.columns)
    })
    return cols
  }, [activeGroups])

  const toggleGroup = (id: string) => {
    setActiveGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const formatCellValue = (row: ProductRow, col: ColDef): string => {
    const val = row[col.key]
    if (val === null || val === undefined) return ''
    if (col.type === 'boolean') return val ? 'true' : 'false'
    return String(val)
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-white dark:bg-zinc-950 px-4 py-3">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/nucleo')}
              className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              title="Volver al Nucleo"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tabla de Productos</h1>
              <p className="text-xs text-gray-500">
                {filtered.length} productos · Click en cualquier celda para editar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Buscar producto..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 w-56 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-4 mt-3 overflow-x-auto pb-1">
          {/* Category filter */}
          <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-lg p-0.5 gap-0.5 flex-shrink-0">
            {([
              { key: 'PT' as const, label: 'Productos Terminados' },
              { key: 'PP' as const, label: 'Productos en Proceso' },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setCategoryFilter(tab.key)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                  categoryFilter === tab.key
                    ? 'bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-gray-200 dark:bg-zinc-700 flex-shrink-0" />

          {/* Column group toggles */}
          <div className="flex gap-1 flex-wrap">
            {COLUMN_GROUPS.map(g => (
              <button
                key={g.id}
                onClick={() => toggleGroup(g.id)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all whitespace-nowrap ${
                  activeGroups.has(g.id)
                    ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-400 hover:text-gray-600'
                }`}
              >
                {g.icon} {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="border-collapse text-xs w-max min-w-full">
            <thead className="sticky top-0 z-20">
              {/* Group header row */}
              <tr className="bg-gray-50 dark:bg-zinc-900 border-b">
                <th className="sticky left-0 z-30 bg-gray-50 dark:bg-zinc-900 w-10 px-1" />
                <th className="sticky left-10 z-30 bg-gray-50 dark:bg-zinc-900 px-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider min-w-[220px]" colSpan={1}>
                  Producto
                </th>
                {COLUMN_GROUPS.filter(g => activeGroups.has(g.id)).map(g => (
                  <th
                    key={g.id}
                    colSpan={g.columns.length}
                    className="px-2 py-1 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider border-l border-gray-200 dark:border-zinc-700"
                  >
                    {g.icon} {g.label}
                  </th>
                ))}
              </tr>
              {/* Column header row */}
              <tr className="bg-white dark:bg-zinc-950 border-b-2 border-gray-200 dark:border-zinc-700">
                <th className="sticky left-0 z-30 bg-white dark:bg-zinc-950 w-10 px-1 text-center text-[10px] text-gray-400">#</th>
                <th className="sticky left-10 z-30 bg-white dark:bg-zinc-950 px-2 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-300 min-w-[220px]">
                  Nombre
                </th>
                {activeColumns.map(col => (
                  <th
                    key={col.key}
                    className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap border-l border-gray-100 dark:border-zinc-800"
                    style={{ minWidth: col.width || 100 }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 dark:border-zinc-800 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors"
                >
                  {/* Row number */}
                  <td className="sticky left-0 z-10 bg-white dark:bg-zinc-950 w-10 px-1 text-center text-[10px] text-gray-400 border-r border-gray-100 dark:border-zinc-800">
                    {idx + 1}
                  </td>

                  {/* Product name (sticky, clickable to navigate) */}
                  <td className="sticky left-10 z-10 bg-white dark:bg-zinc-950 px-2 border-r border-gray-200 dark:border-zinc-700 min-w-[220px]">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/nucleo/${row.id}`)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[180px] text-left"
                        title={`${row.name} ${row.weight || ''}`}
                      >
                        {row.name} {row.weight || ''}
                      </button>
                    </div>
                  </td>

                  {/* Dynamic columns */}
                  {activeColumns.map(col => (
                    <td
                      key={col.key}
                      className="px-0 border-l border-gray-50 dark:border-zinc-800/50"
                      style={{ minWidth: col.width || 100 }}
                    >
                      <EditableCell
                        value={formatCellValue(row, col)}
                        onChange={v => updateField(row.id, col, v)}
                        type={col.type || 'text'}
                        options={col.options}
                        width={col.width}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="flex items-center justify-center py-10 text-gray-400 text-sm">
              {search ? `No se encontraron resultados para "${search}"` : 'No hay productos en esta categoria'}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {data.length > 0 && (
        <div className="flex-shrink-0 border-t bg-gray-50 dark:bg-zinc-900 px-4 py-1.5 flex items-center justify-between text-[10px] text-gray-500">
          <span>
            Mostrando {filtered.length} de {data.filter(r => r.category === categoryFilter).length} productos
            {search && ` · Filtro: "${search}"`}
          </span>
          <span>
            {activeColumns.length} columnas visibles · Click en cualquier celda para editar · Cambios se guardan automaticamente
          </span>
        </div>
      )}
    </div>
  )
}
