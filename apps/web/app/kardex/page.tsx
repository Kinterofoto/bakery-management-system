'use client'

import { useState } from 'react'
import { useInventoryBalances } from '@/hooks/use-inventory-balances'
import { useKardex } from '@/hooks/use-kardex'
import { MovementsTab } from '@/components/kardex/movements-tab'
import { BalanceByLocationTabV2 } from '@/components/kardex/balance-by-location-tab-v2'
import { Home, Package, Warehouse, Activity, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/format-utils'

type FilterType = 'all' | 'materials' | 'warehouse' | 'production' | 'movements'

export default function KardexPage() {
  const { summary: balanceSummary, loading: balancesLoading } = useInventoryBalances()
  const { summary: kardexSummary, loading: kardexLoading } = useKardex()
  const [activeTab, setActiveTab] = useState('balance')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#0A84FF]/30">
      {/* Fixed Header Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-[#1C1C1E]">
        <div className="px-4 py-3 md:px-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left side - Home icon and Title */}
            <div className="flex items-center gap-3">
              <Link href="/" className="p-2 rounded-md hover:bg-[#1C1C1E] transition-colors">
                <Home className="w-5 h-5 text-white" />
              </Link>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">Kardex de Inventario</h1>
                <p className="text-xs text-[#8E8E93]">Trazabilidad de materias primas</p>
              </div>
            </div>

            {/* Right side - Tab Navigation */}
            <div className="flex items-center gap-1 bg-[#1C1C1E] rounded-full p-1">
              <Button
                onClick={() => setActiveTab('balance')}
                className={`h-7 px-4 text-xs font-medium rounded-full transition-all border-0 ${
                  activeTab === 'balance'
                    ? 'bg-[#0A84FF] text-white hover:bg-[#0A84FF]/90'
                    : 'bg-transparent text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E]'
                }`}
              >
                Balance
              </Button>
              <Button
                onClick={() => setActiveTab('movimientos')}
                className={`h-7 px-4 text-xs font-medium rounded-full transition-all border-0 ${
                  activeTab === 'movimientos'
                    ? 'bg-[#0A84FF] text-white hover:bg-[#0A84FF]/90'
                    : 'bg-transparent text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E]'
                }`}
              >
                Movimientos
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Slider */}
        <div className="px-4 py-3 md:px-6 border-t border-[#1C1C1E]">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              onClick={() => setActiveFilter('all')}
              className={`h-8 px-4 text-xs font-medium rounded-full transition-all border whitespace-nowrap ${
                activeFilter === 'all'
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-[#8E8E93] border-[#3C3C3E] hover:text-white hover:border-white'
              }`}
            >
              Todo
            </Button>
            <Button
              onClick={() => setActiveFilter('materials')}
              className={`h-8 px-4 text-xs font-medium rounded-full transition-all border whitespace-nowrap ${
                activeFilter === 'materials'
                  ? 'bg-[#FF9500] text-white border-[#FF9500]'
                  : 'bg-transparent text-[#8E8E93] border-[#3C3C3E] hover:text-[#FF9500] hover:border-[#FF9500]'
              }`}
            >
              <Package className="w-3 h-3 mr-1.5" />
              Materiales ({balancesLoading ? '...' : formatNumber(balanceSummary.materialsTracked)})
            </Button>
            <Button
              onClick={() => setActiveFilter('warehouse')}
              className={`h-8 px-4 text-xs font-medium rounded-full transition-all border whitespace-nowrap ${
                activeFilter === 'warehouse'
                  ? 'bg-[#0A84FF] text-white border-[#0A84FF]'
                  : 'bg-transparent text-[#8E8E93] border-[#3C3C3E] hover:text-[#0A84FF] hover:border-[#0A84FF]'
              }`}
            >
              <Warehouse className="w-3 h-3 mr-1.5" />
              Bodega ({balancesLoading ? '...' : formatNumber(balanceSummary.totalWarehouseStock)})
            </Button>
            <Button
              onClick={() => setActiveFilter('production')}
              className={`h-8 px-4 text-xs font-medium rounded-full transition-all border whitespace-nowrap ${
                activeFilter === 'production'
                  ? 'bg-[#BF5AF2] text-white border-[#BF5AF2]'
                  : 'bg-transparent text-[#8E8E93] border-[#3C3C3E] hover:text-[#BF5AF2] hover:border-[#BF5AF2]'
              }`}
            >
              <Activity className="w-3 h-3 mr-1.5" />
              Producción ({balancesLoading ? '...' : formatNumber(balanceSummary.totalProductionStock)})
            </Button>
            <Button
              onClick={() => setActiveFilter('movements')}
              className={`h-8 px-4 text-xs font-medium rounded-full transition-all border whitespace-nowrap ${
                activeFilter === 'movements'
                  ? 'bg-[#30D158] text-white border-[#30D158]'
                  : 'bg-transparent text-[#8E8E93] border-[#3C3C3E] hover:text-[#30D158] hover:border-[#30D158]'
              }`}
            >
              <TrendingUp className="w-3 h-3 mr-1.5" />
              Movimientos ({kardexLoading ? '...' : formatNumber(kardexSummary.todayMovements)} hoy)
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area - with top padding for fixed header */}
      <div className="relative z-10 px-4 pt-32 pb-8 md:px-6">
        {/* Tab Content */}
        <div className="bg-[#1C1C1E] rounded-2xl border border-[#2C2C2E] overflow-hidden">
          <div className="p-6">
            {activeTab === 'movimientos' && <MovementsTab />}
            {activeTab === 'balance' && <BalanceByLocationTabV2 filterType={activeFilter} />}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
