'use client'

import { useState } from 'react'
import { useInventoryBalances } from '@/hooks/use-inventory-balances'
import { useKardex } from '@/hooks/use-kardex'
import { MovementsTab } from '@/components/kardex/movements-tab'
import { BalanceByLocationTab } from '@/components/kardex/balance-by-location-tab'
import { Home, Package, Warehouse, TrendingUp, Activity } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/format-utils'

export default function KardexPage() {
  const { summary: balanceSummary, loading: balancesLoading } = useInventoryBalances()
  const { summary: kardexSummary, loading: kardexLoading } = useKardex()
  const [activeTab, setActiveTab] = useState('movimientos')

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
                onClick={() => setActiveTab('movimientos')}
                className={`h-7 px-4 text-xs font-medium rounded-full transition-all border-0 ${
                  activeTab === 'movimientos'
                    ? 'bg-[#0A84FF] text-white hover:bg-[#0A84FF]/90'
                    : 'bg-transparent text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E]'
                }`}
              >
                Movimientos
              </Button>
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
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - with top padding for fixed header */}
      <div className="relative z-10 px-4 pt-20 pb-8 md:px-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Total Materials */}
          <div className="bg-[#1C1C1E] rounded-2xl p-5 border border-[#2C2C2E] hover:border-[#3C3C3E] transition-all">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[#8E8E93]">Materiales</p>
              <Package className="w-5 h-5 text-[#FF9500]" />
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white">
                {balancesLoading ? '...' : formatNumber(balanceSummary.materialsTracked)}
              </p>
              <p className="text-xs text-[#8E8E93]">
                {balancesLoading ? '...' : balanceSummary.materialsWithStock} con stock
              </p>
            </div>
          </div>

          {/* Card 2: Warehouse Stock */}
          <div className="bg-[#1C1C1E] rounded-2xl p-5 border border-[#2C2C2E] hover:border-[#3C3C3E] transition-all">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[#8E8E93]">Bodega</p>
              <Warehouse className="w-5 h-5 text-[#0A84FF]" />
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-[#0A84FF]">
                {balancesLoading ? '...' : formatNumber(balanceSummary.totalWarehouseStock)}
              </p>
              <p className="text-xs text-[#8E8E93]">unidades mixtas</p>
            </div>
          </div>

          {/* Card 3: Production Stock */}
          <div className="bg-[#1C1C1E] rounded-2xl p-5 border border-[#2C2C2E] hover:border-[#3C3C3E] transition-all">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[#8E8E93]">Producción</p>
              <Activity className="w-5 h-5 text-[#BF5AF2]" />
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-[#BF5AF2]">
                {balancesLoading ? '...' : formatNumber(balanceSummary.totalProductionStock)}
              </p>
              <p className="text-xs text-[#8E8E93]">unidades mixtas</p>
            </div>
          </div>

          {/* Card 4: Recent Movements */}
          <div className="bg-[#1C1C1E] rounded-2xl p-5 border border-[#2C2C2E] hover:border-[#3C3C3E] transition-all">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[#8E8E93]">Movimientos</p>
              <TrendingUp className="w-5 h-5 text-[#30D158]" />
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white">
                {kardexLoading ? '...' : formatNumber(kardexSummary.todayMovements)}
              </p>
              <p className="text-xs text-[#8E8E93]">
                hoy • {kardexLoading ? '...' : kardexSummary.weekMovements} esta semana
              </p>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-[#1C1C1E] rounded-2xl border border-[#2C2C2E] overflow-hidden">
          <div className="p-6">
            {activeTab === 'movimientos' && <MovementsTab />}
            {activeTab === 'balance' && <BalanceByLocationTab />}
          </div>
        </div>
      </div>
    </div>
  )
}
