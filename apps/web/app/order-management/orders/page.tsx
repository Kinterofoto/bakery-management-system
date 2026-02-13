"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
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
import { SearchableSelect } from "@/components/ui/searchable-select"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import { DateMismatchAlert } from "@/components/ui/date-mismatch-alert"
import { OrderAuditHistory } from "@/components/orders/order-audit-history"
import { OrderDetailModal } from "@/components/orders/order-detail-modal"
// V2: Using Server Actions instead of hooks - NO direct Supabase calls
import {
  getOrders,
  getOrderStats,
  getOrder,
  getOrdersBatch,
  createOrder,
  updateOrderFull,
  OrderListItem,
  OrderStats,
} from "../actions"
// V2: Master data from shared module (reusable across all V2 modules)
import {
  getClients,
  getBranches,
  getClientFrequencies,
  getReceivingSchedules,
  getProductConfigs,
  getFinishedProducts,
  type Client,
  type Product,
  type Branch,
  type ClientFrequency,
  type ReceivingSchedule,
  type ProductConfig,
} from "@/lib/api/masterdata"
import { useToast } from "@/hooks/use-toast"
// V2: No direct Supabase imports - all data through Server Actions
import { cn } from "@/lib/utils"
import {
  toLocalISODate,
  getTomorrowLocalDate,
  getNextMondayLocalDate,
  getNextWeekLocalDateRange,
  isSameLocalDate,
  isDateInLocalRange,
} from "@/lib/timezone-utils"

interface OrderItem {
  product_id: string
  quantity_requested: number
  unit_price: number
}

