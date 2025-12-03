"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, X } from "lucide-react"
import { useMaterialWaste } from "@/hooks/use-inventory-movements"
import { toast } from "sonner"

interface InventoryItem {
  product_id: string
  product_name: string
  product_code: string
  location_id: string
  location_name: string
  quantity_on_hand: number
  unit_of_measure: string
}

interface WasteItem {
  product_id: string
  location_id: string
  quantity: number
  waste_reason: string
}

interface BajasModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inventory: InventoryItem[]
  onSuccess: () => void
}

const WASTE_REASONS = [
  "Producto vencido o en mal estado",
  "Daño durante almacenamiento",
  "Obsolescencia o discontinuado",
  "Contaminación o deterioro",
  "Ajuste por inventario físico"
]

export function BajasModal({ open, onOpenChange, inventory, onSuccess }: BajasModalProps) {
  const { registerWaste } = useMaterialWaste()
  const [loading, setLoading] = useState(false)
  const [wasteItems, setWasteItems] = useState<WasteItem[]>([
    { product_id: "", location_id: "", quantity: 0, waste_reason: "" }
  ])

  const handleItemChange = (index: number, field: keyof WasteItem, value: any) => {
    const newItems = [...wasteItems]
    newItems[index] = { ...newItems[index], [field]: value }

    // Auto-populate location_id when product is selected
    if (field === 'product_id' && value) {
      const item = inventory.find(i => i.product_id === value)
      if (item) {
        newItems[index].location_id = item.location_id
      }
    }

    setWasteItems(newItems)
  }

  const addItem = () => {
    setWasteItems([...wasteItems, { product_id: "", location_id: "", quantity: 0, waste_reason: "" }])
  }

  const removeItem = (index: number) => {
    if (wasteItems.length > 1) {
      setWasteItems(wasteItems.filter((_, i) => i !== index))
    }
  }

  const getAvailableQuantity = (productId: string, locationId: string): number => {
    const item = inventory.find(i => i.product_id === productId && i.location_id === locationId)
    return item?.quantity_on_hand || 0
  }

  const getProductInfo = (productId: string) => {
    return inventory.find(i => i.product_id === productId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (wasteItems.length === 0 || wasteItems.some(item => !item.product_id || item.quantity <= 0 || !item.waste_reason)) {
      toast.error("Debes agregar al menos un producto con cantidad y razón válidas")
      return
    }

    // Validate quantities
    for (const item of wasteItems) {
      const available = getAvailableQuantity(item.product_id, item.location_id)
      if (item.quantity > available) {
        const productInfo = getProductInfo(item.product_id)
        toast.error(`Cantidad insuficiente para ${productInfo?.product_name}. Disponible: ${available}`)
        return
      }
    }

    try {
      setLoading(true)

      // Register each waste item
      for (const item of wasteItems) {
        await registerWaste({
          productId: item.product_id,
          quantity: item.quantity,
          locationId: item.location_id,
          wasteReason: item.waste_reason,
          referenceId: null
        })
      }

      toast.success("Bajas registradas exitosamente")
      setWasteItems([{ product_id: "", location_id: "", quantity: 0, waste_reason: "" }])
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Error registering waste:', error)
      toast.error("Error al registrar las bajas")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setWasteItems([{ product_id: "", location_id: "", quantity: 0, waste_reason: "" }])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            Registrar Bajas de Inventario
          </DialogTitle>
          <DialogDescription>
            Registra desperdicios, daños o bajas de materiales en bodega
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Items List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Productos a dar de baja</h3>
              <Button
                type="button"
                onClick={addItem}
                variant="outline"
                size="sm"
                disabled={inventory.length === 0}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Producto
              </Button>
            </div>

            {inventory.length === 0 && (
              <p className="text-sm text-orange-600 dark:text-orange-400">
                No hay productos disponibles en bodega
              </p>
            )}

            <div className="space-y-3">
              {wasteItems.map((item, index) => {
                const productInfo = getProductInfo(item.product_id)
                const available = getAvailableQuantity(item.product_id, item.location_id)

                return (
                  <div
                    key={index}
                    className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      {/* Product */}
                      <div className="md:col-span-5">
                        <Label className="text-xs text-gray-600 dark:text-gray-400">Producto *</Label>
                        <Select
                          value={item.product_id}
                          onValueChange={(value) => handleItemChange(index, 'product_id', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Seleccionar producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {inventory.map((inv) => (
                              <SelectItem key={`${inv.product_id}-${inv.location_id}`} value={inv.product_id}>
                                {inv.product_name} ({inv.location_name})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quantity */}
                      <div className="md:col-span-2">
                        <Label className="text-xs text-gray-600 dark:text-gray-400">Cantidad *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={available}
                          value={item.quantity || ''}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="mt-1"
                        />
                        {productInfo && (
                          <p className="text-xs text-gray-500 mt-1">
                            Disponible: {available.toFixed(2)} {productInfo.unit_of_measure}
                          </p>
                        )}
                      </div>

                      {/* Waste Reason */}
                      <div className="md:col-span-4">
                        <Label className="text-xs text-gray-600 dark:text-gray-400">Razón *</Label>
                        <Select
                          value={item.waste_reason}
                          onValueChange={(value) => handleItemChange(index, 'waste_reason', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Seleccionar razón" />
                          </SelectTrigger>
                          <SelectContent>
                            {WASTE_REASONS.map((reason) => (
                              <SelectItem key={reason} value={reason}>
                                {reason}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Remove Button */}
                      <div className="md:col-span-1 flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeItem(index)}
                          disabled={wasteItems.length === 1}
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? "Registrando..." : "Registrar Bajas"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
