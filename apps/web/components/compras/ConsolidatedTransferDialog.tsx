"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, AlertTriangle, Truck } from "lucide-react"
import type { ConsolidatedMaterial } from "@/hooks/use-pending-deliveries"

interface ConsolidatedTransferDialogProps {
  materials: ConsolidatedMaterial[]
  pesajeWorkCenterName: string
  windowLabel: string
  onClose: () => void
  onConfirm: (materialsWithQuantities: Array<{ material_id: string, quantity: number }>) => Promise<void>
}

export function ConsolidatedTransferDialog({
  materials,
  pesajeWorkCenterName,
  windowLabel,
  onClose,
  onConfirm
}: ConsolidatedTransferDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(materials.map(m => [m.material_id, m.total_quantity]))
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleQuantityChange = (materialId: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setQuantities(prev => ({ ...prev, [materialId]: numValue }))
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)

      // Filter out materials with 0 quantity
      const materialsToTransfer = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([material_id, quantity]) => ({ material_id, quantity }))

      if (materialsToTransfer.length === 0) {
        return
      }

      await onConfirm(materialsToTransfer)
      onClose()
    } catch (error) {
      console.error('Error creating transfer:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const materialsWithWarning = materials.filter(m => m.has_warning)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="
        bg-white dark:bg-gray-900
        rounded-2xl
        shadow-2xl
        max-w-3xl
        w-full
        max-h-[90vh]
        overflow-hidden
        flex flex-col
      ">
        {/* Header */}
        <div className="
          p-6
          border-b border-gray-200 dark:border-gray-700
          flex items-center justify-between
        ">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Truck className="w-6 h-6 text-blue-500" />
              Crear Transferencia Consolidada
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Destino: {pesajeWorkCenterName} • {windowLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="
              p-2
              hover:bg-gray-100 dark:hover:bg-gray-800
              rounded-lg
              transition-colors
            "
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Warning */}
        {materialsWithWarning.length > 0 && (
          <div className="
            mx-6 mt-6
            bg-amber-50 dark:bg-amber-950/30
            border border-amber-200 dark:border-amber-800/50
            rounded-lg
            p-4
            flex items-start gap-3
          ">
            <AlertTriangle className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-300">
                Stock insuficiente
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-400">
                {materialsWithWarning.length} material(es) tienen stock insuficiente. Ajusta las cantidades según disponibilidad.
              </p>
            </div>
          </div>
        )}

        {/* Materials List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {materials.map((material) => {
            const currentQty = quantities[material.material_id] || 0
            const hasWarning = material.available_stock < currentQty

            return (
              <div
                key={material.material_id}
                className={`
                  p-4
                  rounded-lg
                  border
                  ${hasWarning
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                  }
                `}
              >
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {material.material_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Disponible: {material.available_stock.toFixed(2)} {material.unit}
                      {material.total_quantity !== currentQty && (
                        <span className="ml-2 text-blue-600 dark:text-blue-400">
                          • Requerido originalmente: {material.total_quantity.toFixed(2)} {material.unit}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label htmlFor={`qty-${material.material_id}`} className="text-xs">
                      Cantidad a transferir
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id={`qty-${material.material_id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={currentQty}
                        onChange={(e) => handleQuantityChange(material.material_id, e.target.value)}
                        className={`
                          ${hasWarning ? 'border-amber-400 dark:border-amber-600' : ''}
                        `}
                      />
                      <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[40px]">
                        {material.unit}
                      </span>
                    </div>
                  </div>

                  {hasWarning && (
                    <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Excede stock</span>
                    </div>
                  )}
                </div>

                {material.available_stock > 0 && material.available_stock < material.total_quantity && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantities(prev => ({
                      ...prev,
                      [material.material_id]: material.available_stock
                    }))}
                    className="mt-2 text-xs"
                  >
                    Ajustar a disponible ({material.available_stock.toFixed(2)} {material.unit})
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="
          p-6
          border-t border-gray-200 dark:border-gray-700
          flex items-center justify-end gap-3
        ">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || Object.values(quantities).every(q => q === 0)}
            className="
              bg-blue-600
              text-white
              hover:bg-blue-700
              disabled:opacity-50
            "
          >
            {isSubmitting ? "Creando..." : "Crear Transferencia"}
          </Button>
        </div>
      </div>
    </div>
  )
}
