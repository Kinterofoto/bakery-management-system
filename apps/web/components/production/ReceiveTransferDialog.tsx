"use client"

import { useState } from "react"
import { useMaterialTransfers } from "@/hooks/use-material-transfers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

type MaterialTransfer = any

type ReceiveTransferDialogProps = {
  transfer: MaterialTransfer
  onClose: () => void
  onSuccess?: () => void
}

export function ReceiveTransferDialog({ transfer, onClose, onSuccess }: ReceiveTransferDialogProps) {
  const { receiveTransfer, loading } = useMaterialTransfers()
  const { toast } = useToast()

  const [items, setItems] = useState(
    transfer.items?.map((item: any) => ({
      id: item.id,
      material_id: item.material_id,
      material_name: item.material_name,
      quantity_requested: item.quantity_requested,
      quantity_received: item.quantity_requested, // Default to requested quantity
      unit_of_measure: item.unit_of_measure,
      batch_number: item.batch_number,
      expiry_date: item.expiry_date,
      notes: item.notes || ''
    })) || []
  )

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Validate that all items have quantities
      if (items.some(item => !item.quantity_received || item.quantity_received <= 0)) {
        toast({
          title: "Error de validación",
          description: "Todas las cantidades recibidas deben ser mayores a 0",
          variant: "destructive"
        })
        return
      }

      // Validate that quantities don't exceed requested
      for (const item of items) {
        if (item.quantity_received > item.quantity_requested) {
          toast({
            title: "Error de validación",
            description: `La cantidad recibida de ${item.material_name} no puede ser mayor a la cantidad solicitada`,
            variant: "destructive"
          })
          return
        }
      }

      await receiveTransfer(transfer.id, items)

      toast({
        title: "Traslado recibido",
        description: "El traslado ha sido recibido exitosamente",
      })

      onSuccess?.()
      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo recibir el traslado",
        variant: "destructive"
      })
    }
  }

  const hasPartialQuantities = items.some(item => item.quantity_received < item.quantity_requested)

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
            Recibir Traslado {transfer.transfer_number}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">

          {hasPartialQuantities && (
            <div className="
              bg-yellow-50 dark:bg-yellow-950/30
              border border-yellow-200 dark:border-yellow-800/50
              rounded-lg
              p-4
              flex items-center gap-3
            ">
              <AlertCircle className="text-yellow-600 dark:text-yellow-400" size={20} />
              <div>
                <p className="font-semibold text-yellow-900 dark:text-yellow-300">Nota</p>
                <p className="text-sm text-yellow-800 dark:text-yellow-400">
                  Estás recibiendo una cantidad parcial. Explica por qué en las notas.
                </p>
              </div>
            </div>
          )}

          {/* Materials */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Materiales</h3>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border border-white/30 dark:border-white/15
                    rounded-lg
                    p-4
                    space-y-3
                  "
                >
                  {/* Material Name and Requested Quantity */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {item.material_name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Solicitado: {item.quantity_requested} {item.unit_of_measure}
                      </p>
                    </div>
                    {item.batch_number && (
                      <div className="text-right text-sm">
                        <p className="font-medium text-gray-700 dark:text-gray-300">
                          Lote: {item.batch_number}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Quantity Received */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cantidad Recibida *
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={item.quantity_requested}
                      value={item.quantity_received}
                      onChange={(e) => handleItemChange(index, 'quantity_received', parseFloat(e.target.value) || 0)}
                      className="
                        mt-1
                        bg-white/50 dark:bg-black/30
                        backdrop-blur-md
                        border-gray-200/50 dark:border-white/10
                        rounded-lg
                      "
                    />
                  </div>

                  {/* Observation */}
                  {item.quantity_received < item.quantity_requested && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Observación (cantidad diferente)
                      </Label>
                      <Input
                        type="text"
                        value={item.notes}
                        onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                        placeholder="Ej: Llegó dañado, falta..."
                        className="
                          mt-1
                          bg-white/50 dark:bg-black/30
                          backdrop-blur-md
                          border-gray-200/50 dark:border-white/10
                          rounded-lg
                        "
                      />
                    </div>
                  )}

                  {/* Batch and Expiry Info */}
                  {(item.batch_number || item.expiry_date) && (
                    <div className="bg-white/30 dark:bg-black/20 rounded p-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      {item.batch_number && <p>Lote: {item.batch_number}</p>}
                      {item.expiry_date && <p>Vencimiento: {item.expiry_date}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="
          bg-gray-50/50 dark:bg-white/5
          backdrop-blur-sm
          px-6 py-4
          flex justify-end gap-3
        ">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="
              bg-white/20 dark:bg-black/20
              backdrop-blur-md
              border border-white/30 dark:border-white/20
              rounded-xl
              hover:bg-white/30 dark:hover:bg-black/30
            "
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="
              bg-blue-500
              text-white
              font-semibold
              px-6
              rounded-xl
              shadow-md shadow-blue-500/30
              hover:bg-blue-600
              hover:shadow-lg hover:shadow-blue-500/40
              active:scale-95
              transition-all duration-150
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            {loading ? "Recibiendo..." : "Confirmar Recepción"}
          </Button>
        </div>

      </div>
    </div>
  )
}
