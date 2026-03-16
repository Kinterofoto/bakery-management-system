"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useShiftProductions } from "@/hooks/use-shift-productions"
import { useProducts } from "@/hooks/use-products"
import { useBillOfMaterials } from "@/hooks/use-bill-of-materials"
import { useProductWorkCenterMapping } from "@/hooks/use-product-work-center-mapping"
import {
  useShiftScheduleProgress,
  ScheduleProgressItem,
} from "@/hooks/use-shift-schedule-progress"
import {
  Play,
  AlertTriangle,
  Calendar,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  shiftId: string
  workCenterId: string
  activeShiftStartedAt: string
  shiftProductions: {
    id: string
    product_id: string
    total_good_units: number
    status: string | null
  }[]
  onSuccess?: () => void
}

export function CreateProductionDialog({
  open,
  onOpenChange,
  shiftId,
  workCenterId,
  activeShiftStartedAt,
  shiftProductions,
  onSuccess,
}: Props) {
  const { createProduction } = useShiftProductions()
  const { getFinishedProducts } = useProducts()
  const { checkProductHasBOM } = useBillOfMaterials()
  const { mappings } = useProductWorkCenterMapping()
  const { items: scheduleItems } = useShiftScheduleProgress(
    workCenterId,
    activeShiftStartedAt,
    shiftProductions
  )

  const [loading, setLoading] = useState(false)
  const [finishedProducts, setFinishedProducts] = useState<any[]>([])
  const [mode, setMode] = useState<"scheduled" | "free">("scheduled")
  const [formData, setFormData] = useState({ productId: "" })

  // Schedules that haven't been started yet
  const pendingSchedules = scheduleItems.filter((s) => s.status === "pending")

  const handleStartProduction = async (productId: string) => {
    try {
      setLoading(true)

      const hasBOM = await checkProductHasBOM(productId)
      if (!hasBOM) {
        toast.warning(
          "Este producto no tiene configurado su Bill of Materials. Solo podrás registrar unidades buenas y malas."
        )
      }

      await createProduction({
        shift_id: shiftId,
        product_id: productId,
        notes: null,
        status: "active",
      })

      toast.success("Producción iniciada exitosamente")
      setFormData({ productId: "" })
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error("Error al iniciar la producción")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleFreeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.productId) {
      toast.error("Selecciona un producto")
      return
    }
    await handleStartProduction(formData.productId)
  }

  // Load finished products for free selection
  React.useEffect(() => {
    if (open && mode === "free") {
      getFinishedProducts().then((allProducts) => {
        const assignedProductIds = new Set(
          mappings
            .filter((m) => m.work_center_id === workCenterId)
            .map((m) => m.product_id)
        )
        const filteredProducts = allProducts.filter((p) =>
          assignedProductIds.has(p.id)
        )
        setFinishedProducts(filteredProducts)
      })
    }
  }, [open, mode, getFinishedProducts, mappings, workCenterId])

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setMode(pendingSchedules.length > 0 ? "scheduled" : "free")
      setFormData({ productId: "" })
    }
  }, [open, pendingSchedules.length])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Iniciar Nueva Producción</DialogTitle>
          <DialogDescription>
            {pendingSchedules.length > 0
              ? "Selecciona una producción programada o elige un producto libre"
              : "Selecciona el producto que vas a producir en este turno"}
          </DialogDescription>
        </DialogHeader>

        {/* Tabs if there are scheduled items */}
        {pendingSchedules.length > 0 && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              className={`flex-1 text-sm py-1.5 px-3 rounded-md transition-colors ${
                mode === "scheduled"
                  ? "bg-white shadow-sm font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setMode("scheduled")}
            >
              <Calendar className="h-3.5 w-3.5 inline mr-1.5" />
              Programadas ({pendingSchedules.length})
            </button>
            <button
              type="button"
              className={`flex-1 text-sm py-1.5 px-3 rounded-md transition-colors ${
                mode === "free"
                  ? "bg-white shadow-sm font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setMode("free")}
            >
              Selección libre
            </button>
          </div>
        )}

        {/* Scheduled productions list */}
        {mode === "scheduled" && (
          <div className="space-y-2 max-h-[350px] overflow-y-auto py-2">
            {pendingSchedules.map((item) => (
              <ScheduleOption
                key={item.scheduleId}
                item={item}
                loading={loading}
                onStart={() => handleStartProduction(item.productId)}
              />
            ))}
          </div>
        )}

        {/* Free product selection */}
        {mode === "free" && (
          <form onSubmit={handleFreeSubmit}>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="product">Producto *</Label>
                <Select
                  value={formData.productId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, productId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un producto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {finishedProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {product.weight || "Sin peso"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.productId}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? "Iniciando..." : "Iniciar Producción"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Footer for scheduled mode */}
        {mode === "scheduled" && (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ScheduleOption({
  item,
  loading,
  onStart,
}: {
  item: ScheduleProgressItem
  loading: boolean
  onStart: () => void
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
        item.isDelay
          ? "border-amber-200 bg-amber-50"
          : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {item.productName}
          </p>
          {item.isDelay && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 border-amber-300 bg-amber-100 text-amber-700 shrink-0"
            >
              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
              Retraso
            </Badge>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {item.scheduledQuantity.toLocaleString()} unidades programadas
          {item.isDelay && ` · ${item.originalShiftLabel}`}
        </p>
      </div>
      <Button
        size="sm"
        className="bg-green-600 hover:bg-green-700 shrink-0"
        disabled={loading}
        onClick={onStart}
      >
        <Play className="h-3.5 w-3.5 mr-1" />
        Iniciar
      </Button>
    </div>
  )
}
