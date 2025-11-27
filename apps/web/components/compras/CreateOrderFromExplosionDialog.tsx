"use client"

import { useState, useEffect } from "react"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { X, AlertCircle } from "lucide-react"
import { useSuppliers } from "@/hooks/use-suppliers"
import { usePurchaseOrders } from "@/hooks/use-purchase-orders"
import { useMaterialSuppliers } from "@/hooks/use-material-suppliers"
import { useMaterialExplosion } from "@/hooks/use-material-explosion"
import { useToast } from "@/components/ui/use-toast"
import { Database } from "@/lib/database.types"

type Supplier = Database['compras']['Tables']['suppliers']['Row']
type MaterialSupplier = Database['compras']['Tables']['material_suppliers']['Row']

type CreateOrderFromExplosionDialogProps = {
  isOpen: boolean
  onClose: () => void
  materialId: string
  materialName: string
  requirementDate: string
  quantityNeeded: number
  onOrderCreated?: () => void
}

interface SupplierOption {
  supplier: Supplier
  materialSupplier: MaterialSupplier
  nextDeliveryDate: string
  deliveryDays: string
}

export function CreateOrderFromExplosionDialog({
  isOpen,
  onClose,
  materialId,
  materialName,
  requirementDate,
  quantityNeeded,
  onOrderCreated
}: CreateOrderFromExplosionDialogProps) {
  const { suppliers } = useSuppliers()
  const { materialSuppliers } = useMaterialSuppliers()
  const { createOrderFromExplosion } = usePurchaseOrders()
  const { createOrUpdateTracking } = useMaterialExplosion()
  const { toast } = useToast()

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("")
  const [quantity, setQuantity] = useState<number>(quantityNeeded)
  const [loading, setLoading] = useState(false)
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([])

  // Parse delivery days from JSON or string format
  const parseDeliveryDays = (deliveryDaysData: any): number[] => {
    if (!deliveryDaysData) return []

    // If it's a JSON object with day properties
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

    // If it's a comma-separated string
    if (typeof deliveryDaysData === 'string') {
      return deliveryDaysData.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d))
    }

    // If it's already an array
    if (Array.isArray(deliveryDaysData)) {
      return deliveryDaysData
    }

    return []
  }

  // Calculate next delivery date for a supplier based on delivery_days
  const calculateNextDeliveryDate = (supplier: Supplier, beforeDate: string): string => {
    if (!supplier.delivery_days) return beforeDate

    const deliveryDays = parseDeliveryDays(supplier.delivery_days)
    if (deliveryDays.length === 0) return beforeDate

    const targetDate = new Date(beforeDate)
    const today = new Date()

    // Start checking from today
    let checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() + 1)

    // Look forward up to 30 days to find a matching delivery day
    for (let i = 0; i < 30; i++) {
      const dayOfWeek = checkDate.getDay() // 0 = Sunday, 1 = Monday, etc.
      if (deliveryDays.includes(dayOfWeek)) {
        if (checkDate <= targetDate) {
          return checkDate.toISOString().split('T')[0]
        }
      }
      checkDate.setDate(checkDate.getDate() + 1)
    }

    return beforeDate
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

  // Load available suppliers for this material
  useEffect(() => {
    if (!isOpen) return

    const availableMS = materialSuppliers.filter(
      ms => ms.material_id === materialId && ms.status === 'active'
    )

    const options: SupplierOption[] = availableMS
      .map(ms => {
        const supplier = suppliers.find(s => s.id === ms.supplier_id)
        if (!supplier) return null

        const nextDeliveryDate = calculateNextDeliveryDate(supplier, requirementDate)
        const deliveryDaysStr = formatDeliveryDaysDisplay(supplier.delivery_days)

        return {
          supplier,
          materialSupplier: ms,
          nextDeliveryDate,
          deliveryDays: deliveryDaysStr
        }
      })
      .filter((opt): opt is SupplierOption => opt !== null)
      .sort((a, b) => a.nextDeliveryDate.localeCompare(b.nextDeliveryDate))

    setSupplierOptions(options)

    // Auto-select first option
    if (options.length > 0) {
      setSelectedSupplierId(options[0].supplier.id)
    }
  }, [isOpen, materialId, materialSuppliers, suppliers, requirementDate])

  const handleSubmit = async () => {
    if (!selectedSupplierId) {
      toast.error("Selecciona un proveedor")
      return
    }

    if (quantity <= 0) {
      toast.error("La cantidad debe ser mayor a 0")
      return
    }

    setLoading(true)

    try {
      const selectedOption = supplierOptions.find(opt => opt.supplier.id === selectedSupplierId)
      if (!selectedOption) throw new Error('Proveedor no encontrado')

      // Create purchase order
      const { orderId, error } = await createOrderFromExplosion(
        selectedSupplierId,
        selectedOption.nextDeliveryDate,
        [
          {
            material_id: materialId,
            quantity,
            unitPrice: selectedOption.materialSupplier.unit_price
          }
        ]
      )

      if (error) {
        throw new Error(error)
      }

      // Update tracking status to 'ordered'
      // Note: tracking is based on requirement date (not delivery date)
      try {
        await createOrUpdateTracking(materialId, requirementDate, quantity, orderId || undefined)
      } catch (trackingErr) {
        console.error('Error updating tracking:', trackingErr)
        // Continue even if tracking fails
      }

      toast.success(`Orden de compra creada: ${quantity} ${materialName}`)
      onOrderCreated?.()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear orden'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const selectedOption = supplierOptions.find(opt => opt.supplier.id === selectedSupplierId)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Orden de Compra</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Material Info */}
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-sm text-gray-600">Material</div>
            <div className="font-semibold">{materialName}</div>
            <div className="text-xs text-gray-500 mt-1">
              Necesario para: {new Date(requirementDate).toLocaleDateString('es-CO')}
            </div>
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
          </div>

          {/* Supplier Details */}
          {selectedOption && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="text-blue-900 font-medium">
                    Próxima entrega: {new Date(selectedOption.nextDeliveryDate).toLocaleDateString('es-CO')}
                  </div>
                  <div className="text-blue-800 text-xs mt-1">
                    Días: {selectedOption.deliveryDays}
                  </div>
                  <div className="text-blue-800 text-xs">
                    Precio unitario: ${selectedOption.materialSupplier.unit_price.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad a Pedir *</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              placeholder="0"
              min="0"
              step="0.01"
            />
            <div className="text-xs text-gray-500">
              Cantidad necesaria: {quantityNeeded}
            </div>
          </div>

          {/* Total Cost Preview */}
          {selectedOption && quantity > 0 && (
            <div className="bg-gray-50 p-2 rounded text-sm">
              <div className="flex justify-between">
                <span>Total estimado:</span>
                <span className="font-semibold">
                  ${(quantity * selectedOption.materialSupplier.unit_price).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedSupplierId}>
            {loading ? "Creando..." : "Crear Orden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
