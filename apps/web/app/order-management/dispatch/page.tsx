"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Sidebar } from "@/components/layout/sidebar"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { Truck, Package, CheckCircle, AlertCircle, Calendar, Plus, User, Car, Check, X, Loader2, MapPin, Clock, ChevronUp, ChevronDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

// Import server actions
import {
  getRoutes,
  getRoute,
  getRouteOrders,
  createRoute as createRouteAction,
  updateRoute as updateRouteAction,
  getUnassignedOrders,
  assignOrdersToRoute,
  removeOrderFromRoute as removeOrderAction,
  swapOrderPositions,
  getDispatchStats,
  getDispatchInitData,
  dispatchOrder,
  type RouteListItem,
  type RouteDetail,
  type DispatchStats,
  type VehicleItem,
  type DriverItem,
} from "./actions"

import { batchUpdateItems } from "../actions"

type ViewMode = "routes" | "manage-route" | "dispatch-route"

export default function DispatchPage() {
  const { toast } = useToast()

  // Data state
  const [routes, setRoutes] = useState<RouteListItem[]>([])
  const [currentRouteDetail, setCurrentRouteDetail] = useState<RouteDetail | null>(null)
  const [routeOrdersWithItems, setRouteOrdersWithItems] = useState<any[]>([])
  const [unassignedOrdersList, setUnassignedOrdersList] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<VehicleItem[]>([])
  const [drivers, setDrivers] = useState<DriverItem[]>([])
  const [receivingSchedules, setReceivingSchedules] = useState<any[]>([])
  const [stats, setStats] = useState<DispatchStats | null>(null)

  // UI state
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("routes")
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set())
  const [isAssigning, setIsAssigning] = useState(false)
  const [partialQuantities, setPartialQuantities] = useState<Record<string, number>>({})

  // Dialog state
  const [showCreateRouteDialog, setShowCreateRouteDialog] = useState(false)
  const [showEditRouteDialog, setShowEditRouteDialog] = useState(false)
  const [editingRoute, setEditingRoute] = useState<any>(null)
  const [newRouteData, setNewRouteData] = useState({
    driver_id: "",
    vehicle_id: "",
    route_date: new Date().toISOString().split('T')[0]
  })

  // Fetch all data in a single request
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getDispatchInitData()

      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
        return
      }

      if (result.data) {
        setRoutes(result.data.routes)
        setVehicles(result.data.vehicles)
        setDrivers(result.data.drivers)
        setReceivingSchedules(result.data.receiving_schedules)
        setStats(result.data.stats)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({ title: "Error", description: "Error cargando datos", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Refresh routes
  const refreshRoutes = useCallback(async () => {
    const routesRes = await getRoutes({ status: "planned" })
    if (routesRes.data) setRoutes(routesRes.data.routes)
    const statsRes = await getDispatchStats()
    if (statsRes.data) setStats(statsRes.data)
  }, [])

  // Refresh current route detail
  const refreshCurrentRoute = useCallback(async (routeId: string) => {
    const res = await getRoute(routeId)
    if (res.data) setCurrentRouteDetail(res.data)
  }, [])

  // Load route orders with full item details for dispatch view
  const loadRouteOrdersWithItems = useCallback(async (routeId: string) => {
    const res = await getRouteOrders(routeId)
    if (res.data) {
      setRouteOrdersWithItems(res.data.orders)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handlers
  const handleCreateRoute = async () => {
    try {
      const today = new Date()
      const dateStr = today.toISOString().split('T')[0]

      const result = await createRouteAction({
        route_name: dateStr,
        route_date: newRouteData.route_date,
        driver_id: newRouteData.driver_id || null,
        vehicle_id: newRouteData.vehicle_id || null,
      })

      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
        return
      }

      setShowCreateRouteDialog(false)
      setNewRouteData({
        driver_id: "",
        vehicle_id: "",
        route_date: new Date().toISOString().split('T')[0]
      })
      await refreshRoutes()
      toast({ title: "Ruta creada", description: "Ruta creada exitosamente" })
    } catch (error) {
      toast({ title: "Error", description: "No se pudo crear la ruta", variant: "destructive" })
    }
  }

  const handleUpdateRoute = async () => {
    if (!editingRoute) return

    try {
      const result = await updateRouteAction(editingRoute.id, {
        driver_id: editingRoute.driver_id === "none" ? null : editingRoute.driver_id,
        vehicle_id: editingRoute.vehicle_id === "none" ? null : editingRoute.vehicle_id,
      })

      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
        return
      }

      await refreshRoutes()
      setShowEditRouteDialog(false)
      setEditingRoute(null)
      toast({ title: "Exito", description: "Ruta actualizada correctamente" })
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar la ruta", variant: "destructive" })
    }
  }

  const openEditRouteDialog = (route: RouteListItem) => {
    setEditingRoute({
      id: route.id,
      route_name: route.route_name,
      route_number: route.route_number,
      driver_id: route.driver_id || "none",
      vehicle_id: route.vehicle_id || "none"
    })
    setShowEditRouteDialog(true)
  }

  const handleManageRoute = async (route: RouteListItem) => {
    try {
      const [routeRes, unassignedRes] = await Promise.all([
        getRoute(route.id),
        getUnassignedOrders(),
      ])

      if (routeRes.data) setCurrentRouteDetail(routeRes.data)
      if (unassignedRes.data) setUnassignedOrdersList(unassignedRes.data.orders)

      setViewMode("manage-route")
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los pedidos", variant: "destructive" })
    }
  }

  const handleAssignOrders = async () => {
    if (!currentRouteDetail || selectedOrders.length === 0 || isAssigning) return

    setIsAssigning(true)
    try {
      const result = await assignOrdersToRoute(currentRouteDetail.id, selectedOrders)

      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
        return
      }

      setSelectedOrders([])
      await refreshCurrentRoute(currentRouteDetail.id)
      await loadRouteOrdersWithItems(currentRouteDetail.id)
      await refreshRoutes()
      setViewMode("dispatch-route")
      toast({ title: "Pedidos asignados", description: "Los pedidos se asignaron a la ruta" })
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron asignar los pedidos", variant: "destructive" })
    } finally {
      setIsAssigning(false)
    }
  }

  const handleRemoveOrderFromRoute = async (orderId: string) => {
    if (!currentRouteDetail) return

    try {
      const result = await removeOrderAction(currentRouteDetail.id, orderId)

      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
        return
      }

      await refreshCurrentRoute(currentRouteDetail.id)
      await refreshRoutes()
      toast({ title: "Pedido removido", description: "El pedido fue removido de la ruta" })
    } catch (error) {
      toast({ title: "Error", description: "No se pudo remover el pedido", variant: "destructive" })
    }
  }

  const sendOrderToRoute = async (orderId: string) => {
    if (!currentRouteDetail) return

    try {
      const result = await dispatchOrder(orderId, {
        route_id: currentRouteDetail.id,
        create_inventory_movements: true,
      })

      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
        return
      }

      if (result.data?.inventory_errors && result.data.inventory_errors.length > 0) {
        toast({
          title: "Advertencia",
          description: "Pedido despachado pero hubo errores en el inventario",
          variant: "default",
        })
      } else {
        toast({ title: "Exito", description: "Pedido enviado al conductor" })
      }

      await refreshCurrentRoute(currentRouteDetail.id)
      await refreshRoutes()
    } catch (error) {
      toast({ title: "Error", description: "No se pudo enviar el pedido", variant: "destructive" })
    }
  }

  const handleUpdateItemStatus = async (
    orderId: string,
    itemId: string,
    status: "available" | "unavailable" | "partial",
    quantityRequested: number,
    customQuantity?: number
  ) => {
    setProcessingItems((prev) => new Set(prev).add(itemId))

    try {
      let quantity_available = 0
      if (status === "available") {
        quantity_available = quantityRequested
      } else if (status === "partial") {
        quantity_available = customQuantity !== undefined ? customQuantity : Math.floor(quantityRequested / 2)
      }

      const result = await batchUpdateItems(orderId, [{
        item_id: itemId,
        availability_status: status,
        quantity_available,
      }])

      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
        return
      }

      toast({ title: "Exito", description: "Estado del producto actualizado" })

      // Refresh orders with items to get updated data
      if (currentRouteDetail) {
        await loadRouteOrdersWithItems(currentRouteDetail.id)
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar el estado", variant: "destructive" })
    } finally {
      setProcessingItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  const moveOrderUp = async (currentIndex: number, routeOrderId: string) => {
    if (currentIndex === 0 || !currentRouteDetail) return

    const routeOrders = currentRouteDetail.route_orders || []
    if (currentIndex >= routeOrders.length) return

    const previousRouteOrder = routeOrders[currentIndex - 1]

    try {
      const result = await swapOrderPositions(
        currentRouteDetail.id,
        routeOrderId,
        previousRouteOrder.id
      )

      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
        return
      }

      await refreshCurrentRoute(currentRouteDetail.id)
      toast({ title: "Exito", description: "Secuencia de entrega actualizada" })
    } catch (error) {
      toast({ title: "Error", description: "No se pudo mover el pedido", variant: "destructive" })
    }
  }

  const moveOrderDown = async (currentIndex: number, routeOrderId: string) => {
    if (!currentRouteDetail) return

    const routeOrders = currentRouteDetail.route_orders || []
    if (currentIndex >= routeOrders.length - 1) return

    const nextRouteOrder = routeOrders[currentIndex + 1]

    try {
      const result = await swapOrderPositions(
        currentRouteDetail.id,
        routeOrderId,
        nextRouteOrder.id
      )

      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
        return
      }

      await refreshCurrentRoute(currentRouteDetail.id)
      toast({ title: "Exito", description: "Secuencia de entrega actualizada" })
    } catch (error) {
      toast({ title: "Error", description: "No se pudo mover el pedido", variant: "destructive" })
    }
  }

  // Helpers
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

  const isOrderReadyForRoute = (orderItems: any[]) => {
    return orderItems?.every((item: any) => item.availability_status !== "pending")
  }

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    )
  }

  const handleSelectAll = () => {
    if (selectedOrders.length === unassignedOrdersList.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(unassignedOrdersList.map(order => order.id))
    }
  }

  const getReceivingHoursForDeliveryDate = (branchId: string, deliveryDate: string) => {
    const schedules = receivingSchedules.filter(s => s.branch_id === branchId)
    if (!schedules || schedules.length === 0) return "No configurado"

    const deliveryDay = new Date(deliveryDate).getDay()
    const daySchedules = schedules.filter(schedule => schedule.day_of_week === deliveryDay)

    if (daySchedules.length === 0) return "No configurado"

    return daySchedules
      .map(schedule => `${schedule.start_time.slice(0, 5)} - ${schedule.end_time.slice(0, 5)}`)
      .join(', ')
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </div>
    )
  }

  // Render routes list
  const renderRoutesList = () => (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rutas Activas</p>
                <p className="text-3xl font-bold text-blue-600">{stats?.active_routes || 0}</p>
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
                <p className="text-3xl font-bold text-green-600">{stats?.dispatched_today || 0}</p>
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
                <p className="text-3xl font-bold text-yellow-600">{stats?.unassigned_orders || 0}</p>
              </div>
              <Package className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Routes list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Rutas Activas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {routes.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay rutas activas</p>
              <p className="text-sm text-gray-500">Crea una nueva ruta para comenzar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {routes.map((route) => (
                <div key={route.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold text-lg">
                        {route.route_number ? `Ruta #${route.route_number} - ${route.route_name}` : route.route_name}
                      </h3>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>{route.route_date}</span>
                          <span className="mx-2">-</span>
                          <Package className="h-4 w-4" />
                          <span>{route.orders_count} pedidos</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openEditRouteDialog(route)}
                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <User className="h-4 w-4" />
                            <span>{route.driver_name || "Asignar conductor"}</span>
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => openEditRouteDialog(route)}
                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <Car className="h-4 w-4" />
                            <span>{route.vehicle_code || "Asignar vehiculo"}</span>
                          </button>
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
                      {route.orders_count > 0 && (
                        <Button
                          onClick={async () => {
                            const res = await getRoute(route.id)
                            if (res.data) {
                              setCurrentRouteDetail(res.data)
                              await loadRouteOrdersWithItems(route.id)
                              setViewMode("dispatch-route")
                            }
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  // Render manage route view
  const renderManageRoute = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="outline" onClick={() => setViewMode("routes")}>
              ← Volver
            </Button>
            <h2 className="text-2xl font-bold">
              {currentRouteDetail?.route_number
                ? `Ruta #${currentRouteDetail.route_number} - ${currentRouteDetail.route_name}`
                : currentRouteDetail?.route_name}
            </h2>
          </div>
          <p className="text-gray-600">Gestiona los pedidos asignados a esta ruta</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Available Orders */}
        <Card className="h-fit">
          <CardHeader className="bg-blue-50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Package className="h-5 w-5" />
                Pedidos Disponibles
              </CardTitle>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {unassignedOrdersList.length}
              </Badge>
            </div>
            {unassignedOrdersList.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={selectedOrders.length === unassignedOrdersList.length && unassignedOrdersList.length > 0}
                  onChange={handleSelectAll}
                  className="rounded"
                />
                <span className="text-sm text-blue-800">Seleccionar todos</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-4 max-h-[600px] overflow-y-auto">
            {unassignedOrdersList.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No hay pedidos disponibles</p>
                <p className="text-sm text-gray-500">Todos los pedidos estan asignados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {unassignedOrdersList.map((order) => (
                  <div
                    key={order.id}
                    className={`border rounded-lg p-3 transition-all cursor-pointer hover:shadow-md ${
                      selectedOrders.includes(order.id) ? 'bg-blue-50 border-blue-300' : 'bg-white'
                    }`}
                    onClick={() => handleSelectOrder(order.id)}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => handleSelectOrder(order.id)}
                        className="mt-1 rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{order.order_number}</span>
                          <Badge variant="outline" className="text-xs">
                            {order.order_items?.length || 0} items
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-700">{order.client?.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(order.expected_delivery_date).toLocaleDateString('es-ES')}</span>
                        </div>
                        {order.branch && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <MapPin className="h-3 w-3" />
                            <span>{order.branch.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          {selectedOrders.length > 0 && (
            <div className="p-4 border-t bg-gray-50">
              <Button
                onClick={handleAssignOrders}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isAssigning}
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Asignando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Asignar {selectedOrders.length} pedido{selectedOrders.length > 1 ? 's' : ''} →
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>

        {/* Right: Assigned Orders */}
        <Card className="h-fit">
          <CardHeader className="bg-green-50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-green-900">
                <Truck className="h-5 w-5" />
                Pedidos Asignados
              </CardTitle>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {currentRouteDetail?.route_orders?.length || 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 max-h-[600px] overflow-y-auto">
            {!currentRouteDetail?.route_orders || currentRouteDetail.route_orders.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No hay pedidos asignados</p>
                <p className="text-sm text-gray-500">Selecciona pedidos de la izquierda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentRouteDetail.route_orders.map((routeOrder) => (
                  <div
                    key={routeOrder.id}
                    className="border rounded-lg p-3 bg-white hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{routeOrder.order_number}</span>
                          <Badge variant="outline" className="text-xs">
                            {routeOrder.items_count || 0} items
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-700">{routeOrder.client_name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span>{routeOrder.expected_delivery_date ? new Date(routeOrder.expected_delivery_date).toLocaleDateString('es-ES') : ''}</span>
                        </div>
                        {routeOrder.branch_name && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <MapPin className="h-3 w-3" />
                            <span>{routeOrder.branch_name}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveOrderFromRoute(routeOrder.order_id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          {currentRouteDetail?.route_orders && currentRouteDetail.route_orders.length > 0 && (
            <div className="p-4 border-t bg-gray-50">
              <Button
                onClick={async () => {
                  await loadRouteOrdersWithItems(currentRouteDetail.id)
                  setViewMode("dispatch-route")
                }}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Truck className="h-4 w-4 mr-2" />
                Ir a Despachar
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )

  // Render dispatch route view
  const renderDispatchRoute = () => {
    // Use orders with full item details
    const ordersToDispatch = routeOrdersWithItems.filter(o => o.status === "ready_dispatch")

    return (
      <div className="space-y-6">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setViewMode("routes")} size="sm">
              ← Volver
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">
            Despacho - {currentRouteDetail?.route_number
              ? `Ruta #${currentRouteDetail.route_number} - ${currentRouteDetail.route_name}`
              : currentRouteDetail?.route_name}
          </h1>
          <p className="text-gray-600">Despacha productos por pedido para la ruta</p>
        </div>

        <div className="space-y-6">
          {ordersToDispatch.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pedidos para despachar</h3>
                <p className="text-gray-600">Todos los pedidos ya fueron despachados o no hay pedidos asignados.</p>
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
            ordersToDispatch.map((order, index) => {
              const orderItems = order.order_items || []
              const isReady = orderItems.every((item: any) => item.availability_status && item.availability_status !== "pending")

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
                          disabled={index === ordersToDispatch.length - 1}
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
                          {order.branch?.name
                            ? `${order.client?.name} - ${order.branch.name}`
                            : order.client?.name}
                        </h3>

                        <p className="text-sm text-gray-600">
                          Entrega: {order.expected_delivery_date}
                        </p>

                        {order.branch?.address && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <MapPin className="h-3 w-3" />
                            <span>{order.branch.address}</span>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => {
                          if (!isReady) {
                            toast({
                              title: "Error",
                              description: "Todos los productos deben tener su disponibilidad confirmada",
                              variant: "destructive",
                            })
                            return
                          }
                          
                          const missingDriver = !currentRouteDetail?.driver_id
                          const missingVehicle = !currentRouteDetail?.vehicle_id
                          
                          if (missingDriver || missingVehicle) {
                            let missingItems = []
                            if (missingDriver) missingItems.push("conductor")
                            if (missingVehicle) missingItems.push("vehículo")
                            
                            toast({
                              title: "Error",
                              description: `Se debe asignar ${missingItems.join(" y ")} a la ruta`,
                              variant: "destructive",
                            })
                            return
                          }
                          sendOrderToRoute(order.id)
                        }}
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
                        {orderItems.map((item: any) => (
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
                                  value={partialQuantities[item.id] ?? item.quantity_available ?? 0}
                                  onChange={(e) => {
                                    const newQty = Number.parseInt(e.target.value) || 0
                                    setPartialQuantities((prev) => ({
                                      ...prev,
                                      [item.id]: newQty,
                                    }))
                                  }}
                                  onBlur={async () => {
                                    const qty = partialQuantities[item.id] ?? item.quantity_available ?? 0
                                    await handleUpdateItemStatus(order.id, item.id, "partial", item.quantity_requested, qty)
                                    setPartialQuantities((prev) => {
                                      const newState = { ...prev }
                                      delete newState[item.id]
                                      return newState
                                    })
                                  }}
                                  onKeyDown={async (e) => {
                                    if (e.key === "Enter") {
                                      const qty = partialQuantities[item.id] ?? item.quantity_available ?? 0
                                      await handleUpdateItemStatus(order.id, item.id, "partial", item.quantity_requested, qty)
                                      setPartialQuantities((prev) => {
                                        const newState = { ...prev }
                                        delete newState[item.id]
                                        return newState
                                      })
                                    }
                                  }}
                                  className="w-20"
                                  max={item.quantity_requested}
                                  min={0}
                                />
                              ) : (
                                <span>{item.quantity_available ?? item.quantity_requested}</span>
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
                                  onClick={() => handleUpdateItemStatus(order.id, item.id, "available", item.quantity_requested)}
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
                                  onClick={() => handleUpdateItemStatus(order.id, item.id, "unavailable", item.quantity_requested)}
                                  className="text-red-600 hover:text-red-700"
                                  disabled={processingItems.has(item.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateItemStatus(order.id, item.id, "partial", item.quantity_requested)}
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
      requiredRoles={['super_admin', 'administrator', 'coordinador_logistico', 'dispatcher']}
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
                      {viewMode === "routes" && "Gestiona rutas y asignacion de pedidos"}
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

              {/* Content */}
              {viewMode === "routes" && renderRoutesList()}
              {viewMode === "manage-route" && renderManageRoute()}
              {viewMode === "dispatch-route" && renderDispatchRoute()}

              {/* Create Route Dialog */}
              <Dialog open={showCreateRouteDialog} onOpenChange={setShowCreateRouteDialog}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Crear Nueva Ruta</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
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
                      <Label htmlFor="vehicle_id">Vehiculo (Opcional)</Label>
                      <Select
                        value={newRouteData.vehicle_id}
                        onValueChange={(value) => setNewRouteData(prev => ({ ...prev, vehicle_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar vehiculo (opcional)" />
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

              {/* Edit Route Dialog */}
              <Dialog open={showEditRouteDialog} onOpenChange={setShowEditRouteDialog}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      Asignar Conductor y Vehiculo
                      {editingRoute?.route_number && (
                        <span className="text-sm font-normal text-gray-600 ml-2">
                          - Ruta #{editingRoute.route_number}
                        </span>
                      )}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit_driver_id">Conductor</Label>
                      <Select
                        value={editingRoute?.driver_id || "none"}
                        onValueChange={(value) => setEditingRoute((prev: any) => ({ ...prev, driver_id: value === "none" ? null : value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar conductor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin conductor</SelectItem>
                          {drivers.map((driver) => (
                            <SelectItem key={driver.id} value={driver.id}>
                              {driver.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit_vehicle_id">Vehiculo</Label>
                      <Select
                        value={editingRoute?.vehicle_id || "none"}
                        onValueChange={(value) => setEditingRoute((prev: any) => ({ ...prev, vehicle_id: value === "none" ? null : value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar vehiculo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin vehiculo</SelectItem>
                          {vehicles.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.vehicle_code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                      <Button variant="outline" onClick={() => setShowEditRouteDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleUpdateRoute} className="bg-blue-600">
                        Guardar Cambios
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
