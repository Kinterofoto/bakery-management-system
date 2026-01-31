'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useKardex, KardexFilters, MovementType } from '@/hooks/use-kardex'
import { supabase } from '@/lib/supabase'
import { MovementTypeBadge } from './movement-type-badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download, X, Search } from 'lucide-react'

interface Material {
  id: string
  name: string
  category: string
  weight: string | null
}

export function MovementsTab() {
  const [filters, setFilters] = useState<KardexFilters>({
    warehouseType: 'all',
  })
  const [materials, setMaterials] = useState<Material[]>([])
  const [selectedMaterial, setSelectedMaterial] = useState<string>('')
  const [searchInput, setSearchInput] = useState<string>('')
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false)
  const { movements, loading, error, refetch, hasMore, loadMore } = useKardex()
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch available materials
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, category, weight')
          .order('name', { ascending: true })

        if (error) throw error
        setMaterials(data || [])
      } catch (err) {
        console.error('Error fetching materials:', err)
      }
    }

    fetchMaterials()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMaterialDropdown(false)
      }
    }

    if (showMaterialDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMaterialDropdown])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loading, loadMore])

  const handleFilterChange = (newFilters: Partial<KardexFilters>) => {
    const updated = { ...filters, ...newFilters }
    setFilters(updated)
    // Reset pagination when filters change
    refetch({ ...updated, offset: 0, limit: 50 })
  }

  const filteredMaterials = searchInput.trim() === ''
    ? materials
    : materials.filter(m =>
        m.name.toLowerCase().includes(searchInput.toLowerCase()) ||
        m.category.toLowerCase().includes(searchInput.toLowerCase()) ||
        (m.weight && m.weight.toLowerCase().includes(searchInput.toLowerCase()))
      )

  const handleSelectMaterial = (materialId: string) => {
    setSelectedMaterial(materialId)
    setSearchInput('')
    setShowMaterialDropdown(false)
    handleFilterChange({ materialIds: [materialId] })
  }

  const handleClearSearch = () => {
    setSearchInput('')
  }

  const clearMaterialFilter = () => {
    setSelectedMaterial('')
    setSearchInput('')
    setShowMaterialDropdown(false)
    handleFilterChange({ materialIds: undefined })
  }

  const selectedMaterialObj = materials.find(m => m.id === selectedMaterial)

  const getDisplayName = (material: Material) => {
    return material.weight ? `${material.name} - ${material.weight}` : material.name
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
      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap px-4 md:px-0">
        <div className="relative w-full md:w-80" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
            <input
              type="text"
              placeholder={selectedMaterialObj ? getDisplayName(selectedMaterialObj) : "Buscar material..."}
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                setShowMaterialDropdown(true)
              }}
              onFocus={() => setShowMaterialDropdown(true)}
              className="w-full pl-10 pr-9 bg-[#2C2C2E] border-0 text-white placeholder:text-[#8E8E93] rounded-full h-10 text-sm outline-none focus:ring-1 focus:ring-[#0A84FF]"
            />
            {selectedMaterialObj && (
              <button
                onClick={clearMaterialFilter}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {showMaterialDropdown && (
            <div className="absolute top-full mt-2 w-full bg-[#2C2C2E] border border-[#3C3C3E] rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
              {filteredMaterials.length === 0 ? (
                <div className="p-3 text-sm text-[#8E8E93] text-center">
                  No hay materiales que coincidan
                </div>
              ) : (
                filteredMaterials.map((material) => (
                  <button
                    key={material.id}
                    onClick={() => handleSelectMaterial(material.id)}
                    className="w-full text-left px-4 py-3 hover:bg-[#3C3C3E] transition-colors border-b border-[#1C1C1E] last:border-b-0"
                  >
                    <p className="text-sm font-medium text-white">{getDisplayName(material)}</p>
                    <p className="text-xs text-[#8E8E93]">{material.category}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <Button
          className="bg-[#2C2C2E] border-0 text-white hover:bg-[#3C3C3E] font-medium rounded-full h-10 px-4 text-sm"
        >
          <Download className="w-4 h-4 mr-2 text-[#0A84FF]" />
          Exportar
        </Button>
      </div>

      {/* Horizontal Filters - Scrollable on mobile */}
      <div className="overflow-x-auto px-4 md:px-0">
        <div className="flex md:grid md:grid-cols-5 gap-4 min-w-max md:min-w-0">
          {/* Filter 1: Fecha Inicio */}
          <div className="min-w-[200px] md:min-w-0">
            <Label className="text-xs text-[#8E8E93] mb-1.5 block uppercase tracking-wide font-semibold">Fecha Inicio</Label>
            <Input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleFilterChange({ startDate: e.target.value || undefined })}
              className="bg-[#2C2C2E] border-0 text-white rounded-lg h-10"
            />
          </div>

          {/* Filter 2: Fecha Fin */}
          <div className="min-w-[200px] md:min-w-0">
            <Label className="text-xs text-[#8E8E93] mb-1.5 block uppercase tracking-wide font-semibold">Fecha Fin</Label>
            <Input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleFilterChange({ endDate: e.target.value || undefined })}
              className="bg-[#2C2C2E] border-0 text-white rounded-lg h-10"
            />
          </div>

          {/* Filter 3: Tipo de Movimiento (Select) */}
          <div className="min-w-[200px] md:min-w-0">
            <Label className="text-xs text-[#8E8E93] mb-1.5 block uppercase tracking-wide font-semibold">Tipo Movimiento</Label>
            <select
              className="w-full bg-[#2C2C2E] border-0 text-white rounded-lg h-10 px-3 text-sm outline-none focus:ring-1 focus:ring-[#0A84FF]"
              value={filters.movementTypes?.[0] || 'all'}
              onChange={(e) => {
                const value = e.target.value
                handleFilterChange({ movementTypes: value === 'all' ? undefined : [value as MovementType] })
              }}
            >
              <option value="all">Todos los tipos</option>
              <option value="reception">Recepción</option>
              <option value="consumption">Consumo</option>
              <option value="transfer">Transferencia</option>
              <option value="adjustment">Ajuste</option>
              <option value="return">Devolución</option>
              <option value="waste">Merma</option>
            </select>
          </div>

          {/* Filter 4: Ubicación */}
          <div className="min-w-[200px] md:min-w-0">
            <Label className="text-xs text-[#8E8E93] mb-1.5 block uppercase tracking-wide font-semibold">Ubicación</Label>
            <select
              className="w-full bg-[#2C2C2E] border-0 text-white rounded-lg h-10 px-3 text-sm outline-none focus:ring-1 focus:ring-[#0A84FF]"
              value={filters.warehouseType || 'all'}
              onChange={(e) => handleFilterChange({ warehouseType: e.target.value as any })}
            >
              <option value="all">Todas</option>
              <option value="warehouse">Bodega</option>
              <option value="production">Producción</option>
            </select>
          </div>

          {/* Filter 5: Clear Filters */}
          <div className="min-w-[200px] md:min-w-0 flex items-end">
            {(filters.movementTypes?.length || filters.startDate || filters.endDate || selectedMaterial) && (
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({ warehouseType: 'all' })
                  clearMaterialFilter()
                  refetch()
                }}
                className="w-full bg-transparent border border-[#3C3C3E] text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E] rounded-lg h-10"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="overflow-x-auto md:rounded-2xl border-y md:border border-[#2C2C2E]">
        {loading ? (
          <div className="p-12 text-center bg-[#1C1C1E]">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A84FF]"></div>
            <p className="mt-4 text-[#8E8E93]">Cargando movimientos...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center bg-[#1C1C1E]">
            <p className="text-[#FF453A]">Error: {error}</p>
          </div>
        ) : movements.length === 0 ? (
          <div className="p-12 text-center bg-[#1C1C1E]">
            <p className="text-[#8E8E93]">No hay movimientos que mostrar</p>
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
                  <th className="text-right p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Balance</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Ubicación</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Responsable</th>
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
                    <td className="p-4 text-right">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-white">
                          {movement.balance_after != null ? movement.balance_after.toFixed(2) : '—'}
                        </p>
                        <p className="text-xs text-[#8E8E93]">{movement.unit_of_measure}</p>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-[#8E8E93]">
                      {movement.warehouse_type === 'production' ? 'Producción' :
                       movement.warehouse_type === 'warehouse' ? 'Bodega' :
                       movement.location || '—'}
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-white">
                        {movement.recorded_by_name || 'Sistema'}
                      </p>
                    </td>
                    <td className="p-4 text-sm text-[#8E8E93] max-w-xs truncate">
                      {movement.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Infinite Scroll Trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="p-8 text-center bg-[#1C1C1E] border-t border-[#2C2C2E]">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#0A84FF]"></div>
                <p className="mt-2 text-sm text-[#8E8E93]">Cargando más movimientos...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Info */}
      {movements.length > 0 && (
        <div className="text-center">
          <p className="text-sm text-[#8E8E93]">
            Mostrando {movements.length} movimientos {!hasMore && '(todos)'}
          </p>
        </div>
      )}
    </div>
  )
}
