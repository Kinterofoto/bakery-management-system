"use client"

import { useState, useEffect } from "react"
import { usePendingDeliveries } from "@/hooks/use-pending-deliveries"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle2, Package, AlertTriangle, Calendar, Check } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

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
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  // Inicializar cantidades cuando lleguen los materiales
  useEffect(() => {
    const initialQuantities: Record<string, number> = {}
    consolidatedMaterials.forEach(m => {
      if (!m.is_delivered && !quantities[m.material_id]) {
        initialQuantities[m.material_id] = m.total_quantity
      }
    })
    if (Object.keys(initialQuantities).length > 0) {
      setQuantities(prev => ({ ...prev, ...initialQuantities }))
    }
  }, [consolidatedMaterials])

  const handleQuantityChange = (materialId: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setQuantities(prev => ({ ...prev, [materialId]: numValue }))
  }

  const handleTransferMaterial = async (material: typeof consolidatedMaterials[0]) => {
    const quantity = quantities[material.material_id] || material.total_quantity

    if (quantity <= 0) {
      toast({
        title: "Cantidad inválida",
        description: "La cantidad debe ser mayor a 0",
        variant: "destructive"
      })
      return
    }

    try {
      setProcessingIds(prev => new Set(prev).add(material.material_id))

      await createConsolidatedTransfer([{
        material_id: material.material_id,
        quantity: quantity
      }])

      toast({
        title: "Transferencia creada",
        description: `Se transfirió ${quantity.toFixed(2)} ${material.unit} de ${material.material_name}`,
      })

      await refetch()
    } catch (err) {
      console.error('Error creating transfer:', err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo crear la transferencia",
        variant: "destructive"
      })
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(material.material_id)
        return newSet
      })
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
            {pendingMaterials.map((material) => {
              const currentQty = quantities[material.material_id] ?? material.total_quantity
              const hasWarning = material.available_stock < currentQty
              const isProcessing = processingIds.has(material.material_id)

              return (
                <div
                  key={material.material_id}
                  className={`
                    p-4
                    flex items-center gap-4
                    ${hasWarning ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}
                  `}
                >
                  {/* Nombre del material */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {material.material_name}
                      </p>
                      {hasWarning && (
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Stock disponible: {material.available_stock.toFixed(2)} {material.unit}
                    </p>
                  </div>

                  {/* Input editable de cantidad */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentQty}
                      onChange={(e) => handleQuantityChange(material.material_id, e.target.value)}
                      disabled={isProcessing}
                      className={`
                        w-28 text-right
                        ${hasWarning ? 'border-amber-400 dark:border-amber-600' : ''}
                      `}
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[40px]">
                      {material.unit}
                    </span>
                  </div>

                  {/* Botón checkbox para confirmar */}
                  <button
                    onClick={() => handleTransferMaterial(material)}
                    disabled={isProcessing || currentQty <= 0}
                    className={`
                      flex items-center justify-center
                      w-10 h-10
                      rounded-lg
                      transition-all duration-150
                      ${isProcessing || currentQty <= 0
                        ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed opacity-50'
                        : 'bg-green-500 hover:bg-green-600 active:scale-95 shadow-md shadow-green-500/30'
                      }
                    `}
                    title="Crear transferencia"
                  >
                    <Check className="w-5 h-5 text-white" />
                  </button>
                </div>
              )
            })}
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

    </div>
  )
}
