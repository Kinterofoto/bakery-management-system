"use client"

import { useOrders } from "@/hooks/use-orders"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sidebar } from "@/components/layout/sidebar"
import { Check, AlertCircle, Eye, Package, Plus, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ReviewArea2Page() {
  const { orders, loading, completeArea2Review, updateOrderStatus } = useOrders()
  const { toast } = useToast()
  // Filtrar solo los pedidos en estado 'review_area2'
  const ordersToReview = orders.filter(order => order.status === "review_area2")

  // Estado local para notas y completados por item (por si el usuario edita antes de guardar)
  const [itemEdits, setItemEdits] = useState<{ [itemId: string]: { completed: number; notes: string } }>({})

  // Calcula los datos derivados para cada item
  const mapOrder = (order: any) => {
    return {
      ...order,
      client: order.client?.name || "-",
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
          product: item.product?.name || "-",
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

  // Guardar completado de faltantes en la base de datos
  const handleCompleteItem = async (itemId: string, completed: number, notes: string = "") => {
    await completeArea2Review(itemId, completed, notes)
    setItemEdits((prev) => ({ ...prev, [itemId]: { completed: 0, notes: "" } }))
  }

  // Enviar pedido a despacho
  const handleCompleteOrder = async (orderId: string) => {
    const order = ordersToReview.find(o => o.id === orderId)
    const mappedOrder = order ? mapOrder(order) : null
    const isComplete = mappedOrder ? isOrderComplete(mappedOrder) : false
    
    try {
      await updateOrderStatus(orderId, "ready_dispatch")
      
      if (isComplete) {
        toast({
          title: "Pedido enviado a despacho",
          description: "El pedido está completo y listo para ser despachado.",
        })
      } else {
        const missingItems = mappedOrder ? getTotalMissing(mappedOrder) : 0
        toast({
          title: "Pedido incompleto enviado",
          description: `Enviado a despacho con ${missingItems} items faltantes. Se despachará lo disponible.`,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar el pedido a despacho.",
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
                            <TableHead>Acciones</TableHead>
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
                              <TableCell>
                                {item.missing > 0 && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Completar Faltante - {item.product}</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <Label>Cantidad a completar (máx: {item.missing})</Label>
                                          <Input
                                            type="number"
                                            max={item.missing}
                                            min={0}
                                            value={itemEdits[item.id]?.completed ?? 0}
                                            onChange={(e) => handleEditItem(item.id, Number.parseInt(e.target.value) || 0, itemEdits[item.id]?.notes || "")}
                                          />
                                        </div>
                                        <div>
                                          <Label>Notas de producción</Label>
                                          <Textarea
                                            placeholder="Detalles sobre la producción adicional..."
                                            value={itemEdits[item.id]?.notes ?? ""}
                                            onChange={(e) => handleEditItem(item.id, itemEdits[item.id]?.completed ?? 0, e.target.value)}
                                          />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                          <Button variant="outline">Cancelar</Button>
                                          <Button
                                            onClick={() => handleCompleteItem(item.id, itemEdits[item.id]?.completed ?? 0, itemEdits[item.id]?.notes || "")}
                                          >
                                            Confirmar Completado
                                          </Button>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                )}
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
          </div>
        </main>
      </div>
    </div>
  )
}
