"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2 } from "lucide-react"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { useOperations } from "@/hooks/use-operations"
import { toast } from "sonner"

export function WorkCentersConfig() {
  const { workCenters, createWorkCenter, updateWorkCenter, deleteWorkCenter } = useWorkCenters()
  const { operations, getActiveOperations } = useOperations()
  const [showDialog, setShowDialog] = useState(false)
  const [editingCenter, setEditingCenter] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    operation_id: "",
    is_active: true
  })

  const activeOperations = getActiveOperations()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }

    if (!formData.operation_id) {
      toast.error("Debes seleccionar una operación")
      return
    }

    try {
      setLoading(true)

      // Auto-generar código desde el nombre
      const code = formData.name.trim().toUpperCase().replace(/\s+/g, '_')

      if (editingCenter) {
        await updateWorkCenter(editingCenter.id, {
          code,
          name: formData.name.trim(),
          operation_id: formData.operation_id,
          description: null,
          is_active: formData.is_active
        })
        toast.success("Centro de trabajo actualizado")
      } else {
        await createWorkCenter({
          code,
          name: formData.name.trim(),
          operation_id: formData.operation_id,
          description: null,
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
      name: center.name,
      operation_id: center.operation_id || "",
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
      name: "",
      operation_id: "",
      is_active: true
    })
    setEditingCenter(null)
  }

  const handleOpenDialog = () => {
    resetForm()
    setShowDialog(true)
  }

  // Obtener nombre de operación para un centro
  const getOperationName = (operationId: string | null) => {
    if (!operationId) return "Sin operación"
    const operation = operations.find(op => op.id === operationId)
    return operation?.name || "Desconocida"
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Centros de Trabajo</h3>
          <p className="text-sm text-gray-600">
            Gestiona los centros donde se realizan las operaciones de producción
          </p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Centro
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Operación</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workCenters.map((center) => (
              <TableRow key={center.id}>
                <TableCell className="font-medium">{center.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{center.code}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {getOperationName(center.operation_id)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {center.is_active ? (
                    <Badge variant="default" className="bg-green-600">Activo</Badge>
                  ) : (
                    <Badge variant="secondary">Inactivo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
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
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingCenter ? "Editar Centro de Trabajo" : "Nuevo Centro de Trabajo"}
              </DialogTitle>
              <DialogDescription>
                Configura un centro de trabajo asociado a una operación
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  placeholder="Ej: Horno 1"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  autoFocus
                />
                <p className="text-xs text-gray-500">
                  El código se generará automáticamente
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="operation">Operación *</Label>
                <Select
                  value={formData.operation_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, operation_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una operación" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeOperations.map((operation) => (
                      <SelectItem key={operation.id} value={operation.id}>
                        {operation.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_active">Centro activo</Label>
                  <p className="text-xs text-gray-500">
                    Los centros inactivos no aparecerán en producción
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
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
                {loading ? "Guardando..." : (editingCenter ? "Actualizar" : "Crear")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
