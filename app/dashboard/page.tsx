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
  BarChart3
} from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { useClientFrequencies } from "@/hooks/use-client-frequencies"
import { useOrders } from "@/hooks/use-orders"

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(
    // Default to tomorrow
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  )
  
  // Carousel state for mobile stats
  const [currentStatCard, setCurrentStatCard] = useState(0)
  
  const { getFrequenciesForDay } = useClientFrequencies()
  const { orders, loading: ordersLoading } = useOrders()
  
  const [frequenciesData, setFrequenciesData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Day names in Spanish
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
  const shortDayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

  // Get day of week for selected date (0 = Sunday)
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
  }, [selectedDayOfWeek]) // Remove getFrequenciesForDay to prevent infinite loop

  // Check if branch has orders for the selected date
  const branchHasOrders = (branchId: string) => {
    if (!orders || orders.length === 0) return false

    const dateStr = selectedDate.toISOString().split('T')[0]
    
    return orders.some(order => {
      try {
        // Check if order is for the selected branch and date
        const orderBranchId = order.branch?.id || order.client.id
        
        // Validate expected_delivery_date before creating Date object
        if (!order.expected_delivery_date) return false
        
        const deliveryDate = new Date(order.expected_delivery_date)
        
        // Check if date is valid
        if (isNaN(deliveryDate.getTime())) return false
        
        const orderDate = deliveryDate.toISOString().split('T')[0]
        
        // Consider active statuses (not delivered, cancelled, etc.)
        const activeStatuses = [
          'received', 
          'review_area1', 
          'review_area2', 
          'ready_dispatch', 
          'dispatched', 
          'in_delivery'
        ]
        
        return orderBranchId === branchId && 
               orderDate === dateStr && 
               activeStatuses.includes(order.status)
      } catch (error) {
        console.warn('Invalid date in order:', order.id, order.expected_delivery_date)
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

  // Navigate carousel
  const navigateCarousel = (direction: 'prev' | 'next') => {
    const statCards = 4 // Total number of stat cards
    if (direction === 'prev') {
      setCurrentStatCard(prev => prev === 0 ? statCards - 1 : prev - 1)
    } else {
      setCurrentStatCard(prev => prev === statCards - 1 ? 0 : prev + 1)
    }
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const totalWithFrequency = frequenciesData.length
    const withOrders = frequenciesData.filter(freq => branchHasOrders(freq.branch_id)).length
    const withoutOrders = totalWithFrequency - withOrders
    const coverage = totalWithFrequency > 0 ? Math.round((withOrders / totalWithFrequency) * 100) : 0

    return [
      {
        title: "Total con Frecuencia",
        value: totalWithFrequency.toString(),
        icon: Package,
        color: "text-blue-600",
        bgColor: "bg-blue-600"
      },
      {
        title: "Con Pedidos",
        value: withOrders.toString(),
        icon: CheckCircle2,
        color: "text-green-600",
        bgColor: "bg-green-600"
      },
      {
        title: "Sin Pedidos",
        value: withoutOrders.toString(),
        icon: AlertCircle,
        color: "text-red-600",
        bgColor: "bg-red-600"
      },
      {
        title: "Cobertura",
        value: `${coverage}%`,
        icon: BarChart3,
        color: "text-purple-600",
        bgColor: "bg-purple-600"
      }
    ]
  }, [frequenciesData, orders])

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

  if (loading || ordersLoading) {
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header with Date Navigation */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Dashboard de Frecuencias
                </h1>
                <p className="text-gray-600">
                  Control de clientes con frecuencia y cobertura de pedidos
                </p>
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

            {/* Selected Date Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDate(selectedDate)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Revisando frecuencias para {dayNames[selectedDayOfWeek].toLowerCase()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Cards - Desktop Grid */}
            <div className="hidden md:grid md:grid-cols-4 gap-4">
              {stats.map((stat, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                        <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                      </div>
                      <stat.icon className={`h-8 w-8 ${stat.color}`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Statistics Cards - Mobile Carousel */}
            <div className="md:hidden">
              <div className="relative">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => navigateCarousel('prev')}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      <div className="flex space-x-1">
                        {stats.map((_, index) => (
                          <div
                            key={index}
                            className={`h-2 w-2 rounded-full transition-colors ${
                              index === currentStatCard ? 'bg-blue-600' : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => navigateCarousel('next')}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          {stats[currentStatCard].title}
                        </p>
                        <p className={`text-4xl font-bold ${stats[currentStatCard].color}`}>
                          {stats[currentStatCard].value}
                        </p>
                      </div>
                      <div className={`p-3 rounded-full ${stats[currentStatCard].bgColor}`}>
                        <stats[currentStatCard].icon className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Client List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Clientes con Frecuencia - {dayNames[selectedDayOfWeek]}
                  {frequenciesData.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {frequenciesData.length} cliente{frequenciesData.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {frequenciesData.length === 0 ? (
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
                            {/* Status Indicator */}
                            <div className={`
                              w-3 h-3 rounded-full
                              ${hasOrders ? 'bg-green-500' : 'bg-gray-400'}
                            `} />
                            
                            {/* Client Info */}
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

                          {/* Status Badge */}
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

          </div>
        </main>
      </div>
    </div>
  )
}