"use client"

import { useState, useEffect } from "react"
import { DayPicker } from "react-day-picker"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import "react-day-picker/dist/style.css"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
import { RouteGuard } from "@/components/auth/RouteGuard"
import { Plus, Search, Filter, Eye, Edit, Calendar, X, Loader2, AlertCircle, CircleSlash, CalendarDays } from "lucide-react"
import { OrderSourceIcon } from "@/components/ui/order-source-icon"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import { DateMismatchAlert } from "@/components/ui/date-mismatch-alert"
import { useOrders } from "@/hooks/use-orders"
import { useClients } from "@/hooks/use-clients"
import { useProducts } from "@/hooks/use-products"
import { useBranches } from "@/hooks/use-branches"
import { useClientFrequencies } from "@/hooks/use-client-frequencies"
import { useReceivingSchedules } from "@/hooks/use-receiving-schedules"
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
  const [dateFilter, setDateFilter] = useState("all")
  const [customDateRange, setCustomDateRange] = useState({ start: "", end: "" })
  const [selectedRange, setSelectedRange] = useState<{ from?: Date; to?: Date }>({})
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([{ product_id: "", quantity_requested: 1, unit_price: 0 }])
  const [selectedClient, setSelectedClient] = useState("")
  const [selectedBranch, setSelectedBranch] = useState("")
  const [deliveryDate, setDeliveryDate] = useState("")
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("")
  const [observations, setObservations] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  // Estado para edición de items
  const [editOrderItems, setEditOrderItems] = useState<OrderItem[]>([])
  // Estados para edición de campos principales
  const [editClientId, setEditClientId] = useState("")
  const [editBranchId, setEditBranchId] = useState("")
  const [editDeliveryDate, setEditDeliveryDate] = useState("")
  const [editPurchaseOrderNumber, setEditPurchaseOrderNumber] = useState("")
  const [editObservations, setEditObservations] = useState("")

  const { orders, loading, createOrder, error, refetch } = useOrders()
  const { clients, loading: clientsLoading } = useClients()
  const { getFinishedProducts, loading: productsLoading } = useProducts()
  const [finishedProducts, setFinishedProducts] = useState<any[]>([])
  const { branches, getBranchesByClient } = useBranches()
  const { getFrequenciesForBranch } = useClientFrequencies()
  const { getSchedulesByBranch } = useReceivingSchedules()
  const { toast } = useToast()

  const getProductDisplayName = (product: any) => {
    const weight = product.weight ? ` (${product.weight})` : ''
    return `${product.name}${weight}`
  }

  // Función para obtener los días de frecuencia
  const getDayNames = (frequencies: any[]) => {
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    return frequencies
      .map(freq => dayNames[freq.day_of_week])
      .filter(Boolean)
      .join(', ')
  }

  // Función para formatear horarios de recibo
  const getReceivingHours = (schedules: any[]) => {
    if (!schedules || schedules.length === 0) return "No configurado"
    
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    
    // Agrupar por día de la semana
    const schedulesByDay = schedules.reduce((acc, schedule) => {
      const dayName = dayNames[schedule.day_of_week]
      if (!acc[dayName]) acc[dayName] = []
      acc[dayName].push(`${schedule.start_time.slice(0,5)} - ${schedule.end_time.slice(0,5)}`)
      return acc
    }, {})

    // Formatear como "Lunes: 08:00 - 17:00, Martes: 09:00 - 16:00"
    return Object.entries(schedulesByDay)
      .map(([day, hours]: [string, any]) => `${day}: ${hours.join(', ')}`)
      .join(' | ')
  }

  // Cargar solo productos terminados (categoría PT) al montar el componente
  useEffect(() => {
    const loadFinishedProducts = async () => {
      const products = await getFinishedProducts()
      setFinishedProducts(products)
    }
    loadFinishedProducts()
  }, [getFinishedProducts])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      received: { label: "Recibido", color: "bg-gray-100 text-gray-800" },
      review_area1: { label: "Revisión Área 1", color: "bg-yellow-100 text-yellow-800" },
      review_area2: { label: "Revisión Área 2", color: "bg-orange-100 text-orange-800" },
      ready_dispatch: { label: "Listo Despacho", color: "bg-blue-100 text-blue-800" },
      dispatched: { label: "Despachado", color: "bg-purple-100 text-purple-800" },
      in_delivery: { label: "En Entrega", color: "bg-indigo-100 text-indigo-800" },
      delivered: { label: "Entregado", color: "bg-green-100 text-green-800" },
      partially_delivered: { label: "Entrega Parcial", color: "bg-orange-100 text-orange-800" },
      returned: { label: "Devuelto", color: "bg-red-100 text-red-800" },
      cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800" },
    }

    return (
      statusConfig[status as keyof typeof statusConfig] || {
        label: status,
        color: "bg-gray-100 text-gray-800",
      }
    )
  }

  // Helper functions for date filtering
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const getThisWeekRange = () => {
    const today = new Date()
    const startOfWeek = new Date(today)
    const dayOfWeek = today.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Monday = 1, Sunday = 0
    startOfWeek.setDate(today.getDate() + diff)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    return {
      start: startOfWeek.toISOString().split('T')[0],
      end: endOfWeek.toISOString().split('T')[0]
    }
  }

  const getNextMondayDate = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysUntilNextMonday = dayOfWeek === 1 ? 7 : (7 - dayOfWeek + 1) % 7 || 7
    const nextMonday = new Date(today)
    nextMonday.setDate(today.getDate() + daysUntilNextMonday)
    return nextMonday.toISOString().split('T')[0]
  }

  const isDateInRange = (orderDate: string, filter: string) => {
    if (filter === "all") return true

    const today = getTodayDate()
    const tomorrow = getTomorrowDate()
    const nextMonday = getNextMondayDate()
    const thisWeek = getThisWeekRange()

    switch (filter) {
      case "today":
        return orderDate === today
      case "tomorrow":
        return orderDate === tomorrow
      case "next_monday":
        return orderDate === nextMonday
      case "this_week":
        return orderDate >= thisWeek.start && orderDate <= thisWeek.end
      case "custom":
        if (!selectedRange.from || !selectedRange.to) return true
        const orderDateObj = new Date(orderDate)
        return orderDateObj >= selectedRange.from && orderDateObj <= selectedRange.to
      default:
        return true
    }
  }

  // Handle date range selection
  const handleRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) return

    setSelectedRange(range)

    // If both dates are selected, apply the filter automatically
    if (range.from && range.to) {
      setDateFilter("custom")
      setCustomDateRange({
        start: format(range.from, "yyyy-MM-dd"),
        end: format(range.to, "yyyy-MM-dd")
      })
      setIsCalendarOpen(false)
    }
  }

  // Reset custom range when other filters are selected
  const handleDateFilterChange = (newFilter: string) => {
    if (newFilter !== "custom") {
      setSelectedRange({})
      setCustomDateRange({ start: "", end: "" })
    }
    setDateFilter(newFilter)
    setIsCalendarOpen(false)
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    const matchesDate = isDateInRange(order.expected_delivery_date, dateFilter)
    return matchesSearch && matchesStatus && matchesDate
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
      const product = finishedProducts.find((p) => p.id === value)
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
    setPurchaseOrderNumber("")
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
        purchase_order_number: purchaseOrderNumber || undefined,
        observations: observations || undefined,
        items: validItems,
      })

      await createOrder({
        client_id: selectedClient,
        branch_id: selectedBranch,
        expected_delivery_date: deliveryDate,
        purchase_order_number: purchaseOrderNumber || undefined,
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
    // Inicializar campos editables
    setEditClientId(order.client_id || "")
    setEditBranchId(order.branch_id || "")
    setEditDeliveryDate(order.expected_delivery_date || "")
    setEditPurchaseOrderNumber(order.purchase_order_number || "")
    setEditObservations(order.observations || "")
    setIsEditMode(true)
    setIsOrderDialogOpen(true)
  }

  // Actualizar producto/cantidad en items editables
  const updateEditOrderItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const updated = [...editOrderItems]
    if (field === "product_id") {
      updated[index][field] = value as string
      // Auto-fill price cuando se cambia producto
      const product = finishedProducts.find((p) => p.id === value)
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
    
    // Validaciones
    if (!editClientId) {
      toast({
        title: "Error",
        description: "Por favor selecciona un cliente",
        variant: "destructive",
      })
      return
    }
    
    if (!editBranchId) {
      toast({
        title: "Error", 
        description: "Por favor selecciona una sucursal",
        variant: "destructive",
      })
      return
    }
    
    if (!editDeliveryDate) {
      toast({
        title: "Error",
        description: "Por favor selecciona una fecha de entrega",
        variant: "destructive",
      })
      return
    }
    
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
      // 1. Actualizar los campos principales del pedido
      await supabase.from("orders").update({
        client_id: editClientId,
        branch_id: editBranchId,
        expected_delivery_date: editDeliveryDate,
        purchase_order_number: editPurchaseOrderNumber || null,
        observations: editObservations || null,
      }).eq("id", selectedOrder.id)
      
      // 2. Eliminar items que ya no están
      const oldIds = selectedOrder.order_items.map((item: any) => item.id)
      const newProductIds = validItems.map((item) => item.product_id)
      for (let i = 0; i < selectedOrder.order_items.length; i++) {
        const oldItem = selectedOrder.order_items[i]
        if (!newProductIds.includes(oldItem.product.id)) {
          await supabase.from("order_items").delete().eq("id", oldItem.id)
        }
      }
      // 3. Actualizar o agregar items
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
      // 4. Calcular y actualizar el total_value
      const newTotal = validItems.reduce((sum, item) => sum + item.quantity_requested * item.unit_price, 0)
      await supabase.from("orders").update({ total_value: newTotal }).eq("id", selectedOrder.id)

      toast({
        title: "Éxito",
        description: "Pedido actualizado correctamente",
      })
      setIsOrderDialogOpen(false)
      await refetch() // Refrescar la lista de pedidos
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
    <RouteGuard 
      requiredPermissions={['order_management_orders']} 
      requiredRoles={['administrator', 'coordinador_logistico', 'comercial']}
    >
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
                    <div>
                      <Label htmlFor="purchase-order-number">Número de Orden de Compra</Label>
                      <Input
                        type="text"
                        id="purchase-order-number"
                        placeholder="Ingresa el número de orden de compra del cliente"
                        value={purchaseOrderNumber}
                        onChange={(e) => setPurchaseOrderNumber(e.target.value)}
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
                                  {finishedProducts.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {getProductDisplayName(product)} - ${product.price?.toLocaleString() || "0"}
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
                <div className="space-y-4">
                  {/* Search Bar */}
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

                  {/* Filters Row */}
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Status Filter */}
                    <div className="flex-1">
                      <Label className="text-sm text-gray-600 mb-2 block">Estado del Pedido</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
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
                          <SelectItem value="partially_delivered">Entrega Parcial</SelectItem>
                          <SelectItem value="returned">Devuelto</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Filter */}
                    <div className="flex-1">
                      <Label className="text-sm text-gray-600 mb-2 block">Fecha de Entrega</Label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={dateFilter === "today" ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleDateFilterChange("today")}
                          className="text-xs"
                        >
                          <CalendarDays className="h-3 w-3 mr-1" />
                          Hoy ({orders.filter(o => o.expected_delivery_date === getTodayDate()).length})
                        </Button>
                        <Button
                          variant={dateFilter === "tomorrow" ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleDateFilterChange("tomorrow")}
                          className="text-xs"
                        >
                          <CalendarDays className="h-3 w-3 mr-1" />
                          Mañana ({orders.filter(o => o.expected_delivery_date === getTomorrowDate()).length})
                        </Button>
                        <Button
                          variant={dateFilter === "next_monday" ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleDateFilterChange("next_monday")}
                          className="text-xs"
                        >
                          <CalendarDays className="h-3 w-3 mr-1" />
                          Lunes ({orders.filter(o => o.expected_delivery_date === getNextMondayDate()).length})
                        </Button>
                        <Button
                          variant={dateFilter === "this_week" ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleDateFilterChange("this_week")}
                          className="text-xs"
                        >
                          <CalendarDays className="h-3 w-3 mr-1" />
                          Esta Semana ({orders.filter(o => {
                            const thisWeek = getThisWeekRange()
                            return o.expected_delivery_date >= thisWeek.start && o.expected_delivery_date <= thisWeek.end
                          }).length})
                        </Button>
                        <Button
                          variant={dateFilter === "all" ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleDateFilterChange("all")}
                          className="text-xs"
                        >
                          Todos ({orders.length})
                        </Button>

                        {/* Custom Date Range Popover */}
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant={dateFilter === "custom" ? "default" : "outline"}
                              size="sm"
                              className="text-xs"
                              onClick={() => setIsCalendarOpen(true)}
                            >
                              <Calendar className="h-3 w-3 mr-1" />
                              {dateFilter === "custom" && selectedRange.from && selectedRange.to ? (
                                `${format(selectedRange.from, "dd/MM")} - ${format(selectedRange.to, "dd/MM")}`
                              ) : (
                                "Rango"
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <DayPicker
                              mode="range"
                              selected={selectedRange}
                              onSelect={handleRangeSelect}
                              locale={es}
                              className="p-3"
                              classNames={{
                                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                day_range_middle: "bg-primary/20 text-primary",
                                day_range_start: "bg-primary text-primary-foreground",
                                day_range_end: "bg-primary text-primary-foreground"
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>

                  {/* Active Filters Summary */}
                  {(dateFilter !== "all" || statusFilter !== "all") && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                      <span className="text-xs text-gray-600">Filtros activos:</span>
                      {statusFilter !== "all" && (
                        <Badge variant="secondary" className="text-xs">
                          Estado: {getStatusBadge(statusFilter).label}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() => setStatusFilter("all")}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      )}
                      {dateFilter !== "all" && (
                        <Badge variant="secondary" className="text-xs">
                          Fecha: {dateFilter === "today" ? "Hoy" :
                                  dateFilter === "tomorrow" ? "Mañana" :
                                  dateFilter === "next_monday" ? "Próximo Lunes" :
                                  dateFilter === "this_week" ? "Esta semana" :
                                  dateFilter === "custom" && selectedRange.from && selectedRange.to ?
                                    `${format(selectedRange.from, "dd/MM/yy")} - ${format(selectedRange.to, "dd/MM/yy")}` :
                                    dateFilter}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() => handleDateFilterChange("all")}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      )}
                    </div>
                  )}
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
                        <TableHead>Fecha Solicitada</TableHead>
                        <TableHead>Fecha Entrega</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Facturación</TableHead>
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
                              {order.requested_delivery_date || order.expected_delivery_date}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              {order.expected_delivery_date}
                              <DateMismatchAlert
                                requestedDate={order.requested_delivery_date}
                                expectedDate={order.expected_delivery_date}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(order.status).color}>
                              {getStatusBadge(order.status).label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {order.is_invoiced ? (
                              <div className="flex items-center gap-1">
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                  ✓ Facturado
                                </Badge>
                                {order.invoiced_at && (
                                  <span className="text-xs text-gray-500">
                                    {new Date(order.invoiced_at).toLocaleDateString('es-ES')}
                                  </span>
                                )}
                                {order.is_invoiced_from_remision === true && (
                                  <span className="text-xs text-blue-600">
                                    (Anteriormente Remisionado)
                                  </span>
                                )}
                              </div>
                            ) : order.is_invoiced_from_remision === false && (order.status === 'delivered' || order.status === 'partially_delivered') ? (
                              <div className="flex items-center gap-1">
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                  📋 Remisionado
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  Pendiente facturar
                                </span>
                              </div>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-600 border-gray-200">
                                Pendiente
                              </Badge>
                            )}
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
                            {(order.status === 'delivered' || order.status === 'partially_delivered' || order.status === 'returned') ? (
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
                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleViewOrder(order)} className="justify-start">
                                <Eye className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Ver Detalles</span>
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleEditOrder(order)} className="justify-start">
                                <Edit className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Editar</span>
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
                                className="justify-start"
                              >
                                <CircleSlash className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">
                                  {order.status === 'cancelled' ? 'Cancelado' : 'Cancelar'}
                                </span>
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
              <DialogContent className="w-full max-w-[95vw] md:max-w-7xl max-h-[95vh] overflow-y-auto p-4 md:p-6">
                <DialogHeader>
                  <DialogTitle className="text-lg md:text-xl flex items-center gap-3">
                    <span>{isEditMode ? "Editar Pedido" : "Detalle del Pedido"}</span>
                    {selectedOrder && (
                      <span className="text-sm font-normal text-gray-500">
                        Creado: {new Date(selectedOrder.created_at + 'Z').toLocaleString('es-CO', {
                          timeZone: 'America/Bogota',
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </DialogTitle>
                </DialogHeader>
                {selectedOrder && (
                  <div className={`grid gap-4 md:gap-6 ${selectedOrder.pdf_filename ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
                    {/* Order details */}
                    <div className="space-y-3 md:space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        <div>
                          <Label>Número de Pedido</Label>
                          <Input value={selectedOrder.order_number} disabled readOnly />
                        </div>
                        <div>
                          <Label>Cliente {isEditMode && "*"}</Label>
                          {isEditMode ? (
                            <Select value={editClientId} onValueChange={(value) => {
                              setEditClientId(value)
                              setEditBranchId("") // Reset branch when client changes
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
                          ) : (
                            <Input value={selectedOrder.client.name} disabled readOnly />
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        <div>
                          <Label>Sucursal {isEditMode && "*"}</Label>
                          {isEditMode ? (
                            <Select value={editBranchId} onValueChange={setEditBranchId} disabled={!editClientId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar sucursal" />
                              </SelectTrigger>
                              <SelectContent>
                                {editClientId && getBranchesByClient(editClientId).map((branch) => (
                                  <SelectItem key={branch.id} value={branch.id}>
                                    {branch.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input value={selectedOrder.branch ? selectedOrder.branch.name : "-"} disabled readOnly />
                          )}
                        </div>
                        <div>
                          <Label>Estado</Label>
                          <Input value={getStatusBadge(selectedOrder.status).label} disabled readOnly />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                        <div>
                          <Label>Fecha Solicitada</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              value={selectedOrder.requested_delivery_date || selectedOrder.expected_delivery_date}
                              disabled
                              readOnly
                            />
                            <DateMismatchAlert
                              requestedDate={selectedOrder.requested_delivery_date}
                              expectedDate={selectedOrder.expected_delivery_date}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Fecha de Entrega {isEditMode && "*"}</Label>
                          {isEditMode ? (
                            <Input
                              type="date"
                              value={editDeliveryDate}
                              onChange={(e) => setEditDeliveryDate(e.target.value)}
                              min={new Date().toISOString().split("T")[0]}
                            />
                          ) : (
                            <Input value={selectedOrder.expected_delivery_date} disabled readOnly />
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        <div>
                          <Label>Número de Orden de Compra</Label>
                          {isEditMode ? (
                            <Input
                              type="text"
                              placeholder="Número de orden de compra del cliente"
                              value={editPurchaseOrderNumber}
                              onChange={(e) => setEditPurchaseOrderNumber(e.target.value)}
                            />
                          ) : (
                            <Input value={selectedOrder.purchase_order_number || "-"} disabled readOnly />
                          )}
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
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="min-w-[120px]">Producto</TableHead>
                                <TableHead className="min-w-[80px]">Cant.</TableHead>
                                <TableHead className="min-w-[80px]">Precio</TableHead>
                                <TableHead className="min-w-[80px]">Total</TableHead>
                                <TableHead className="w-10"></TableHead>
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
                                      {finishedProducts.map((product) => (
                                        <SelectItem key={product.id} value={product.id}>
                                          {getProductDisplayName(product)} - ${product.price?.toLocaleString() || "0"}
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
                        </div>
                        <div className="flex justify-end mt-4">
                          <Button onClick={handleSaveOrderEdit} disabled={isSubmitting}>
                            {isSubmitting ? "Guardando..." : "Guardar cambios"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Label>Productos</Label>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="min-w-[120px]">Producto</TableHead>
                                <TableHead className="min-w-[60px]">Cant. Solic.</TableHead>
                                {(selectedOrder.status === 'delivered' || selectedOrder.status === 'partially_delivered' || selectedOrder.status === 'returned') && (
                                  <>
                                    <TableHead className="min-w-[60px]">Entregada</TableHead>
                                    <TableHead className="min-w-[60px]">Devuelta</TableHead>
                                    <TableHead className="min-w-[80px]">Estado</TableHead>
                                  </>
                                )}
                                <TableHead className="min-w-[70px]">Precio</TableHead>
                                <TableHead className="min-w-[80px]">Total</TableHead>
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
                                  <TableCell>{getProductDisplayName(item.product)}</TableCell>
                                  <TableCell>{requested}</TableCell>
                                  {(selectedOrder.status === 'delivered' || selectedOrder.status === 'partially_delivered' || selectedOrder.status === 'returned') && (
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
                      </div>
                    )}
                      {/* Observaciones al final */}
                      <div>
                        <Label>Observaciones</Label>
                        {isEditMode ? (
                          <Textarea 
                            value={editObservations} 
                            onChange={(e) => setEditObservations(e.target.value)}
                            placeholder="Observaciones del cliente..."
                          />
                        ) : (
                          <Textarea value={selectedOrder.observations || ""} disabled readOnly />
                        )}
                      </div>

                      {/* Información del cliente */}
                      <div className="bg-gray-50 rounded-lg p-3 md:p-4 border">
                        <Label className="text-sm md:text-base font-semibold mb-2 md:mb-3 block">Información del Cliente</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 text-xs md:text-sm">
                          <div className="space-y-2">
                            <div>
                              <span className="font-medium text-gray-700">Razón Social:</span>
                              <p className="text-gray-900">{selectedOrder.client?.razon_social || selectedOrder.client?.name || "-"}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Contacto:</span>
                              <p className="text-gray-900">{selectedOrder.branch?.contact_person || "-"}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="font-medium text-gray-700">Teléfono:</span>
                              <p className="text-gray-900">{selectedOrder.branch?.phone || selectedOrder.client?.phone || "-"}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Email:</span>
                              <p className="text-gray-900">{selectedOrder.branch?.email || selectedOrder.client?.email || "-"}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="font-medium text-gray-700">Dirección:</span>
                              <p className="text-gray-900">{selectedOrder.branch?.address || selectedOrder.client?.address || "-"}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Sección separada para horarios */}
                        <div className="mt-3 md:mt-4 pt-3 border-t border-gray-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Días de Frecuencia:</span>
                              <p className="text-gray-900 mt-1">
                                {selectedOrder.branch_id 
                                  ? getDayNames(getFrequenciesForBranch(selectedOrder.branch_id)) || "No configurado"
                                  : "No configurado"
                                }
                              </p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Horario de Recibo:</span>
                              <p className="text-gray-900 text-xs mt-1 leading-relaxed break-words">
                                {selectedOrder.branch_id 
                                  ? getReceivingHours(getSchedulesByBranch(selectedOrder.branch_id))
                                  : "No configurado"
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* PDF viewer - only show if PDF exists */}
                    {selectedOrder.pdf_filename && (
                      <div className="space-y-4">
                        <div>
                          <Label>PDF del Pedido</Label>
                          <PDFViewer fileName={selectedOrder.pdf_filename} className="h-[600px]" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>

          </div>
        </main>
      </div>
    </div>
    </RouteGuard>
  )
}
