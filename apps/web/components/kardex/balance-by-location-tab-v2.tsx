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
import {
  Warehouse,
  Box,
  Factory,
  Package,
  MapPin,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

// Types
interface Location {
  id: string
  code: string
  name: string
  location_type: 'warehouse' | 'zone' | 'aisle' | 'bin'
  parent_id: string | null
  level: number
  is_virtual: boolean
  bin_type: string | null
  is_active: boolean
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
  location_id: string
  location_code: string
  location_name: string
  location_type: string
  bin_type: string | null
  warehouse_id: string | null
  warehouse_name: string | null
  zone_id: string | null
  zone_name: string | null
  aisle_id: string | null
  aisle_name: string | null
  materials_count: number
  total_quantity: number
  materials: Array<{
    product_id: string
    product_name: string
    category: string
    quantity: number
    unit: string
  }>
}

type SortField = 'location_name' | 'location_code' | 'materials_count' | 'total_quantity'
type SortOrder = 'asc' | 'desc'

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

  // Sorting
  const [sortField, setSortField] = useState<SortField>('location_name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

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
        .order('code', { ascending: true })

      if (locationsError) throw locationsError

      // Fetch balances
      const { data: balancesData, error: balancesError } = await supabase
        .schema('inventario')
        .from('inventory_balances')
        .select('product_id, location_id, quantity_on_hand')
        .gt('quantity_on_hand', 0)

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

  // Build table data
  const tableData = useMemo(() => {
    const balancesByLocation = new Map<string, InventoryBalance[]>()
    for (const balance of balances) {
      const existing = balancesByLocation.get(balance.location_id) || []
      balancesByLocation.set(balance.location_id, [...existing, balance])
    }

    const rows: TableRow[] = []

    for (const location of locations) {
      const locationBalances = balancesByLocation.get(location.id) || []
      if (locationBalances.length === 0) continue

      const hierarchy = locationHierarchy.get(location.id) || {}

      // Apply filters
      if (selectedWarehouse !== 'all' && hierarchy.warehouse?.id !== selectedWarehouse) continue
      if (selectedZone !== 'all' && hierarchy.zone?.id !== selectedZone) continue
      if (selectedAisle !== 'all' && hierarchy.aisle?.id !== selectedAisle) continue
      if (selectedBin !== 'all' && location.id !== selectedBin) continue

      const materials = locationBalances.map(b => {
        const product = products.get(b.product_id)
        return {
          product_id: b.product_id,
          product_name: product?.name || 'Desconocido',
          category: product?.category || '',
          quantity: parseFloat(b.quantity_on_hand.toString()),
          unit: product?.unit || ''
        }
      })

      rows.push({
        location_id: location.id,
        location_code: location.code,
        location_name: location.name,
        location_type: location.location_type,
        bin_type: location.bin_type,
        warehouse_id: hierarchy.warehouse?.id || null,
        warehouse_name: hierarchy.warehouse?.name || null,
        zone_id: hierarchy.zone?.id || null,
        zone_name: hierarchy.zone?.name || null,
        aisle_id: hierarchy.aisle?.id || null,
        aisle_name: hierarchy.aisle?.name || null,
        materials_count: materials.length,
        total_quantity: materials.reduce((sum, m) => sum + m.quantity, 0),
        materials
      })
    }

    // Sort
    rows.sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    return rows
  }, [locations, balances, products, locationHierarchy, selectedWarehouse, selectedZone, selectedAisle, selectedBin, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const toggleRow = (locationId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(locationId)) {
      newExpanded.delete(locationId)
    } else {
      newExpanded.add(locationId)
    }
    setExpandedRows(newExpanded)
  }

  const getLocationIcon = (locationType: string, binType?: string | null) => {
    switch (locationType) {
      case 'warehouse':
        return <Warehouse className="w-4 h-4" />
      case 'zone':
        return <MapPin className="w-4 h-4" />
      case 'aisle':
        return <Box className="w-4 h-4" />
      case 'bin':
        if (binType === 'production') return <Factory className="w-4 h-4" />
        return <Package className="w-4 h-4" />
      default:
        return <Box className="w-4 h-4" />
    }
  }

  const getLocationColor = (locationType: string, binType?: string | null) => {
    switch (locationType) {
      case 'warehouse':
        return 'text-blue-400'
      case 'zone':
        return 'text-purple-400'
      case 'aisle':
        return 'text-cyan-400'
      case 'bin':
        if (binType === 'production') return 'text-amber-400'
        return 'text-gray-400'
      default:
        return 'text-gray-400'
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-600" />
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 ml-1 text-blue-400" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-blue-400" />
    )
  }

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
          <label className="text-xs text-gray-400 mb-1.5 block">Bodega</label>
          <Select
            value={selectedWarehouse}
            onValueChange={(value) => {
              setSelectedWarehouse(value)
              setSelectedZone('all')
              setSelectedAisle('all')
              setSelectedBin('all')
            }}
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Todas las bodegas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las bodegas</SelectItem>
              {warehouses.map(w => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter 2: Zona (Zone) */}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Zona</label>
          <Select
            value={selectedZone}
            onValueChange={(value) => {
              setSelectedZone(value)
              setSelectedAisle('all')
              setSelectedBin('all')
            }}
            disabled={availableZones.length === 0}
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Todas las zonas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las zonas</SelectItem>
              {availableZones.map(z => (
                <SelectItem key={z.id} value={z.id}>
                  {z.name} ({z.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter 3: Pasillo (Aisle) */}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Pasillo</label>
          <Select
            value={selectedAisle}
            onValueChange={(value) => {
              setSelectedAisle(value)
              setSelectedBin('all')
            }}
            disabled={availableAisles.length === 0}
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Todos los pasillos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los pasillos</SelectItem>
              {availableAisles.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} ({a.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter 4: Posición/Bin */}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Posición</label>
          <Select
            value={selectedBin}
            onValueChange={setSelectedBin}
            disabled={availableBins.length === 0}
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Todas las posiciones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las posiciones</SelectItem>
              {availableBins.map(b => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-400">
        Mostrando {tableData.length} ubicaciones con stock
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="text-left p-3 text-gray-400 font-medium">Tipo</th>
              <th
                className="text-left p-3 text-gray-400 font-medium cursor-pointer hover:text-white"
                onClick={() => handleSort('location_name')}
              >
                <div className="flex items-center">
                  Ubicación
                  <SortIcon field="location_name" />
                </div>
              </th>
              <th
                className="text-left p-3 text-gray-400 font-medium cursor-pointer hover:text-white"
                onClick={() => handleSort('location_code')}
              >
                <div className="flex items-center">
                  Código
                  <SortIcon field="location_code" />
                </div>
              </th>
              <th className="text-left p-3 text-gray-400 font-medium">Bodega</th>
              <th className="text-left p-3 text-gray-400 font-medium">Zona</th>
              <th className="text-left p-3 text-gray-400 font-medium">Pasillo</th>
              <th
                className="text-right p-3 text-gray-400 font-medium cursor-pointer hover:text-white"
                onClick={() => handleSort('materials_count')}
              >
                <div className="flex items-center justify-end">
                  Productos
                  <SortIcon field="materials_count" />
                </div>
              </th>
              <th
                className="text-right p-3 text-gray-400 font-medium cursor-pointer hover:text-white"
                onClick={() => handleSort('total_quantity')}
              >
                <div className="flex items-center justify-end">
                  Cantidad Total
                  <SortIcon field="total_quantity" />
                </div>
              </th>
              <th className="text-center p-3 text-gray-400 font-medium w-20">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-500">
                  No hay datos con los filtros seleccionados
                </td>
              </tr>
            ) : (
              tableData.map((row) => (
                <>
                  <tr
                    key={row.location_id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-3">
                      <div className={`flex items-center gap-2 ${getLocationColor(row.location_type, row.bin_type)}`}>
                        {getLocationIcon(row.location_type, row.bin_type)}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-white">{row.location_name}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-xs text-gray-400">{row.location_code}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-gray-300 text-xs">{row.warehouse_name || '-'}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-gray-300 text-xs">{row.zone_name || '-'}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-gray-300 text-xs">{row.aisle_name || '-'}</span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-white font-semibold">{row.materials_count}</span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-blue-400 font-bold">{row.total_quantity.toFixed(2)}</span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => toggleRow(row.location_id)}
                        className="px-3 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-medium transition-colors"
                      >
                        {expandedRows.has(row.location_id) ? 'Ocultar' : 'Ver'}
                      </button>
                    </td>
                  </tr>
                  {expandedRows.has(row.location_id) && (
                    <tr>
                      <td colSpan={9} className="p-0 bg-white/5">
                        <div className="p-4">
                          <h4 className="text-sm font-semibold text-white mb-3">Productos en {row.location_name}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {row.materials.map((material) => (
                              <div
                                key={material.product_id}
                                className="p-3 rounded-lg bg-white/5 border border-white/10"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-white text-sm truncate">
                                      {material.product_name}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">{material.category}</p>
                                  </div>
                                  <div className="text-right ml-3 flex-shrink-0">
                                    <p className="text-base font-bold text-blue-400">
                                      {material.quantity.toFixed(2)}
                                    </p>
                                    <p className="text-xs text-gray-500">{material.unit}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
