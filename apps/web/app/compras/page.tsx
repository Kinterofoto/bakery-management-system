"use client"

import { RouteGuard } from "@/components/auth/RouteGuard"
import { VideoTutorialButton } from "@/components/shared/VideoTutorialButton"
import {
  TrendingUp,
  ShoppingCart,
  Users,
  AlertCircle,
  BarChart3,
  TrendingDown,
  ArrowLeft
} from "lucide-react"
import { useSuppliers } from "@/hooks/use-suppliers"
import { usePurchaseOrders } from "@/hooks/use-purchase-orders"
import Link from "next/link"

export default function ComprasDashboard() {
  const { suppliers, loading: loadingSuppliers } = useSuppliers()
  const { purchaseOrders, getPurchaseOrderStats, getOverdueOrders, loading: loadingOrders } = usePurchaseOrders()

  const stats = getPurchaseOrderStats()
  const overdueOrders = getOverdueOrders()
  const activeSuppliers = suppliers.filter(s => s.status === 'active')

  if (loadingSuppliers || loadingOrders) {
    return (
      <RouteGuard>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </RouteGuard>
    )
  }

  const completedOrders = purchaseOrders.filter(o => o.status === 'received').length
  const completionRate = purchaseOrders.length > 0 ? Math.round((completedOrders / purchaseOrders.length) * 100) : 0

  return (
    <RouteGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="p-4 md:p-6 lg:p-8 space-y-8">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Back Arrow */}
              <Link
                href="/dashboard"
                className="p-2 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-white" />
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">Dashboard de Compras</h1>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
                  Resumen de órdenes, proveedores y métricas principales
                </p>
              </div>
            </div>
            <VideoTutorialButton modulePath="/compras" />
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Orders Card */}
            <div className="
              bg-white/70 dark:bg-black/50
              backdrop-blur-xl
              border border-white/20 dark:border-white/10
              rounded-2xl
              shadow-lg shadow-black/5
              p-6
              hover:shadow-xl hover:shadow-black/10
              transition-all duration-200
            ">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Órdenes Totales</p>
                  <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">
                    {stats.totalOrders}
                  </p>
                </div>
                <div className="bg-blue-500/15 backdrop-blur-md border border-blue-500/20 rounded-xl p-3">
                  <ShoppingCart className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Pending Orders Card */}
            <div className="
              bg-white/70 dark:bg-black/50
              backdrop-blur-xl
              border border-white/20 dark:border-white/10
              rounded-2xl
              shadow-lg shadow-black/5
              p-6
              hover:shadow-xl hover:shadow-black/10
              transition-all duration-200
            ">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pendientes</p>
                  <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">
                    {stats.pendingOrders + stats.orderedOrders}
                  </p>
                </div>
                <div className="bg-orange-500/15 backdrop-blur-md border border-orange-500/20 rounded-xl p-3">
                  <TrendingDown className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </div>

            {/* Active Suppliers Card */}
            <div className="
              bg-white/70 dark:bg-black/50
              backdrop-blur-xl
              border border-white/20 dark:border-white/10
              rounded-2xl
              shadow-lg shadow-black/5
              p-6
              hover:shadow-xl hover:shadow-black/10
              transition-all duration-200
            ">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Proveedores Activos</p>
                  <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">
                    {activeSuppliers.length}
                  </p>
                </div>
                <div className="bg-green-500/15 backdrop-blur-md border border-green-500/20 rounded-xl p-3">
                  <Users className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </div>

            {/* Total Value Card */}
            <div className="
              bg-white/70 dark:bg-black/50
              backdrop-blur-xl
              border border-white/20 dark:border-white/10
              rounded-2xl
              shadow-lg shadow-black/5
              p-6
              hover:shadow-xl hover:shadow-black/10
              transition-all duration-200
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

          {/* Overdue Orders Alert */}
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

          {/* Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Order Status Distribution */}
            <div className="
              bg-white/70 dark:bg-black/50
              backdrop-blur-xl
              border border-white/20 dark:border-white/10
              rounded-2xl
              shadow-lg shadow-black/5
              p-6
            ">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-purple-500/15 backdrop-blur-md border border-purple-500/20 rounded-xl p-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Distribución de Órdenes</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Completadas</span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">{completedOrders}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${completionRate}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Pendientes</span>
                    <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                      {stats.pendingOrders + stats.orderedOrders}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full" 
                      style={{ 
                        width: `${purchaseOrders.length > 0 ? Math.round(((stats.pendingOrders + stats.orderedOrders) / purchaseOrders.length) * 100) : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Tasa de Finalización: <span className="font-semibold text-gray-900 dark:text-white">{completionRate}%</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="
              bg-white/70 dark:bg-black/50
              backdrop-blur-xl
              border border-white/20 dark:border-white/10
              rounded-2xl
              shadow-lg shadow-black/5
              p-6
            ">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-500/15 backdrop-blur-md border border-blue-500/20 rounded-xl p-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Métricas Principales</h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-white/5 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Órdenes Ordenadas</span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {stats.orderedOrders}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-white/5 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Órdenes Recibidas</span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {completedOrders}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-white/5 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total de Proveedores</span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {suppliers.length}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-white/5 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Proveedores Activos</span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {activeSuppliers.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </RouteGuard>
  )
}
