"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, ClipboardCheck, Truck, Route, AlertTriangle, TrendingUp, Clock, CheckCircle } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"

export default function Dashboard() {
  const stats = [
    {
      title: "Pedidos Activos",
      value: "24",
      change: "+12%",
      icon: Package,
      color: "text-blue-600",
    },
    {
      title: "En Revisión",
      value: "8",
      change: "-5%",
      icon: ClipboardCheck,
      color: "text-yellow-600",
    },
    {
      title: "Listos para Despacho",
      value: "6",
      change: "+8%",
      icon: Truck,
      color: "text-green-600",
    },
    {
      title: "En Ruta",
      value: "12",
      change: "+15%",
      icon: Route,
      color: "text-purple-600",
    },
  ]

  const recentOrders = [
    {
      id: "ORD-2025-001",
      client: "Supermercado Central",
      status: "received",
      deliveryDate: "2025-07-16",
      total: "$450,000",
    },
    {
      id: "ORD-2025-002",
      client: "Panadería El Trigo",
      status: "review_area1",
      deliveryDate: "2025-07-17",
      total: "$320,000",
    },
    {
      id: "ORD-2025-003",
      client: "Distribuidora Norte",
      status: "review_area2",
      deliveryDate: "2025-07-18",
      total: "$680,000",
    },
  ]

  const alerts = [
    {
      type: "warning",
      message: "3 pedidos con retraso en entrega",
      time: "Hace 2 horas",
    },
    {
      type: "error",
      message: "Faltante crítico: Pan Integral",
      time: "Hace 30 min",
    },
    {
      type: "info",
      message: "Nueva ruta asignada a Pedro Martínez",
      time: "Hace 1 hora",
    },
  ]

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      received: { label: "Recibido", variant: "secondary" as const },
      review_area1: { label: "Revisión 1", variant: "default" as const },
      review_area2: { label: "Revisión 2", variant: "default" as const },
      ready_dispatch: { label: "Listo", variant: "outline" as const },
      dispatched: { label: "Despachado", variant: "default" as const },
      in_delivery: { label: "En Entrega", variant: "default" as const },
      delivered: { label: "Entregado", variant: "default" as const },
    }

    return statusConfig[status as keyof typeof statusConfig] || { label: status, variant: "secondary" as const }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Resumen general del sistema de gestión</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                        <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                        <p className={`text-sm ${stat.change.startsWith("+") ? "text-green-600" : "text-red-600"}`}>
                          {stat.change} vs mes anterior
                        </p>
                      </div>
                      <div className={`p-3 rounded-full bg-gray-100 ${stat.color}`}>
                        <stat.icon className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Orders */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Pedidos Recientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold">{order.id}</span>
                            <Badge variant={getStatusBadge(order.status).variant}>
                              {getStatusBadge(order.status).label}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{order.client}</p>
                          <p className="text-xs text-gray-500">Entrega: {order.deliveryDate}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{order.total}</p>
                          <Button variant="outline" size="sm" className="mt-2 bg-transparent">
                            Ver Detalles
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Alertas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {alerts.map((alert, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div
                          className={`p-1 rounded-full ${
                            alert.type === "error"
                              ? "bg-red-100 text-red-600"
                              : alert.type === "warning"
                                ? "bg-yellow-100 text-yellow-600"
                                : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {alert.type === "error" ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : alert.type === "warning" ? (
                            <Clock className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{alert.message}</p>
                          <p className="text-xs text-gray-500">{alert.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button className="h-20 flex flex-col gap-2">
                    <Package className="h-6 w-6" />
                    Nuevo Pedido
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2 bg-transparent">
                    <Route className="h-6 w-6" />
                    Crear Ruta
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2 bg-transparent">
                    <ClipboardCheck className="h-6 w-6" />
                    Revisar Pedidos
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2 bg-transparent">
                    <TrendingUp className="h-6 w-6" />
                    Ver Reportes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
