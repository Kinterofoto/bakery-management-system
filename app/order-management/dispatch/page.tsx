"use client"

import { useOrders } from "@/hooks/use-orders"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Sidebar } from "@/components/layout/sidebar"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { Truck, Package, CheckCircle, AlertCircle, Eye, Calendar, Plus, User, Car, Check, X, Loader2, MapPin, Clock, ChevronUp, ChevronDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useRoutes } from "@/hooks/use-routes"
import { useVehicles } from "@/hooks/use-vehicles"
import { useDrivers } from "@/hooks/use-drivers"
import { useClientFrequencies } from "@/hooks/use-client-frequencies"
import { useReceivingSchedules } from "@/hooks/use-receiving-schedules"
import { supabase } from "@/lib/supabase"

type ViewMode = "routes" | "manage-route" | "dispatch-route"

export default function DispatchPage() {
  const { orders, loading, updateOrderStatus, updateItemAvailability, refetch: refetchOrders } = useOrders()
  const { routes, createRoute, assignMultipleOrdersToRoute, removeOrderFromRoute, updateRouteAssignments, getUnassignedOrders, refetch: refetchRoutes } = useRoutes()
  const { vehicles } = useVehicles()
  const { drivers } = useDrivers()
  const { getFrequenciesForBranch } = useClientFrequencies()
  const { getSchedulesByBranch } = useReceivingSchedules()
  const { toast } = useToast()

  // Estados para el flujo de rutas
  const [viewMode, setViewMode] = useState<ViewMode>("routes")
  const [currentRoute, setCurrentRoute] = useState<any>(null)
  const [unassignedOrders, setUnassignedOrders] = useState<any[]>([])
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])

  // Estados para crear ruta
  const [showCreateRouteDialog, setShowCreateRouteDialog] = useState(false)
  const [newRouteData, setNewRouteData] = useState({
    driver_id: "",
    vehicle_id: "",
    route_date: new Date().toISOString().split('T')[0]
  })

  // Filtrar rutas activas (planned)
  const activeRoutes = routes.filter(route => route.status === "planned")

  // Filtrar pedidos despachados hoy para stats
  const dispatchedOrders = orders.filter(order => {
    const isDispatchedStatus = order.status === "in_delivery" || order.status === "dispatched"
    if (!isDispatchedStatus) return false

    const now = new Date()
    const bogotaTime = new Date(now.getTime() - 5 * 60 * 60 * 1000)
    const orderDate = new Date(order.updated_at)
    const orderBogotaTime = new Date(orderDate.getTime() - 5 * 60 * 60 * 1000)

    return bogotaTime.toDateString() === orderBogotaTime.toDateString()
  })

  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set())

  // Generar nombre automático para la ruta
  const generateRouteName = () => {
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]
    const routeNumber = routes.length + 1
    return `Ruta ${dateStr} #${routeNumber}`
  }

  // Funciones del flujo
  const handleCreateRoute = async () => {
    try {
      const routeName = generateRouteName()

      await createRoute({
        route_name: routeName,
        driver_id: newRouteData.driver_id || null,
        vehicle_id: newRouteData.vehicle_id || null,
        route_date: newRouteData.route_date
      })

      setShowCreateRouteDialog(false)
      setNewRouteData({
        driver_id: "",
        vehicle_id: "",
        route_date: new Date().toISOString().split('T')[0]
      })
      toast({ title: "Ruta creada", description: `Ruta "${routeName}" creada exitosamente` })
    } catch (error) {
      toast({ title: "Error", description: "No se pudo crear la ruta", variant: "destructive" })
    }
  }

  const handleManageRoute = async (route: any) => {
    setCurrentRoute(route)
    setViewMode("manage-route")
    try {
      const orders = await getUnassignedOrders()
      setUnassignedOrders(orders)
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los pedidos", variant: "destructive" })
    }
  }

  const handleAssignOrders = async () => {
    if (!currentRoute || selectedOrders.length === 0) return

    try {
      await assignMultipleOrdersToRoute(currentRoute.id, selectedOrders)
      setSelectedOrders([])
      await refetchRoutes()
      setViewMode("dispatch-route")
      toast({ title: "Pedidos asignados", description: "Los pedidos se asignaron a la ruta" })
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron asignar los pedidos", variant: "destructive" })
    }
  }

  const handleRemoveOrderFromRoute = async (orderId: string) => {
    if (!currentRoute) return

    try {
      await removeOrderFromRoute(currentRoute.id, orderId)
      await refetchRoutes()
      toast({ title: "Pedido removido", description: "El pedido fue removido de la ruta" })
    } catch (error) {
      toast({ title: "Error", description: "No se pudo remover el pedido", variant: "destructive" })
    }
  }

  const sendOrderToRoute = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, "dispatched")
      toast({
        title: "Éxito",
        description: "Pedido enviado al conductor",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar el pedido",
        variant: "destructive",
      })
    }
  }

  const getDispatchStatusBadge = (item: any) => {
    const availability_status = item.availability_status || "pending"

    if (availability_status === "unavailable") {
      return { label: "No Disponible", color: "bg-red-100 text-red-800" }
    }
    if (availability_status === "available") {
      return { label: "Disponible", color: "bg-green-100 text-green-800" }
    }
    if (availability_status === "partial") {
      return { label: "Parcial", color: "bg-yellow-100 text-yellow-800" }
    }
    return { label: "Pendiente", color: "bg-gray-100 text-gray-800" }
  }

  const handleUpdateItemStatus = async (
    orderId: string,
    itemId: string,
    status: "available" | "unavailable" | "partial",
  ) => {
    setProcessingItems((prev) => new Set(prev).add(itemId))

    try {
      const order = orders.find(o => o.id === orderId)
      const item = order?.order_items?.find(i => i.id === itemId)

      if (!item) {
        console.error("Item not found:", { orderId, itemId })
        return
      }

      let quantity_available = 0
      if (status === "available") {
        quantity_available = item.quantity_requested
      } else if (status === "partial") {
        quantity_available = Math.floor(item.quantity_requested / 2)
      } else if (status === "unavailable") {
        quantity_available = 0
      }

      await updateItemAvailability(itemId, status, quantity_available)

      toast({
        title: "Éxito",
        description: "Estado del producto actualizado",
      })
    } catch (error) {
      console.error("Error updating item status:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      })
    } finally {
      setProcessingItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  const isOrderReadyForRoute = (order: any) => {
    return order.order_items?.every((item: any) => item.availability_status !== "pending")
  }

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    )
  }

  const handleSelectAll = () => {
    if (selectedOrders.length === unassignedOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(unassignedOrders.map(order => order.id))
    }
  }

  // Función para actualizar la secuencia de entrega
  const moveOrderUp = async (currentIndex: number, routeOrderId: string) => {
    if (currentIndex === 0 || !currentRoute) return

    try {
      const routeOrdersData = (currentRoute?.route_orders || [])
        .filter((ro: any) => ro.order_id)
        .sort((a: any, b: any) => (a.delivery_sequence || 0) - (b.delivery_sequence || 0))

      const currentRouteOrder = routeOrdersData[currentIndex]
      const previousRouteOrder = routeOrdersData[currentIndex - 1]

      if (currentRouteOrder && previousRouteOrder) {
        const currentSequence = currentRouteOrder.delivery_sequence || (currentIndex + 1)
        const previousSequence = previousRouteOrder.delivery_sequence || currentIndex

        await supabase
          .from("route_orders")
          .update({ delivery_sequence: previousSequence })
          .eq("id", currentRouteOrder.id)

        await supabase
          .from("route_orders")
          .update({ delivery_sequence: currentSequence })
          .eq("id", previousRouteOrder.id)

        await refetchRoutes()
        toast({ title: "Éxito", description: "Secuencia de entrega actualizada" })
      }
    } catch (error) {
      console.error("Error moving order up:", error)
      toast({ title: "Error", description: "No se pudo mover el pedido", variant: "destructive" })
    }
  }

  const moveOrderDown = async (currentIndex: number, routeOrderId: string) => {
    if (!currentRoute) return

    const routeOrdersData = (currentRoute?.route_orders || [])
      .filter((ro: any) => ro.order_id)
      .sort((a: any, b: any) => (a.delivery_sequence || 0) - (b.delivery_sequence || 0))

    if (currentIndex === routeOrdersData.length - 1) return

    try {
      const currentRouteOrder = routeOrdersData[currentIndex]
      const nextRouteOrder = routeOrdersData[currentIndex + 1]

      if (currentRouteOrder && nextRouteOrder) {
        const currentSequence = currentRouteOrder.delivery_sequence || (currentIndex + 1)
        const nextSequence = nextRouteOrder.delivery_sequence || (currentIndex + 2)

        await supabase
          .from("route_orders")
          .update({ delivery_sequence: nextSequence })
          .eq("id", currentRouteOrder.id)

        await supabase
          .from("route_orders")
          .update({ delivery_sequence: currentSequence })
          .eq("id", nextRouteOrder.id)

        await refetchRoutes()
        toast({ title: "Éxito", description: "Secuencia de entrega actualizada" })
      }
    } catch (error) {
      console.error("Error moving order down:", error)
      toast({ title: "Error", description: "No se pudo mover el pedido", variant: "destructive" })
    }
  }

  useEffect(() => {
    refetchRoutes()
  }, [])

  useEffect(() => {
    if (currentRoute && routes.length > 0) {
      const updatedRoute = routes.find(r => r.id === currentRoute.id)
      if (updatedRoute && JSON.stringify(updatedRoute) !== JSON.stringify(currentRoute)) {
        setCurrentRoute(updatedRoute)
      }
    }
  }, [routes])

  const getRouteInfo = (route: any) => {
    const driver = drivers.find(d => d.id === route.driver_id)
    const vehicle = vehicles.find(v => v.id === route.vehicle_id)
    return { driver, vehicle }
  }

  const getReceivingHoursForDeliveryDate = (schedules: any[], deliveryDate: string) => {
    if (!schedules || schedules.length === 0) return "No configurado"

    const deliveryDay = new Date(deliveryDate).getDay()
    const daySchedules = schedules.filter(schedule => schedule.day_of_week === deliveryDay)

    if (daySchedules.length === 0) return "No configurado"

    return daySchedules
      .map(schedule => `${schedule.start_time.slice(0,5)} - ${schedule.end_time.slice(0,5)}`)
      .join(', ')
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <span className="text-gray-500">Cargando...</span>
        </div>
      </div>
    )
  }

  // Render de lista de rutas
  const renderRoutesList = () => (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rutas Activas</p>
                <p className="text-3xl font-bold text-blue-600">{activeRoutes.length}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pedidos Despachados Hoy</p>
                <p className="text-3xl font-bold text-green-600">{dispatchedOrders.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pedidos Sin Asignar</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {orders.filter(o => o.status === "ready_dispatch" && !o.assigned_route_id).length}
                </p>
              </div>
              <Package className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de rutas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Rutas Activas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeRoutes.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay rutas activas</p>
              <p className="text-sm text-gray-500">Crea una nueva ruta para comenzar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeRoutes.map((route) => {
                const { driver, vehicle } = getRouteInfo(route)
                const routeOrdersCount = route.route_orders?.length || 0
                return (
                  <div key={route.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold text-lg">
                          {route.route_name || `Ruta #${route.route_number}`}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{route.route_date}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{driver?.name || "Sin conductor"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Car className="h-4 w-4" />
                            <span>{vehicle?.vehicle_code || "Sin vehículo"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            <span>{routeOrdersCount} pedidos</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleManageRoute(route)}
                          size="sm"
                        >
                          Gestionar Pedidos
                        </Button>
                        {routeOrdersCount > 0 && (
                          <Button
                            onClick={() => {
                              setCurrentRoute(route)
                              setViewMode("dispatch-route")
                            }}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Despachar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  // Continúa en el siguiente mensaje debido al límite de longitud
  const renderManageRoute = () => (
    <div className="space-y-6">
      {/* Header de la ruta */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="outline" onClick={() => setViewMode("routes")}>
              ← Volver
            </Button>
            <h2 className="text-2xl font-bold">{currentRoute?.route_name || `Ruta #${currentRoute?.route_number}`}</h2>
          </div>
          <p className="text-gray-600">Gestiona los pedidos asignados a esta ruta</p>
        </div>
        {selectedOrders.length > 0 && (
          <Button onClick={handleAssignOrders} className="bg-blue-600">
            Asignar {selectedOrders.length} pedidos
          </Button>
        )}
      </div>

      {/* Pedidos ya asignados */}
      {currentRoute?.route_orders && currentRoute.route_orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pedidos Asignados ({currentRoute.route_orders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentRoute.route_orders.map((routeOrder: any) => {
                if (!routeOrder.orders) return null
                const order = routeOrder.orders
                return (
                  <div key={order.id} className="flex items-center justify-between border rounded p-3">
                    <div>
                      <span className="font-medium">{order.order_number}</span>
                      <span className="text-sm text-gray-600 ml-2">- {order.clients?.name}</span>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveOrderFromRoute(order.id)}
                    >
                      Remover
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de pedidos disponibles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Pedidos Disponibles ({unassignedOrders.length})
            </CardTitle>
            {unassignedOrders.length > 0 && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedOrders.length === unassignedOrders.length && unassignedOrders.length > 0}
                  onChange={handleSelectAll}
                />
                <span className="text-sm">Seleccionar todos</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {unassignedOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay pedidos disponibles para asignar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {unassignedOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => handleSelectOrder(order.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{order.order_number}</span>
                      </div>
                      <h3 className="text-lg font-semibold">{order.clients?.name}</h3>
                      <div className="text-sm text-gray-600">
                        <p>Fecha de entrega: {order.expected_delivery_date}</p>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">{order.order_items?.length || 0} productos</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderDispatchRoute = () => {
    const routeOrdersData = (currentRoute?.route_orders || [])
      .filter((ro: any) => ro.order_id)
      .sort((a: any, b: any) => (a.delivery_sequence || 0) - (b.delivery_sequence || 0))

    const routeOrders = routeOrdersData
      .map((routeOrder: any) => {
        const order = orders.find(o => o.id === routeOrder.order_id && o.status === "ready_dispatch")
        if (order) {
          return {
            ...order,
            route_order_id: routeOrder.id,
            delivery_sequence: routeOrder.delivery_sequence || 0
          }
        }
        return null
      })
      .filter(Boolean)

    return (
      <div className="space-y-6">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setViewMode("routes")} size="sm">
              ← Volver
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">
            Despacho - {currentRoute?.route_name || `Ruta #${currentRoute?.route_number}`}
          </h1>
          <p className="text-gray-600">Despacha productos por pedido para la ruta</p>
        </div>

        <div className="space-y-6">
          {routeOrders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pedidos asignados</h3>
                <p className="text-gray-600">Asigna pedidos a esta ruta para comenzar el despacho.</p>
                <Button
                  variant="outline"
                  onClick={() => setViewMode("manage-route")}
                  className="mt-4"
                >
                  Asignar Pedidos
                </Button>
              </CardContent>
            </Card>
          ) : (
            routeOrders.map((order, index) => {
              if (!order) return null

              return (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1 mr-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => moveOrderUp(index, order.route_order_id)}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => moveOrderDown(index, order.route_order_id)}
                          disabled={index === routeOrders.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
                            #{order.delivery_sequence || (index + 1)}
                          </div>
                          <Package className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-600">{order.order_number}</span>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900">
                          {order.branch?.name ? `${order.client?.name} - ${order.branch.name}` : order.client?.name}
                        </h3>

                        <p className="text-sm text-gray-600">Entrega: {order.expected_delivery_date}</p>

                        {order.branch?.address && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <MapPin className="h-3 w-3" />
                            <span>{order.branch.address}</span>
                          </div>
                        )}

                        {order.branch_id && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Clock className="h-3 w-3" />
                            <span>{getReceivingHoursForDeliveryDate(getSchedulesByBranch(order.branch_id), order.expected_delivery_date)}</span>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => sendOrderToRoute(order.id)}
                        disabled={!isOrderReadyForRoute(order)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Enviar a Ruta
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Solicitado</TableHead>
                          <TableHead>Disponible</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.order_items?.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.product?.name}
                              {item.product?.weight && ` - ${item.product.weight}g`}
                            </TableCell>
                            <TableCell>{item.quantity_requested}</TableCell>
                            <TableCell>
                              {item.availability_status === "partial" ? (
                                <Input
                                  type="number"
                                  value={item.quantity_available || 0}
                                  onChange={async (e) => {
                                    const newQty = Number.parseInt(e.target.value) || 0
                                    await updateItemAvailability(item.id, "partial", newQty)
                                  }}
                                  className="w-20"
                                  max={item.quantity_requested}
                                  min={0}
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  {item.quantity_available || 0}
                                  {item.quantity_available !== item.quantity_requested && (
                                    <Badge
                                      variant="outline"
                                      className={item.quantity_available < item.quantity_requested ? "text-red-600" : "text-green-600"}
                                    >
                                      {item.quantity_available - item.quantity_requested > 0 ? "+" : ""}
                                      {(item.quantity_available || 0) - item.quantity_requested}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={getDispatchStatusBadge(item).color}>
                                {getDispatchStatusBadge(item).label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateItemStatus(order.id, item.id, "available")}
                                  className="text-green-600 hover:text-green-700"
                                  disabled={processingItems.has(item.id)}
                                >
                                  {processingItems.has(item.id) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateItemStatus(order.id, item.id, "unavailable")}
                                  className="text-red-600 hover:text-red-700"
                                  disabled={processingItems.has(item.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateItemStatus(order.id, item.id, "partial")}
                                  className="text-yellow-600 hover:text-yellow-700"
                                  disabled={processingItems.has(item.id)}
                                >
                                  <AlertCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    )
  }

  return (
    <RouteGuard
      requiredPermissions={['order_management_dispatch']}
      requiredRoles={['administrator', 'coordinador_logistico', 'dispatcher']}
    >
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Centro de Despacho</h1>
                    <p className="text-gray-600">
                      {viewMode === "routes" && "Gestiona rutas y asignación de pedidos"}
                      {viewMode === "manage-route" && "Gestiona pedidos de la ruta"}
                      {viewMode === "dispatch-route" && "Despacha pedidos de la ruta"}
                    </p>
                  </div>
                  {viewMode === "routes" && (
                    <Button onClick={() => setShowCreateRouteDialog(true)} className="bg-blue-600">
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Ruta
                    </Button>
                  )}
                </div>
              </div>

              {/* Contenido según vista */}
              {viewMode === "routes" && renderRoutesList()}
              {viewMode === "manage-route" && renderManageRoute()}
              {viewMode === "dispatch-route" && renderDispatchRoute()}

              {/* Modal para crear ruta */}
              <Dialog open={showCreateRouteDialog} onOpenChange={setShowCreateRouteDialog}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Crear Nueva Ruta</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nombre (Auto-generado)</Label>
                      <Input
                        value={generateRouteName()}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="route_date">Fecha</Label>
                      <Input
                        id="route_date"
                        type="date"
                        value={newRouteData.route_date}
                        onChange={(e) => setNewRouteData(prev => ({ ...prev, route_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="driver_id">Conductor (Opcional)</Label>
                      <Select
                        value={newRouteData.driver_id}
                        onValueChange={(value) => setNewRouteData(prev => ({ ...prev, driver_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar conductor (opcional)" />
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
                    <div>
                      <Label htmlFor="vehicle_id">Vehículo (Opcional)</Label>
                      <Select
                        value={newRouteData.vehicle_id}
                        onValueChange={(value) => setNewRouteData(prev => ({ ...prev, vehicle_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar vehículo (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicles.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.vehicle_code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                      <Button variant="outline" onClick={() => setShowCreateRouteDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateRoute} className="bg-blue-600">
                        Crear Ruta
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </main>
        </div>
      </div>
    </RouteGuard>
  )
}
