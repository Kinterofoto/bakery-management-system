"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { RouteGuard } from "@/components/auth/RouteGuard"
import {
  Package,
  Plus,
  Search,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  TrendingUp
} from "lucide-react"
import { useRouter } from "next/navigation"
import { usePurchaseOrders } from "@/hooks/use-purchase-orders"
import { PurchaseOrderDialog } from "@/components/compras/PurchaseOrderDialog"
import { PurchaseOrderDetailsDialog } from "@/components/compras/PurchaseOrderDetailsDialog"

type TabType = "all" | "pending" | "ordered" | "received" | "overdue"

const STATUS_CONFIG = {
  pending: {
    label: "Pendiente",
    color: "bg-orange-500/20 text-orange-600 border-orange-500/30",
    icon: Clock
  },
  ordered: {
    label: "Ordenado",
    color: "bg-blue-500/20 text-blue-600 border-blue-500/30",
    icon: Package
  },
  partially_received: {
    label: "Recibido Parcial",
    color: "bg-purple-500/20 text-purple-600 border-purple-500/30",
    icon: TrendingUp
  },
  received: {
    label: "Recibido",
    color: "bg-green-500/20 text-green-600 border-green-500/30",
    icon: CheckCircle2
  },
  cancelled: {
    label: "Cancelado",
    color: "bg-red-500/20 text-red-600 border-red-500/30",
    icon: XCircle
  }
}

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const {
    purchaseOrders,
    loading,
    getPurchaseOrdersByStatus,
    getOverdueOrders,
    getPurchaseOrderStats,
    searchPurchaseOrders,
    getOrderCompletion
  } = usePurchaseOrders()

  const [activeTab, setActiveTab] = useState<TabType>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const stats = getPurchaseOrderStats()
  const overdueOrders = getOverdueOrders()

  // Filter orders based on active tab
  const getFilteredOrders = () => {
    let filtered = purchaseOrders

    switch (activeTab) {
      case "pending":
        filtered = getPurchaseOrdersByStatus("pending")
        break
      case "ordered":
        filtered = getPurchaseOrdersByStatus("ordered")
        break
      case "received":
        filtered = getPurchaseOrdersByStatus("received")
        break
      case "overdue":
        filtered = overdueOrders
        break
      default:
        filtered = purchaseOrders
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = searchPurchaseOrders(searchQuery)
    }

    return filtered
  }

  const filteredOrders = getFilteredOrders()

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
    const Icon = config.icon

    return (
      <Badge className={`${config.color} backdrop-blur-md border flex items-center gap-1.5`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isOverdue = (order: any) => {
    if (!order.expected_delivery_date || order.status === 'received' || order.status === 'cancelled') {
      return false
    }
    const today = new Date().toISOString().split('T')[0]
    return order.expected_delivery_date < today
  }

  if (loading) {
    return (
      <RouteGuard>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
        </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/compras')}
                className="
                  bg-white/20 dark:bg-black/20
                  backdrop-blur-md
                  border border-white/30 dark:border-white/20
                  rounded-xl
                  hover:bg-white/30 dark:hover:bg-black/30
                "
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
                  Órdenes de Compra
                </h1>
                <p className="text-base text-gray-600 dark:text-gray-400 mt-1">
                  Gestiona y rastrea órdenes de compra
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="
                bg-green-500
                text-white
                font-semibold
                px-6
                rounded-xl
                shadow-md shadow-green-500/30
                hover:bg-green-600
                hover:shadow-lg hover:shadow-green-500/40
                active:scale-95
                transition-all duration-150
              "
            >
              <Plus className="w-5 h-5 mr-2" />
              Nueva Orden
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="
              bg-white/70 dark:bg-black/50
              backdrop-blur-xl
              border border-white/20 dark:border-white/10
              rounded-2xl
              shadow-lg shadow-black/5
              p-6
            ">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Órdenes Totales</p>
                  <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">
                    {stats.totalOrders}
                  </p>
                </div>
                <div className="bg-green-500/15 backdrop-blur-md border border-green-500/20 rounded-xl p-3">
                  <Package className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </div>

            <div className="
              bg-white/70 dark:bg-black/50
              backdrop-blur-xl
              border border-white/20 dark:border-white/10
              rounded-2xl
              shadow-lg shadow-black/5
              p-6
            ">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pendientes</p>
                  <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">
                    {stats.pendingOrders + stats.orderedOrders}
                  </p>
                </div>
                <div className="bg-orange-500/15 backdrop-blur-md border border-orange-500/20 rounded-xl p-3">
                  <Clock className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </div>

            <div className="
              bg-white/70 dark:bg-black/50
              backdrop-blur-xl
              border border-white/20 dark:border-white/10
              rounded-2xl
              shadow-lg shadow-black/5
              p-6
            ">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Recibidas</p>
                  <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">
                    {stats.receivedOrders}
                  </p>
                </div>
                <div className="bg-blue-500/15 backdrop-blur-md border border-blue-500/20 rounded-xl p-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </div>

            <div className="
              bg-white/70 dark:bg-black/50
              backdrop-blur-xl
              border border-white/20 dark:border-white/10
              rounded-2xl
              shadow-lg shadow-black/5
              p-6
            ">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Valor Pendiente</p>
                  <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">
                    ${stats.pendingValue.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="bg-purple-500/15 backdrop-blur-md border border-purple-500/20 rounded-xl p-3">
                  <TrendingUp className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Overdue Alert */}
          {overdueOrders.length > 0 && (
            <div className="
              bg-red-500/10 dark:bg-red-500/20
              backdrop-blur-xl
              border border-red-500/30
              rounded-2xl
              p-4
            ">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {overdueOrders.length} {overdueOrders.length === 1 ? 'orden vencida' : 'órdenes vencidas'}
                  </p>
                  <p className="text-xs text-red-500 dark:text-red-300">
                    Revisa las órdenes que han pasado su fecha de entrega esperada
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filters and Search */}
          <div className="
            bg-white/70 dark:bg-black/50
            backdrop-blur-xl
            border border-white/20 dark:border-white/10
            rounded-2xl
            shadow-lg shadow-black/5
            p-6
          ">
            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant={activeTab === "all" ? "default" : "ghost"}
                onClick={() => setActiveTab("all")}
                className={activeTab === "all" ?
                  "bg-green-500 text-white rounded-xl" :
                  "bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/30 dark:border-white/20 rounded-xl hover:bg-white/30 dark:hover:bg-black/30"
                }
              >
                Todas ({purchaseOrders.length})
              </Button>
              <Button
                variant={activeTab === "pending" ? "default" : "ghost"}
                onClick={() => setActiveTab("pending")}
                className={activeTab === "pending" ?
                  "bg-green-500 text-white rounded-xl" :
                  "bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/30 dark:border-white/20 rounded-xl hover:bg-white/30 dark:hover:bg-black/30"
                }
              >
                Pendientes ({stats.pendingOrders})
              </Button>
              <Button
                variant={activeTab === "ordered" ? "default" : "ghost"}
                onClick={() => setActiveTab("ordered")}
                className={activeTab === "ordered" ?
                  "bg-green-500 text-white rounded-xl" :
                  "bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/30 dark:border-white/20 rounded-xl hover:bg-white/30 dark:hover:bg-black/30"
                }
              >
                Ordenadas ({stats.orderedOrders})
              </Button>
              <Button
                variant={activeTab === "received" ? "default" : "ghost"}
                onClick={() => setActiveTab("received")}
                className={activeTab === "received" ?
                  "bg-green-500 text-white rounded-xl" :
                  "bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/30 dark:border-white/20 rounded-xl hover:bg-white/30 dark:hover:bg-black/30"
                }
              >
                Recibidas ({stats.receivedOrders})
              </Button>
              {overdueOrders.length > 0 && (
                <Button
                  variant={activeTab === "overdue" ? "default" : "ghost"}
                  onClick={() => setActiveTab("overdue")}
                  className={activeTab === "overdue" ?
                    "bg-green-500 text-white rounded-xl" :
                    "bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/30 dark:border-white/20 rounded-xl hover:bg-white/30 dark:hover:bg-black/30"
                  }
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Vencidas ({overdueOrders.length})
                </Button>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por número, proveedor o notas..."
                className="
                  pl-10
                  bg-white/50 dark:bg-black/30
                  backdrop-blur-md
                  border-gray-200/50 dark:border-white/10
                  rounded-xl
                  focus:ring-2 focus:ring-green-500/50
                  focus:border-green-500/50
                "
              />
            </div>
          </div>

          {/* Orders List */}
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="
                bg-white/70 dark:bg-black/50
                backdrop-blur-xl
                border border-white/20 dark:border-white/10
                rounded-2xl
                shadow-lg shadow-black/5
                p-12
                text-center
              ">
                <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  No hay órdenes de compra
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {searchQuery ? 'No se encontraron resultados para tu búsqueda' : 'Crea tu primera orden de compra'}
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="
                    bg-white/70 dark:bg-black/50
                    backdrop-blur-xl
                    border border-white/20 dark:border-white/10
                    rounded-2xl
                    shadow-lg shadow-black/5
                    p-6
                    hover:shadow-xl hover:shadow-black/10
                    transition-all duration-200
                  "
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="bg-green-500/15 backdrop-blur-md border border-green-500/20 rounded-xl p-3">
                          <Package className="w-6 h-6 text-green-500" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {order.order_number}
                            </h3>
                            {getStatusBadge(order.status)}
                            {isOverdue(order) && (
                              <Badge className="bg-red-500/20 text-red-600 border-red-500/30 backdrop-blur-md border flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Vencida
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Proveedor:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {order.supplier?.company_name || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Fecha Orden:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {formatDate(order.order_date)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Entrega Esperada:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {formatDate(order.expected_delivery_date)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Total:</span>
                              <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
                                ${order.total_amount?.toLocaleString('es-CO', { maximumFractionDigits: 0 }) || '0'}
                              </span>
                            </div>
                          </div>
                          {order.items && order.items.length > 0 && (
                            <div className="mt-3">
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <span>{order.items.length} {order.items.length === 1 ? 'material' : 'materiales'}</span>
                                <span>•</span>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-200/50 dark:bg-gray-700/50 rounded-full h-2">
                                      <div
                                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${getOrderCompletion(order)}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-medium">
                                      {getOrderCompletion(order).toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedOrderId(order.id)}
                        className="
                          bg-white/20 dark:bg-black/20
                          backdrop-blur-md
                          border border-white/30 dark:border-white/20
                          rounded-xl
                          hover:bg-white/30 dark:hover:bg-black/30
                        "
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalles
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>

      {/* Dialogs */}
      {showCreateDialog && (
        <PurchaseOrderDialog
          onClose={() => setShowCreateDialog(false)}
        />
      )}

      {selectedOrderId && (
        <PurchaseOrderDetailsDialog
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </RouteGuard>
  )
}
