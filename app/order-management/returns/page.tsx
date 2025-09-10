"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/layout/sidebar"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { useReturns } from "@/hooks/use-returns"
import { useRoutes } from "@/hooks/use-routes"
import { useToast } from "@/hooks/use-toast"
import { 
  RotateCcw, 
  Route, 
  Package, 
  AlertTriangle, 
  Download, 
  FileText, 
  Calendar, 
  User, 
  CheckCircle, 
  Clock,
  History,
  TrendingDown,
  MapPin,
  ShoppingCart
} from "lucide-react"

export default function ReturnsPage() {
  const [selectedRoute, setSelectedRoute] = useState("all")
  
  const { routeGroupedReturns, acceptedReturns, loading, error, acceptReturn } = useReturns()
  const { routes } = useRoutes()
  const { toast } = useToast()
  
  const [acceptingReturn, setAcceptingReturn] = useState<string | null>(null)

  const handleAcceptReturn = async (routeId: string | null, productId: string) => {
    const key = `${routeId || 'no-route'}-${productId}`
    setAcceptingReturn(key)
    try {
      await acceptReturn(routeId, productId)
      toast({
        title: "Devolución aceptada",
        description: "La devolución ha sido procesada y movida al historial",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo procesar la devolución",
        variant: "destructive",
      })
    } finally {
      setAcceptingReturn(null)
    }
  }

  const getReturnReasonColor = (reason: string) => {
    if (reason?.includes("dañado") || reason?.includes("calidad")) return "text-red-600"
    if (reason?.includes("cerrado") || reason?.includes("no recibió")) return "text-yellow-600"
    if (reason?.includes("completa")) return "text-green-600"
    return "text-gray-600"
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
      accepted: { label: "Aceptada", color: "bg-green-100 text-green-800" },
      rejected: { label: "Rechazada", color: "bg-red-100 text-red-800" },
    }
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  }

  // Filtros para devoluciones pendientes
  const filteredPendingRoutes = routeGroupedReturns.filter(routeGroup => {
    const matchesRoute = selectedRoute === "all" || routeGroup.route_id === selectedRoute
    return matchesRoute
  })

  // Filtros para historial
  const filteredHistoryRoutes = acceptedReturns.filter(routeGroup => {
    const matchesRoute = selectedRoute === "all" || routeGroup.route_id === selectedRoute
    return matchesRoute
  })

  // Estadísticas pendientes
  const totalPendingValue = filteredPendingRoutes.reduce(
    (total, route) => total + route.total_value, 0
  )
  const totalPendingQuantity = filteredPendingRoutes.reduce(
    (total, route) => total + route.total_quantity, 0
  )
  const totalPendingProducts = filteredPendingRoutes.reduce(
    (total, route) => total + route.products.length, 0
  )
  const totalPendingRoutes = filteredPendingRoutes.length

  // Estadísticas historial
  const totalHistoryValue = filteredHistoryRoutes.reduce(
    (total, route) => total + route.total_value, 0
  )
  const totalHistoryQuantity = filteredHistoryRoutes.reduce(
    (total, route) => total + route.total_quantity, 0
  )

  return (
    <RouteGuard 
      requiredPermissions={['order_management_returns']} 
      requiredRoles={['administrator', 'coordinador_logistico', 'dispatcher']}
    >
      <div className="flex h-screen bg-gray-50">
        <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Devoluciones por Ruta</h1>
                <p className="text-gray-600">Gestión de devoluciones organizadas por ruta y producto</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
              </div>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Ruta</Label>
                    <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las rutas</SelectItem>
                        {routes.map((route) => (
                          <SelectItem key={route.id} value={route.id}>
                            {route.route_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Vista</Label>
                    <Select defaultValue="grouped">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grouped">Agrupado por Ruta</SelectItem>
                        <SelectItem value="detailed">Vista Detallada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="pending" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Devoluciones Pendientes ({totalPendingRoutes})
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Historial de Devoluciones ({filteredHistoryRoutes.length})
                </TabsTrigger>
              </TabsList>

              {/* TAB: DEVOLUCIONES PENDIENTES */}
              <TabsContent value="pending" className="space-y-6">
                {/* Summary Stats - Pendientes */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Rutas con Devoluciones</p>
                          <p className="text-3xl font-bold text-blue-600">{totalPendingRoutes}</p>
                        </div>
                        <Route className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Productos Afectados</p>
                          <p className="text-3xl font-bold text-purple-600">{totalPendingProducts}</p>
                        </div>
                        <Package className="h-8 w-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Items Devueltos</p>
                          <p className="text-3xl font-bold text-red-600">{totalPendingQuantity}</p>
                        </div>
                        <RotateCcw className="h-8 w-8 text-red-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Valor Total</p>
                          <p className="text-3xl font-bold text-yellow-600">${totalPendingValue.toLocaleString()}</p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-yellow-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Devoluciones Pendientes por Ruta */}
                <div className="space-y-6">
                  {filteredPendingRoutes.map((routeGroup) => (
                    <Card key={routeGroup.route_id || 'no-route'}>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <MapPin className="h-5 w-5 text-blue-600" />
                              {routeGroup.route_name}
                            </CardTitle>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Package className="h-4 w-4" />
                                {routeGroup.products.length} productos con devoluciones
                              </div>
                              <div className="flex items-center gap-1">
                                <RotateCcw className="h-4 w-4" />
                                {routeGroup.total_quantity} unidades devueltas
                              </div>
                              <div className="flex items-center gap-1">
                                <AlertTriangle className="h-4 w-4" />
                                ${routeGroup.total_value.toLocaleString()} valor total
                              </div>
                            </div>
                          </div>
                          <Badge className="bg-yellow-100 text-yellow-800">
                            Pendiente
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {routeGroup.products.map((product) => (
                            <div key={product.product_id} className="border rounded-lg p-4">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="font-semibold text-lg flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    {product.product_name}
                                  </h4>
                                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                    <span className="font-medium text-red-600">
                                      {product.total_quantity} unidades devueltas
                                    </span>
                                    <span className="font-medium text-yellow-600">
                                      ${product.total_value.toLocaleString()}
                                    </span>
                                    <span className="text-gray-500">
                                      {product.orders.length} pedidos afectados
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={getStatusBadge(product.status).color}>
                                    {getStatusBadge(product.status).label}
                                  </Badge>
                                  <Button 
                                    onClick={() => handleAcceptReturn(routeGroup.route_id, product.product_id)}
                                    disabled={acceptingReturn === `${routeGroup.route_id || 'no-route'}-${product.product_id}`}
                                    size="sm"
                                  >
                                    {acceptingReturn === `${routeGroup.route_id || 'no-route'}-${product.product_id}` ? (
                                      <Clock className="h-4 w-4 mr-2" />
                                    ) : (
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                    )}
                                    {acceptingReturn === `${routeGroup.route_id || 'no-route'}-${product.product_id}` 
                                      ? "Procesando..." 
                                      : "Aceptar"
                                    }
                                  </Button>
                                </div>
                              </div>

                              {/* Detalle por pedido */}
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Pedido</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Cantidad</TableHead>
                                    <TableHead>Motivo</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Valor</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {product.orders.map((order) => (
                                    <TableRow key={`${order.order_id}-${product.product_id}`}>
                                      <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                          <ShoppingCart className="h-4 w-4 text-gray-400" />
                                          {order.order_number}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <User className="h-4 w-4 text-gray-400" />
                                          {order.client_name}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <span className="text-red-600 font-semibold">
                                          {order.quantity_returned}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <span className={getReturnReasonColor(order.return_reason)}>
                                          {order.return_reason || "Sin motivo"}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4 text-gray-400" />
                                          {new Date(order.return_date).toLocaleDateString()}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <span className="text-red-600 font-semibold">
                                          ${order.value.toLocaleString()}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>

                              {/* Resumen del producto */}
                              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                  <div>
                                    <div className="text-xl font-bold text-red-600">
                                      {product.total_quantity}
                                    </div>
                                    <div className="text-xs text-gray-600">Total Devuelto</div>
                                  </div>
                                  <div>
                                    <div className="text-xl font-bold text-yellow-600">
                                      ${product.total_value.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-gray-600">Valor Total</div>
                                  </div>
                                  <div>
                                    <div className="text-xl font-bold text-blue-600">
                                      {product.orders.length}
                                    </div>
                                    <div className="text-xs text-gray-600">Pedidos</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* TAB: HISTORIAL DE DEVOLUCIONES */}
              <TabsContent value="history" className="space-y-6">
                {/* Summary Stats - Historial */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Rutas Procesadas</p>
                          <p className="text-3xl font-bold text-green-600">{filteredHistoryRoutes.length}</p>
                        </div>
                        <Route className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Productos Procesados</p>
                          <p className="text-3xl font-bold text-blue-600">
                            {filteredHistoryRoutes.reduce((total, route) => total + route.products.length, 0)}
                          </p>
                        </div>
                        <Package className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Items Procesados</p>
                          <p className="text-3xl font-bold text-green-600">{totalHistoryQuantity}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Valor Procesado</p>
                          <p className="text-3xl font-bold text-green-600">${totalHistoryValue.toLocaleString()}</p>
                        </div>
                        <TrendingDown className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Historial por Ruta */}
                <div className="space-y-6">
                  {filteredHistoryRoutes.map((routeGroup) => (
                    <Card key={routeGroup.route_id || 'no-route'}>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <MapPin className="h-5 w-5 text-green-600" />
                              {routeGroup.route_name}
                            </CardTitle>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Package className="h-4 w-4" />
                                {routeGroup.products.length} productos procesados
                              </div>
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                {routeGroup.total_quantity} unidades procesadas
                              </div>
                              <div className="flex items-center gap-1">
                                <TrendingDown className="h-4 w-4 text-green-600" />
                                ${routeGroup.total_value.toLocaleString()} procesado
                              </div>
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            Procesado
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {routeGroup.products.map((product) => (
                            <div key={product.product_id} className="border rounded-lg p-4 bg-green-50">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="font-semibold text-lg flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    {product.product_name}
                                  </h4>
                                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                    <span className="font-medium text-green-600">
                                      {product.total_quantity} unidades procesadas
                                    </span>
                                    <span className="font-medium text-green-600">
                                      ${product.total_value.toLocaleString()}
                                    </span>
                                    <span className="text-gray-500">
                                      {product.orders.length} pedidos
                                    </span>
                                  </div>
                                </div>
                                <Badge className="bg-green-100 text-green-800">
                                  ✓ Procesado
                                </Badge>
                              </div>

                              {/* Detalle por pedido en historial */}
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Pedido</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Cantidad</TableHead>
                                    <TableHead>Motivo</TableHead>
                                    <TableHead>Fecha Procesado</TableHead>
                                    <TableHead>Valor</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {product.orders.map((order) => (
                                    <TableRow key={`${order.order_id}-${product.product_id}`}>
                                      <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                          <ShoppingCart className="h-4 w-4 text-gray-400" />
                                          {order.order_number}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <User className="h-4 w-4 text-gray-400" />
                                          {order.client_name}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <span className="text-green-600 font-semibold">
                                          {order.quantity_returned}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <span className={getReturnReasonColor(order.return_reason)}>
                                          {order.return_reason || "Sin motivo"}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4 text-gray-400" />
                                          {new Date(order.return_date).toLocaleDateString()}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <span className="text-green-600 font-semibold">
                                          ${order.value.toLocaleString()}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {loading && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Cargando devoluciones...</h3>
                  <p className="text-gray-600">Organizando datos por ruta y producto.</p>
                </CardContent>
              </Card>
            )}

            {!loading && filteredPendingRoutes.length === 0 && filteredHistoryRoutes.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay devoluciones</h3>
                  <p className="text-gray-600">No se encontraron devoluciones para los filtros seleccionados.</p>
                </CardContent>
              </Card>
            )}

            {error && (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar datos</h3>
                  <p className="text-gray-600">{error}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
    </RouteGuard>
  )
}