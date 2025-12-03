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
      <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto bg-white/90 dark:bg-black/85 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3 text-2xl font-semibold">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 dark:bg-red-500/20 backdrop-blur-sm border border-red-500/20 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-500" />
            </div>
            Registrar Bajas de Inventario
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600 dark:text-gray-400">
            Registra desperdicios, daños o bajas de materiales en bodega
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Items List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Productos a dar de baja
              </h3>
              <button
                type="button"
                onClick={addItem}
                disabled={inventory.length === 0}
                className="
                  bg-white/50 dark:bg-black/30
                  backdrop-blur-md
                  border border-white/30 dark:border-white/20
                  text-gray-900 dark:text-white
                  font-semibold
                  px-4 py-2
                  rounded-xl
                  shadow-sm shadow-black/5
                  hover:bg-white/70 dark:hover:bg-black/40
                  hover:shadow-md hover:shadow-black/10
                  active:scale-95
                  disabled:opacity-40
                  disabled:cursor-not-allowed
                  disabled:hover:scale-100
                  transition-all duration-150
                  flex items-center gap-2
                "
              >
                <Plus className="w-4 h-4" />
                Agregar Producto
              </button>
            </div>

            {inventory.length === 0 && (
              <div className="bg-orange-500/10 dark:bg-orange-500/15 backdrop-blur-sm border border-orange-500/20 rounded-xl p-4">
                <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">
                  No hay productos disponibles en bodega
                </p>
              </div>
            )}

            <div className="space-y-4">
              {wasteItems.map((item, index) => {
                const productInfo = getProductInfo(item.product_id)
                const available = getAvailableQuantity(item.product_id, item.location_id)

                return (
                  <div
                    key={index}
                    className="
                      bg-white/50 dark:bg-black/30
                      backdrop-blur-xl
                      border border-white/30 dark:border-white/10
                      rounded-2xl
                      p-6
                      shadow-lg shadow-black/5
                      hover:shadow-xl hover:shadow-black/10
                      transition-all duration-200
                      space-y-4
                    "
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Product */}
                      <div className="md:col-span-5 space-y-2">
                        <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                          Producto *
                        </Label>
                        <Select
                          value={item.product_id}
                          onValueChange={(value) => handleItemChange(index, 'product_id', value)}
                        >
                          <SelectTrigger className="
                            w-full
                            bg-white/60 dark:bg-black/40
                            backdrop-blur-md
                            border border-gray-200/50 dark:border-white/10
                            rounded-xl
                            px-4 py-3
                            text-base
                            focus:outline-none
                            focus:ring-2 focus:ring-red-500/50
                            focus:border-red-500/50
                            transition-all duration-200
                          ">
                            <SelectValue placeholder="Seleccionar producto" />
                          </SelectTrigger>
                          <SelectContent className="bg-white/95 dark:bg-black/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-xl shadow-2xl">
                            {inventory.map((inv) => (
                              <SelectItem
                                key={`${inv.product_id}-${inv.location_id}`}
                                value={inv.product_id}
                                className="hover:bg-gray-100/50 dark:hover:bg-white/5 rounded-lg transition-colors duration-150"
                              >
                                {inv.product_name} ({inv.location_name})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quantity */}
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                          Cantidad *
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={available}
                          value={item.quantity || ''}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="
                            w-full
                            bg-white/60 dark:bg-black/40
                            backdrop-blur-md
                            border border-gray-200/50 dark:border-white/10
                            rounded-xl
                            px-4 py-3
                            text-base
                            placeholder:text-gray-400 dark:placeholder:text-gray-500
                            focus:outline-none
                            focus:ring-2 focus:ring-red-500/50
                            focus:border-red-500/50
                            transition-all duration-200
                          "
                        />
                        {productInfo && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            Disponible: {available.toFixed(2)} {productInfo.unit_of_measure}
                          </p>
                        )}
                      </div>

                      {/* Waste Reason */}
                      <div className="md:col-span-4 space-y-2">
                        <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                          Razón *
                        </Label>
                        <Select
                          value={item.waste_reason}
                          onValueChange={(value) => handleItemChange(index, 'waste_reason', value)}
                        >
                          <SelectTrigger className="
                            w-full
                            bg-white/60 dark:bg-black/40
                            backdrop-blur-md
                            border border-gray-200/50 dark:border-white/10
                            rounded-xl
                            px-4 py-3
                            text-base
                            focus:outline-none
                            focus:ring-2 focus:ring-red-500/50
                            focus:border-red-500/50
                            transition-all duration-200
                          ">
                            <SelectValue placeholder="Seleccionar razón" />
                          </SelectTrigger>
                          <SelectContent className="bg-white/95 dark:bg-black/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-xl shadow-2xl">
                            {WASTE_REASONS.map((reason) => (
                              <SelectItem
                                key={reason}
                                value={reason}
                                className="hover:bg-gray-100/50 dark:hover:bg-white/5 rounded-lg transition-colors duration-150"
                              >
                                {reason}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Remove Button */}
                      <div className="md:col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={wasteItems.length === 1}
                          className="
                            w-full min-h-[48px]
                            bg-red-500/10 dark:bg-red-500/15
                            backdrop-blur-sm
                            border border-red-500/20
                            text-red-600 dark:text-red-500
                            rounded-xl
                            hover:bg-red-500/20 dark:hover:bg-red-500/25
                            hover:border-red-500/30
                            active:scale-95
                            disabled:opacity-40
                            disabled:cursor-not-allowed
                            disabled:hover:scale-100
                            transition-all duration-150
                            flex items-center justify-center
                          "
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <DialogFooter className="gap-3 pt-4 border-t border-gray-200/30 dark:border-white/10">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="
                bg-white/50 dark:bg-black/30
                backdrop-blur-md
                border border-white/30 dark:border-white/20
                text-gray-900 dark:text-white
                font-semibold
                px-6 py-3
                rounded-xl
                shadow-sm shadow-black/5
                hover:bg-white/70 dark:hover:bg-black/40
                hover:shadow-md hover:shadow-black/10
                active:scale-95
                disabled:opacity-40
                disabled:cursor-not-allowed
                disabled:hover:scale-100
                transition-all duration-150
              "
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="
                bg-red-500
                text-white
                font-semibold
                px-6 py-3
                rounded-xl
                shadow-md shadow-red-500/30
                hover:bg-red-600
                hover:shadow-lg hover:shadow-red-500/40
                active:scale-95
                disabled:opacity-60
                disabled:cursor-not-allowed
                disabled:hover:scale-100
                transition-all duration-150
              "
            >
              {loading ? "Registrando..." : "Registrar Bajas"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
