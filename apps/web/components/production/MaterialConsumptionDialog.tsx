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
import { useBomVariants, type BomVariant } from "@/hooks/use-bom-variants"
import { useMaterialConsumptions } from "@/hooks/use-material-consumptions"
import { useProductionShifts } from "@/hooks/use-production-shifts"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { useAuth } from "@/contexts/AuthContext"
import { useInventoryMovements } from "@/hooks/use-inventory-movements"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { supabase } from "@/lib/supabase"
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
  batchNumber: string
  expiryDate: string
}

export function MaterialConsumptionDialog({ open, onOpenChange, production, productName, onSuccess }: Props) {
  const { user } = useAuth()
  const { getBOMWithMaterialNames } = useBillOfMaterials()
  const bomVariantsApi = useBomVariants()
  const { addConsumption, getConsumptions } = useMaterialConsumptions()
  const { getShiftById } = useProductionShifts()
  const { getWorkCenterById } = useWorkCenters()
  const { getAvailableBatches } = useInventoryMovements()

  const [loading, setLoading] = useState(false)
  const [bomItems, setBomItems] = useState<BOMItem[]>([])
  const [existingConsumptions, setExistingConsumptions] = useState<any[]>([])
  const [workCenterName, setWorkCenterName] = useState<string>("")
  const [availableBatches, setAvailableBatches] = useState<Array<{ batch_number: string; expiry_date: string | null }>>([])
  const [variants, setVariants] = useState<BomVariant[]>([])
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [variantLocked, setVariantLocked] = useState(false)
  const [formData, setFormData] = useState<ConsumptionForm>({
    materialId: "",
    quantity: "",
    batchNumber: "",
    expiryDate: ""
  })

  // Cargar BOM y consumos existentes cuando se abre el diálogo
  useEffect(() => {
    if (open && production.product_id && production.shift_id) {
      loadData()
    }
  }, [open, production.product_id, production.shift_id])

  // Cargar lotes disponibles cuando se selecciona un material
  useEffect(() => {
    const loadBatches = async () => {
      if (formData.materialId && workCenterName.includes("PESAJE")) {
        const batches = await getAvailableBatches(formData.materialId)
        setAvailableBatches(batches)
      } else {
        setAvailableBatches([])
      }
    }
    loadBatches()
  }, [formData.materialId, workCenterName])

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
      const workCenter = shift.work_center_id ? getWorkCenterById(shift.work_center_id) : null
      const operationId = workCenter?.operation_id || null
      const wcName = workCenter?.name?.toUpperCase() || ""
      setWorkCenterName(wcName)
      const isPesaje = wcName.includes("PESAJE")

      // Existing consumptions + variants + production record (for bom_variant_id)
      const [consumptions, variantList, productionRow] = await Promise.all([
        getConsumptions(production.id),
        bomVariantsApi.listByProduct(production.product_id),
        supabase
          .schema("produccion")
          .from("shift_productions")
          .select("bom_variant_id")
          .eq("id", production.id)
          .maybeSingle()
          .then((r: any) => r.data),
      ])

      setExistingConsumptions(consumptions)
      setVariants(variantList)
      const hasConsumptions = (consumptions || []).length > 0
      setVariantLocked(hasConsumptions)

      // Resolve which variant to show
      const defaultVariant = variantList.find(v => v.is_default) ?? variantList[0] ?? null
      const persistedVariantId = productionRow?.bom_variant_id as string | undefined

      let pickedId: string | null = persistedVariantId ?? null

      if (!pickedId && isPesaje && variantList.length > 1) {
        // Try to auto-select a non-default variant whose is_recorte materials
        // have enough inventory to cover the theoretical consumption.
        pickedId = await autoSelectVariant(variantList, defaultVariant?.id ?? null, operationId)
      }
      if (!pickedId) {
        pickedId = defaultVariant?.id ?? null
      }

      setSelectedVariantId(pickedId)

      // Persist the first-time choice so downstream work centers inherit it.
      if (pickedId && !persistedVariantId && !hasConsumptions) {
        await supabase
          .schema("produccion")
          .from("shift_productions")
          .update({ bom_variant_id: pickedId })
          .eq("id", production.id)
      }

      // Load BOM filtered by the chosen variant
      const bom = pickedId
        ? await getBOMWithMaterialNames(production.product_id, operationId || undefined, pickedId)
        : []
      setBomItems(bom as unknown as BOMItem[])
    } catch (error) {
      console.error("Error loading material data:", error)
      toast.error("Error al cargar los datos de materiales")
    } finally {
      setLoading(false)
    }
  }

  const autoSelectVariant = async (
    variantList: BomVariant[],
    defaultVariantId: string | null,
    operationId: string | null,
  ): Promise<string | null> => {
    const candidates = variantList
      .filter(v => v.id !== defaultVariantId)
      .sort((a, b) => a.sort_order - b.sort_order)
    if (candidates.length === 0) return null

    for (const variant of candidates) {
      // Load this variant's BOM rows, joined with the material's is_recorte flag.
      let query = supabase
        .schema("produccion")
        .from("bill_of_materials")
        .select("material_id, quantity_needed, materials:products!bill_of_materials_material_product_id_fkey(is_recorte)")
        .eq("variant_id", variant.id)
        .eq("is_active", true)
      if (operationId) query = query.eq("operation_id", operationId)
      const { data: rows, error } = await query
      if (error || !rows) continue

      const recorteRows = rows.filter((r: any) => r.materials?.is_recorte)
      if (recorteRows.length === 0) continue // variant uses no recorte material

      let usable = true
      for (const row of recorteRows as any[]) {
        const theoretical = (row.quantity_needed as number) * production.total_good_units
        const batches = await getAvailableBatches(row.material_id as string)
        const available = (batches || []).reduce((s: number, b: any) => s + (Number(b.quantity_on_hand) || Number(b.quantity) || 0), 0)
        if (available < theoretical) {
          usable = false
          break
        }
      }
      if (usable) return variant.id
    }
    return null
  }

  const handleSelectVariant = async (variantId: string) => {
    if (variantLocked || variantId === selectedVariantId) return
    setSelectedVariantId(variantId)
    try {
      await supabase
        .schema("produccion")
        .from("shift_productions")
        .update({ bom_variant_id: variantId })
        .eq("id", production.id)
      // Reload BOM for the new variant
      const shift = await getShiftById(production.shift_id)
      const workCenter = shift?.work_center_id ? getWorkCenterById(shift.work_center_id) : null
      const operationId = workCenter?.operation_id || undefined
      const bom = await getBOMWithMaterialNames(production.product_id, operationId, variantId)
      setBomItems(bom as unknown as BOMItem[])
    } catch (err) {
      console.error("Error switching variant:", err)
      toast.error("Error al cambiar de variante")
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

    // Validar campos de lote si es centro de trabajo PESAJE
    const isPesaje = workCenterName.includes("PESAJE")
    if (isPesaje) {
      if (!formData.batchNumber.trim()) {
        toast.error("El lote es requerido para el centro de trabajo de Pesaje")
        return
      }
      if (!formData.expiryDate) {
        toast.error("La fecha de vencimiento es requerida para el centro de trabajo de Pesaje")
        return
      }
    }

    try {
      setLoading(true)
      await addConsumption({
        shift_production_id: production.id,
        material_id: formData.materialId,
        quantity_consumed: quantity,
        consumption_type: "consumed",
        recorded_by: user?.id || null,
        notes: null,
        batch_number: isPesaje ? formData.batchNumber : null,
        expiry_date: isPesaje ? formData.expiryDate : null
      } as any)

      toast.success("Consumo registrado exitosamente")
      setFormData({ materialId: "", quantity: "", batchNumber: "", expiryDate: "" })

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
          {/* Variant selector (only at pesaje when there's more than one variant) */}
          {workCenterName.includes("PESAJE") && variants.length > 1 && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-amber-900">Receta a pesar</Label>
                {variantLocked && (
                  <span className="text-[10px] text-amber-700">
                    Cambio bloqueado: ya se registró consumo.
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {variants.map(v => {
                  const isActive = v.id === selectedVariantId
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleSelectVariant(v.id)}
                      disabled={variantLocked}
                      className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                        isActive
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-white text-amber-900 border-amber-300 hover:bg-amber-100"
                      } ${variantLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      Pesar {v.name.toLowerCase()}
                      {v.is_default && <span className="ml-1 opacity-70">· default</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

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
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-500">
                              Teórico: {theoretical.toFixed(2)} {item.unit_name}
                            </p>
                            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-amber-400 hover:bg-amber-500 text-amber-950">
                              {Math.round(item.quantity_needed)} {item.unit_name}/u
                            </Badge>
                          </div>
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

            {workCenterName.includes("PESAJE") && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="batchNumber">Lote *</Label>
                  {availableBatches.length > 0 ? (
                    <SearchableSelect
                      options={availableBatches.map(batch => ({
                        value: batch.batch_number,
                        label: batch.batch_number,
                        subLabel: batch.expiry_date ? `Vence: ${new Date(batch.expiry_date).toLocaleDateString('es-ES')}` : 'Sin fecha de vencimiento'
                      }))}
                      value={formData.batchNumber || null}
                      onChange={(value) => {
                        const selectedBatch = availableBatches.find(b => b.batch_number === value)
                        setFormData(prev => ({
                          ...prev,
                          batchNumber: value,
                          expiryDate: selectedBatch?.expiry_date || ""
                        }))
                      }}
                      placeholder="Buscar lote..."
                      icon={<Package className="w-4 h-4" />}
                    />
                  ) : (
                    <Input
                      id="batchNumber"
                      type="text"
                      value={formData.batchNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, batchNumber: e.target.value }))}
                      placeholder="Número de lote (sin lotes previos)"
                      maxLength={100}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Fecha de Vencimiento *</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                  />
                </div>
              </>
            )}

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