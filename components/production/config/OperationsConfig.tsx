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
import { useOperations } from "@/hooks/use-operations"
import { toast } from "sonner"

export function OperationsConfig() {
  const { operations, createOperation, updateOperation, deleteOperation } = useOperations()
  const [showDialog, setShowDialog] = useState(false)
  const [editingOperation, setEditingOperation] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    is_active: true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }

    try {
      setLoading(true)

      // Generar código automáticamente desde el nombre
      const autoCode = formData.name.trim().toUpperCase().replace(/\s+/g, '_')

      if (editingOperation) {
        await updateOperation(editingOperation.id, {
          name: formData.name.trim(),
          is_active: formData.is_active
        })
        toast.success("Operación actualizada")
      } else {
        await createOperation({
          code: autoCode,
          name: formData.name.trim(),
          is_active: formData.is_active
        })
        toast.success("Operación creada")
      }

      resetForm()
      setShowDialog(false)
    } catch (error) {
      toast.error("Error al guardar la operación")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (operation: any) => {
    setEditingOperation(operation)
    setFormData({
      name: operation.name,
      is_active: operation.is_active
    })
    setShowDialog(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta operación?")) {
      return
    }

    try {
      await deleteOperation(id)
      toast.success("Operación eliminada")
    } catch (error) {
      toast.error("Error al eliminar la operación")
      console.error(error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      is_active: true
    })
    setEditingOperation(null)
  }

  const handleNewOperation = () => {
    resetForm()
    setShowDialog(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Operaciones de Producción</h3>
        <Button onClick={handleNewOperation}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Operación
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {operations.map((operation) => (
            <TableRow key={operation.id}>
              <TableCell className="font-medium">{operation.name}</TableCell>
              <TableCell>
                <Badge variant={operation.is_active ? "default" : "secondary"}>
                  {operation.is_active ? "Activa" : "Inactiva"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(operation)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(operation.id)}
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

      {operations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay operaciones configuradas
        </div>
      )}

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingOperation ? "Editar Operación" : "Nueva Operación"}
              </DialogTitle>
              <DialogDescription>
                {editingOperation
                  ? "Modifica los datos de la operación"
                  : "Configura una nueva operación de producción"
                }
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
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

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Operación activa</Label>
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
                {loading ? "Guardando..." : editingOperation ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
