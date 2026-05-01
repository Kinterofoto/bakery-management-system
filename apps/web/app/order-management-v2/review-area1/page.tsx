"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Sidebar } from "@/components/layout/sidebar"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { Check, X, AlertCircle, Eye, Package, Loader2, Filter } from "lucide-react"
import { useOrders } from "@/hooks/use-orders"
import { useToast } from "@/hooks/use-toast"
import { useOrderItemLots } from "@/hooks/use-order-item-lots"
import { useAuth } from "@/contexts/AuthContext"
import { OrderItemLotsModal } from "@/components/orders/OrderItemLotsModal"
import { OrderItemLotBadge } from "@/components/orders/OrderItemLotBadge"

export default function ReviewArea1Page() {
  const { orders, loading, updateItemAvailability, updateOrderStatus, refetch } = useOrders()
  const { toast } = useToast()
  const { user } = useAuth()
  const { assignFefoLots, clearLots } = useOrderItemLots()
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set())
  const [dateFilter, setDateFilter] = useState<"tomorrow" | "next_monday" | "all">("tomorrow")
  const [lotsModalOpen, setLotsModalOpen] = useState(false)
  const [lotsModalItem, setLotsModalItem] = useState<{
    orderItemId: string
    productId: string
    productName: string
    dispatchedQty: number
  } | null>(null)
  const [badgeRefreshKey, setBadgeRefreshKey] = useState(0)

  // Get tomorrow's date in YYYY-MM-DD format (Bogotá timezone)
  const getTomorrowDate = () => {
    const now = new Date()
    // Convertir a zona horaria de Bogotá (UTC-5)
    const bogotaTime = new Date(now.getTime() - (5 * 60 * 60 * 1000))
    bogotaTime.setDate(bogotaTime.getDate() + 1)
    return bogotaTime.toISOString().split('T')[0]
  }

  // Get next Monday's date in YYYY-MM-DD format (Bogotá timezone)
  const getNextMondayDate = () => {
    const now = new Date()
    // Convertir a zona horaria de Bogotá (UTC-5)
    const bogotaTime = new Date(now.getTime() - (5 * 60 * 60 * 1000))
    const dayOfWeek = bogotaTime.getDay()
    const daysUntilNextMonday = dayOfWeek === 1 ? 7 : (7 - dayOfWeek + 1) % 7 || 7
    const nextMonday = new Date(bogotaTime)
    nextMonday.setDate(bogotaTime.getDate() + daysUntilNextMonday)
    return nextMonday.toISOString().split('T')[0]
  }

  const tomorrowDate = getTomorrowDate()
  const nextMondayDate = getNextMondayDate()

  const filteredOrders = orders.filter((order) => order.status === "received" || order.status === "review_area1")

  const ordersToReview = filteredOrders.filter((order) => {
    if (dateFilter === "all") return true
    if (dateFilter === "tomorrow") return order.expected_delivery_date === tomorrowDate
    if (dateFilter === "next_monday") return order.expected_delivery_date === nextMondayDate
    return true
  })

  const updateItemStatus = async (
    orderId: string,
    itemId: string,
    status: "available" | "unavailable" | "partial",
    availableQty?: number,
  ) => {
    const item = orders.find((o) => o.id === orderId)?.order_items.find((i) => i.id === itemId)
    if (!item) return

    setProcessingItems((prev) => new Set(prev).add(itemId))

    try {
      let quantity_available = 0
      if (status === "available") {
        quantity_available = item.quantity_requested
      } else if (status === "partial" && availableQty !== undefined) {
        quantity_available = Math.min(availableQty, item.quantity_requested)
      }

      await updateItemAvailability(itemId, status, quantity_available)

      if (status === "available" || status === "partial") {
        const dispatchedQty =
          (item as any).quantity_dispatched && (item as any).quantity_dispatched > 0
            ? Number((item as any).quantity_dispatched)
            : quantity_available > 0
            ? quantity_available
            : Number(item.quantity_requested)

        if (item.product?.id && dispatchedQty > 0) {
          try {
            const result = await assignFefoLots(itemId, item.product.id, dispatchedQty, user?.id ?? null)
            setBadgeRefreshKey((k) => k + 1)
            await refetch()
            if (result.insufficient) {
              toast({
                title: "Stock insuficiente",
                description: `El stock disponible no cubre la cantidad pedida (faltan ${result.shortage.toFixed(
                  0
                )} unidades). Ajusta manualmente si es necesario.`,
                variant: "destructive",
              })
            } else {
              toast({
                title: "Éxito",
                description: "Estado y lotes asignados (FEFO)",
              })
            }
          } catch (lotErr) {
            console.error("Error assigning FEFO lots:", lotErr)
            toast({
              title: "Lotes no asignados",
              description: "Estado actualizado pero no se pudieron asignar lotes automáticamente.",
              variant: "destructive",
            })
          }
        } else {
          toast({
            title: "Éxito",
            description: "Estado del producto actualizado",
          })
        }
      } else {
        try {
          await clearLots(itemId)
          setBadgeRefreshKey((k) => k + 1)
          await refetch()
        } catch (clearErr) {
          console.error("Error clearing lots:", clearErr)
        }
        toast({
          title: "Éxito",
          description: "Estado del producto actualizado",
        })
      }
    } catch (error) {
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

  const completeReview = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId)
    const missingLote = order?.order_items.find(
      (i) =>
        (i.availability_status === "available" || i.availability_status === "partial") &&
        !(i as any).lot_id &&
        !i.lote,
    )
    if (missingLote) {
      toast({
        title: "Lote requerido",
        description: `Falta el lote de "${missingLote.product.name}${missingLote.product.weight ? ` - ${missingLote.product.weight}` : ""}"`,
        variant: "destructive",
      })
      return
    }

    try {
      await updateOrderStatus(orderId, "review_area2")
      toast({
        title: "Éxito",
        description: "Revisión completada, enviado al Área 2",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo completar la revisión",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendiente", color: "bg-gray-100 text-gray-800" },
      available: { label: "Disponible", color: "bg-green-100 text-green-800" },
      partial: { label: "Parcial", color: "bg-yellow-100 text-yellow-800" },
      unavailable: { label: "No Disponible", color: "bg-red-100 text-red-800" },
    }

    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  }

  const isOrderComplete = (order: any) => {
    return order.order_items.every((item: any) => item.availability_status !== "pending")
  }

  const handleLotsClick = (
    orderItemId: string,
    productId: string,
    productName: string,
    dispatchedQty: number
  ) => {
    setLotsModalItem({ orderItemId, productId, productName, dispatchedQty })
    setLotsModalOpen(true)
  }

  const handleLotsModalClose = () => {
    setLotsModalOpen(false)
    setLotsModalItem(null)
  }

  const handleLotsSaved = async () => {
    setBadgeRefreshKey((k) => k + 1)
    await refetch()
    toast({
      title: "Éxito",
      description: "Distribución de lotes guardada",
    })
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <RouteGuard
      requiredPermissions={['order_management_review_area1']}
      requiredRoles={['super_admin', 'administrator', 'coordinador_logistico', 'reviewer']}
    >
      <div className="flex h-screen bg-gray-50">
        <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Revisión Inicial - Área 1</h1>
                  <p className="text-gray-600">Verificar disponibilidad de productos para pedidos</p>
                </div>

                {/* Filter Controls */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Filtrar:</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant={dateFilter === "tomorrow" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDateFilter("tomorrow")}
                      className="text-xs"
                    >
                      Mañana ({filteredOrders.filter((order) => order.expected_delivery_date === tomorrowDate).length})
                    </Button>

                    <Button
                      variant={dateFilter === "next_monday" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDateFilter("next_monday")}
                      className="text-xs"
                    >
                      Lunes ({filteredOrders.filter((order) => order.expected_delivery_date === nextMondayDate).length})
                    </Button>

                    <Button
                      variant={dateFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDateFilter("all")}
                      className="text-xs"
                    >
                      Todos ({filteredOrders.length})
                    </Button>
                  </div>
                </div>
              </div>

              {/* Status indicator */}
              {dateFilter !== "all" && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-800 font-medium">
                      {dateFilter === "tomorrow" && `Mostrando solo pedidos con entrega mañana (${tomorrowDate})`}
                      {dateFilter === "next_monday" && `Mostrando solo pedidos con entrega el próximo lunes (${nextMondayDate})`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Orders to Review */}
            <div className="space-y-6">
              {ordersToReview.map((order) => (
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
                          {order.client.name}{order.branch ? ` - ${order.branch.name}` : ''}
                        </h3>
                        
                        {/* Delivery date - tercera línea */}
                        <p className="text-xs sm:text-sm text-gray-600">
                          Entrega: {order.expected_delivery_date}
                        </p>
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
                              <DialogTitle>Detalles del Pedido {order.order_number}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Cliente: {order.client.name}{order.branch ? ` - ${order.branch.name}` : ''}</Label>
                              </div>
                              <div>
                                <Label>Fecha de entrega: {order.expected_delivery_date}</Label>
                              </div>
                              {order.observations && (
                                <div>
                                  <Label>Observaciones: {order.observations}</Label>
                                </div>
                              )}
                              <div>
                                <Label>Productos solicitados:</Label>
                                <ul className="mt-2 space-y-1">
                                  {order.order_items.map((item) => (
                                    <li key={item.id} className="text-sm">
                                      • {item.product.name} {item.product.weight && `- ${item.product.weight}`}: {item.quantity_requested} {item.product.unit}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Button 
                          onClick={() => completeReview(order.id)} 
                          disabled={!isOrderComplete(order)}
                          size="sm"
                          className="h-8 w-8 sm:w-auto p-0 sm:px-4"
                        >
                          <Check className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Completar Revisión</span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Lote</TableHead>
                          <TableHead>Cantidad Solicitada</TableHead>
                          <TableHead>Disponible</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.order_items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.product.name} {item.product.weight && `- ${item.product.weight}`}
                            </TableCell>
                            <TableCell>
                              <OrderItemLotBadge
                                orderItemId={item.id}
                                fallbackLote={item.lote ?? null}
                                refreshKey={badgeRefreshKey}
                                onClick={() =>
                                  handleLotsClick(
                                    item.id,
                                    item.product.id,
                                    `${item.product.name}${item.product.weight ? ` - ${item.product.weight}` : ''}`,
                                    Number(
                                      (item as any).quantity_dispatched && (item as any).quantity_dispatched > 0
                                        ? (item as any).quantity_dispatched
                                        : item.quantity_available && item.quantity_available > 0
                                        ? item.quantity_available
                                        : item.quantity_requested
                                    )
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>{item.quantity_requested}</TableCell>
                            <TableCell>
                              {item.availability_status === "partial" ? (
                                <Input
                                  type="number"
                                  value={item.quantity_available}
                                  onChange={(e) =>
                                    updateItemStatus(order.id, item.id, "partial", Number.parseInt(e.target.value))
                                  }
                                  className="w-20"
                                  max={item.quantity_requested}
                                  min={0}
                                />
                              ) : (
                                item.quantity_available
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusBadge(item.availability_status).color}>
                                {getStatusBadge(item.availability_status).label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateItemStatus(order.id, item.id, "available")}
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
                                  onClick={() => updateItemStatus(order.id, item.id, "unavailable")}
                                  className="text-red-600 hover:text-red-700"
                                  disabled={processingItems.has(item.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    updateItemStatus(
                                      order.id,
                                      item.id,
                                      "partial",
                                      Math.floor(item.quantity_requested / 2),
                                    )
                                  }
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
              ))}
            </div>

            {ordersToReview.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pedidos para revisar</h3>
                  <p className="text-gray-600">Todos los pedidos han sido procesados en esta área.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>

      {/* Lots distribution modal */}
      <OrderItemLotsModal
        isOpen={lotsModalOpen}
        onClose={handleLotsModalClose}
        orderItemId={lotsModalItem?.orderItemId ?? null}
        productId={lotsModalItem?.productId ?? null}
        productName={lotsModalItem?.productName ?? ""}
        dispatchedQty={lotsModalItem?.dispatchedQty ?? 0}
        userId={user?.id ?? null}
        onSaved={handleLotsSaved}
      />
    </div>
    </RouteGuard>
  )
}
