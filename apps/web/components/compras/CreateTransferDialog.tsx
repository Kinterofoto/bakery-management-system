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
import { X, Plus, Trash2, AlertCircle } from "lucide-react"
import { useMaterialTransfers } from "@/hooks/use-material-transfers"
import { useInventoryRealtime } from "@/hooks/use-inventory-realtime"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { useToast } from "@/components/ui/use-toast"

type CreateTransferDialogProps = {
  onClose: () => void
}

type TransferItem = {
  material_id: string
  quantity_requested: number
  batch_number?: string
  expiry_date?: string
  unit_of_measure: string
  notes?: string
}

export function CreateTransferDialog({ onClose }: CreateTransferDialogProps) {
  const { getActiveWorkCenters, loading: workCentersLoading } = useWorkCenters()
  const { inventory, fetchWarehouseInventory, loading: inventoryLoading } = useInventoryRealtime()
  const { createTransfer } = useMaterialTransfers()
  const { toast } = useToast()

  const activeWorkCenters = getActiveWorkCenters()

  // Load warehouse inventory only (WH1-GENERAL) on mount
  useEffect(() => {
    fetchWarehouseInventory()
  }, [])

  const [formData, setFormData] = useState({
    work_center_id: "",
    notes: ""
  })

  const [items, setItems] = useState<TransferItem[]>([
    { material_id: "", quantity_requested: 0, unit_of_measure: "" }
  ])

  const [loading, setLoading] = useState(false)

  // Get available materials from central inventory
  const getAvailableMaterials = () => {
    return (inventory || []).filter(m => m.current_stock > 0)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleWorkCenterChange = (workCenterId: string) => {
    setFormData(prev => ({ ...prev, work_center_id: workCenterId }))
  }

  const handleItemChange = (index: number, field: keyof TransferItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Auto-fill unit when material is selected
    if (field === 'material_id' && value) {
      const material = inventory?.find(m => m.id === value)
      if (material) {
        newItems[index].unit_of_measure = material.unit || ''
      }
    }

    setItems(newItems)
  }

  const getAvailableQuantity = (materialId: string) => {
    const material = inventory?.find(m => m.id === materialId)
    return material?.current_stock || 0
  }

  const addItem = () => {
    setItems([...items, { material_id: "", quantity_requested: 0, unit_of_measure: "" }])
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
      // Validate
      if (!formData.work_center_id) {
        toast({
          title: "Error de validación",
          description: "Debes seleccionar un centro de trabajo",
          variant: "destructive"
        })
        setLoading(false)
        return
      }

      if (items.length === 0 || items.some(item => !item.material_id || item.quantity_requested <= 0)) {
        toast({
          title: "Error de validación",
          description: "Debes agregar al menos un material con cantidad válida",
          variant: "destructive"
        })
        setLoading(false)
        return
      }

      // Validate quantities against available stock
      for (const item of items) {
        if (item.material_id) {
          const available = getAvailableQuantity(item.material_id)
          if (item.quantity_requested > available) {
            toast({
              title: "Stock insuficiente",
              description: `Stock insuficiente para ${item.material_id}. Disponible: ${available}`,
              variant: "destructive"
            })
            setLoading(false)
            return
          }
        }
      }

      const transferData = {
        work_center_id: formData.work_center_id,
        items: items.filter(item => item.material_id && item.quantity_requested > 0)
      }

      const newTransfer = await createTransfer(formData.work_center_id, transferData.items)

      if (newTransfer) {
        toast({
          title: "Traslado creado",
          description: `Traslado ${newTransfer.transfer_number} creado exitosamente`,
        })
        onClose()
      } else {
        toast({
          title: "Error",
          description: "No se pudo crear el traslado",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al crear el traslado",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const availableMaterials = getAvailableMaterials()

  return (
    <div className="fixed z-50" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Backdrop */}
      <div className="fixed bg-black/30 backdrop-blur-sm" style={{ top: 0, left: 0, right: 0, bottom: 0 }} />

      {/* Dialog Container */}
      <div className="fixed flex items-center justify-center p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
        <div className="
          bg-white/70 dark:bg-black/50
          backdrop-blur-xl
          border border-white/20 dark:border-white/10
          rounded-3xl
          shadow-2xl shadow-black/20
          max-w-4xl
          w-full
          max-h-[90vh]
          overflow-hidden
        ">
        {/* Header */}
        <div className="
          bg-blue-600/90 dark:bg-blue-600/80
          backdrop-blur-xl
          px-6 py-4
          flex items-center justify-between
        ">
          <h2 className="text-xl font-semibold text-white">
            Nuevo Traslado de Materias Primas
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

          {/* Work Center Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Centro de Destino</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="work_center_id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Centro de Trabajo *
                </Label>
                <Select
                  value={formData.work_center_id}
                  onValueChange={handleWorkCenterChange}
                >
                  <SelectTrigger className="
                    mt-1.5
                    bg-white/30 dark:bg-black/20
                    backdrop-blur-md
                    border border-white/30 dark:border-white/20
                    rounded-lg
                  ">
                    <SelectValue placeholder="Seleccionar centro de trabajo" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeWorkCenters.map((workCenter) => (
                      <SelectItem key={workCenter.id} value={workCenter.id}>
                        {workCenter.name} ({workCenter.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Materials */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Materias Primas a Trasladar</h3>
              <Button
                type="button"
                onClick={addItem}
                disabled={!formData.work_center_id || availableMaterials.length === 0}
                className="
                  bg-blue-600
                  text-white
                  font-semibold
                  px-6
                  py-3
                  rounded-xl
                  shadow-md shadow-blue-600/30
                  hover:bg-blue-700
                  hover:shadow-lg hover:shadow-blue-600/40
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

            {!formData.work_center_id && (
              <div className="bg-orange-500/10 dark:bg-orange-500/5 backdrop-blur-xl border border-orange-500/30 dark:border-orange-500/40 rounded-lg p-3 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-orange-700 dark:text-orange-300">Selecciona un centro de trabajo para agregar materiales</p>
              </div>
            )}

            {formData.work_center_id && availableMaterials.length === 0 && (
              <div className="bg-orange-500/10 dark:bg-orange-500/5 backdrop-blur-xl border border-orange-500/30 dark:border-orange-500/40 rounded-lg p-3 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-orange-700 dark:text-orange-300">No hay materiales disponibles en el inventario central</p>
              </div>
            )}

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="
                    bg-white/30 dark:bg-black/20
                    backdrop-blur-md
                    border border-white/30 dark:border-white/20
                    rounded-lg
                    p-4
                  "
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-4">
                      <Label className="text-xs text-gray-600 dark:text-gray-400">Material</Label>
                      <Select
                        value={item.material_id}
                        onValueChange={(value) => handleItemChange(index, 'material_id', value)}
                      >
                        <SelectTrigger className="
                          mt-1
                          bg-white/30 dark:bg-black/20
                          backdrop-blur-md
                          border border-white/30 dark:border-white/20
                          rounded-lg
                        ">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableMaterials.map((material) => (
                            <SelectItem key={material.id} value={material.id}>
                              {material.name} (Disponible: {material.current_stock} {material.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-2">
                      <Label className="text-xs text-gray-600 dark:text-gray-400">Cantidad *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={item.material_id ? getAvailableQuantity(item.material_id) : undefined}
                        value={item.quantity_requested}
                        onChange={(e) => handleItemChange(index, 'quantity_requested', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="
                          mt-1
                          bg-white/30 dark:bg-black/20
                          backdrop-blur-md
                          border border-white/30 dark:border-white/20
                          rounded-lg
                          focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-black transition-all duration-150
                        "
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label className="text-xs text-gray-600 dark:text-gray-400">Lote</Label>
                      <Input
                        type="text"
                        value={item.batch_number || ''}
                        onChange={(e) => handleItemChange(index, 'batch_number', e.target.value)}
                        placeholder="Opcional"
                        className="
                          mt-1
                          bg-white/30 dark:bg-black/20
                          backdrop-blur-md
                          border border-white/30 dark:border-white/20
                          rounded-lg
                          focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-black transition-all duration-150
                        "
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label className="text-xs text-gray-600 dark:text-gray-400">Vencimiento</Label>
                      <Input
                        type="date"
                        value={item.expiry_date || ''}
                        onChange={(e) => handleItemChange(index, 'expiry_date', e.target.value)}
                        className="
                          mt-1
                          bg-white/30 dark:bg-black/20
                          backdrop-blur-md
                          border border-white/30 dark:border-white/20
                          rounded-lg
                          focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-black transition-all duration-150
                        "
                      />
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
                bg-white/30 dark:bg-black/20
                backdrop-blur-md
                border border-white/30 dark:border-white/20
                rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-black transition-all duration-150
              "
              placeholder="Información adicional sobre el traslado..."
            />
          </div>

        </form>

        {/* Footer */}
        <div className="
          bg-white/40 dark:bg-white/5
          backdrop-blur-md
          px-6 py-4
          flex justify-end gap-3
        ">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="
              bg-white/30 dark:bg-black/30
              backdrop-blur-md
              border border-white/30 dark:border-white/20
              rounded-lg
              hover:bg-white/50 dark:hover:bg-black/40
              transition-all duration-150
            "
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !formData.work_center_id}
            className="
              bg-blue-600
              text-white
              font-semibold
              px-6
              py-3
              rounded-lg
              shadow-md shadow-blue-600/30
              hover:bg-blue-700
              hover:shadow-lg hover:shadow-blue-600/40
              active:scale-95
              transition-all duration-150
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            {loading ? "Creando..." : "Crear Traslado"}
          </Button>
        </div>

      </div>
      </div>
    </div>
  )
}
