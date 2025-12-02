'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import {
  ChevronRight,
  ChevronDown,
  Warehouse,
  Box,
  Factory,
  Package,
  MapPin
} from 'lucide-react'

type FilterType = 'all' | 'materials' | 'warehouse' | 'production' | 'movements'

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

type BalanceByLocationTabV2Props = {
  filterType?: FilterType
}

export function BalanceByLocationTabV2({ filterType = 'all' }: BalanceByLocationTabV2Props) {
  const [locations, setLocations] = useState<Location[]>([])
  const [balances, setBalances] = useState<InventoryBalance[]>([])
  const [products, setProducts] = useState<Map<string, any>>(new Map())
  const [locationTree, setLocationTree] = useState<LocationWithBalance[]>([])
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

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

      // Auto-expand all locations
      const allIds = (locationsData || []).map(l => l.id)
      setExpandedLocations(new Set(allIds))

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

    // Search filter
    if (searchTerm && !location.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !location.code.toLowerCase().includes(searchTerm.toLowerCase())) {
      return null
    }

    // Filter by type
    if (filterType === 'warehouse' && location.location_type !== 'warehouse') {
      return null
    }
    if (filterType === 'production' && location.bin_type !== 'production') {
      return null
    }

    // Only show locations with materials
    if (!hasMaterials && !hasChildren) {
      return null
    }

    return (
      <div key={location.id} className="space-y-2">
        {/* Location Header */}
        <div
          className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-all"
          onClick={() => hasChildren && toggleExpand(location.id)}
          style={{ paddingLeft: `${depth * 20 + 16}px` }}
        >
          {/* Expand/Collapse Icon */}
          <div className="w-5 h-5 flex-shrink-0">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )
            ) : (
              <div className="w-5 h-5" />
            )}
          </div>

          {/* Location Icon */}
          <div className={`flex-shrink-0 ${getLocationColor(location.location_type, location.bin_type)}`}>
            {getLocationIcon(location.location_type, location.bin_type)}
          </div>

          {/* Location Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white truncate">
                {location.name}
              </span>
              <span className="text-xs text-gray-500 font-mono">
                {location.code}
              </span>
            </div>
          </div>

          {/* Material Count */}
          {hasMaterials && (
            <div className="text-xs text-gray-400">
              {location.materials.length} productos
            </div>
          )}
        </div>

        {/* Materials List */}
        {hasMaterials && isExpanded && (
          <div className="space-y-2" style={{ paddingLeft: `${(depth + 1) * 20 + 36}px` }}>
            {location.materials.map((material) => (
              <div
                key={material.product_id}
                className="flex items-start justify-between p-3 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{material.product_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{material.category}</p>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  <p className="text-lg font-bold text-blue-400">
                    {material.quantity.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">{material.unit}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="space-y-2">
            {location.children.map(child => renderLocationNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

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
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Input
          type="text"
          placeholder="Buscar ubicación o producto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md bg-white/5 border-white/10 text-white placeholder:text-gray-500"
        />
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>{locations.length} ubicaciones</span>
          <span>•</span>
          <span>{balances.length} balances activos</span>
        </div>
      </div>

      {/* Location Tree with Materials */}
      <div className="space-y-2 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
        {locationTree.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay existencias en ubicaciones</p>
          </div>
        ) : (
          locationTree.map(location => renderLocationNode(location, 0))
        )}
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
