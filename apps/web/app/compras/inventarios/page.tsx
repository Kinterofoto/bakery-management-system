"use client"

import { useState, useMemo, useEffect } from "react"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { useInventoryRealtime } from "@/hooks/use-inventory-realtime"
import {
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  Eye
} from "lucide-react"

export default function InventariosPage() {
  const {
    inventory,
    loading,
    getInventoryStats,
    getLowStockMaterials,
    getOutOfStockMaterials,
    fetchInventoryStatus,
    fetchWarehouseInventory,
    fetchProductionInventory
  } = useInventoryRealtime()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'low_stock' | 'out_of_stock'>('all')
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null)
  const [inventoryLocation, setInventoryLocation] = useState<'warehouse' | 'production'>('warehouse')

  useEffect(() => {
    console.log('📍 Location changed to:', inventoryLocation)
    if (inventoryLocation === 'warehouse') {
      console.log('📦 Fetching warehouse inventory...')
      fetchWarehouseInventory()
    } else {
      console.log('🏭 Fetching production inventory...')
      fetchProductionInventory()
    }
  }, [inventoryLocation])

  const stats = getInventoryStats()
  const lowStockItems = getLowStockMaterials()
  const outOfStockItems = getOutOfStockMaterials()

  const filteredInventory = useMemo(() => {
    let filtered = inventory

    // Filter by type
    if (filterType === 'low_stock') {
      filtered = lowStockItems
    } else if (filterType === 'out_of_stock') {
      filtered = outOfStockItems
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [inventory, filterType, searchQuery, lowStockItems, outOfStockItems])

  if (loading) {
    return (
      <RouteGuard>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        {/* Header */}
        <div className="sticky top-0 bg-white/70 dark:bg-black/50 backdrop-blur-xl border-b border-white/20 dark:border-white/10 p-4 md:p-6 z-20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">
                Inventario Tiempo Real
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Monitoreo en vivo de materia prima
              </p>
            </div>
            <button
              onClick={() => {
                if (inventoryLocation === 'warehouse') {
                  fetchWarehouseInventory()
                } else {
                  fetchProductionInventory()
                }
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              title="Actualizar"
            >
              <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Location Selector */}
          <div className="bg-white/40 dark:bg-white/10 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-2 flex gap-2">
            <button
              onClick={() => {
                console.log('🔘 Clicked Bodega button')
                setInventoryLocation('warehouse')
              }}
              className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all duration-150 ${
                inventoryLocation === 'warehouse'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'hover:bg-white/40 dark:hover:bg-black/30 text-gray-700 dark:text-gray-300'
              }`}
            >
              📦 Bodega
            </button>
            <button
              onClick={() => {
                console.log('🔘 Clicked Producción button')
                setInventoryLocation('production')
              }}
              className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all duration-150 ${
                inventoryLocation === 'production'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'hover:bg-white/40 dark:hover:bg-black/30 text-gray-700 dark:text-gray-300'
              }`}
            >
              🏭 Producción
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {/* Total Materials */}
            <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/15 rounded-xl p-2">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    {inventoryLocation === 'warehouse' ? 'Materiales en Bodega' : 'Materiales en Producción'}
                  </p>
                  <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalMaterials}
                  </p>
                </div>
              </div>
            </div>

            {/* Low Stock */}
            <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-500/15 rounded-xl p-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Bajo Stock</p>
                  <p className="text-lg md:text-2xl font-bold text-yellow-600">
                    {stats.lowStockCount}
                  </p>
                </div>
              </div>
            </div>

            {/* Out of Stock */}
            <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="bg-red-500/15 rounded-xl p-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Sin Stock</p>
                  <p className="text-lg md:text-2xl font-bold text-red-600">
                    {stats.outOfStockCount}
                  </p>
                </div>
              </div>
            </div>

            {/* Total Stock */}
            <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="bg-green-500/15 rounded-xl p-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Stock Total</p>
                  <p className="text-lg md:text-2xl font-bold text-green-600">
                    {stats.totalStock.toFixed(0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts Section */}
          {outOfStockItems.length > 0 && (
            <div className="bg-red-500/10 dark:bg-red-500/5 backdrop-blur-xl border border-red-500/30 dark:border-red-500/40 rounded-2xl p-4">
              <h3 className="font-semibold text-red-700 dark:text-red-300 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Sin Stock ({outOfStockItems.length})
              </h3>
              <div className="space-y-2">
                {outOfStockItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="text-sm text-red-600 dark:text-red-400">
                    {item.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {lowStockItems.length > 0 && outOfStockItems.length === 0 && (
            <div className="bg-yellow-500/10 dark:bg-yellow-500/5 backdrop-blur-xl border border-yellow-500/30 dark:border-yellow-500/40 rounded-2xl p-4">
              <h3 className="font-semibold text-yellow-700 dark:text-yellow-300 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Stock Bajo ({lowStockItems.length})
              </h3>
              <div className="space-y-2">
                {lowStockItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="text-sm text-yellow-600 dark:text-yellow-400">
                    {item.name}: {item.current_stock}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search and Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar material..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/70 dark:bg-black/50 border border-white/20 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Tabs */}
            <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-2 flex gap-2 overflow-x-auto">
              {[
                { value: 'all', label: 'Todo', count: inventory.length },
                { value: 'low_stock', label: 'Bajo Stock', count: lowStockItems.length },
                { value: 'out_of_stock', label: 'Sin Stock', count: outOfStockItems.length }
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setFilterType(tab.value as typeof filterType)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-150 whitespace-nowrap ${
                    filterType === tab.value
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'hover:bg-white/40 dark:hover:bg-black/30 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/10">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Material</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Stock</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Movimientos</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <div className="text-gray-500 dark:text-gray-400">
                          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No hay materiales disponibles</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item) => {
                      const status =
                        item.current_stock === 0 ? 'out' :
                        item.current_stock < 10 ? 'low' : 'ok'

                      const statusColor =
                        status === 'out' ? 'bg-red-500/20 text-red-700 dark:text-red-300' :
                        status === 'low' ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                        'bg-green-500/20 text-green-700 dark:text-green-300'

                      const statusLabel =
                        status === 'out' ? 'Sin Stock' :
                        status === 'low' ? 'Bajo' : 'OK'

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-white/10 hover:bg-white/50 dark:hover:bg-black/30 transition-colors duration-200 cursor-pointer"
                          onClick={() => setSelectedMaterial(selectedMaterial === item.id ? null : item.id)}
                        >
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {item.name}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                            {item.current_stock.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                            {item.total_receptions}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Material Details */}
          {selectedMaterial && (
            <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-6">
              {(() => {
                const material = inventory.find(m => m.id === selectedMaterial)
                if (!material) return null

                return (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                      {material.name}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Stock Actual</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {material.current_stock.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Consumo Total</p>
                        <p className="text-2xl font-bold text-red-600">
                          {Math.abs(material.total_consumed).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Desperdicio</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {material.total_waste.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Recepciones</p>
                        <p className="text-2xl font-bold text-green-600">
                          {material.total_receptions}
                        </p>
                      </div>
                    </div>
                    {material.last_movement_date && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-xs text-gray-500">
                          Último movimiento: {new Date(material.last_movement_date).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>
    </RouteGuard>
  )
}
