"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"
import { useRawMaterials } from "@/hooks/use-raw-materials"
import { useToast } from "@/components/ui/use-toast"

const UNIT_OPTIONS = [
  { value: "gramos", label: "Gramos" },
  { value: "kg", label: "Kilogramos" },
  { value: "litros", label: "Litros" },
  { value: "unidades", label: "Unidades" },
  { value: "ml", label: "Mililitros" },
]

type MaterialDialogProps = {
  material?: any
  onClose: () => void
}

export function MaterialDialog({ material, onClose }: MaterialDialogProps) {
  const { createMaterial, updateMaterial } = useRawMaterials()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    unit: "gramos",
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (material) {
      setFormData({
        name: material.name || "",
        description: material.description || "",
        unit: material.unit || "gramos",
      })
    }
  }, [material])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleUnitChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      unit: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del material es obligatorio",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      if (material) {
        // Update existing material
        const success = await updateMaterial(material.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          unit: formData.unit
        })
        if (success) {
          toast({
            title: "Material actualizado",
            description: "El material ha sido actualizado exitosamente",
          })
          onClose()
        }
      } else {
        // Create new material
        const newMaterial = await createMaterial({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          unit: formData.unit
        })
        if (newMaterial) {
          toast({
            title: "Material creado",
            description: "El material ha sido creado exitosamente",
          })
          onClose()
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al guardar el material",
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
          bg-blue-500
          px-6 py-4
          flex items-center justify-between
        ">
          <h2 className="text-xl font-semibold text-white">
            {material ? "Editar Material" : "Nuevo Material"}
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

          {/* Material Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información del Material</h3>

            <div>
              <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nombre del Material *
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                autoFocus
                className="
                  mt-1.5
                  bg-white/50 dark:bg-black/30
                  backdrop-blur-md
                  border-gray-200/50 dark:border-white/10
                  rounded-xl
                  focus:ring-2 focus:ring-blue-500/50
                  focus:border-blue-500/50
                "
                placeholder="Ej: Harina de trigo"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Descripción
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="
                  mt-1.5
                  bg-white/50 dark:bg-black/30
                  backdrop-blur-md
                  border-gray-200/50 dark:border-white/10
                  rounded-xl
                  focus:ring-2 focus:ring-blue-500/50
                  focus:border-blue-500/50
                "
                placeholder="Descripción opcional del material..."
              />
            </div>

            <div>
              <Label htmlFor="unit" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Unidad Base *
              </Label>
              <Select value={formData.unit} onValueChange={handleUnitChange}>
                <SelectTrigger className="
                  mt-1.5
                  bg-white/50 dark:bg-black/30
                  backdrop-blur-md
                  border-gray-200/50 dark:border-white/10
                  rounded-xl
                  focus:ring-2 focus:ring-blue-500/50
                  focus:border-blue-500/50
                ">
                  <SelectValue placeholder="Selecciona una unidad" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              bg-blue-500
              text-white
              font-semibold
              px-6
              rounded-xl
              shadow-md shadow-blue-500/30
              hover:bg-blue-600
              hover:shadow-lg hover:shadow-blue-500/40
              active:scale-95
              transition-all duration-150
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            {loading ? "Guardando..." : (material ? "Actualizar" : "Crear")}
          </Button>
        </div>

      </div>
    </div>
  )
}
