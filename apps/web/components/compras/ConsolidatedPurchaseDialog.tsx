"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { AlertCircle, ShoppingCart } from "lucide-react"
import { useSuppliers } from "@/hooks/use-suppliers"
import { usePurchaseOrders } from "@/hooks/use-purchase-orders"
import { useMaterialSuppliers } from "@/hooks/use-material-suppliers"
import { useMaterialExplosion, MaterialRequirement } from "@/hooks/use-material-explosion"
import { useToast } from "@/components/ui/use-toast"
import { Database } from "@/lib/database.types"

type Supplier = Database['compras']['Tables']['suppliers']['Row']
type MaterialSupplier = Database['compras']['Tables']['material_suppliers']['Row']

type ConsolidatedPurchaseDialogProps = {
  isOpen: boolean
  onClose: () => void
  materialId: string
  materialName: string
  onOrderCreated?: () => void
}

interface SupplierOption {
  supplier: Supplier
  materialSupplier: MaterialSupplier
  deliveryDays: string
  deliveryDayNumbers: number[]
}

interface DateSelection {
  requirement: MaterialRequirement
  isSelected: boolean
  matchesDeliveryDay: boolean
}

export function ConsolidatedPurchaseDialog({
  isOpen,
  onClose,
  materialId,
  materialName,
  onOrderCreated
}: ConsolidatedPurchaseDialogProps) {
  const { suppliers } = useSuppliers()
  const { materialSuppliers } = useMaterialSuppliers()
  const { createOrderFromExplosion } = usePurchaseOrders()
  const { getAvailableDatesForMaterial, createOrUpdateTracking } = useMaterialExplosion()
  const { toast } = useToast()

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("")
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([])
  const [availableDates, setAvailableDates] = useState<MaterialRequirement[]>([])

  // Parse delivery days from JSON format
  const parseDeliveryDays = (deliveryDaysData: any): number[] => {
    if (!deliveryDaysData) return []

    if (typeof deliveryDaysData === 'object' && !Array.isArray(deliveryDaysData)) {
      const dayMap: Record<string, number> = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
      }
      return Object.entries(deliveryDaysData)
        .filter(([_, value]) => value === true)
        .map(([key, _]) => dayMap[key.toLowerCase()] || -1)
        .filter(day => day !== -1)
    }

    if (typeof deliveryDaysData === 'string') {
      return deliveryDaysData.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d))
    }

    if (Array.isArray(deliveryDaysData)) {
      return deliveryDaysData
    }

    return []
  }

  const getDayName = (dayNumber: number): string => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    return days[dayNumber] || ''
  }

  const formatDeliveryDaysDisplay = (deliveryDaysData: any): string => {
    const days = parseDeliveryDays(deliveryDaysData)
    if (days.length === 0) return 'No configurado'
    return days.map(d => getDayName(d)).join(', ')
  }

  // Check if a date matches supplier's delivery days
  const dateMatchesDeliveryDays = (date: string, deliveryDays: number[]): boolean => {
    if (deliveryDays.length === 0) return true // If no delivery days configured, show all
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay()
    return deliveryDays.includes(dayOfWeek)
  }

  // Load supplier options when dialog opens
  useEffect(() => {
    if (!isOpen) {
      setSelectedSupplierId("")
      setSelectedDates(new Set())
      return
    }

    const availableMS = materialSuppliers.filter(
      ms => ms.material_id === materialId && ms.status === 'active'
    )

    const options: SupplierOption[] = availableMS
      .map(ms => {
        const supplier = suppliers.find(s => s.id === ms.supplier_id && s.status === 'active')
        if (!supplier) return null

        const deliveryDayNumbers = parseDeliveryDays(supplier.delivery_days)
        const deliveryDaysStr = formatDeliveryDaysDisplay(supplier.delivery_days)

        return {
          supplier,
          materialSupplier: ms,
          deliveryDays: deliveryDaysStr,
          deliveryDayNumbers
        }
      })
      .filter((opt): opt is SupplierOption => opt !== null)

    setSupplierOptions(options)

    // Auto-select first option
    if (options.length > 0) {
      setSelectedSupplierId(options[0].supplier.id)
    }

    // Load available dates for this material
    const dates = getAvailableDatesForMaterial(materialId)
    setAvailableDates(dates)
  }, [isOpen, materialId, materialSuppliers, suppliers, getAvailableDatesForMaterial])

  // Get dates organized by whether they match delivery days
  const dateSelections = useMemo<DateSelection[]>(() => {
    const selectedOption = supplierOptions.find(opt => opt.supplier.id === selectedSupplierId)
    if (!selectedOption) return []

    return availableDates.map(req => ({
      requirement: req,
      isSelected: selectedDates.has(req.date),
      matchesDeliveryDay: dateMatchesDeliveryDays(req.date, selectedOption.deliveryDayNumbers)
    }))
  }, [availableDates, selectedDates, selectedSupplierId, supplierOptions])

  // Calculate totals for selected dates
  const totals = useMemo(() => {
    const selectedOption = supplierOptions.find(opt => opt.supplier.id === selectedSupplierId)
    if (!selectedOption) return { quantity: 0, cost: 0 }

    let totalQuantity = 0
    dateSelections.forEach(ds => {
      if (ds.isSelected) {
        totalQuantity += ds.requirement.quantity_needed
      }
    })

    const totalCost = totalQuantity * selectedOption.materialSupplier.unit_price

    return { quantity: totalQuantity, cost: totalCost }
  }, [dateSelections, selectedSupplierId, supplierOptions])

  const handleDateToggle = (date: string) => {
    const newSelected = new Set(selectedDates)
    if (newSelected.has(date)) {
      newSelected.delete(date)
    } else {
      newSelected.add(date)
    }
    setSelectedDates(newSelected)
  }

  // Calculate next delivery date based on selected dates
  const calculateDeliveryDate = (): string => {
    const selectedOption = supplierOptions.find(opt => opt.supplier.id === selectedSupplierId)
    if (!selectedOption || selectedDates.size === 0) {
      return new Date().toISOString().split('T')[0]
    }

    // Find the earliest selected requirement date
    const earliestDate = Array.from(selectedDates).sort()[0]
    const targetDate = new Date(earliestDate)

    // If no delivery days configured, use the earliest date
    if (selectedOption.deliveryDayNumbers.length === 0) {
      return earliestDate
    }

    // Find next delivery day before or on the earliest requirement date
    const today = new Date()
    let checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() + 1)

    // Look forward up to 30 days
    for (let i = 0; i < 30; i++) {
      const dayOfWeek = checkDate.getDay()
      if (selectedOption.deliveryDayNumbers.includes(dayOfWeek)) {
        if (checkDate <= targetDate) {
          return checkDate.toISOString().split('T')[0]
        }
      }
      checkDate.setDate(checkDate.getDate() + 1)
    }

    return earliestDate
  }

  const handleSubmit = async () => {
    if (!selectedSupplierId) {
      toast({ title: "Error", description: "Selecciona un proveedor", variant: "destructive" })
      return
    }

    if (selectedDates.size === 0) {
      toast({ title: "Error", description: "Selecciona al menos una fecha", variant: "destructive" })
      return
    }

    setLoading(true)

    try {
      const selectedOption = supplierOptions.find(opt => opt.supplier.id === selectedSupplierId)
      if (!selectedOption) throw new Error('Proveedor no encontrado')

      const deliveryDate = calculateDeliveryDate()

      // Prepare items for the order - one item per selected date
      const items = Array.from(selectedDates).map(date => {
        const requirement = availableDates.find(r => r.date === date)
        if (!requirement) throw new Error(`Requirement no encontrado para fecha ${date}`)

        return {
          material_id: materialId,
          quantity: requirement.quantity_needed,
          unitPrice: selectedOption.materialSupplier.unit_price
        }
      })

      // Create consolidated purchase order
      const { orderId, error } = await createOrderFromExplosion(
        selectedSupplierId,
        deliveryDate,
        items
      )

      if (error) {
        throw new Error(error)
      }

      // Update tracking for each selected date
      for (const date of selectedDates) {
        const requirement = availableDates.find(r => r.date === date)
        if (requirement) {
          try {
            await createOrUpdateTracking(
              materialId,
              date,
              requirement.quantity_needed,
              orderId || undefined
            )
          } catch (trackingErr) {
            console.error('Error updating tracking:', trackingErr)
            // Continue even if tracking fails
          }
        }
      }

      toast({
        title: "Éxito",
        description: `Orden de compra consolidada creada con ${selectedDates.size} fechas`
      })
      onOrderCreated?.()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear orden'
      toast({ title: "Error", description: message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const selectedOption = supplierOptions.find(opt => opt.supplier.id === selectedSupplierId)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Crear Orden de Compra Consolidada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Material Info */}
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-sm text-gray-600">Material</div>
            <div className="font-semibold">{materialName}</div>
          </div>

          {/* Supplier Selection */}
          <div className="space-y-2">
            <Label htmlFor="supplier">Proveedor *</Label>
            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
              <SelectTrigger id="supplier">
                <SelectValue placeholder="Selecciona un proveedor" />
              </SelectTrigger>
              <SelectContent>
                {supplierOptions.map(option => (
                  <SelectItem key={option.supplier.id} value={option.supplier.id}>
                    <div className="flex items-center gap-2">
                      <span>{option.supplier.company_name}</span>
                      <span className="text-xs text-gray-500">
                        ({option.deliveryDays})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {supplierOptions.length === 0 && (
              <p className="text-sm text-red-600">
                No hay proveedores activos configurados para este material
              </p>
            )}
          </div>

          {/* Supplier Details */}
          {selectedOption && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="text-blue-900 font-medium">
                    Días de entrega: {selectedOption.deliveryDays}
                  </div>
                  <div className="text-blue-800 text-xs mt-1">
                    Precio unitario: ${selectedOption.materialSupplier.unit_price.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Date Selection */}
          {selectedOption && (
            <div className="space-y-3">
              <Label>Selecciona las fechas a incluir en la orden *</Label>

              {availableDates.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No hay fechas disponibles sin orden de compra para este material
                </p>
              ) : (
                <div className="border rounded-md p-3 space-y-2 max-h-64 overflow-y-auto">
                  {dateSelections.map(ds => (
                    <div
                      key={ds.requirement.date}
                      className={`flex items-center gap-3 p-2 rounded ${
                        !ds.matchesDeliveryDay ? 'bg-yellow-50 border border-yellow-200' : 'hover:bg-gray-50'
                      }`}
                    >
                      <Checkbox
                        id={`date-${ds.requirement.date}`}
                        checked={ds.isSelected}
                        onCheckedChange={() => handleDateToggle(ds.requirement.date)}
                      />
                      <label
                        htmlFor={`date-${ds.requirement.date}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {new Date(ds.requirement.date).toLocaleDateString('es-CO', {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short'
                            })}
                          </span>
                          <span className="text-sm text-gray-600">
                            {ds.requirement.quantity_needed.toFixed(2)} {ds.requirement.material_unit}
                          </span>
                        </div>
                        {!ds.matchesDeliveryDay && (
                          <div className="text-xs text-yellow-700 mt-1">
                            ⚠️ No coincide con día de entrega del proveedor
                          </div>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          {selectedDates.size > 0 && selectedOption && (
            <div className="bg-gray-100 border border-gray-300 rounded-md p-4 space-y-2">
              <div className="font-semibold text-gray-700">Resumen</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Fechas seleccionadas:</div>
                <div className="font-semibold">{selectedDates.size}</div>

                <div>Cantidad total:</div>
                <div className="font-semibold">
                  {totals.quantity.toFixed(2)} {availableDates[0]?.material_unit}
                </div>

                <div>Costo estimado:</div>
                <div className="font-semibold text-green-700">
                  ${totals.cost.toFixed(2)}
                </div>

                <div>Fecha de entrega:</div>
                <div className="font-semibold">
                  {new Date(calculateDeliveryDate()).toLocaleDateString('es-CO')}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedSupplierId || selectedDates.size === 0}
          >
            {loading ? "Creando..." : `Crear Orden (${selectedDates.size} fechas)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
