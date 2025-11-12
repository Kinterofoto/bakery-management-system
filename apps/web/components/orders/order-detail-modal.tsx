"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import { OrderAuditHistory } from "@/components/orders/order-audit-history"
import { OrderSourceIcon } from "@/components/ui/order-source-icon"
import { Plus, X, Loader2, FileText, User, History, FileImage, Eye, Save, XCircle } from "lucide-react"

interface OrderDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: any | null
  isEditMode: boolean
  isSubmitting: boolean
  editOrderItems: any[]
  setEditOrderItems: (items: any[]) => void
  editDeliveryDate: string
  setEditDeliveryDate: (date: string) => void
  editPurchaseOrderNumber: string
  setEditPurchaseOrderNumber: (number: string) => void
  editObservations: string
  setEditObservations: (observations: string) => void
  editClientId: string
  setEditClientId: (id: string) => void
  editBranchId: string | null
  setEditBranchId: (id: string | null) => void
  clients: any[]
  branches: any[]
  getBranchesByClient: (clientId: string) => any[]
  finishedProducts: any[]
  getProductDisplayName: (product: any) => string
  calculateOrderTotal: (items: any[]) => number
  handleUpdateOrder: () => void
  onClose: () => void
  getDayNames: (frequencies: any[]) => string
  getReceivingHoursForDeliveryDate: (schedules: any[], date: string) => string
  getFrequenciesForBranch: (branchId: string) => any[]
  getSchedulesByBranch: (branchId: string) => any[]
}

