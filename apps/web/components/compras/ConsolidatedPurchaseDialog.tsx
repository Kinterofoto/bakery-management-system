"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Truck, Check, Calendar } from "lucide-react"
import { useSuppliers } from "@/hooks/use-suppliers"
import { usePurchaseOrders } from "@/hooks/use-purchase-orders"
import { useMaterialSuppliers } from "@/hooks/use-material-suppliers"
import { useMaterialExplosion, MaterialRequirement } from "@/hooks/use-material-explosion"
import { useToast } from "@/components/ui/use-toast"
import { Database } from "@/lib/database.types"
import { cn } from "@/lib/utils"

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

interface DeliveryGroup {
  deliveryDate: Date
  deliveryDateStr: string
  nextDeliveryDate: Date | null
  requirements: MaterialRequirement[]
  totalQuantity: number
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

  // Progressive steps state
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("")
  const [selectedDeliveryGroup, setSelectedDeliveryGroup] = useState<DeliveryGroup | null>(null)
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

  // Find next delivery date after a given date
  const findNextDeliveryDate = (afterDate: Date, deliveryDays: number[]): Date | null => {
    if (deliveryDays.length === 0) return null

    const checkDate = new Date(afterDate)
    checkDate.setDate(checkDate.getDate() + 1)

    // Look forward up to 60 days
    for (let i = 0; i < 60; i++) {
      if (deliveryDays.includes(checkDate.getDay())) {
        return new Date(checkDate)
      }
      checkDate.setDate(checkDate.getDate() + 1)
    }
    return null
  }

  // Group requirement dates by supplier delivery dates
  const groupRequirementsByDelivery = useMemo<DeliveryGroup[]>(() => {
    const selectedOption = supplierOptions.find(opt => opt.supplier.id === selectedSupplierId)
    if (!selectedOption || availableDates.length === 0) return []

    const deliveryDays = selectedOption.deliveryDayNumbers
    if (deliveryDays.length === 0) return []

    const today = new Date()
    const groups: DeliveryGroup[] = []

    // Find all possible delivery dates that could fulfill requirements
    const allRequirementDates = availableDates.map(r => new Date(r.date)).sort((a, b) => a.getTime() - b.getTime())
    const earliestReq = allRequirementDates[0]
    const latestReq = allRequirementDates[allRequirementDates.length - 1]

    // Find delivery dates from today until after the latest requirement
    const deliveryDates: Date[] = []
    let checkDate = new Date(today)

    while (checkDate <= latestReq || deliveryDates.length < 10) {
      if (deliveryDays.includes(checkDate.getDay())) {
        deliveryDates.push(new Date(checkDate))
      }
      checkDate.setDate(checkDate.getDate() + 1)

      // Safety limit
      if (deliveryDates.length > 20) break
    }

    // For each delivery date, group requirements that need to be ordered for it
    for (let i = 0; i < deliveryDates.length; i++) {
      const deliveryDate = deliveryDates[i]
      const nextDeliveryDate = deliveryDates[i + 1] || null

      // Get requirements that fall between this delivery and the next
      const groupRequirements = availableDates.filter(req => {
        const reqDate = new Date(req.date)

        // Requirement must be on or after current delivery date
        if (reqDate < deliveryDate) return false

        // If there's a next delivery, requirement must be before it
        if (nextDeliveryDate && reqDate >= nextDeliveryDate) return false

        return true
      })

      if (groupRequirements.length > 0) {
        const totalQuantity = groupRequirements.reduce((sum, req) => sum + req.quantity_needed, 0)

        groups.push({
          deliveryDate,
          deliveryDateStr: deliveryDate.toISOString().split('T')[0],
          nextDeliveryDate,
          requirements: groupRequirements,
          totalQuantity
        })
      }
    }

    return groups
  }, [supplierOptions, selectedSupplierId, availableDates])

