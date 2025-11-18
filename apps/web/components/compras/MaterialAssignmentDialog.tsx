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
import { X } from "lucide-react"
import { useMaterialSuppliers } from "@/hooks/use-material-suppliers"
import { useToast } from "@/components/ui/use-toast"

type MaterialAssignmentDialogProps = {
  assignment?: any
  onClose: () => void
}

export function MaterialAssignmentDialog({ assignment, onClose }: MaterialAssignmentDialogProps) {
  const { materials, suppliers, createMaterialSupplier, updateMaterialSupplier } = useMaterialSuppliers()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    material_id: "",
    supplier_id: "",
    presentation: "",
    unit_price: "",
    packaging_unit: "1",
    lead_time_days: "",
    is_preferred: false,
    status: "active" as const,
    notes: ""
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (assignment) {
      setFormData({
        material_id: assignment.material_id || "",
        supplier_id: assignment.supplier_id || "",
        presentation: assignment.presentation || "",
        unit_price: assignment.unit_price?.toString() || "",
        packaging_unit: assignment.packaging_unit?.toString() || "1",
        lead_time_days: assignment.lead_time_days?.toString() || "",
        is_preferred: assignment.is_preferred || false,
        status: assignment.status || "active",
        notes: assignment.notes || ""
      })
    }
  }, [assignment])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        material_id: formData.material_id,
        supplier_id: formData.supplier_id,
        presentation: formData.presentation || null,
        unit_price: parseFloat(formData.unit_price),
        packaging_unit: parseInt(formData.packaging_unit) || 1,
        lead_time_days: formData.lead_time_days ? parseInt(formData.lead_time_days) : null,
        is_preferred: formData.is_preferred,
        status: formData.status,
        notes: formData.notes || null
      }

      if (assignment) {
        // Update existing assignment
        const success = await updateMaterialSupplier(assignment.id, data)
        if (success) {
          toast({
            title: "Asignación actualizada",
            description: "La asignación ha sido actualizada exitosamente",
          })
          onClose()
        }
      } else {
        // Create new assignment
        const newAssignment = await createMaterialSupplier(data)
        if (newAssignment) {
          toast({
            title: "Asignación creada",
            description: "La asignación ha sido creada exitosamente",
          })
          onClose()
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al guardar la asignación",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="
        bg-white/90 dark:bg-black/80
        backdrop-blur-2xl
        border border-white/30 dark:border-white/15
        rounded-3xl
        shadow-2xl shadow-black/20
        max-w-2xl
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
            {assignment ? "Editar Asignación" : "Nueva Asignación Material-Proveedor"}
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

          {/* Material and Supplier Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="material_id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Material *
              </Label>
              <Select
                value={formData.material_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, material_id: value }))}
                disabled={!!assignment}
              >
                <SelectTrigger className="
                  mt-1.5
                  bg-white/50 dark:bg-black/30
                  backdrop-blur-md
                  border-gray-200/50 dark:border-white/10
                  rounded-xl
                ">
                  <SelectValue placeholder="Seleccionar material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="supplier_id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Proveedor *
              </Label>
              <Select
                value={formData.supplier_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value }))}
                disabled={!!assignment}
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
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pricing Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información de Precio</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unit_price" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Precio Unitario *
                </Label>
                <Input
                  id="unit_price"
                  name="unit_price"
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={handleChange}
                  required
                  className="
                    mt-1.5
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border-gray-200/50 dark:border-white/10
                    rounded-xl
                    focus:ring-2 focus:ring-purple-500/50
                    focus:border-purple-500/50
                  "
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="packaging_unit" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Unidad de Embalaje *
                </Label>
                <Input
                  id="packaging_unit"
                  name="packaging_unit"
                  type="number"
                  value={formData.packaging_unit}
                  onChange={handleChange}
                  required
                  className="
                    mt-1.5
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border-gray-200/50 dark:border-white/10
                    rounded-xl
                    focus:ring-2 focus:ring-purple-500/50
                    focus:border-purple-500/50
                  "
                  placeholder="1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="presentation" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Presentación
              </Label>
              <Input
                id="presentation"
                name="presentation"
                value={formData.presentation}
                onChange={handleChange}
                className="
                  mt-1.5
                  bg-white/50 dark:bg-black/30
                  backdrop-blur-md
                  border-gray-200/50 dark:border-white/10
                  rounded-xl
                  focus:ring-2 focus:ring-purple-500/50
                  focus:border-purple-500/50
                "
                placeholder="Ej: Bolsa 50kg, Caja 25 unidades"
              />
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información Adicional</h3>

            <div>
              <Label htmlFor="lead_time_days" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tiempo de Entrega (días)
              </Label>
              <Input
                id="lead_time_days"
                name="lead_time_days"
                type="number"
                value={formData.lead_time_days}
                onChange={handleChange}
                className="
                  mt-1.5
                  bg-white/50 dark:bg-black/30
                  backdrop-blur-md
                  border-gray-200/50 dark:border-white/10
                  rounded-xl
                  focus:ring-2 focus:ring-purple-500/50
                  focus:border-purple-500/50
                "
                placeholder="Ej: 5"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_preferred"
                checked={formData.is_preferred}
                onChange={(e) => setFormData(prev => ({ ...prev, is_preferred: e.target.checked }))}
                className="w-5 h-5 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
              />
              <Label htmlFor="is_preferred" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Proveedor Preferido
              </Label>
            </div>

            <div>
              <Label htmlFor="notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Notas
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
                placeholder="Información adicional..."
              />
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
            disabled={loading || !formData.material_id || !formData.supplier_id || !formData.unit_price}
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
            {loading ? "Guardando..." : (assignment ? "Actualizar" : "Crear")}
          </Button>
        </div>

      </div>
    </div>
  )
}
