'use client'

import { useState } from 'react'
import { GlassCard } from '@/components/kardex/glass-card'
import { useInventoryBalances } from '@/hooks/use-inventory-balances'
import { useKardex } from '@/hooks/use-kardex'
import { MovementsTab } from '@/components/kardex/movements-tab'
import { BalanceByLocationTab } from '@/components/kardex/balance-by-location-tab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function KardexPage() {
  const { summary: balanceSummary, loading: balancesLoading } = useInventoryBalances()
  const { summary: kardexSummary, loading: kardexLoading } = useKardex()
  const [activeTab, setActiveTab] = useState('movimientos')

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
          Kardex de Inventario
        </h1>
        <p className="text-gray-400 text-lg">
          Trazabilidad completa de movimientos y balances de materias primas
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {/* Card 1: Total Materials */}
        <GlassCard variant="thin" padding="lg" hover>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-400">Materiales Rastreados</p>
              <span className="text-2xl">📦</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white">
                {balancesLoading ? '...' : balanceSummary.materialsTracked}
              </p>
              <p className="text-xs text-gray-500">
                {balancesLoading ? '...' : balanceSummary.materialsWithStock} con stock actual
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Card 2: Warehouse Stock */}
        <GlassCard variant="thin" padding="lg" hover>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-400">Stock en Bodega</p>
              <span className="text-2xl">🏭</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
                {balancesLoading ? '...' : balanceSummary.totalWarehouseStock.toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">unidades mixtas</p>
            </div>
          </div>
        </GlassCard>

        {/* Card 3: Production Stock */}
        <GlassCard variant="thin" padding="lg" hover>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-400">Stock en Producción</p>
              <span className="text-2xl">⚙️</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-purple-300 bg-clip-text text-transparent">
                {balancesLoading ? '...' : balanceSummary.totalProductionStock.toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">unidades mixtas</p>
            </div>
          </div>
        </GlassCard>

        {/* Card 4: Recent Movements */}
        <GlassCard variant="thin" padding="lg" hover>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-400">Movimientos</p>
              <span className="text-2xl">📊</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white">
                {kardexLoading ? '...' : kardexSummary.todayMovements}
              </p>
              <p className="text-xs text-gray-500">
                hoy • {kardexLoading ? '...' : kardexSummary.weekMovements} esta semana
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Main Content - Tabs */}
      <GlassCard variant="medium" padding="none">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab Navigation */}
          <div className="border-b border-white/10 px-6 pt-6">
            <TabsList className="bg-white/5 border border-white/10 p-1 rounded-lg">
              <TabsTrigger
                value="movimientos"
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 rounded-md px-4 py-2 transition-all"
              >
                📋 Movimientos
              </TabsTrigger>
              <TabsTrigger
                value="balance"
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 rounded-md px-4 py-2 transition-all"
              >
                📍 Balance por Ubicación
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Contents */}
          <div className="p-6">
            <TabsContent value="movimientos" className="mt-0">
              <MovementsTab />
            </TabsContent>

            <TabsContent value="balance" className="mt-0">
              <BalanceByLocationTab />
            </TabsContent>
          </div>
        </Tabs>
      </GlassCard>
    </div>
  )
}
