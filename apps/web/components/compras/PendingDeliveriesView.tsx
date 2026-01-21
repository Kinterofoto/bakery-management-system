"use client"

import { useState } from "react"
import { usePendingDeliveries } from "@/hooks/use-pending-deliveries"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, Package, AlertTriangle, Calendar, Truck, Check } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ConsolidatedTransferDialog } from "./ConsolidatedTransferDialog"

export function PendingDeliveriesView() {
  const {
    consolidatedMaterials,
    pesajeWorkCenter,
    loading,
    error,
    schedulesCount,
    windowLabel,
    refetch,
    createConsolidatedTransfer
  } = usePendingDeliveries()

  const { toast } = useToast()
  const [showTransferDialog, setShowTransferDialog] = useState(false)

  const handleConfirmTransfer = async (materialsWithQuantities: Array<{ material_id: string, quantity: number }>) => {
    try {
      await createConsolidatedTransfer(materialsWithQuantities)
      toast({
        title: "Transferencia creada",
        description: `Se creó la transferencia consolidada a ${pesajeWorkCenter?.name || 'PESAJE'} con ${materialsWithQuantities.length} materiales`,
      })
      await refetch()
    } catch (err) {
      console.error('Error creating transfer:', err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo crear la transferencia",
        variant: "destructive"
      })
      throw err
    }
  }

  const materialsWithWarning = consolidatedMaterials.filter(m => m.has_warning)
  const pendingMaterials = consolidatedMaterials.filter(m => !m.is_delivered)
  const deliveredMaterials = consolidatedMaterials.filter(m => m.is_delivered)

  if (error) {
    return (
      <div className="
        bg-red-50 dark:bg-red-950/30
        border border-red-200 dark:border-red-800/50
        rounded-2xl
        p-4
        flex items-center gap-3
      ">
        <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
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
        bg-white/70 dark:bg-black/50
        backdrop-blur-xl
        border border-white/20 dark:border-white/10
        rounded-2xl
        p-8
        text-center
      ">
        <p className="text-gray-600 dark:text-gray-400">Calculando entregas pendientes...</p>
      </div>
    )
  }

  if (consolidatedMaterials.length === 0) {
    return (
      <div className="
        bg-white/70 dark:bg-black/50
        backdrop-blur-xl
        border border-white/20 dark:border-white/10
        rounded-2xl
        p-8
        text-center
      ">
        <CheckCircle2 className="mx-auto mb-3 text-green-600 dark:text-green-400" size={32} />
        <p className="font-semibold text-gray-900 dark:text-white mb-1">No hay entregas pendientes</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No hay producciones programadas para PESAJE en la ventana actual
        </p>
        <p className="text-xs text-gray-500 mt-2">{windowLabel}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header con información de la ventana */}
      <div className="
        bg-white/70 dark:bg-black/50
        backdrop-blur-xl
        border border-white/20 dark:border-white/10
        rounded-2xl
        p-4
      ">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                Ventana de Producción
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                {windowLabel}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {schedulesCount} producción(es) programada(s)
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {consolidatedMaterials.length} material(es) a trasladar
            </p>
          </div>
        </div>
      </div>

      {/* Warning de stock insuficiente */}
      {materialsWithWarning.length > 0 && (
        <div className="
          bg-amber-50 dark:bg-amber-950/30
          border border-amber-200 dark:border-amber-800/50
          rounded-2xl
          p-4
          flex items-start gap-3
        ">
          <AlertTriangle className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-300">
              Stock insuficiente
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-400">
              {materialsWithWarning.length} material(es) tienen stock insuficiente en el inventario central.
              Puedes crear la transferencia de todas formas.
            </p>
          </div>
        </div>
      )}

      {/* Lista de materiales pendientes */}
      {pendingMaterials.length > 0 && (
        <div className="
          bg-white/70 dark:bg-black/50
          backdrop-blur-xl
          border border-white/20 dark:border-white/10
          rounded-2xl
          overflow-hidden
        ">
          <div className="p-4 border-b border-white/20 dark:border-white/10">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-500" />
              Materiales Pendientes de Entrega ({pendingMaterials.length})
            </h3>
          </div>

          <div className="divide-y divide-white/10 dark:divide-white/5">
            {pendingMaterials.map((material) => (
              <div
                key={material.material_id}
                className={`
                  p-4
                  flex items-center justify-between gap-4
                  ${material.has_warning ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}
                `}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {material.material_name}
                    </p>
                    {material.has_warning && (
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                  {material.has_warning && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Stock disponible: {material.available_stock.toFixed(2)} {material.unit}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {material.total_quantity.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {material.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de materiales ya entregados */}
      {deliveredMaterials.length > 0 && (
        <div className="
          bg-green-50/70 dark:bg-green-950/20
          backdrop-blur-xl
          border border-green-200/50 dark:border-green-800/30
          rounded-2xl
          overflow-hidden
        ">
          <div className="p-4 border-b border-green-200/50 dark:border-green-800/30">
            <h3 className="font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              Materiales Ya Entregados ({deliveredMaterials.length})
            </h3>
          </div>

          <div className="divide-y divide-green-200/30 dark:divide-green-800/20">
            {deliveredMaterials.map((material) => (
              <div
                key={material.material_id}
                className="p-4 flex items-center justify-between gap-4 opacity-70"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {material.material_name}
                    </p>
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                    Entregado: {material.delivered_quantity.toFixed(2)} {material.unit}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-gray-700 dark:text-gray-300 line-through">
                    {material.total_quantity.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {material.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón de crear transferencia */}
      {pendingMaterials.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowTransferDialog(true)}
            disabled={pendingMaterials.length === 0}
            className="
              bg-blue-600
              text-white
              font-semibold
              px-6
              py-3
              rounded-xl
              shadow-md shadow-blue-600/30
              hover:bg-blue-700
              hover:shadow-lg hover:shadow-blue-600/40
              active:scale-95
              transition-all duration-150
              disabled:opacity-50
              disabled:cursor-not-allowed
              flex items-center gap-2
            "
          >
            <Truck className="w-4 h-4" />
            Crear Transferencia Consolidada
          </Button>
        </div>
      )}

      {/* Diálogo de transferencia */}
      {showTransferDialog && (
        <ConsolidatedTransferDialog
          materials={pendingMaterials}
          pesajeWorkCenterName={pesajeWorkCenter?.name || 'PESAJE'}
          windowLabel={windowLabel}
          onClose={() => setShowTransferDialog(false)}
          onConfirm={handleConfirmTransfer}
        />
      )}
    </div>
  )
}
