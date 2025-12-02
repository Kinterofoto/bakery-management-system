'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { GlassCard } from './glass-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  ChevronRight,
  ChevronDown,
  Warehouse,
  Box,
  Factory,
  Package,
  MapPin
} from 'lucide-react'

// Types
interface Location {
  id: string
  code: string
  name: string
  location_type: 'warehouse' | 'zone' | 'aisle' | 'bin'
  parent_id: string | null
  path: string
  level: number
  is_virtual: boolean
  bin_type: string | null
  is_active: boolean
  metadata: any
}

interface LocationWithBalance extends Location {
  stock: number
  materials: MaterialInLocation[]
  children: LocationWithBalance[]
}

interface MaterialInLocation {
  product_id: string
  product_name: string
  quantity: number
  unit: string
  category: string
}

interface InventoryBalance {
  product_id: string
  location_id: string
  quantity_on_hand: number
}

export function BalanceByLocationTabV2() {
  const [locations, setLocations] = useState<Location[]>([])
  const [balances, setBalances] = useState<InventoryBalance[]>([])
  const [products, setProducts] = useState<Map<string, any>>(new Map())
  const [locationTree, setLocationTree] = useState<LocationWithBalance[]>([])
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)

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

      // Build tree
      const tree = buildLocationTree(locationsData || [], balancesData || [], productsMap)
      setLocationTree(tree)

      // Auto-expand level 1 (warehouses)
      const level1Ids = (locationsData || []).filter(l => l.level === 1).map(l => l.id)
      setExpandedLocations(new Set(level1Ids))

    } catch (err) {
      console.error('Error fetching location data:', err)
    } finally {
      setLoading(false)
    }
  }

  const buildLocationTree = (
    locations: Location[],
    balances: InventoryBalance[],
    productsMap: Map<string, any>
  ): LocationWithBalance[] => {
    // Create a map of location_id -> balances
    const balancesByLocation = new Map<string, InventoryBalance[]>()
    for (const balance of balances) {
      const existing = balancesByLocation.get(balance.location_id) || []
      balancesByLocation.set(balance.location_id, [...existing, balance])
    }

    // Enrich locations with stock and materials
    const enrichedLocations: LocationWithBalance[] = locations.map(loc => {
      const locationBalances = balancesByLocation.get(loc.id) || []
      const materials: MaterialInLocation[] = locationBalances.map(b => {
        const product = productsMap.get(b.product_id)
        return {
          product_id: b.product_id,
          product_name: product?.name || 'Desconocido',
          quantity: parseFloat(b.quantity_on_hand.toString()),
          unit: product?.unit || '',
          category: product?.category || ''
        }
      })

      return {
        ...loc,
        stock: materials.reduce((sum, m) => sum + m.quantity, 0),
        materials,
        children: []
      }
    })

    // Build hierarchy
    const locationsMap = new Map(enrichedLocations.map(l => [l.id, l]))
    const rootLocations: LocationWithBalance[] = []

    for (const location of enrichedLocations) {
      if (location.parent_id === null) {
        rootLocations.push(location)
      } else {
        const parent = locationsMap.get(location.parent_id)
        if (parent) {
          parent.children.push(location)
        }
      }
    }

    return rootLocations
  }

  const toggleExpand = (locationId: string) => {
    const newExpanded = new Set(expandedLocations)
    if (newExpanded.has(locationId)) {
      newExpanded.delete(locationId)
    } else {
      newExpanded.add(locationId)
    }
    setExpandedLocations(newExpanded)
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
        if (binType === 'receiving') return 'text-green-400'
        if (binType === 'shipping') return 'text-red-400'
        return 'text-gray-400'
      default:
        return 'text-gray-400'
    }
  }

  const renderLocationNode = (location: LocationWithBalance, depth: number = 0) => {
    const isExpanded = expandedLocations.has(location.id)
    const hasChildren = location.children.length > 0
    const hasMaterials = location.materials.length > 0
    const isSelected = selectedLocationId === location.id
    const indentClass = `ml-${Math.min(depth * 4, 12)}`

    // Search filter
    if (searchTerm && !location.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !location.code.toLowerCase().includes(searchTerm.toLowerCase())) {
      return null
    }

    return (
      <div key={location.id} className="space-y-1">
        {/* Location Row */}
        <div
          className={`
            flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all
            ${isSelected
              ? 'bg-white/20 border border-white/30'
              : 'bg-white/5 hover:bg-white/10 border border-white/5'
            }
            ${indentClass}
          `}
          onClick={() => {
            setSelectedLocationId(location.id)
            if (hasChildren) toggleExpand(location.id)
          }}
        >
          {/* Expand/Collapse Icon */}
          <div className="w-4 h-4 flex-shrink-0">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )
            ) : (
              <div className="w-4 h-4" />
            )}
          </div>

          {/* Location Icon */}
          <div className={`flex-shrink-0 ${getLocationColor(location.location_type, location.bin_type)}`}>
            {getLocationIcon(location.location_type, location.bin_type)}
          </div>

          {/* Location Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm truncate">
                {location.name}
              </span>
              <span className="text-xs text-gray-500 font-mono">
                {location.code}
              </span>
            </div>
            {location.bin_type && (
              <span className="text-xs text-gray-500 capitalize">
                {location.bin_type}
              </span>
            )}
          </div>

          {/* Stock Badge */}
          {hasMaterials && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {location.materials.length} productos
              </span>
              <div className="px-2 py-1 rounded-lg bg-blue-500/20 border border-blue-500/30">
                <span className="text-xs font-semibold text-blue-300">
                  Stock
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {location.children.map(child => renderLocationNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const selectedLocation = () => {
    if (!selectedLocationId) return null

    const findLocation = (locs: LocationWithBalance[]): LocationWithBalance | null => {
      for (const loc of locs) {
        if (loc.id === selectedLocationId) return loc
        const found = findLocation(loc.children)
        if (found) return found
      }
      return null
    }

    return findLocation(locationTree)
  }

  const selectedLoc = selectedLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-gray-400">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p>Cargando ubicaciones...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Input
            type="text"
            placeholder="Buscar ubicación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm('')}
              className="text-gray-400 hover:text-white"
            >
              Limpiar
            </Button>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>{locations.length} ubicaciones</span>
          <span>•</span>
          <span>{balances.length} balances activos</span>
        </div>
      </div>

      {/* Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Location Tree */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Jerarquía de Ubicaciones</h3>
          <GlassCard variant="thin" padding="md">
            <div className="space-y-1 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
              {locationTree.map(location => renderLocationNode(location, 0))}
            </div>
          </GlassCard>
        </div>

        {/* Right: Location Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Detalle de Ubicación</h3>
          {!selectedLoc ? (
            <GlassCard variant="ultra-thin" padding="lg">
              <div className="text-center text-gray-400 py-12">
                <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Selecciona una ubicación para ver el detalle</p>
              </div>
            </GlassCard>
          ) : (
            <GlassCard variant="medium" padding="lg">
              <div className="space-y-6">
                {/* Location Header */}
                <div className="border-b border-white/10 pb-4">
                  <div className="flex items-start gap-3 mb-2">
                    <div className={`mt-1 ${getLocationColor(selectedLoc.location_type, selectedLoc.bin_type)}`}>
                      {getLocationIcon(selectedLoc.location_type, selectedLoc.bin_type)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white text-lg">{selectedLoc.name}</h4>
                      <p className="text-sm text-gray-400 font-mono mt-1">{selectedLoc.code}</p>
                      <p className="text-xs text-gray-500 mt-1">{selectedLoc.path}</p>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-gray-500">Tipo</p>
                      <p className="text-sm text-white capitalize">{selectedLoc.location_type}</p>
                    </div>
                    {selectedLoc.bin_type && (
                      <div>
                        <p className="text-xs text-gray-500">Categoría</p>
                        <p className="text-sm text-white capitalize">{selectedLoc.bin_type}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500">Nivel</p>
                      <p className="text-sm text-white">Nivel {selectedLoc.level}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Virtual</p>
                      <p className="text-sm text-white">{selectedLoc.is_virtual ? 'Sí' : 'No'}</p>
                    </div>
                  </div>
                </div>

                {/* Materials in Location */}
                {selectedLoc.materials.length > 0 ? (
                  <div className="space-y-3">
                    <h5 className="font-semibold text-white">
                      Materiales ({selectedLoc.materials.length})
                    </h5>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                      {selectedLoc.materials.map((material) => (
                        <div
                          key={material.product_id}
                          className="p-3 rounded-lg bg-white/5 border border-white/10"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-white text-sm">{material.product_name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{material.category}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-blue-400">
                                {material.quantity.toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-500">{material.unit}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Sin materiales en esta ubicación</p>
                  </div>
                )}

                {/* Child Locations Summary */}
                {selectedLoc.children.length > 0 && (
                  <div className="border-t border-white/10 pt-4">
                    <h5 className="font-semibold text-white mb-3">
                      Ubicaciones Hijas ({selectedLoc.children.length})
                    </h5>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedLoc.children.map(child => (
                        <button
                          key={child.id}
                          onClick={() => setSelectedLocationId(child.id)}
                          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left"
                        >
                          <p className="text-xs text-white truncate">{child.name}</p>
                          <p className="text-xs text-gray-500 font-mono">{child.code}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  )
}
