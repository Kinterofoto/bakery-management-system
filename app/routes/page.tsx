"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRoutes } from "@/hooks/use-routes"
import { useVehicles } from "@/hooks/use-vehicles"
import { useDrivers } from "@/hooks/use-drivers"
import { useReturns } from "@/hooks/use-returns"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Clock, MapPin, Route, User, CheckCircle, XCircle, AlertCircle, Plus, Truck, UserPlus, Trash2 } from "lucide-react"

export default function RoutesPage() {
  const { routes, loading, error, updateDeliveryStatus, createRoute, refetch } = useRoutes()
  const { vehicles, createVehicle, assignDriverToVehicle, refetch: refetchVehicles } = useVehicles()
  const { drivers, allUsers, createDriver, refetch: refetchDrivers } = useDrivers()
  const { createReturn } = useReturns()
  const { toast } = useToast()
  
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

  // Función para subir evidencia a Supabase Storage
  const uploadEvidence = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `evidence_delivery_${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    // Subir archivo al bucket 'evidencia_de_entrega'
    const { data, error } = await supabase.storage
      .from('evidencia_de_entrega')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Error uploading evidence:', error)
      throw new Error(`Error al subir la evidencia: ${error.message}`)
    }

    // Obtener la URL pública del archivo
    const { data: { publicUrl } } = supabase.storage
      .from('evidencia_de_entrega')
      .getPublicUrl(filePath)

    return publicUrl
  }

  // Función para eliminar evidencia de Supabase Storage
  const deleteEvidence = async (evidenceUrl: string): Promise<void> => {
    try {
      // Extraer el path del archivo de la URL
      const urlParts = evidenceUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      
      const { error } = await supabase.storage
        .from('evidencia_de_entrega')
        .remove([fileName])
      
      if (error) {
        console.error('Error deleting evidence:', error)
        throw new Error(`Error al eliminar la evidencia: ${error.message}`)
      }
    } catch (err) {
      console.error('Error in deleteEvidence:', err)
      throw err
    }
  }

  const handleEvidenceUpload = async (file: File) => {
    setUploadingEvidence(true)
    
    try {
      const evidenceUrl = await uploadEvidence(file)
      setDeliveryEvidence(prev => ({ ...prev, evidence_url: evidenceUrl }))
      setEvidenceFile(file)
      
      toast({
        title: "Evidencia subida",
        description: "La foto se ha guardado correctamente",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo subir la evidencia",
        variant: "destructive",
      })
    } finally {
      setUploadingEvidence(false)
    }
  }

  const handleEvidenceDelete = async () => {
    if (!deliveryEvidence.evidence_url) return
    
    try {
      await deleteEvidence(deliveryEvidence.evidence_url)
      
      // Limpiar el estado local
      setDeliveryEvidence(prev => ({ ...prev, evidence_url: undefined }))
      setEvidenceFile(null)
      
      toast({
        title: "Evidencia eliminada",
        description: "La foto se ha eliminado correctamente",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la evidencia",
        variant: "destructive",
      })
    }
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

    try {
      // Subir evidencia si existe
      let evidenceUrl = deliveryEvidence.evidence_url
      if (evidenceFile && !evidenceUrl) {
        evidenceUrl = await uploadEvidence(evidenceFile)
      }
      
      // Obtener razón general de devolución
      const hasReturns = Object.values(productDeliveries).some(d => d.quantity_returned > 0)
      const generalReason = hasReturns ? deliveryEvidence.general_return_reason || "Devolución sin motivo especificado" : undefined
      
      // Procesar cada producto según su estado
      for (const item of manageOrder.orders.order_items) {
        const delivery = productDeliveries[item.id]
        if (!delivery) continue

        console.log("Processing delivery for:", {
          routeOrderId: manageOrder.id,
          orderItemId: item.id,
          delivery: delivery,
          generalReason: generalReason
        })

        try {
          await updateDeliveryStatus(manageOrder.id, item.id, {
            delivery_status: delivery.status === "delivered" ? "delivered" : 
                           delivery.status === "partial" ? "partial" : "rejected",
            quantity_delivered: delivery.quantity_delivered,
            quantity_rejected: delivery.quantity_returned || 0,
            rejection_reason: delivery.quantity_returned > 0 ? generalReason : undefined,
            evidence_url: evidenceUrl,
            delivery_notes: `Entregado: ${delivery.quantity_delivered}, Devuelto: ${delivery.quantity_returned || 0}`
          })
        } catch (itemError: any) {
          console.error("Error updating delivery status for item:", item.id, itemError)
          const errorMessage = itemError?.message || 
                             (typeof itemError === 'string' ? itemError : 
                              JSON.stringify(itemError))
          throw new Error(`Error procesando producto ${item.products?.name}: ${errorMessage}`)
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
      
      console.log("Refetching routes after delivery completion...")
      await refetch()
    } catch (error: any) {
      console.error("Error completing delivery:", error)
      toast({
        title: "Error updating delivery status",
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
      await createReturn({
        order_id: manageOrder.orders.id,
        product_id: selectedProductForReturn.product_id,
        quantity_returned: returnQuantity,
        return_reason: returnReason,
        route_id: manageOrder.route_id,
        rejection_reason: returnReason,
      })

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
              {/* Header buttons would go here */}
            </div>
            
            <Tabs defaultValue="list" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list">Vista Lista</TabsTrigger>
                <TabsTrigger value="gantt">Vista Planificador</TabsTrigger>
              </TabsList>
              
              <TabsContent value="list" className="space-y-4">
                <div className="grid gap-4">
                  {routes.map((route) => (
                    <Card key={route.id}>
                      <CardHeader>
                        <CardTitle>{route.route_name}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-2">
                        {route.route_orders && route.route_orders.length > 0 ? (
                          route.route_orders
                            .filter((ro) => {
                              // Hide delivered orders from the routes view
                              return ro.orders?.status !== 'delivered'
                            })
                            .map((ro) => {
                            const order = ro.orders;
                            return (
                              <div key={order?.id || ro.order_id} className="border rounded-lg p-3 bg-white flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  {order ? (
                                    <span className="font-semibold text-sm">{order.order_number}</span>
                                  ) : (
                                    <span className="font-semibold text-sm text-red-500">Pedido asignado (ID: {ro.order_id})</span>
                                  )}
                                </div>
                                {order ? (
                                  <>
                                    <div className="text-xs text-gray-600">Cliente: {order.clients?.name}</div>
                                    <div className="text-xs text-gray-600">
                                      Productos: {order.order_items?.length || 0}
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-xs text-red-500">No se pudo cargar la información del pedido.</div>
                                )}
                                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                                  <Dialog open={manageOrder === ro} onOpenChange={open => setManageOrder(open ? ro : null)}>
                                    <DialogTrigger asChild>
                                      <Button size="sm" className="w-full sm:w-auto">Gestionar Entrega</Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                      <DialogHeader>
                                        <DialogTitle>Gestionar Entrega Detallada</DialogTitle>
                                      </DialogHeader>
                                      {order ? (
                                        <div className="space-y-6">
                                          {/* Información del pedido */}
                                          <div className="bg-gray-50 p-4 rounded-lg">
                                            <div className="font-semibold text-lg">Pedido: {order.order_number}</div>
                                            <div className="text-sm text-gray-600">Cliente: {order.clients?.name}</div>
                                            <div className="text-sm text-gray-600">Fecha de entrega: {order.expected_delivery_date}</div>
                                          </div>

                                          {/* Evidencia única por entrega */}
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
                                                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                                                  <div className="flex justify-between items-start">
                                                    <div>
                                                      <div className="font-semibold">{item.products?.name}</div>
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
                                                  </div>

                                                  {/* Cantidades detalladas */}
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
                                                </div>
                                              )
                                            })}
                                          </div>

                                          {/* Razón general de devoluciones - aparece automáticamente si hay devoluciones */}
                                          {Object.values(productDeliveries).some(d => d.quantity_returned > 0) && (
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
                                              Cancelar
                                            </Button>
                                            <Button onClick={handleCompleteDelivery}>
                                              Completar Entrega
                                            </Button>
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
                          <div className="text-xs text-gray-400">No hay pedidos asignados a esta ruta.</div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="gantt" className="space-y-4">
                <div className="bg-white rounded-lg border">
                  <div className="p-6 text-center text-gray-500">
                    Vista Gantt - En construcción
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}