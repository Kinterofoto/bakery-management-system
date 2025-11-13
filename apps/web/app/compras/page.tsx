"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RouteGuard } from "@/components/auth/RouteGuard"
import {
  Settings,
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  Calculator,
  ClipboardList,
  ArrowRight,
  AlertCircle
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useSuppliers } from "@/hooks/use-suppliers"
import { usePurchaseOrders } from "@/hooks/use-purchase-orders"

export default function ComprasPage() {
  const router = useRouter()
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

  return (
    <RouteGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Módulo de Compras</h1>
              <p className="text-base text-gray-600 dark:text-gray-400 mt-1">
                Gestiona proveedores, materiales y órdenes de compra
              </p>
            </div>
          </div>

          {/* Stats Cards - Liquid Glass */}
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
                  <ClipboardList className="w-6 h-6 text-orange-500" />
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

          {/* Main Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Parametrization Card */}
            <div className="
              bg-white/70 dark:bg-black/50
              backdrop-blur-xl
              border border-white/20 dark:border-white/10
              rounded-2xl
              shadow-lg shadow-black/5
              overflow-hidden
              hover:shadow-xl hover:shadow-black/10
              transition-all duration-200
              cursor-pointer
              group
            "
              onClick={() => router.push('/compras/parametrizacion')}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-blue-500/15 backdrop-blur-md border border-blue-500/20 rounded-xl p-3">
                    <Settings className="w-6 h-6 text-blue-500" />
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">
                    Configuración
                  </Badge>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Parametrización
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Gestiona materiales, proveedores y asignaciones de precios
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></div>
                    Materiales y Materias Primas
                  </div>
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></div>
                    Proveedores y Contactos
                  </div>
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></div>
                    Asignación de Precios
                  </div>
                </div>

                <Button
                  variant="ghost"
                  className="w-full justify-between group-hover:bg-blue-500/10 transition-colors"
                >
                  Configurar
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>

            {/* Material Explosion Card */}
            <div className="
              bg-white/70 dark:bg-black/50
              backdrop-blur-xl
              border border-white/20 dark:border-white/10
              rounded-2xl
              shadow-lg shadow-black/5
              overflow-hidden
              hover:shadow-xl hover:shadow-black/10
              transition-all duration-200
              cursor-pointer
              group
            "
              onClick={() => router.push('/compras/explosion')}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-purple-500/15 backdrop-blur-md border border-purple-500/20 rounded-xl p-3">
                    <Calculator className="w-6 h-6 text-purple-500" />
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">
                    Cálculo
                  </Badge>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Explosión de Materiales
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Calcula necesidades de materia prima basado en el BOM
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-2"></div>
                    Cálculo Automático desde BOM
                  </div>
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-2"></div>
                    Sugerencia de Proveedores
                  </div>
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-2"></div>
                    Ajuste a Unidades de Embalaje
                  </div>
                </div>

                <Button
                  variant="ghost"
                  className="w-full justify-between group-hover:bg-purple-500/10 transition-colors"
                >
                  Calcular
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>

            {/* Purchase Orders Card */}
            <div className="
              bg-white/70 dark:bg-black/50
              backdrop-blur-xl
              border border-white/20 dark:border-white/10
              rounded-2xl
              shadow-lg shadow-black/5
              overflow-hidden
              hover:shadow-xl hover:shadow-black/10
              transition-all duration-200
              cursor-pointer
              group
            "
              onClick={() => router.push('/compras/ordenes')}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-green-500/15 backdrop-blur-md border border-green-500/20 rounded-xl p-3">
                    <Package className="w-6 h-6 text-green-500" />
                  </div>
                  <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                    Órdenes
                  </Badge>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Órdenes de Compra
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Crea y gestiona órdenes de compra con seguimiento
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></div>
                    Crear Órdenes por Proveedor
                  </div>
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></div>
                    Seguimiento de Estado
                  </div>
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></div>
                    Registro de Recepción
                  </div>
                </div>

                <Button
                  variant="ghost"
                  className="w-full justify-between group-hover:bg-green-500/10 transition-colors"
                >
                  Ver Órdenes
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </RouteGuard>
  )
}
