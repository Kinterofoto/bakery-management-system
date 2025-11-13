"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X, Plus, Trash2 } from "lucide-react"
import { useSuppliers } from "@/hooks/use-suppliers"
import { usePurchaseOrders } from "@/hooks/use-purchase-orders"
import { useRawMaterials } from "@/hooks/use-raw-materials"
import { useMaterialSuppliers } from "@/hooks/use-material-suppliers"
import { useToast } from "@/components/ui/use-toast"

type PurchaseOrderDialogProps = {
  onClose: () => void
}

type OrderItem = {
  material_id: string
  material_supplier_id?: string
  quantity_ordered: number
  unit_price: number
  notes?: string
}

export function PurchaseOrderDialog({ onClose }: PurchaseOrderDialogProps) {
  const { suppliers } = useSuppliers()
  const { materials } = useRawMaterials()
  const { materialSuppliers, getBestPriceForMaterial } = useMaterialSuppliers()
  const { createPurchaseOrder } = usePurchaseOrders()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    supplier_id: "",
    expected_delivery_date: "",
    notes: ""
  })

  const [items, setItems] = useState<OrderItem[]>([
    { material_id: "", quantity_ordered: 0, unit_price: 0 }
  ])

  const [loading, setLoading] = useState(false)

  // Filter materials available from selected supplier
  const getAvailableMaterials = () => {
    if (!formData.supplier_id) return []

    const supplierMaterials = materialSuppliers.filter(
      ms => ms.supplier_id === formData.supplier_id && ms.status === 'active'
    )

    return materials.filter(material =>
      supplierMaterials.some(ms => ms.material_id === material.id)
    )
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSupplierChange = (supplierId: string) => {
    setFormData(prev => ({ ...prev, supplier_id: supplierId }))
    // Reset items when supplier changes
    setItems([{ material_id: "", quantity_ordered: 0, unit_price: 0 }])
  }

  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Auto-fill price when material is selected
    if (field === 'material_id' && value) {
      const bestPrice = getBestPriceForMaterial(value, formData.supplier_id)
      if (bestPrice) {
        newItems[index].unit_price = bestPrice.unit_price
        newItems[index].material_supplier_id = bestPrice.id
      }
    }

    setItems(newItems)
  }

  const addItem = () => {
    setItems([...items, { material_id: "", quantity_ordered: 0, unit_price: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_price), 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate
      if (!formData.supplier_id) {
        toast({
          title: "Error de validación",
          description: "Debes seleccionar un proveedor",
          variant: "destructive"
        })
        setLoading(false)
        return
      }

      if (items.length === 0 || items.some(item => !item.material_id || item.quantity_ordered <= 0)) {
        toast({
          title: "Error de validación",
          description: "Debes agregar al menos un material con cantidad válida",
          variant: "destructive"
        })
        setLoading(false)
        return
      }

      const orderData = {
        supplier_id: formData.supplier_id,
        expected_delivery_date: formData.expected_delivery_date || undefined,
        notes: formData.notes || undefined,
        items: items.filter(item => item.material_id && item.quantity_ordered > 0)
      }

      const newOrder = await createPurchaseOrder(orderData)

      if (newOrder) {
        toast({
          title: "Orden creada",
          description: `Orden ${newOrder.order_number} creada exitosamente`,
        })
        onClose()
      } else {
        toast({
          title: "Error",
          description: "No se pudo crear la orden de compra",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al crear la orden",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const availableMaterials = getAvailableMaterials()

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="
        bg-white/90 dark:bg-black/80
        backdrop-blur-2xl
        border border-white/30 dark:border-white/15
        rounded-3xl
        shadow-2xl shadow-black/20
        max-w-4xl
        w-full
        max-h-[90vh]
        overflow-hidden
      ">
        {/* Header */}
        <div className="
          bg-green-500
          px-6 py-4
          flex items-center justify-between
        ">
          <h2 className="text-xl font-semibold text-white">
            Nueva Orden de Compra
          </h2>
          <button
            onClick={onClose}
            className="
              text-white
              hover:bg-white/20
              rounded-lg
              p-2
              transition-colors
            "
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">

          {/* Supplier Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información del Proveedor</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier_id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Proveedor *
                </Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={handleSupplierChange}
                >
                  <SelectTrigger className="
                    mt-1.5
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border-gray-200/50 dark:border-white/10
                    rounded-xl
                  ">
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.filter(s => s.status === 'active').map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expected_delivery_date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fecha de Entrega Esperada
                </Label>
                <Input
                  id="expected_delivery_date"
                  name="expected_delivery_date"
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={handleChange}
                  className="
                    mt-1.5
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border-gray-200/50 dark:border-white/10
                    rounded-xl
                    focus:ring-2 focus:ring-green-500/50
                    focus:border-green-500/50
                  "
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Materiales</h3>
              <Button
                type="button"
                onClick={addItem}
                disabled={!formData.supplier_id}
                className="
                  bg-green-500
                  text-white
                  font-semibold
                  px-4
                  py-2
                  rounded-xl
                  shadow-md shadow-green-500/30
                  hover:bg-green-600
                  hover:shadow-lg hover:shadow-green-500/40
                  active:scale-95
                  transition-all duration-150
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                "
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Material
              </Button>
            </div>

            {!formData.supplier_id && (
              <p className="text-sm text-orange-600 dark:text-orange-400">
                Selecciona un proveedor para agregar materiales
              </p>
            )}

            {formData.supplier_id && availableMaterials.length === 0 && (
              <p className="text-sm text-orange-600 dark:text-orange-400">
                Este proveedor no tiene materiales asignados. Ve a Parametrización para asignar materiales.
              </p>
            )}

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border border-white/30 dark:border-white/15
                    rounded-xl
                    p-4
                  "
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-5">
                      <Label className="text-xs text-gray-600 dark:text-gray-400">Material</Label>
                      <Select
                        value={item.material_id}
                        onValueChange={(value) => handleItemChange(index, 'material_id', value)}
                      >
                        <SelectTrigger className="
                          mt-1
                          bg-white/50 dark:bg-black/30
                          backdrop-blur-md
                          border-gray-200/50 dark:border-white/10
                          rounded-lg
                        ">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableMaterials.map((material) => (
                            <SelectItem key={material.id} value={material.id}>
                              {material.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-2">
                      <Label className="text-xs text-gray-600 dark:text-gray-400">Cantidad</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.quantity_ordered}
                        onChange={(e) => handleItemChange(index, 'quantity_ordered', parseFloat(e.target.value) || 0)}
                        className="
                          mt-1
                          bg-white/50 dark:bg-black/30
                          backdrop-blur-md
                          border-gray-200/50 dark:border-white/10
                          rounded-lg
                        "
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label className="text-xs text-gray-600 dark:text-gray-400">Precio Unit.</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="
                          mt-1
                          bg-white/50 dark:bg-black/30
                          backdrop-blur-md
                          border-gray-200/50 dark:border-white/10
                          rounded-lg
                        "
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label className="text-xs text-gray-600 dark:text-gray-400">Subtotal</Label>
                      <div className="mt-1 p-2 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg text-sm font-semibold text-gray-900 dark:text-white">
                        ${(item.quantity_ordered * item.unit_price).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                      </div>
                    </div>

                    <div className="md:col-span-1 flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="
                          w-full
                          bg-red-500/10
                          hover:bg-red-500/20
                          text-red-600
                          rounded-lg
                          disabled:opacity-30
                        "
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="
            bg-green-500/10 dark:bg-green-500/20
            backdrop-blur-md
            border border-green-500/30
            rounded-xl
            p-4
          ">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">Total de la Orden:</span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${calculateTotal().toLocaleString('es-CO', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Notas Adicionales
            </Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="
                mt-1.5
                bg-white/50 dark:bg-black/30
                backdrop-blur-md
                border-gray-200/50 dark:border-white/10
                rounded-xl
                focus:ring-2 focus:ring-green-500/50
                focus:border-green-500/50
              "
              placeholder="Información adicional sobre la orden..."
            />
          </div>

        </form>

        {/* Footer */}
        <div className="
          bg-gray-50/50 dark:bg-white/5
          backdrop-blur-sm
          px-6 py-4
          flex justify-end gap-3
        ">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="
              bg-white/20 dark:bg-black/20
              backdrop-blur-md
              border border-white/30 dark:border-white/20
              rounded-xl
              hover:bg-white/30 dark:hover:bg-black/30
            "
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !formData.supplier_id}
            className="
              bg-green-500
              text-white
              font-semibold
              px-6
              rounded-xl
              shadow-md shadow-green-500/30
              hover:bg-green-600
              hover:shadow-lg hover:shadow-green-500/40
              active:scale-95
              transition-all duration-150
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            {loading ? "Creando..." : "Crear Orden"}
          </Button>
        </div>

      </div>
    </div>
  )
}
