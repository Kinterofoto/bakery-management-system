"use client"

import { useState, useEffect } from "react"
import { format, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { Package, Clock, Hash } from "lucide-react"
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
  dayIndex: number
  shiftNumber: 1 | 2 | 3
  weekStartDate: Date
  products: ProductInfo[]
  editingSchedule?: ShiftSchedule | null
  initialStartHour?: number
  initialDurationHours?: number
}

const SHIFT_NAMES = ['Turno 1 (6am-2pm)', 'Turno 2 (2pm-10pm)', 'Turno 3 (10pm-6am)']
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function AddProductionModal({
  isOpen,
  onClose,
  onSubmit,
  resourceId,
  dayIndex,
  shiftNumber,
  weekStartDate,
  products,
  editingSchedule,
  initialStartHour,
  initialDurationHours
}: AddProductionModalProps) {
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [quantity, setQuantity] = useState<string>("")
  const [durationHours, setDurationHours] = useState<string>("8")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditing = !!editingSchedule

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      if (editingSchedule) {
        setSelectedProduct(editingSchedule.productId)
        setQuantity(editingSchedule.quantity.toString())
        setDurationHours(editingSchedule.durationHours.toString())
      } else {
        setSelectedProduct(products.length === 1 ? products[0].id : "")
        setQuantity("")
        setDurationHours(initialDurationHours?.toString() || "8")
      }
    }
  }, [isOpen, editingSchedule, products])

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
