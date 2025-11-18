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
import { useWorkCenterInventory } from "@/hooks/use-work-center-inventory"
import { useMaterialReturns } from "@/hooks/use-material-returns"
import { useToast } from "@/components/ui/use-toast"

type CreateReturnDialogProps = {
  workCenterId: string
  onClose: () => void
}

type ReturnItem = {
  material_id: string
  quantity_returned: number
  batch_number?: string
  expiry_date?: string
  unit_of_measure: string
  notes?: string
}

export function CreateReturnDialog({ workCenterId, onClose }: CreateReturnDialogProps) {
  const { inventory, fetchInventoryByWorkCenter } = useWorkCenterInventory()
  const { createReturn } = useMaterialReturns()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    reason: "",
    notes: ""
  })

  const [items, setItems] = useState<ReturnItem[]>([
    { material_id: "", quantity_returned: 0, unit_of_measure: "" }
  ])

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchInventoryByWorkCenter(workCenterId)
  }, [workCenterId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleItemChange = (index: number, field: keyof ReturnItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Auto-fill unit when material is selected
    if (field === 'material_id' && value) {
      const material = inventory.find(m => m.material_id === value)
      if (material) {
        newItems[index].unit_of_measure = material.unit_of_measure || ''
        newItems[index].batch_number = material.batch_number || ''
        newItems[index].expiry_date = material.expiry_date || ''
      }
    }

    setItems(newItems)
  }

  const getAvailableQuantity = (materialId: string) => {
    const material = inventory.find(m => m.material_id === materialId)
    if (!material) return 0
    return material.quantity_available - material.quantity_consumed
  }

  const addItem = () => {
    setItems([...items, { material_id: "", quantity_returned: 0, unit_of_measure: "" }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (items.length === 0 || items.some(item => !item.material_id || item.quantity_returned <= 0)) {
        toast({
          title: "Error de validación",
          description: "Debes agregar al menos un material con cantidad válida",
          variant: "destructive"
        })
        setLoading(false)
        return
      }

      // Validate quantities against available
      for (const item of items) {
        if (item.material_id) {
          const available = getAvailableQuantity(item.material_id)
          if (item.quantity_returned > available) {
            toast({
              title: "Cantidad insuficiente",
              description: `Cantidad disponible para devolución: ${available}`,
              variant: "destructive"
            })
            setLoading(false)
            return
          }
        }
      }

      const returnData = {
        work_center_id: workCenterId,
        items: items.filter(item => item.material_id && item.quantity_returned > 0),
        reason: formData.reason || undefined,
        notes: formData.notes || undefined
      }

      const newReturn = await createReturn(
        workCenterId,
        returnData.items,
        returnData.reason,
        returnData.notes
      )

      if (newReturn) {
        toast({
          title: "Devolución creada",
          description: `Devolución ${newReturn.return_number} creada exitosamente`,
        })
        onClose()
      } else {
        toast({
          title: "Error",
          description: "No se pudo crear la devolución",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al crear la devolución",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const availableMaterials = inventory.filter(m => (m.quantity_available - m.quantity_consumed) > 0)

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
          bg-purple-500
          px-6 py-4
          flex items-center justify-between
        ">
          <h2 className="text-xl font-semibold text-white">
            Devolver Materiales al Inventario
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

          {/* Reason and Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reason" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Motivo de la Devolución *
                </Label>
                <Select
                  value={formData.reason}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
                >
                  <SelectTrigger className="
                    mt-1.5
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border-gray-200/50 dark:border-white/10
                    rounded-xl
                  ">
                    <SelectValue placeholder="Seleccionar motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Exceso de producción">Exceso de producción</SelectItem>
                    <SelectItem value="Rechazo de calidad">Rechazo de calidad</SelectItem>
                    <SelectItem value="Material dañado">Material dañado</SelectItem>
                    <SelectItem value="Stock sobrante">Stock sobrante</SelectItem>
                    <SelectItem value="Error de cantidad">Error de cantidad</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

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
                  focus:ring-2 focus:ring-purple-500/50
                  focus:border-purple-500/50
                "
                placeholder="Información adicional sobre la devolución..."
              />
            </div>
          </div>

          {/* Materials */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Materiales a Devolver</h3>
              <Button
                type="button"
                onClick={addItem}
                disabled={availableMaterials.length === 0}
                className="
                  bg-purple-500
                  text-white
                  font-semibold
                  px-4
                  py-2
                  rounded-xl
                  shadow-md shadow-purple-500/30
                  hover:bg-purple-600
                  hover:shadow-lg hover:shadow-purple-500/40
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

            {availableMaterials.length === 0 && (
              <p className="text-sm text-orange-600 dark:text-orange-400">
                No hay materiales disponibles para devolver
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
                          {availableMaterials.map((material) => {
                            const netAvailable = material.quantity_available - material.quantity_consumed
                            return (
                              <SelectItem key={material.material_id} value={material.material_id}>
                                {material.material_name} (Disponible: {netAvailable} {material.unit_of_measure})
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-3">
                      <Label className="text-xs text-gray-600 dark:text-gray-400">Cantidad *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={item.material_id ? getAvailableQuantity(item.material_id) : undefined}
                        value={item.quantity_returned}
                        onChange={(e) => handleItemChange(index, 'quantity_returned', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="
                          mt-1
                          bg-white/50 dark:bg-black/30
                          backdrop-blur-md
                          border-gray-200/50 dark:border-white/10
                          rounded-lg
                        "
                      />
                    </div>

                    <div className="md:col-span-3">
                      <Label className="text-xs text-gray-600 dark:text-gray-400">Unidad</Label>
                      <div className="mt-1 p-2 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                        {item.unit_of_measure || '—'}
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
            disabled={loading}
            className="
              bg-purple-500
              text-white
              font-semibold
              px-6
              rounded-xl
              shadow-md shadow-purple-500/30
              hover:bg-purple-600
              hover:shadow-lg hover:shadow-purple-500/40
              active:scale-95
              transition-all duration-150
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            {loading ? "Creando..." : "Crear Devolución"}
          </Button>
        </div>

      </div>
    </div>
  )
}
