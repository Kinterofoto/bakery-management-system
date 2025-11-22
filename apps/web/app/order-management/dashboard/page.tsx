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
  TrendingDown
} from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { useClientFrequencies } from "@/hooks/use-client-frequencies"
import { useOrders } from "@/hooks/use-orders"
import { useClients } from "@/hooks/use-clients"
import { getCurrentLocalDate, toLocalISODate } from "@/lib/timezone-utils"

// Filter state type
interface DashboardFilters {
  clients: string[]
  products: string[]
  dateRange: {
    from: Date | null
    to: Date | null
    preset: 'hoy' | 'semana' | 'mes' | 'estemes' | null
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

  const { getFrequenciesForDay } = useClientFrequencies()
  const { orders, loading: ordersLoading } = useOrders()
  const { clients, loading: clientsLoading } = useClients()

  const [frequenciesData, setFrequenciesData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  // Calculate trend metrics (mock data for now)
  const trendMetrics = useMemo(() => {
    const totalOrders = orders?.length || 0

    return {
      totalOrders: {
        value: totalOrders,
        change: Math.floor(Math.random() * 20 - 10),
        changePercent: Math.floor(Math.random() * 20 - 10),
        comparison: 'day'
      },
      dayTrend: {
        value: totalOrders,
        change: Math.floor(Math.random() * 15 - 5),
        changePercent: 12,
        comparison: 'day'
      },
      weekTrend: {
        value: totalOrders,
        change: Math.floor(Math.random() * 25 - 10),
        changePercent: 8,
        comparison: 'week'
      },
      monthTrend: {
        value: totalOrders,
        change: Math.floor(Math.random() * 30 - 15),
        changePercent: -5,
        comparison: 'month'
      },
      yearTrend: {
        value: totalOrders,
        change: Math.floor(Math.random() * 50 - 20),
        changePercent: 25,
        comparison: 'year'
      }
    }
  }, [orders])

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

  if (loading || ordersLoading || clientsLoading) {
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
                    <h1 className="text-3xl font-bold text-gray-900">
                      Dashboard
                    </h1>

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

                  {/* Date Navigation */}
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
                </div>

                {/* Subtitle */}
                <p className="text-gray-600 -mt-4">
                  Control de clientes con frecuencia y cobertura de pedidos
                </p>
              </div>

              {/* Advanced Filters Section - Only for Control de Clientes */}
              {activeTab === 'control-clientes' && (
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Filtros Avanzados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Clientes Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Clientes</label>
                        <div className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-600">
                          {filters.clients.length === 0 ? 'Todos los clientes' : `${filters.clients.length} seleccionados`}
                        </div>
                      </div>

                      {/* Productos Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Productos</label>
                        <div className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-600">
                          {filters.products.length === 0 ? 'Todos los productos' : `${filters.products.length} seleccionados`}
                        </div>
                      </div>

                      {/* Fechas Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Fechas</label>
                        <div className="flex gap-2">
                          <button className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">Hoy</button>
                          <button className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">Semana</button>
                          <button className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">Mes</button>
                        </div>
                      </div>

                      {/* Vendedor Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Vendedor Asignado</label>
                        <div className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-600">
                          {filters.sellers.length === 0 ? 'Todos los vendedores' : `${filters.sellers.length} seleccionados`}
                        </div>
                      </div>

                      {/* Estado Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Estado</label>
                        <div className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-600">
                          {filters.status.length === 0 ? 'Todos los estados' : `${filters.status.length} seleccionados`}
                        </div>
                      </div>

                      {/* Sucursal Filter (Dynamic) */}
                      {filters.clients.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Sucursal</label>
                          <div className="px-3 py-2 border border-gray-300 rounded-lg bg-blue-50 text-sm text-blue-600">
                            Filtro dinámico activo
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'frecuencias' && (
                <>
                  {/* Metrics Section for Frequencies */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Card className="border border-gray-200 shadow-sm">
                      <CardContent className="p-4 md:p-6">
                        <div className="space-y-2">
                          <p className="text-xs md:text-sm font-medium text-gray-600">Pedidos Totales</p>
                          <div className="flex items-end justify-between">
                            <p className="text-2xl md:text-3xl font-bold text-gray-900">{stats.totalWithFrequency}</p>
                            <Package className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
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

                    <Card className="border border-gray-200 shadow-sm">
                      <CardContent className="p-4 md:p-6">
                        <div className="space-y-2">
                          <p className="text-xs md:text-sm font-medium text-gray-600">vs. Año Anterior</p>
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-2xl md:text-3xl font-bold text-gray-900">
                                {trendMetrics.yearTrend.changePercent}%
                              </p>
                            </div>
                            <TrendIndicator trend={trendMetrics.yearTrend} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

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
                  {/* Control de Clientes Tab Content */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        👥 Control de Clientes
                        {clients && clients.length > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {clients.length} cliente{clients.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!clients || clients.length === 0 ? (
                        <div className="text-center py-12">
                          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No hay clientes registrados
                          </h3>
                          <p className="text-gray-600">
                            Comienza agregando clientes al sistema.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Cliente</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Contacto</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Total Pedidos</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Última Compra</th>
                              </tr>
                            </thead>
                            <tbody>
                              {clients.map((client) => {
                                const clientOrders = orders?.filter(o => o.client_id === client.id) || []
                                return (
                                  <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-4 font-medium text-gray-900">{client.name}</td>
                                    <td className="py-3 px-4 text-gray-600">{client.email || 'N/A'}</td>
                                    <td className="py-3 px-4 text-gray-600">{clientOrders.length}</td>
                                    <td className="py-3 px-4 text-gray-600">
                                      {clientOrders.length > 0 && clientOrders[0].created_at
                                        ? new Date(clientOrders[0].created_at).toLocaleDateString('es-CO')
                                        : 'N/A'
                                      }
                                    </td>
                                  </tr>
                                )
                              })}
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
    </RouteGuard>
  )
}
