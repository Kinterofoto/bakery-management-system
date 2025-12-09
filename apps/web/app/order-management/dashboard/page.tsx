"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShoppingBag,
  DollarSign,
  Receipt,
  Users,
  Target
} from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { VideoTutorialButton } from "@/components/shared/VideoTutorialButton"
import { MultiSelectFilter } from "@/components/dashboard/MultiSelectFilter"
import { OrderDetailModal } from "@/components/dashboard/OrderDetailModal"
import { useClientFrequencies } from "@/hooks/use-client-frequencies"
import { useOrders } from "@/hooks/use-orders"
import { useClients } from "@/hooks/use-clients"
import { useProducts } from "@/hooks/use-products"
import { useUsers } from "@/hooks/use-users"
import { getCurrentLocalDate, toLocalISODate } from "@/lib/timezone-utils"

// Filter state type
interface DashboardFilters {
  clients: string[]
  products: string[]
  dateRange: {
    from: Date | null
    to: Date | null
    preset: 'hoy' | 'esta-semana' | 'semana-anterior' | 'este-mes' | 'mes-anterior' | null
  }
  sellers: string[]
  status: string[]
  branch: string | null
}

// Trend data type
interface TrendMetric {
  value: number
  change: number
  changePercent: number
  comparison: 'day' | 'week' | 'month' | 'year'
}

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = getCurrentLocalDate()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    return tomorrow
  })

  const [activeTab, setActiveTab] = useState<'frecuencias' | 'control-clientes'>('frecuencias')
  const [filters, setFilters] = useState<DashboardFilters>({
    clients: [],
    products: [],
    dateRange: {
      from: null,
      to: null,
      preset: null,
    },
    sellers: [],
    status: [],
    branch: null,
  })

  // Sorting state
  type SortColumn = 'orderNumber' | 'clientName' | 'totalValue' | 'deliveryDate' | 'status'
  type SortDirection = 'asc' | 'desc'
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Modal state for order details
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { getFrequenciesForDay } = useClientFrequencies()
  const { orders, loading: ordersLoading } = useOrders()
  const { clients, loading: clientsLoading } = useClients()
  const { products, loading: productsLoading } = useProducts()
  const { users, loading: usersLoading, getCommercialUsers } = useUsers()

  const [frequenciesData, setFrequenciesData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filter orders based on selected filters
  const filteredOrders = useMemo(() => {
    if (!orders) return []

    let filtered = orders

    // Filter by clients
    if (filters.clients.length > 0) {
      filtered = filtered.filter(order => filters.clients.includes(order.client_id))
    }

    // Filter by products
    if (filters.products.length > 0) {
      filtered = filtered.filter(order => {
        // Check if order has at least one of the selected products
        return order.order_items?.some(item =>
          filters.products.includes(item.product_id)
        )
      })
    }

    // Filter by date range
    if (filters.dateRange.preset) {
      const today = getCurrentLocalDate()
      const todayStr = toLocalISODate(today)

      if (filters.dateRange.preset === 'hoy') {
        filtered = filtered.filter(order => order.expected_delivery_date === todayStr)
      } else if (filters.dateRange.preset === 'esta-semana') {
        // Esta semana: desde el domingo hasta el sábado de la semana actual
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        weekStart.setHours(0, 0, 0, 0)

        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)

        filtered = filtered.filter(order => {
          if (!order.expected_delivery_date) return false
          const orderDate = new Date(order.expected_delivery_date + 'T00:00:00')
          return orderDate >= weekStart && orderDate <= weekEnd
        })
      } else if (filters.dateRange.preset === 'semana-anterior') {
        // Semana anterior: desde el domingo hasta el sábado de la semana pasada
        const lastWeekEnd = new Date(today)
        lastWeekEnd.setDate(today.getDate() - today.getDay() - 1)
        lastWeekEnd.setHours(23, 59, 59, 999)

        const lastWeekStart = new Date(lastWeekEnd)
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6)
        lastWeekStart.setHours(0, 0, 0, 0)

        filtered = filtered.filter(order => {
          if (!order.expected_delivery_date) return false
          const orderDate = new Date(order.expected_delivery_date + 'T00:00:00')
          return orderDate >= lastWeekStart && orderDate <= lastWeekEnd
        })
      } else if (filters.dateRange.preset === 'este-mes') {
        // Este mes: desde el día 1 hasta el último día del mes actual
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        monthStart.setHours(0, 0, 0, 0)

        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        monthEnd.setHours(23, 59, 59, 999)

        filtered = filtered.filter(order => {
          if (!order.expected_delivery_date) return false
          const orderDate = new Date(order.expected_delivery_date + 'T00:00:00')
          return orderDate >= monthStart && orderDate <= monthEnd
        })
      } else if (filters.dateRange.preset === 'mes-anterior') {
        // Mes anterior: desde el día 1 hasta el último día del mes pasado
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        lastMonthStart.setHours(0, 0, 0, 0)

        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
        lastMonthEnd.setHours(23, 59, 59, 999)

        filtered = filtered.filter(order => {
          if (!order.expected_delivery_date) return false
          const orderDate = new Date(order.expected_delivery_date + 'T00:00:00')
          return orderDate >= lastMonthStart && orderDate <= lastMonthEnd
        })
      }
    }

    // Filter by status
    if (filters.status.length > 0) {
      filtered = filtered.filter(order => filters.status.includes(order.status))
    }

    // Filter by branch
    if (filters.branch) {
      filtered = filtered.filter(order =>
        order.branch_id === filters.branch || order.client_id === filters.branch
      )
    }

    // Filter by sellers (assigned_user_id in clients table)
    if (filters.sellers.length > 0) {
      filtered = filtered.filter(order => {
        // Find the client for this order
        const client = clients?.find(c => c.id === order.client_id)
        // Check if the client's assigned_user_id matches any of the selected sellers
        return client && client.assigned_user_id && filters.sellers.includes(client.assigned_user_id)
      })
    }

    return filtered
  }, [orders, filters, clients])

  // Filter clients based on filtered orders
  const filteredClients = useMemo(() => {
    if (!clients) return []

    // If there are active filters, only show clients that have filtered orders
    if (filters.clients.length > 0 || filters.dateRange.preset || filters.status.length > 0 || filters.branch) {
      const clientIdsWithOrders = new Set(filteredOrders.map(order => order.client_id))
      return clients.filter(client => clientIdsWithOrders.has(client.id))
    }

    return clients
  }, [clients, filteredOrders, filters])

  // Prepare table data with individual orders
  const tableData = useMemo(() => {
    return filteredOrders.map((order) => {
      return {
        orderId: order.id,
        orderNumber: order.order_number || 'N/A',
        clientName: order.client?.name || 'N/A',
        totalValue: order.total_value || 0,
        deliveryDate: order.expected_delivery_date || null,
        status: order.status || 'N/A',
        createdAt: order.created_at || null
      }
    })
  }, [filteredOrders])

  // Sort table data
  const sortedTableData = useMemo(() => {
    if (!sortColumn) return tableData

    return [...tableData].sort((a, b) => {
      let aValue: any = a[sortColumn]
      let bValue: any = b[sortColumn]

      // Handle null/undefined values
      if (aValue === null || aValue === undefined || aValue === 'N/A') return 1
      if (bValue === null || bValue === undefined || bValue === 'N/A') return -1

      // String comparison (case-insensitive)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [tableData, sortColumn, sortDirection])

  // Handle column sort
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to ascending
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Get sort icon
  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4 text-blue-600" />
      : <ArrowDown className="h-4 w-4 text-blue-600" />
  }

  // Handle row click to open modal
  const handleRowClick = (orderId: string) => {
    setSelectedOrderId(orderId)
    setIsModalOpen(true)
  }

  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedOrderId(null)
  }

  // Get selected order details
  const selectedOrder = selectedOrderId
    ? orders?.find(order => order.id === selectedOrderId)
    : null

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Format currency in millions
  const formatCurrencyInMillions = (value: number) => {
    const millions = value / 1000000
    return `$${millions.toFixed(1)}M`
  }

  // Format currency for ticket promedio - if less than 1M show as "mil", otherwise as "M"
  const formatTicketPromedio = (value: number) => {
    if (value < 1000000) {
      const thousands = value / 1000
      return `$${Math.round(thousands)}mil`
    } else {
      const millions = value / 1000000
      return `$${millions.toFixed(1)}M`
    }
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      'received': { label: 'Recibido', className: 'bg-blue-100 text-blue-800' },
      'review_area1': { label: 'Revisión 1', className: 'bg-yellow-100 text-yellow-800' },
      'review_area2': { label: 'Revisión 2', className: 'bg-yellow-100 text-yellow-800' },
      'ready_dispatch': { label: 'Listo', className: 'bg-purple-100 text-purple-800' },
      'dispatched': { label: 'Despachado', className: 'bg-indigo-100 text-indigo-800' },
      'in_delivery': { label: 'En Entrega', className: 'bg-orange-100 text-orange-800' },
      'delivered': { label: 'Entregado', className: 'bg-green-100 text-green-800' },
      'partially_delivered': { label: 'Parcial', className: 'bg-amber-100 text-amber-800' },
      'returned': { label: 'Devuelto', className: 'bg-red-100 text-red-800' }
    }

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
    return (
      <Badge className={`${config.className} text-xs`} variant="secondary">
        {config.label}
      </Badge>
    )
  }

  // Day names in Spanish
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
  const shortDayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

  // Get day of week for selected date
  const selectedDayOfWeek = selectedDate.getDay()

  // Load frequencies data when date changes
  useEffect(() => {
    const loadFrequencies = async () => {
      try {
        setLoading(true)
        const frequencies = await getFrequenciesForDay(selectedDayOfWeek)
        setFrequenciesData(frequencies)
      } catch (error) {
        console.error("Error loading frequencies:", error)
      } finally {
        setLoading(false)
      }
    }

    loadFrequencies()
  }, [selectedDayOfWeek])

  // Check if branch has orders for the selected date
  const branchHasOrders = (branchId: string) => {
    if (!orders || orders.length === 0) return false
    const dateStr = toLocalISODate(selectedDate)
    return orders.some(order => {
      try {
        if (!order.expected_delivery_date) return false
        const orderDate = order.expected_delivery_date
        const activeStatuses = [
          'received',
          'review_area1',
          'review_area2',
          'ready_dispatch',
          'dispatched',
          'in_delivery'
        ]
        const directBranchMatch = order.branch_id === branchId
        const clientMatch = order.client_id === branchId
        const branchMatches = directBranchMatch || clientMatch
        const dateMatches = orderDate === dateStr
        const statusMatches = activeStatuses.includes(order.status)
        return branchMatches && dateMatches && statusMatches
      } catch (error) {
        return false
      }
    })
  }

  // Navigate to previous/next day
  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1)
    } else {
      newDate.setDate(newDate.getDate() + 1)
    }
    setSelectedDate(newDate)
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const totalWithFrequency = frequenciesData.length
    const withOrders = frequenciesData.filter(freq => branchHasOrders(freq.branch_id)).length
    const withoutOrders = totalWithFrequency - withOrders
    const coverage = totalWithFrequency > 0 ? Math.round((withOrders / totalWithFrequency) * 100) : 0

    return {
      totalWithFrequency,
      withOrders,
      withoutOrders,
      coverage
    }
  }, [frequenciesData, orders])

  // Calculate additional business metrics
  const businessMetrics = useMemo(() => {
    if (!filteredOrders || filteredOrders.length === 0) {
      return {
        totalOrders: 0,
        totalUnits: 0,
        totalValue: 0,
        averageTicket: 0,
        uniqueClients: 0,
        deliveredPercentage: 0,
        inFull: 0
      }
    }

    // Total orders
    const totalOrders = filteredOrders.length

    // Total units - quantity_requested * units_per_package
    let totalUnits = 0
    filteredOrders.forEach(order => {
      if (order.order_items && order.order_items.length > 0) {
        order.order_items.forEach(item => {
          const quantity = item.quantity_requested || 0
          const unitsPerPackage = item.product?.units_per_package || 1
          totalUnits += quantity * unitsPerPackage
        })
      }
    })

    // Total value
    const totalValue = filteredOrders.reduce((sum, order) => sum + (order.total_value || 0), 0)

    // Average ticket
    const averageTicket = totalOrders > 0 ? totalValue / totalOrders : 0

    // Unique clients
    const uniqueClientIds = new Set(filteredOrders.map(order => order.client_id))
    const uniqueClients = uniqueClientIds.size

    // Delivered percentage
    const deliveredOrders = filteredOrders.filter(order => order.status === 'delivered').length
    const deliveredPercentage = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0

    // In Full - cantidad solicitada vs cantidad entregada (same logic as in orders page)
    let totalRequested = 0
    let totalDelivered = 0

    filteredOrders.forEach(order => {
      if (order.order_items && order.order_items.length > 0) {
        order.order_items.forEach(item => {
          totalRequested += item.quantity_requested || 0
          totalDelivered += item.quantity_delivered || 0
        })
      }
    })

    const inFull = totalRequested > 0 ? (totalDelivered / totalRequested) * 100 : 0

    return {
      totalOrders,
      totalUnits,
      totalValue,
      averageTicket,
      uniqueClients,
      deliveredPercentage,
      inFull
    }
  }, [filteredOrders])

  // Calculate trend metrics using filtered orders
  const trendMetrics = useMemo(() => {
    if (!orders || !filteredOrders) {
      return {
        totalOrders: { value: 0, change: 0, changePercent: 0, comparison: 'day' as const },
        dayTrend: { value: 0, change: 0, changePercent: 0, comparison: 'day' as const },
        weekTrend: { value: 0, change: 0, changePercent: 0, comparison: 'week' as const },
        monthTrend: { value: 0, change: 0, changePercent: 0, comparison: 'month' as const },
        yearTrend: { value: 0, change: 0, changePercent: 0, comparison: 'year' as const }
      }
    }

    const today = getCurrentLocalDate()
    const totalOrders = filteredOrders.length

    // Helper function to count orders in a date range with same filters
    const countOrdersInRange = (startDate: Date, endDate: Date) => {
      return orders.filter(order => {
        if (!order.expected_delivery_date) return false

        const orderDate = new Date(order.expected_delivery_date + 'T00:00:00')
        if (orderDate < startDate || orderDate > endDate) return false

        // Apply same filters as filteredOrders
        if (filters.clients.length > 0 && !filters.clients.includes(order.client_id)) return false
        if (filters.products.length > 0 && !order.order_items?.some(item => filters.products.includes(item.product_id))) return false
        if (filters.status.length > 0 && !filters.status.includes(order.status)) return false
        if (filters.branch && order.branch_id !== filters.branch && order.client_id !== filters.branch) return false

        // Apply seller filter
        if (filters.sellers.length > 0) {
          const client = clients?.find(c => c.id === order.client_id)
          if (!client || !client.assigned_user_id || !filters.sellers.includes(client.assigned_user_id)) return false
        }

        return true
      }).length
    }

    // Calculate percentage change
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100)
    }

    // Day comparison - yesterday
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const yesterdayOrders = countOrdersInRange(yesterday, yesterday)
    const dayChange = totalOrders - yesterdayOrders
    const dayChangePercent = calculateChange(totalOrders, yesterdayOrders)

    // Week comparison - same week last year or previous week
    const thisWeekStart = new Date(today)
    thisWeekStart.setDate(today.getDate() - today.getDay())
    thisWeekStart.setHours(0, 0, 0, 0)

    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(thisWeekStart.getDate() - 7)
    const lastWeekEnd = new Date(thisWeekStart)
    lastWeekEnd.setDate(thisWeekStart.getDate() - 1)
    lastWeekEnd.setHours(23, 59, 59, 999)

    const lastWeekOrders = countOrdersInRange(lastWeekStart, lastWeekEnd)
    const weekChange = totalOrders - lastWeekOrders
    const weekChangePercent = calculateChange(totalOrders, lastWeekOrders)

    // Month comparison - last month
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
    lastMonthEnd.setHours(23, 59, 59, 999)

    const lastMonthOrders = countOrdersInRange(lastMonthStart, lastMonthEnd)
    const monthChange = totalOrders - lastMonthOrders
    const monthChangePercent = calculateChange(totalOrders, lastMonthOrders)

    // Year comparison - same period last year
    const lastYearStart = new Date(today.getFullYear() - 1, today.getMonth(), 1)
    const lastYearEnd = new Date(today.getFullYear() - 1, today.getMonth() + 1, 0)
    lastYearEnd.setHours(23, 59, 59, 999)

    const lastYearOrders = countOrdersInRange(lastYearStart, lastYearEnd)
    const yearChange = totalOrders - lastYearOrders
    const yearChangePercent = calculateChange(totalOrders, lastYearOrders)

    return {
      totalOrders: {
        value: totalOrders,
        change: dayChange,
        changePercent: dayChangePercent,
        comparison: 'day' as const
      },
      dayTrend: {
        value: totalOrders,
        change: dayChange,
        changePercent: dayChangePercent,
        comparison: 'day' as const
      },
      weekTrend: {
        value: totalOrders,
        change: weekChange,
        changePercent: weekChangePercent,
        comparison: 'week' as const
      },
      monthTrend: {
        value: totalOrders,
        change: monthChange,
        changePercent: monthChangePercent,
        comparison: 'month' as const
      },
      yearTrend: {
        value: totalOrders,
        change: yearChange,
        changePercent: yearChangePercent,
        comparison: 'year' as const
      }
    }
  }, [filteredOrders, orders, filters])

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Check if date is today or tomorrow
  const getDateContext = (date: Date) => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const dateStr = date.toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    if (dateStr === todayStr) return 'Hoy'
    if (dateStr === tomorrowStr) return 'Mañana'
    return null
  }

  const dateContext = getDateContext(selectedDate)

  // Render trend indicator
  const TrendIndicator = ({ trend }: { trend: TrendMetric }) => {
    const isPositive = trend.changePercent >= 0

    return (
      <div className="flex items-center gap-2">
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-green-600" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-600" />
        )}
        <span className={isPositive ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
          {isPositive ? '+' : ''}{trend.changePercent}%
        </span>
      </div>
    )
  }

  if (loading || ordersLoading || clientsLoading || productsLoading || usersLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                  <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Cargando dashboard...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <RouteGuard
      requiredPermissions={['order_management_dashboard']}
      requiredRoles={['administrator', 'coordinador_logistico', 'commercial', 'reviewer', 'driver', 'dispatcher']}
    >
      <div className="flex h-screen bg-gray-50">
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">

              {/* Header with Tabs */}
              <div className="flex flex-col gap-6">
                {/* Title Section */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex flex-col gap-4 flex-1">
                    <div className="flex items-center justify-between">
                      <h1 className="text-3xl font-bold text-gray-900">
                        Dashboard
                      </h1>
                      <VideoTutorialButton modulePath="/order-management/dashboard" />
                    </div>

                    {/* Tab Navigation - Minimalist */}
                    <div className="flex gap-8 border-b border-gray-200">
                      <button
                        onClick={() => setActiveTab('frecuencias')}
                        className={`pb-3 font-medium transition-colors relative ${
                          activeTab === 'frecuencias'
                            ? 'text-gray-900'
                            : 'text-gray-500 hover:text-gray-700'
                        } ${
                          activeTab === 'frecuencias'
                            ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gray-900'
                            : ''
                        }`}
                      >
                        Frecuencias
                      </button>
                      <button
                        onClick={() => setActiveTab('control-clientes')}
                        className={`pb-3 font-medium transition-colors relative ${
                          activeTab === 'control-clientes'
                            ? 'text-gray-900'
                            : 'text-gray-500 hover:text-gray-700'
                        } ${
                          activeTab === 'control-clientes'
                            ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gray-900'
                            : ''
                        }`}
                      >
                        Control de Clientes
                      </button>
                    </div>
                  </div>

                  {/* Date Navigation - Only for Frecuencias tab */}
                  {activeTab === 'frecuencias' && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateDay('prev')}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <Card className="px-4 py-2">
                        <div className="text-center">
                          {dateContext && (
                            <div className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                              {dateContext}
                            </div>
                          )}
                          <div className="font-semibold text-gray-900">
                            {shortDayNames[selectedDayOfWeek]}
                          </div>
                          <div className="text-xs text-gray-600">
                            {selectedDate.getDate()}/{selectedDate.getMonth() + 1}
                          </div>
                        </div>
                      </Card>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateDay('next')}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

              </div>

              {/* Advanced Filters Section - Only for Control de Clientes */}
              {activeTab === 'control-clientes' && (
                <div className="overflow-x-auto -mx-6 px-6">
                  <div className="flex gap-3 min-w-min pb-2">
                    <div className="flex-shrink-0 w-40">
                      <MultiSelectFilter
                        label="Clientes"
                        options={clients?.map((client) => ({ id: client.id, label: client.name })) || []}
                        selected={filters.clients}
                        onChange={(selected) => setFilters({ ...filters, clients: selected })}
                        placeholder="Buscar cliente..."
                      />
                    </div>

                    <div className="flex-shrink-0 w-40">
                      <MultiSelectFilter
                        label="Productos"
                        options={products?.filter(p => p.category === 'PT').map((product) => ({
                          id: product.id,
                          label: `${product.name} ${product.weight || ''}`.trim()
                        })) || []}
                        selected={filters.products}
                        onChange={(selected) => setFilters({ ...filters, products: selected })}
                        placeholder="Buscar producto..."
                      />
                    </div>

                    <div className="flex-shrink-0 flex gap-2">
                      <button
                        onClick={() => setFilters({ ...filters, dateRange: { from: null, to: null, preset: 'hoy' } })}
                        className={`px-3 py-2 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
                          filters.dateRange.preset === 'hoy'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        Hoy
                      </button>
                      <button
                        onClick={() => setFilters({ ...filters, dateRange: { from: null, to: null, preset: 'esta-semana' } })}
                        className={`px-3 py-2 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
                          filters.dateRange.preset === 'esta-semana'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        Esta Semana
                      </button>
                      <button
                        onClick={() => setFilters({ ...filters, dateRange: { from: null, to: null, preset: 'semana-anterior' } })}
                        className={`px-3 py-2 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
                          filters.dateRange.preset === 'semana-anterior'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        Semana Anterior
                      </button>
                      <button
                        onClick={() => setFilters({ ...filters, dateRange: { from: null, to: null, preset: 'este-mes' } })}
                        className={`px-3 py-2 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
                          filters.dateRange.preset === 'este-mes'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        Este Mes
                      </button>
                      <button
                        onClick={() => setFilters({ ...filters, dateRange: { from: null, to: null, preset: 'mes-anterior' } })}
                        className={`px-3 py-2 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
                          filters.dateRange.preset === 'mes-anterior'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        Mes Anterior
                      </button>
                    </div>

                    <div className="flex-shrink-0 w-40">
                      <MultiSelectFilter
                        label="Vendedor"
                        options={getCommercialUsers().map((user) => ({
                          id: user.id,
                          label: user.name
                        }))}
                        selected={filters.sellers}
                        onChange={(selected) => setFilters({ ...filters, sellers: selected })}
                        placeholder="Buscar vendedor..."
                      />
                    </div>

                    <div className="flex-shrink-0 w-40">
                      <MultiSelectFilter
                        label="Estado"
                        options={[
                          { id: 'received', label: 'Recibido' },
                          { id: 'review_area1', label: 'Revisión Área 1' },
                          { id: 'review_area2', label: 'Revisión Área 2' },
                          { id: 'ready_dispatch', label: 'Listo para Envío' },
                          { id: 'dispatched', label: 'Despachado' },
                          { id: 'in_delivery', label: 'En Entrega' },
                          { id: 'delivered', label: 'Entregado' },
                        ]}
                        selected={filters.status}
                        onChange={(selected) => setFilters({ ...filters, status: selected })}
                        placeholder="Buscar estado..."
                      />
                    </div>

                    {filters.clients.length > 0 && (
                      <div className="flex-shrink-0 w-40">
                        <MultiSelectFilter
                          label="Sucursal"
                          options={[
                            { id: 'sucursal1', label: 'Sucursal Centro' },
                            { id: 'sucursal2', label: 'Sucursal Norte' },
                            { id: 'sucursal3', label: 'Sucursal Sur' },
                          ]}
                          selected={filters.branch ? [filters.branch] : []}
                          onChange={(selected) => setFilters({ ...filters, branch: selected[0] || null })}
                          placeholder="Buscar sucursal..."
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'frecuencias' && (
                <>
                  {/* Statistics Cards */}
                  <div className="flex overflow-x-auto gap-4 pb-4 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:pb-0">
                    <Card className="min-w-[200px] md:min-w-0 border border-gray-200 shadow-sm">
                      <CardContent className="p-4 md:p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs md:text-sm font-medium text-gray-600">Total con Frecuencia</p>
                            <p className="text-2xl md:text-3xl font-bold text-gray-900">{stats.totalWithFrequency}</p>
                          </div>
                          <Package className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="min-w-[200px] md:min-w-0 border border-gray-200 shadow-sm">
                      <CardContent className="p-4 md:p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs md:text-sm font-medium text-gray-600">Con Pedidos</p>
                            <p className="text-2xl md:text-3xl font-bold text-green-600">{stats.withOrders}</p>
                          </div>
                          <CheckCircle2 className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="min-w-[200px] md:min-w-0 border border-gray-200 shadow-sm">
                      <CardContent className="p-4 md:p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs md:text-sm font-medium text-gray-600">Sin Pedidos</p>
                            <p className="text-2xl md:text-3xl font-bold text-red-600">{stats.withoutOrders}</p>
                          </div>
                          <AlertCircle className="h-6 w-6 md:h-8 md:w-8 text-red-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="min-w-[200px] md:min-w-0 border border-gray-200 shadow-sm">
                      <CardContent className="p-4 md:p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs md:text-sm font-medium text-gray-600">Cobertura</p>
                            <p className="text-2xl md:text-3xl font-bold text-purple-600">{stats.coverage}%</p>
                          </div>
                          <BarChart3 className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Client List */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Clientes con Frecuencia - {dayNames[selectedDayOfWeek]}
                        {stats.totalWithFrequency > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {stats.totalWithFrequency} cliente{stats.totalWithFrequency !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {stats.totalWithFrequency === 0 ? (
                        <div className="text-center py-12">
                          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No hay clientes con frecuencia
                          </h3>
                          <p className="text-gray-600">
                            No hay clientes configurados con frecuencia para {dayNames[selectedDayOfWeek].toLowerCase()}.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {frequenciesData.map((frequency) => {
                            const hasOrders = branchHasOrders(frequency.branch_id)

                            return (
                              <div
                                key={frequency.frequency_id}
                                className={`
                                  flex items-center justify-between p-4 rounded-lg border transition-colors
                                  ${hasOrders
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-gray-50 border-gray-200'
                                  }
                                `}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`
                                    w-3 h-3 rounded-full
                                    ${hasOrders ? 'bg-green-500' : 'bg-gray-400'}
                                  `} />

                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {frequency.client_name}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {frequency.branch_name}
                                    </p>
                                    {frequency.notes && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        {frequency.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <Badge
                                  variant={hasOrders ? "default" : "secondary"}
                                  className={
                                    hasOrders
                                      ? "bg-green-100 text-green-800 hover:bg-green-200"
                                      : "bg-gray-100 text-gray-600"
                                  }
                                >
                                  {hasOrders ? (
                                    <>
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Con Pedidos
                                    </>
                                  ) : (
                                    <>
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Sin Pedidos
                                    </>
                                  )}
                                </Badge>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {activeTab === 'control-clientes' && (
                <>
                  {/* Metrics Section for Control de Clientes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Card className="border border-gray-200 shadow-sm">
                      <CardContent className="p-4 md:p-6">
                        <div className="space-y-2">
                          <p className="text-xs md:text-sm font-medium text-gray-600">Pedidos Totales</p>
                          <div className="flex items-end justify-between">
                            <p className="text-2xl md:text-3xl font-bold text-gray-900">{filteredOrders?.length || 0}</p>
                            <Package className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200 shadow-sm">
                      <CardContent className="p-4 md:p-6">
                        <div className="space-y-2">
                          <p className="text-xs md:text-sm font-medium text-gray-600">Cantidad de Unidades</p>
                          <div className="flex items-end justify-between">
                            <p className="text-2xl md:text-3xl font-bold text-gray-900">{businessMetrics.totalUnits.toLocaleString('es-CO')}</p>
                            <ShoppingBag className="h-6 w-6 md:h-8 md:w-8 text-indigo-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200 shadow-sm">
                      <CardContent className="p-4 md:p-6">
                        <div className="space-y-2">
                          <p className="text-xs md:text-sm font-medium text-gray-600">vs. Día Anterior</p>
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-2xl md:text-3xl font-bold text-gray-900">
                                {trendMetrics.dayTrend.changePercent}%
                              </p>
                            </div>
                            <TrendIndicator trend={trendMetrics.dayTrend} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200 shadow-sm">
                      <CardContent className="p-4 md:p-6">
                        <div className="space-y-2">
                          <p className="text-xs md:text-sm font-medium text-gray-600">vs. Semana Anterior</p>
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-2xl md:text-3xl font-bold text-gray-900">
                                {trendMetrics.weekTrend.changePercent}%
                              </p>
                            </div>
                            <TrendIndicator trend={trendMetrics.weekTrend} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200 shadow-sm">
                      <CardContent className="p-4 md:p-6">
                        <div className="space-y-2">
                          <p className="text-xs md:text-sm font-medium text-gray-600">vs. Mes Anterior</p>
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-2xl md:text-3xl font-bold text-gray-900">
                                {trendMetrics.monthTrend.changePercent}%
                              </p>
                            </div>
                            <TrendIndicator trend={trendMetrics.monthTrend} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Business Metrics Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Card className="border border-gray-200 shadow-sm">
                      <CardContent className="p-4 md:p-6">
                        <div className="space-y-2">
                          <p className="text-xs md:text-sm font-medium text-gray-600">Total Valor</p>
                          <div className="flex items-end justify-between">
                            <p className="text-2xl md:text-3xl font-bold text-gray-900">{formatCurrencyInMillions(businessMetrics.totalValue)}</p>
                            <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200 shadow-sm">
                      <CardContent className="p-4 md:p-6">
                        <div className="space-y-2">
                          <p className="text-xs md:text-sm font-medium text-gray-600">Ticket Promedio</p>
                          <div className="flex items-end justify-between">
                            <p className="text-2xl md:text-3xl font-bold text-gray-900">{formatTicketPromedio(businessMetrics.averageTicket)}</p>
                            <Receipt className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200 shadow-sm">
                      <CardContent className="p-4 md:p-6">
                        <div className="space-y-2">
                          <p className="text-xs md:text-sm font-medium text-gray-600">Cantidad de Clientes</p>
                          <div className="flex items-end justify-between">
                            <p className="text-2xl md:text-3xl font-bold text-gray-900">{businessMetrics.uniqueClients}</p>
                            <Users className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200 shadow-sm">
                      <CardContent className="p-4 md:p-6">
                        <div className="space-y-2">
                          <p className="text-xs md:text-sm font-medium text-gray-600">% Pedidos Entregados</p>
                          <div className="flex items-end justify-between">
                            <p className="text-2xl md:text-3xl font-bold text-gray-900">{businessMetrics.deliveredPercentage.toFixed(1)}%</p>
                            <CheckCircle2 className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200 shadow-sm">
                      <CardContent className="p-4 md:p-6">
                        <div className="space-y-2">
                          <p className="text-xs md:text-sm font-medium text-gray-600">In Full</p>
                          <div className="flex items-end justify-between">
                            <p className="text-2xl md:text-3xl font-bold text-gray-900">{businessMetrics.inFull.toFixed(1)}%</p>
                            <Target className="h-6 w-6 md:h-8 md:w-8 text-orange-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Control de Clientes Tab Content */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        👥 Control de Clientes
                        {sortedTableData && sortedTableData.length > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {sortedTableData.length} pedido{sortedTableData.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!sortedTableData || sortedTableData.length === 0 ? (
                        <div className="text-center py-12">
                          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No hay clientes que coincidan con los filtros
                          </h3>
                          <p className="text-gray-600">
                            Intenta ajustar los filtros para ver más resultados.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b-2 border-gray-200">
                                <th
                                  className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                                  onClick={() => handleSort('orderNumber')}
                                >
                                  <div className="flex items-center gap-2">
                                    Nº Pedido
                                    {getSortIcon('orderNumber')}
                                  </div>
                                </th>
                                <th
                                  className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                                  onClick={() => handleSort('clientName')}
                                >
                                  <div className="flex items-center gap-2">
                                    Cliente
                                    {getSortIcon('clientName')}
                                  </div>
                                </th>
                                <th
                                  className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                                  onClick={() => handleSort('totalValue')}
                                >
                                  <div className="flex items-center gap-2">
                                    Valor Pedido
                                    {getSortIcon('totalValue')}
                                  </div>
                                </th>
                                <th
                                  className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                                  onClick={() => handleSort('deliveryDate')}
                                >
                                  <div className="flex items-center gap-2">
                                    Fecha Entrega
                                    {getSortIcon('deliveryDate')}
                                  </div>
                                </th>
                                <th
                                  className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                                  onClick={() => handleSort('status')}
                                >
                                  <div className="flex items-center gap-2">
                                    Estado
                                    {getSortIcon('status')}
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedTableData.map((row) => (
                                <tr
                                  key={row.orderId}
                                  className="border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer"
                                  onClick={() => handleRowClick(row.orderId)}
                                >
                                  <td className="py-3 px-4 font-mono text-gray-900">{row.orderNumber}</td>
                                  <td className="py-3 px-4 font-medium text-gray-900">{row.clientName}</td>
                                  <td className="py-3 px-4 text-gray-900 font-semibold">{formatCurrency(row.totalValue)}</td>
                                  <td className="py-3 px-4 text-gray-600">
                                    {row.deliveryDate
                                      ? new Date(row.deliveryDate + 'T00:00:00').toLocaleDateString('es-CO', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric'
                                        })
                                      : 'N/A'
                                    }
                                  </td>
                                  <td className="py-3 px-4">
                                    {getStatusBadge(row.status)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

            </div>
          </main>
        </div>
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </RouteGuard>
  )
}