export function OrderDetailModal({
  open,
  onOpenChange,
  order,
  isEditMode,
  isSubmitting,
  editOrderItems,
  setEditOrderItems,
  editDeliveryDate,
  setEditDeliveryDate,
  editPurchaseOrderNumber,
  setEditPurchaseOrderNumber,
  editObservations,
  setEditObservations,
  editClientId,
  setEditClientId,
  editBranchId,
  setEditBranchId,
  clients,
  branches,
  getBranchesByClient,
  finishedProducts,
  getProductDisplayName,
  calculateOrderTotal,
  handleUpdateOrder,
  onClose,
  getDayNames,
  getReceivingHoursForDeliveryDate,
  getFrequenciesForBranch,
  getSchedulesByBranch,
}: OrderDetailModalProps) {
  const [activeTab, setActiveTab] = useState("info")
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const handleCancelOrder = async () => {
    setIsCancelling(true)
    try {
      const { supabase } = await import("@/lib/supabase")
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id)

      if (error) throw error

      // Close the confirmation dialog and the main modal
      setShowCancelConfirm(false)
      onOpenChange(false)

      // Refresh the orders list (parent component should handle this)
      window.location.reload()
    } catch (error) {
      console.error('Error cancelling order:', error)
      alert('Error al cancelar el pedido')
    } finally {
      setIsCancelling(false)
    }
  }

  // Format timestamp in local timezone
  // PostgreSQL returns timestamps without 'Z', so we need to add it to force UTC interpretation
  const formatLocalTimestamp = (dateString: string) => {
    console.log('🔍 [formatLocalTimestamp] Input dateString:', dateString)

    // Add 'Z' to force UTC interpretation if not already present
    const utcDateString = dateString.endsWith('Z') ? dateString : dateString + 'Z'
    console.log('🔍 [formatLocalTimestamp] UTC dateString:', utcDateString)

    const dateObj = new Date(utcDateString)
    console.log('🔍 [formatLocalTimestamp] Date object:', dateObj)
    console.log('🔍 [formatLocalTimestamp] Date ISO:', dateObj.toISOString())

    const formatted = dateObj.toLocaleString('es-CO')
    console.log('🔍 [formatLocalTimestamp] Formatted (es-CO):', formatted)

    return formatted
  }

  if (!order) return null

  const statusConfig: Record<string, { label: string; color: string }> = {
    received: { label: "Recibido", color: "bg-gray-100 text-gray-700" },
    review_area1: { label: "Revisión Área 1", color: "bg-yellow-100 text-yellow-700" },
    review_area2: { label: "Revisión Área 2", color: "bg-orange-100 text-orange-700" },
    ready_dispatch: { label: "Listo Despacho", color: "bg-blue-100 text-blue-700" },
    dispatched: { label: "Despachado", color: "bg-purple-100 text-purple-700" },
    in_delivery: { label: "En Entrega", color: "bg-indigo-100 text-indigo-700" },
    delivered: { label: "Entregado", color: "bg-green-100 text-green-700" },
    partially_delivered: { label: "Entrega Parcial", color: "bg-orange-100 text-orange-700" },
    returned: { label: "Devuelto", color: "bg-red-100 text-red-700" },
    cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700" },
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] max-h-[95vh] p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <DialogTitle className="text-xl md:text-2xl flex items-center gap-3">
                  <span>Pedido #{order.order_number || order.id?.toString().slice(0, 8)}</span>
                  <OrderSourceIcon
                    source={order.created_by_user?.name || ""}
                    userName={order.created_by_user?.name}
                  />
                </DialogTitle>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>Creado: {formatLocalTimestamp(order.created_at)}</span>
                  <Badge className={statusConfig[order.status]?.color}>
                    {statusConfig[order.status]?.label}
                  </Badge>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {order.status !== 'cancelled' && (
                  <>
                    <Button
                      onClick={() => setShowCancelConfirm(true)}
                      disabled={isSubmitting || isCancelling}
                      variant="destructive"
                      className="gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Cancelar Pedido</span>
                    </Button>
                    <Button
                      onClick={handleUpdateOrder}
                      disabled={isSubmitting || isCancelling}
                      className="gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="hidden sm:inline">Guardando...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span className="hidden sm:inline">Guardar</span>
                        </>
                      )}
                    </Button>
                  </>
                )}
                <DialogClose asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <X className="h-5 w-5" />
                  </Button>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-2 border-b">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info" className="gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden md:inline">Información</span>
              </TabsTrigger>
              <TabsTrigger value="client" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden md:inline">Cliente</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2">
                <FileImage className="h-4 w-4" />
                <span className="hidden md:inline">Evidencias</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                <span className="hidden md:inline">Historial</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Tab: Información del Pedido */}
            <TabsContent value="info" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Columna Izquierda: Formulario */}
                <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Cliente */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Cliente *</Label>
                  {isEditMode ? (
                    <Select
                      value={editClientId}
                      onValueChange={(value) => {
                        setEditClientId(value)
                        setEditBranchId(null) // Reset branch when client changes
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={order.client?.name || ""} disabled className="h-9" />
                  )}
                </div>

                {/* Sucursal */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Sucursal</Label>
                  {isEditMode ? (
                    <Select
                      value={editBranchId || "none"}
                      onValueChange={(value) => setEditBranchId(value === "none" ? null : value)}
                      disabled={!editClientId}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Seleccionar sucursal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin sucursal</SelectItem>
                        {getBranchesByClient(editClientId).map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={order.branch?.name || "Sin sucursal"} disabled className="h-9" />
                  )}
                </div>

                {/* Fecha Solicitada */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Fecha Solicitada</Label>
                  <Input
                    type="date"
                    value={order.requested_delivery_date}
                    disabled
                    className="h-9"
                  />
                </div>

                {/* Fecha de Entrega */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Fecha de Entrega *</Label>
                  <Input
                    type="date"
                    value={editDeliveryDate}
                    onChange={(e) => setEditDeliveryDate(e.target.value)}
                    className="h-9"
                  />
                  {order.requested_delivery_date !== order.expected_delivery_date && (
                    <p className="text-xs text-amber-600">⚠️ Ajustada</p>
                  )}
                </div>

                {/* Número de Orden de Compra */}
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-sm">Número de OC</Label>
                  <Input
                    value={editPurchaseOrderNumber}
                    onChange={(e) => setEditPurchaseOrderNumber(e.target.value)}
                    placeholder="Número de orden de compra del cliente"
                    className="h-9"
                  />
                </div>
              </div>

              {/* Productos */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Productos</Label>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="min-w-[180px] text-xs">Producto</TableHead>
                        <TableHead className="w-[80px] text-xs">Cant.</TableHead>
                        <TableHead className="w-[100px] text-xs">Precio</TableHead>
                        <TableHead className="w-[100px] text-xs">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editOrderItems.map((item, index) => {
                        const product = finishedProducts.find(p => p.id === item.product_id)
                        const itemTotal = item.quantity_requested * item.unit_price

                        return (
                          <TableRow key={index}>
                            <TableCell className="text-sm">
                              <Select
                                value={item.product_id}
                                onValueChange={(value) => {
                                  const newItems = [...editOrderItems]
                                  newItems[index].product_id = value
                                  const selectedProduct = finishedProducts.find(p => p.id === value)
                                  if (selectedProduct) {
                                    newItems[index].unit_price = selectedProduct.price || 0
                                  }
                                  setEditOrderItems(newItems)
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Producto..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {finishedProducts.map((product) => (
                                    <SelectItem key={product.id} value={product.id} className="text-xs">
                                      {getProductDisplayName(product)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.quantity_requested}
                                onChange={(e) => {
                                  const newItems = [...editOrderItems]
                                  newItems[index].quantity_requested = parseInt(e.target.value) || 0
                                  setEditOrderItems(newItems)
                                }}
                                min="1"
                                className="w-full h-8 text-xs"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => {
                                  const newItems = [...editOrderItems]
                                  newItems[index].unit_price = parseFloat(e.target.value) || 0
                                  setEditOrderItems(newItems)
                                }}
                                className="w-full h-8 text-xs"
                              />
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              ${itemTotal.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  if (editOrderItems.length > 1) {
                                    setEditOrderItems(editOrderItems.filter((_, i) => i !== index))
                                  }
                                }}
                                disabled={editOrderItems.length === 1}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOrderItems([...editOrderItems, { product_id: "", quantity_requested: 1, unit_price: 0 }])}
                  className="w-full h-8 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  Agregar producto
                </Button>
              </div>

              {/* Observaciones */}
              <div className="space-y-1.5">
                <Label className="text-sm">Observaciones</Label>
                <Textarea
                  value={editObservations}
                  onChange={(e) => setEditObservations(e.target.value)}
                  rows={3}
                  placeholder="Observaciones..."
                  className="text-sm resize-none"
                />
              </div>

              {/* Total */}
              <div className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                <span className="text-sm font-semibold">Total:</span>
                <span className="text-xl font-bold text-green-600">
                  ${calculateOrderTotal(editOrderItems).toLocaleString()}
                </span>
              </div>
                </div>

                {/* Columna Derecha: PDF del Pedido */}
                <div className="lg:sticky lg:top-0 lg:self-start">
                  {order.pdf_filename ? (
                    <div className="border rounded-lg overflow-hidden bg-gray-50">
                      <PDFViewer fileName={order.pdf_filename} />
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-6 text-center border-2 border-dashed">
                      <FileText className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No hay PDF disponible</p>
                      {order.purchase_order_number && (
                        <p className="text-xs text-gray-400 mt-1">OC: {order.purchase_order_number}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Tab: Información del Cliente */}
            <TabsContent value="client" className="mt-0 space-y-6">
              <div className="bg-gray-50 rounded-lg p-6 border">
                <h3 className="text-lg font-semibold mb-4">Información del Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <span className="font-medium text-gray-700 block">Razón Social:</span>
                    <p className="text-gray-900">{order.client?.razon_social || order.client?.name || "-"}</p>
                  </div>
                  <div className="space-y-2">
                    <span className="font-medium text-gray-700 block">Contacto:</span>
                    <p className="text-gray-900">{order.branch?.contact_person || order.client?.contact_person || "-"}</p>
                  </div>
                  <div className="space-y-2">
                    <span className="font-medium text-gray-700 block">Teléfono:</span>
                    <p className="text-gray-900">{order.branch?.phone || order.client?.phone || "-"}</p>
                  </div>
                  <div className="space-y-2">
                    <span className="font-medium text-gray-700 block">Email:</span>
                    <p className="text-gray-900 break-all">{order.branch?.email || order.client?.email || "-"}</p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <span className="font-medium text-gray-700 block">Dirección:</span>
                    <p className="text-gray-900">{order.branch?.address || order.client?.address || "-"}</p>
                  </div>
                </div>

                {/* Horarios y Frecuencias */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <span className="font-medium text-gray-700 block">Días de Frecuencia:</span>
                      <p className="text-gray-900">
                        {order.branch_id
                          ? getDayNames(getFrequenciesForBranch(order.branch_id)) || "No configurado"
                          : "No configurado"
                        }
                      </p>
                    </div>
                    <div className="space-y-2">
                      <span className="font-medium text-gray-700 block">
                        Horario de Recibo ({format(new Date(order.expected_delivery_date), "dd/MM/yyyy")}):
                      </span>
                      <p className="text-blue-600 font-semibold">
                        {order.branch_id
                          ? getReceivingHoursForDeliveryDate(getSchedulesByBranch(order.branch_id), order.expected_delivery_date)
                          : "No configurado"
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Evidencias de Entrega */}
            <TabsContent value="documents" className="mt-0 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Evidencia de Entrega</h3>
                  {order.delivery_evidence_url && (
                    <Button variant="outline" className="gap-2">
                      <Eye className="h-4 w-4" />
                      Ver Evidencia
                    </Button>
                  )}
                </div>

                {order.delivery_evidence_url ? (
                  <div className="border rounded-lg p-4">
                    <img
                      src={order.delivery_evidence_url}
                      alt="Evidencia de entrega"
                      className="w-full h-auto rounded"
                    />
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <FileImage className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No hay evidencia de entrega disponible</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab: Historial */}
            <TabsContent value="history" className="mt-0">
              <OrderAuditHistory orderId={order.id} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>

    {/* Confirmation Dialog for Cancel Order */}
    <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar este pedido?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción cambiará el estado del pedido #{order?.order_number || order?.id?.toString().slice(0, 8)} a "Cancelado".
            Esta acción no se puede deshacer fácilmente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCancelling}>No, mantener</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancelOrder}
            disabled={isCancelling}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isCancelling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Cancelando...
              </>
            ) : (
              'Sí, cancelar pedido'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  )
}
