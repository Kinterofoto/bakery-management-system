'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Package } from 'lucide-react'

// Types
interface Location {
  id: string
  code: string
  name: string
  location_type: 'warehouse' | 'zone' | 'aisle' | 'bin'
  parent_id: string | null
  level: number
  bin_type: string | null
}

interface InventoryBalance {
  product_id: string
  location_id: string
  quantity_on_hand: number
}

interface Product {
  id: string
  name: string
  category: string
  unit: string
}

interface TableRow {
  product_id: string
  product_name: string
  product_code: string
  category: string
  location_id: string
  location_name: string
  location_code: string
  warehouse_name: string
  zone_name: string
  aisle_name: string
  quantity: number
  unit: string
}

export function BalanceByLocationTabV2() {
  const [locations, setLocations] = useState<Location[]>([])
  const [balances, setBalances] = useState<InventoryBalance[]>([])
  const [products, setProducts] = useState<Map<string, Product>>(new Map())
  const [loading, setLoading] = useState(true)

  // Cascading filters
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all')
  const [selectedZone, setSelectedZone] = useState<string>('all')
  const [selectedAisle, setSelectedAisle] = useState<string>('all')
  const [selectedBin, setSelectedBin] = useState<string>('all')

  // Fetch data
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch locations
      const { data: locationsData, error: locationsError } = await supabase
        .schema('inventario')
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('level', { ascending: true })

      if (locationsError) throw locationsError

      // Fetch balances (including negative balances)
      const { data: balancesData, error: balancesError } = await supabase
        .schema('inventario')
        .from('inventory_balances')
        .select('product_id, location_id, quantity_on_hand')

      if (balancesError) throw balancesError

      // Fetch products
      const productIds = [...new Set(balancesData?.map(b => b.product_id) || [])]
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, category, unit')
        .in('id', productIds)

      if (productsError) throw productsError

      const productsMap = new Map(productsData?.map(p => [p.id, p]) || [])

      setLocations(locationsData || [])
      setBalances(balancesData || [])
      setProducts(productsMap)

    } catch (err) {
      console.error('Error fetching location data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Build location hierarchy map
  const locationHierarchy = useMemo(() => {
    const map = new Map<string, { warehouse?: Location; zone?: Location; aisle?: Location }>()
    const locationsMap = new Map(locations.map(l => [l.id, l]))

    for (const location of locations) {
      const hierarchy: { warehouse?: Location; zone?: Location; aisle?: Location } = {}
      let current = location

      while (current) {
        if (current.location_type === 'warehouse') {
          hierarchy.warehouse = current
        } else if (current.location_type === 'zone') {
          hierarchy.zone = current
        } else if (current.location_type === 'aisle') {
          hierarchy.aisle = current
        }
        if (!current.parent_id) break
        current = locationsMap.get(current.parent_id)!
      }

      map.set(location.id, hierarchy)
    }

    return map
  }, [locations])

  // Get unique warehouses, zones, aisles, bins
  const warehouses = useMemo(() => {
    return locations.filter(l => l.location_type === 'warehouse')
  }, [locations])

  const availableZones = useMemo(() => {
    if (selectedWarehouse === 'all') {
      return locations.filter(l => l.location_type === 'zone')
    }
    return locations.filter(l =>
      l.location_type === 'zone' && l.parent_id === selectedWarehouse
    )
  }, [locations, selectedWarehouse])

  const availableAisles = useMemo(() => {
    if (selectedZone === 'all') {
      if (selectedWarehouse === 'all') {
        return locations.filter(l => l.location_type === 'aisle')
      }
      return locations.filter(l => {
        if (l.location_type !== 'aisle') return false
        const hierarchy = locationHierarchy.get(l.id)
        return hierarchy?.warehouse?.id === selectedWarehouse
      })
    }
    return locations.filter(l =>
      l.location_type === 'aisle' && l.parent_id === selectedZone
    )
  }, [locations, selectedWarehouse, selectedZone, locationHierarchy])

  const availableBins = useMemo(() => {
    if (selectedAisle === 'all') {
      if (selectedZone === 'all') {
        if (selectedWarehouse === 'all') {
          return locations.filter(l => l.location_type === 'bin')
        }
        return locations.filter(l => {
          if (l.location_type !== 'bin') return false
          const hierarchy = locationHierarchy.get(l.id)
          return hierarchy?.warehouse?.id === selectedWarehouse
        })
      }
      return locations.filter(l => {
        if (l.location_type !== 'bin') return false
        const hierarchy = locationHierarchy.get(l.id)
        return hierarchy?.zone?.id === selectedZone
      })
    }
    return locations.filter(l =>
      l.location_type === 'bin' && l.parent_id === selectedAisle
    )
  }, [locations, selectedWarehouse, selectedZone, selectedAisle, locationHierarchy])

  // Build flat table data - one row per material per location
  const tableData = useMemo(() => {
    const locationsMap = new Map(locations.map(l => [l.id, l]))
    const rows: TableRow[] = []

    for (const balance of balances) {
      const product = products.get(balance.product_id)
      const location = locationsMap.get(balance.location_id)

      if (!product || !location) continue

      const hierarchy = locationHierarchy.get(balance.location_id) || {}

      // Apply filters
      if (selectedWarehouse !== 'all' && hierarchy.warehouse?.id !== selectedWarehouse) continue
      if (selectedZone !== 'all' && hierarchy.zone?.id !== selectedZone) continue
      if (selectedAisle !== 'all' && hierarchy.aisle?.id !== selectedAisle) continue
      if (selectedBin !== 'all' && balance.location_id !== selectedBin) continue

      rows.push({
        product_id: balance.product_id,
        product_name: product.name,
        product_code: balance.product_id.slice(0, 8), // Use first 8 chars of ID as code
        category: product.category,
        location_id: balance.location_id,
        location_name: location.name,
        location_code: location.code,
        warehouse_name: hierarchy.warehouse?.name || '-',
        zone_name: hierarchy.zone?.name || '-',
        aisle_name: hierarchy.aisle?.name || '-',
        quantity: parseFloat(balance.quantity_on_hand.toString()),
        unit: product.unit
      })
    }

    // Sort by product name, then by location
    rows.sort((a, b) => {
      const nameCompare = a.product_name.localeCompare(b.product_name)
      if (nameCompare !== 0) return nameCompare
      return a.location_name.localeCompare(b.location_name)
    })

    return rows
  }, [locations, balances, products, locationHierarchy, selectedWarehouse, selectedZone, selectedAisle, selectedBin])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-gray-400">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p>Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cascading Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Filter 1: Bodega (Warehouse) */}
        <div>
          <label className="text-xs text-[#8E8E93] mb-1.5 block uppercase tracking-wide font-semibold">Bodega</label>
          <Select
            value={selectedWarehouse}
            onValueChange={(value) => {
              setSelectedWarehouse(value)
              setSelectedZone('all')
              setSelectedAisle('all')
              setSelectedBin('all')
            }}
          >
            <SelectTrigger className="bg-[#2C2C2E] border-0 text-white rounded-lg h-10">
              <SelectValue placeholder="Todas las bodegas" />
            </SelectTrigger>
            <SelectContent className="bg-[#2C2C2E] border border-[#3C3C3E]">
              <SelectItem value="all" className="text-white hover:bg-[#3C3C3E] focus:bg-[#3C3C3E]">
                Todas las bodegas
              </SelectItem>
              {warehouses.map(w => (
                <SelectItem key={w.id} value={w.id} className="text-white hover:bg-[#3C3C3E] focus:bg-[#3C3C3E]">
                  {w.name} ({w.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter 2: Zona (Zone) */}
        <div>
          <label className="text-xs text-[#8E8E93] mb-1.5 block uppercase tracking-wide font-semibold">Zona</label>
          <Select
            value={selectedZone}
            onValueChange={(value) => {
              setSelectedZone(value)
              setSelectedAisle('all')
              setSelectedBin('all')
            }}
            disabled={availableZones.length === 0}
          >
            <SelectTrigger className="bg-[#2C2C2E] border-0 text-white rounded-lg h-10">
              <SelectValue placeholder="Todas las zonas" />
            </SelectTrigger>
            <SelectContent className="bg-[#2C2C2E] border border-[#3C3C3E]">
              <SelectItem value="all" className="text-white hover:bg-[#3C3C3E] focus:bg-[#3C3C3E]">
                Todas las zonas
              </SelectItem>
              {availableZones.map(z => (
                <SelectItem key={z.id} value={z.id} className="text-white hover:bg-[#3C3C3E] focus:bg-[#3C3C3E]">
                  {z.name} ({z.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter 3: Pasillo (Aisle) */}
        <div>
          <label className="text-xs text-[#8E8E93] mb-1.5 block uppercase tracking-wide font-semibold">Pasillo</label>
          <Select
            value={selectedAisle}
            onValueChange={(value) => {
              setSelectedAisle(value)
              setSelectedBin('all')
            }}
            disabled={availableAisles.length === 0}
          >
            <SelectTrigger className="bg-[#2C2C2E] border-0 text-white rounded-lg h-10">
              <SelectValue placeholder="Todos los pasillos" />
            </SelectTrigger>
            <SelectContent className="bg-[#2C2C2E] border border-[#3C3C3E]">
              <SelectItem value="all" className="text-white hover:bg-[#3C3C3E] focus:bg-[#3C3C3E]">
                Todos los pasillos
              </SelectItem>
              {availableAisles.map(a => (
                <SelectItem key={a.id} value={a.id} className="text-white hover:bg-[#3C3C3E] focus:bg-[#3C3C3E]">
                  {a.name} ({a.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter 4: Posición/Bin */}
        <div>
          <label className="text-xs text-[#8E8E93] mb-1.5 block uppercase tracking-wide font-semibold">Posición</label>
          <Select
            value={selectedBin}
            onValueChange={setSelectedBin}
            disabled={availableBins.length === 0}
          >
            <SelectTrigger className="bg-[#2C2C2E] border-0 text-white rounded-lg h-10">
              <SelectValue placeholder="Todas las posiciones" />
            </SelectTrigger>
            <SelectContent className="bg-[#2C2C2E] border border-[#3C3C3E]">
              <SelectItem value="all" className="text-white hover:bg-[#3C3C3E] focus:bg-[#3C3C3E]">
                Todas las posiciones
              </SelectItem>
              {availableBins.map(b => (
                <SelectItem key={b.id} value={b.id} className="text-white hover:bg-[#3C3C3E] focus:bg-[#3C3C3E]">
                  {b.name} ({b.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-[#8E8E93]">
        Mostrando {tableData.length} registros
      </div>

      {/* Flat Data Table */}
      <div className="rounded-2xl border border-[#2C2C2E] overflow-hidden">
        {tableData.length === 0 ? (
          <div className="bg-[#1C1C1E] text-center py-12 text-[#8E8E93]">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay datos con los filtros seleccionados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#2C2C2E]">
                <tr>
                  <th className="text-left p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Material</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Categoría</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Código Ubicación</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Ubicación</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Bodega</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Zona</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Pasillo</th>
                  <th className="text-right p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Cantidad</th>
                </tr>
              </thead>
              <tbody className="bg-[#1C1C1E]">
                {tableData.map((row, index) => (
                  <tr
                    key={`${row.product_id}-${row.location_id}`}
                    className="border-t border-[#2C2C2E] hover:bg-[#2C2C2E]/50 transition-colors"
                  >
                    <td className="p-4">
                      <p className="text-sm font-medium text-white">{row.product_name}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-[#8E8E93]">{row.category}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-xs text-[#8E8E93] font-mono">{row.location_code}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-white">{row.location_name}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-[#8E8E93]">{row.warehouse_name}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-[#8E8E93]">{row.zone_name}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-[#8E8E93]">{row.aisle_name}</p>
                    </td>
                    <td className="p-4 text-right">
                      <div className="space-y-0.5">
                        <p className={`text-sm font-bold ${row.quantity < 0 ? 'text-[#FF453A]' : 'text-[#30D158]'}`}>
                          {row.quantity.toFixed(2)}
                        </p>
                        <p className="text-xs text-[#8E8E93]">{row.unit}</p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