  // Load supplier options when dialog opens
  useEffect(() => {
    if (!isOpen) {
      setSelectedSupplierId("")
      setSelectedDeliveryGroup(null)
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

    // Load available dates for this material
    const dates = getAvailableDatesForMaterial(materialId)
    setAvailableDates(dates)
  }, [isOpen, materialId, materialSuppliers, suppliers, getAvailableDatesForMaterial])

  const handleSubmit = async () => {
    if (!selectedSupplierId) {
      toast({ title: "Error", description: "Selecciona un proveedor", variant: "destructive" })
      return
    }

    if (!selectedDeliveryGroup) {
      toast({ title: "Error", description: "Selecciona una fecha de entrega", variant: "destructive" })
      return
    }

    setLoading(true)

    try {
      const selectedOption = supplierOptions.find(opt => opt.supplier.id === selectedSupplierId)
      if (!selectedOption) throw new Error('Proveedor no encontrado')

      // Prepare items for the order - consolidate all requirements into one item
      const items = [{
        material_id: materialId,
        quantity: selectedDeliveryGroup.totalQuantity,
        unitPrice: selectedOption.materialSupplier.unit_price
      }]

      // Create consolidated purchase order
      const { orderId, error } = await createOrderFromExplosion(
        selectedSupplierId,
        selectedDeliveryGroup.deliveryDateStr,
        items
      )

      if (error) {
        throw new Error(error)
      }

      // Update tracking for each requirement date in the group
      for (const requirement of selectedDeliveryGroup.requirements) {
        try {
          await createOrUpdateTracking(
            materialId,
            requirement.date,
            requirement.quantity_needed,
            orderId || undefined
          )
        } catch (trackingErr) {
          console.error('Error updating tracking:', trackingErr)
          // Continue even if tracking fails
        }
      }

      toast({
        title: "Éxito",
        description: `Orden de compra creada para ${selectedDeliveryGroup.requirements.length} fecha(s)`
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

  // Check if form is complete
  const isFormComplete = selectedSupplierId && selectedDeliveryGroup

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-2xl border border-gray-200/50 rounded-3xl p-0">
        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-8 py-6 rounded-t-3xl">
          <h2 className="text-3xl font-semibold tracking-tight text-gray-900">Nueva Orden</h2>
          <p className="text-base text-gray-500 mt-1">Planificando compra para {materialName}</p>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-8">
          {/* Step 1: Supplier Selection */}
          <div className={cn(
            "space-y-4 transition-all duration-300",
            selectedSupplierId ? "opacity-100" : "opacity-100"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all duration-200",
                selectedSupplierId
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-600"
              )}>
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Elige Proveedor</h3>
            </div>

            {supplierOptions.length === 0 ? (
              <div className="bg-red-50/50 backdrop-blur-sm border border-red-200/50 rounded-2xl p-6 text-center">
                <p className="text-sm text-red-600">
                  No hay proveedores activos configurados para este material
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {supplierOptions.map(option => {
                  const isSelected = selectedSupplierId === option.supplier.id
                  return (
                    <button
                      key={option.supplier.id}
                      onClick={() => {
                        setSelectedSupplierId(option.supplier.id)
                        setSelectedDeliveryGroup(null) // Reset delivery selection
                      }}
                      className={cn(
                        "group relative flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200 text-left",
                        "hover:shadow-lg hover:shadow-blue-500/10 hover:scale-[1.02] active:scale-[0.98]",
                        isSelected
                          ? "bg-blue-500/10 border-blue-500 shadow-md shadow-blue-500/20"
                          : "bg-white/70 backdrop-blur-md border-gray-200/50 hover:border-blue-300"
                      )}
                    >
                      {/* Icon */}
                      <div className={cn(
                        "flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200",
                        isSelected ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500"
                      )}>
                        <Truck className="w-6 h-6" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-base truncate">
                          {option.supplier.company_name}
                        </div>
                        <div className="text-sm text-gray-500 mt-0.5">
                          Frecuencia: {option.deliveryDays}
                        </div>
                      </div>

                      {/* Checkmark */}
                      {isSelected && (
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Step 2: Delivery Date Selection */}
          {selectedSupplierId && (
            <div className={cn(
              "space-y-4 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all duration-200",
                  selectedDeliveryGroup
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-600"
                )}>
                  2
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Fecha de Entrega</h3>
              </div>

              {groupRequirementsByDelivery.length === 0 ? (
                <div className="bg-yellow-50/50 backdrop-blur-sm border border-yellow-200/50 rounded-2xl p-6 text-center">
                  <p className="text-sm text-yellow-700">
                    No hay fechas de entrega disponibles para las necesidades actuales
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {groupRequirementsByDelivery.map((group, index) => {
                    const isSelected = selectedDeliveryGroup?.deliveryDateStr === group.deliveryDateStr
                    const dayName = getDayName(group.deliveryDate.getDay())
                    const dayNumber = group.deliveryDate.getDate()

                    return (
                      <button
                        key={group.deliveryDateStr}
                        onClick={() => setSelectedDeliveryGroup(group)}
                        className={cn(
                          "group relative flex items-start gap-5 p-6 rounded-2xl border-2 transition-all duration-200 text-left",
                          "hover:shadow-lg hover:shadow-blue-500/10 hover:scale-[1.01] active:scale-[0.99]",
                          isSelected
                            ? "bg-blue-500/10 border-blue-500 shadow-md shadow-blue-500/20"
                            : "bg-white/70 backdrop-blur-md border-gray-200/50 hover:border-blue-300"
                        )}
                      >
                        {/* Date Badge */}
                        <div className={cn(
                          "flex flex-col items-center justify-center w-20 h-20 rounded-2xl transition-all duration-200 flex-shrink-0",
                          isSelected ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-gray-100 text-gray-900"
                        )}>
                          <div className="text-sm font-medium">{dayName}</div>
                          <div className="text-3xl font-bold leading-none">{dayNumber}</div>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-semibold text-gray-900">
                              {group.totalQuantity.toFixed(2)}
                            </span>
                            <span className="text-sm text-gray-500">
                              {availableDates[0]?.material_unit}
                            </span>
                          </div>

                          <div className="text-sm text-gray-600">
                            Cubre {group.requirements.length} fecha{group.requirements.length > 1 ? 's' : ''} de necesidad
                          </div>

                          {/* Requirement dates covered */}
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {group.requirements.map(req => (
                              <div
                                key={req.date}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                                  isSelected
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-600"
                                )}
                              >
                                {new Date(req.date).toLocaleDateString('es-CO', {
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Checkmark */}
                        {isSelected && (
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white flex-shrink-0">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Quantity Confirmation */}
          {selectedDeliveryGroup && selectedOption && (
            <div className={cn(
              "space-y-4 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4"
            )}>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white text-sm font-semibold">
                  3
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Cantidad a Pedir</h3>
              </div>

              <div className="bg-gradient-to-br from-blue-50/50 to-white/50 backdrop-blur-md border border-blue-200/50 rounded-2xl p-6 space-y-4">
                {/* Large quantity display */}
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">
                      {selectedDeliveryGroup.totalQuantity.toFixed(2)}
                    </span>
                    <span className="text-xl text-gray-500">
                      {availableDates[0]?.material_unit}
                    </span>
                  </div>
                  <div className="text-base text-blue-600 font-medium mt-2">
                    Sugerido: {selectedDeliveryGroup.totalQuantity.toFixed(2)} {availableDates[0]?.material_unit}
                  </div>
                </div>

                {/* Explanation */}
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Calculado para cubrir demanda hasta la siguiente entrega disponible de este proveedor.
                  </p>
                </div>

                {/* Cost estimate */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200/50">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Precio Unitario</div>
                    <div className="text-lg font-semibold text-gray-900 mt-1">
                      ${selectedOption.materialSupplier.unit_price.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Total Estimado</div>
                    <div className="text-lg font-semibold text-green-600 mt-1">
                      ${(selectedDeliveryGroup.totalQuantity * selectedOption.materialSupplier.unit_price).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-gray-200/50 px-8 py-6 rounded-b-3xl flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-6 py-6 rounded-xl transition-all duration-150"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !isFormComplete}
            className={cn(
              "px-8 py-6 rounded-xl text-base font-semibold transition-all duration-200 shadow-lg",
              isFormComplete
                ? "bg-blue-500 text-white hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            {loading ? "Creando..." : "Confirmar Orden"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
