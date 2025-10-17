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
import { Plus, Search, Filter, Eye, Edit, Calendar, X, Loader2, AlertCircle, CircleSlash, CalendarDays, Check, ChevronsUpDown } from "lucide-react"
import { OrderSourceIcon } from "@/components/ui/order-source-icon"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import { useOrders } from "@/hooks/use-orders"
import { useClients } from "@/hooks/use-clients"
import { useProducts } from "@/hooks/use-products"
import { useBranches } from "@/hooks/use-branches"
import { useClientFrequencies } from "@/hooks/use-client-frequencies"
import { useReceivingSchedules } from "@/hooks/use-receiving-schedules"
import { useProductConfigs } from "@/hooks/use-product-configs"
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
  // Estados para los selects de búsqueda
  const [clientSearchOpen, setClientSearchOpen] = useState(false)
  const [editClientSearchOpen, setEditClientSearchOpen] = useState(false)
  const [productSearchOpen, setProductSearchOpen] = useState<Record<number, boolean>>({})
  const [editProductSearchOpen, setEditProductSearchOpen] = useState<Record<number, boolean>>({})
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
  const { productConfigs } = useProductConfigs()
  const { toast } = useToast()

  const getProductDisplayName = (product: any) => {
    const weight = product.weight ? ` (${product.weight})` : ''
    return `${product.name}${weight}`
  }

  // Función para obtener las unidades por paquete de un producto
  const getUnitsPerPackage = (productId: string) => {
    const config = productConfigs.find(config => config.product_id === productId)
    return config?.units_per_package || 1
  }

  // Función para calcular la próxima fecha de frecuencia para un cliente específico
  const getNextFrequencyDateForClient = (clientId: string, branchId: string) => {
    if (!clientId || !branchId) return null

    const today = new Date()
    const currentDay = today.getDay() // 0 = Domingo, 1 = Lunes, etc.

    // Obtener las frecuencias específicas de la sucursal seleccionada
    const frequencies = getFrequenciesForBranch(branchId)

    if (frequencies.length === 0) return null

    const frequencyDays = frequencies.map(freq => freq.day_of_week)

    // Encontrar el próximo día de frecuencia
    let nextDay = null
    let daysToAdd = 1

    for (let i = 1; i <= 7; i++) {
      const checkDay = (currentDay + i) % 7
      if (frequencyDays.includes(checkDay)) {
        nextDay = checkDay
        daysToAdd = i
        break
      }
    }

    if (nextDay === null) return null

    const nextDate = new Date(today)
    nextDate.setDate(today.getDate() + daysToAdd)

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

    return {
      date: nextDate.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      dayName: dayNames[nextDay],
      formattedDate: nextDate.toISOString().split('T')[0]
    }
  }

  // Función para obtener los días de frecuencia
  const getDayNames = (frequencies: any[]) => {
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
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
    console.log("🗑️  removeEditOrderItem llamado")
    console.log("📍 Índice a eliminar:", index)
    console.log("📊 Items actuales antes de eliminar:", editOrderItems.map((item, i) => ({
      index: i,
      product_id: item.product_id,
      quantity: item.quantity_requested,
      price: item.unit_price
    })))

    if (editOrderItems.length > 1) {
      const updatedItems = editOrderItems.filter((_, i) => i !== index)
      console.log("✅ Items después de eliminar:", updatedItems.map((item, i) => ({
        index: i,
        product_id: item.product_id,
        quantity: item.quantity_requested,
        price: item.unit_price
      })))
      setEditOrderItems(updatedItems)
    } else {
      console.log("⚠️  No se puede eliminar: debe haber al menos 1 item")
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
    console.log("=".repeat(80))
    console.log("🚀 INICIO - handleSaveOrderEdit")
    console.log("=".repeat(80))

    if (!selectedOrder) {
      console.log("⚠️  No hay orden seleccionada, abortando...")
      return
    }

    console.log("📦 Estado actual del pedido:", {
      order_id: selectedOrder.id,
      order_number: selectedOrder.order_number,
      client_id: selectedOrder.client_id,
      items_count: selectedOrder.order_items?.length || 0
    })

    console.log("✏️  Estado de edición:", {
      editClientId,
      editBranchId,
      editDeliveryDate,
      editItems_count: editOrderItems.length
    })

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
      console.log("🔍 INICIO - Proceso de eliminación de items")
      console.log("📦 Items originales del pedido:", selectedOrder.order_items.map((item: any) => ({
        id: item.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity_requested
      })))

      console.log("📋 Items editados (nuevos):", editOrderItems.map((item, idx) => ({
        index: idx,
        product_id: item.product_id,
        quantity: item.quantity_requested
      })))

      // Mapear los items editados a sus índices en el array original
      // Esto permite identificar qué items del pedido original deben mantenerse
      const itemsToKeep = new Set<string>()

      // Crear un mapa de product_id -> array de items originales con ese producto
      const originalItemsByProduct = new Map<string, any[]>()
      selectedOrder.order_items.forEach((item: any) => {
        const productId = item.product.id
        if (!originalItemsByProduct.has(productId)) {
          originalItemsByProduct.set(productId, [])
        }
        originalItemsByProduct.get(productId)!.push(item)
      })

      console.log("🗺️  Mapa de productos originales:",
        Array.from(originalItemsByProduct.entries()).map(([productId, items]) => ({
          productId,
          count: items.length,
          item_ids: items.map(i => i.id)
        }))
      )

      // Para cada item editado, marcar un item original correspondiente como "mantener"
      editOrderItems.forEach((editItem, editIndex) => {
        const productItems = originalItemsByProduct.get(editItem.product_id)
        if (productItems && productItems.length > 0) {
          // Encontrar el primer item de este producto que no esté ya marcado para mantener
          const itemToKeep = productItems.find(item => !itemsToKeep.has(item.id))
          if (itemToKeep) {
            itemsToKeep.add(itemToKeep.id)
            console.log(`✓ Item ${itemToKeep.id} (${itemToKeep.product.name}) marcado para mantener (edit index ${editIndex})`)
          }
        }
      })

      console.log("🔒 Items a mantener:", Array.from(itemsToKeep))

      // Eliminar los items que no están en el set de "mantener"
      for (let i = 0; i < selectedOrder.order_items.length; i++) {
        const oldItem = selectedOrder.order_items[i]
        console.log(`\n🔄 Procesando item ${i + 1}/${selectedOrder.order_items.length}:`, {
          item_id: oldItem.id,
          product_id: oldItem.product.id,
          product_name: oldItem.product.name
        })

        if (!itemsToKeep.has(oldItem.id)) {
          console.log(`❌ Este item NO está marcado para mantener. Eliminando...`)
          console.log(`🗑️  DELETE FROM order_items WHERE id = '${oldItem.id}'`)

          const { data, error } = await supabase
            .from("order_items")
            .delete()
            .eq("id", oldItem.id)

          if (error) {
            console.error(`❌ ERROR al eliminar item ${oldItem.id}:`, error)
            throw error
          } else {
            console.log(`✅ Item ${oldItem.id} eliminado exitosamente`)
          }
        } else {
          console.log(`✓ Este item está marcado para mantener, NO se eliminará`)
        }
      }
      console.log("✅ FIN - Proceso de eliminación completado\n")
      // 3. Actualizar o agregar items
      console.log("🔄 INICIO - Proceso de actualización/inserción de items")
      console.log("📋 Items válidos a procesar:", validItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity_requested,
        price: item.unit_price
      })))

      // Crear un mapa de items ya actualizados para evitar duplicados
      const updatedItemIds = new Set<string>()

      for (let i = 0; i < validItems.length; i++) {
        const newItem = validItems[i]
        console.log(`\n🔄 Procesando nuevo item ${i + 1}/${validItems.length}:`, {
          product_id: newItem.product_id,
          quantity: newItem.quantity_requested,
          price: newItem.unit_price
        })

        // Buscar items originales con este product_id que estén marcados para mantener
        // y que no hayan sido actualizados aún
        const candidateItems = selectedOrder.order_items.filter((oi: any) =>
          oi.product.id === newItem.product_id &&
          itemsToKeep.has(oi.id) &&
          !updatedItemIds.has(oi.id)
        )

        const existing = candidateItems.length > 0 ? candidateItems[0] : null

        if (existing) {
          // Actualizar
          console.log(`♻️  Item ya existe, actualizando...`, {
            item_id: existing.id,
            old_quantity: existing.quantity_requested,
            new_quantity: newItem.quantity_requested,
            old_price: existing.unit_price,
            new_price: newItem.unit_price
          })

          const { error } = await supabase.from("order_items").update({
            quantity_requested: newItem.quantity_requested,
            unit_price: newItem.unit_price,
            quantity_missing: newItem.quantity_requested,
          }).eq("id", existing.id)

          if (error) {
            console.error(`❌ ERROR al actualizar item ${existing.id}:`, error)
            throw error
          } else {
            updatedItemIds.add(existing.id)
            console.log(`✅ Item ${existing.id} actualizado exitosamente`)
          }
        } else {
          // Agregar nuevo
          console.log(`➕ Item nuevo, insertando...`)
          const itemToInsert = {
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
          }
          console.log(`📝 Datos a insertar:`, itemToInsert)

          const { error } = await supabase.from("order_items").insert(itemToInsert)

          if (error) {
            console.error(`❌ ERROR al insertar nuevo item:`, error)
            throw error
          } else {
            console.log(`✅ Nuevo item insertado exitosamente`)
          }
        }
      }
      console.log("✅ FIN - Proceso de actualización/inserción completado\n")
      // 4. Calcular y actualizar el total_value
      console.log("💰 Calculando total...")
      const newTotal = validItems.reduce((sum, item) => sum + item.quantity_requested * item.unit_price, 0)
      console.log(`💵 Nuevo total calculado: $${newTotal.toLocaleString()}`)

      const { error: totalError } = await supabase
        .from("orders")
        .update({ total_value: newTotal })
        .eq("id", selectedOrder.id)

      if (totalError) {
        console.error("❌ ERROR al actualizar total:", totalError)
        throw totalError
      } else {
        console.log("✅ Total actualizado exitosamente")
      }

      console.log("=".repeat(80))
      console.log("✅ ÉXITO - Pedido actualizado completamente")
      console.log("=".repeat(80))

      toast({
        title: "Éxito",
        description: "Pedido actualizado correctamente",
      })
      setIsOrderDialogOpen(false)

      console.log("🔄 Refrescando lista de pedidos...")
      await refetch() // Refrescar la lista de pedidos
      console.log("✅ Lista de pedidos refrescada")
    } catch (error: any) {
      console.log("=".repeat(80))
      console.error("❌ ERROR FATAL en handleSaveOrderEdit:", error)
      console.log("=".repeat(80))
      toast({
        title: "Error",
        description: error?.message || error?.details || "No se pudo actualizar el pedido",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      console.log("🏁 FIN - handleSaveOrderEdit\n\n")
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
                  <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold px-6 py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-0 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
                    <Plus className="h-5 w-5 mr-2" />
                    Nuevo Pedido
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-full max-w-[95vw] md:max-w-6xl max-h-[95vh] overflow-y-auto p-4 md:p-6">
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Pedido</DialogTitle>
                    <DialogDescription>
                      Completa la información del pedido y agrega los productos necesarios.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 md:gap-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="client">Cliente *</Label>
                        <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={clientSearchOpen}
                              className="w-full justify-between"
                            >
                              {selectedClient
                                ? clients.find((client) => client.id === selectedClient)?.name
                                : "Seleccionar cliente..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Buscar cliente..." />
                              <CommandList className="max-h-64 overflow-y-auto">
                                <CommandEmpty>No se encontró cliente.</CommandEmpty>
                                <CommandGroup>
                                  {clients.map((client) => (
                                    <CommandItem
                                      key={client.id}
                                      value={client.name}
                                      onSelect={() => {
                                        setSelectedClient(client.id)
                                        setSelectedBranch("") // Reset branch when client changes
                                        setClientSearchOpen(false)
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          selectedClient === client.id ? "opacity-100" : "opacity-0"
                                        }`}
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

                    {/* Información de próxima frecuencia */}
                    {selectedClient && selectedBranch && (() => {
                      const nextFreq = getNextFrequencyDateForClient(selectedClient, selectedBranch)
                      return nextFreq ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <CalendarDays className="h-5 w-5 text-blue-600" />
                            <div>
                              <h4 className="text-sm font-semibold text-blue-900">Próxima fecha de frecuencia</h4>
                              <p className="text-blue-700 text-sm">
                                Este cliente tiene frecuencia los <strong>{getDayNames(getFrequenciesForBranch(selectedBranch))}</strong>
                              </p>
                              <p className="text-blue-800 font-medium text-sm">
                                Próxima entrega sugerida: <strong>{nextFreq.dayName} {nextFreq.formattedDate}</strong>
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : selectedBranch ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-600" />
                            <div>
                              <h4 className="text-sm font-semibold text-amber-900">Sin frecuencia configurada</h4>
                              <p className="text-amber-700 text-sm">
                                Este cliente no tiene frecuencia de entrega configurada.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null
                    })()}

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
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <Label className="text-base font-semibold">Productos del Pedido</Label>
                      </div>

                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {orderItems.map((item, index) => (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-2 items-start md:items-center p-3 md:p-4 border rounded-lg bg-white shadow-sm">
                            <div className="md:col-span-5">
                              <Label className="block md:hidden text-sm font-medium mb-1">Producto</Label>
                              <Popover
                                open={productSearchOpen[index] || false}
                                onOpenChange={(open) => setProductSearchOpen(prev => ({ ...prev, [index]: open }))}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={productSearchOpen[index] || false}
                                    className="w-full justify-between h-10 md:h-8"
                                  >
                                    {item.product_id
                                      ? (() => {
                                          const product = finishedProducts.find((p) => p.id === item.product_id);
                                          return product ? `${getProductDisplayName(product)} - $${product.price?.toLocaleString() || "0"}` : "Producto no encontrado";
                                        })()
                                      : "Seleccionar producto..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0">
                                  <Command>
                                    <CommandInput placeholder="Buscar producto..." />
                                    <CommandList className="max-h-64 overflow-y-auto">
                                      <CommandEmpty>No se encontró producto.</CommandEmpty>
                                      <CommandGroup>
                                        {finishedProducts.map((product) => (
                                          <CommandItem
                                            key={product.id}
                                            value={`${getProductDisplayName(product)} ${product.price}`}
                                            onSelect={() => {
                                              updateOrderItem(index, "product_id", product.id)
                                              setProductSearchOpen(prev => ({ ...prev, [index]: false }))
                                            }}
                                          >
                                            <Check
                                              className={`mr-2 h-4 w-4 ${
                                                item.product_id === product.id ? "opacity-100" : "opacity-0"
                                              }`}
                                            />
                                            {getProductDisplayName(product)} - ${product.price?.toLocaleString() || "0"}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="md:col-span-2">
                              <Label className="block md:hidden text-sm font-medium mb-1">Cantidad</Label>
                              <Input
                                type="number"
                                placeholder="Cantidad"
                                className="h-10 md:h-8"
                                value={item.quantity_requested || ""}
                                onChange={(e) => updateOrderItem(index, "quantity_requested", e.target.value)}
                                min="1"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Label className="block md:hidden text-sm font-medium mb-1">Unidades</Label>
                              <Input
                                value={(() => {
                                  const unitsPerPackage = getUnitsPerPackage(item.product_id);
                                  const totalUnits = (item.quantity_requested || 0) * unitsPerPackage;
                                  return `${totalUnits} unidades`;
                                })()}
                                disabled
                                className="h-10 md:h-8 bg-gray-50 border-gray-200 text-gray-600 italic"
                                readOnly
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Label className="block md:hidden text-sm font-medium mb-1">Precio</Label>
                              <Input
                                type="number"
                                placeholder="Precio"
                                className="h-10 md:h-8"
                                value={item.unit_price || ""}
                                onChange={(e) => updateOrderItem(index, "unit_price", e.target.value)}
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <div className="md:col-span-1 flex justify-between md:justify-center items-center">
                              <div className="md:hidden">
                                <Label className="text-sm font-medium">Total: </Label>
                                <span className="text-sm font-semibold text-green-600">
                                  ${(item.quantity_requested * item.unit_price).toLocaleString()}
                                </span>
                              </div>
                              <div className="hidden md:block">
                                <span className="text-sm font-medium">
                                  ${(item.quantity_requested * item.unit_price).toLocaleString()}
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 bg-transparent ml-2 md:ml-0"
                                onClick={() => removeOrderItem(index)}
                                disabled={orderItems.length === 1}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Botón Agregar Producto */}
                      <div className="flex justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addOrderItem}
                          className="bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-300 text-blue-700 hover:scale-[1.02] transition-transform duration-200 font-medium px-6 py-3"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar otro producto
                        </Button>
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
                    {/* Botones de acción */}
                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t bg-white sticky bottom-0 -mx-4 md:-mx-6 px-4 md:px-6 py-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          resetForm()
                          setIsNewOrderOpen(false)
                        }}
                        className="w-full sm:w-auto"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleCreateOrder}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 hover:scale-105 transition-all duration-300 shadow-lg text-white font-semibold"
                      >
                        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        ✅ Crear Pedido
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
                              {order.expected_delivery_date}
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
                            <Popover open={editClientSearchOpen} onOpenChange={setEditClientSearchOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={editClientSearchOpen}
                                  className="w-full justify-between"
                                >
                                  {editClientId
                                    ? clients.find((client) => client.id === editClientId)?.name
                                    : "Seleccionar cliente..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0">
                                <Command>
                                  <CommandInput placeholder="Buscar cliente..." />
                                  <CommandList className="max-h-64 overflow-y-auto">
                                    <CommandEmpty>No se encontró cliente.</CommandEmpty>
                                    <CommandGroup>
                                      {clients.map((client) => (
                                        <CommandItem
                                          key={client.id}
                                          value={client.name}
                                          onSelect={() => {
                                            setEditClientId(client.id)
                                            setEditBranchId("") // Reset branch when client changes
                                            setEditClientSearchOpen(false)
                                          }}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              editClientId === client.id ? "opacity-100" : "opacity-0"
                                            }`}
                                          />
                                          {client.name}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
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
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                          <span className="text-sm text-gray-600">Puedes agregar o eliminar productos</span>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="min-w-[120px]">Producto</TableHead>
                                <TableHead className="min-w-[80px]">Cant.</TableHead>
                                <TableHead className="min-w-[80px]">Unidades</TableHead>
                                <TableHead className="min-w-[80px]">Precio</TableHead>
                                <TableHead className="min-w-[80px]">Total</TableHead>
                                <TableHead className="w-10"></TableHead>
                              </TableRow>
                            </TableHeader>
                          <TableBody>
                            {editOrderItems.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Popover
                                    open={editProductSearchOpen[index] || false}
                                    onOpenChange={(open) => setEditProductSearchOpen(prev => ({ ...prev, [index]: open }))}
                                  >
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={editProductSearchOpen[index] || false}
                                        className="w-full justify-between h-8"
                                      >
                                        {item.product_id
                                          ? (() => {
                                              const product = finishedProducts.find((p) => p.id === item.product_id);
                                              return product ? `${getProductDisplayName(product)} - $${product.price?.toLocaleString() || "0"}` : "Producto no encontrado";
                                            })()
                                          : "Seleccionar producto..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                      <Command>
                                        <CommandInput placeholder="Buscar producto..." />
                                        <CommandList className="max-h-64 overflow-y-auto">
                                          <CommandEmpty>No se encontró producto.</CommandEmpty>
                                          <CommandGroup>
                                            {finishedProducts.map((product) => (
                                              <CommandItem
                                                key={product.id}
                                                value={`${getProductDisplayName(product)} ${product.price}`}
                                                onSelect={() => {
                                                  updateEditOrderItem(index, "product_id", product.id)
                                                  setEditProductSearchOpen(prev => ({ ...prev, [index]: false }))
                                                }}
                                              >
                                                <Check
                                                  className={`mr-2 h-4 w-4 ${
                                                    item.product_id === product.id ? "opacity-100" : "opacity-0"
                                                  }`}
                                                />
                                                {getProductDisplayName(product)} - ${product.price?.toLocaleString() || "0"}
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
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
                                    value={(() => {
                                      const unitsPerPackage = getUnitsPerPackage(item.product_id);
                                      const totalUnits = (item.quantity_requested || 0) * unitsPerPackage;
                                      return `${totalUnits} unidades`;
                                    })()}
                                    disabled
                                    className="h-8 bg-gray-50 border-gray-200 text-gray-600 italic text-xs"
                                    readOnly
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

                        {/* Botón Agregar Producto en modo edición */}
                        <div className="flex justify-center mt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={addEditOrderItem}
                            className="bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-300 text-blue-700 hover:scale-[1.02] transition-transform duration-200 font-medium px-6 py-3"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar otro producto
                          </Button>
                        </div>

                        {/* Botón flotante de guardar */}
                        <div className="flex justify-center sm:justify-end mt-6 pt-4 border-t bg-white sticky bottom-0 -mx-4 md:-mx-6 px-4 md:px-6 py-4">
                          <Button
                            onClick={handleSaveOrderEdit}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 hover:scale-105 transition-all duration-300 shadow-lg text-white font-semibold"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Guardando...
                              </>
                            ) : (
                              <>
                                💾 Guardar Pedido
                              </>
                            )}
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
