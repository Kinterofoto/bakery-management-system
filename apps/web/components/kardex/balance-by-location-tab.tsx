'use client'

import { useState, useEffect } from 'react'
import { useInventoryBalances, LocationBalance } from '@/hooks/use-inventory-balances'
import { GlassCard } from './glass-card'
import { StockProgressBar } from './stock-progress-bar'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function BalanceByLocationTab() {
  const { balances, loading, error } = useInventoryBalances()
  const { fetchLocationBalances } = useInventoryBalances()
  const [locationBalances, setLocationBalances] = useState<LocationBalance[]>([])
  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [loadingLocations, setLoadingLocations] = useState(false)

  // Fetch location balances on mount
  useEffect(() => {
    const loadLocationData = async () => {
      setLoadingLocations(true)
      const data = await fetchLocationBalances()
      setLocationBalances(data)
      setLoadingLocations(false)
    }
    loadLocationData()
  }, [fetchLocationBalances])

  const toggleExpanded = (materialId: string) => {
    const newExpanded = new Set(expandedMaterials)
    if (newExpanded.has(materialId)) {
      newExpanded.delete(materialId)
    } else {
      newExpanded.add(materialId)
    }
    setExpandedMaterials(newExpanded)
  }

  const filteredBalances = balances.filter(balance =>
    balance.material_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sin movimientos'
    try {
      return format(new Date(dateString), "d 'de' MMM, yyyy", { locale: es })
    } catch {
      return dateString
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Input
            type="text"
            placeholder="Buscar material..."
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
        <div className="text-sm text-gray-400">
          {filteredBalances.length} materiales
        </div>
      </div>

      {/* Split View: Material List + Location Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Material List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">Materiales</h3>

          {loading ? (
            <GlassCard variant="ultra-thin" padding="lg">
              <div className="text-center text-gray-400 py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                <p className="mt-4">Cargando balances...</p>
              </div>
            </GlassCard>
          ) : error ? (
            <GlassCard variant="ultra-thin" padding="lg">
              <div className="text-center text-red-400 py-8">
                <p>Error: {error}</p>
              </div>
            </GlassCard>
          ) : filteredBalances.length === 0 ? (
            <GlassCard variant="ultra-thin" padding="lg">
              <div className="text-center text-gray-400 py-8">
                <p>No hay materiales que mostrar</p>
              </div>
            </GlassCard>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredBalances.map((balance) => (
                <GlassCard
                  key={balance.material_id}
                  variant="thin"
                  padding="md"
                  hover
                  className="cursor-pointer"
                  onClick={() => toggleExpanded(balance.material_id)}
                >
                  <div className="space-y-3">
                    {/* Material Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white text-sm">{balance.material_name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDate(balance.last_movement_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">
                          {balance.total_stock.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">{balance.unit_of_measure}</p>
                      </div>
                    </div>

                    {/* Stock Distribution */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Distribución</span>
                        <span className="text-gray-500">
                          {expandedMaterials.has(balance.material_id) ? '▼' : '▶'}
                        </span>
                      </div>
                      <StockProgressBar
                        warehouseStock={balance.warehouse_stock}
                        productionStock={balance.production_stock}
                        unit={balance.unit_of_measure}
                        showLabels={false}
                        height="sm"
                      />
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Bodega: {balance.warehouse_stock.toFixed(2)}</span>
                        <span>Producción: {balance.production_stock.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>

        {/* Right: Location Breakdown */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">Desglose por Ubicación</h3>

          {expandedMaterials.size === 0 ? (
            <GlassCard variant="ultra-thin" padding="lg">
              <div className="text-center text-gray-400 py-12">
                <p>Selecciona un material para ver el desglose detallado</p>
              </div>
            </GlassCard>
          ) : loadingLocations ? (
            <GlassCard variant="ultra-thin" padding="lg">
              <div className="text-center text-gray-400 py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                <p className="mt-4">Cargando desglose...</p>
              </div>
            </GlassCard>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {Array.from(expandedMaterials).map((materialId) => {
                const balance = balances.find(b => b.material_id === materialId)
                const locationData = locationBalances.find(lb => lb.material_id === materialId)

                if (!balance) return null

                return (
                  <GlassCard key={materialId} variant="medium" padding="lg">
                    <div className="space-y-4">
                      {/* Material Title */}
                      <div className="border-b border-white/10 pb-3">
                        <h4 className="font-semibold text-white">{balance.material_name}</h4>
                        <p className="text-sm text-gray-400 mt-1">
                          Total: {balance.total_stock.toFixed(2)} {balance.unit_of_measure}
                        </p>
                      </div>

                      {/* Warehouse Stock */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-300">Bodega</span>
                          </div>
                          <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
                            {balance.warehouse_stock.toFixed(2)} {balance.unit_of_measure}
                          </span>
                        </div>
                      </div>

                      {/* Production Stock */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-300">Producción</span>
                          </div>
                          <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-purple-300 bg-clip-text text-transparent">
                            {balance.production_stock.toFixed(2)} {balance.unit_of_measure}
                          </span>
                        </div>

                        {/* Work Centers Breakdown */}
                        {locationData && locationData.production_centers.length > 0 && (
                          <div className="ml-8 mt-3 space-y-2">
                            {locationData.production_centers.map((center) => (
                              <div
                                key={center.work_center_id}
                                className="flex items-center justify-between p-2 rounded-lg bg-white/5"
                              >
                                <span className="text-xs text-gray-400">{center.work_center_name}</span>
                                <span className="text-xs font-medium text-purple-300">
                                  {center.stock.toFixed(2)} {balance.unit_of_measure}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="pt-2">
                        <StockProgressBar
                          warehouseStock={balance.warehouse_stock}
                          productionStock={balance.production_stock}
                          unit={balance.unit_of_measure}
                          showLabels={true}
                          height="md"
                        />
                      </div>
                    </div>
                  </GlassCard>
                )
              })}
            </div>
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
