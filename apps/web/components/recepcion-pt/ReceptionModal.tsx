"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, XCircle, Package, AlertTriangle } from "lucide-react"
import { PendingProduction } from "@/hooks/use-finished-goods-reception"
import { useInventoryMovements } from "@/hooks/use-inventory-movements"
import { toast } from "sonner"

interface ReceptionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  production: PendingProduction
  onApprove: (params: {
    shiftProductionId: string
    productId: string
    quantityApproved: number
    quantityRejected?: number
    notes?: string
    locationId: string
    unitType: "good" | "bad"
  }) => Promise<any>
  onReject: (params: {
    shiftProductionId: string
    reason: string
  }) => Promise<any>
  onSuccess: () => void
}

export function ReceptionModal({
  open,
  onOpenChange,
  production,
  onApprove,
  onReject,
  onSuccess
}: ReceptionModalProps) {
  const { locations } = useInventoryMovements()
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState<"approve" | "reject">("approve")

  // Form state
  const [quantityApproved, setQuantityApproved] = useState(production.quantity)
  const [quantityRejected, setQuantityRejected] = useState(0)
  const [selectedLocation, setSelectedLocation] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")

  // Find WH3 locations based on unit type
  useEffect(() => {
    if (locations.length > 0 && !selectedLocation) {
      let targetLocation

      if (production.unit_type === "good") {
        // For good units, use WH3-GENERAL
        targetLocation = locations.find(loc => loc.code === "WH3-GENERAL")
      } else {
        // For bad units, use WH3-DEFECTS
        targetLocation = locations.find(loc => loc.code === "WH3-DEFECTS")
      }

      // Fallback to any WH3 location
      if (!targetLocation) {
        targetLocation = locations.find(loc =>
          loc.code?.startsWith("WH3") ||
          loc.name?.toLowerCase().includes("terminado")
        )
      }

      if (targetLocation) {
        setSelectedLocation(targetLocation.id)
      }
    }
  }, [locations, selectedLocation, production.unit_type])

  // Reset form when production changes
  useEffect(() => {
    setQuantityApproved(production.quantity)
    setQuantityRejected(0)
    setNotes("")
    setRejectionReason("")
    setAction("approve")
  }, [production])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (action === "approve") {
      // Validation for approval
      if (!selectedLocation) {
        toast.error("Debes seleccionar una ubicación de almacén")
        return
      }

      if (quantityApproved <= 0) {
        toast.error("La cantidad aprobada debe ser mayor a cero")
        return
      }

      if (quantityApproved > production.quantity) {
        toast.error(`La cantidad aprobada no puede exceder ${production.quantity}`)
        return
      }

      try {
        setLoading(true)
        await onApprove({
          shiftProductionId: production.shift_production_id,
          productId: production.product_id,
          quantityApproved,
          quantityRejected,
          notes,
          locationId: selectedLocation,
          unitType: production.unit_type,
        })
        onSuccess()
      } catch (error) {
        console.error("Error approving reception:", error)
      } finally {
        setLoading(false)
      }
    } else {
      // Validation for rejection
      if (!rejectionReason.trim()) {
        toast.error("Debes especificar la razón del rechazo")
        return
      }

      try {
        setLoading(true)
        await onReject({
          shiftProductionId: production.shift_production_id,
          reason: rejectionReason,
        })
        onSuccess()
      } catch (error) {
        console.error("Error rejecting reception:", error)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleCancel = () => {
    setQuantityApproved(production.quantity)
    setQuantityRejected(0)
    setNotes("")
    setRejectionReason("")
    setAction("approve")
    onOpenChange(false)
  }

  // Filter WH3 locations based on unit type
  const warehouseLocations = locations.filter(loc => {
    if (production.unit_type === "good") {
      // For good units, show WH3-GENERAL and other general/storage bins
      return loc.code === "WH3-GENERAL" ||
        (loc.code?.startsWith("WH3") && (loc.bin_type === "general" || loc.bin_type === "storage"))
    } else {
      // For bad units, show WH3-DEFECTS
      return loc.code === "WH3-DEFECTS" ||
        (loc.code?.startsWith("WH3") && loc.bin_type === "quarantine")
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto bg-white/90 dark:bg-black/85 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3 text-2xl font-semibold">
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 dark:bg-teal-500/20 backdrop-blur-sm border border-teal-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-teal-600 dark:text-teal-500" />
            </div>
            Recepción de Producto Terminado
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600 dark:text-gray-400">
            Revisa y aprueba la recepción de productos finalizados al inventario
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Production Info Card */}
          <div className="bg-white/50 dark:bg-black/30 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Información de Producción
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Producto</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {production.product_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {production.product_code}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Centro de Trabajo</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {production.work_center_code} - {production.work_center_name}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tipo de Unidades</p>
                {production.unit_type === "good" ? (
                  <span className="inline-flex items-center gap-1 bg-green-500/15 text-green-700 dark:text-green-400 px-2 py-1 rounded-lg text-sm font-semibold">
                    <CheckCircle className="w-4 h-4" />
                    Unidades Buenas
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-red-500/15 text-red-700 dark:text-red-400 px-2 py-1 rounded-lg text-sm font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    Unidades Defectuosas
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Cantidad</p>
                <p className={`text-lg font-bold ${
                  production.unit_type === "good"
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}>
                  {production.quantity.toFixed(0)} {production.unit_of_measure}
                </p>
              </div>
            </div>
          </div>

          {/* Action Selector */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Acción *
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAction("approve")}
                className={`
                  flex items-center justify-center gap-2
                  px-4 py-3
                  rounded-xl
                  font-semibold
                  transition-all duration-150
                  ${action === "approve"
                    ? "bg-green-500 text-white shadow-md shadow-green-500/30"
                    : "bg-white/50 dark:bg-black/30 backdrop-blur-md border border-white/30 dark:border-white/20 text-gray-700 dark:text-gray-300"
                  }
                  hover:scale-[1.02]
                  active:scale-95
                `}
              >
                <CheckCircle className="w-5 h-5" />
                Aprobar
              </button>

              <button
                type="button"
                onClick={() => setAction("reject")}
                className={`
                  flex items-center justify-center gap-2
                  px-4 py-3
                  rounded-xl
                  font-semibold
                  transition-all duration-150
                  ${action === "reject"
                    ? "bg-red-500 text-white shadow-md shadow-red-500/30"
                    : "bg-white/50 dark:bg-black/30 backdrop-blur-md border border-white/30 dark:border-white/20 text-gray-700 dark:text-gray-300"
                  }
                  hover:scale-[1.02]
                  active:scale-95
                `}
              >
                <XCircle className="w-5 h-5" />
                Rechazar
              </button>
            </div>
          </div>

          {/* Approval Fields */}
          {action === "approve" && (
            <>
              {/* Quantity Approved */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Cantidad a Recibir *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={production.total_good_units}
                  value={quantityApproved}
                  onChange={(e) => setQuantityApproved(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="
                    w-full
                    bg-white/60 dark:bg-black/40
                    backdrop-blur-md
                    border border-gray-200/50 dark:border-white/10
                    rounded-xl
                    px-4 py-3
                    text-base
                    placeholder:text-gray-400 dark:placeholder:text-gray-500
                    focus:outline-none
                    focus:ring-2 focus:ring-teal-500/50
                    focus:border-teal-500/50
                    transition-all duration-200
                  "
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Máximo: {production.total_good_units.toFixed(2)} {production.unit_of_measure}
                </p>
              </div>

              {/* Warehouse Location */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Ubicación de Almacén *
                </Label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="
                    w-full
                    bg-white/60 dark:bg-black/40
                    backdrop-blur-md
                    border border-gray-200/50 dark:border-white/10
                    rounded-xl
                    px-4 py-3
                    text-base
                    focus:outline-none
                    focus:ring-2 focus:ring-teal-500/50
                    focus:border-teal-500/50
                    transition-all duration-200
                  ">
                    <SelectValue placeholder="Seleccionar ubicación" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 dark:bg-black/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-xl shadow-2xl">
                    {warehouseLocations.map((location) => (
                      <SelectItem
                        key={location.id}
                        value={location.id}
                        className="hover:bg-gray-100/50 dark:hover:bg-white/5 rounded-lg transition-colors duration-150"
                      >
                        {location.code} - {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {warehouseLocations.length === 0 && (
                  <div className="bg-orange-500/10 dark:bg-orange-500/15 backdrop-blur-sm border border-orange-500/20 rounded-xl p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-orange-700 dark:text-orange-400">
                      No hay ubicaciones de almacén disponibles. Por favor, crea una ubicación WH3 (Producto Terminado) primero.
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Notas (Opcional)
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones sobre la recepción..."
                  rows={3}
                  className="
                    w-full
                    bg-white/60 dark:bg-black/40
                    backdrop-blur-md
                    border border-gray-200/50 dark:border-white/10
                    rounded-xl
                    px-4 py-3
                    text-base
                    placeholder:text-gray-400 dark:placeholder:text-gray-500
                    focus:outline-none
                    focus:ring-2 focus:ring-teal-500/50
                    focus:border-teal-500/50
                    transition-all duration-200
                    resize-none
                  "
                />
              </div>
            </>
          )}

          {/* Rejection Fields */}
          {action === "reject" && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Razón del Rechazo *
              </Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Especifica la razón por la cual se rechaza esta recepción..."
                rows={4}
                className="
                  w-full
                  bg-white/60 dark:bg-black/40
                  backdrop-blur-md
                  border border-gray-200/50 dark:border-white/10
                  rounded-xl
                  px-4 py-3
                  text-base
                  placeholder:text-gray-400 dark:placeholder:text-gray-500
                  focus:outline-none
                  focus:ring-2 focus:ring-red-500/50
                  focus:border-red-500/50
                  transition-all duration-200
                  resize-none
                "
              />
              <div className="bg-red-500/10 dark:bg-red-500/15 backdrop-blur-sm border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700 dark:text-red-400">
                  Al rechazar, esta producción será marcada como no recibida y requerirá revisión adicional.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-3 pt-4 border-t border-gray-200/30 dark:border-white/10">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="
                bg-white/50 dark:bg-black/30
                backdrop-blur-md
                border border-white/30 dark:border-white/20
                text-gray-900 dark:text-white
                font-semibold
                px-6 py-3
                rounded-xl
                shadow-sm shadow-black/5
                hover:bg-white/70 dark:hover:bg-black/40
                hover:shadow-md hover:shadow-black/10
                active:scale-95
                disabled:opacity-40
                disabled:cursor-not-allowed
                disabled:hover:scale-100
                transition-all duration-150
              "
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || (action === "approve" && warehouseLocations.length === 0)}
              className={`
                ${action === "approve"
                  ? "bg-teal-500 shadow-md shadow-teal-500/30 hover:bg-teal-600 hover:shadow-lg hover:shadow-teal-500/40"
                  : "bg-red-500 shadow-md shadow-red-500/30 hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/40"
                }
                text-white
                font-semibold
                px-6 py-3
                rounded-xl
                active:scale-95
                disabled:opacity-60
                disabled:cursor-not-allowed
                disabled:hover:scale-100
                transition-all duration-150
                flex items-center gap-2
              `}
            >
              {action === "approve" ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {loading ? "Procesando..." : "Aprobar Recepción"}
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  {loading ? "Procesando..." : "Rechazar Recepción"}
                </>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
