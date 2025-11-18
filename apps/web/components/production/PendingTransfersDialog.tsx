"use client"

import { useState } from "react"
import { useMaterialTransfers } from "@/hooks/use-material-transfers"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, X } from "lucide-react"
import { TransferStatusBadge } from "@/components/compras/TransferStatusBadge"
import { ReceiveTransferDialog } from "@/components/production/ReceiveTransferDialog"

type PendingTransfersDialogProps = {
  workCenterId: string
  onClose: () => void
}

export function PendingTransfersDialog({ workCenterId, onClose }: PendingTransfersDialogProps) {
  const { transfers, loading, error } = useMaterialTransfers()
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null)
  const [showReceiveDialog, setShowReceiveDialog] = useState(false)

  const pendingTransfers = transfers.filter(t =>
    t.work_center_id === workCenterId && t.status === 'pending_receipt'
  )

  const selectedTransfer = transfers.find(t => t.id === selectedTransferId)

  if (showReceiveDialog && selectedTransfer) {
    return (
      <ReceiveTransferDialog
        transfer={selectedTransfer}
        onClose={() => {
          setShowReceiveDialog(false)
          setSelectedTransferId(null)
        }}
        onSuccess={() => {
          setShowReceiveDialog(false)
          setSelectedTransferId(null)
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="
        bg-white/90 dark:bg-black/80
        backdrop-blur-2xl
        border border-white/30 dark:border-white/15
        rounded-3xl
        shadow-2xl shadow-black/20
        max-w-2xl
        w-full
        max-h-[90vh]
        overflow-hidden
      ">
        {/* Header */}
        <div className="
          bg-blue-500
          px-6 py-4
          flex items-center justify-between
        ">
          <h2 className="text-xl font-semibold text-white">
            Traslados Pendientes
          </h2>
          <button
            onClick={onClose}
            className="
              text-white
              hover:bg-white/20
              rounded-lg
              p-2
              transition-colors
            "
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="
              bg-red-50 dark:bg-red-950/30
              border border-red-200 dark:border-red-800/50
              rounded-lg
              p-4
              flex items-center gap-3
              mb-4
            ">
              <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-300">Error</p>
                <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {loading && (
            <p className="text-center text-gray-600 dark:text-gray-400">Cargando traslados...</p>
          )}

          {!loading && pendingTransfers.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle2 className="mx-auto mb-3 text-green-600 dark:text-green-400" size={32} />
              <p className="font-semibold text-gray-900 dark:text-white mb-1">No hay traslados pendientes</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Todos los traslados han sido recibidos</p>
            </div>
          )}

          <div className="space-y-3">
            {pendingTransfers.map((transfer) => (
              <div
                key={transfer.id}
                className="
                  bg-white/50 dark:bg-black/30
                  backdrop-blur-md
                  border border-white/30 dark:border-white/15
                  rounded-lg
                  p-4
                  hover:bg-white/60 dark:hover:bg-black/40
                  transition-colors
                "
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {transfer.transfer_number}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Solicitado: {new Date(transfer.requested_at).toLocaleDateString('es-CO')}
                        </p>
                      </div>
                      <TransferStatusBadge status={transfer.status} />
                    </div>

                    {/* Items Summary */}
                    {transfer.items && transfer.items.length > 0 && (
                      <div className="bg-white/40 dark:bg-black/20 rounded p-3 space-y-2">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                          Materiales ({transfer.items.length}):
                        </p>
                        <div className="space-y-1">
                          {transfer.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-700 dark:text-gray-300">
                                {item.material_name}
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {item.quantity_requested} {item.unit_of_measure}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {transfer.notes && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                        {transfer.notes}
                      </p>
                    )}
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => {
                      setSelectedTransferId(transfer.id)
                      setShowReceiveDialog(true)
                    }}
                    className="
                      bg-blue-500
                      text-white
                      font-semibold
                      px-4
                      py-2
                      rounded-lg
                      shadow-md shadow-blue-500/30
                      hover:bg-blue-600
                      hover:shadow-lg hover:shadow-blue-500/40
                      active:scale-95
                      transition-all duration-150
                      whitespace-nowrap
                    "
                  >
                    Recibir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="
          bg-gray-50/50 dark:bg-white/5
          backdrop-blur-sm
          px-6 py-4
          flex justify-end gap-3
        ">
          <Button
            onClick={onClose}
            className="
              bg-gray-500
              text-white
              font-semibold
              px-6
              rounded-xl
              hover:bg-gray-600
              transition-all duration-150
            "
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}
