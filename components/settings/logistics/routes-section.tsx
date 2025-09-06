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
import { useRoutes } from "@/hooks/use-routes"
import { useDrivers } from "@/hooks/use-drivers"
import { useVehicles } from "@/hooks/use-vehicles"
import { Plus, Edit, Trash2, Eye } from "lucide-react"

interface RouteFormData {
  route_name: string
  driver_id: string
  vehicle_id: string
  route_date: string
}

export function RoutesSection() {
  const { routes, loading, error, createRoute, refetch } = useRoutes()
  const { drivers } = useDrivers()
  const { vehicles } = useVehicles()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingRoute, setViewingRoute] = useState<any>(null)
  const [formData, setFormData] = useState<RouteFormData>({
    route_name: "",
    driver_id: "",
    vehicle_id: "",
    route_date: ""
  })

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0]
    setFormData({
      route_name: "",
      driver_id: "",
      vehicle_id: "",
      route_date: today
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createRoute({
        route_name: formData.route_name,
        driver_id: formData.driver_id,
        vehicle_id: formData.vehicle_id && formData.vehicle_id !== "none" ? formData.vehicle_id : undefined,
        route_date: formData.route_date
      })
      toast({
        title: "Éxito",
        description: "Ruta creada correctamente",
      })
      resetForm()
      setIsCreateDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la ruta",
        variant: "destructive",
      })
    }
  }

  const openViewDialog = (route: any) => {
    setViewingRoute(route)
    setIsViewDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "planned":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Planificada</Badge>
      case "in_progress":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">En progreso</Badge>
      case "completed":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completada</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getDriverName = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId)
    return driver ? driver.name : "Conductor no encontrado"
  }

  const getVehicleCode = (vehicleId: string | null) => {
    if (!vehicleId) return "Sin vehículo"
    const vehicle = vehicles.find(v => v.id === vehicleId)
    return vehicle ? vehicle.vehicle_code : "Vehículo no encontrado"
  }

  if (loading) return <div>Cargando rutas...</div>
  if (error) return <div className="text-red-600">Error: {error}</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Rutas</h3>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Ruta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Ruta</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="route_name">Nombre de la ruta *</Label>
                <Input
                  id="route_name"
                  value={formData.route_name}
                  onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                  placeholder="Ej: Ruta Centro - Norte"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driver_id">Conductor *</Label>
                <Select 
                  value={formData.driver_id} 
                  onValueChange={(value) => setFormData({ ...formData, driver_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar conductor" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle_id">Vehículo (opcional)</Label>
                <Select 
                  value={formData.vehicle_id} 
                  onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar vehículo (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin vehículo asignado</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicle_code} {vehicle.driver?.name && `(${vehicle.driver.name})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="route_date">Fecha *</Label>
                <Input
                  id="route_date"
                  type="date"
                  value={formData.route_date}
                  onChange={(e) => setFormData({ ...formData, route_date: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Crear Ruta</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Conductor</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Pedidos</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500">
                  No hay rutas registradas
                </TableCell>
              </TableRow>
            ) : (
              routes.map((route) => (
                <TableRow key={route.id}>
                  <TableCell className="font-medium">{route.route_name}</TableCell>
                  <TableCell>{getDriverName(route.driver_id)}</TableCell>
                  <TableCell>{getVehicleCode(route.vehicle_id)}</TableCell>
                  <TableCell>
                    {new Date(route.route_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(route.status)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {route.route_orders?.length || 0} pedidos
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openViewDialog(route)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Route Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles de Ruta: {viewingRoute?.route_name}</DialogTitle>
          </DialogHeader>
          {viewingRoute && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Conductor:</Label>
                  <p className="text-sm text-gray-600">{getDriverName(viewingRoute.driver_id)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Vehículo:</Label>
                  <p className="text-sm text-gray-600">{getVehicleCode(viewingRoute.vehicle_id)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Fecha:</Label>
                  <p className="text-sm text-gray-600">
                    {new Date(viewingRoute.route_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Estado:</Label>
                  <div className="mt-1">
                    {getStatusBadge(viewingRoute.status)}
                  </div>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Pedidos asignados:</Label>
                {viewingRoute.route_orders && viewingRoute.route_orders.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {viewingRoute.route_orders.map((routeOrder: any, index: number) => (
                      <div key={routeOrder.id} className="p-2 border rounded text-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            Secuencia {routeOrder.delivery_sequence} - 
                            {routeOrder.orders?.clients?.name || "Cliente no encontrado"}
                          </span>
                          <Badge variant="outline">
                            {routeOrder.orders?.order_items?.length || 0} productos
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">No hay pedidos asignados a esta ruta</p>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}