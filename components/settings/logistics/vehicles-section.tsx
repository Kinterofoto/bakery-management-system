"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { useVehicles } from "@/hooks/use-vehicles"
import { useDrivers } from "@/hooks/use-drivers"
import { Plus, Edit, Trash2, UserPlus } from "lucide-react"

interface VehicleFormData {
  vehicle_code: string
  driver_id: string
  capacity_kg: string
  status: "available" | "in_use" | "maintenance"
}

export function VehiclesSection() {
  const { vehicles, loading, error, createVehicle, updateVehicle, deleteVehicle, assignDriverToVehicle, refetch } = useVehicles()
  const { drivers } = useDrivers()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAssignDriverDialogOpen, setIsAssignDriverDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<any>(null)
  const [assigningVehicle, setAssigningVehicle] = useState<any>(null)
  const [formData, setFormData] = useState<VehicleFormData>({
    vehicle_code: "",
    driver_id: "",
    capacity_kg: "",
    status: "available"
  })

  const resetForm = () => {
    setFormData({
      vehicle_code: "",
      driver_id: "",
      capacity_kg: "",
      status: "available"
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createVehicle({
        vehicle_code: formData.vehicle_code,
        driver_id: formData.driver_id && formData.driver_id !== "none" ? formData.driver_id : undefined,
        capacity_kg: formData.capacity_kg ? parseFloat(formData.capacity_kg) : undefined,
        status: formData.status
      })
      toast({
        title: "Éxito",
        description: "Vehículo creado correctamente",
      })
      resetForm()
      setIsCreateDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el vehículo",
        variant: "destructive",
      })
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingVehicle) return
    
    try {
      await updateVehicle(editingVehicle.id, {
        vehicle_code: formData.vehicle_code,
        driver_id: formData.driver_id && formData.driver_id !== "none" ? formData.driver_id : null,
        capacity_kg: formData.capacity_kg ? parseFloat(formData.capacity_kg) : null,
        status: formData.status
      })
      toast({
        title: "Éxito",
        description: "Vehículo actualizado correctamente",
      })
      setEditingVehicle(null)
      resetForm()
      setIsEditDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el vehículo",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este vehículo?")) return
    
    try {
      await deleteVehicle(id)
      toast({
        title: "Éxito",
        description: "Vehículo eliminado correctamente",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el vehículo",
        variant: "destructive",
      })
    }
  }

  const handleAssignDriver = async (driverId: string) => {
    if (!assigningVehicle) return
    
    try {
      await assignDriverToVehicle(assigningVehicle.id, driverId)
      toast({
        title: "Éxito",
        description: "Conductor asignado correctamente",
      })
      setAssigningVehicle(null)
      setIsAssignDriverDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo asignar el conductor",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (vehicle: any) => {
    setEditingVehicle(vehicle)
    setFormData({
      vehicle_code: vehicle.vehicle_code,
      driver_id: vehicle.driver_id || "none",
      capacity_kg: vehicle.capacity_kg?.toString() || "",
      status: vehicle.status
    })
    setIsEditDialogOpen(true)
  }

  const openAssignDriverDialog = (vehicle: any) => {
    setAssigningVehicle(vehicle)
    setIsAssignDriverDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Disponible</Badge>
      case "in_use":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">En uso</Badge>
      case "maintenance":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Mantenimiento</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) return <div>Cargando vehículos...</div>
  if (error) return <div className="text-red-600">Error: {error}</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Vehículos</h3>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Vehículo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Vehículo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle_code">Código del Vehículo *</Label>
                <Input
                  id="vehicle_code"
                  value={formData.vehicle_code}
                  onChange={(e) => setFormData({ ...formData, vehicle_code: e.target.value })}
                  placeholder="Ej: VH-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driver_id">Conductor</Label>
                <Select 
                  value={formData.driver_id} 
                  onValueChange={(value) => setFormData({ ...formData, driver_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar conductor (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin conductor asignado</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity_kg">Capacidad (kg)</Label>
                <Input
                  id="capacity_kg"
                  type="number"
                  step="0.01"
                  value={formData.capacity_kg}
                  onChange={(e) => setFormData({ ...formData, capacity_kg: e.target.value })}
                  placeholder="Ej: 1000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: "available" | "in_use" | "maintenance") => 
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Disponible</SelectItem>
                    <SelectItem value="in_use">En uso</SelectItem>
                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Crear Vehículo</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Conductor</TableHead>
              <TableHead>Capacidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500">
                  No hay vehículos registrados
                </TableCell>
              </TableRow>
            ) : (
              vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium">{vehicle.vehicle_code}</TableCell>
                  <TableCell>
                    {vehicle.driver ? vehicle.driver.name : "Sin asignar"}
                  </TableCell>
                  <TableCell>
                    {vehicle.capacity_kg ? `${vehicle.capacity_kg} kg` : "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(vehicle)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAssignDriverDialog(vehicle)}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(vehicle.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Vehículo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_vehicle_code">Código del Vehículo *</Label>
              <Input
                id="edit_vehicle_code"
                value={formData.vehicle_code}
                onChange={(e) => setFormData({ ...formData, vehicle_code: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_driver_id">Conductor</Label>
              <Select 
                value={formData.driver_id} 
                onValueChange={(value) => setFormData({ ...formData, driver_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar conductor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin conductor asignado</SelectItem>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_capacity_kg">Capacidad (kg)</Label>
              <Input
                id="edit_capacity_kg"
                type="number"
                step="0.01"
                value={formData.capacity_kg}
                onChange={(e) => setFormData({ ...formData, capacity_kg: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_status">Estado</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: "available" | "in_use" | "maintenance") => 
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponible</SelectItem>
                  <SelectItem value="in_use">En uso</SelectItem>
                  <SelectItem value="maintenance">Mantenimiento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Actualizar Vehículo</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Driver Dialog */}
      <Dialog open={isAssignDriverDialogOpen} onOpenChange={setIsAssignDriverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Conductor a {assigningVehicle?.vehicle_code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Seleccionar Conductor</Label>
              <div className="space-y-2">
                {drivers.length === 0 ? (
                  <p className="text-gray-500">No hay conductores disponibles</p>
                ) : (
                  drivers.map((driver) => (
                    <Button
                      key={driver.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleAssignDriver(driver.id)}
                    >
                      {driver.name} - {driver.email}
                    </Button>
                  ))
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setIsAssignDriverDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}