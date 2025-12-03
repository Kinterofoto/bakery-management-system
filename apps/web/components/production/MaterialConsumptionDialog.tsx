"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Package, AlertTriangle, Plus } from "lucide-react"
import { useBillOfMaterials } from "@/hooks/use-bill-of-materials"
import { useMaterialConsumptions } from "@/hooks/use-material-consumptions"
import { useProductionShifts } from "@/hooks/use-production-shifts"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  production: {
    id: string
    product_id: string
    shift_id: string
    total_good_units: number
  }
  productName: string
  onSuccess?: () => void
}

interface BOMItem {
  id: string
  material_id: string
  quantity_needed: number
  unit_name: string
  material_name: string
  material_unit: string
}

interface ConsumptionForm {
  materialId: string
  quantity: string
}

export function MaterialConsumptionDialog({ open, onOpenChange, production, productName, onSuccess }: Props) {
  const { user } = useAuth()
  const { getBOMWithMaterialNames } = useBillOfMaterials()
  const { addConsumption, getConsumptions } = useMaterialConsumptions()
  const { getShiftById } = useProductionShifts()
  const { getWorkCenterById } = useWorkCenters()

  const [loading, setLoading] = useState(false)
  const [bomItems, setBomItems] = useState<BOMItem[]>([])
  const [existingConsumptions, setExistingConsumptions] = useState<any[]>([])
  const [formData, setFormData] = useState<ConsumptionForm>({
    materialId: "",
    quantity: ""
  })

  // Cargar BOM y consumos existentes cuando se abre el diálogo
  useEffect(() => {
    if (open && production.product_id && production.shift_id) {
      loadData()
    }
  }, [open, production.product_id, production.shift_id])

  const loadData = async () => {
    try {
      setLoading(true)

      // Obtener shift para conseguir work_center_id
      const shift = await getShiftById(production.shift_id)
      if (!shift) {
        toast.error("No se pudo obtener información del turno")
        return
      }

      // Obtener work_center para conseguir operation_id
      const workCenter = getWorkCenterById(shift.work_center_id)
      const operationId = workCenter?.operation_id || null

      // Obtener BOM filtrado por operation_id si existe
      const [bom, consumptions] = await Promise.all([
        getBOMWithMaterialNames(production.product_id, operationId || undefined),
        getConsumptions(production.id)
      ])

      setBomItems(bom)
      setExistingConsumptions(consumptions)
    } catch (error) {
      console.error("Error loading material data:", error)
      toast.error("Error al cargar los datos de materiales")
    } finally {
      setLoading(false)
    }
  }

  const calculateTheoreticalConsumption = (bomItem: BOMItem): number => {
    return bomItem.quantity_needed * production.total_good_units
  }

  const getActualConsumption = (materialId: string, type: "consumed" | "wasted"): number => {
    return existingConsumptions
      .filter(c => c.material_id === materialId && c.consumption_type === type)
      .reduce((sum, c) => sum + c.quantity_consumed, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const quantity = parseFloat(formData.quantity)
    if (!formData.materialId || !quantity || quantity <= 0) {
      toast.error("Selecciona un material y especifica una cantidad válida")
      return
    }

    try {
      setLoading(true)
      await addConsumption({
        shift_production_id: production.id,
        material_id: formData.materialId,
        quantity_consumed: quantity,
        consumption_type: "consumed",
        recorded_by: user?.id || null,
        notes: null
      })

      toast.success("Consumo registrado exitosamente")
      setFormData({ materialId: "", quantity: "" })

      // Recargar consumos
      await loadData()
      onSuccess?.()
    } catch (error) {
      toast.error("Error al registrar el consumo")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const selectedMaterial = bomItems.find(item => item.material_id === formData.materialId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Registrar Consumo de Materiales
          </DialogTitle>
          <DialogDescription>
            {productName} - {production.total_good_units} unidades producidas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumen de Materiales Requeridos */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Materiales Requeridos (Teórico vs Real)</h4>
            {bomItems.length > 0 ? (
              <div className="space-y-2">
                {bomItems.map((item) => {
                  const theoretical = calculateTheoreticalConsumption(item)
                  const actualConsumed = getActualConsumption(item.material_id, "consumed")
                  const actualWasted = getActualConsumption(item.material_id, "wasted")
                  const totalActual = actualConsumed + actualWasted
                  const variance = totalActual - theoretical
                  const hasVariance = Math.abs(variance) > 0.01

                  return (
                    <div key={item.id} className="bg-gray-50 p-3 rounded-lg border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-medium text-sm">{item.material_name}</h5>
                          <p className="text-xs text-gray-500">
                            Teórico: {theoretical.toFixed(2)} {item.unit_name}
                          </p>
                        </div>
                        <div className="text-right text-xs">
                          <div>Consumido: {actualConsumed.toFixed(2)}</div>
                          <div>Desperdicio: {actualWasted.toFixed(2)}</div>
                          <div className="font-medium">Total: {totalActual.toFixed(2)}</div>
                        </div>
                      </div>
                      {hasVariance && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <span className="text-xs text-amber-600">
                            Varianza: {variance > 0 ? "+" : ""}{variance.toFixed(2)} {item.unit_name}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                No hay materiales configurados en el BOM
              </div>
            )}
          </div>

          <Separator />

          {/* Formulario para Nuevo Registro */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <h4 className="font-medium text-sm">Registrar Nuevo Consumo</h4>

            <div className="space-y-2">
              <Label htmlFor="material">Material *</Label>
              <Select
                value={formData.materialId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, materialId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un material..." />
                </SelectTrigger>
                <SelectContent>
                  {bomItems.map((item) => (
                    <SelectItem key={item.material_id} value={item.material_id}>
                      {item.material_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">
                Cantidad * {selectedMaterial && `(${selectedMaterial.unit_name})`}
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !formData.materialId || !formData.quantity}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              {loading ? "Registrando..." : "Registrar Consumo"}
            </Button>
          </form>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}