"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/layout/sidebar"
import { useReturns } from "@/hooks/use-returns"
import { useRoutes } from "@/hooks/use-routes"
import { useToast } from "@/hooks/use-toast"
import { RotateCcw, Route, Package, AlertTriangle, Download, FileText, Eye, Calendar, User, CheckCircle, Clock } from "lucide-react"

export default function ReturnsPage() {
  const [selectedRoute, setSelectedRoute] = useState("all")
  const [selectedDate, setSelectedDate] = useState("2025-07-16")
  
  const { returns, consolidatedReturns, loading, error, acceptReturn } = useReturns()
  const { routes } = useRoutes()
  const { toast } = useToast()
  
  const [acceptingReturn, setAcceptingReturn] = useState<string | null>(null)

  const handleAcceptReturn = async (productId: string) => {
    setAcceptingReturn(productId)
    try {
      await acceptReturn(productId)
      toast({
        title: "Devolución aceptada",
        description: "La devolución ha sido procesada correctamente",
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

  // Usar datos reales de consolidated returns
  const getConsolidatedProductReturns = () => {
    if (loading || !consolidatedReturns) return []
    
    return consolidatedReturns.map(consolidated => ({
      productId: consolidated.product_id,
      productName: consolidated.product_name,
      totalQuantity: consolidated.total_quantity,
      status: consolidated.status,
      returns: consolidated.returns,
      totalValue: consolidated.returns.reduce((sum, ret) => 
        sum + (ret.quantity_returned * (ret.product?.price || 0)), 0
      ),
      routes: [...new Set(consolidated.returns.map(ret => ret.route?.id).filter(Boolean))],
    }))
  }

  const consolidatedProductReturns = getConsolidatedProductReturns()

  const getRouteStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: "Completada", color: "bg-green-100 text-green-800" },
      in_progress: { label: "En Progreso", color: "bg-yellow-100 text-yellow-800" },
      planned: { label: "Planificada", color: "bg-blue-100 text-blue-800" },
    }
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.planned
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

  const filteredProducts = consolidatedProductReturns.filter(product => {
    const matchesRoute = selectedRoute === "all" || product.routes.includes(selectedRoute)
    const matchesDate = product.returns.some(ret => 
      ret.return_date?.startsWith(selectedDate)
    )
    return matchesRoute && matchesDate
  })

  const totalReturnsValue = consolidatedProductReturns.reduce(
    (total, product) => total + product.totalValue,
    0,
  )

  const totalReturnsQuantity = consolidatedProductReturns.reduce(
    (total, product) => total + product.totalQuantity,
    0,
  )

  const totalProducts = consolidatedProductReturns.length
  const pendingProducts = consolidatedProductReturns.filter(p => p.status === "pending").length

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Devoluciones Consolidadas</h1>
                <p className="text-gray-600">Gestión de devoluciones organizadas por ruta</p>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Fecha</Label>
                    <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                  </div>
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
                    <Label>Estado</Label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="completed">Completadas</SelectItem>
                        <SelectItem value="in_progress">En Progreso</SelectItem>
                        <SelectItem value="planned">Planificadas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Productos</p>
                      <p className="text-3xl font-bold text-blue-600">{totalProducts}</p>
                    </div>
                    <Package className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Items Devueltos</p>
                      <p className="text-3xl font-bold text-red-600">{totalReturnsQuantity}</p>
                    </div>
                    <RotateCcw className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Valor Devoluciones</p>
                      <p className="text-3xl font-bold text-yellow-600">${totalReturnsValue.toLocaleString()}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pendientes</p>
                      <p className="text-3xl font-bold text-orange-600">{pendingProducts}</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Consolidated Returns by Product */}
            <div className="space-y-6">
              {filteredProducts.map((product) => (
                <Card key={product.productId}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          {product.productName}
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <RotateCcw className="h-4 w-4" />
                            {product.totalQuantity} unidades devueltas
                          </div>
                          <div className="flex items-center gap-1">
                            <Route className="h-4 w-4" />
                            {product.routes.length} rutas afectadas
                          </div>
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            ${product.totalValue.toLocaleString()} valor total
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusBadge(product.status).color}>
                          {getStatusBadge(product.status).label}
                        </Badge>
                        {product.status === "pending" && (
                          <Button 
                            onClick={() => handleAcceptReturn(product.productId)}
                            disabled={acceptingReturn === product.productId}
                            size="sm"
                          >
                            {acceptingReturn === product.productId ? (
                              <Clock className="h-4 w-4 mr-2" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            {acceptingReturn === product.productId ? "Procesando..." : "Aceptar Devolución"}
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalle
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Detalle Consolidado - {product.productName}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                  <Label>Total Devuelto: {product.totalQuantity} unidades</Label>
                                </div>
                                <div>
                                  <Label>Valor Total: ${product.totalValue.toLocaleString()}</Label>
                                </div>
                                <div>
                                  <Label>Estado: {getStatusBadge(product.status).label}</Label>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-semibold mb-2">Devoluciones Individuales</h4>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Pedido</TableHead>
                                      <TableHead>Cliente</TableHead>
                                      <TableHead>Ruta</TableHead>
                                      <TableHead>Cantidad</TableHead>
                                      <TableHead>Motivo</TableHead>
                                      <TableHead>Fecha</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {product.returns.map((returnItem, index) => (
                                      <TableRow key={index}>
                                        <TableCell>{returnItem.order?.order_number || "N/A"}</TableCell>
                                        <TableCell>{returnItem.order?.client?.name}</TableCell>
                                        <TableCell>{returnItem.route?.route_name || "Sin ruta"}</TableCell>
                                        <TableCell>
                                          <span className="text-red-600 font-semibold">
                                            {returnItem.quantity_returned}
                                          </span>
                                        </TableCell>
                                        <TableCell>
                                          <span className={getReturnReasonColor(returnItem.rejection_reason)}>
                                            {returnItem.rejection_reason || "Sin motivo"}
                                          </span>
                                        </TableCell>
                                        <TableCell>
                                          {new Date(returnItem.return_date).toLocaleDateString()}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>

                              <div className="flex justify-end gap-2">
                                <Button variant="outline">
                                  <Download className="h-4 w-4 mr-2" />
                                  Descargar Reporte
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pedido</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Ruta</TableHead>
                          <TableHead>Cantidad Devuelta</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {product.returns.map((returnItem, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{returnItem.order?.order_number || "N/A"}</TableCell>
                            <TableCell>{returnItem.order?.client?.name || "Cliente desconocido"}</TableCell>
                            <TableCell>{returnItem.route?.route_name || "Sin ruta"}</TableCell>
                            <TableCell>
                              <span className="text-red-600 font-semibold">
                                {returnItem.quantity_returned}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={getReturnReasonColor(returnItem.rejection_reason)}>
                                {returnItem.rejection_reason || "Sin motivo especificado"}
                              </span>
                            </TableCell>
                            <TableCell>
                              {new Date(returnItem.return_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <span className="text-red-600 font-semibold">
                                ${(returnItem.quantity_returned * (returnItem.product?.price || 0)).toLocaleString()}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Product Summary */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-red-600">
                            {product.totalQuantity}
                          </div>
                          <div className="text-sm text-gray-600">Unidades Devueltas</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-yellow-600">
                            ${product.totalValue.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">Valor Total</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-600">
                            {product.returns.length}
                          </div>
                          <div className="text-sm text-gray-600">Devoluciones Individuales</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {loading && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Cargando devoluciones...</h3>
                  <p className="text-gray-600">Obteniendo datos consolidados de devoluciones.</p>
                </CardContent>
              </Card>
            )}

            {!loading && filteredProducts.length === 0 && (
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
  )
}
