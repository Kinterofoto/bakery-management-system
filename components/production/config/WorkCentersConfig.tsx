"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Edit, Trash2 } from "lucide-react"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { toast } from "sonner"

export function WorkCentersConfig() {
  const { workCenters, createWorkCenter, updateWorkCenter, deleteWorkCenter } = useWorkCenters()
  const [showDialog, setShowDialog] = useState(false)
  const [editingCenter, setEditingCenter] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    is_active: true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error("El código y nombre son obligatorios")
      return
    }

    try {
      setLoading(true)
      
      if (editingCenter) {
        await updateWorkCenter(editingCenter.id, {
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          is_active: formData.is_active
        })
        toast.success("Centro de trabajo actualizado")
      } else {
        await createWorkCenter({
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          is_active: formData.is_active
        })
        toast.success("Centro de trabajo creado")
      }
      
      resetForm()
      setShowDialog(false)
    } catch (error) {
      toast.error("Error al guardar el centro de trabajo")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (center: any) => {
    setEditingCenter(center)
    setFormData({
      code: center.code,
      name: center.name,
      description: center.description || "",
      is_active: center.is_active
    })
    setShowDialog(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este centro de trabajo?")) {
      return
    }

    try {
      await deleteWorkCenter(id)
      toast.success("Centro de trabajo eliminado")
    } catch (error) {
      toast.error("Error al eliminar el centro de trabajo")
      console.error(error)
    }
  }

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      is_active: true
    })
    setEditingCenter(null)
  }

  const handleNewCenter = () => {
    resetForm()
    setShowDialog(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Centros de Trabajo</h3>
        <Button onClick={handleNewCenter}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Centro
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workCenters.map((center) => (
            <TableRow key={center.id}>
              <TableCell className="font-mono text-sm">{center.code}</TableCell>
              <TableCell className="font-medium">{center.name}</TableCell>
              <TableCell className="text-sm text-gray-600">
                {center.description || "-"}
              </TableCell>
              <TableCell>
                <Badge variant={center.is_active ? "default" : "secondary"}>
                  {center.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(center)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(center.id)}
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

      {workCenters.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay centros de trabajo configurados
        </div>
      )}

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingCenter ? "Editar Centro de Trabajo" : "Nuevo Centro de Trabajo"}
              </DialogTitle>
              <DialogDescription>
                {editingCenter 
                  ? "Modifica los datos del centro de trabajo" 
                  : "Configura un nuevo centro de trabajo"
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  placeholder="Ej: AMAS001"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  className="uppercase"
                  maxLength={10}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  placeholder="Ej: Amasado"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  placeholder="Describe las actividades..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Centro activo</Label>
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
                {loading ? "Guardando..." : editingCenter ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}