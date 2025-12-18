"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sidebar } from "@/components/layout/sidebar"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { FileSpreadsheet, Package, CheckSquare, Square, Loader2, AlertTriangle, CheckCircle, History } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import {
  getPendingOrders,
  getUnfacturedOrders,
  markOrdersAsInvoiced,
  getRemisions,
  getExportHistory,
  processBilling,
  downloadExportFile,
  type PendingOrder,
  type UnfacturedOrder,
  type RemisionListItem,
  type ExportHistoryItem,
  type BillingSummary,
} from "./actions"

export default function BillingPage() {
  const { user } = useAuth()

  // State for data
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([])
  const [unfacturedOrders, setUnfacturedOrders] = useState<UnfacturedOrder[]>([])
  const [remisions, setRemisions] = useState<RemisionListItem[]>([])
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([])

  // Loading states
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [remisionsLoading, setRemisionsLoading] = useState(false)
  const [isBilling, setIsBilling] = useState(false)

  // Selection states
  const [selectedOrders, setSelectedOrders] = useState<Record<string, boolean>>({})
  const [selectedUnfactured, setSelectedUnfactured] = useState<Record<string, boolean>>({})

  // UI states
  const [activeTab, setActiveTab] = useState<"pending" | "unfactured" | "remisions" | "history">("pending")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null)

  // Helper function to format dates without timezone issues
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('T')[0].split('-')
    return `${day}/${month}/${year}`
  }

  // Load pending orders
  const loadPendingOrders = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await getPendingOrders({ limit: 500 })
      if (error) {
        toast.error("Error cargando pedidos pendientes", { description: error })
        return
      }
      setPendingOrders(data?.orders || [])
    } catch (err) {
      toast.error("Error inesperado cargando pedidos")
    } finally {
      setLoading(false)
    }
  }, [])

  // Load unfactured orders
  const loadUnfacturedOrders = useCallback(async () => {
    try {
      const { data, error } = await getUnfacturedOrders()
      if (error) {
        toast.error("Error cargando pedidos no facturados", { description: error })
        return
      }
      setUnfacturedOrders(data?.orders || [])
    } catch (err) {
      toast.error("Error inesperado cargando pedidos no facturados")
    }
  }, [])

  // Load remisions
  const loadRemisions = useCallback(async () => {
    setRemisionsLoading(true)
    try {
      const { data, error } = await getRemisions({ limit: 500 })
      if (error) {
        toast.error("Error cargando remisiones", { description: error })
        return
      }
      setRemisions(data?.remisions || [])
    } catch (err) {
      toast.error("Error inesperado cargando remisiones")
    } finally {
      setRemisionsLoading(false)
    }
  }, [])

  // Load export history
  const loadExportHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const { data, error } = await getExportHistory({ limit: 500 })
      if (error) {
        toast.error("Error cargando historial", { description: error })
        return
      }
      setExportHistory(data?.exports || [])
    } catch (err) {
      toast.error("Error inesperado cargando historial")
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadPendingOrders()
  }, [loadPendingOrders])

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === "unfactured") {
      loadUnfacturedOrders()
    } else if (activeTab === "remisions") {
      loadRemisions()
    } else if (activeTab === "history") {
      loadExportHistory()
    }
  }, [activeTab, loadUnfacturedOrders, loadRemisions, loadExportHistory])

  // Selection helpers
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }))
  }

  const selectAllOrders = () => {
    const allSelected = pendingOrders.every(order => selectedOrders[order.id])
    if (allSelected) {
      setSelectedOrders({})
    } else {
      const newSelection: Record<string, boolean> = {}
      pendingOrders.forEach(order => {
        newSelection[order.id] = true
      })
      setSelectedOrders(newSelection)
    }
  }

  const getSelectedOrderCount = () => {
    return Object.values(selectedOrders).filter(Boolean).length
  }

  const toggleUnfacturedSelection = (orderId: string) => {
    setSelectedUnfactured(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }))
  }

  const selectAllUnfactured = () => {
    const allSelected = unfacturedOrders.every(order => selectedUnfactured[order.order_id])
    if (allSelected) {
      setSelectedUnfactured({})
    } else {
      const newSelection: Record<string, boolean> = {}
      unfacturedOrders.forEach(order => {
        newSelection[order.order_id] = true
      })
      setSelectedUnfactured(newSelection)
    }
  }

  // Generate billing summary
  const generateBillingSummary = (): BillingSummary => {
    const selectedOrderIds = Object.keys(selectedOrders).filter(id => selectedOrders[id])
    const selectedOrdersList = pendingOrders.filter(o => selectedOrderIds.includes(o.id))

    const directBillingOrders = selectedOrdersList.filter(
      o => o.client_billing_type !== 'remision' && !o.requires_remision
    )
    const remisionOrders = selectedOrdersList.filter(
      o => o.client_billing_type === 'remision' || o.requires_remision
    )

    const totalDirectBilling = directBillingOrders.reduce((sum, o) => sum + (o.total_value || 0), 0)
    const totalRemisions = remisionOrders.reduce((sum, o) => sum + (o.total_value || 0), 0)

    return {
      total_orders: selectedOrdersList.length,
      direct_billing_count: directBillingOrders.length,
      remision_count: remisionOrders.length,
      total_direct_billing_amount: totalDirectBilling,
      total_remision_amount: totalRemisions,
      total_amount: totalDirectBilling + totalRemisions,
      order_numbers: selectedOrdersList.map(o => o.order_number || '').filter(Boolean),
    }
  }

  // Handle billing
  const handleBillOrders = () => {
    if (getSelectedOrderCount() === 0) return
    const summary = generateBillingSummary()
    setBillingSummary(summary)
    setShowConfirmDialog(true)
  }

  const confirmBilling = async () => {
    if (!user) return

    const selectedOrderIds = Object.keys(selectedOrders).filter(id => selectedOrders[id])

    setIsBilling(true)
    try {
      const { data, error } = await processBilling(selectedOrderIds)

      if (error) {
        toast.error("Error procesando facturación", { description: error })
        return
      }

      if (data?.success) {
        toast.success("Facturación completada", {
          description: `${data.summary.total_orders} pedidos procesados`
        })

        // Download Excel if generated
        if (data.export_history_id) {
          const downloadResult = await downloadExportFile(data.export_history_id)
          if (downloadResult.data) {
            // Convert base64 back to Blob on client side
            const byteCharacters = atob(downloadResult.data.base64)
            const byteNumbers = new Array(byteCharacters.length)
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i)
            }
            const byteArray = new Uint8Array(byteNumbers)
            const blob = new Blob([byteArray], { type: downloadResult.data.mimeType })

            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = downloadResult.data.fileName
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          }
        }

        // Reset selection and reload
        setSelectedOrders({})
        setShowConfirmDialog(false)
        await loadPendingOrders()
      } else {
        toast.error("Error en facturación", {
          description: data?.errors?.join(", ") || "Error desconocido"
        })
      }
    } catch (err) {
      toast.error("Error inesperado procesando facturación")
    } finally {
      setIsBilling(false)
    }
  }

  // Handle billing unfactured orders
  const handleBillUnfactured = async () => {
    const selectedOrderIds = Object.keys(selectedUnfactured).filter(id => selectedUnfactured[id])

    if (selectedOrderIds.length === 0) {
      toast.error("Sin selección", { description: "Selecciona al menos un pedido para facturar" })
      return
    }

    try {
      const { data, error } = await markOrdersAsInvoiced(selectedOrderIds)

      if (error) {
        toast.error("Error facturando pedidos", { description: error })
        return
      }

      toast.success("Éxito", {
        description: `${data?.updated_count || 0} pedidos facturados correctamente`
      })

      setSelectedUnfactured({})
      await loadUnfacturedOrders()
    } catch (err) {
      toast.error("No se pudieron facturar los pedidos")
    }
  }

  // Handle export file download
  const handleDownloadExport = async (exportId: string, fileName: string) => {
    try {
      const { data, error } = await downloadExportFile(exportId)

      if (error) {
        toast.error("Error descargando archivo", { description: error })
        return
      }

      if (data) {
        // Convert base64 back to Blob on client side
        const byteCharacters = atob(data.base64)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: data.mimeType })

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = data.fileName || fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      toast.error("Error inesperado descargando archivo")
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </div>
    )
  }

  return (
    <RouteGuard
      requiredPermissions={['order_management_dispatch']}
      requiredRoles={['super_admin', 'administrator', 'coordinador_logistico', 'dispatcher']}
    >
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Centro de Facturación</h1>
                    <p className="text-gray-600">
                      Gestiona la facturación de pedidos listos para despacho
                    </p>
                  </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                  <TabsList className="grid w-full grid-cols-4 lg:w-fit">
                    <TabsTrigger value="pending" className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Pendientes ({pendingOrders.length})
                    </TabsTrigger>
                    <TabsTrigger value="unfactured" className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      No Facturados ({unfacturedOrders.length})
                    </TabsTrigger>
                    <TabsTrigger value="remisions" className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Remisiones
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Historial
                    </TabsTrigger>
                  </TabsList>

                  {/* Pending Orders Tab */}
                  <TabsContent value="pending" className="mt-6">
                    <div className="space-y-4">
                      {/* Selection Controls */}
                      {pendingOrders.length > 0 && (
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={selectAllOrders}
                                  className="flex items-center gap-2"
                                >
                                  {getSelectedOrderCount() === pendingOrders.length ? (
                                    <CheckSquare className="h-4 w-4" />
                                  ) : (
                                    <Square className="h-4 w-4" />
                                  )}
                                  {getSelectedOrderCount() === pendingOrders.length ? "Deseleccionar todos" : "Seleccionar todos"}
                                </Button>
                                {getSelectedOrderCount() > 0 && (
                                  <Badge variant="secondary">
                                    {getSelectedOrderCount()} de {pendingOrders.length} pedidos seleccionados
                                  </Badge>
                                )}
                              </div>
                              {getSelectedOrderCount() > 0 && (
                                <Button
                                  onClick={handleBillOrders}
                                  disabled={isBilling}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {isBilling ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                                  )}
                                  {isBilling ? "Facturando..." : `Facturar ${getSelectedOrderCount()} pedidos`}
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Orders List */}
                      {pendingOrders.length === 0 ? (
                        <Card>
                          <CardContent className="flex items-center justify-center p-12">
                            <div className="text-center">
                              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pedidos pendientes</h3>
                              <p className="text-gray-600">Los pedidos listos para facturar aparecerán aquí</p>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="grid gap-4">
                          {pendingOrders.map((order) => {
                            const isSelected = selectedOrders[order.id] || false
                            const willBeRemision = order.client_billing_type === 'remision' || order.requires_remision

                            return (
                              <Card key={order.id} className={`transition-all ${isSelected ? 'ring-2 ring-green-500 bg-green-50' : ''}`}>
                                <CardContent className="p-6">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => toggleOrderSelection(order.id)}
                                        className="mt-1"
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                          <h3 className="text-lg font-semibold text-gray-900">
                                            {order.order_number}
                                          </h3>
                                          <Badge variant={willBeRemision ? "outline" : "default"} className={willBeRemision ? "bg-orange-50 text-orange-700" : "bg-blue-50 text-blue-700"}>
                                            {willBeRemision ? "Remisión" : "Factura Directa"}
                                          </Badge>
                                          <Badge variant="secondary">
                                            Listo para Facturar
                                          </Badge>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                                          <div>
                                            <strong>Cliente:</strong> {order.client_name}
                                          </div>
                                          {order.branch_name && (
                                            <div>
                                              <strong>Sucursal:</strong> {order.branch_name}
                                            </div>
                                          )}
                                          <div>
                                            <strong>Entrega:</strong> {order.expected_delivery_date ? formatDate(order.expected_delivery_date) : '-'}
                                          </div>
                                          <div>
                                            <strong>Total:</strong> ${order.total_value?.toLocaleString()}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                          <div className="flex items-center gap-2">
                                            <Package className="h-4 w-4 text-blue-500" />
                                            <span className="text-gray-600">{order.items_count || 0} productos</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Unfactured Orders Tab */}
                  <TabsContent value="unfactured" className="mt-6">
                    <div className="space-y-4">
                      {/* Selection Controls */}
                      {unfacturedOrders.length > 0 && (
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={selectAllUnfactured}
                                  className="flex items-center gap-2"
                                >
                                  {Object.keys(selectedUnfactured).filter(id => selectedUnfactured[id]).length === unfacturedOrders.length ? (
                                    <CheckSquare className="h-4 w-4" />
                                  ) : (
                                    <Square className="h-4 w-4" />
                                  )}
                                  {Object.keys(selectedUnfactured).filter(id => selectedUnfactured[id]).length === unfacturedOrders.length ? "Deseleccionar todos" : "Seleccionar todos"}
                                </Button>
                                {Object.keys(selectedUnfactured).filter(id => selectedUnfactured[id]).length > 0 && (
                                  <Badge variant="secondary">
                                    {Object.keys(selectedUnfactured).filter(id => selectedUnfactured[id]).length} de {unfacturedOrders.length} pedidos seleccionados
                                  </Badge>
                                )}
                              </div>
                              {Object.keys(selectedUnfactured).filter(id => selectedUnfactured[id]).length > 0 && (
                                <Button
                                  onClick={handleBillUnfactured}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                                  Facturar {Object.keys(selectedUnfactured).filter(id => selectedUnfactured[id]).length} pedidos
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Orders List */}
                      {unfacturedOrders.length === 0 ? (
                        <Card>
                          <CardContent className="flex items-center justify-center p-12">
                            <div className="text-center">
                              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pedidos pendientes</h3>
                              <p className="text-gray-600">Todos los pedidos con remisión han sido facturados</p>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="grid gap-4">
                          {unfacturedOrders.map((order) => {
                            const isSelected = selectedUnfactured[order.order_id] || false

                            return (
                              <Card key={order.id} className={`transition-all ${isSelected ? 'ring-2 ring-green-500 bg-green-50' : ''}`}>
                                <CardContent className="p-6">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => toggleUnfacturedSelection(order.order_id)}
                                        className="mt-1"
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                          <h3 className="text-lg font-semibold text-gray-900">
                                            {order.order_number}
                                          </h3>
                                          <Badge variant="outline" className="bg-orange-50 text-orange-700">
                                            Remisión: {order.remision_number}
                                          </Badge>
                                          <Badge variant="secondary" className="bg-yellow-50 text-yellow-700">
                                            Pendiente Facturar
                                          </Badge>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                                          <div>
                                            <strong>Cliente:</strong> {order.client_name}
                                          </div>
                                          {order.client_nit && (
                                            <div>
                                              <strong>NIT:</strong> {order.client_nit}
                                            </div>
                                          )}
                                          {order.branch_name && (
                                            <div>
                                              <strong>Sucursal:</strong> {order.branch_name}
                                            </div>
                                          )}
                                          <div>
                                            <strong>Entrega:</strong> {order.expected_delivery_date ? formatDate(order.expected_delivery_date) : '-'}
                                          </div>
                                          <div>
                                            <strong>Total:</strong> ${order.total_value?.toLocaleString()}
                                          </div>
                                          {order.remision_created_at && (
                                            <div>
                                              <strong>Remisión creada:</strong> {formatDate(order.remision_created_at)}
                                            </div>
                                          )}
                                        </div>
                                        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                                          <p className="text-xs text-yellow-800">
                                            <AlertTriangle className="h-3 w-3 inline mr-1" />
                                            Este pedido tiene remisión generada pero aún no ha sido facturado en el sistema contable
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Remisions Tab */}
                  <TabsContent value="remisions" className="mt-6">
                    {remisionsLoading ? (
                      <Card>
                        <CardContent className="flex items-center justify-center p-8">
                          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                        </CardContent>
                      </Card>
                    ) : remisions.length === 0 ? (
                      <Card>
                        <CardContent className="flex items-center justify-center p-12">
                          <div className="text-center">
                            <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay remisiones</h3>
                            <p className="text-gray-600">Las remisiones generadas aparecerán aquí</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardHeader>
                          <CardTitle>Remisiones Generadas ({remisions.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {remisions.map((remision) => (
                              <div key={remision.id} className="border rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h4 className="font-semibold text-gray-900">
                                        {remision.remision_number}
                                      </h4>
                                      <Badge variant="outline" className="bg-orange-50 text-orange-700">
                                        Remisión
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                      <div>
                                        <strong>Cliente:</strong> {remision.client_name || 'Cliente desconocido'}
                                      </div>
                                      <div>
                                        <strong>Fecha:</strong> {remision.created_at ? formatDate(remision.created_at) : '-'}
                                      </div>
                                      <div>
                                        <strong>Total:</strong> ${remision.total_amount?.toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      // PDF download handled client-side (existing functionality)
                                      toast.info("Funcionalidad de PDF próximamente")
                                    }}
                                  >
                                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                                    Descargar PDF
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* History Tab */}
                  <TabsContent value="history" className="mt-6">
                    {historyLoading ? (
                      <Card>
                        <CardContent className="flex items-center justify-center p-8">
                          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                        </CardContent>
                      </Card>
                    ) : exportHistory.length === 0 ? (
                      <Card>
                        <CardContent className="flex items-center justify-center p-12">
                          <div className="text-center">
                            <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay historial</h3>
                            <p className="text-gray-600">Las facturas generadas aparecerán aquí</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardHeader>
                          <CardTitle>Historial de Facturación ({exportHistory.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {exportHistory.map((exportRecord) => (
                              <div key={exportRecord.id} className="border rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h4 className="font-semibold text-gray-900">
                                        Facturas {exportRecord.invoice_number_start} - {exportRecord.invoice_number_end}
                                      </h4>
                                      <Badge variant="outline">
                                        {exportRecord.total_orders} pedidos
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                      <div>
                                        <strong>Fecha:</strong> {exportRecord.export_date ? formatDate(exportRecord.export_date) : '-'}
                                      </div>
                                      <div>
                                        <strong>Total:</strong> ${exportRecord.total_amount?.toLocaleString()}
                                      </div>
                                      <div>
                                        <strong>Usuario:</strong> {exportRecord.created_by_name || 'Sistema'}
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownloadExport(exportRecord.id, exportRecord.file_name || '')}
                                  >
                                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                                    Descargar
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Confirmation Dialog */}
              <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Confirmar Facturación</DialogTitle>
                    <DialogDescription>
                      Revisa el resumen antes de procesar la facturación
                    </DialogDescription>
                  </DialogHeader>
                  {billingSummary && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Resumen de facturación</h4>
                        <div className="space-y-2 text-sm text-blue-700">
                          <div className="flex justify-between">
                            <span>Total pedidos:</span>
                            <span className="font-medium">{billingSummary.total_orders}</span>
                          </div>

                          {billingSummary.direct_billing_count > 0 && (
                            <div className="flex justify-between border-l-2 border-green-300 pl-2">
                              <span>→ Facturación directa:</span>
                              <span className="font-medium text-green-800">
                                {billingSummary.direct_billing_count} pedidos (${billingSummary.total_direct_billing_amount?.toLocaleString()})
                              </span>
                            </div>
                          )}

                          {billingSummary.remision_count > 0 && (
                            <div className="flex justify-between border-l-2 border-orange-300 pl-2">
                              <span>→ Remisiones (PDF):</span>
                              <span className="font-medium text-orange-800">
                                {billingSummary.remision_count} pedidos (${billingSummary.total_remision_amount?.toLocaleString()})
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between font-medium border-t border-blue-200 pt-2">
                            <span>Valor total:</span>
                            <span>${billingSummary.total_amount.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div className="text-sm text-yellow-800">
                            <p className="font-medium mb-1">¡Importante!</p>
                            <ul className="space-y-1 list-disc list-inside">
                              {billingSummary.direct_billing_count > 0 && (
                                <li>Facturación directa: Los pedidos se marcarán como facturados</li>
                              )}
                              {billingSummary.remision_count > 0 && (
                                <li>Remisiones: Se generarán PDFs para facturación posterior</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowConfirmDialog(false)}
                          disabled={isBilling}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={confirmBilling}
                          disabled={isBilling}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isBilling ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Facturando...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Confirmar Facturación
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </main>
        </div>
      </div>
    </RouteGuard>
  )
}
