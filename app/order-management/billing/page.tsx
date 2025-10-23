"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sidebar } from "@/components/layout/sidebar"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { FileSpreadsheet, Package, CheckSquare, Square, Loader2, Calendar, User, MapPin, AlertTriangle, CheckCircle, History } from "lucide-react"
import { useBilling } from "@/hooks/use-billing"
import { useExportHistory } from "@/hooks/use-export-history"
import { useRemisions } from "@/hooks/use-remisions"
import { useAuth } from "@/contexts/AuthContext"

export default function BillingPage() {
  const { user } = useAuth()
  const {
    pendingOrders,
    loading,
    isBilling,
    selectedOrders,
    toggleOrderSelection,
    selectAllOrders,
    getSelectedOrderCount,
    generateBillingSummary,
    billSelectedOrders
  } = useBilling()

  const {
    exportHistory,
    loading: historyLoading,
    downloadExportFile
  } = useExportHistory()

  const {
    remisions,
    loading: remisionsLoading,
    downloadRemisionPDF
  } = useRemisions()

  const [activeTab, setActiveTab] = useState<"pending" | "history" | "remisions">("pending")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [billingSummary, setBillingSummary] = useState<any>(null)

  const handleBillOrders = () => {
    if (getSelectedOrderCount() === 0) return

    const summary = generateBillingSummary()
    setBillingSummary(summary)
    setShowConfirmDialog(true)
  }

  const confirmBilling = async () => {
    if (!user) return

    try {
      await billSelectedOrders(user)
      setShowConfirmDialog(false)
    } catch (error) {
      // Error handled in hook
    }
  }

  const handleSelectAll = () => {
    selectAllOrders()
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
      requiredRoles={['administrator', 'coordinador_logistico', 'dispatcher']}
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
                  <TabsList className="grid w-full grid-cols-3 lg:w-fit">
                    <TabsTrigger value="pending" className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Pendientes ({pendingOrders.length})
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
                                  onClick={handleSelectAll}
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
                            const willBeRemision = order.client?.billing_type === 'remision' || order.requires_remision

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
                                            <strong>Cliente:</strong> {order.client?.name}
                                          </div>
                                          {order.branch && (
                                            <div>
                                              <strong>Sucursal:</strong> {order.branch.name}
                                            </div>
                                          )}
                                          <div>
                                            <strong>Entrega:</strong> {new Date(order.expected_delivery_date).toLocaleDateString('es-ES')}
                                          </div>
                                          <div>
                                            <strong>Total:</strong> ${order.total_value?.toLocaleString()}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                          <div className="flex items-center gap-2">
                                            <Package className="h-4 w-4 text-blue-500" />
                                            <span className="text-gray-600">{order.order_items?.length || 0} productos</span>
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
                                        <strong>Cliente:</strong> {remision.client?.name || 'Cliente desconocido'}
                                      </div>
                                      <div>
                                        <strong>Fecha:</strong> {new Date(remision.created_at).toLocaleDateString('es-ES')}
                                      </div>
                                      <div>
                                        <strong>Total:</strong> ${remision.total_amount.toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const fileName = `Remision_${remision.remision_number}_${remision.client?.name || 'Cliente'}.pdf`
                                      downloadRemisionPDF(remision.id, fileName)
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
                                        <strong>Fecha:</strong> {new Date(exportRecord.export_date).toLocaleDateString('es-ES')}
                                      </div>
                                      <div>
                                        <strong>Total:</strong> ${exportRecord.total_amount.toLocaleString()}
                                      </div>
                                      <div>
                                        <strong>Usuario:</strong> {exportRecord.created_by_user?.name || 'Sistema'}
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadExportFile(exportRecord.id, exportRecord.file_name)}
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
                            <span className="font-medium">{billingSummary.totalOrders}</span>
                          </div>

                          {billingSummary.directBillingOrders.length > 0 && (
                            <div className="flex justify-between border-l-2 border-green-300 pl-2">
                              <span>→ Facturación directa:</span>
                              <span className="font-medium text-green-800">
                                {billingSummary.directBillingOrders.length} pedidos (${billingSummary.totalDirectBilling?.toLocaleString()})
                              </span>
                            </div>
                          )}

                          {billingSummary.remisionOrders.length > 0 && (
                            <div className="flex justify-between border-l-2 border-orange-300 pl-2">
                              <span>→ Remisiones (PDF):</span>
                              <span className="font-medium text-orange-800">
                                {billingSummary.remisionOrders.length} pedidos (${billingSummary.totalRemisions?.toLocaleString()})
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between font-medium border-t border-blue-200 pt-2">
                            <span>Valor total:</span>
                            <span>${billingSummary.totalAmount.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div className="text-sm text-yellow-800">
                            <p className="font-medium mb-1">¡Importante!</p>
                            <ul className="space-y-1 list-disc list-inside">
                              {billingSummary.directBillingOrders.length > 0 && (
                                <li>Facturación directa: Los pedidos se marcarán como facturados</li>
                              )}
                              {billingSummary.remisionOrders.length > 0 && (
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
