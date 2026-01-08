"use client"

import { useState, useEffect } from "react"
import { format, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { Package, Clock, Hash, TrendingUp } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useProductivity } from "@/hooks/use-productivity"
import type { ShiftSchedule } from "@/hooks/use-shift-schedules"

interface ProductInfo {
  id: string
  name: string
  currentStock: number
}

interface AddProductionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { productId: string; quantity: number; durationHours?: number }) => void
  resourceId: string
  operationId: string
  dayIndex: number
  shiftNumber: 1 | 2 | 3
  weekStartDate: Date
  products: ProductInfo[]
  editingSchedule?: ShiftSchedule | null
  initialStartHour?: number
  initialDurationHours?: number
}

const SHIFT_NAMES = ['Turno 1 (10pm-6am)', 'Turno 2 (6am-2pm)', 'Turno 3 (2pm-10pm)']
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function AddProductionModal({
  isOpen,
  onClose,
  onSubmit,
  resourceId,
  operationId,
  dayIndex,
  shiftNumber,
  weekStartDate,
  products,
  editingSchedule,
  initialStartHour,
  initialDurationHours
}: AddProductionModalProps) {
  console.log('🚀 [AddProductionModal] Props recibidas:', {
    isOpen,
    resourceId,
    operationId,
    dayIndex,
    shiftNumber,
    productsCount: products.length,
    editingSchedule: !!editingSchedule,
    initialDurationHours
  })

  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [quantity, setQuantity] = useState<string>("")
  const [durationHours, setDurationHours] = useState<string>("8")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [productivity, setProductivity] = useState<{ units_per_hour: number } | null>(null)
  const [suggestedQuantity, setSuggestedQuantity] = useState<number | null>(null)
  const [isLoadingProductivity, setIsLoadingProductivity] = useState(false)

  const { getProductivityByProductAndOperation } = useProductivity()
  const isEditing = !!editingSchedule

  // Log quantity changes
  useEffect(() => {
    console.log('📝 [AddProductionModal] Quantity changed:', quantity)
  }, [quantity])

  // Reset form when opening
  useEffect(() => {
    console.log('🔄 [AddProductionModal] Reset form', { isOpen, editingSchedule, products, initialDurationHours })
    if (isOpen) {
      if (editingSchedule) {
        console.log('📝 [AddProductionModal] Modo edición')
        setSelectedProduct(editingSchedule.productId)
        setQuantity(editingSchedule.quantity.toString())
        setDurationHours(editingSchedule.durationHours.toString())
      } else {
        console.log('➕ [AddProductionModal] Modo creación nueva')
        const initialProduct = products.length === 1 ? products[0].id : ""
        const initialDuration = initialDurationHours?.toString() || "8"
        console.log('🎯 [AddProductionModal] Valores iniciales:', {
          initialProduct,
          initialDuration,
          productsCount: products.length
        })
        setSelectedProduct(initialProduct)
        setQuantity("")
        setDurationHours(initialDuration)
      }
      setProductivity(null)
      setSuggestedQuantity(null)
    }
  }, [isOpen, editingSchedule, products, initialDurationHours])

  // Fetch productivity when product or duration changes
  useEffect(() => {
    const fetchProductivity = async () => {
      console.log('🔍 [AddProductionModal] Consultando productividad...', {
        selectedProduct,
        operationId,
        durationHours,
        quantity,
        isEditing
      })

      if (!selectedProduct || !operationId || !durationHours) {
        console.log('⚠️ [AddProductionModal] Faltan datos para consultar productividad')
        setProductivity(null)
        setSuggestedQuantity(null)
        return
      }

      setIsLoadingProductivity(true)
      try {
        const prodData = await getProductivityByProductAndOperation(selectedProduct, operationId)
        console.log('📊 [AddProductionModal] Productividad obtenida:', prodData)

        if (prodData && prodData.is_active) {
          setProductivity(prodData)
          const hours = parseFloat(durationHours)
          if (!isNaN(hours) && hours > 0) {
            const suggested = Math.round(hours * Number(prodData.units_per_hour))
            console.log('🧮 [AddProductionModal] Cálculo:', {
              hours,
              unitsPerHour: prodData.units_per_hour,
              suggested
            })
            setSuggestedQuantity(suggested)

            // Auto-fill quantity only if it's empty (not editing)
            if (!quantity && !isEditing) {
              console.log('✅ [AddProductionModal] Auto-llenando cantidad:', suggested)
              setQuantity(suggested.toString())
            } else {
              console.log('⚠️ [AddProductionModal] NO auto-llenando cantidad:', {
                quantity,
                isEditing,
                reason: quantity ? 'Ya hay cantidad' : 'Está editando'
              })
            }
          }
        } else {
          console.log('❌ [AddProductionModal] No hay productividad activa')
          setProductivity(null)
          setSuggestedQuantity(null)
        }
      } catch (error) {
        console.error("❌ [AddProductionModal] Error fetching productivity:", error)
        setProductivity(null)
        setSuggestedQuantity(null)
      } finally {
        setIsLoadingProductivity(false)
      }
    }

    fetchProductivity()
  }, [selectedProduct, operationId, durationHours, getProductivityByProductAndOperation])

  const handleSubmit = async () => {
    if (!selectedProduct || !quantity) return

    const quantityNum = parseInt(quantity, 10)
    if (isNaN(quantityNum) || quantityNum <= 0) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        productId: selectedProduct,
        quantity: quantityNum,
        durationHours: parseInt(durationHours, 10) || 8
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const date = addDays(weekStartDate, dayIndex)
  const dateFormatted = format(date, "d 'de' MMMM", { locale: es })
  const selectedProductInfo = products.find(p => p.id === selectedProduct)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1C1C1E] border-[#2C2C2E] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-[#0A84FF]" />
            {isEditing ? 'Editar Producción' : 'Agregar Producción'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Context info */}
          <div className="bg-[#2C2C2E] rounded-lg p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8E8E93]">Día</span>
              <span className="text-sm text-white capitalize">
                {DAY_NAMES[dayIndex]}, {dateFormatted}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8E8E93]">Turno</span>
              <span className="text-sm text-white">{SHIFT_NAMES[shiftNumber - 1]}</span>
            </div>
          </div>

          {/* Product selector */}
          <div className="space-y-2">
            <Label className="text-[#8E8E93]">Producto</Label>
            <Select
              value={selectedProduct}
              onValueChange={setSelectedProduct}
              disabled={isEditing}
            >
              <SelectTrigger className="bg-[#2C2C2E] border-[#3A3A3C] text-white">
                <SelectValue placeholder="Selecciona un producto" />
              </SelectTrigger>
              <SelectContent className="bg-[#2C2C2E] border-[#3A3A3C]">
                {products.map(product => (
                  <SelectItem
                    key={product.id}
                    value={product.id}
                    className="text-white hover:bg-[#3A3A3C] focus:bg-[#3A3A3C]"
                  >
                    <div className="flex items-center gap-2">
                      <span>{product.name}</span>
                      <span className="text-xs text-[#8E8E93]">
                        (Stock: {product.currentStock.toLocaleString()})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity input */}
          <div className="space-y-2">
            <Label className="text-[#8E8E93]">Cantidad (unidades)</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]" />
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ej: 1000"
                min={1}
                className="pl-10 bg-[#2C2C2E] border-[#3A3A3C] text-white placeholder:text-[#636366]"
              />
            </div>
          </div>

          {/* Duration selector */}
          <div className="space-y-2">
            <Label className="text-[#8E8E93]">Duración (horas)</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]" />
              <Select value={durationHours} onValueChange={setDurationHours}>
                <SelectTrigger className="pl-10 bg-[#2C2C2E] border-[#3A3A3C] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2C2C2E] border-[#3A3A3C]">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 24].map(hours => (
                    <SelectItem
                      key={hours}
                      value={hours.toString()}
                      className="text-white hover:bg-[#3A3A3C] focus:bg-[#3A3A3C]"
                    >
                      {hours} hora{hours > 1 ? 's' : ''}
                      {hours === 8 && ' (turno completo)'}
                      {hours > 8 && ' (múltiples turnos)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Productivity info */}
          {isLoadingProductivity && selectedProduct && (
            <div className="bg-[#2C2C2E] rounded-lg p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#8E8E93] animate-pulse" />
                <span className="text-xs text-[#8E8E93]">Consultando productividad...</span>
              </div>
            </div>
          )}

          {!isLoadingProductivity && productivity && suggestedQuantity !== null && (
            <div className="bg-[#30D158]/10 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#30D158]" />
                <span className="text-xs font-medium text-[#30D158]">Productividad configurada</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8E8E93]">Unidades por hora</span>
                <span className="text-sm font-medium text-white">
                  {productivity.units_per_hour.toLocaleString()} unidades/hora
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-[#30D158]/20 pt-2">
                <span className="text-xs text-[#8E8E93]">Unidades sugeridas</span>
                <span className="text-sm font-bold text-[#30D158]">
                  {suggestedQuantity.toLocaleString()} unidades
                </span>
              </div>
              <div className="text-[10px] text-[#8E8E93] mt-1">
                Cálculo: {durationHours} horas × {productivity.units_per_hour.toLocaleString()} unidades/hora
              </div>
            </div>
          )}

          {!isLoadingProductivity && selectedProduct && !productivity && durationHours && (
            <div className="bg-[#FF9500]/10 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#FF9500]" />
                <span className="text-xs text-[#FF9500]">
                  No hay productividad configurada para este producto en esta operación
                </span>
              </div>
            </div>
          )}

          {/* Stock info */}
          {selectedProductInfo && (
            <div className="bg-[#0A84FF]/10 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#0A84FF]">Stock actual</span>
                <span className="text-sm font-medium text-[#0A84FF]">
                  {selectedProductInfo.currentStock.toLocaleString()} unidades
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedProduct || !quantity || isSubmitting}
            className="bg-[#0A84FF] hover:bg-[#0A84FF]/90 text-white"
          >
            {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Agregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
