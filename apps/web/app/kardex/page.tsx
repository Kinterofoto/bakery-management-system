'use client'

import { useState } from 'react'
import { MovementsTab } from '@/components/kardex/movements-tab'
import { BalanceByLocationTabV2 } from '@/components/kardex/balance-by-location-tab-v2'
import { VideoTutorialButton } from '@/components/shared/VideoTutorialButton'
import { Home } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { RouteGuard } from '@/components/auth/RouteGuard'

export default function KardexPage() {
  const [activeTab, setActiveTab] = useState('balance')

  return (
    <RouteGuard>
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
            <div className="flex items-center gap-2">
              <VideoTutorialButton modulePath="/kardex" />
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
        </div>
      </div>

      {/* Content Area - with top padding for fixed header */}
      <div className="relative z-10 px-4 pt-20 pb-8 md:px-6">
        {/* Tab Content */}
        <div className="bg-[#1C1C1E] rounded-2xl border border-[#2C2C2E] overflow-hidden">
          <div className="p-6">
            {activeTab === 'movimientos' && <MovementsTab />}
            {activeTab === 'balance' && <BalanceByLocationTabV2 />}
          </div>
        </div>
      </div>
    </div>
    </RouteGuard>
  )
}
