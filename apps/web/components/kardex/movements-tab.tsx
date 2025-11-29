'use client'

import { useState } from 'react'
import { useKardex, KardexFilters, MovementType } from '@/hooks/use-kardex'
import { GlassCard } from './glass-card'
import { MovementTypeBadge } from './movement-type-badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

export function MovementsTab() {
  const [filters, setFilters] = useState<KardexFilters>({
    warehouseType: 'all',
  })
  const [showFilters, setShowFilters] = useState(false)
  const { movements, loading, error, refetch } = useKardex()

  const handleFilterChange = (newFilters: Partial<KardexFilters>) => {
    const updated = { ...filters, ...newFilters }
    setFilters(updated)
    refetch(updated)
  }

  const toggleMovementType = (type: MovementType) => {
    const current = filters.movementTypes || []
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type]
    handleFilterChange({ movementTypes: updated.length > 0 ? updated : undefined })
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d 'de' MMM, yyyy HH:mm", { locale: es })
    } catch {
      return dateString
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            {showFilters ? '🔽' : '▶️'} Filtros
          </Button>
          {(filters.movementTypes?.length || filters.startDate || filters.endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters({ warehouseType: 'all' })
                refetch()
              }}
              className="text-gray-400 hover:text-white"
            >
              Limpiar filtros
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Buscar material, notas..."
            className="w-64 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            onChange={(e) => handleFilterChange({ searchTerm: e.target.value || undefined })}
          />
          <Button
            variant="outline"
            size="sm"
            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            📥 Exportar
          </Button>
        </div>
      </div>

      {/* Collapsible Filters Panel */}
      {showFilters && (
        <GlassCard variant="ultra-thin" padding="lg">
          <div className="space-y-4">
            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Fecha Inicio</Label>
                <Input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange({ startDate: e.target.value || undefined })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Fecha Fin</Label>
                <Input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange({ endDate: e.target.value || undefined })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>

            {/* Movement Types */}
            <div className="space-y-2">
              <Label className="text-gray-300">Tipos de Movimiento</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {(['reception', 'consumption', 'transfer', 'adjustment', 'return', 'waste'] as MovementType[]).map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <Checkbox
                      checked={filters.movementTypes?.includes(type) || false}
                      onCheckedChange={() => toggleMovementType(type)}
                      className="border-white/20"
                    />
                    <MovementTypeBadge type={type} size="sm" />
                  </label>
                ))}
              </div>
            </div>

            {/* Warehouse Type */}
            <div className="space-y-2">
              <Label className="text-gray-300">Ubicación</Label>
              <div className="flex gap-3">
                {[
                  { value: 'all', label: 'Todas' },
                  { value: 'warehouse', label: 'Bodega' },
                  { value: 'production', label: 'Producción' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <Checkbox
                      checked={filters.warehouseType === option.value}
                      onCheckedChange={() => handleFilterChange({ warehouseType: option.value as any })}
                      className="border-white/20"
                    />
                    <span className="text-sm text-gray-300">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Movements Table */}
      <div className="overflow-x-auto">
        <GlassCard variant="ultra-thin" padding="none">
          {loading ? (
            <div className="p-12 text-center text-gray-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <p className="mt-4">Cargando movimientos...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-400">
              <p>❌ Error: {error}</p>
            </div>
          ) : movements.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p>📭 No hay movimientos que mostrar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-sm font-medium text-gray-400">Fecha/Hora</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-400">Material</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-400">Tipo</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-400">Cantidad</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-400">Ubicación</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-400">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement, index) => (
                    <tr
                      key={movement.id}
                      className={`
                        border-b border-white/5 hover:bg-white/5 transition-colors
                        ${index % 2 === 0 ? 'bg-white/[0.02]' : ''}
                      `}
                    >
                      <td className="p-4 text-sm text-gray-300">
                        {formatDate(movement.movement_date)}
                      </td>
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-white">{movement.material_name}</p>
                          <p className="text-xs text-gray-500">{movement.material_category}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <MovementTypeBadge type={movement.movement_type as MovementType} size="sm" />
                      </td>
                      <td className="p-4 text-right">
                        <div className="space-y-0.5">
                          <p className={`text-sm font-bold ${
                            movement.quantity_change > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">{movement.unit_of_measure}</p>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-300">
                        {movement.warehouse_type === 'production' ? '⚙️ Producción' :
                         movement.warehouse_type === 'warehouse' ? '🏭 Bodega' :
                         movement.location || '—'}
                      </td>
                      <td className="p-4 text-sm text-gray-400 max-w-xs truncate">
                        {movement.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Pagination Placeholder */}
      {movements.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Mostrando {movements.length} movimientos
          </p>
          {/* TODO: Add pagination controls */}
        </div>
      )}
    </div>
  )
}