export default function OrdersPage() {
  // Search with debounce for performance
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const searchDebounceRef = useRef<NodeJS.Timeout>()

  // Debounce search term (300ms delay)
  useEffect(() => {
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(searchDebounceRef.current)
  }, [searchTerm])

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
  const [frequencies, setFrequencies] = useState<any[]>([])
  const [suggestedDates, setSuggestedDates] = useState<Date[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false)
  const [isLoadingOrderDetail, setIsLoadingOrderDetail] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false)
  const [clientSearchOpen, setClientSearchOpen] = useState(false)
  const [editClientSearchOpen, setEditClientSearchOpen] = useState(false)
  const [productSearchOpen, setProductSearchOpen] = useState<Record<number, boolean>>({})
  const [editProductSearchOpen, setEditProductSearchOpen] = useState<Record<number, boolean>>({})
  const [editOrderItems, setEditOrderItems] = useState<OrderItem[]>([])
  const [editClientId, setEditClientId] = useState("")
  const [editBranchId, setEditBranchId] = useState<string | null>("")
  const [editDeliveryDate, setEditDeliveryDate] = useState("")
  const [editPurchaseOrderNumber, setEditPurchaseOrderNumber] = useState("")
  const [editObservations, setEditObservations] = useState("")

  // V2: State for orders from API
  // Transform API format to component format for compatibility
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoadingMoreFromAPI, setIsLoadingMoreFromAPI] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const ORDERS_PER_PAGE = 200

  // V2: Cache for prefetched order details (background loading)
  const orderDetailsCacheRef = useRef<Record<string, any>>({})
  const [prefetchProgress, setPrefetchProgress] = useState({ loaded: 0, total: 0 })

  // Toast hook (needed early for loadMoreOrdersFromAPI)
  const { toast } = useToast()

  // Helper to transform API orders to component format
  const transformOrders = (apiOrders: any[]) => {
    return apiOrders.map(order => ({
      ...order,
      client: { name: order.client_name, id: order.client_id },
      branch: order.branch_name ? { name: order.branch_name, id: order.branch_id } : null,
      total_value: order.total,
      created_by_user: { name: order.source },
    }))
  }

  // V2: Fetch orders from FastAPI (initial load)
  const fetchOrdersFromAPI = useCallback(async () => {
    setLoading(true)
    setApiError(null)
    setCurrentPage(1)
    try {
      const result = await getOrders({ limit: ORDERS_PER_PAGE, page: 1 })
      if (result.error) {
        setApiError(result.error)
      } else if (result.data) {
        setOrders(transformOrders(result.data.orders))
        setTotalCount(result.data.total_count)
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Error loading orders")
    } finally {
      setLoading(false)
    }
  }, [])

  // V2: Load more orders from API (pagination)
  const loadMoreOrdersFromAPI = useCallback(async () => {
    if (isLoadingMoreFromAPI) return

    const nextPage = currentPage + 1
    setIsLoadingMoreFromAPI(true)

    try {
      const result = await getOrders({ limit: ORDERS_PER_PAGE, page: nextPage })
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else if (result.data && result.data.orders.length > 0) {
        const newOrders = transformOrders(result.data.orders)
        setOrders(prev => [...prev, ...newOrders])
        setCurrentPage(nextPage)
        // Note: prefetch for new orders is triggered by the useEffect watching orders
      }
    } catch (err) {
      console.error("Error loading more orders:", err)
      toast({
        title: "Error",
        description: "No se pudieron cargar más pedidos",
        variant: "destructive",
      })
    } finally {
      setIsLoadingMoreFromAPI(false)
    }
  }, [currentPage, isLoadingMoreFromAPI, toast])

  // V2: Fetch stats from FastAPI
  const fetchStats = useCallback(async () => {
    try {
      const result = await getOrderStats()
      if (result.data) {
        setStats(result.data)
      }
    } catch (err) {
      console.error("Error fetching stats:", err)
    }
  }, [])

  // V2: Load on mount
  useEffect(() => {
    fetchOrdersFromAPI()
    fetchStats()
  }, [fetchOrdersFromAPI, fetchStats])

  // V2: Refetch function
  const refetch = useCallback(() => {
    // Clear cache on refetch
    orderDetailsCacheRef.current = {}
    setPrefetchProgress({ loaded: 0, total: 0 })
    fetchOrdersFromAPI()
    fetchStats()
  }, [fetchOrdersFromAPI, fetchStats])

  // V2: Prefetch order details in background (runs after orders list loads)
  const prefetchOrderDetails = useCallback(async (orderIds: string[]) => {
    if (orderIds.length === 0) return

    setPrefetchProgress({ loaded: 0, total: orderIds.length })

    // Transform API response to modal format (reusable helper)
    const transformOrderDetail = (orderDetail: any) => ({
      ...orderDetail,
      client: {
        id: orderDetail.client_id,
        name: orderDetail.client_name,
        razon_social: orderDetail.client_razon_social,
        address: orderDetail.client_address,
        phone: orderDetail.client_phone,
        email: orderDetail.client_email,
        contact_person: orderDetail.client_contact_person,
      },
      branch: orderDetail.branch_id ? {
        id: orderDetail.branch_id,
        name: orderDetail.branch_name,
        address: orderDetail.branch_address,
        phone: orderDetail.branch_phone,
        email: orderDetail.branch_email,
        contact_person: orderDetail.branch_contact_person,
      } : null,
      created_by_user: { name: orderDetail.created_by_name },
      order_items: orderDetail.items?.map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        quantity_requested: item.quantity_requested,
        quantity_available: item.quantity_available,
        quantity_delivered: item.quantity_delivered,
        unit_price: item.unit_price,
      })) || [],
      total_value: orderDetail.total,
      pdf_filename: orderDetail.pdf_filename,
    })

    // Use batch endpoint - 100 orders per API call (API limit)
    // For 200 orders = only 2 API calls instead of 200!
    const batchSize = 100
    let loaded = 0

    for (let i = 0; i < orderIds.length; i += batchSize) {
      const batchIds = orderIds.slice(i, i + batchSize)

      console.log(`[Prefetch] Fetching batch ${Math.floor(i / batchSize) + 1} (${batchIds.length} orders)`)

      const result = await getOrdersBatch(batchIds)

      if (result.data) {
        // Store each order in cache
        result.data.forEach(orderDetail => {
          orderDetailsCacheRef.current[orderDetail.id] = transformOrderDetail(orderDetail)
        })
        loaded += result.data.length
      } else {
        console.error(`[Prefetch] Batch error:`, result.error)
        // Still count as loaded to update progress
        loaded += batchIds.length
      }

      setPrefetchProgress({ loaded, total: orderIds.length })
    }

    console.log(`[Prefetch] Completed: ${Object.keys(orderDetailsCacheRef.current).length} orders in cache`)
  }, [])

  // V2: Trigger prefetch after orders load (only for uncached orders)
  useEffect(() => {
    if (!loading && orders.length > 0) {
      // Only prefetch orders not already in cache
      const uncachedOrderIds = orders
        .map(o => o.id)
        .filter(id => !orderDetailsCacheRef.current[id])

      if (uncachedOrderIds.length > 0) {
        console.log(`[Prefetch] ${uncachedOrderIds.length} new orders to prefetch`)
        prefetchOrderDetails(uncachedOrderIds)
      }
    }
  }, [loading, orders, prefetchOrderDetails])

  // V2: Master data state (loaded via Server Actions, no Supabase)
  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [finishedProducts, setFinishedProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [branches, setBranches] = useState<Branch[]>([])
  const [productConfigs, setProductConfigs] = useState<ProductConfig[]>([])
  const [receivingSchedules, setReceivingSchedules] = useState<ReceivingSchedule[]>([])

  // V2: Load master data on mount
  useEffect(() => {
    const loadMasterData = async () => {
      // Load all master data in parallel for speed
      const [clientsRes, productsRes, branchesRes, configsRes, schedulesRes] = await Promise.all([
        getClients(),
        getFinishedProducts(),
        getBranches(),
        getProductConfigs(),
        getReceivingSchedules(),
      ])

      if (clientsRes.data) setClients(clientsRes.data)
      if (productsRes.data) setFinishedProducts(productsRes.data)
      if (branchesRes.data) setBranches(branchesRes.data)
      if (configsRes.data) setProductConfigs(configsRes.data)
      if (schedulesRes.data) setReceivingSchedules(schedulesRes.data)

      setClientsLoading(false)
      setProductsLoading(false)
    }

    loadMasterData()
  }, [])

  // V2: Helper functions to filter master data
  const getBranchesByClient = (clientId: string) => {
    return branches.filter(b => b.client_id === clientId)
  }

  const getFrequenciesForBranch = (branchId: string) => {
    return frequencies.filter(f => f.branch_id === branchId)
  }

  const getSchedulesByBranch = (branchId: string) => {
    return receivingSchedules.filter(s => s.branch_id === branchId)
  }

  // Helper to format date from database (handles timezone correctly)
  const formatDateFromDB = (dateString: string, formatStr: string) => {
    const hasTime = dateString.includes('T') || dateString.includes(' ')

    let dateObj: Date

    if (hasTime) {
      // For timestamps with time, add 'Z' to interpret as UTC
      const utcString = dateString.endsWith('Z') ? dateString : dateString + 'Z'
      dateObj = new Date(utcString)
    } else {
      // For date-only strings (YYYY-MM-DD), parse as local date to avoid timezone issues
      const parts = dateString.split('-').map(p => parseInt(p, 10))
      dateObj = new Date(parts[0], parts[1] - 1, parts[2]) // month is 0-indexed
    }

    const formatted = format(dateObj, formatStr, { locale: es })

    return formatted
  }

  useEffect(() => {
    setDisplayLimit(50)
  }, [searchTerm, statusFilter, dateFilter])

  // Load frequencies when component mounts
  useEffect(() => {
    loadFrequencies()
  }, [])

  const loadFrequencies = async () => {
    try {
      // V2: Use Server Action instead of direct Supabase call
      const result = await getClientFrequencies()
      if (result.error) {
        console.error('Error loading frequencies:', result.error)
        return
      }
      setFrequencies(result.data || [])
    } catch (err) {
      console.error('Error loading frequencies:', err)
    }
  }

  // Calculate suggested delivery dates when branch is selected
  useEffect(() => {
    if (!selectedBranch || frequencies.length === 0) {
      setSuggestedDates([])
      setDeliveryDate("") // Clear delivery date when branch changes
      return
    }

    const branchFrequencies = frequencies.filter(f => f.branch_id === selectedBranch)

    if (branchFrequencies.length === 0) {
      // No frequencies configured - suggest next 7 weekdays
      const dates: Date[] = []
      const today = new Date()
      let daysAdded = 0
      let dayOffset = 1

      while (daysAdded < 7 && dayOffset < 30) {
        const checkDate = new Date(today)
        checkDate.setDate(today.getDate() + dayOffset)
        const dayOfWeek = checkDate.getDay()

        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          dates.push(checkDate)
          daysAdded++
        }
        dayOffset++
      }

      setSuggestedDates(dates)
      setDeliveryDate("") // Clear delivery date to force new selection
      return
    }

    // Calculate dates based on configured frequencies
    const frequencyDays = branchFrequencies.map(freq => freq.day_of_week)
    const dates: Date[] = []
    const today = new Date()

    for (let i = 1; i <= 60 && dates.length < 7; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() + i)
      const checkDay = checkDate.getDay()

      if (frequencyDays.includes(checkDay)) {
        dates.push(checkDate)
      }
    }

    setSuggestedDates(dates)
    setDeliveryDate("") // Clear delivery date to force new selection
  }, [selectedBranch, frequencies])

  // Calculate total weight locally using already-loaded finishedProducts
  const editOrderTotalWeight = useMemo(() => {
    const validItems = editOrderItems.filter(item => item.product_id)
    if (validItems.length === 0 || finishedProducts.length === 0) return 0

    const totalGrams = validItems.reduce((sum, item) => {
      const product = finishedProducts.find(p => p.id === item.product_id)
      return sum + (item.quantity_requested * (product?.weight || 0))
    }, 0)

    return totalGrams / 1000
  }, [editOrderItems, finishedProducts])

  const getProductDisplayName = (product: any) => {
    const weight = product.weight ? ` (${product.weight})` : ''
    const presentation = product.presentation ? ` - ${product.presentation}` : ''
    return `${product.name}${weight}${presentation}`
  }

  // V2: Products are now loaded in loadMasterData above

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
      // V2: Use Server Action - single API call handles everything
      const result = await createOrder({
        client_id: selectedClient,
        branch_id: selectedBranch,
        expected_delivery_date: deliveryDate,
        purchase_order_number: purchaseOrderNumber || undefined,
        observations: observations || undefined,
        items: orderItems.map(item => ({
          product_id: item.product_id,
          quantity_requested: item.quantity_requested,
          unit_price: item.unit_price,
        })),
      })

      if (result.error) {
        throw new Error(result.error)
      }

      toast({
        title: "Pedido creado",
        description: `Pedido #${result.data?.order_number} creado exitosamente`,
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
        description: error instanceof Error ? error.message : "No se pudo crear el pedido",
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
      // V2: Use Server Action - single API call handles smart diff on items
      const result = await updateOrderFull(selectedOrder.id, {
        client_id: editClientId,
        branch_id: editBranchId || undefined,
        expected_delivery_date: editDeliveryDate,
        purchase_order_number: editPurchaseOrderNumber || undefined,
        observations: editObservations || undefined,
        // Include item ids for existing items so backend can do smart diff
        items: editOrderItems.map((item, index) => {
          const originalItem = selectedOrder.order_items?.[index]
          return {
            // Keep id if product didn't change (for update)
            // Remove id if product changed (will delete old + insert new)
            id: originalItem?.product_id === item.product_id ? originalItem?.id : undefined,
            product_id: item.product_id,
            quantity_requested: item.quantity_requested,
            unit_price: item.unit_price,
          }
        }),
      })

      if (result.error) {
        throw new Error(result.error)
      }

      const { items_created, items_updated, items_deleted } = result.data || {}
      console.log(`Order updated: ${items_created} created, ${items_updated} updated, ${items_deleted} deleted`)

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
        description: error instanceof Error ? error.message : "No se pudo actualizar el pedido",
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
    // Use delivery_percentage from API if available (V2)
    if (order.delivery_percentage !== undefined && order.delivery_percentage !== null) {
      return order.delivery_percentage
    }
    // Fallback to calculating from order_items (V1 compatibility)
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

  // Memoized filtered orders for performance
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch =
        order.id.toString().includes(debouncedSearchTerm) ||
        order.client?.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        order.branch?.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" || order.status === statusFilter

      let matchesDate = true
      if (dateFilter === "today") {
        const today = toLocalISODate()
        matchesDate = order.expected_delivery_date === today
      } else if (dateFilter === "tomorrow") {
        const tomorrow = getTomorrowLocalDate()
        matchesDate = order.expected_delivery_date === tomorrow
      } else if (dateFilter === "monday") {
        const nextMonday = getNextMondayLocalDate()
        matchesDate = order.expected_delivery_date === nextMonday
      } else if (dateFilter === "week") {
        const { from, to } = getNextWeekLocalDateRange()
        matchesDate = isDateInLocalRange(order.expected_delivery_date, from, to)
      } else if (dateFilter === "custom" && selectedRange.from) {
        matchesDate = isDateInLocalRange(
          order.expected_delivery_date,
          selectedRange.from,
          selectedRange.to
        )
      }

      return matchesSearch && matchesStatus && matchesDate
    })
  }, [orders, debouncedSearchTerm, statusFilter, dateFilter, selectedRange])

  const displayedOrders = useMemo(() => {
    return filteredOrders.slice(0, displayLimit)
  }, [filteredOrders, displayLimit])

  // Memoized badge counts for performance (avoid recalculating on every render)
  const badgeCounts = useMemo(() => {
    const today = toLocalISODate()
    const tomorrow = getTomorrowLocalDate()
    const monday = getNextMondayLocalDate()
    const { from, to } = getNextWeekLocalDateRange()

    return {
      today: orders.filter(o => o.expected_delivery_date === today).length,
      tomorrow: orders.filter(o => o.expected_delivery_date === tomorrow).length,
      monday: orders.filter(o => o.expected_delivery_date === monday).length,
      week: orders.filter(o => isDateInLocalRange(o.expected_delivery_date, from, to)).length,
    }
  }, [orders])

  // Helper to populate modal state from order detail
  const populateModalFromOrder = (order: any) => {
    setSelectedOrder(order)
    setEditClientId(order.client_id || order.client?.id || "")
    setEditBranchId(order.branch_id || order.branch?.id || "")
    setEditDeliveryDate(order.expected_delivery_date || "")
    setEditPurchaseOrderNumber(order.purchase_order_number || "")
    setEditObservations(order.observations || "")
    setEditOrderItems(order.order_items?.map((item: any) => ({
      product_id: item.product_id,
      quantity_requested: item.quantity_requested || 0,
      unit_price: item.unit_price || 0,
    })) || order.items?.map((item: any) => ({
      product_id: item.product_id,
      quantity_requested: item.quantity_requested || 0,
      unit_price: item.unit_price || 0,
    })) || [{ product_id: "", quantity_requested: 1, unit_price: 0 }])
    setIsEditMode(true)
  }

  const handleEditOrder = async (orderListItem: any) => {
    const orderId = orderListItem.id

    // Check cache first - if prefetched, open instantly!
    const cachedOrder = orderDetailsCacheRef.current[orderId]
    if (cachedOrder) {
      console.log(`[Cache HIT] Opening order ${orderId} from cache`)
      populateModalFromOrder(cachedOrder)
      setIsLoadingOrderDetail(false)
      setIsOrderDialogOpen(true)
      return
    }

    // Cache miss - fetch with loading state
    console.log(`[Cache MISS] Fetching order ${orderId} from API`)
    setIsOrderDialogOpen(true)
    setIsLoadingOrderDetail(true)
    setSelectedOrder(null)

    try {
      const result = await getOrder(orderId)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
        setIsOrderDialogOpen(false)
        return
      }

      if (!result.data) {
        toast({
          title: "Error",
          description: "No se encontró el pedido",
          variant: "destructive",
        })
        setIsOrderDialogOpen(false)
        return
      }

      const orderDetail = result.data

      // Transform API response to modal expected format
      const transformedOrder = {
        ...orderDetail,
        client: {
          id: orderDetail.client_id,
          name: orderDetail.client_name,
          razon_social: orderDetail.client_razon_social,
          address: orderDetail.client_address,
          phone: orderDetail.client_phone,
          email: orderDetail.client_email,
          contact_person: orderDetail.client_contact_person,
        },
        branch: orderDetail.branch_id ? {
          id: orderDetail.branch_id,
          name: orderDetail.branch_name,
          address: orderDetail.branch_address,
          phone: orderDetail.branch_phone,
          email: orderDetail.branch_email,
          contact_person: orderDetail.branch_contact_person,
        } : null,
        created_by_user: { name: orderDetail.created_by_name },
        order_items: orderDetail.items?.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          quantity_requested: item.quantity_requested,
          quantity_available: item.quantity_available,
          quantity_delivered: item.quantity_delivered,
          unit_price: item.unit_price,
        })) || [],
        total_value: orderDetail.total,
        pdf_filename: orderDetail.pdf_filename,
      }

      // Save to cache for future use
      orderDetailsCacheRef.current[orderId] = transformedOrder

      populateModalFromOrder(transformedOrder)

    } catch (err) {
      console.error("Error fetching order detail:", err)
      toast({
        title: "Error",
        description: "No se pudo cargar el detalle del pedido",
        variant: "destructive",
      })
      setIsOrderDialogOpen(false)
    } finally {
      setIsLoadingOrderDetail(false)
    }
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
                        {badgeCounts.today}
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
                        {badgeCounts.tomorrow}
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
                        {badgeCounts.monday}
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
                        {badgeCounts.week}
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
                        {totalCount}
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

                              {/* Right: Percentage + Total + Date + Delivery Info */}
                              <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
                                {/* Delivery Percentage Circle */}
                                {isDelivered && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="relative w-12 h-12 md:w-14 md:h-14">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                          {/* Background circle */}
                                          <circle
                                            cx="18"
                                            cy="18"
                                            r="16"
                                            fill="none"
                                            className="stroke-gray-200"
                                            strokeWidth="3"
                                          />
                                          {/* Progress circle */}
                                          <circle
                                            cx="18"
                                            cy="18"
                                            r="16"
                                            fill="none"
                                            className={cn(
                                              deliveryPercentage === 100 ? "stroke-green-500" :
                                              deliveryPercentage === 0 ? "stroke-red-500" :
                                              "stroke-orange-500"
                                            )}
                                            strokeWidth="3"
                                            strokeDasharray={`${deliveryPercentage} 100`}
                                            strokeLinecap="round"
                                          />
                                        </svg>
                                        {/* Percentage text */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <span className={cn(
                                            "font-medium text-xs md:text-sm",
                                            deliveryPercentage === 100 ? "text-green-600" :
                                            deliveryPercentage === 0 ? "text-red-600" :
                                            "text-orange-600"
                                          )}>
                                            {deliveryPercentage}%
                                          </span>
                                        </div>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Porcentaje entregado</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}

                                {/* Total Value */}
                                <div className="text-right min-w-[100px]">
                                  <p className="font-semibold text-green-600 text-sm md:text-base">{formatCurrency(order.total_value || 0)}</p>
                                </div>

                                {/* Delivery Date */}
                                <div className="text-sm">
                                  <div className="flex items-center gap-1.5 text-gray-600">
                                    {order.requested_delivery_date && order.requested_delivery_date !== order.expected_delivery_date ? (
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
                                    <span className="whitespace-nowrap">{formatDateFromDB(order.expected_delivery_date, "dd MMM")}</span>
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
                                    {order.requested_delivery_date && order.requested_delivery_date !== order.expected_delivery_date ? (
                                      <TriangleAlert className="h-3 w-3 text-amber-500" />
                                    ) : (
                                      <CalendarDays className="h-3 w-3" />
                                    )}
                                    <span>{formatDateFromDB(order.expected_delivery_date, "dd MMM")}</span>
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
                                    <div className="relative w-10 h-10 ml-auto flex-shrink-0">
                                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                        {/* Background circle */}
                                        <circle
                                          cx="18"
                                          cy="18"
                                          r="16"
                                          fill="none"
                                          className="stroke-gray-200"
                                          strokeWidth="3"
                                        />
                                        {/* Progress circle */}
                                        <circle
                                          cx="18"
                                          cy="18"
                                          r="16"
                                          fill="none"
                                          className={cn(
                                            deliveryPercentage === 100 ? "stroke-green-500" :
                                            deliveryPercentage === 0 ? "stroke-red-500" :
                                            "stroke-orange-500"
                                          )}
                                          strokeWidth="3"
                                          strokeDasharray={`${deliveryPercentage} 100`}
                                          strokeLinecap="round"
                                        />
                                      </svg>
                                      {/* Percentage text */}
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <span className={cn(
                                          "font-medium text-xs",
                                          deliveryPercentage === 100 ? "text-green-600" :
                                          deliveryPercentage === 0 ? "text-red-600" :
                                          "text-orange-600"
                                        )}>
                                          {deliveryPercentage}%
                                        </span>
                                      </div>
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
              {displayedOrders.length < filteredOrders.length ? (
                // Load more from already fetched orders
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setDisplayLimit(prev => prev + 50)}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cargar más"}
                  </Button>
                </div>
              ) : orders.length < totalCount ? (
                // Load more from API (pagination)
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm text-gray-500">
                    Mostrando {orders.length} de {totalCount} pedidos
                  </p>
                  <Button
                    variant="outline"
                    onClick={loadMoreOrdersFromAPI}
                    disabled={isLoadingMoreFromAPI}
                    className="gap-2"
                  >
                    {isLoadingMoreFromAPI ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando más pedidos...
                      </>
                    ) : (
                      `Cargar ${Math.min(ORDERS_PER_PAGE, totalCount - orders.length)} pedidos más`
                    )}
                  </Button>
                </div>
              ) : null}
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
              <SearchableSelect
                options={clients.map(c => ({
                  value: c.id,
                  label: c.name,
                  subLabel: c.nit || c.email || undefined
                }))}
                value={selectedClient}
                onChange={(value) => {
                  setSelectedClient(value)
                  setSelectedBranch("")
                }}
                placeholder="Buscar cliente..."
                icon={<Search size={16} />}
              />
            </div>

            {/* Branch Selection */}
            <div className="space-y-2">
              <Label>Sucursal *</Label>
              <SearchableSelect
                options={getBranchesByClient(selectedClient).map(b => ({
                  value: b.id,
                  label: b.name,
                  subLabel: b.address || undefined
                }))}
                value={selectedBranch}
                onChange={setSelectedBranch}
                placeholder="Buscar sucursal..."
                disabled={!selectedClient}
                icon={<Navigation size={16} />}
              />
            </div>

            {/* Delivery Date */}
            <div className="space-y-2">
              <Label>Fecha de Entrega *</Label>
              {selectedBranch && suggestedDates.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                    {suggestedDates.slice(0, 6).map((date, index) => {
                      const dateStr = format(date, 'yyyy-MM-dd')
                      return (
                        <Button
                          key={index}
                          type="button"
                          size="sm"
                          variant={deliveryDate === dateStr ? 'default' : 'outline'}
                          className={`text-xs justify-center h-9 ${
                            deliveryDate === dateStr ? 'bg-primary text-primary-foreground' : ''
                          }`}
                          onClick={() => setDeliveryDate(dateStr)}
                        >
                          {format(date, "dd MMM", { locale: es })}
                        </Button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fechas sugeridas según las frecuencias configuradas para esta sucursal
                  </p>
                </div>
              ) : (
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  min={toLocalISODate()}
                  placeholder={selectedBranch ? "Calculando fechas..." : "Selecciona una sucursal primero"}
                  disabled={!selectedBranch}
                />
              )}
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
              {orderItems.map((item, index) => {
                const productConfig = productConfigs.find(pc => pc.product_id === item.product_id) as any
                const totalUnits = productConfig?.units_per_package
                  ? item.quantity_requested * productConfig.units_per_package
                  : null

                return (
                  <div key={index} className="border rounded-xl p-4 space-y-3 bg-gray-50/50">
                    {/* Producto */}
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <SearchableSelect
                          options={finishedProducts
                            .filter(p => p.category === "PT")
                            .map(p => ({
                              value: p.id,
                              label: getProductDisplayName(p),
                              subLabel: p.price ? `$${p.price.toLocaleString()}` : undefined
                            }))}
                          value={item.product_id}
                          onChange={(value) => {
                            const newItems = [...orderItems]
                            newItems[index].product_id = value
                            const product = finishedProducts.find(p => p.id === value)
                            if (product) {
                              newItems[index].unit_price = product.price || 0
                            }
                            setOrderItems(newItems)
                          }}
                          placeholder="Buscar producto..."
                          icon={<PackageIcon size={16} />}
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

                    {/* Campos numéricos */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Paquetes */}
                      <div>
                        <Label className="text-xs text-gray-600 mb-1.5 block">Paquetes</Label>
                        <Input
                          type="number"
                          value={item.quantity_requested}
                          onChange={(e) => {
                            const newItems = [...orderItems]
                            newItems[index].quantity_requested = parseInt(e.target.value) || 0
                            setOrderItems(newItems)
                          }}
                          min="1"
                          className="h-9 rounded-xl"
                        />
                      </div>

                      {/* Unidades (informativo) */}
                      <div>
                        <Label className="text-xs text-gray-600 mb-1.5 block">Unidades</Label>
                        <div className="h-9 px-3 flex items-center bg-blue-50 border border-blue-200 rounded-xl text-sm font-medium text-blue-700">
                          {totalUnits !== null ? totalUnits.toLocaleString() : '-'}
                        </div>
                      </div>

                      {/* Precio */}
                      <div>
                        <Label className="text-xs text-gray-600 mb-1.5 block">Precio</Label>
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
                          className="h-9 rounded-xl"
                        />
                      </div>

                      {/* Total */}
                      <div>
                        <Label className="text-xs text-gray-600 mb-1.5 block">Total</Label>
                        <div className="h-9 px-3 flex items-center bg-green-50 border border-green-200 rounded-xl text-sm font-semibold text-green-700">
                          ${(item.quantity_requested * item.unit_price).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
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
        isLoading={isLoadingOrderDetail}
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
        editClientId={editClientId}
        setEditClientId={setEditClientId}
        editBranchId={editBranchId}
        setEditBranchId={setEditBranchId}
        clients={clients}
        branches={branches}
        getBranchesByClient={getBranchesByClient}
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
        productConfigs={productConfigs}
        totalWeight={editOrderTotalWeight}
      />
    </RouteGuard>
  )
}
