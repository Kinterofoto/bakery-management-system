"use client"

import { useOrders } from "@/hooks/use-orders"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/layout/sidebar"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { Check, AlertCircle, Eye, Package, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ReviewArea2Page() {
  const { orders, loading, completeArea2Review, updateOrderStatus, markOrderWithPendingMissing, clearOrderPendingMissing } = useOrders()
  const { toast } = useToast()

  // Filtrar pedidos para "A Proyectar" (review_area2)
  const ordersToReview = orders.filter(order => order.status === "review_area2")

  // Filtrar pedidos para "Faltantes" (has_pending_missing = true)
  const ordersWithMissing = orders.filter(order => order.has_pending_missing === true)

  // Estado local para notas y completados por item (por si el usuario edita antes de guardar)
  const [itemEdits, setItemEdits] = useState<{ [itemId: string]: { completed: number; notes: string } }>({})

  // Calcula los datos derivados para cada item
  const mapOrder = (order: any) => {
    return {
      ...order,
      client: `${order.client?.name || "-"}${order.branch ? ` - ${order.branch.name}` : ''}`,
      deliveryDate: order.expected_delivery_date,
      reviewedBy: order.updated_by || "-",
      reviewDate: order.updated_at ? new Date(order.updated_at).toLocaleString() : "-",
      items: order.order_items.map((item: any) => {
        const completed = itemEdits[item.id]?.completed ?? 0
        const notes = itemEdits[item.id]?.notes ?? ""
        const missing = item.quantity_missing ?? Math.max(0, item.quantity_requested - (item.quantity_available ?? 0))
        let status: "pending" | "partial" | "complete" = "pending"
        if (missing === 0) status = "complete"
        else if (completed > 0 && completed < missing) status = "partial"
        else if (completed >= missing) status = "complete"
        return {
          id: item.id,
          product: item.product?.name ?
            `${item.product.name}${item.product.weight ? ` - ${item.product.weight}` : ''}` :
            "-",
          requested: item.quantity_requested,
          available: item.quantity_available ?? 0,
          missing,
          status,
          completed,
          notes: notes || item.notes || "",
        }
      }),
    }
  }

  // Handlers para actualizar el estado local antes de guardar
  const handleEditItem = (itemId: string, completed: number, notes: string = "") => {
    setItemEdits((prev) => ({ ...prev, [itemId]: { completed, notes } }))
  }


  // Enviar pedido a despacho
  const handleCompleteOrder = async (orderId: string) => {
    const order = ordersToReview.find(o => o.id === orderId)

    try {
      let hasCompletedItems = false

      // Primero procesar todos los items que tienen cantidades completadas pendientes
      if (order) {
        for (const item of order.order_items) {
          const completedQuantity = itemEdits[item.id]?.completed ?? 0
          if (completedQuantity > 0) {
            console.log(`Processing item ${item.id} with completed quantity: ${completedQuantity}`)
            await completeArea2Review(item.id, completedQuantity, itemEdits[item.id]?.notes || "")
            hasCompletedItems = true
          }
        }

        // Limpiar los edits locales después de procesarlos
        setItemEdits({})
      }

      // Si algún item tiene quantity_completed > 0, marcar con faltantes pendientes
      if (hasCompletedItems) {
        await markOrderWithPendingMissing(orderId)
      }

      // Luego cambiar el status del pedido
      await updateOrderStatus(orderId, "ready_dispatch")

      if (hasCompletedItems) {
        toast({
          title: "Pedido enviado con faltantes",
          description: "El pedido ha sido enviado a despacho con items completados. Aparecerá en la pestaña Faltantes.",
        })
      } else {
        toast({
          title: "Pedido enviado a despacho",
          description: "El pedido está completo y listo para ser despachado.",
        })
      }
    } catch (error) {
      console.error("Error in handleCompleteOrder:", error)
      toast({
        title: "Error",
        description: "No se pudo procesar el pedido. Revisa la consola para más detalles.",
        variant: "destructive",
      })
    }
  }

  // Marcar pedido como completado desde pestaña de Faltantes
  const handleMarkMissingComplete = async (orderId: string) => {
    try {
      // Simplemente quitar la marca de faltantes pendientes
      await clearOrderPendingMissing(orderId)

      toast({
        title: "Faltantes completados",
        description: "El pedido ha sido marcado como completado y se ha removido de la lista de faltantes.",
      })
    } catch (error) {
      console.error("Error in handleMarkMissingComplete:", error)
      toast({
        title: "Error",
        description: "No se pudo marcar el pedido como completado.",
        variant: "destructive",
      })
    }
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendiente", color: "bg-red-100 text-red-800" },
      partial: { label: "Parcial", color: "bg-yellow-100 text-yellow-800" },
      complete: { label: "Completado", color: "bg-green-100 text-green-800" },
    }
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  }

  const getTotalMissing = (order: any) => {
    return order.items.reduce((total: number, item: any) => total + (item.missing - item.completed), 0)
  }

  const isOrderComplete = (order: any) => {
    return order.items.every((item: any) => item.missing === 0 || item.completed >= item.missing)
  }

  return (
    <RouteGuard 
      requiredPermissions={['order_management_review_area2']} 
      requiredRoles={['administrator', 'coordinador_logistico', 'reviewer']}
    >
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Revisión Área 2 - Completar Faltantes</h1>
              <p className="text-gray-600">Gestiona los productos faltantes identificados en la primera revisión</p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="proyectar" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
                <TabsTrigger value="proyectar" className="text-base">
                  A Proyectar ({ordersToReview.length})
                </TabsTrigger>
                <TabsTrigger value="faltantes" className="text-base">
                  Faltantes ({ordersWithMissing.length})
                </TabsTrigger>
              </TabsList>

              {/* Pestaña: A Proyectar */}
              <TabsContent value="proyectar">
                {/* Summary Stats */}
                <div className="flex overflow-x-auto gap-4 pb-4 md:grid md:grid-cols-4 md:gap-6 mb-8 md:overflow-visible md:pb-0">
                  <Card className="min-w-[200px] md:min-w-0">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-600">Pedidos Pendientes</p>
                          <p className="text-2xl md:text-3xl font-bold text-red-600">{ordersToReview.length}</p>
                        </div>
                        <AlertCircle className="h-6 w-6 md:h-8 md:w-8 text-red-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="min-w-[200px] md:min-w-0">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-600">Items Faltantes</p>
                          <p className="text-2xl md:text-3xl font-bold text-yellow-600">
                            {ordersToReview.reduce((total, order) => total + getTotalMissing(mapOrder(order)), 0)}
                          </p>
                        </div>
                        <Package className="h-6 w-6 md:h-8 md:w-8 text-yellow-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="min-w-[200px] md:min-w-0">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-600">Completados Hoy</p>
                          <p className="text-2xl md:text-3xl font-bold text-green-600">
                            {ordersToReview.reduce(
                              (total, order) =>
                                total + mapOrder(order).items.reduce((itemTotal: number, item: any) => itemTotal + item.completed, 0),
                              0,
                            )}
                          </p>
                        </div>
                        <Check className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="min-w-[200px] md:min-w-0">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-600">Tiempo Promedio</p>
                          <p className="text-2xl md:text-3xl font-bold text-blue-600">2.5h</p>
                        </div>
                        <Clock className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
            {/* Orders with Missing Items */}
            <div className="space-y-6">
              {ordersToReview.map((order) => {
                const mappedOrder = mapOrder(order)
                return (
                  <Card key={order.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 mr-4 space-y-1">
                          {/* Order number - primera línea */}
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 flex-shrink-0 text-gray-500" />
                            <span className="text-xs sm:text-sm font-medium text-gray-600">
                              {order.order_number}
                            </span>
                          </div>
                          
                          {/* Client name - segunda línea */}
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                            {mappedOrder.client}
                          </h3>
                          
                          {/* Delivery date - tercera línea */}
                          <p className="text-xs sm:text-sm text-gray-600">
                            Entrega: {mappedOrder.deliveryDate}
                          </p>
                          
                          {/* Additional info - cuarta línea en desktop */}
                          <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
                            <span>Revisado por: {mappedOrder.reviewedBy}</span>
                            <span>Fecha revisión: {mappedOrder.reviewDate}</span>
                          </div>
                          
                          {/* Badge faltantes */}
                          <div className="pt-1">
                            <Badge variant="outline" className="text-red-600 text-xs">
                              {getTotalMissing(mappedOrder)} items faltantes
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 w-8 sm:w-auto p-0 sm:px-3">
                                <Eye className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Ver Historial</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Historial de Revisión - {order.order_number}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="p-4 bg-blue-50 rounded-lg">
                                  <h4 className="font-semibold text-blue-900">Revisión Área 1</h4>
                                  <p className="text-sm text-blue-700">
                                    Completada por {mappedOrder.reviewedBy} el {mappedOrder.reviewDate}
                                  </p>
                                  <div className="mt-2 space-y-1">
                                    {mappedOrder.items.map((item) => (
                                      <div key={item.id} className="text-sm">
                                        • {item.product}: {item.available}/{item.requested} disponible
                                        {item.missing > 0 && (
                                          <span className="text-red-600"> ({item.missing} faltante)</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          <Button
                            onClick={() => handleCompleteOrder(order.id)}
                            size="sm"
                            className={`h-8 w-8 sm:w-auto p-0 sm:px-4 ${
                              isOrderComplete(mappedOrder) 
                                ? "bg-green-600 hover:bg-green-700" 
                                : "bg-yellow-600 hover:bg-yellow-700"
                            }`}
                          >
                            <Check className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">
                              {isOrderComplete(mappedOrder) 
                                ? "Enviar a Despacho" 
                                : "Enviar Incompleto"}
                            </span>
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead>Solicitado</TableHead>
                            <TableHead>Disponible (Área 1)</TableHead>
                            <TableHead>Faltante</TableHead>
                            <TableHead>Completado</TableHead>
                            <TableHead>Pendiente</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mappedOrder.items.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.product}</TableCell>
                              <TableCell>{item.requested}</TableCell>
                              <TableCell>{item.available}</TableCell>
                              <TableCell className="text-red-600 font-semibold">
                                {item.missing > 0 ? item.missing : "-"}
                              </TableCell>
                              <TableCell>
                                {item.missing > 0 ? (
                                  <Input
                                    type="number"
                                    value={itemEdits[item.id]?.completed ?? 0}
                                    onChange={(e) => handleEditItem(item.id, Number.parseInt(e.target.value) || 0, itemEdits[item.id]?.notes || "")}
                                    className="w-20"
                                    max={item.missing}
                                    min={0}
                                  />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={item.missing - (itemEdits[item.id]?.completed ?? 0) > 0 ? "text-red-600 font-semibold" : "text-gray-400"}
                                >
                                  {item.missing > 0 ? item.missing - (itemEdits[item.id]?.completed ?? 0) : "-"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge className={getStatusBadge(item.status).color}>
                                  {getStatusBadge(item.status).label}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {/* Notes section */}
                      <div className="mt-4 space-y-2">
                        {mappedOrder.items
                          .filter((item: any) => item.notes)
                          .map((item: any) => (
                            <div key={item.id} className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-yellow-600" />
                                <span className="font-medium text-yellow-800">{item.product}</span>
                              </div>
                              <p className="text-sm text-yellow-700 mt-1">{item.notes}</p>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
                {ordersToReview.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Check className="h-12 w-12 text-green-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No hay faltantes pendientes</h3>
                      <p className="text-gray-600">Todos los pedidos han completado la segunda revisión.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Pestaña: Faltantes */}
              <TabsContent value="faltantes">
                {/* Summary Stats para Faltantes */}
                <div className="flex overflow-x-auto gap-4 pb-4 md:grid md:grid-cols-3 md:gap-6 mb-8 md:overflow-visible md:pb-0">
                  <Card className="min-w-[200px] md:min-w-0">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-600">Pedidos con Faltantes</p>
                          <p className="text-2xl md:text-3xl font-bold text-orange-600">{ordersWithMissing.length}</p>
                        </div>
                        <AlertCircle className="h-6 w-6 md:h-8 md:w-8 text-orange-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="min-w-[200px] md:min-w-0">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-600">Total Items Completados</p>
                          <p className="text-2xl md:text-3xl font-bold text-red-600">
                            {ordersWithMissing.reduce((total, order) => {
                              return total + order.order_items.reduce((itemTotal, item) => {
                                return itemTotal + (item.quantity_completed ?? 0)
                              }, 0)
                            }, 0)}
                          </p>
                        </div>
                        <Package className="h-6 w-6 md:h-8 md:w-8 text-red-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="min-w-[200px] md:min-w-0">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-600">En Despacho</p>
                          <p className="text-2xl md:text-3xl font-bold text-blue-600">{ordersWithMissing.length}</p>
                        </div>
                        <Clock className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Órdenes con faltantes (solo lectura) */}
                <div className="space-y-6">
                  {ordersWithMissing.map((order) => {
                    const mappedOrder = mapOrder(order)
                    return (
                      <Card key={order.id} className="border-l-4 border-l-orange-500">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0 mr-4 space-y-1">
                              {/* Order number */}
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 flex-shrink-0 text-gray-500" />
                                <span className="text-xs sm:text-sm font-medium text-gray-600">
                                  {order.order_number}
                                </span>
                              </div>

                              {/* Client name */}
                              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                                {mappedOrder.client}
                              </h3>

                              {/* Delivery date */}
                              <p className="text-xs sm:text-sm text-gray-600">
                                Entrega: {mappedOrder.deliveryDate}
                              </p>

                              {/* Badge completados */}
                              <div className="pt-1">
                                <Badge variant="outline" className="text-orange-600 text-xs border-orange-300">
                                  {order.order_items.reduce((total, item) => total + (item.quantity_completed ?? 0), 0)} items completados
                                </Badge>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-8 w-8 sm:w-auto p-0 sm:px-3">
                                    <Eye className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Ver Detalles</span>
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Detalles del Pedido - {order.order_number}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="p-4 bg-orange-50 rounded-lg">
                                      <h4 className="font-semibold text-orange-900">Items Completados en Área 2</h4>
                                      <p className="text-sm text-orange-700">
                                        Items que fueron completados después de la primera revisión
                                      </p>
                                      <div className="mt-2 space-y-1">
                                        {order.order_items
                                          .filter(item => (item.quantity_completed ?? 0) > 0)
                                          .map((item) => (
                                            <div key={item.id} className="text-sm">
                                              • {item.product?.name || "-"}: {item.quantity_completed} completado(s)
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>

                              <Button
                                onClick={() => handleMarkMissingComplete(order.id)}
                                size="sm"
                                className="h-8 w-8 sm:w-auto p-0 sm:px-4 bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Completado</span>
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead>Solicitado</TableHead>
                                <TableHead>Disponible</TableHead>
                                <TableHead>Completado</TableHead>
                                <TableHead>Estado</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {order.order_items.map((item: any) => {
                                const completed = item.quantity_completed ?? 0
                                return (
                                  <TableRow key={item.id} className={completed > 0 ? "bg-orange-50" : ""}>
                                    <TableCell className="font-medium">
                                      {item.product?.name ?
                                        `${item.product.name}${item.product.weight ? ` - ${item.product.weight}` : ''}` :
                                        "-"}
                                    </TableCell>
                                    <TableCell>{item.quantity_requested}</TableCell>
                                    <TableCell>{item.quantity_available ?? 0}</TableCell>
                                    <TableCell className={completed > 0 ? "text-orange-600 font-semibold" : "text-gray-400"}>
                                      {completed > 0 ? completed : "-"}
                                    </TableCell>
                                    <TableCell>
                                      <Badge className={completed > 0 ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-800"}>
                                        {completed > 0 ? "Completado" : "Sin completar"}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {ordersWithMissing.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Check className="h-12 w-12 text-green-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pedidos con faltantes</h3>
                      <p className="text-gray-600">Todos los pedidos están completos.</p>
                    </CardContent>
                  </Card>
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
