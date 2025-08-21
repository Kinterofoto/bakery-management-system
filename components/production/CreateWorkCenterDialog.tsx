"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { toast } from "sonner"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateWorkCenterDialog({ open, onOpenChange }: Props) {
  const { createWorkCenter } = useWorkCenters()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error("El código y nombre son obligatorios")
      return
    }

    try {
      setLoading(true)
      await createWorkCenter({
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        is_active: true
      })
      
      toast.success("Centro de trabajo creado exitosamente")
      setFormData({ code: "", name: "", description: "" })
      onOpenChange(false)
    } catch (error) {
      toast.error("Error al crear el centro de trabajo")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Crear Centro de Trabajo</DialogTitle>
            <DialogDescription>
              Configura un nuevo centro de trabajo para gestionar la producción
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                placeholder="Ej: AMAS001"
                value={formData.code}
                onChange={handleChange("code")}
                className="uppercase"
                maxLength={10}
                required
              />
              <p className="text-xs text-gray-500">
                Código único identificador (máx. 10 caracteres)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                placeholder="Ej: Amasado"
                value={formData.name}
                onChange={handleChange("name")}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Describe las actividades de este centro..."
                value={formData.description}
                onChange={handleChange("description")}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear Centro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}