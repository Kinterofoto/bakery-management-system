"use client"

import { useOrders } from "@/hooks/use-orders"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Sidebar } from "@/components/layout/sidebar"
import { Truck, Package, CheckCircle, AlertTriangle, Eye, Calendar } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useRoutes } from "@/hooks/use-routes"

export default function DispatchPage() {
  const { orders, loading, updateOrderStatus, updateItemDispatched } = useOrders()
  const { routes, assignOrderToRoute, refetch: refetchRoutes } = useRoutes()
  const { toast } = useToast()
  // Filtrar pedidos reales por estado
  const readyOrders = orders.filter(order => order.status === "ready_dispatch")
  const dispatchedOrders = orders.filter(order => order.status === "dispatched")

  // Estado local para cantidades despachadas por item
  const [dispatchedEdits, setDispatchedEdits] = useState<{ [orderId: string]: { [itemId: string]: number } }>({})

  // Estado local para selección múltiple de pedidos
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])

  // Estado para mostrar/ocultar el modal de resumen
  const [showSummary, setShowSummary] = useState(false)

  // Estado para inputs editables de cantidad a despachar por producto agrupado
  const [groupedDispatch, setGroupedDispatch] = useState<{ [product: string]: number }>({})
  // Estado para ruta/camión/conductor
  const [selectedRoute, setSelectedRoute] = useState<string>("")
  const [selectedDriver, setSelectedDriver] = useState<string>("")
  const [deliverySequence, setDeliverySequence] = useState<number>(1)

  // Pedidos seleccionados completos
  const selectedOrderObjects = readyOrders.filter(order => selectedOrders.includes(order.id))

  // Agrupar productos de los pedidos seleccionados
  const groupedProducts = (() => {
    const map = new Map<string, { name: string; totalRequested: number; totalPrepared: number; totalMissing: number; unit: string }>()
    selectedOrderObjects.forEach(order => {
      order.order_items.forEach((item: any) => {
        const key = item.product?.id || item.product_id
        if (!key) return
        const prev = map.get(key) || { name: item.product?.name || '-', totalRequested: 0, totalPrepared: 0, totalMissing: 0, unit: item.product?.unit || '' }
        map.set(key, {
          name: prev.name,
          totalRequested: prev.totalRequested + (item.quantity_requested || 0),
          totalPrepared: prev.totalPrepared + (item.quantity_available || 0),
          totalMissing: prev.totalMissing + (item.quantity_missing || Math.max(0, (item.quantity_requested || 0) - (item.quantity_available || 0))),
          unit: prev.unit,
        })
      })
    })
    return Array.from(map.values())
  })()

  // useEffect que usa groupedProducts
  useEffect(() => {
    const initial: { [product: string]: number } = {}
    groupedProducts.forEach(prod => {
      initial[prod.name] = prod.totalPrepared
    })
    setGroupedDispatch(initial)
  }, [showSummary, selectedOrders.length])
  // Handler para editar cantidad a despachar por producto
  const handleGroupedDispatchChange = (name: string, value: number) => {
    setGroupedDispatch(prev => ({ ...prev, [name]: value }))
  }
  // Handler para confirmar despacho unificado
  const handleUnifiedDispatch = async () => {
    try {
      // Asignar cada pedido seleccionado a la ruta elegida
      let sequence = 1
      for (const order of selectedOrderObjects) {
        await assignOrderToRoute(selectedRoute, order.id, sequence++)
      }
      toast({ title: "Despacho unificado registrado", description: "Pedidos asignados a la ruta correctamente." })
      setShowSummary(false)
      setSelectedOrders([])
      refetchRoutes()
    } catch (error) {
      toast({ title: "Error", description: "No se pudo asignar la ruta", variant: "destructive" })
    }
  }

  // Handler para seleccionar/deseleccionar pedidos
  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    )
  }
  const handleSelectAll = () => {
    if (selectedOrders.length === readyOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(readyOrders.map(order => order.id))
    }
  }

  // Mapear estructura de items para la UI
  const mapOrder = (order: any) => {
          return {
            ...order,
      client: order.client?.name || "-",
      contact: order.client?.contact || "-",
      deliveryDate: order.expected_delivery_date,
      items: order.order_items.map((item: any) => {
        const dispatched = dispatchedEdits[order.id]?.[item.id] ?? item.quantity_dispatched ?? 0
        return {
          id: item.id,
          product: item.product?.name || "-",
          requested: item.quantity_requested,
          prepared: item.quantity_available ?? 0,
          dispatched,
        }
      }),
      observations: order.observations || null,
    }
  }

  // Handler para editar cantidad despachada localmente y en la base de datos
  const handleEditDispatched = async (orderId: string, itemId: string, value: number) => {
    setDispatchedEdits(prev => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [itemId]: value,
      },
    }))
    try {
      await updateItemDispatched(itemId, value)
      toast({ title: "Éxito", description: "Cantidad despachada actualizada" })
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar la cantidad despachada", variant: "destructive" })
    }
  }

  // Marcar pedido como despachado (actualiza estado en base de datos)
  const handleMarkAsDispatched = async (order: any) => {
    // Aquí podrías actualizar las cantidades despachadas en la base de datos si lo deseas
    await updateOrderStatus(order.id, "dispatched")
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <span className="text-gray-500">Cargando...</span>
        </div>
      </div>
    )
  }

  const getItemStatus = (item: any) => {
    if (item.dispatched === 0) return { label: "Pendiente", color: "bg-gray-100 text-gray-800" }
    if (item.dispatched === item.prepared) return { label: "Completo", color: "bg-green-100 text-green-800" }
    return { label: "Parcial", color: "bg-yellow-100 text-yellow-800" }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Centro de Despacho</h1>
              <p className="text-gray-600">Gestiona la preparación final y despacho de pedidos</p>
            </div>
            {/* Botón flotante para abrir el resumen */}
            {selectedOrders.length > 0 && (
              <button
                className="fixed bottom-8 right-8 z-50 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 transition"
                onClick={() => setShowSummary(true)}
              >
                Despachar seleccionados ({selectedOrders.length})
              </button>
            )}
            {/* Modal de resumen */}
            <Dialog open={showSummary} onOpenChange={setShowSummary}>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Resumen de Despacho</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Pedidos seleccionados:</h3>
                  <ul className="list-disc pl-6">
                    {selectedOrderObjects.map(order => (
                      <li key={order.id}>
                        <span className="font-medium">{order.order_number}</span> - {order.client?.name}
                      </li>
                    ))}
                  </ul>
                  <h3 className="font-semibold text-lg mt-4">Resumen agrupado por producto:</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-3 py-2 border">Producto</th>
                          <th className="px-3 py-2 border">Total solicitado</th>
                          <th className="px-3 py-2 border">Total preparado</th>
                          <th className="px-3 py-2 border">Total faltante</th>
                          <th className="px-3 py-2 border">A despachar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedProducts.map((prod, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 border">{prod.name}</td>
                            <td className="px-3 py-2 border">{prod.totalRequested} {prod.unit}</td>
                            <td className="px-3 py-2 border">{prod.totalPrepared} {prod.unit}</td>
                            <td className="px-3 py-2 border text-red-600 font-semibold">{prod.totalMissing > 0 ? prod.totalMissing : '-'}</td>
                            <td className="px-3 py-2 border">
                              <input
                                type="number"
                                className="w-20 border rounded px-2 py-1"
                                min={0}
                                max={prod.totalPrepared}
                                value={groupedDispatch[prod.name] ?? prod.totalPrepared}
                                onChange={e => handleGroupedDispatchChange(prod.name, Number.parseInt(e.target.value) || 0)}
                              />
                              {prod.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Ruta</label>
                      <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar ruta" />
                        </SelectTrigger>
                        <SelectContent>
                          {routes.map(route => (
                            <SelectItem key={route.id} value={route.id}>{route.route_name} ({route.route_date})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Eliminada la selección de conductor */}
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium mb-1">Secuencia de Entrega</label>
                    <input
                      type="number"
                      className="w-32 border rounded px-2 py-1"
                      min={1}
                      value={deliverySequence}
                      onChange={e => setDeliverySequence(Number.parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button className="px-4 py-2 rounded bg-gray-200" onClick={() => setShowSummary(false)}>
                    Cancelar
                  </button>
                  <button
                    className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                    onClick={handleUnifiedDispatch}
                    disabled={!selectedRoute}
                  >
                    Confirmar Despacho Unificado
                  </button>
                </div>
              </DialogContent>
            </Dialog>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Listos para Despacho</p>
                      <p className="text-3xl font-bold text-blue-600">{readyOrders.length}</p>
                    </div>
                    <Package className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Despachados Hoy</p>
                      <p className="text-3xl font-bold text-green-600">{dispatchedOrders.length}</p>
                    </div>
                    <Truck className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Diferencias Registradas</p>
                      <p className="text-3xl font-bold text-yellow-600">2</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Ready for Dispatch */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Pedidos Listos para Despacho ({readyOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {readyOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No hay pedidos listos para despacho</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={selectedOrders.length === readyOrders.length && readyOrders.length > 0}
                        onChange={handleSelectAll}
                        className="mr-2"
                      />
                      <span className="font-medium">Seleccionar todos</span>
                    </div>
                  <div className="space-y-6">
                      {readyOrders.map((order) => {
                        const mappedOrder = mapOrder(order)
                        return (
                          <div key={order.id} className="border rounded-lg p-6 flex items-start gap-4">
                            <input
                              type="checkbox"
                              checked={selectedOrders.includes(order.id)}
                              onChange={() => handleSelectOrder(order.id)}
                              className="mt-1 mr-2"
                            />
                            <div className="flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">
                                    {order.order_number} - {mappedOrder.client}
                            </h3>
                                  <p className="text-sm text-gray-600">Contacto: {mappedOrder.contact}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">Entrega: {mappedOrder.deliveryDate}</span>
                            </div>
                                  {mappedOrder.observations && (
                                    <p className="text-sm text-blue-600 mt-1">📝 {mappedOrder.observations}</p>
                            )}
                          </div>
                          {/* Botones individuales eliminados */}
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Producto</TableHead>
                              <TableHead>Solicitado</TableHead>
                              <TableHead>Preparado</TableHead>
                              <TableHead>Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                                  {mappedOrder.items.map((item: any, index: number) => (
                                    <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.product}</TableCell>
                                <TableCell>{item.requested}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {item.prepared}
                                    {item.prepared !== item.requested && (
                                      <Badge
                                        variant="outline"
                                        className={item.prepared < item.requested ? "text-red-600" : "text-green-600"}
                                      >
                                        {item.prepared - item.requested > 0 ? "+" : ""}
                                        {item.prepared - item.requested}
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={getItemStatus(item).color}>{getItemStatus(item).label}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Recently Dispatched */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Pedidos Despachados Hoy ({dispatchedOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dispatchedOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No hay pedidos despachados hoy</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Fecha Entrega</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dispatchedOrders.map((order) => {
                        const mappedOrder = mapOrder(order)
                        return (
                        <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.order_number}</TableCell>
                            <TableCell>{mappedOrder.client}</TableCell>
                            <TableCell>{mappedOrder.deliveryDate}</TableCell>
                            <TableCell>{mappedOrder.items.length} productos</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">Despachado</Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
