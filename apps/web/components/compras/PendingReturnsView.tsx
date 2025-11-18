"use client"

import { useState } from "react"
import { useMaterialReturns } from "@/hooks/use-material-returns"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, Package } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export function PendingReturnsView() {
  const { returns, acceptReturn, loading, error } = useMaterialReturns()
  const { toast } = useToast()
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  const pendingReturns = returns.filter(r => r.status === 'pending_receipt')

  const handleAcceptReturn = async (returnId: string) => {
    try {
      setAcceptingId(returnId)
      await acceptReturn(returnId)
      toast({
        title: "Devolución aceptada",
        description: "La devolución ha sido aceptada y los materiales vuelven al inventario central",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo aceptar la devolución",
        variant: "destructive"
      })
    } finally {
      setAcceptingId(null)
    }
  }

  if (error) {
    return (
      <div className="
        bg-red-50 dark:bg-red-950/30
        border border-red-200 dark:border-red-800/50
        rounded-lg
        p-4
        flex items-center gap-3
      ">
        <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
        <div>
          <p className="font-semibold text-red-900 dark:text-red-300">Error</p>
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="
        bg-white/50 dark:bg-black/30
        backdrop-blur-md
        border border-white/30 dark:border-white/15
        rounded-lg
        p-8
        text-center
      ">
        <p className="text-gray-600 dark:text-gray-400">Cargando devoluciones...</p>
      </div>
    )
  }

  if (pendingReturns.length === 0) {
    return (
      <div className="
        bg-white/50 dark:bg-black/30
        backdrop-blur-md
        border border-white/30 dark:border-white/15
        rounded-lg
        p-8
        text-center
      ">
        <CheckCircle2 className="mx-auto mb-3 text-green-600 dark:text-green-400" size={32} />
        <p className="font-semibold text-gray-900 dark:text-white mb-1">No hay devoluciones pendientes</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">Todas las devoluciones han sido procesadas</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {pendingReturns.map((ret) => (
        <div
          key={ret.id}
          className="
            bg-white/50 dark:bg-black/30
            backdrop-blur-md
            border border-white/30 dark:border-white/15
            rounded-lg
            p-4
          "
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {ret.return_number}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Centro: {ret.work_center?.name || 'Desconocido'}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 text-sm font-medium text-orange-700 dark:text-orange-400">
                  <Package size={16} />
                  Pendiente
                </span>
              </div>

              {/* Reason */}
              {ret.reason && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Motivo: </span>
                  {ret.reason}
                </p>
              )}

              {/* Materials */}
              {ret.items && ret.items.length > 0 && (
                <div className="bg-white/40 dark:bg-black/20 rounded p-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Materiales a devolver:</p>
                  <div className="space-y-1">
                    {ret.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">
                          {item.material_name}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {item.quantity_returned} {item.unit_of_measure}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {ret.notes && (
                <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                  {ret.notes}
                </p>
              )}

              {/* Date */}
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Solicitado: {new Date(ret.requested_at).toLocaleDateString('es-CO')}
              </p>
            </div>

            {/* Action Button */}
            <Button
              onClick={() => handleAcceptReturn(ret.id)}
              disabled={acceptingId === ret.id}
              className="
                bg-green-500
                text-white
                font-semibold
                px-4
                py-2
                rounded-lg
                shadow-md shadow-green-500/30
                hover:bg-green-600
                hover:shadow-lg hover:shadow-green-500/40
                active:scale-95
                transition-all duration-150
                disabled:opacity-50
                disabled:cursor-not-allowed
                whitespace-nowrap
              "
            >
              {acceptingId === ret.id ? "Aceptando..." : "Aceptar"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
