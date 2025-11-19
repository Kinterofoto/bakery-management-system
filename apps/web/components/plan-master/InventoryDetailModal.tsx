"use client"

import { useEffect, useMemo } from "react"
import { useInventoryDetails } from "@/hooks/use-inventory-details"
import { formatNumber } from "@/lib/format-utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface InventoryDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  productName: string
  totalProduced: number
  totalDispatched: number
  available: number
}

export function InventoryDetailModal({
  open,
  onOpenChange,
  productId,
  productName,
  totalProduced,
  totalDispatched,
  available
}: InventoryDetailModalProps) {
  const { productionHistory, dispatchHistory, loading, fetchInventoryDetails } = useInventoryDetails()

  useEffect(() => {
    if (open) {
      fetchInventoryDetails(productId)
    }
  }, [open, productId, fetchInventoryDetails])

  // Combine and sort all movements by date
  const movements = useMemo(() => {
    const allMovements: Array<{
      type: 'production' | 'dispatch'
      date: string
      dateObj: Date
      description: string
      quantity: number
      notes?: string
      balance: number
    }> = []

    // Add production records
    productionHistory.forEach((record) => {
      allMovements.push({
        type: 'production',
        date: record.shift_date,
        dateObj: new Date(record.shift_date),
        description: `Producción (${record.recorded_by || 'usuario'})`,
        quantity: record.good_units,
        notes: record.notes || `${record.good_units} unidades buenas, ${record.bad_units} defectuosas`,
        balance: 0 // Will be calculated
      })
    })

    // Add dispatch records
    dispatchHistory.forEach((record) => {
      allMovements.push({
        type: 'dispatch',
        date: record.delivery_date,
        dateObj: new Date(record.delivery_date || ''),
        description: `${record.client_name} (Orden: ${record.order_number})`,
        quantity: -record.quantity_delivered,
        notes: record.rejection_reason ? `Rechazadas: ${record.quantity_delivered}, Razón: ${record.rejection_reason}` : undefined,
        balance: 0 // Will be calculated
      })
    })

    // Sort by date ascending first to calculate balances correctly
    allMovements.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())

    // Calculate running balance
    let runningBalance = 0
    allMovements.forEach((movement) => {
      runningBalance += movement.quantity
      movement.balance = runningBalance
    })

    // Sort by date descending (newest first) for display
    allMovements.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime())

    return allMovements
  }, [productionHistory, dispatchHistory])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#0A0A0A] border-[#1C1C1E] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">
            Historial: {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Section */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-[#1C1C1E] rounded-lg border border-[#2C2C2E]">
            <div>
              <div className="text-sm text-[#8E8E93] mb-1">Producido</div>
              <div className="text-2xl font-bold text-[#0A84FF]">{formatNumber(totalProduced)}</div>
            </div>
            <div>
              <div className="text-sm text-[#8E8E93] mb-1">Despachado</div>
              <div className="text-2xl font-bold text-[#FF3B30]">{formatNumber(totalDispatched)}</div>
            </div>
            <div>
              <div className="text-sm text-[#8E8E93] mb-1">Balance Actual</div>
              <div className="text-2xl font-bold text-[#30D158]">{formatNumber(available)}</div>
            </div>
            <div>
              <div className="text-sm text-[#8E8E93] mb-1">Movimientos</div>
              <div className="text-2xl font-bold text-[#FF9500]">{formatNumber(movements.length)}</div>
            </div>
          </div>

          {/* Movements Table */}
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-[#8E8E93]">Cargando historial...</div>
            </div>
          ) : movements.length === 0 ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-[#8E8E93]">Sin movimientos registrados</div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-4 p-3 bg-[#1C1C1E] rounded-lg text-sm font-semibold text-[#8E8E93] border border-[#2C2C2E]">
                <div>Fecha</div>
                <div>Tipo</div>
                <div className="text-center">Cantidad</div>
                <div className="text-center">Balance</div>
                <div>Detalles</div>
              </div>

              {movements.map((movement, idx) => (
                <div
                  key={idx}
                  className={`grid grid-cols-5 gap-4 p-3 rounded-lg border transition-colors ${
                    movement.type === 'production'
                      ? 'border-[#0A84FF]/30 hover:bg-[#0A84FF]/10'
                      : 'border-[#FF3B30]/30 hover:bg-[#FF3B30]/10'
                  }`}
                >
                  <div>
                    <div className="text-white text-sm">
                      {movement.date
                        ? format(movement.dateObj, 'dd MMM yyyy', { locale: es })
                        : 'Sin fecha'}
                    </div>
                  </div>
                  <div>
                    <div className={`text-sm font-semibold ${
                      movement.type === 'production'
                        ? 'text-[#0A84FF]'
                        : 'text-[#FF3B30]'
                    }`}>
                      {movement.type === 'production' ? 'Entrada' : 'Salida'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-sm font-semibold ${
                      movement.quantity > 0 ? 'text-[#30D158]' : 'text-[#FF3B30]'
                    }`}>
                      {movement.quantity > 0 ? '+' : ''}{formatNumber(movement.quantity)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-[#30D158]/20 text-[#30D158] text-sm font-semibold">
                      {formatNumber(movement.balance)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#8E8E93] text-sm">
                      {movement.description}
                    </div>
                    {movement.notes && (
                      <div className="text-[#8E8E93] text-xs mt-1 line-clamp-2">
                        {movement.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            className="bg-[#1C1C1E] border-0 text-white hover:bg-[#2C2C2E]"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
