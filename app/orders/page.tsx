"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sidebar } from "@/components/layout/sidebar"
import { Plus, Search, Filter, Eye, Edit, Calendar, X, Loader2, AlertCircle, CircleSlash } from "lucide-react"
import { OrderSourceIcon } from "@/components/ui/order-source-icon"
import { useOrders } from "@/hooks/use-orders"
import { useClients } from "@/hooks/use-clients"
import { useProducts } from "@/hooks/use-products"
import { useBranches } from "@/hooks/use-branches"
import { useToast } from "@/hooks/use-toast"
import { Package } from "lucide-react" // Import Package component
import { supabase } from "@/lib/supabase"

interface OrderItem {
  product_id: string
  quantity_requested: number
  unit_price: number
}

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([{ product_id: "", quantity_requested: 1, unit_price: 0 }])
  const [selectedClient, setSelectedClient] = useState("")
  const [selectedBranch, setSelectedBranch] = useState("")
  const [deliveryDate, setDeliveryDate] = useState("")
  const [observations, setObservations] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  // Estado para edición de items
  const [editOrderItems, setEditOrderItems] = useState<OrderItem[]>([])

  const { orders, loading, createOrder, error, refetch } = useOrders()
  const { clients, loading: clientsLoading } = useClients()
  const { products, loading: productsLoading } = useProducts()
  const { branches, getBranchesByClient } = useBranches()
  const { toast } = useToast()

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      received: { label: "Recibido", color: "bg-gray-100 text-gray-800" },
      review_area1: { label: "Revisión Área 1", color: "bg-yellow-100 text-yellow-800" },
      review_area2: { label: "Revisión Área 2", color: "bg-orange-100 text-orange-800" },
      ready_dispatch: { label: "Listo Despacho", color: "bg-blue-100 text-blue-800" },
      dispatched: { label: "Despachado", color: "bg-purple-100 text-purple-800" },
      in_delivery: { label: "En Entrega", color: "bg-indigo-100 text-indigo-800" },
      delivered: { label: "Entregado", color: "bg-green-100 text-green-800" },
      cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800" },
    }

    return (
      statusConfig[status as keyof typeof statusConfig] || {
        label: status,
        color: "bg-gray-100 text-gray-800",
      }
    )
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const addOrderItem = () => {
    setOrderItems([...orderItems, { product_id: "", quantity_requested: 1, unit_price: 0 }])
  }

  const removeOrderItem = (index: number) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index))
    }
  }

  const updateOrderItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const updated = [...orderItems]
    if (field === "product_id") {
      updated[index][field] = value as string
      // Auto-fill price when product is selected
      const product = products.find((p) => p.id === value)
      if (product && product.price) {
        updated[index].unit_price = product.price
      }
    } else {
      updated[index][field] = Number(value) || 0
    }
    setOrderItems(updated)
  }

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => total + item.quantity_requested * item.unit_price, 0)
  }

  const resetForm = () => {
    setSelectedClient("")
    setSelectedBranch("")
    setDeliveryDate("")
    setObservations("")
    setOrderItems([{ product_id: "", quantity_requested: 1, unit_price: 0 }])
  }

  const handleCreateOrder = async () => {
    // Better validation
    const validItems = orderItems.filter(
      (item) => item.product_id && item.quantity_requested > 0 && item.unit_price > 0,
    )

    if (!selectedClient) {
      toast({
        title: "Error",
        description: "Por favor selecciona un cliente",
        variant: "destructive",
      })
      return
    }

    if (!selectedBranch) {
      toast({
        title: "Error",
        description: "Por favor selecciona una sucursal",
        variant: "destructive",
      })
      return
    }

    if (!deliveryDate) {
      toast({
        title: "Error",
        description: "Por favor selecciona una fecha de entrega",
        variant: "destructive",
      })
      return
    }

    if (validItems.length === 0) {
      toast({
        title: "Error",
        description: "Por favor agrega al menos un producto válido con cantidad y precio",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Log detallado de los datos enviados
      console.log("Datos enviados a createOrder:", {
        client_id: selectedClient,
        branch_id: selectedBranch,
        expected_delivery_date: deliveryDate,
        observations: observations || undefined,
        items: validItems,
      })

      await createOrder({
        client_id: selectedClient,
        branch_id: selectedBranch,
        expected_delivery_date: deliveryDate,
        observations: observations || undefined,
        items: validItems,
      })

      toast({
        title: "Éxito",
        description: "Pedido creado correctamente",
      })

      // Reset form
      resetForm()
      setIsNewOrderOpen(false)
    } catch (error: any) {
      console.error("Error creating order:", error)
      // Mostrar mensaje de error detallado de Supabase si existe
      toast({
        title: "Error",
        description: error?.message || error?.details || "No se pudo crear el pedido",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Función para abrir el diálogo de ver/editar
  const handleViewOrder = (order: any) => {
    setSelectedOrder(order)
    setIsEditMode(false)
    setIsOrderDialogOpen(true)
  }

  // Cuando se selecciona una orden para editar, inicializar los items editables
  const handleEditOrder = (order: any) => {
    setSelectedOrder(order)
    setEditOrderItems(order.order_items.map((item: any) => ({
      product_id: item.product.id,
      quantity_requested: item.quantity_requested,
      unit_price: item.unit_price || 0,
    })))
    setIsEditMode(true)
    setIsOrderDialogOpen(true)
  }

  // Actualizar producto/cantidad en items editables
  const updateEditOrderItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const updated = [...editOrderItems]
    if (field === "product_id") {
      updated[index][field] = value as string
      // Auto-fill price cuando se cambia producto
      const product = products.find((p) => p.id === value)
      if (product && product.price) {
        updated[index].unit_price = product.price
      }
    } else {
      updated[index][field] = Number(value) || 0
    }
    setEditOrderItems(updated)
  }

  // Eliminar un item en edición
  const removeEditOrderItem = (index: number) => {
    if (editOrderItems.length > 1) {
      setEditOrderItems(editOrderItems.filter((_, i) => i !== index))
    }
  }

  // Agregar un nuevo item en edición
  const addEditOrderItem = () => {
    setEditOrderItems([
      ...editOrderItems,
      { product_id: "", quantity_requested: 1, unit_price: 0 },
    ])
  }

  // Guardar cambios en Supabase (actualizado para agregar/eliminar)
  const handleSaveOrderEdit = async () => {
    if (!selectedOrder) return
    // Validar items
    const validItems = editOrderItems.filter(
      (item) => item.product_id && item.quantity_requested > 0 && item.unit_price > 0,
    )
    if (validItems.length === 0) {
      toast({
        title: "Error",
        description: "Debes agregar al menos un producto válido con cantidad y precio",
        variant: "destructive",
      })
      return
    }
    setIsSubmitting(true)
    try {
      // 1. Eliminar items que ya no están
      const oldIds = selectedOrder.order_items.map((item: any) => item.id)
      const newProductIds = validItems.map((item) => item.product_id)
      for (let i = 0; i < selectedOrder.order_items.length; i++) {
        const oldItem = selectedOrder.order_items[i]
        if (!newProductIds.includes(oldItem.product.id)) {
          await supabase.from("order_items").delete().eq("id", oldItem.id)
        }
      }
      // 2. Actualizar o agregar items
      for (let i = 0; i < validItems.length; i++) {
        const newItem = validItems[i]
        // Buscar si ya existe
        const existing = selectedOrder.order_items.find((oi: any) => oi.product.id === newItem.product_id)
        if (existing) {
          // Actualizar
          await supabase.from("order_items").update({
            quantity_requested: newItem.quantity_requested,
            unit_price: newItem.unit_price,
          }).eq("id", existing.id)
        } else {
          // Agregar nuevo
          await supabase.from("order_items").insert({
            order_id: selectedOrder.id,
            product_id: newItem.product_id,
            quantity_requested: newItem.quantity_requested,
            unit_price: newItem.unit_price,
            availability_status: "pending",
            quantity_available: 0,
            quantity_missing: newItem.quantity_requested,
            quantity_dispatched: 0,
            quantity_delivered: 0,
            quantity_returned: 0,
          })
        }
      }
      // 3. Calcular y actualizar el total_value
      const newTotal = validItems.reduce((sum, item) => sum + item.quantity_requested * item.unit_price, 0)
      await supabase.from("orders").update({ total_value: newTotal }).eq("id", selectedOrder.id)

      toast({
        title: "Éxito",
        description: "Pedido actualizado correctamente",
      })
      setIsOrderDialogOpen(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || error?.details || "No se pudo actualizar el pedido",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Función para cancelar una orden
  const handleCancelOrder = async (orderId: string) => {
    setIsSubmitting(true)
    try {
      await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId)
      toast({
        title: "Orden cancelada",
        description: "La orden ha sido marcada como cancelada.",
      })
      // Refrescar lista de pedidos
      // Assuming 'refetch' is available from useOrders hook or passed as a prop
      // For now, we'll just re-fetch the orders directly or rely on the table's data fetching
      // If 'refetch' is not available, you might need to re-fetch the orders state
      // This part of the original code doesn't have a 'refetch' function, so we'll just toast.
      // If you want to re-fetch, you'd need to pass a function like `refetchOrders` to the component.
      // For now, we'll just toast.
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || error?.details || "No se pudo cancelar la orden",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || clientsLoading || productsLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando datos...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Error: {error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Recargar Página
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestión de Pedidos</h1>
                <p className="text-gray-600">Administra todos los pedidos del sistema</p>
              </div>
              <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Pedido
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Pedido</DialogTitle>
                    <DialogDescription>
                      Completa la información del pedido y agrega los productos necesarios.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="client">Cliente *</Label>
                        <Select value={selectedClient} onValueChange={(value) => {
                          setSelectedClient(value)
                          setSelectedBranch("") // Reset branch when client changes
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="branch">Sucursal *</Label>
                        <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={!selectedClient}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar sucursal" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedClient && getBranchesByClient(selectedClient).map((branch) => (
                              <SelectItem key={branch.id} value={branch.id}>
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="delivery-date">Fecha de Entrega *</Label>
                      <Input
                        type="date"
                        id="delivery-date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>

                    {/* Products Section */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-base font-semibold">Productos del Pedido</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addOrderItem}>
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar Producto
                        </Button>
                      </div>

                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {orderItems.map((item, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 border rounded-lg">
                            <div className="col-span-5">
                              <Select
                                value={item.product_id}
                                onValueChange={(value) => updateOrderItem(index, "product_id", value)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Seleccionar producto" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.name} - ${product.price?.toLocaleString() || "0"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                placeholder="Cantidad"
                                className="h-8"
                                value={item.quantity_requested || ""}
                                onChange={(e) => updateOrderItem(index, "quantity_requested", e.target.value)}
                                min="1"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                placeholder="Precio"
                                className="h-8"
                                value={item.unit_price || ""}
                                onChange={(e) => updateOrderItem(index, "unit_price", e.target.value)}
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <div className="col-span-2">
                              <span className="text-sm font-medium">
                                ${(item.quantity_requested * item.unit_price).toLocaleString()}
                              </span>
                            </div>
                            <div className="col-span-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 bg-transparent"
                                onClick={() => removeOrderItem(index)}
                                disabled={orderItems.length === 1}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Total */}
                      <div className="flex justify-end p-3 bg-gray-50 rounded-lg">
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Total del Pedido</div>
                          <div className="text-lg font-bold">${calculateTotal().toLocaleString()}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="observations">Observaciones</Label>
                      <Textarea
                        id="observations"
                        placeholder="Observaciones del cliente..."
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          resetForm()
                          setIsNewOrderOpen(false)
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateOrder} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Crear Pedido
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Buscar por número de pedido o cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-48">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="received">Recibido</SelectItem>
                        <SelectItem value="review_area1">Revisión Área 1</SelectItem>
                        <SelectItem value="review_area2">Revisión Área 2</SelectItem>
                        <SelectItem value="ready_dispatch">Listo Despacho</SelectItem>
                        <SelectItem value="dispatched">Despachado</SelectItem>
                        <SelectItem value="in_delivery">En Entrega</SelectItem>
                        <SelectItem value="delivered">Entregado</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
              <CardHeader>
                <CardTitle>Pedidos ({filteredOrders.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pedidos</h3>
                    <p className="text-gray-600">Crea tu primer pedido para comenzar.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Sucursal</TableHead>
                        <TableHead>Contacto</TableHead>
                        <TableHead>Fecha Entrega</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Origen</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Entrega</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.order_number}</TableCell>
                          <TableCell>{order.client.name}</TableCell>
                          <TableCell>{order.branch ? order.branch.name : "-"}</TableCell>
                          <TableCell>{order.client.contact_person || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              {order.expected_delivery_date}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(order.status).color}>
                              {getStatusBadge(order.status).label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <OrderSourceIcon 
                              source={order.created_by_user?.name || ""} 
                              userName={order.created_by_user?.name || "Usuario desconocido"} 
                            />
                          </TableCell>
                          <TableCell>{order.order_items.length} productos</TableCell>
                          <TableCell className="font-semibold">${(order.total_value || 0).toLocaleString()}</TableCell>
                          <TableCell>
                            {order.status === 'delivered' ? (
                              <div className="text-xs space-y-1">
                                {order.order_items.map((item: any) => {
                                  const delivered = item.quantity_delivered || 0
                                  const requested = item.quantity_requested || 0
                                  const returned = item.quantity_returned || 0
                                  const isComplete = delivered === requested && returned === 0
                                  
                                  return (
                                    <div key={item.id} className={`flex items-center gap-1 ${isComplete ? 'text-green-600' : 'text-orange-600'}`}>
                                      <span className="font-medium">{delivered}/{requested}</span>
                                      {returned > 0 && <span className="text-red-500">(-{returned})</span>}
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">Pendiente</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleViewOrder(order)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleEditOrder(order)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant={order.status === 'cancelled' ? 'destructive' : 'outline'}
                                size="sm"
                                onClick={async () => {
                                  if (order.status !== 'cancelled') {
                                    await handleCancelOrder(order.id)
                                    await refetch()
                                  }
                                }}
                                disabled={order.status === 'cancelled'}
                              >
                                <CircleSlash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Dialog para ver/editar orden */}
            <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {isEditMode ? "Editar Pedido" : "Detalle del Pedido"}
                  </DialogTitle>
                </DialogHeader>
                {selectedOrder && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Número de Pedido</Label>
                        <Input value={selectedOrder.order_number} disabled readOnly />
                      </div>
                      <div>
                        <Label>Cliente</Label>
                        <Input value={selectedOrder.client.name} disabled readOnly />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Fecha de Entrega</Label>
                        <Input value={selectedOrder.expected_delivery_date} disabled={!isEditMode} readOnly={!isEditMode} />
                      </div>
                      <div>
                        <Label>Estado</Label>
                        <Input value={getStatusBadge(selectedOrder.status).label} disabled readOnly />
                      </div>
                    </div>
                    {isEditMode ? (
                      <div>
                        <Label>Productos</Label>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Puedes agregar o eliminar productos</span>
                          <Button type="button" variant="outline" size="sm" onClick={addEditOrderItem}>
                            <Plus className="h-4 w-4 mr-2" /> Agregar Producto
                          </Button>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Producto</TableHead>
                              <TableHead>Cantidad</TableHead>
                              <TableHead>Precio</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {editOrderItems.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Select
                                    value={item.product_id}
                                    onValueChange={(value) => updateEditOrderItem(index, "product_id", value)}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Seleccionar producto" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {products.map((product) => (
                                        <SelectItem key={product.id} value={product.id}>
                                          {product.name} - ${product.price?.toLocaleString() || "0"}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={item.quantity_requested}
                                    min={1}
                                    onChange={(e) => updateEditOrderItem(index, "quantity_requested", e.target.value)}
                                    className="h-8"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={item.unit_price}
                                    min={0}
                                    step={0.01}
                                    onChange={(e) => updateEditOrderItem(index, "unit_price", e.target.value)}
                                    className="h-8"
                                  />
                                </TableCell>
                                <TableCell>
                                  ${(item.quantity_requested * item.unit_price).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 bg-transparent"
                                    onClick={() => removeEditOrderItem(index)}
                                    disabled={editOrderItems.length === 1}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="flex justify-end mt-4">
                          <Button onClick={handleSaveOrderEdit} disabled={isSubmitting}>
                            {isSubmitting ? "Guardando..." : "Guardar cambios"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Label>Productos</Label>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Producto</TableHead>
                              <TableHead>Cantidad Solicitada</TableHead>
                              {selectedOrder.status === 'delivered' && (
                                <>
                                  <TableHead>Cantidad Entregada</TableHead>
                                  <TableHead>Cantidad Devuelta</TableHead>
                                  <TableHead>Estado</TableHead>
                                </>
                              )}
                              <TableHead>Precio</TableHead>
                              <TableHead>Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedOrder.order_items.map((item: any) => {
                              const delivered = item.quantity_delivered || 0
                              const requested = item.quantity_requested || 0
                              const returned = item.quantity_returned || 0
                              const isComplete = delivered === requested && returned === 0
                              
                              return (
                                <TableRow key={item.id}>
                                  <TableCell>{item.product.name}</TableCell>
                                  <TableCell>{requested}</TableCell>
                                  {selectedOrder.status === 'delivered' && (
                                    <>
                                      <TableCell>
                                        <span className={delivered === requested ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'}>
                                          {delivered}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        {returned > 0 ? (
                                          <span className="text-red-600 font-semibold">{returned}</span>
                                        ) : (
                                          <span className="text-gray-400">0</span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <Badge className={isComplete ? 'bg-green-100 text-green-800' : returned > 0 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}>
                                          {isComplete ? 'Completo' : returned > 0 ? 'Con devolución' : 'Parcial'}
                                        </Badge>
                                      </TableCell>
                                    </>
                                  )}
                                  <TableCell>${item.unit_price?.toLocaleString() || 0}</TableCell>
                                  <TableCell>${(item.quantity_requested * (item.unit_price || 0)).toLocaleString()}</TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {/* Observaciones al final */}
                    <div>
                      <Label>Observaciones</Label>
                      <Textarea value={selectedOrder.observations || ""} disabled={!isEditMode} readOnly={!isEditMode} />
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

          </div>
        </main>
      </div>
    </div>
  )
}
