'use client'

import { useState } from 'react'
import { useKardex, KardexFilters, MovementType } from '@/hooks/use-kardex'
import { MovementTypeBadge } from './movement-type-badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronDown, ChevronRight, Download, Search } from 'lucide-react'

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
    <div className="space-y-4">
      {/* Filters Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-[#2C2C2E] border-0 text-white hover:bg-[#3C3C3E] font-medium rounded-full h-9 px-4 text-sm"
          >
            {showFilters ? <ChevronDown className="w-4 h-4 mr-2" /> : <ChevronRight className="w-4 h-4 mr-2" />}
            Filtros
          </Button>
          {(filters.movementTypes?.length || filters.startDate || filters.endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters({ warehouseType: 'all' })
                refetch()
              }}
              className="text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E] rounded-full"
            >
              Limpiar filtros
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
            <Input
              type="text"
              placeholder="Buscar material, notas..."
              className="w-64 pl-10 bg-[#2C2C2E] border-0 text-white placeholder:text-[#8E8E93] rounded-full h-9"
              onChange={(e) => handleFilterChange({ searchTerm: e.target.value || undefined })}
            />
          </div>
          <Button
            className="bg-[#2C2C2E] border-0 text-white hover:bg-[#3C3C3E] font-medium rounded-full h-9 px-4 text-sm"
          >
            <Download className="w-4 h-4 mr-2 text-[#0A84FF]" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Collapsible Filters Panel */}
      {showFilters && (
        <div className="bg-[#2C2C2E] rounded-2xl p-6 border border-[#3C3C3E]">
          <div className="space-y-6">
            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#8E8E93] text-sm font-medium">Fecha Inicio</Label>
                <Input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange({ startDate: e.target.value || undefined })}
                  className="bg-[#1C1C1E] border-0 text-white rounded-xl h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#8E8E93] text-sm font-medium">Fecha Fin</Label>
                <Input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange({ endDate: e.target.value || undefined })}
                  className="bg-[#1C1C1E] border-0 text-white rounded-xl h-10"
                />
              </div>
            </div>

            {/* Movement Types */}
            <div className="space-y-3">
              <Label className="text-[#8E8E93] text-sm font-medium">Tipos de Movimiento</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {(['reception', 'consumption', 'transfer', 'adjustment', 'return', 'waste'] as MovementType[]).map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 cursor-pointer p-3 rounded-xl hover:bg-[#1C1C1E] transition-colors"
                  >
                    <Checkbox
                      checked={filters.movementTypes?.includes(type) || false}
                      onCheckedChange={() => toggleMovementType(type)}
                      className="border-[#3C3C3E] data-[state=checked]:bg-[#0A84FF] data-[state=checked]:border-[#0A84FF]"
                    />
                    <MovementTypeBadge type={type} size="sm" />
                  </label>
                ))}
              </div>
            </div>

            {/* Warehouse Type */}
            <div className="space-y-3">
              <Label className="text-[#8E8E93] text-sm font-medium">Ubicación</Label>
              <div className="flex gap-3">
                {[
                  { value: 'all', label: 'Todas' },
                  { value: 'warehouse', label: 'Bodega' },
                  { value: 'production', label: 'Producción' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 cursor-pointer p-3 rounded-xl hover:bg-[#1C1C1E] transition-colors"
                  >
                    <Checkbox
                      checked={filters.warehouseType === option.value}
                      onCheckedChange={() => handleFilterChange({ warehouseType: option.value as any })}
                      className="border-[#3C3C3E] data-[state=checked]:bg-[#0A84FF] data-[state=checked]:border-[#0A84FF]"
                    />
                    <span className="text-sm text-white">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Movements Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#2C2C2E]">
        {loading ? (
          <div className="p-12 text-center bg-[#1C1C1E]">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A84FF]"></div>
            <p className="mt-4 text-[#8E8E93]">Cargando movimientos...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center bg-[#1C1C1E]">
            <p className="text-[#FF453A]">❌ Error: {error}</p>
          </div>
        ) : movements.length === 0 ? (
          <div className="p-12 text-center bg-[#1C1C1E]">
            <p className="text-[#8E8E93]">📭 No hay movimientos que mostrar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#2C2C2E]">
                <tr>
                  <th className="text-left p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Fecha/Hora</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Material</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Tipo</th>
                  <th className="text-right p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Cantidad</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Ubicación</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Notas</th>
                </tr>
              </thead>
              <tbody className="bg-[#1C1C1E]">
                {movements.map((movement, index) => (
                  <tr
                    key={movement.id}
                    className="border-t border-[#2C2C2E] hover:bg-[#2C2C2E]/50 transition-colors"
                  >
                    <td className="p-4 text-sm text-[#8E8E93]">
                      {formatDate(movement.movement_date)}
                    </td>
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-white">{movement.material_name}</p>
                        <p className="text-xs text-[#8E8E93]">{movement.material_category}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <MovementTypeBadge type={movement.movement_type as MovementType} size="sm" />
                    </td>
                    <td className="p-4 text-right">
                      <div className="space-y-0.5">
                        <p className={`text-sm font-bold ${
                          movement.quantity_change > 0 ? 'text-[#30D158]' : 'text-[#FF453A]'
                        }`}>
                          {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change.toFixed(2)}
                        </p>
                        <p className="text-xs text-[#8E8E93]">{movement.unit_of_measure}</p>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-[#8E8E93]">
                      {movement.warehouse_type === 'production' ? '⚙️ Producción' :
                       movement.warehouse_type === 'warehouse' ? '🏭 Bodega' :
                       movement.location || '—'}
                    </td>
                    <td className="p-4 text-sm text-[#8E8E93] max-w-xs truncate">
                      {movement.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {movements.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#8E8E93]">
            Mostrando {movements.length} movimientos
          </p>
        </div>
      )}
    </div>
  )
}
