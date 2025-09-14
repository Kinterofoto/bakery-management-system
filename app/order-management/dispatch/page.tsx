"use client"

import { useOrders } from "@/hooks/use-orders"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Sidebar } from "@/components/layout/sidebar"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { Truck, Package, CheckCircle, AlertTriangle, AlertCircle, Eye, Calendar, Plus, User, Car, Check, X, Loader2, MapPin, Clock, ChevronUp, ChevronDown, FileSpreadsheet, Download, History, CheckSquare, Square } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useRoutes } from "@/hooks/use-routes"
import { useVehicles } from "@/hooks/use-vehicles"
import { useDrivers } from "@/hooks/use-drivers"
import { useClientFrequencies } from "@/hooks/use-client-frequencies"
import { useReceivingSchedules } from "@/hooks/use-receiving-schedules"
import { useWorldOfficeExport } from "@/hooks/use-world-office-export"
import { useMultiRouteExport } from "@/hooks/use-multi-route-export"
import { useExportHistory } from "@/hooks/use-export-history"
import { useRemisions } from "@/hooks/use-remisions"
import { useNonInvoicedOrders } from "@/hooks/use-non-invoiced-orders"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"

type ViewMode = "routes" | "manage-route" | "dispatch-route"

export default function DispatchPage() {
  const { orders, loading, updateOrderStatus, updateItemDispatched, updateItemAvailability, refetch: refetchOrders } = useOrders()
  const { routes, createRoute, assignMultipleOrdersToRoute, getUnassignedOrders, refetch: refetchRoutes } = useRoutes()
  const { vehicles } = useVehicles()
  const { drivers } = useDrivers()
  const { getFrequenciesForBranch } = useClientFrequencies()
  const { getSchedulesByBranch } = useReceivingSchedules()
  const { exportToXLSX, exporting } = useWorldOfficeExport()
  const { 
    selectedRoutes,
    isExporting: isMultiExporting,
    exportSummary,
    toggleRouteSelection,
    selectAllRoutes,
    deselectAllRoutes,
    getSelectedRouteCount,
    generateExportSummary,
    executeExport,
    validateSelection
  } = useMultiRouteExport()
  const {
    exportHistory,
    loading: historyLoading,
    downloadExportFile,
    getExportStatistics
  } = useExportHistory()
  const {
    remisions,
    loading: remisionsLoading,
    downloadRemisionPDF,
    refetch: refetchRemisions
  } = useRemisions()
  const {
    nonInvoicedOrders,
    loading: nonInvoicedLoading,
    isInvoicing,
    selectedOrders: selectedNonInvoicedOrders,
    toggleOrderSelection,
    selectAllOrders: selectAllNonInvoicedOrders,
    getSelectedOrderCount: getSelectedNonInvoicedCount,
    generateInvoiceFromRemisionSummary,
    invoiceSelectedRemisionOrders,
    refetch: refetchNonInvoicedOrders
  } = useNonInvoicedOrders()
  const { toast } = useToast()
  const { user } = useAuth()

  // Estados para el nuevo flujo
  const [viewMode, setViewMode] = useState<ViewMode>("routes")
  const [currentRoute, setCurrentRoute] = useState<any>(null)
  const [unassignedOrders, setUnassignedOrders] = useState<any[]>([])
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  
  // Estados para pestañas
  const [activeTab, setActiveTab] = useState<"active-routes" | "export-history" | "remisions" | "non-invoiced-orders">("active-routes")
  const [showExportConfirmation, setShowExportConfirmation] = useState(false)
  const [showRemisionInvoiceConfirmation, setShowRemisionInvoiceConfirmation] = useState(false)

  // Estados para crear ruta
  const [showCreateRouteDialog, setShowCreateRouteDialog] = useState(false)
  const [newRouteData, setNewRouteData] = useState({
    route_name: "",
    driver_id: "",
    vehicle_id: "",
    route_date: new Date().toISOString().split('T')[0]
  })

  // Filtrar rutas activas (planned) y que tengan pedidos listos para despacho
  const activeRoutes = routes.filter(route => {
    if (route.status !== "planned") return false
    
    // Include routes that have no orders or have orders ready for dispatch
    const routeOrders = route.route_orders || []
    return routeOrders.length === 0 || routeOrders.some((ro: any) => 
      ro.orders && ro.orders.status === "ready_dispatch"
    )
  })
  
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

  // Función para exportar a World Office
  const handleExportToWorldOffice = async () => {
    // Filter orders ready for dispatch with available quantities > 0
    const exportableOrders = orders.filter(order => {
      if (order.status !== "ready_dispatch") return false
      
      // Check if order has items with available quantity > 0
      return order.order_items?.some((item: any) => 
        (item.availability_status === "available" || 
         item.availability_status === "partial") && 
        item.quantity_available > 0
      )
    })

    if (exportableOrders.length === 0) {
      toast({
        title: "No hay pedidos",
        description: "No hay pedidos listos para exportar con cantidades disponibles",
        variant: "destructive",
      })
      return
    }

    await exportToXLSX(exportableOrders)
  }

  // Función para manejar exportación múltiple
  const handleMultiRouteExport = async () => {
    if (getSelectedRouteCount() === 0) {
      toast({
        title: "No hay selección",
        description: "Selecciona al menos una ruta para exportar",
        variant: "destructive"
      })
      return
    }

    // Generate summary for confirmation
    await generateExportSummary(activeRoutes)
    setShowExportConfirmation(true)
  }

  const confirmMultiRouteExport = async () => {
    try {
      if (!user) {
        toast({
          title: "Error de autenticación",
          description: "No se pudo obtener la información del usuario",
          variant: "destructive"
        })
        return
      }

      await executeExport(user, activeRoutes)
      setShowExportConfirmation(false)

      // Refetch routes to update with latest invoice status
      refetchRoutes()
    } catch (error) {
      // Error is handled in executeExport
    }
  }

  const handleInvoiceNonInvoicedOrders = () => {
    if (getSelectedNonInvoicedCount() === 0) {
      toast({
        title: "No hay selección",
        description: "Selecciona al menos un pedido remisionado para facturar",
        variant: "destructive"
      })
      return
    }

    setShowRemisionInvoiceConfirmation(true)
  }

  const confirmRemisionInvoicing = async () => {
    try {
      if (!user) {
        toast({
          title: "Error de autenticación",
          description: "No se pudo obtener la información del usuario",
          variant: "destructive"
        })
        return
      }

      await invoiceSelectedRemisionOrders(user)
      setShowRemisionInvoiceConfirmation(false)

      // Refresh data
      refetchNonInvoicedOrders()
    } catch (error) {
      // Error is handled in invoiceSelectedRemisionOrders
    }
  }

  const handleSelectAllRoutes = () => {
    if (getSelectedRouteCount() === activeRoutes.length) {
      deselectAllRoutes()
    } else {
      selectAllRoutes(activeRoutes.map(route => route.id))
    }
  }

  // Funciones del nuevo flujo
  const handleCreateRoute = async () => {
    try {
      await createRoute(newRouteData)
      setShowCreateRouteDialog(false)
      setNewRouteData({
        route_name: "",
        driver_id: "",
        vehicle_id: "",
        route_date: new Date().toISOString().split('T')[0]
      })
      toast({ title: "Ruta creada", description: "La ruta se creó exitosamente" })
    } catch (error) {
      toast({ title: "Error", description: "No se pudo crear la ruta", variant: "destructive" })
    }
  }

  const handleManageRoute = async (route: any) => {
    setCurrentRoute(route)
    setViewMode("manage-route")
    try {
      const orders = await getUnassignedOrders()
      console.log('🔧 DEBUG handleManageRoute: Received orders:', orders.length)
      console.log('🔧 DEBUG handleManageRoute: Orders data:', orders)
      setUnassignedOrders(orders)
    } catch (error) {
      console.error('🔧 DEBUG handleManageRoute: Error:', error)
      toast({ title: "Error", description: "No se pudieron cargar los pedidos", variant: "destructive" })
    }
  }

  const handleAssignOrders = async () => {
    if (!currentRoute || selectedOrders.length === 0) return
    
    try {
      await assignMultipleOrdersToRoute(currentRoute.id, selectedOrders)
      setSelectedOrders([])
      
      // Just refetch routes to update local state - useOrders hook will handle orders automatically
      await refetchRoutes()
      
      setViewMode("dispatch-route")
      toast({ title: "Pedidos asignados", description: "Los pedidos se asignaron a la ruta" })
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron asignar los pedidos", variant: "destructive" })
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

  const getOrderStatusBadge = (order: any) => {
    switch (order.status) {
      case 'received':
        return <Badge variant="secondary"><Package className="h-3 w-3 mr-1" />Recibido</Badge>
      case 'review_area1':
        return <Badge variant="default"><Eye className="h-3 w-3 mr-1" />Revisión Área 1</Badge>
      case 'review_area2':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Revisión Área 2</Badge>
      case 'ready_dispatch':
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600"><Clock className="h-3 w-3 mr-1" />Listo para Despacho</Badge>
      case 'dispatched':
        return <Badge variant="default" className="bg-orange-500 hover:bg-orange-600"><Truck className="h-3 w-3 mr-1" />Despachado</Badge>
      case 'in_delivery':
        return <Badge variant="default" className="bg-purple-500 hover:bg-purple-600"><MapPin className="h-3 w-3 mr-1" />En Entrega</Badge>
      case 'delivered':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Entregado</Badge>
      case 'partially_delivered':
        return <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600"><AlertTriangle className="h-3 w-3 mr-1" />Entrega Parcial</Badge>
      case 'returned':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Devuelto</Badge>
      default:
        return <Badge variant="outline">{order.status}</Badge>
    }
  }

  const getDispatchStatusBadge = (item: any) => {
    const availability_status = item.availability_status || "pending"
    
    // Follow revision area 1 logic exactly
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
      // Find item directly from orders state (updated by useOrders hook)
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
  const updateDeliverySequence = async (routeOrderId: string, newSequence: number) => {
    try {
      const { error } = await supabase
        .from("route_orders")
        .update({ delivery_sequence: newSequence })
        .eq("id", routeOrderId)

      if (error) {
        console.error("Error updating delivery sequence:", error)
        throw error
      }

      await refetchRoutes()
    } catch (error) {
      console.error("Error updating delivery sequence:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar la secuencia de entrega",
        variant: "destructive",
      })
    }
  }

  // Función para mover un pedido hacia arriba
  const moveOrderUp = async (currentIndex: number, routeOrderId: string) => {
    if (currentIndex === 0) return // Ya está en la primera posición
    
    try {
      const routeOrdersData = (currentRoute?.route_orders || [])
        .filter((ro: any) => ro.order_id)
        .sort((a: any, b: any) => (a.delivery_sequence || 0) - (b.delivery_sequence || 0))

      // Intercambiar secuencias
      const currentRouteOrder = routeOrdersData[currentIndex]
      const previousRouteOrder = routeOrdersData[currentIndex - 1]

      if (currentRouteOrder && previousRouteOrder) {
        const currentSequence = currentRouteOrder.delivery_sequence || (currentIndex + 1)
        const previousSequence = previousRouteOrder.delivery_sequence || currentIndex

        // Actualizar ambas secuencias
        await supabase
          .from("route_orders")
          .update({ delivery_sequence: previousSequence })
          .eq("id", currentRouteOrder.id)

        await supabase
          .from("route_orders")
          .update({ delivery_sequence: currentSequence })
          .eq("id", previousRouteOrder.id)

        await refetchRoutes()
        toast({
          title: "Éxito",
          description: "Secuencia de entrega actualizada",
        })
      }
    } catch (error) {
      console.error("Error moving order up:", error)
      toast({
        title: "Error",
        description: "No se pudo mover el pedido",
        variant: "destructive",
      })
    }
  }

  // Función para mover un pedido hacia abajo
  const moveOrderDown = async (currentIndex: number, routeOrderId: string) => {
    const routeOrdersData = (currentRoute?.route_orders || [])
      .filter((ro: any) => ro.order_id)
      .sort((a: any, b: any) => (a.delivery_sequence || 0) - (b.delivery_sequence || 0))

    if (currentIndex === routeOrdersData.length - 1) return // Ya está en la última posición
    
    try {
      // Intercambiar secuencias
      const currentRouteOrder = routeOrdersData[currentIndex]
      const nextRouteOrder = routeOrdersData[currentIndex + 1]

      if (currentRouteOrder && nextRouteOrder) {
        const currentSequence = currentRouteOrder.delivery_sequence || (currentIndex + 1)
        const nextSequence = nextRouteOrder.delivery_sequence || (currentIndex + 2)

        // Actualizar ambas secuencias
        await supabase
          .from("route_orders")
          .update({ delivery_sequence: nextSequence })
          .eq("id", currentRouteOrder.id)

        await supabase
          .from("route_orders")
          .update({ delivery_sequence: currentSequence })
          .eq("id", nextRouteOrder.id)

        await refetchRoutes()
        toast({
          title: "Éxito",
          description: "Secuencia de entrega actualizada",
        })
      }
    } catch (error) {
      console.error("Error moving order down:", error)
      toast({
        title: "Error",
        description: "No se pudo mover el pedido",
        variant: "destructive",
      })
    }
  }

  // Initialize with normal fetch for dispatch module
  useEffect(() => {
    refetchRoutes()
  }, [])

  // Update currentRoute when routes data changes
  useEffect(() => {
    if (currentRoute && routes.length > 0) {
      const updatedRoute = routes.find(r => r.id === currentRoute.id)
      if (updatedRoute && JSON.stringify(updatedRoute) !== JSON.stringify(currentRoute)) {
        setCurrentRoute(updatedRoute)
      }
    }
  }, [routes])

  // Obtener información de conductor y vehículo para la ruta actual
  const getRouteInfo = (route: any) => {
    const driver = drivers.find(d => d.id === route.driver_id)
    const vehicle = vehicles.find(v => v.id === route.vehicle_id)
    return { driver, vehicle }
  }

  // Función para obtener los días de frecuencia
  const getDayNames = (frequencies: any[]) => {
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    return frequencies
      .map(freq => dayNames[freq.day_of_week])
      .filter(Boolean)
      .join(', ')
  }

  // Función para obtener horario de recibo solo para la fecha específica de entrega
  const getReceivingHoursForDeliveryDate = (schedules: any[], deliveryDate: string) => {
    if (!schedules || schedules.length === 0) return "No configurado"
    
    const deliveryDay = new Date(deliveryDate).getDay() // 0=Sunday, 6=Saturday
    const daySchedules = schedules.filter(schedule => schedule.day_of_week === deliveryDay)
    
    if (daySchedules.length === 0) return "No configurado"
    
    return daySchedules
      .map(schedule => `${schedule.start_time.slice(0,5)} - ${schedule.end_time.slice(0,5)}`)
      .join(', ')
  }

  // Loading state
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

  // Render function para cada vista
  const renderRoutesList = () => (
    <div className="space-y-6">
      {/* Stats - Carousel Design */}
      <div className="flex overflow-x-auto gap-4 pb-4 md:grid md:grid-cols-3 md:gap-6 mb-8 md:overflow-visible md:pb-0">
        <Card className="min-w-[200px] md:min-w-0">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">Rutas Activas</p>
                <p className="text-2xl md:text-3xl font-bold text-blue-600">{activeRoutes.length}</p>
              </div>
              <Truck className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-[200px] md:min-w-0">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">Pedidos Despachados Hoy</p>
                <p className="text-2xl md:text-3xl font-bold text-green-600">{dispatchedOrders.length}</p>
              </div>
              <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-[200px] md:min-w-0">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">Pedidos Sin Asignar</p>
                <p className="text-2xl md:text-3xl font-bold text-yellow-600">{orders.filter(o => o.status === "ready_dispatch" && !o.assigned_route_id).length}</p>
              </div>
              <Package className="h-6 w-6 md:h-8 md:w-8 text-yellow-600" />
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
                  <div key={route.id} className="border rounded-lg p-3 md:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <h3 className="font-semibold text-base md:text-lg truncate">
                          #{route.route_number || 'S/N'} - {route.route_name}
                        </h3>
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">{route.route_date}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">{driver?.name || "Sin conductor"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Car className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">{vehicle?.vehicle_code || "Sin vehículo"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">{routeOrdersCount} pedidos</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => handleManageRoute(route)}
                          size="sm"
                          className="text-xs sm:text-sm"
                        >
                          Asignar Pedidos
                        </Button>
                        {routeOrdersCount > 0 && (
                          <Button 
                            onClick={() => {
                              setCurrentRoute(route)
                              setViewMode("dispatch-route")
                            }}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
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

  const renderManageRoute = () => (
    <div className="space-y-6">
      {/* Header de la ruta */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="outline" onClick={() => setViewMode("routes")}>
              ← Volver
            </Button>
            <h2 className="text-2xl font-bold">#{currentRoute?.route_number || 'S/N'} - {currentRoute?.route_name}</h2>
          </div>
          <p className="text-gray-600">Asigna pedidos a esta ruta</p>
        </div>
        {selectedOrders.length > 0 && (
          <Button onClick={handleAssignOrders} className="bg-blue-600">
            Asignar {selectedOrders.length} pedidos
          </Button>
        )}
      </div>

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
                        <p>Contacto: {order.clients?.contact_person || "-"}</p>
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

  // Nueva función para renderizar rutas con selección
  const renderActiveRoutesWithSelection = () => {
    if (loading) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Cargando rutas...</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (activeRoutes.length === 0) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay rutas activas</h3>
              <p className="text-gray-600 mb-4">Crea una nueva ruta para comenzar.</p>
              <Button onClick={() => setShowCreateRouteDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Ruta
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        {/* Controls de selección */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllRoutes}
                  className="flex items-center gap-2"
                >
                  {getSelectedRouteCount() === activeRoutes.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  {getSelectedRouteCount() === activeRoutes.length ? "Deseleccionar todas" : "Seleccionar todas"}
                </Button>
                {getSelectedRouteCount() > 0 && (
                  <Badge variant="secondary">
                    {getSelectedRouteCount()} de {activeRoutes.length} rutas seleccionadas
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de rutas */}
        <div className="grid gap-4">
          {activeRoutes.map((route) => {
            const isSelected = selectedRoutes[route.id] || false
            const routeOrders = orders.filter(order => order.assigned_route_id === route.id)
            const pendingOrders = routeOrders.filter(order => 
              order.status === 'ready_dispatch' && !order.is_invoiced
            )

            return (
              <Card key={route.id} className={`transition-all ${isSelected ? 'ring-2 ring-green-500 bg-green-50' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRouteSelection(route.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            #{route.route_number || 'S/N'} {route.route_name}
                          </h3>
                          <Badge variant={route.status === 'completed' ? 'default' : 'secondary'}>
                            {route.status === 'planned' && 'Planificada'}
                            {route.status === 'in_progress' && 'En Progreso'}
                            {route.status === 'completed' && 'Completada'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(route.route_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {route.driver?.name || 'Sin conductor'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Car className="h-4 w-4" />
                            {route.vehicle?.license_plate || 'Sin vehículo'}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-500" />
                            <span className="text-gray-600">Total: {routeOrders.length}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-gray-600">Pendientes: {pendingOrders.length}</span>
                          </div>
                          {routeOrders.filter(order => order.is_invoiced).length > 0 && (
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="h-4 w-4 text-orange-500" />
                              <span className="text-gray-600">Facturados: {routeOrders.filter(order => order.is_invoiced).length}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleManageRoute(route)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Gestionar
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => {
                          setCurrentRoute(route)
                          setViewMode("dispatch-route")
                        }}
                        className="bg-green-600"
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Despachar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  const renderDispatchRoute = () => {
    // Get route_orders with delivery_sequence from current route
    const routeOrdersData = (currentRoute?.route_orders || [])
      .filter((ro: any) => ro.order_id)
      .sort((a: any, b: any) => (a.delivery_sequence || 0) - (b.delivery_sequence || 0))
    
    // Get fresh order data from orders state and match with route_orders data
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
        {/* Header */}
        <div className="mb-6 md:mb-8 space-y-3 md:space-y-0">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setViewMode("routes")} size="sm" className="text-xs md:text-sm">
              ← Volver
            </Button>
          </div>
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 break-words">
              Despacho - #{currentRoute?.route_number || 'S/N'} {currentRoute?.route_name}
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              Despacha productos por pedido para la ruta
            </p>
          </div>
        </div>

        {/* Orders to Dispatch */}
        <div className="space-y-6">
          {routeOrders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pedidos asignados a esta ruta</h3>
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
                      {/* Flechas de ordenamiento */}
                      <div className="flex flex-col gap-1 mr-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => moveOrderUp(index, order.route_order_id)}
                          disabled={index === 0}
                          title="Mover hacia arriba"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => moveOrderDown(index, order.route_order_id)}
                          disabled={index === routeOrders.length - 1}
                          title="Mover hacia abajo"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex-1 min-w-0 mr-4 space-y-1">
                        {/* Order number - primera línea */}
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
                            #{order.delivery_sequence || (index + 1)}
                          </div>
                          <Package className="h-4 w-4 flex-shrink-0 text-gray-500" />
                          <span className="text-xs sm:text-sm font-medium text-gray-600">
                            {order.order_number}
                          </span>
                        </div>
                        
                        {/* Client name - segunda línea */}
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                          {order.client?.name}
                        </h3>
                        
                        {/* Delivery date - tercera línea */}
                        <p className="text-xs sm:text-sm text-gray-600">
                          Entrega: {order.expected_delivery_date}
                        </p>

                        {/* Branch address - cuarta línea */}
                        {order.branch?.address && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{order.branch.address}</span>
                          </div>
                        )}

                        {/* Receiving hours for delivery date - quinta línea */}
                        {order.branch_id && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span>{getReceivingHoursForDeliveryDate(getSchedulesByBranch(order.branch_id), order.expected_delivery_date)}</span>
                          </div>
                        )}
                        
                        {order.observations && (
                          <p className="text-xs sm:text-sm text-blue-600">
                            📝 {order.observations}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 w-8 sm:w-auto p-0 sm:px-3">
                              <Eye className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline">Ver Detalles</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="w-full max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto p-3 md:p-6">
                            <DialogHeader className="space-y-2">
                              <DialogTitle className="text-base md:text-lg lg:text-xl break-words">
                                Detalles del Pedido {order.order_number}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 md:space-y-6">
                              {/* Información básica del pedido */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                <div>
                                  <Label className="text-sm md:text-base font-semibold">Cliente</Label>
                                  <p className="text-gray-900 text-sm md:text-base">{order.client?.name}</p>
                                </div>
                                <div>
                                  <Label className="text-sm md:text-base font-semibold">Fecha de Entrega</Label>
                                  <p className="text-gray-900 text-sm md:text-base">{order.expected_delivery_date}</p>
                                </div>
                              </div>

                              {/* Observaciones */}
                              {order.observations && (
                                <div>
                                  <Label className="text-sm md:text-base font-semibold">Observaciones</Label>
                                  <p className="text-gray-900 bg-blue-50 p-2 md:p-3 rounded-lg text-sm md:text-base break-words">{order.observations}</p>
                                </div>
                              )}

                              {/* Información completa del cliente y sucursal */}
                              <div className="bg-gray-50 rounded-lg p-2 md:p-3 lg:p-4 border">
                                <Label className="text-sm md:text-base font-semibold mb-2 md:mb-3 block">Información del Cliente y Sucursal</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-3 lg:gap-4 text-xs md:text-sm">
                                  <div className="space-y-2">
                                    <div>
                                      <span className="font-medium text-gray-700 block">Razón Social:</span>
                                      <p className="text-gray-900 break-words">{order.client?.razon_social || order.client?.name || "-"}</p>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700 block">Contacto Sucursal:</span>
                                      <p className="text-gray-900 break-words">{order.branch?.contact_person || "-"}</p>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <div>
                                      <span className="font-medium text-gray-700 block">Teléfono:</span>
                                      <p className="text-gray-900 break-words">{order.branch?.phone || order.client?.phone || "-"}</p>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700 block">Email:</span>
                                      <p className="text-gray-900 break-words">{order.branch?.email || order.client?.email || "-"}</p>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <div>
                                      <span className="font-medium text-gray-700 block">Dirección:</span>
                                      <p className="text-gray-900 break-words">{order.branch?.address || order.client?.address || "-"}</p>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Sección separada para horarios */}
                                <div className="mt-3 md:mt-4 pt-3 border-t border-gray-200">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 lg:gap-4 text-xs md:text-sm">
                                    <div>
                                      <span className="font-medium text-gray-700 block">Días de Frecuencia:</span>
                                      <p className="text-gray-900 mt-1 break-words">
                                        {order.branch_id 
                                          ? getDayNames(getFrequenciesForBranch(order.branch_id)) || "No configurado"
                                          : "No configurado"
                                        }
                                      </p>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700 block">Horario de Entrega ({order.expected_delivery_date}):</span>
                                      <p className="text-gray-900 text-xs md:text-sm mt-1 font-semibold text-blue-600 break-words">
                                        {order.branch_id 
                                          ? getReceivingHoursForDeliveryDate(getSchedulesByBranch(order.branch_id), order.expected_delivery_date)
                                          : "No configurado"
                                        }
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Productos solicitados */}
                              <div>
                                <Label className="text-sm md:text-base font-semibold">Productos Solicitados</Label>
                                <div className="mt-2 md:mt-3 border rounded-lg overflow-hidden">
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="bg-gray-50">
                                          <TableHead className="min-w-[120px]">Producto</TableHead>
                                          <TableHead className="min-w-[60px]">Cant.</TableHead>
                                          <TableHead className="min-w-[60px]">Unidad</TableHead>
                                          <TableHead className="min-w-[80px]">Precio Unit.</TableHead>
                                          <TableHead className="min-w-[80px]">Total</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                    <TableBody>
                                      {order.order_items?.map((item: any) => (
                                        <TableRow key={item.id}>
                                          <TableCell className="font-medium">{item.product?.name}</TableCell>
                                          <TableCell>{item.quantity_requested}</TableCell>
                                          <TableCell>{item.product?.unit || "-"}</TableCell>
                                          <TableCell>${item.unit_price?.toLocaleString() || 0}</TableCell>
                                          <TableCell className="font-medium">
                                            ${((item.quantity_requested || 0) * (item.unit_price || 0)).toLocaleString()}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                  </div>
                                </div>
                                <div className="mt-3 flex justify-center md:justify-end">
                                  <div className="bg-gray-100 px-2 md:px-3 lg:px-4 py-2 rounded-lg w-full md:w-auto">
                                    <span className="font-semibold text-sm md:text-base block text-center md:text-left">
                                      Total del Pedido: ${(order.total_value || 0).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Button 
                          onClick={() => sendOrderToRoute(order.id)} 
                          disabled={!isOrderReadyForRoute(order)}
                          size="sm"
                          className="h-8 w-8 sm:w-auto p-0 sm:px-4 bg-green-600 hover:bg-green-700"
                        >
                          <Truck className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Enviar a Ruta</span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Cantidad Solicitada</TableHead>
                          <TableHead>Disponible</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.order_items?.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.product?.name}</TableCell>
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

  // Nueva función para renderizar remisiones
  const renderRemisions = () => {
    if (remisionsLoading) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Cargando remisiones...</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (remisions.length === 0) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center">
              <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay remisiones</h3>
              <p className="text-gray-600">Las remisiones aparecerán aquí cuando se generen.</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Remisiones Generadas ({remisions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {remisions.map((remision) => (
                <div key={remision.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {remision.remision_number}
                        </h4>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700">
                          Remisión
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <strong>Cliente:</strong> {remision.client?.name || 'Cliente desconocido'}
                        </div>
                        <div>
                          <strong>Fecha:</strong> {new Date(remision.created_at).toLocaleDateString('es-ES')}
                        </div>
                        <div>
                          <strong>Pedido:</strong> {remision.order?.order_number || 'N/A'}
                        </div>
                        <div>
                          <strong>Total:</strong> ${remision.total_amount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const fileName = `Remision_${remision.remision_number}_${remision.client?.name || 'Cliente'}.pdf`
                          downloadRemisionPDF(remision.id, fileName)
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Descargar PDF
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Nueva función para renderizar pedidos no facturados
  const renderNonInvoicedOrders = () => {
    if (nonInvoicedLoading) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Cargando pedidos no facturados...</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (nonInvoicedOrders.length === 0) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pedidos por facturar</h3>
              <p className="text-gray-600">Los pedidos remisionados aparecerán aquí para facturación posterior.</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        {/* Header con botón de facturar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllNonInvoicedOrders}
                  className="flex items-center gap-2"
                >
                  {getSelectedNonInvoicedCount() === nonInvoicedOrders.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  {getSelectedNonInvoicedCount() === nonInvoicedOrders.length ? "Deseleccionar todos" : "Seleccionar todos"}
                </Button>
                {getSelectedNonInvoicedCount() > 0 && (
                  <Badge variant="secondary">
                    {getSelectedNonInvoicedCount()} de {nonInvoicedOrders.length} pedidos seleccionados
                  </Badge>
                )}
              </div>
              {getSelectedNonInvoicedCount() > 0 && (
                <Button
                  onClick={handleInvoiceNonInvoicedOrders}
                  disabled={isInvoicing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isInvoicing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                  )}
                  {isInvoicing ? "Facturando..." : `Facturar ${getSelectedNonInvoicedCount()} pedidos`}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lista de pedidos no facturados */}
        <Card>
          <CardHeader>
            <CardTitle>Pedidos Remisionados Pendientes de Facturar ({nonInvoicedOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {nonInvoicedOrders.map((order) => {
                const isSelected = selectedNonInvoicedOrders[order.order_id] || false
                return (
                  <div key={order.order_id} className={`border rounded-lg p-4 transition-all ${isSelected ? 'ring-2 ring-green-500 bg-green-50' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOrderSelection(order.order_id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900">
                              {order.order_number}
                            </h4>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              Anteriormente Remisionado
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                            <div>
                              <strong>Cliente:</strong> {order.client_name}
                            </div>
                            <div>
                              <strong>Remisión:</strong> {order.remision_number}
                            </div>
                            <div>
                              <strong>Fecha Remisión:</strong> {new Date(order.remision_date).toLocaleDateString('es-ES')}
                            </div>
                            <div>
                              <strong>Total:</strong> ${order.total_value.toLocaleString()}
                            </div>
                            {order.route_name && (
                              <div>
                                <strong>Ruta:</strong> {order.route_name}
                              </div>
                            )}
                            <div>
                              <strong>Entrega:</strong> {new Date(order.expected_delivery_date).toLocaleDateString('es-ES')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Nueva función para renderizar historial de exportaciones
  const renderExportHistory = () => {
    if (historyLoading) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Cargando historial...</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (exportHistory.length === 0) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay exportaciones</h3>
              <p className="text-gray-600">Las exportaciones aparecerán aquí cuando se realicen.</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Historial de Exportaciones ({exportHistory.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {exportHistory.map((exportRecord) => (
                <div key={exportRecord.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          Facturas {exportRecord.invoice_number_start} - {exportRecord.invoice_number_end}
                        </h4>
                        <Badge variant="outline">
                          {exportRecord.total_orders} pedidos
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <strong>Fecha:</strong> {new Date(exportRecord.export_date).toLocaleDateString('es-ES')}
                        </div>
                        <div>
                          <strong>Total:</strong> ${exportRecord.total_amount.toLocaleString()}
                        </div>
                        <div>
                          <strong>Usuario:</strong> {exportRecord.created_by_user?.name || 'Sistema'}
                        </div>
                        <div>
                          <strong>Rutas:</strong> {exportRecord.route_names.join(', ')}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadExportFile(exportRecord.id, exportRecord.file_name)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Descargar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
                    {viewMode === "routes" && "Gestiona rutas y despacho de pedidos"}
                    {viewMode === "manage-route" && "Asigna pedidos a la ruta"}
                    {viewMode === "dispatch-route" && "Despacha pedidos de la ruta"}
                  </p>
                </div>
                {viewMode === "routes" && activeTab === "active-routes" && (
                  <div className="flex gap-2">
                    {getSelectedRouteCount() > 0 && (
                      <Button 
                        onClick={handleMultiRouteExport} 
                        disabled={isMultiExporting}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isMultiExporting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                        )}
                        {isMultiExporting ? "Exportando..." : `Exportar ${getSelectedRouteCount()} rutas`}
                      </Button>
                    )}
                    <Button onClick={() => setShowCreateRouteDialog(true)} className="bg-blue-600">
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Ruta
                    </Button>
                  </div>
                )}
              </div>

              {/* Tabs solo para viewMode === "routes" */}
              {viewMode === "routes" && (
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                  <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-fit">
                    <TabsTrigger value="active-routes" className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Rutas Activas
                    </TabsTrigger>
                    <TabsTrigger value="remisions" className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Remisiones
                    </TabsTrigger>
                    <TabsTrigger value="non-invoiced-orders" className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Pedidos No Facturados
                    </TabsTrigger>
                    <TabsTrigger value="export-history" className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Historial
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="active-routes" className="mt-6">
                    {renderActiveRoutesWithSelection()}
                  </TabsContent>

                  <TabsContent value="remisions" className="mt-6">
                    {renderRemisions()}
                  </TabsContent>

                  <TabsContent value="non-invoiced-orders" className="mt-6">
                    {renderNonInvoicedOrders()}
                  </TabsContent>

                  <TabsContent value="export-history" className="mt-6">
                    {renderExportHistory()}
                  </TabsContent>
                </Tabs>
              )}
            </div>

            {/* Contenido principal según la vista (solo para manage-route y dispatch-route) */}
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
                    <Label htmlFor="route_name">Nombre de la Ruta</Label>
                    <Input
                      id="route_name"
                      value={newRouteData.route_name}
                      onChange={(e) => setNewRouteData(prev => ({ ...prev, route_name: e.target.value }))}
                      placeholder="Ej: Ruta Norte"
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
                    <Label htmlFor="driver_id">Conductor</Label>
                    <Select
                      value={newRouteData.driver_id}
                      onValueChange={(value) => setNewRouteData(prev => ({ ...prev, driver_id: value }))}
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
                  <div>
                    <Label htmlFor="vehicle_id">Vehículo</Label>
                    <Select
                      value={newRouteData.vehicle_id}
                      onValueChange={(value) => setNewRouteData(prev => ({ ...prev, vehicle_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar vehículo" />
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
                    <Button 
                      onClick={handleCreateRoute}
                      disabled={!newRouteData.route_name || !newRouteData.driver_id}
                      className="bg-blue-600"
                    >
                      Crear Ruta
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Modal de confirmación de exportación */}
            <Dialog open={showExportConfirmation} onOpenChange={setShowExportConfirmation}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Confirmar Exportación</DialogTitle>
                </DialogHeader>
                {exportSummary && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Resumen de exportación</h4>
                      <div className="space-y-2 text-sm text-blue-700">
                        <div className="flex justify-between">
                          <span>Rutas seleccionadas:</span>
                          <span className="font-medium">{exportSummary.totalRoutes}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total pedidos:</span>
                          <span className="font-medium">{exportSummary.totalOrders}</span>
                        </div>

                        {/* Dual billing breakdown */}
                        {exportSummary.directBillingOrders && exportSummary.directBillingOrders.length > 0 && (
                          <div className="flex justify-between border-l-2 border-green-300 pl-2">
                            <span>→ Facturación directa:</span>
                            <span className="font-medium text-green-800">
                              {exportSummary.directBillingOrders.length} pedidos (${exportSummary.totalDirectBilling?.toLocaleString()})
                            </span>
                          </div>
                        )}

                        {exportSummary.remisionOrders && exportSummary.remisionOrders.length > 0 && (
                          <div className="flex justify-between border-l-2 border-orange-300 pl-2">
                            <span>→ Remisiones (PDF):</span>
                            <span className="font-medium text-orange-800">
                              {exportSummary.remisionOrders.length} pedidos (${exportSummary.totalRemisions?.toLocaleString()})
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between font-medium border-t border-blue-200 pt-2">
                          <span>Valor total:</span>
                          <span>${exportSummary.totalAmount.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-xs text-blue-600">
                          <strong>Rutas:</strong> {exportSummary.routeNames.join(', ')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                          <p className="font-medium mb-1">¡Importante!</p>
                          <p>Se procesará lo siguiente:</p>
                          <ul className="mt-1 space-y-1 list-disc list-inside">
                            {exportSummary?.directBillingOrders && exportSummary.directBillingOrders.length > 0 && (
                              <li>Facturación directa: Los pedidos se marcarán como facturados y se generará Excel</li>
                            )}
                            {exportSummary?.remisionOrders && exportSummary.remisionOrders.length > 0 && (
                              <li>Remisiones: Se generarán PDFs y los pedidos quedarán disponibles para facturación futura</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowExportConfirmation(false)}
                        disabled={isMultiExporting}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        onClick={confirmMultiRouteExport}
                        disabled={isMultiExporting}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isMultiExporting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Exportando...
                          </>
                        ) : (
                          <>
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Confirmar Exportación
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Modal de confirmación de facturación de remisiones */}
            <Dialog open={showRemisionInvoiceConfirmation} onOpenChange={setShowRemisionInvoiceConfirmation}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Confirmar Facturación de Pedidos Remisionados</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Resumen de facturación</h4>
                    <div className="space-y-2 text-sm text-blue-700">
                      <div className="flex justify-between">
                        <span>Pedidos seleccionados:</span>
                        <span className="font-medium">{getSelectedNonInvoicedCount()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Valor total:</span>
                        <span className="font-medium">
                          ${generateInvoiceFromRemisionSummary().totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-blue-600">
                        <strong>Pedidos:</strong> {generateInvoiceFromRemisionSummary().orderNumbers.join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="text-sm text-green-800">
                        <p className="font-medium mb-1">Facturación con cantidades entregadas</p>
                        <p>Se utilizarán las cantidades realmente entregadas en ruta para generar las facturas.</p>
                        <p className="mt-1">Los pedidos se marcarán con etiqueta "Anteriormente Remisionado".</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowRemisionInvoiceConfirmation(false)}
                      disabled={isInvoicing}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={confirmRemisionInvoicing}
                      disabled={isInvoicing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isInvoicing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Facturando...
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Confirmar Facturación
                        </>
                      )}
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
