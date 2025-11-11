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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sidebar } from "@/components/layout/sidebar"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { Plus, Search, Filter, Edit, Calendar, X, Loader2, AlertCircle, CalendarDays, Check, ChevronsUpDown, Clock, TrendingUp, Package as PackageIcon, Clipboard, FileText, Truck, Navigation, CheckCircle, Mail, ShoppingCart, TriangleAlert, Eye, History, FileImage } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrderSourceIcon } from "@/components/ui/order-source-icon"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import { DateMismatchAlert } from "@/components/ui/date-mismatch-alert"
import { OrderAuditHistory } from "@/components/orders/order-audit-history"
import { OrderDetailModal } from "@/components/orders/order-detail-modal"
import { useOrders } from "@/hooks/use-orders"
import { useClients } from "@/hooks/use-clients"
import { useProducts } from "@/hooks/use-products"
import { useBranches } from "@/hooks/use-branches"
import { useClientFrequencies } from "@/hooks/use-client-frequencies"
import { useReceivingSchedules } from "@/hooks/use-receiving-schedules"
import { useProductConfigs } from "@/hooks/use-product-configs"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

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
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false)
  const [displayLimit, setDisplayLimit] = useState(50)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
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
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false)
  const [clientSearchOpen, setClientSearchOpen] = useState(false)
  const [editClientSearchOpen, setEditClientSearchOpen] = useState(false)
  const [productSearchOpen, setProductSearchOpen] = useState<Record<number, boolean>>({})
  const [editProductSearchOpen, setEditProductSearchOpen] = useState<Record<number, boolean>>({})
  const [editOrderItems, setEditOrderItems] = useState<OrderItem[]>([])
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
  const { productConfigs } = useProductConfigs()
  const { toast } = useToast()

  useEffect(() => {
    setDisplayLimit(50)
  }, [searchTerm, statusFilter, dateFilter])

  const getProductDisplayName = (product: any) => {
    const weight = product.weight ? ` (${product.weight})` : ''
    const presentation = product.presentation ? ` - ${product.presentation}` : ''
    return `${product.name}${weight}${presentation}`
  }

  useEffect(() => {
    const fetchProducts = async () => {
      const products = await getFinishedProducts()
      setFinishedProducts(products)
    }
    fetchProducts()
  }, [getFinishedProducts])

  const getProductConfig = (productId: string) => {
    return productConfigs.find(config => config.product_id === productId)
  }

  const calculateItemTotal = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice
  }

  const calculateOrderTotal = (items: OrderItem[]) => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item.quantity_requested, item.unit_price), 0)
  }

  const handleCreateOrder = async () => {
    if (!selectedClient || !selectedBranch || !deliveryDate) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    if (orderItems.length === 0 || orderItems.some(item => !item.product_id || item.quantity_requested <= 0)) {
      toast({
        title: "Error",
        description: "Por favor agregue al menos un producto válido",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const totalValue = calculateOrderTotal(orderItems)

      await createOrder({
        client_id: selectedClient,
        branch_id: selectedBranch,
        requested_delivery_date: deliveryDate,
        expected_delivery_date: deliveryDate,
        purchase_order_number: purchaseOrderNumber || null,
        observations: observations || null,
        total_value: totalValue,
        status: 'received',
        order_items: orderItems.map(item => ({
          product_id: item.product_id,
          quantity_requested: item.quantity_requested,
          unit_price: item.unit_price,
        })),
      })

      toast({
        title: "Pedido creado",
        description: "El pedido ha sido creado exitosamente",
      })

      setIsNewOrderOpen(false)
      setSelectedClient("")
      setSelectedBranch("")
      setDeliveryDate("")
      setPurchaseOrderNumber("")
      setObservations("")
      setOrderItems([{ product_id: "", quantity_requested: 1, unit_price: 0 }])

      refetch()
    } catch (error) {
      console.error("Error creating order:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el pedido",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return

    setIsSubmitting(true)

    try {
      const totalValue = calculateOrderTotal(editOrderItems)

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          expected_delivery_date: editDeliveryDate,
          purchase_order_number: editPurchaseOrderNumber || null,
          observations: editObservations || null,
          total_value: totalValue,
        })
        .eq('id', selectedOrder.id)

      if (updateError) throw updateError

      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', selectedOrder.id)

      if (deleteError) throw deleteError

      const { error: insertError } = await supabase
        .from('order_items')
        .insert(editOrderItems.map(item => ({
          order_id: selectedOrder.id,
          product_id: item.product_id,
          quantity_requested: item.quantity_requested,
          unit_price: item.unit_price,
        })))

      if (insertError) throw insertError

      toast({
        title: "Pedido actualizado",
        description: "El pedido ha sido actualizado exitosamente",
      })

      setIsOrderDialogOpen(false)
      setIsEditMode(false)
      refetch()
    } catch (error) {
      console.error("Error updating order:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el pedido",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const statusConfig: Record<string, { label: string; color: string; stage: number }> = {
    received: { label: "Recibido", color: "bg-gray-100 text-gray-700", stage: 1 },
    review_area1: { label: "Revisión Área 1", color: "bg-yellow-100 text-yellow-700", stage: 2 },
    review_area2: { label: "Revisión Área 2", color: "bg-orange-100 text-orange-700", stage: 3 },
    ready_dispatch: { label: "Listo Despacho", color: "bg-blue-100 text-blue-700", stage: 4 },
    dispatched: { label: "Despachado", color: "bg-purple-100 text-purple-700", stage: 5 },
    in_delivery: { label: "En Entrega", color: "bg-indigo-100 text-indigo-700", stage: 6 },
    delivered: { label: "Entregado", color: "bg-green-100 text-green-700", stage: 7 },
    partially_delivered: { label: "Entrega Parcial", color: "bg-orange-100 text-orange-700", stage: 7 },
    returned: { label: "Devuelto", color: "bg-red-100 text-red-700", stage: 7 },
    cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700", stage: 0 },
  }

  const getStageIcon = (stageId: number, isCompleted: boolean) => {
    const iconClass = "h-3.5 w-3.5"
    switch (stageId) {
      case 1: // Recibido
        return <PackageIcon className={iconClass} />
      case 2: // Listado
        return <Clipboard className={iconClass} />
      case 3: // Proyección
        return <Search className={iconClass} />
      case 4: // Facturado
        return <FileText className={iconClass} />
      case 5: // Despachado
        return <Truck className={iconClass} />
      case 6: // En Ruta
        return <Navigation className={iconClass} />
      case 7: // Entregado
        return <CheckCircle className={iconClass} />
      default:
        return <div className="w-2 h-2 rounded-full border-2 border-current" />
    }
  }

  const orderStages = [
    { id: 1, label: "Recibido" },
    { id: 2, label: "Listado" },
    { id: 3, label: "Proyección" },
    { id: 4, label: "Facturado" },
    { id: 5, label: "Despachado" },
    { id: 6, label: "En Ruta" },
    { id: 7, label: "Entregado" },
  ]

  const getOrderStageProgress = (status: string) => {
    const config = statusConfig[status]
    if (!config) return 0
    return config.stage
  }

  const getDeliveryPercentageColor = (percentage: number) => {
    if (percentage >= 100) return "text-green-600"
    if (percentage >= 75) return "text-lime-600"
    if (percentage >= 50) return "text-yellow-600"
    if (percentage >= 25) return "text-orange-600"
    return "text-red-600"
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `$${Math.round(value / 1000)}K`
    }
    return `$${value}`
  }

  const getDeliveryPercentage = (order: any) => {
    if (!order.order_items || order.order_items.length === 0) return 0

    const totalRequested = order.order_items.reduce((sum: number, item: any) =>
      sum + (item.quantity_requested || 0), 0)

    const totalDelivered = order.order_items.reduce((sum: number, item: any) =>
      sum + (item.quantity_delivered || 0), 0)

    if (totalRequested === 0) return 0
    return Math.round((totalDelivered / totalRequested) * 100)
  }

  const isDeliveredOnTime = (order: any) => {
    if (!order.actual_delivery_date || !order.expected_delivery_date) return null
    const actualDate = new Date(order.actual_delivery_date)
    const expectedDate = new Date(order.expected_delivery_date)
    return actualDate <= expectedDate
  }

  const getDayNames = (frequencies: any[]) => {
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    return frequencies
      .map(freq => dayNames[freq.day_of_week])
      .filter(Boolean)
      .join(', ')
  }

  const getReceivingHoursForDeliveryDate = (schedules: any[], deliveryDate: string) => {
    if (!schedules || schedules.length === 0) return "No configurado"

    const deliveryDay = new Date(deliveryDate).getDay() // 0=Sunday, 6=Saturday
    const daySchedules = schedules.filter(schedule => schedule.day_of_week === deliveryDay)

    if (daySchedules.length === 0) return "No configurado"

    return daySchedules
      .map(schedule => `${schedule.start_time.slice(0,5)} - ${schedule.end_time.slice(0,5)}`)
      .join(', ')
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.id.toString().includes(searchTerm) ||
      order.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.branch?.name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || order.status === statusFilter

    let matchesDate = true
    if (dateFilter === "today") {
      const today = new Date().toISOString().split('T')[0]
      matchesDate = order.expected_delivery_date === today
    } else if (dateFilter === "tomorrow") {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      matchesDate = order.expected_delivery_date === tomorrow.toISOString().split('T')[0]
    } else if (dateFilter === "monday") {
      const today = new Date()
      const dayOfWeek = today.getDay()
      const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek
      const nextMonday = new Date(today)
      nextMonday.setDate(today.getDate() + daysUntilMonday)
      matchesDate = order.expected_delivery_date === nextMonday.toISOString().split('T')[0]
    } else if (dateFilter === "week") {
      const today = new Date()
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      const orderDate = new Date(order.expected_delivery_date)
      matchesDate = orderDate >= today && orderDate <= nextWeek
    } else if (dateFilter === "custom" && selectedRange.from) {
      const orderDate = new Date(order.expected_delivery_date)
      matchesDate = orderDate >= selectedRange.from &&
                   (!selectedRange.to || orderDate <= selectedRange.to)
    }

    return matchesSearch && matchesStatus && matchesDate
  })

  const displayedOrders = filteredOrders.slice(0, displayLimit)

  const handleEditOrder = (order: any) => {
    setSelectedOrder(order)
    setEditClientId(order.client_id)
    setEditBranchId(order.branch_id)
    setEditDeliveryDate(order.expected_delivery_date)
    setEditPurchaseOrderNumber(order.purchase_order_number || "")
    setEditObservations(order.observations || "")
    setEditOrderItems(order.order_items?.map((item: any) => ({
      product_id: item.product_id,
      quantity_requested: item.quantity_requested,
      unit_price: item.unit_price,
    })) || [])
    setIsEditMode(true)
    setIsOrderDialogOpen(true)
  }

  return (
    <RouteGuard allowedRoles={['admin', 'commercial', 'reviewer_area1', 'reviewer_area2']}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Gestión de Pedidos</h1>
                <Button onClick={() => setIsNewOrderOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo Pedido
                </Button>
              </div>

              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-1">
                    {/* Search */}
                    <div className="relative min-w-[240px] flex-shrink-0">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Divider */}
                    <div className="h-8 w-px bg-gray-200 flex-shrink-0" />

                    {/* Status Filter */}
                    <div className="min-w-[180px] flex-shrink-0">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="border-gray-200">
                          <SelectValue placeholder="Todos los estados" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los estados</SelectItem>
                          {Object.entries(statusConfig).map(([value, config]) => (
                            <SelectItem key={value} value={value}>{config.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Divider */}
                    <div className="h-8 w-px bg-gray-200 flex-shrink-0" />

                    {/* Date Filter Buttons */}
                    <Button
                      variant={dateFilter === "today" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDateFilter("today")}
                      className="flex-shrink-0 gap-1.5"
                    >
                      Hoy
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-xs font-medium",
                        dateFilter === "today" ? "bg-white/20" : "bg-gray-100"
                      )}>
                        {orders.filter(o => o.expected_delivery_date === new Date().toISOString().split('T')[0]).length}
                      </span>
                    </Button>

                    <Button
                      variant={dateFilter === "tomorrow" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDateFilter("tomorrow")}
                      className="flex-shrink-0 gap-1.5"
                    >
                      Mañana
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-xs font-medium",
                        dateFilter === "tomorrow" ? "bg-white/20" : "bg-gray-100"
                      )}>
                        {(() => {
                          const tomorrow = new Date()
                          tomorrow.setDate(tomorrow.getDate() + 1)
                          return orders.filter(o => o.expected_delivery_date === tomorrow.toISOString().split('T')[0]).length
                        })()}
                      </span>
                    </Button>

                    <Button
                      variant={dateFilter === "monday" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDateFilter("monday")}
                      className="flex-shrink-0 gap-1.5"
                    >
                      Lunes
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-xs font-medium",
                        dateFilter === "monday" ? "bg-white/20" : "bg-gray-100"
                      )}>
                        {(() => {
                          const today = new Date()
                          const dayOfWeek = today.getDay()
                          const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek
                          const nextMonday = new Date(today)
                          nextMonday.setDate(today.getDate() + daysUntilMonday)
                          return orders.filter(o => o.expected_delivery_date === nextMonday.toISOString().split('T')[0]).length
                        })()}
                      </span>
                    </Button>

                    <Button
                      variant={dateFilter === "week" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDateFilter("week")}
                      className="flex-shrink-0 gap-1.5"
                    >
                      Esta Semana
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-xs font-medium",
                        dateFilter === "week" ? "bg-white/20" : "bg-gray-100"
                      )}>
                        {(() => {
                          const today = new Date()
                          const nextWeek = new Date()
                          nextWeek.setDate(nextWeek.getDate() + 7)
                          return orders.filter(o => {
                            const orderDate = new Date(o.expected_delivery_date)
                            return orderDate >= today && orderDate <= nextWeek
                          }).length
                        })()}
                      </span>
                    </Button>

                    <Button
                      variant={dateFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDateFilter("all")}
                      className="flex-shrink-0 gap-1.5"
                    >
                      Todos
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-xs font-medium",
                        dateFilter === "all" ? "bg-white/20" : "bg-gray-100"
                      )}>
                        {orders.length}
                      </span>
                    </Button>

                    {/* Custom Range Button */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={dateFilter === "custom" ? "default" : "outline"}
                          size="sm"
                          className="flex-shrink-0"
                        >
                          <CalendarDays className="h-4 w-4 mr-1.5" />
                          Rango
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <DayPicker
                          mode="range"
                          selected={selectedRange}
                          onSelect={(range) => {
                            setSelectedRange(range || {})
                            if (range?.from) {
                              setDateFilter("custom")
                            }
                          }}
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>

              {/* Orders List */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : displayedOrders.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <PackageIcon className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500 text-lg">No hay pedidos</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {displayedOrders.map((order) => {
                    const deliveryPercentage = getDeliveryPercentage(order)
                    const onTime = isDeliveredOnTime(order)
                    const isDelivered = ['delivered', 'partially_delivered'].includes(order.status)
                    const orderStage = getOrderStageProgress(order.status)

                    return (
                      <TooltipProvider key={order.id}>
                        <Card
                          className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-teal-200"
                          onClick={() => handleEditOrder(order)}
                        >
                          <CardContent className="p-5">
                            <div className="space-y-3">
                              {/* Desktop Layout */}
                              <div className="hidden md:flex items-center gap-4">
                                {/* Left: Order Number + Source */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <div className="bg-green-100 text-green-700 px-3 py-1 rounded-md font-medium text-sm">
                                    #{order.order_number || order.id?.toString().slice(0, 8)}
                                  </div>
                                  <OrderSourceIcon
                                    source={order.created_by_user?.name || ""}
                                    userName={order.created_by_user?.name}
                                  />
                                </div>

                              {/* Center: Client Info + Progress */}
                              <div className="flex-1 min-w-0 flex items-center gap-6">
                                {/* Client Name - Fixed Width */}
                                <div className="w-48 flex-shrink-0">
                                  <h3 className="font-semibold text-base text-gray-900 truncate">{order.client?.name}</h3>
                                  {order.branch && (
                                    <p className="text-sm text-gray-500 truncate">{order.branch.name}</p>
                                  )}
                                </div>

                                {/* Progress Indicators - Always starts at same point */}
                                {order.status !== 'cancelled' ? (
                                  <div className="flex items-center gap-0.5">
                                    {orderStages.map((stage, index) => {
                                        const isCompleted = orderStage >= stage.id
                                        const isActive = orderStage === stage.id

                                        return (
                                          <div key={stage.id} className="flex items-center">
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <div className={cn(
                                                  "flex items-center justify-center w-7 h-7 rounded-full transition-all flex-shrink-0",
                                                  isCompleted
                                                    ? "bg-teal-500 text-white shadow-sm"
                                                    : "bg-gray-200 text-gray-400",
                                                  isActive && "ring-2 ring-teal-300 ring-offset-1"
                                                )}>
                                                  {getStageIcon(stage.id, isCompleted)}
                                                </div>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p className="text-xs font-medium">{stage.label}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                            {index < orderStages.length - 1 && (
                                              <div className={cn(
                                                "h-0.5 w-3 transition-colors flex-shrink-0",
                                                orderStage > stage.id ? "bg-teal-500" : "bg-gray-200"
                                              )} />
                                            )}
                                          </div>
                                        )
                                      })}
                                  </div>
                                ) : (
                                  <Badge variant="destructive" className="ml-4">Cancelado</Badge>
                                )}
                              </div>

                              {/* Right: Total + Date + Delivery Info */}
                              <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                                {/* Total Value */}
                                <div className="text-right">
                                  <p className="font-semibold text-green-600 text-sm md:text-base">{formatCurrency(order.total_value || 0)}</p>
                                </div>

                                {/* Delivery Percentage Circle */}
                                {isDelivered && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className={cn(
                                        "flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full border-2 font-semibold text-xs",
                                        deliveryPercentage === 100 ? "border-green-500 bg-green-50 text-green-700" :
                                        deliveryPercentage === 0 ? "border-red-500 bg-red-50 text-red-700" :
                                        "border-orange-500 bg-orange-50 text-orange-700"
                                      )}>
                                        {deliveryPercentage}%
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Porcentaje entregado</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}

                                {/* Delivery Date */}
                                <div className="text-sm">
                                  <div className="flex items-center gap-1.5 text-gray-600">
                                    {order.requested_delivery_date !== order.expected_delivery_date ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <TriangleAlert className="h-4 w-4 text-amber-500" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs">Fecha ajustada</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <CalendarDays className="h-4 w-4" />
                                    )}
                                    <span className="whitespace-nowrap">{format(new Date(order.expected_delivery_date), "dd MMM", { locale: es })}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Mobile Layout */}
                            <div className="md:hidden space-y-3">
                              {/* Top Row: Order Number + Source, Client, Total */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <div className="bg-green-100 text-green-700 px-2.5 py-1 rounded-md font-medium text-xs">
                                      #{order.order_number || order.id?.toString().slice(0, 8)}
                                    </div>
                                    <OrderSourceIcon
                                      source={order.created_by_user?.name || ""}
                                      userName={order.created_by_user?.name}
                                      className="w-5 h-5"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm text-gray-900 truncate">{order.client?.name}</h3>
                                    {order.branch && (
                                      <p className="text-xs text-gray-500 truncate">{order.branch.name}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="font-semibold text-xs text-green-600">{formatCurrency(order.total_value || 0)}</p>
                                  <div className="flex items-center gap-1 text-gray-600 text-xs mt-1">
                                    {order.requested_delivery_date !== order.expected_delivery_date ? (
                                      <TriangleAlert className="h-3 w-3 text-amber-500" />
                                    ) : (
                                      <CalendarDays className="h-3 w-3" />
                                    )}
                                    <span>{format(new Date(order.expected_delivery_date), "dd MMM", { locale: es })}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Bottom Row: Progress Bar or Cancelled Badge */}
                              {order.status !== 'cancelled' ? (
                                <div className="flex items-center gap-3 -mx-1 px-1 overflow-x-auto scrollbar-hide">
                                  <div className="flex items-center gap-0.5 py-1">
                                    {orderStages.map((stage, index) => {
                                        const isCompleted = orderStage >= stage.id
                                        const isActive = orderStage === stage.id

                                        return (
                                          <div key={stage.id} className="flex items-center">
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <div className={cn(
                                                  "flex items-center justify-center w-7 h-7 rounded-full transition-all flex-shrink-0",
                                                  isCompleted
                                                    ? "bg-teal-500 text-white shadow-sm"
                                                    : "bg-gray-200 text-gray-400",
                                                  isActive && "ring-2 ring-teal-300"
                                                )}>
                                                  {getStageIcon(stage.id, isCompleted)}
                                                </div>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p className="text-xs font-medium">{stage.label}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                            {index < orderStages.length - 1 && (
                                              <div className={cn(
                                                "h-0.5 w-3 transition-colors flex-shrink-0",
                                                orderStage > stage.id ? "bg-teal-500" : "bg-gray-200"
                                              )} />
                                            )}
                                          </div>
                                        )
                                      })}
                                  </div>

                                  {/* Delivery Percentage Circle on Mobile */}
                                  {isDelivered && (
                                    <div className={cn(
                                      "flex items-center justify-center w-8 h-8 rounded-full border-2 font-semibold text-xs ml-auto flex-shrink-0",
                                      deliveryPercentage === 100 ? "border-green-500 bg-green-50 text-green-700" :
                                      deliveryPercentage === 0 ? "border-red-500 bg-red-50 text-red-700" :
                                      "border-orange-500 bg-orange-50 text-orange-700"
                                    )}>
                                      {deliveryPercentage}%
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <Badge variant="destructive" className="w-fit">Cancelado</Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipProvider>
                    )
                  })}
                </div>
              )}

              {/* Load More */}
              {displayedOrders.length < filteredOrders.length && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setDisplayLimit(prev => prev + 50)}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cargar más"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Order Dialog */}
      <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Client Selection */}
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedClient
                      ? clients.find(c => c.id === selectedClient)?.name
                      : "Seleccionar cliente..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandEmpty>No se encontraron clientes</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.name}
                            onSelect={() => {
                              setSelectedClient(client.id)
                              setSelectedBranch("")
                              setClientSearchOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedClient === client.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {client.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Branch Selection */}
            <div className="space-y-2">
              <Label>Sucursal *</Label>
              <Select
                value={selectedBranch}
                onValueChange={setSelectedBranch}
                disabled={!selectedClient}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sucursal..." />
                </SelectTrigger>
                <SelectContent>
                  {getBranchesByClient(selectedClient).map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Delivery Date */}
            <div className="space-y-2">
              <Label>Fecha de Entrega *</Label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Purchase Order Number */}
            <div className="space-y-2">
              <Label>Número de Orden de Compra</Label>
              <Input
                value={purchaseOrderNumber}
                onChange={(e) => setPurchaseOrderNumber(e.target.value)}
                placeholder="Opcional"
              />
            </div>

            {/* Products */}
            <div className="space-y-4">
              <Label>Productos *</Label>
              {orderItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select
                      value={item.product_id}
                      onValueChange={(value) => {
                        const newItems = [...orderItems]
                        newItems[index].product_id = value
                        const product = finishedProducts.find(p => p.id === value)
                        if (product) {
                          newItems[index].unit_price = product.price || 0
                        }
                        setOrderItems(newItems)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar producto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {finishedProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {getProductDisplayName(product)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      value={item.quantity_requested}
                      onChange={(e) => {
                        const newItems = [...orderItems]
                        newItems[index].quantity_requested = parseInt(e.target.value) || 0
                        setOrderItems(newItems)
                      }}
                      min="1"
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => {
                        const newItems = [...orderItems]
                        newItems[index].unit_price = parseFloat(e.target.value) || 0
                        setOrderItems(newItems)
                      }}
                      placeholder="Precio"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (orderItems.length > 1) {
                        setOrderItems(orderItems.filter((_, i) => i !== index))
                      }
                    }}
                    disabled={orderItems.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setOrderItems([...orderItems, { product_id: "", quantity_requested: 1, unit_price: 0 }])}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Producto
              </Button>
            </div>

            {/* Observations */}
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Observaciones adicionales..."
                rows={3}
              />
            </div>

            {/* Total */}
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-2xl font-bold text-green-600">
                ${calculateOrderTotal(orderItems).toLocaleString()}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsNewOrderOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateOrder} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear Pedido"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Detail Modal */}
      <OrderDetailModal
        open={isOrderDialogOpen}
        onOpenChange={setIsOrderDialogOpen}
        order={selectedOrder}
        isEditMode={isEditMode}
        isSubmitting={isSubmitting}
        editOrderItems={editOrderItems}
        setEditOrderItems={setEditOrderItems}
        editDeliveryDate={editDeliveryDate}
        setEditDeliveryDate={setEditDeliveryDate}
        editPurchaseOrderNumber={editPurchaseOrderNumber}
        setEditPurchaseOrderNumber={setEditPurchaseOrderNumber}
        editObservations={editObservations}
        setEditObservations={setEditObservations}
        finishedProducts={finishedProducts}
        getProductDisplayName={getProductDisplayName}
        calculateOrderTotal={calculateOrderTotal}
        handleUpdateOrder={handleUpdateOrder}
        onClose={() => {
          setIsOrderDialogOpen(false)
          setIsEditMode(false)
        }}
        getDayNames={getDayNames}
        getReceivingHoursForDeliveryDate={getReceivingHoursForDeliveryDate}
        getFrequenciesForBranch={getFrequenciesForBranch}
        getSchedulesByBranch={getSchedulesByBranch}
      />
    </RouteGuard>
  )
}
