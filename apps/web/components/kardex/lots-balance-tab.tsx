'use client'

import { useMemo, useState } from 'react'
import { useLotsBalance, LotSourceType } from '@/hooks/use-lots-balance'
import { Package, Search, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const sourceTypeConfig: Record<string, { label: string; className: string }> = {
  reception: {
    label: 'Recepción',
    className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  production: {
    label: 'Producción',
    className: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  backfill: {
    label: 'Inicial',
    className: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  },
  manual: {
    label: 'Manual',
    className: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
}

function SourceBadge({ sourceType }: { sourceType: LotSourceType }) {
  const config = sourceTypeConfig[sourceType] || {
    label: sourceType,
    className: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium backdrop-blur-sm ${config.className}`}
    >
      {config.label}
    </span>
  )
}

function formatDate(dateString: string | null) {
  if (!dateString) return '—'
  try {
    return format(new Date(dateString), "d 'de' MMM, yyyy", { locale: es })
  } catch {
    return dateString
  }
}

function formatDateTime(dateString: string | null) {
  if (!dateString) return '—'
  try {
    return format(new Date(dateString), "d 'de' MMM, yyyy HH:mm", { locale: es })
  } catch {
    return dateString
  }
}

export function LotsBalanceTab() {
  const { lots, loading, error } = useLotsBalance()
  const [searchInput, setSearchInput] = useState('')

  const filteredLots = useMemo(() => {
    const term = searchInput.trim().toLowerCase()
    if (!term) return lots
    return lots.filter(lot =>
      lot.product_name.toLowerCase().includes(term) ||
      lot.product_category.toLowerCase().includes(term) ||
      lot.lot_code.toLowerCase().includes(term)
    )
  }, [lots, searchInput])

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="px-4 md:px-0">
        <div className="relative w-full md:w-80">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
            <input
              type="text"
              placeholder="Buscar por material o lote..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-9 bg-[#2C2C2E] border-0 text-white placeholder:text-[#8E8E93] rounded-full h-10 text-sm outline-none focus:ring-1 focus:ring-[#0A84FF]"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results count */}
      {!loading && !error && (
        <div className="text-sm text-[#8E8E93] px-4 md:px-0">
          Mostrando {filteredLots.length} {filteredLots.length === 1 ? 'lote' : 'lotes'}
        </div>
      )}

      {/* Table */}
      <div className="md:rounded-2xl border-y md:border border-[#2C2C2E] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center bg-[#1C1C1E]">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A84FF]"></div>
            <p className="mt-4 text-[#8E8E93]">Cargando lotes...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center bg-[#1C1C1E]">
            <p className="text-[#FF453A]">Error: {error}</p>
          </div>
        ) : filteredLots.length === 0 ? (
          <div className="bg-[#1C1C1E] text-center py-12 text-[#8E8E93]">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{lots.length === 0 ? 'No hay lotes con existencias' : 'No hay lotes que coincidan con la búsqueda'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#2C2C2E]">
                <tr>
                  <th className="text-left p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Material</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Lote</th>
                  <th className="text-right p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Cantidad disponible</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Vencimiento</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Recibido / Producido</th>
                  <th className="text-left p-4 text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">Origen</th>
                </tr>
              </thead>
              <tbody className="bg-[#1C1C1E]">
                {filteredLots.map((lot) => (
                  <tr
                    key={lot.id}
                    className="border-t border-[#2C2C2E] hover:bg-[#2C2C2E]/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-white">{lot.product_name}</p>
                        <p className="text-xs text-[#8E8E93]">{lot.product_category}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#2C2C2E] border border-[#3C3C3E] text-xs font-mono text-white">
                        {lot.lot_code}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-[#30D158]">
                          {lot.quantity_remaining.toFixed(2)}
                        </p>
                        <p className="text-xs text-[#8E8E93]">{lot.product_unit}</p>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-[#8E8E93]">
                      {formatDate(lot.expiry_date)}
                    </td>
                    <td className="p-4 text-sm text-[#8E8E93]">
                      {formatDateTime(lot.received_at)}
                    </td>
                    <td className="p-4">
                      <SourceBadge sourceType={lot.source_type} />
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
