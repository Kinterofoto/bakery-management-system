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
  const [selectedDeliveryGroups, setSelectedDeliveryGroups] = useState<DeliveryGroup[]>([])
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
    // Logic: Delivery on date X covers requirements FROM date X UNTIL next delivery
    for (let i = 0; i < deliveryDates.length; i++) {
      const deliveryDate = deliveryDates[i]
      const nextDeliveryDate = deliveryDates[i + 1] || null

      // Get requirements that should be ordered in THIS delivery
      // (everything needed from this delivery date until next delivery)
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

  // Toggle delivery group selection
  const toggleDeliveryGroup = (group: DeliveryGroup) => {
    setSelectedDeliveryGroups(prev => {
      const isSelected = prev.some(g => g.deliveryDateStr === group.deliveryDateStr)
      if (isSelected) {
        return prev.filter(g => g.deliveryDateStr !== group.deliveryDateStr)
      } else {
        return [...prev, group]
      }
    })
  }

  // Load supplier options when dialog opens
  useEffect(() => {
    if (!isOpen) {
      setSelectedSupplierId("")
      setSelectedDeliveryGroups([])
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

    if (selectedDeliveryGroups.length === 0) {
      toast({ title: "Error", description: "Selecciona al menos una fecha de entrega", variant: "destructive" })
      return
    }

    setLoading(true)

    try {
      const selectedOption = supplierOptions.find(opt => opt.supplier.id === selectedSupplierId)
      if (!selectedOption) throw new Error('Proveedor no encontrado')

      let successCount = 0
      let totalRequirements = 0

      // Create one purchase order for each selected delivery group
      for (const group of selectedDeliveryGroups) {
        // Prepare items for this order
        const items = [{
          material_id: materialId,
          quantity: group.totalQuantity,
          unitPrice: selectedOption.materialSupplier.unit_price
        }]

        // Create purchase order for this delivery date
        const { orderId, error } = await createOrderFromExplosion(
          selectedSupplierId,
          group.deliveryDateStr,
          items
        )

        if (error) {
          console.error(`Error creating order for ${group.deliveryDateStr}:`, error)
          continue
        }

        // Update tracking for each requirement date in this group
        for (const requirement of group.requirements) {
          try {
            await createOrUpdateTracking(
              materialId,
              requirement.date,
              requirement.quantity_needed,
              orderId || undefined
            )
            totalRequirements++
          } catch (trackingErr) {
            console.error('Error updating tracking:', trackingErr)
          }
        }

        successCount++
      }

      toast({
        title: "Éxito",
        description: `${successCount} orden(es) de compra creadas cubriendo ${totalRequirements} fecha(s) de necesidad`
      })
      onOrderCreated?.()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear órdenes'
      toast({ title: "Error", description: message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const selectedOption = supplierOptions.find(opt => opt.supplier.id === selectedSupplierId)

  // Check if form is complete
  const isFormComplete = selectedSupplierId && selectedDeliveryGroups.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white backdrop-blur-3xl border-0 shadow-2xl rounded-3xl p-0">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200/50 px-6 py-4 rounded-t-3xl shadow-sm">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900">Nueva Orden</h2>
          <p className="text-sm text-gray-500 mt-0.5">Planificando compra para {materialName}</p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Step 1: Supplier Selection */}
          <div className={cn(
            "space-y-3 transition-all duration-300",
            selectedSupplierId ? "opacity-100" : "opacity-100"
          )}>
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition-all duration-200",
                selectedSupplierId
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-600"
              )}>
                1
              </div>
              <h3 className="text-base font-semibold text-gray-900">Elige Proveedor</h3>
            </div>

            {supplierOptions.length === 0 ? (
              <div className="bg-red-50/50 backdrop-blur-sm border border-red-200/50 rounded-xl p-4 text-center">
                <p className="text-sm text-red-600">
                  No hay proveedores activos configurados para este material
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                {supplierOptions.map(option => {
                  const isSelected = selectedSupplierId === option.supplier.id
                  return (
                    <button
                      key={option.supplier.id}
                      onClick={() => {
                        setSelectedSupplierId(option.supplier.id)
                        setSelectedDeliveryGroups([]) // Reset delivery selections
                      }}
                      className={cn(
                        "group relative flex items-center gap-3 p-3 rounded-2xl border-2 transition-all duration-200 text-left",
                        "hover:shadow-md hover:shadow-blue-500/10 hover:scale-[1.01] active:scale-[0.99]",
                        isSelected
                          ? "bg-blue-500/10 border-blue-500 shadow-sm shadow-blue-500/20"
                          : "bg-white/60 backdrop-blur-xl border-gray-200/50 hover:border-blue-300"
                      )}
                    >
                      {/* Icon */}
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200",
                        isSelected ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500"
                      )}>
                        <Truck className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm truncate">
                          {option.supplier.company_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Frecuencia: {option.deliveryDays}
                        </div>
                      </div>

                      {/* Checkmark */}
                      {isSelected && (
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white">
                          <Check className="w-3 h-3" />
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
              "space-y-3 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4"
            )}>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition-all duration-200",
                  selectedDeliveryGroups.length > 0
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-600"
                )}>
                  2
                </div>
                <h3 className="text-base font-semibold text-gray-900">Fechas de Entrega</h3>
                {selectedDeliveryGroups.length > 0 && (
                  <span className="text-xs text-gray-500">({selectedDeliveryGroups.length} seleccionada{selectedDeliveryGroups.length > 1 ? 's' : ''})</span>
                )}
              </div>

              {groupRequirementsByDelivery.length === 0 ? (
                <div className="bg-yellow-50/50 backdrop-blur-sm border border-yellow-200/50 rounded-xl p-4 text-center">
                  <p className="text-sm text-yellow-700">
                    No hay fechas de entrega disponibles para las necesidades actuales
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {groupRequirementsByDelivery.map((group, index) => {
                    const isSelected = selectedDeliveryGroups.some(g => g.deliveryDateStr === group.deliveryDateStr)
                    const dayName = getDayName(group.deliveryDate.getDay())
                    const dayNumber = group.deliveryDate.getDate()

                    return (
                      <button
                        key={group.deliveryDateStr}
                        onClick={() => toggleDeliveryGroup(group)}
                        className={cn(
                          "group relative flex items-start gap-2.5 p-3 rounded-2xl border-2 transition-all duration-200 text-left",
                          "hover:shadow-md hover:shadow-blue-500/10 hover:scale-[1.01] active:scale-[0.99]",
                          isSelected
                            ? "bg-blue-500/10 border-blue-500 shadow-sm shadow-blue-500/20"
                            : "bg-white/60 backdrop-blur-xl border-gray-200/50 hover:border-blue-300"
                        )}
                      >
                        {/* Date Badge */}
                        <div className={cn(
                          "flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 flex-shrink-0",
                          isSelected ? "bg-blue-500 text-white shadow-md shadow-blue-500/30" : "bg-gray-100 text-gray-900"
                        )}>
                          <div className="text-xs font-medium">{dayName}</div>
                          <div className="text-xl font-bold leading-none">{dayNumber}</div>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {/* Delivery date header */}
                          <div className="flex items-center gap-1.5">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Entrega:
                            </div>
                            <div className="text-sm font-bold text-blue-600">
                              {group.deliveryDate.toLocaleDateString('es-CO', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short'
                              })}
                            </div>
                          </div>

                          {/* Quantity */}
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-lg font-semibold text-gray-900">
                              {group.totalQuantity.toFixed(2)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {availableDates[0]?.material_unit}
                            </span>
                          </div>

                          <div className="text-xs text-gray-600">
                            Cubre desde esta entrega hasta la próxima
                          </div>

                          {/* Requirement dates covered */}
                          <div className="space-y-1 pt-1.5 border-t border-gray-200/50">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Fechas de necesidad ({group.requirements.length}):
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {group.requirements.map(req => (
                                <div
                                  key={req.date}
                                  className={cn(
                                    "px-2 py-0.5 rounded-md text-xs font-medium transition-all duration-150",
                                    isSelected
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-gray-100 text-gray-600"
                                  )}
                                >
                                  {new Date(req.date).toLocaleDateString('es-CO', {
                                    day: 'numeric',
                                    month: 'short'
                                  })} · {req.quantity_needed.toFixed(1)} {req.material_unit}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Checkmark */}
                        {isSelected && (
                          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white flex-shrink-0">
                            <Check className="w-3 h-3" />
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
          {selectedDeliveryGroups.length > 0 && selectedOption && (
            <div className={cn(
              "space-y-3 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4"
            )}>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-semibold">
                  3
                </div>
                <h3 className="text-base font-semibold text-gray-900">Resumen de Órdenes</h3>
              </div>

              <div className="bg-gradient-to-br from-blue-50/50 to-white/50 backdrop-blur-xl border border-blue-200/50 rounded-2xl p-4 space-y-3">
                {/* Summary */}
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-700">
                    Se crearán {selectedDeliveryGroups.length} orden(es) de compra:
                  </div>

                  {selectedDeliveryGroups.map((group, idx) => (
                    <div key={group.deliveryDateStr} className="bg-white/60 backdrop-blur-sm rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-900">
                          Orden #{idx + 1} - Entrega {new Date(group.deliveryDateStr).toLocaleDateString('es-CO', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </div>
                        <div className="text-sm font-semibold text-gray-900">
                          {group.totalQuantity.toFixed(2)} {availableDates[0]?.material_unit}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">
                        Cubre {group.requirements.length} fecha{group.requirements.length > 1 ? 's' : ''} de necesidad
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200/50">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Cantidad Total</div>
                    <div className="text-base font-semibold text-gray-900 mt-1">
                      {selectedDeliveryGroups.reduce((sum, g) => sum + g.totalQuantity, 0).toFixed(2)} {availableDates[0]?.material_unit}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Costo Total Estimado</div>
                    <div className="text-base font-semibold text-green-600 mt-1">
                      ${(selectedDeliveryGroups.reduce((sum, g) => sum + g.totalQuantity, 0) * selectedOption.materialSupplier.unit_price).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-40 bg-white border-t border-gray-200/50 px-6 py-4 rounded-b-3xl flex items-center justify-between gap-3 shadow-sm">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-lg transition-all duration-150"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !isFormComplete}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 shadow-md",
              isFormComplete
                ? "bg-blue-500 text-white hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            {loading ? "Creando..." : `Confirmar ${selectedDeliveryGroups.length > 0 ? selectedDeliveryGroups.length : ''} Orden${selectedDeliveryGroups.length > 1 ? 'es' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
