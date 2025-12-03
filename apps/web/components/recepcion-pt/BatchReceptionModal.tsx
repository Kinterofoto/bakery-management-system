"use client"

import { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertTriangle, Package, Loader2 } from "lucide-react"
import { PendingProduction } from "@/hooks/use-finished-goods-reception"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface GroupedProduction {
  product_id: string
  product_name: string
  product_code: string
  unit_type: "good" | "bad"
  unit_of_measure: string
  items: PendingProduction[]
  total_quantity: number
  approved_quantity: number
}

interface BatchReceptionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedProductions: PendingProduction[]
  onApprove: (items: Array<{
    shiftProductionId: string
    productId: string
    quantity: number
    unitType: "good" | "bad"
    locationId: string
    notes?: string
  }>) => Promise<any>
  onSuccess: () => void
}

export function BatchReceptionModal({
  open,
  onOpenChange,
  selectedProductions,
  onApprove,
  onSuccess
}: BatchReceptionModalProps) {
  const [loading, setLoading] = useState(false)
  const [wh3GeneralId, setWh3GeneralId] = useState<string>("")
  const [wh3DefectsId, setWh3DefectsId] = useState<string>("")

  // Fetch WH3 location IDs
  useEffect(() => {
    const fetchLocations = async () => {
      const { data } = await supabase
        .schema("inventario")
        .from("locations")
        .select("id, code")
        .in("code", ["WH3-GENERAL", "WH3-DEFECTS"])

      if (data) {
        const general = data.find(loc => loc.code === "WH3-GENERAL")
        const defects = data.find(loc => loc.code === "WH3-DEFECTS")

        if (general) setWh3GeneralId(general.id)
        if (defects) setWh3DefectsId(defects.id)
      }
    }

    fetchLocations()
  }, [])

  // Group productions by product + unit type
  const groupedProductions = useMemo(() => {
    const groups = new Map<string, GroupedProduction>()

    selectedProductions.forEach(prod => {
      const key = `${prod.product_id}-${prod.unit_type}`

      if (groups.has(key)) {
        const group = groups.get(key)!
        group.items.push(prod)
        group.total_quantity += prod.quantity
      } else {
        groups.set(key, {
          product_id: prod.product_id,
          product_name: prod.product_name,
          product_code: prod.product_code,
          unit_type: prod.unit_type,
          unit_of_measure: prod.unit_of_measure,
          items: [prod],
          total_quantity: prod.quantity,
          approved_quantity: prod.quantity
        })
      }
    })

    return Array.from(groups.values())
  }, [selectedProductions])

  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    groupedProductions.forEach(group => {
      initial[`${group.product_id}-${group.unit_type}`] = group.total_quantity
    })
    return initial
  })

  const handleQuantityChange = (key: string, value: number) => {
    setQuantities(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all quantities
    for (const group of groupedProductions) {
      const key = `${group.product_id}-${group.unit_type}`
      const approvedQty = quantities[key] || 0

      if (approvedQty <= 0) {
        toast.error(`La cantidad para ${group.product_name} (${group.unit_type === "good" ? "Buenas" : "Defectuosas"}) debe ser mayor a 0`)
        return
      }

      if (approvedQty > group.total_quantity) {
        toast.error(`La cantidad para ${group.product_name} excede el máximo de ${group.total_quantity}`)
        return
      }
    }

    // Validate locations are loaded
    if (!wh3GeneralId || !wh3DefectsId) {
      toast.error("Error: Ubicaciones de almacén no disponibles")
      return
    }

    try {
      setLoading(true)

      // Build items array with distributed quantities
      const items = []

      for (const group of groupedProductions) {
        const key = `${group.product_id}-${group.unit_type}`
        const approvedQty = quantities[key] || 0

        // Distribute the approved quantity across all items in the group
        const qtyPerItem = approvedQty / group.items.length

        for (const item of group.items) {
          items.push({
            shiftProductionId: item.shift_production_id,
            productId: item.product_id,
            quantity: qtyPerItem,
            unitType: item.unit_type,
            locationId: item.unit_type === "good" ? wh3GeneralId : wh3DefectsId,
            notes: `Recepción por lote - ${group.product_name} - ${item.unit_type === "good" ? "Unidades buenas" : "Unidades defectuosas"}`
          })
        }
      }

      await onApprove(items)
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error in batch approval:", error)
      toast.error("Error al aprobar las recepciones")
    } finally {
      setLoading(false)
    }
  }

  const totalItems = selectedProductions.length
  const totalGroups = groupedProductions.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-white/90 dark:bg-black/85 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3 text-2xl font-semibold">
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 dark:bg-teal-500/20 backdrop-blur-sm border border-teal-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-teal-600 dark:text-teal-500" />
            </div>
            Recepción por Lote
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600 dark:text-gray-400">
            {totalItems} producción{totalItems > 1 ? "es" : ""} seleccionada{totalItems > 1 ? "s" : ""}, agrupadas en {totalGroups} grupo{totalGroups > 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Grouped Productions */}
          <div className="space-y-4">
            {groupedProductions.map((group) => {
              const key = `${group.product_id}-${group.unit_type}`

              return (
                <div
                  key={key}
                  className="bg-white/50 dark:bg-black/30 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-2xl p-5 space-y-3"
                >
                  {/* Group Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                          {group.product_name}
                        </h3>
                        {group.unit_type === "good" ? (
                          <span className="inline-flex items-center gap-1 bg-green-500/15 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-lg text-xs font-semibold">
                            <CheckCircle className="w-3 h-3" />
                            Buenas
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-red-500/15 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-lg text-xs font-semibold">
                            <AlertTriangle className="w-3 h-3" />
                            Defectuosas
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Código: {group.product_code} • {group.items.length} producción{group.items.length > 1 ? "es" : ""}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total disponible</p>
                      <p className={`text-lg font-bold ${
                        group.unit_type === "good"
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}>
                        {group.total_quantity.toFixed(0)} {group.unit_of_measure}
                      </p>
                    </div>
                  </div>

                  {/* Quantity Input */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      Cantidad a Recibir
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={group.total_quantity}
                      value={quantities[key]}
                      onChange={(e) => handleQuantityChange(key, parseFloat(e.target.value) || 0)}
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
                      Máximo: {group.total_quantity.toFixed(2)} {group.unit_of_measure}
                    </p>
                  </div>

                  {/* Items in this group */}
                  <details className="text-xs text-gray-600 dark:text-gray-400">
                    <summary className="cursor-pointer hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                      Ver {group.items.length} producción{group.items.length > 1 ? "es" : ""} incluida{group.items.length > 1 ? "s" : ""}
                    </summary>
                    <ul className="mt-2 space-y-1 pl-4">
                      {group.items.map((item, idx) => (
                        <li key={item.id} className="flex items-center justify-between">
                          <span>• Centro: {item.work_center_code}</span>
                          <span className="font-medium">{item.quantity.toFixed(0)} {item.unit_of_measure}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <DialogFooter className="flex gap-3 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="
                flex-1
                bg-white/50 dark:bg-black/30
                backdrop-blur-md
                border border-gray-200/50 dark:border-white/10
                text-gray-700 dark:text-gray-300
                font-semibold
                px-6 py-3
                rounded-xl
                hover:bg-white/70 dark:hover:bg-black/50
                transition-all duration-200
              "
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="
                flex-1
                bg-gradient-to-r from-teal-500 to-teal-600
                text-white
                font-semibold
                px-6 py-3
                rounded-xl
                shadow-lg shadow-teal-500/30
                hover:shadow-xl hover:shadow-teal-500/40
                hover:from-teal-600 hover:to-teal-700
                disabled:opacity-50
                disabled:cursor-not-allowed
                transition-all duration-200
                flex items-center justify-center gap-2
              "
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Aprobar {totalGroups} Grupo{totalGroups > 1 ? "s" : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
