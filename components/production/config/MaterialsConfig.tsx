"use client"

import { useState } from "react"
import { useMaterials } from "@/hooks/use-materials"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2 } from "lucide-react"
import { toast } from "sonner"

const UNIT_OPTIONS = [
  { value: "gramos", label: "Gramos" },
  { value: "kg", label: "Kilogramos" },
  { value: "litros", label: "Litros" },
  { value: "unidades", label: "Unidades" },
  { value: "ml", label: "Mililitros" },
]

export function MaterialsConfig() {
  const { materials, createMaterial, updateMaterial, deleteMaterial } = useMaterials()
  const [showDialog, setShowDialog] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    unit: "gramos"
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }

    try {
      setLoading(true)

      if (editingMaterial) {
        await updateMaterial(editingMaterial.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          unit: formData.unit
        })
        toast.success("Material actualizado")
      } else {
        await createMaterial({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          unit: formData.unit
        })
        toast.success("Material creado")
      }

      resetForm()
      setShowDialog(false)
    } catch (error) {
      toast.error("Error al guardar el material")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (material: any) => {
    setEditingMaterial(material)
    setFormData({
      name: material.name,
      description: material.description || "",
      unit: material.base_unit
    })
    setShowDialog(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este material?")) {
      return
    }

    try {
      await deleteMaterial(id)
      toast.success("Material eliminado")
    } catch (error) {
      toast.error("Error al eliminar el material")
      console.error(error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      unit: "gramos"
    })
    setEditingMaterial(null)
  }

  const handleOpenDialog = () => {
    resetForm()
    setShowDialog(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Materias Primas</h3>
          <p className="text-sm text-gray-600">
            Gestiona el catálogo de materias primas y sus unidades de medida
          </p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Materia Prima
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Unidad Base</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((material) => (
              <TableRow key={material.id}>
                <TableCell className="font-medium">{material.name}</TableCell>
                <TableCell className="text-sm text-gray-600">
                  {material.description || "-"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{material.base_unit}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(material)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(material.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {materials.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay materias primas configuradas
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingMaterial ? "Editar Materia Prima" : "Nueva Materia Prima"}
              </DialogTitle>
              <DialogDescription>
                Configura la materia prima y su unidad de medida base
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  placeholder="Ej: Harina de trigo"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Descripción opcional del material"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unidad Base *</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
                >
                  <SelectTrigger>
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : (editingMaterial ? "Actualizar" : "Crear")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}