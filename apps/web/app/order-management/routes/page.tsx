"use client"

import { useState, useEffect, useCallback } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useVehicles } from "@/hooks/use-vehicles"
import { useDrivers } from "@/hooks/use-drivers"
import { useToast } from "@/hooks/use-toast"
import { Clock, MapPin, CheckCircle, XCircle, AlertCircle, Trash2, Info, Loader2 } from "lucide-react"
import {
  getDriverRoutes,
  getCompletedRoutes,
  getPendingOrders,
  uploadEvidence,
  receiveOrderToRoute,
  completeDelivery,
  createReturn,
  type ItemReceiveUpdate,
  type ItemDeliveryUpdate,
  type CompleteDeliveryData,
} from "./actions"

export default function RoutesPage() {
  const { user } = useAuth()
  const { vehicles, createVehicle, assignDriverToVehicle, refetch: refetchVehicles } = useVehicles()
  const { drivers, allUsers, createDriver, refetch: refetchDrivers } = useDrivers()
  const { toast } = useToast()

  // Estado para rutas (usando Server Actions)
  const [routes, setRoutes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  // Estado para rutas completadas
  const [completedRoutes, setCompletedRoutes] = useState<any[]>([])
  const [loadingCompleted, setLoadingCompleted] = useState(false)
  const [completedPage, setCompletedPage] = useState(1)
  const [hasMoreCompleted, setHasMoreCompleted] = useState(false)

  const [activeTab, setActiveTab] = useState("receive")

  // Cargar rutas del conductor
  const loadRoutes = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!user) return

    try {
      if (!append) setLoading(true)
      const result = await getDriverRoutes(user.id, user.role || "driver", page)

      if (result.error) {
        setError(result.error)
        return
      }

      if (result.data) {
        if (append) {
          setRoutes(prev => [...prev, ...result.data!.routes])
        } else {
          setRoutes(result.data.routes)
        }
        setHasMore(result.data.has_more)
        setCurrentPage(page)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading routes")
    } finally {
      setLoading(false)
    }
  }, [user])

  // Cargar rutas completadas
  const loadCompletedRoutes = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!user) return

    try {
      if (!append) setLoadingCompleted(true)
      const result = await getCompletedRoutes(user.id, user.role || "driver", page)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      if (result.data) {
        if (append) {
          setCompletedRoutes(prev => [...prev, ...result.data!.routes])
        } else {
          setCompletedRoutes(result.data.routes)
        }
        setHasMoreCompleted(result.data.has_more)
        setCompletedPage(page)
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las rutas completadas",
        variant: "destructive",
      })
    } finally {
      setLoadingCompleted(false)
    }
  }, [user, toast])

  // Refetch function for child components
  const refetchRoutes = useCallback(() => {
    loadRoutes(1)
    loadCompletedRoutes(1)
  }, [loadRoutes, loadCompletedRoutes])

  const [manageOrder, setManageOrder] = useState<any>(null)
  
  // Estados para gestión detallada de entregas
  const [productDeliveries, setProductDeliveries] = useState<Record<string, {
    status: "delivered" | "partial" | "not_delivered"
    quantity_delivered: number
    quantity_returned: number
  }>>({})
  
  // Estados para evidencia única por entrega
  const [deliveryEvidence, setDeliveryEvidence] = useState<{
    evidence_url?: string
    general_return_reason?: string
  }>({})
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [uploadingEvidence, setUploadingEvidence] = useState(false)
  
  // Estados para devoluciones
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false)
  const [selectedProductForReturn, setSelectedProductForReturn] = useState<any>(null)
  const [returnReason, setReturnReason] = useState("")
  const [returnQuantity, setReturnQuantity] = useState(0)

  // Cargar rutas inicialmente
  useEffect(() => {
    if (user) {
      loadRoutes(1)
      loadCompletedRoutes(1)
    }
  }, [user, loadRoutes, loadCompletedRoutes])

  // Refrescar cuando cambiamos a la tab de "Rutas Activas"
  useEffect(() => {
    if (activeTab === "list" && user) {
      loadRoutes(1)
    }
  }, [activeTab, user, loadRoutes])
  
  // Estados para diálogos
  const [isNewRouteOpen, setIsNewRouteOpen] = useState(false)
  const [isNewVehicleOpen, setIsNewVehicleOpen] = useState(false)
  const [isNewDriverOpen, setIsNewDriverOpen] = useState(false)
  const [isAssignDriverOpen, setIsAssignDriverOpen] = useState(false)
  
  // Estados para formularios
  const [routeName, setRouteName] = useState("")
  const [selectedDriverId, setSelectedDriverId] = useState("")
  const [selectedVehicleId, setSelectedVehicleId] = useState("")
  const [routeDate, setRouteDate] = useState("")
  
  const [vehicleCode, setVehicleCode] = useState("")
  const [vehicleCapacity, setVehicleCapacity] = useState("")
  
  const [newDriverName, setNewDriverName] = useState("")
  const [newDriverEmail, setNewDriverEmail] = useState("")
  
  const [selectedVehicleForDriver, setSelectedVehicleForDriver] = useState("")
  const [selectedDriverForVehicle, setSelectedDriverForVehicle] = useState("")
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Función para obtener los días de la semana actual
  const getWeekDays = () => {
    const today = new Date()
    const currentDay = today.getDay() // 0 = domingo, 1 = lunes, etc.
    const monday = new Date(today)
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1))
    
    const days = []
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday)
      day.setDate(monday.getDate() + i)
      days.push({
        name: dayNames[i],
        date: day.toISOString().split('T')[0],
        fullDate: day.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
      })
    }
    return days
  }
  
  const weekDays = getWeekDays()

  // Funciones para gestión de entregas detalladas
  const handleProductDeliveryChange = (productId: string, field: string, value: any) => {
    setProductDeliveries(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }))
  }

  // Función para subir evidencia usando Server Action (comprime a ≤50KB)
  const handleEvidenceUpload = async (file: File) => {
    setUploadingEvidence(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const result = await uploadEvidence(formData)

      if (result.error) {
        throw new Error(result.error)
      }

      if (result.data) {
        setDeliveryEvidence(prev => ({ ...prev, evidence_url: result.data!.evidence_url }))
        setEvidenceFile(file)

        toast({
          title: "Evidencia subida",
          description: "La foto se ha comprimido y guardado correctamente",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo subir la evidencia",
        variant: "destructive",
      })
    } finally {
      setUploadingEvidence(false)
    }
  }

  const handleEvidenceDelete = async () => {
    if (!deliveryEvidence.evidence_url) return

    // Solo limpiar estado local (el archivo en storage se puede limpiar después)
    setDeliveryEvidence(prev => ({ ...prev, evidence_url: undefined }))
    setEvidenceFile(null)

    toast({
      title: "Evidencia eliminada",
      description: "La foto se ha eliminado",
    })
  }

  const handleCompleteDelivery = async () => {
    if (!manageOrder?.orders?.order_items) {
      toast({
        title: "Error",
        description: "No se pudo obtener información del pedido",
        variant: "destructive",
      })
      return
    }

    // Validar que hay evidencia (OBLIGATORIA)
    let evidenceUrl = deliveryEvidence.evidence_url
    if (!evidenceUrl && evidenceFile) {
      // Subir si hay archivo pendiente
      const formData = new FormData()
      formData.append("file", evidenceFile)
      const uploadResult = await uploadEvidence(formData)
      if (uploadResult.error) {
        toast({
          title: "Error",
          description: "No se pudo subir la evidencia: " + uploadResult.error,
          variant: "destructive",
        })
        return
      }
      evidenceUrl = uploadResult.data?.evidence_url
    }

    if (!evidenceUrl) {
      toast({
        title: "Evidencia requerida",
        description: "Debes subir una foto de evidencia para completar la entrega",
        variant: "destructive",
      })
      return
    }

    try {
      // Obtener razón general de devolución
      const hasReturns = Object.values(productDeliveries).some(d => d.quantity_returned > 0)
      const generalReason = hasReturns ? deliveryEvidence.general_return_reason || "Devolución sin motivo especificado" : undefined

      // Preparar items para el endpoint
      const items: ItemDeliveryUpdate[] = manageOrder.orders.order_items.map((item: any) => {
        const availableQuantity = item.quantity_available || 0
        const delivery = productDeliveries[item.id] || {
          status: "delivered",
          quantity_delivered: availableQuantity,
          quantity_returned: 0
        }

        return {
          item_id: item.id,
          delivery_status: delivery.status === "delivered" ? "delivered" :
                          delivery.status === "partial" ? "partial" : "rejected",
          quantity_delivered: delivery.quantity_delivered,
          quantity_rejected: delivery.quantity_returned || 0,
          rejection_reason: delivery.quantity_returned > 0 ? generalReason : undefined,
        }
      })

      // Llamar Server Action
      const deliveryData: CompleteDeliveryData = {
        route_order_id: manageOrder.id,
        order_id: manageOrder.orders.id,
        evidence_url: evidenceUrl,
        items,
        general_return_reason: generalReason,
      }

      const result = await completeDelivery(deliveryData)

      if (result.error) {
        throw new Error(result.error)
      }

      // Crear devoluciones si hay items rechazados
      for (const item of manageOrder.orders.order_items) {
        const delivery = productDeliveries[item.id]
        if (delivery && delivery.quantity_returned > 0) {
          await createReturn({
            order_id: manageOrder.orders.id,
            product_id: item.product_id || item.product?.id,
            quantity_returned: delivery.quantity_returned,
            return_reason: generalReason || "Devolución",
            route_id: manageOrder.route_id,
            rejection_reason: generalReason,
          })
        }
      }

      toast({
        title: "Entrega completada",
        description: "Todos los productos han sido procesados",
      })

      // Reset estados
      setManageOrder(null)
      setProductDeliveries({})
      setDeliveryEvidence({})
      setEvidenceFile(null)

      // Refetch data
      refetchRoutes()
    } catch (error: any) {
      console.error("Error completing delivery:", error)
      toast({
        title: "Error",
        description: error?.message || "No se pudo completar la entrega",
        variant: "destructive",
      })
    }
  }

  const handleCreateReturn = async () => {
    if (!selectedProductForReturn || returnQuantity <= 0 || !returnReason) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createReturn({
        order_id: manageOrder.orders.id,
        product_id: selectedProductForReturn.product_id || selectedProductForReturn.product?.id,
        quantity_returned: returnQuantity,
        return_reason: returnReason,
        route_id: manageOrder.route_id,
        rejection_reason: returnReason,
      })

      if (result.error) {
        throw new Error(result.error)
      }

      toast({
        title: "Devolución registrada",
        description: "La devolución se ha creado correctamente",
      })

      // Reset form
      setReturnReason("")
      setReturnQuantity(0)
      setSelectedProductForReturn(null)
      setIsReturnDialogOpen(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo registrar la devolución",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Remaining functions would continue here...
  
  if (loading) return <div>Cargando rutas...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <RouteGuard
      requiredPermissions={['order_management_routes']}
      requiredRoles={['super_admin', 'administrator', 'coordinador_logistico', 'driver']}
    >
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-2 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestión de Rutas</h1>
                <p className="text-gray-600 text-sm sm:text-base">Organiza y gestiona las rutas de entrega</p>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 text-xs">
                <TabsTrigger value="receive" className="text-xs">Recibir</TabsTrigger>
                <TabsTrigger value="list" className="text-xs">Activas</TabsTrigger>
                <TabsTrigger value="completed" className="text-xs">Terminadas</TabsTrigger>
              </TabsList>

              <TabsContent value="receive" className="space-y-2 mt-2">
                <ReceiveOrdersTab user={user} toast={toast} refetch={refetchRoutes} />
              </TabsContent>

              <TabsContent value="list" className="space-y-4">
                <div className="grid gap-4">
                  {routes.map((route) => {
                    // Filtrar solo pedidos "in_delivery" para esta tab
                    const inDeliveryOrders = route.route_orders?.filter(ro => ro.orders?.status === 'in_delivery') || []

                    // Si no hay pedidos in_delivery, no mostrar la ruta
                    if (inDeliveryOrders.length === 0) return null

                    return (
                      <Card key={route.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle>{route.route_number ? `Ruta #${route.route_number} - ${route.route_name}` : route.route_name}</CardTitle>
                            <div className="text-sm">
                              {(() => {
                                const totalOrders = inDeliveryOrders.length
                                const completedOrders = inDeliveryOrders.filter(ro =>
                                  ['delivered', 'partially_delivered', 'returned'].includes(ro.orders?.status || '')
                                ).length
                                return (
                                  <div className="flex items-center gap-2">
                                    <div className="text-xs text-gray-600">
                                      {completedOrders}/{totalOrders} completados
                                    </div>
                                    <div className="w-16 bg-gray-200 rounded-full h-2">
                                      <div
                                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                          {inDeliveryOrders.length > 0 ? (
                            inDeliveryOrders
                              .sort((a, b) => (a.delivery_sequence || 0) - (b.delivery_sequence || 0))
                              .map((ro) => {
                            const order = ro.orders;
                            const isCompleted = ['delivered', 'partially_delivered', 'returned'].includes(order?.status || '')
                            const statusColor = order?.status === 'delivered' ? 'border-green-500 bg-green-50' :
                                              order?.status === 'partially_delivered' ? 'border-orange-500 bg-orange-50' :
                                              order?.status === 'returned' ? 'border-red-500 bg-red-50' :
                                              'border-gray-300 bg-white'
                            
                            return (
                              <div key={ro.id} className={`border-2 rounded-lg p-3 flex flex-col gap-1 transition-all duration-200 ${statusColor}`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {order ? (
                                      <span className="font-semibold text-sm">{order.order_number}</span>
                                    ) : (
                                      <span className="font-semibold text-sm text-red-500">Pedido asignado (ID: {ro.order_id})</span>
                                    )}
                                    {order && (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                            <Info className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-72">
                                          <div className="space-y-3">
                                            <h4 className="font-semibold text-sm">Información del Pedido</h4>
                                            
                                            {/* Fecha de entrega */}
                                            <div>
                                              <div className="text-xs text-gray-600">Fecha de entrega:</div>
                                              <div className="text-sm font-medium">
                                                {new Date(order.expected_delivery_date).toLocaleDateString('es-ES')}
                                              </div>
                                            </div>

                                            {/* Observaciones del pedido */}
                                            {order.observations && (
                                              <div>
                                                <div className="text-xs text-gray-600">Observaciones del pedido:</div>
                                                <div className="text-sm">{order.observations}</div>
                                              </div>
                                            )}

                                            {/* Observaciones de la sucursal */}
                                            {order.branches?.observations && (
                                              <div>
                                                <div className="text-xs text-gray-600">Observaciones de la sucursal:</div>
                                                <div className="text-sm">{order.branches.observations}</div>
                                              </div>
                                            )}

                                            {/* Contacto de la sucursal si existe */}
                                            {order.branches?.contact_person && (
                                              <div>
                                                <div className="text-xs text-gray-600 font-medium">Contacto de la sucursal:</div>
                                                <div className="text-sm font-medium">{order.branches.contact_person}</div>
                                                {order.branches.phone && (
                                                  <div className="text-xs text-gray-500">{order.branches.phone}</div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    )}
                                    {isCompleted && (
                                      <div className="flex items-center gap-1">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <span className="text-xs font-medium text-green-700 capitalize">
                                          {order?.status === 'delivered' ? 'Entregado' :
                                           order?.status === 'partially_delivered' ? 'Entrega Parcial' :
                                           order?.status === 'returned' ? 'Devuelto' : ''}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {!isCompleted && (
                                    <Badge variant="outline" className="text-xs">
                                      Pendiente
                                    </Badge>
                                  )}
                                </div>
                                {order ? (
                                  <>
                                    <div className="text-xs text-gray-600">Cliente: {order.clients?.name}</div>
                                    <div className="text-xs text-gray-600">
                                      Productos: {order.order_items?.length || 0} | Secuencia: {ro.delivery_sequence}
                                    </div>
                                    
                                    {/* Dirección de entrega */}
                                    <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                                      <MapPin className="h-3 w-3" />
                                      <span className="font-medium">
                                        {order.branches?.address || order.clients?.address || 'Sin dirección'}
                                      </span>
                                    </div>
                                    
                                    {/* Horario de recibo */}
                                    {(ro as any).receiving_schedule && (
                                      <div className="text-xs text-gray-600 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span className="font-medium">
                                          {(ro as any).receiving_schedule.start_time.slice(0, 5)} - {(ro as any).receiving_schedule.end_time.slice(0, 5)}
                                        </span>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="text-xs text-red-500">No se pudo cargar la información del pedido.</div>
                                )}
                                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                                  <Dialog open={manageOrder === ro} onOpenChange={open => setManageOrder(open ? ro : null)}>
                                    <DialogTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        className="w-full sm:w-auto"
                                        variant={isCompleted ? "outline" : "default"}
                                      >
                                        {isCompleted ? (
                                          <div className="flex items-center gap-1">
                                            <CheckCircle className="h-4 w-4" />
                                            Ver Detalles
                                          </div>
                                        ) : (
                                          "Gestionar Entrega"
                                        )}
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent
                                      className="max-w-4xl max-h-[80vh] overflow-y-auto"
                                      onInteractOutside={(e) => e.preventDefault()}
                                    >
                                      <DialogHeader>
                                        <DialogTitle>
                                          {isCompleted ? "Detalles de Entrega Completada" : "Gestionar Entrega Detallada"}
                                        </DialogTitle>
                                      </DialogHeader>
                                      {order ? (
                                        <div className="space-y-6">
                                          {/* Información del pedido */}
                                          <div className={`p-4 rounded-lg ${isCompleted ? (
                                            order.status === 'delivered' ? 'bg-green-50 border border-green-200' :
                                            order.status === 'partially_delivered' ? 'bg-orange-50 border border-orange-200' :
                                            order.status === 'returned' ? 'bg-red-50 border border-red-200' :
                                            'bg-gray-50'
                                          ) : 'bg-gray-50'}`}>
                                            <div className="flex items-center justify-between">
                                              <div className="font-semibold text-lg">Pedido: {order.order_number}</div>
                                              {isCompleted && (
                                                <div className="flex items-center gap-1">
                                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                                  <span className="text-sm font-medium text-green-700 capitalize">
                                                    {order?.status === 'delivered' ? 'Entregado' :
                                                     order?.status === 'partially_delivered' ? 'Entrega Parcial' :
                                                     order?.status === 'returned' ? 'Devuelto' : ''}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                            <div className="text-sm text-gray-600">Cliente: {order.clients?.name}</div>
                                            <div className="text-sm text-gray-600">Fecha de entrega: {order.expected_delivery_date}</div>
                                          </div>

                                          {/* Evidencia única por entrega */}
                                          {!isCompleted && (
                                            <div className="border rounded-lg p-4 space-y-3">
                                              <h3 className="font-semibold">Evidencia de Entrega</h3>
                                            <div className="space-y-3">
                                              <div>
                                                <Label>Foto de evidencia</Label>
                                                <div className="flex gap-2 items-center">
                                                  <Input
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/jpg,image/webp"
                                                    onChange={(e) => {
                                                      const file = e.target.files?.[0]
                                                      if (file) {
                                                        handleEvidenceUpload(file)
                                                      }
                                                    }}
                                                    disabled={uploadingEvidence}
                                                  />
                                                  {uploadingEvidence && (
                                                    <div className="text-sm text-blue-600 flex items-center gap-1">
                                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                      Subiendo...
                                                    </div>
                                                  )}
                                                  {deliveryEvidence.evidence_url && !uploadingEvidence && (
                                                    <div className="text-sm text-green-600 flex items-center gap-1">
                                                      ✓ Foto guardada
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                              
                                              {/* Vista previa de la imagen */}
                                              {deliveryEvidence.evidence_url && (
                                                <div className="space-y-2">
                                                  <div className="flex items-center justify-between">
                                                    <Label className="text-sm text-gray-600">Vista previa:</Label>
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      onClick={handleEvidenceDelete}
                                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                      <Trash2 className="h-4 w-4 mr-1" />
                                                      Eliminar
                                                    </Button>
                                                  </div>
                                                  <div className="border rounded-lg p-2 bg-gray-50">
                                                    <img 
                                                      src={deliveryEvidence.evidence_url} 
                                                      alt="Evidencia de entrega" 
                                                      className="max-w-full h-32 object-cover rounded"
                                                      onError={(e) => {
                                                        // Si la imagen falla al cargar, mostrar un placeholder
                                                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW4gbm8gZGlzcG9uaWJsZTwvdGV4dD48L3N2Zz4='
                                                      }}
                                                    />
                                                    <div className="text-xs text-gray-500 mt-1">
                                                      Evidencia guardada en Supabase Storage
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                            </div>
                                          )}

                                          {/* Lista de productos */}
                                          <div className="space-y-4">
                                            <h3 className="font-semibold">Productos a entregar:</h3>
                                            {order.order_items?.map((item: any) => {
                                              // Usar quantity_available (cantidad despachada) como valor por defecto
                                              const availableQuantity = item.quantity_available || 0
                                              const requestedQuantity = item.quantity_requested || 0
                                              const hasDiscrepancy = availableQuantity !== requestedQuantity

                                              const delivery = productDeliveries[item.id] || {
                                                status: "delivered",
                                                quantity_delivered: availableQuantity, // Usar cantidad disponible por defecto
                                                quantity_returned: 0
                                              }

                                              const hasReturns = delivery.quantity_returned > 0

                                              return (
                                                <div key={`${manageOrder?.id}-${item.id}`} className="border rounded-lg p-4 space-y-3">
                                                  <div className="flex justify-between items-start">
                                                    <div>
                                                      <div className="font-semibold">
                                                        {item.products?.name}{item.products?.weight ? ` (${item.products.weight})` : ''}
                                                      </div>
                                                      <div className="text-sm text-gray-600">
                                                        Cantidad solicitada: {requestedQuantity} {item.products?.unit}
                                                      </div>
                                                      {hasDiscrepancy && (
                                                        <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mt-1">
                                                          ⚠️ Despachado: {availableQuantity} {item.products?.unit} 
                                                          ({availableQuantity > requestedQuantity ? '+' : ''}{availableQuantity - requestedQuantity})
                                                        </div>
                                                      )}
                                                    </div>
                                                    {!isCompleted ? (
                                                      <div className="flex gap-2">
                                                        {/* Botones de estado */}
                                                        <Button
                                                          size="sm"
                                                          variant={delivery.status === "delivered" ? "default" : "outline"}
                                                          className={delivery.status === "delivered" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                                                          onClick={() => {
                                                            handleProductDeliveryChange(item.id, 'status', 'delivered')
                                                            handleProductDeliveryChange(item.id, 'quantity_delivered', availableQuantity)
                                                            handleProductDeliveryChange(item.id, 'quantity_returned', 0)
                                                          }}
                                                        >
                                                          <CheckCircle className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                          size="sm"
                                                          variant={delivery.status === "partial" ? "default" : "outline"}
                                                          className={delivery.status === "partial" ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""}
                                                          onClick={() => {
                                                            handleProductDeliveryChange(item.id, 'status', 'partial')
                                                          }}
                                                        >
                                                          <AlertCircle className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                          size="sm"
                                                          variant={delivery.status === "not_delivered" ? "destructive" : "outline"}
                                                          onClick={() => {
                                                            handleProductDeliveryChange(item.id, 'status', 'not_delivered')
                                                            handleProductDeliveryChange(item.id, 'quantity_delivered', 0)
                                                            handleProductDeliveryChange(item.id, 'quantity_returned', availableQuantity)
                                                          }}
                                                        >
                                                          <XCircle className="h-4 w-4" />
                                                        </Button>
                                                      </div>
                                                    ) : (
                                                      <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded">
                                                        {item.quantity_delivered > 0 && item.quantity_returned === 0 ? 'Entregado' :
                                                         item.quantity_delivered > 0 && item.quantity_returned > 0 ? 'Entrega Parcial' :
                                                         item.quantity_returned > 0 ? 'Devuelto' : 'Pendiente'}
                                                      </div>
                                                    )}
                                                  </div>

                                                  {/* Cantidades detalladas */}
                                                  {!isCompleted ? (
                                                    <div className="grid grid-cols-2 gap-4">
                                                      <div>
                                                        <Label>Cantidad entregada</Label>
                                                        <Input
                                                          type="number"
                                                          min="0"
                                                          max={availableQuantity}
                                                          value={delivery.quantity_delivered || 0}
                                                          onChange={(e) => handleProductDeliveryChange(item.id, 'quantity_delivered', parseInt(e.target.value) || 0)}
                                                        />
                                                      </div>
                                                      <div>
                                                        <Label>Cantidad devuelta</Label>
                                                        <Input
                                                          type="number"
                                                          min="0"
                                                          max={availableQuantity}
                                                          value={delivery.quantity_returned || 0}
                                                          onChange={(e) => handleProductDeliveryChange(item.id, 'quantity_returned', parseInt(e.target.value) || 0)}
                                                        />
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <div className="grid grid-cols-2 gap-4">
                                                      <div>
                                                        <Label className="text-gray-600">Cantidad entregada</Label>
                                                        <div className="bg-gray-100 px-3 py-2 rounded border text-sm">
                                                          {item.quantity_delivered || 0} {item.products?.unit}
                                                        </div>
                                                      </div>
                                                      <div>
                                                        <Label className="text-gray-600">Cantidad devuelta</Label>
                                                        <div className="bg-gray-100 px-3 py-2 rounded border text-sm">
                                                          {item.quantity_returned || 0} {item.products?.unit}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              )
                                            })}
                                          </div>

                                          {/* Razón general de devoluciones - aparece automáticamente si hay devoluciones */}
                                          {!isCompleted && Object.values(productDeliveries).some(d => d.quantity_returned > 0) && (
                                            <div className="border rounded-lg p-4 space-y-3 bg-yellow-50">
                                              <h3 className="font-semibold text-yellow-800">Motivo General de Devoluciones</h3>
                                              <Select 
                                                value={deliveryEvidence.general_return_reason || ""} 
                                                onValueChange={(value) => setDeliveryEvidence(prev => ({ ...prev, general_return_reason: value }))}
                                              >
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Seleccionar motivo general" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="cliente_no_presente">Cliente no presente</SelectItem>
                                                  <SelectItem value="producto_danado">Producto dañado</SelectItem>
                                                  <SelectItem value="cantidad_incorrecta">Cantidad incorrecta</SelectItem>
                                                  <SelectItem value="cliente_rechaza">Cliente rechaza el producto</SelectItem>
                                                  <SelectItem value="direccion_incorrecta">Dirección incorrecta</SelectItem>
                                                  <SelectItem value="calidad_no_satisfactoria">Calidad no satisfactoria</SelectItem>
                                                  <SelectItem value="otro">Otro motivo</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          )}

                                          {/* Botones finales */}
                                          <div className="flex justify-end gap-2">
                                            <Button variant="outline" onClick={() => setManageOrder(null)}>
                                              {isCompleted ? "Cerrar" : "Cancelar"}
                                            </Button>
                                            {!isCompleted && (
                                              <Button onClick={handleCompleteDelivery}>
                                                Completar Entrega
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-red-500">No se pudo cargar la información del pedido.</div>
                                      )}
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <div className="text-xs text-gray-400">No hay pedidos en entrega.</div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
                </div>
              </TabsContent>
              
              <TabsContent value="completed" className="space-y-4">
                {loadingCompleted ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Cargando rutas terminadas...</p>
                  </div>
                ) : completedRoutes.length === 0 ? (
                  <div className="bg-white rounded-lg border p-8 text-center">
                    <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay rutas terminadas</h3>
                    <p className="text-gray-500">Las rutas completadas aparecerán aquí</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {completedRoutes.map((route) => (
                      <Card key={route.id} className="bg-green-50 border-green-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <CardTitle className="text-green-800">{route.route_number ? `Ruta #${route.route_number} - ${route.route_name}` : route.route_name}</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                Completada
                              </Badge>
                              <span className="text-xs text-green-600">
                                {new Date(route.created_at).toLocaleDateString('es-ES')}
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {route.route_orders && route.route_orders.length > 0 ? (
                            <div className="space-y-2">
                              <div className="text-sm text-green-700 font-medium mb-2">
                                Total de entregas: {route.route_orders.length}
                              </div>
                              {route.route_orders
                                .sort((a: any, b: any) => (a.delivery_sequence || 0) - (b.delivery_sequence || 0))
                                .map((ro: any) => {
                                const order = ro.orders;
                                const statusIcon = order?.status === 'delivered' ? 
                                  <CheckCircle className="h-4 w-4 text-green-600" /> :
                                  order?.status === 'partially_delivered' ? 
                                  <AlertCircle className="h-4 w-4 text-orange-500" /> :
                                  order?.status === 'returned' ? 
                                  <XCircle className="h-4 w-4 text-red-500" /> :
                                  <CheckCircle className="h-4 w-4 text-gray-400" />
                                
                                const statusText = order?.status === 'delivered' ? 'Entregado' :
                                                 order?.status === 'partially_delivered' ? 'Parcial' :
                                                 order?.status === 'returned' ? 'Devuelto' : 'Completado'
                                
                                return (
                                  <div key={ro.id}
                                       className="flex items-center justify-between p-2 bg-white/60 rounded border border-green-200">
                                    <div className="flex items-center gap-2">
                                      {statusIcon}
                                      <div>
                                        <span className="font-medium text-sm">
                                          {order?.order_number || `Pedido ${ro.order_id}`}
                                        </span>
                                        {order && (
                                          <div className="text-xs text-gray-600">
                                            {order.clients?.name} • {order.order_items?.length || 0} productos
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-green-700">
                                        {statusText}
                                      </span>
                                      <Badge variant="outline" className="text-xs">
                                        #{ro.delivery_sequence}
                                      </Badge>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">No hay información de entregas.</div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
    </RouteGuard>
  )
}

// Componente para recibir pedidos (mobile-first, márgenes estrechos)
function ReceiveOrdersTab({ user, toast, refetch }: any) {
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingOrder, setProcessingOrder] = useState<string | null>(null)
  const [productStatus, setProductStatus] = useState<Record<string, {
    status: 'received' | 'not_received' | 'partial'
    quantity: number
  }>>({})

  // Cargar pedidos con estado "dispatched" asignados a rutas del conductor
  const loadPendingOrders = useCallback(async () => {
    if (!user) {
      return
    }

    try {
      setLoading(true)

      const result = await getPendingOrders(user.id, user.role || "driver")

      if (result.error) {
        throw new Error(result.error)
      }

      setPendingOrders(result.data?.orders || [])
    } catch (error) {
      console.error("Error loading pending orders:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los pedidos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  useEffect(() => {
    loadPendingOrders()
  }, [loadPendingOrders])

  // Cambiar estado de un producto
  const toggleProductStatus = (itemId: string, currentStatus: string, availableQty: number) => {
    setProductStatus(prev => {
      const current = prev[itemId]

      // Ciclo: received → not_received → partial → received
      let newStatus: 'received' | 'not_received' | 'partial'
      let newQuantity: number

      if (!current || current.status === 'received') {
        newStatus = 'not_received'
        newQuantity = 0
      } else if (current.status === 'not_received') {
        newStatus = 'partial'
        newQuantity = Math.floor(availableQty / 2) // 50% por defecto
      } else {
        newStatus = 'received'
        newQuantity = availableQty
      }

      return {
        ...prev,
        [itemId]: { status: newStatus, quantity: newQuantity }
      }
    })
  }

  // Actualizar cantidad para estado parcial
  const updatePartialQuantity = (itemId: string, quantity: number) => {
    setProductStatus(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: Math.max(0, quantity)
      }
    }))
  }

  // Enviar pedido a ruta (confirmar recepción)
  const handleSendToRoute = async (order: any) => {
    setProcessingOrder(order.id)

    try {
      // Preparar items con cantidades según el estado marcado
      const items: ItemReceiveUpdate[] = order.order_items.map((item: any) => {
        const status = productStatus[item.id]
        let quantityToSet = item.quantity_available

        if (status) {
          if (status.status === 'not_received') {
            quantityToSet = 0
          } else if (status.status === 'partial') {
            quantityToSet = status.quantity
          }
        }

        return {
          item_id: item.id,
          quantity_available: quantityToSet,
          quantity_missing: item.quantity_requested - quantityToSet,
        }
      })

      // Llamar Server Action
      const result = await receiveOrderToRoute(order.id, items)

      if (result.error) {
        throw new Error(result.error)
      }

      toast({
        title: "Pedido enviado a ruta",
        description: `${order.order_number} está listo para entregar`
      })

      // Limpiar estados de productos de este pedido
      const itemIds = order.order_items.map((i: any) => i.id)
      setProductStatus(prev => {
        const newState = { ...prev }
        itemIds.forEach((id: string) => delete newState[id])
        return newState
      })

      // Actualización optimista: remover el pedido de la lista local inmediatamente
      setPendingOrders(prev => prev.filter(o => o.id !== order.id))
    } catch (error) {
      console.error("Error sending to route:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo enviar el pedido a ruta",
        variant: "destructive"
      })
    } finally {
      setProcessingOrder(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500 text-sm">Cargando pedidos...</div>
      </div>
    )
  }

  if (pendingOrders.length === 0) {
    return (
      <Card className="mx-1">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm text-center">No hay pedidos por recibir</p>
          <p className="text-gray-400 text-xs text-center mt-1">Los pedidos despachados aparecerán aquí</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2 px-1">
      {pendingOrders.map((order) => {
        const isProcessing = processingOrder === order.id

        return (
          <Card key={order.id} className="overflow-hidden">
            <CardHeader className="p-3 pb-2 bg-blue-50">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base font-bold">{order.order_number}</CardTitle>
                  <p className="text-sm font-semibold text-gray-800 mt-1">{order.client?.name || order.clients?.name}</p>
                  {(order.branch?.name || order.branches?.name) && (
                    <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {order.branch?.name || order.branches?.name}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {order.order_items?.length || 0} items
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-2 space-y-1">
              {order.order_items?.map((item: any) => {
                const status = productStatus[item.id]
                const currentStatus = status?.status || 'received'
                const currentQty = status?.quantity ?? item.quantity_available
                const product = item.product || item.products

                // Iconos y colores según estado
                const statusConfig = {
                  received: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: '✓' },
                  not_received: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: '✗' },
                  partial: { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', label: '!' }
                }

                const config = statusConfig[currentStatus]
                const StatusIcon = config.icon

                // Formatear peso del producto
                const weightDisplay = product?.weight ?
                  (typeof product.weight === 'number' ? `${product.weight}g` : product.weight) : ''

                return (
                  <div key={`${order.id}-${item.id}`} className={`p-2 rounded border ${config.bg}`}>
                    <div className="flex items-center gap-2">
                      {/* Botón de estado */}
                      <button
                        onClick={() => toggleProductStatus(item.id, currentStatus, item.quantity_available)}
                        className={`w-8 h-8 shrink-0 rounded-full ${config.color} ${config.bg} border-2 flex items-center justify-center font-bold text-lg hover:opacity-80 transition-opacity`}
                        disabled={isProcessing}
                      >
                        {config.label}
                      </button>

                      {/* Info del producto */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {product?.name}{weightDisplay ? ` - ${weightDisplay}` : ''}
                        </p>
                        <p className="text-sm text-gray-700 font-semibold">
                          {currentStatus === 'partial' ? (
                            <span className="flex items-center gap-1">
                              <input
                                type="number"
                                value={currentQty}
                                onChange={(e) => updatePartialQuantity(item.id, parseInt(e.target.value) || 0)}
                                className="w-12 px-1 py-0 text-sm border rounded text-center"
                                disabled={isProcessing}
                                min="0"
                                max={item.quantity_available}
                              />
                              <span>/ {item.quantity_available} {product?.unit || 'und'}</span>
                            </span>
                          ) : (
                            <span>
                              {currentStatus === 'received' ? currentQty : 0} / {item.quantity_available} {product?.unit || 'und'}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Botón para enviar a ruta */}
              <Button
                onClick={() => handleSendToRoute(order)}
                disabled={isProcessing}
                className="w-full mt-3 bg-green-600 hover:bg-green-700"
                size="sm"
              >
                {isProcessing ? "Enviando..." : "Enviar a Ruta →"}
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}