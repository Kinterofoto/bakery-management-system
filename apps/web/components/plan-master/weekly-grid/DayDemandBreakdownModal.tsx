"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { X, Users, Package, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { ClientDemandBreakdown } from "@/hooks/use-weekly-forecast"

interface DayDemandBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  productName: string
  date: Date
  getDemandBreakdown: (productId: string, date: Date) => Promise<ClientDemandBreakdown[]>
}

export function DayDemandBreakdownModal({
  isOpen,
  onClose,
  productId,
  productName,
  date,
  getDemandBreakdown
}: DayDemandBreakdownModalProps) {
  const [breakdown, setBreakdown] = useState<ClientDemandBreakdown[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && productId && date) {
      setLoading(true)
      getDemandBreakdown(productId, date)
        .then(data => {
          setBreakdown(data)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [isOpen, productId, date, getDemandBreakdown])

  const totalDemand = breakdown.reduce((sum, b) => sum + b.quantityUnits, 0)
  const dayName = format(date, 'EEEE', { locale: es })
  const dateFormatted = format(date, "d 'de' MMMM", { locale: es })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1C1C1E] border-[#2C2C2E] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-[#FF9500]" />
            Desglose de Demanda
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product and date info */}
          <div className="bg-[#2C2C2E] rounded-lg p-3">
            <div className="text-sm font-medium text-white">{productName}</div>
            <div className="text-xs text-[#8E8E93] capitalize">
              {dayName}, {dateFormatted}
            </div>
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#0A84FF]" />
            </div>
          ) : breakdown.length === 0 ? (
            <div className="text-center py-8 text-[#8E8E93]">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay pedidos para esta fecha</p>
            </div>
          ) : (
            <>
              {/* Total header */}
              <div className="flex items-center justify-between px-3 py-2 bg-[#FF9500]/20 rounded-lg">
                <span className="text-sm font-medium text-[#FF9500]">Total demanda</span>
                <span className="text-lg font-bold text-[#FF9500]">
                  {totalDemand.toLocaleString()} unidades
                </span>
              </div>

              {/* Client breakdown list */}
              <div className="space-y-2 max-h-[300px] overflow-auto">
                {breakdown.map((item, index) => (
                  <div
                    key={`${item.clientId}-${item.orderId}-${index}`}
                    className="flex items-center justify-between px-3 py-2 bg-[#2C2C2E] rounded-lg hover:bg-[#3A3A3C] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{item.clientName}</div>
                      <div className="text-xs text-[#8E8E93]">
                        Orden: {item.orderNumber || 'Sin número'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {item.quantityUnits.toLocaleString()}
                      </span>
                      <span className="text-xs text-[#8E8E93]">u</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary by unique clients */}
              <div className="pt-2 border-t border-[#2C2C2E]">
                <div className="flex items-center gap-2 text-xs text-[#8E8E93]">
                  <Users className="h-3.5 w-3.5" />
                  <span>
                    {new Set(breakdown.map(b => b.clientId)).size} cliente{breakdown.length !== 1 ? 's' : ''} · {breakdown.length} pedido{breakdown.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
