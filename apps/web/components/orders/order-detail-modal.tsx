"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { SearchableSelect } from "@/components/ui/searchable-select"
import { ExpressDeliveryModal } from "@/components/orders/express-delivery-modal"
import { useAuth } from "@/contexts/AuthContext"
import { Plus, X, Loader2, FileText, User, History, FileImage, Eye, Save, XCircle, Search, Navigation, Package as PackageIcon, Truck } from "lucide-react"

interface OrderDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: any | null
  isLoading?: boolean
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
  productConfigs: any[]
}

export function OrderDetailModal({
  open,
  onOpenChange,
  order,
  isLoading = false,
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
  productConfigs,
}: OrderDetailModalProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("info")
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showExpressDelivery, setShowExpressDelivery] = useState(false)

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
    // Add 'Z' to force UTC interpretation if not already present
    const utcDateString = dateString.endsWith('Z') ? dateString : dateString + 'Z'
    const dateObj = new Date(utcDateString)
    const formatted = dateObj.toLocaleString('es-CO')
    return formatted
  }

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

  // Loading state
  if (isLoading || !order) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] max-h-[95vh] p-0 gap-0">
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">Cargando pedido...</p>
          </div>
        </DialogContent>
      </Dialog>
    )
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

              {/* Action buttons - pr-10 to leave space for default close button */}
              <div className="flex items-center gap-2 flex-shrink-0 pr-10">
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
                    {/* Express Delivery Button - Super Admin Only */}
                    {user?.role === 'super_admin' && order.status !== 'delivered' && (
                      <Button
                        onClick={() => setShowExpressDelivery(true)}
                        disabled={isSubmitting || isCancelling}
                        className="gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <Truck className="h-4 w-4" />
                        <span className="hidden sm:inline">Entregar</span>
                      </Button>
                    )}
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
                    <SearchableSelect
                      options={clients.map(c => ({
                        value: c.id,
                        label: c.name,
                        subLabel: c.nit || c.email || undefined
                      }))}
                      value={editClientId}
                      onChange={(value) => {
                        setEditClientId(value)
                        setEditBranchId(null)
                      }}
                      placeholder="Buscar cliente..."
                      icon={<Search size={16} />}
                    />
                  ) : (
                    <Input value={order.client?.name || ""} disabled className="h-9" />
                  )}
                </div>

                {/* Sucursal */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Sucursal</Label>
                  {isEditMode ? (
                    <SearchableSelect
                      options={[
                        { value: "none", label: "Sin sucursal" },
                        ...getBranchesByClient(editClientId).map(b => ({
                          value: b.id,
                          label: b.name,
                          subLabel: b.address || undefined
                        }))
                      ]}
                      value={editBranchId || "none"}
                      onChange={(value) => setEditBranchId(value === "none" ? null : value)}
                      placeholder="Buscar sucursal..."
                      disabled={!editClientId}
                      icon={<Navigation size={16} />}
                    />
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

                <div className="space-y-3">
                  {editOrderItems.map((item, index) => {
                    const product = finishedProducts.find(p => p.id === item.product_id)
                    const productConfig = productConfigs.find(pc => pc.product_id === item.product_id)
                    const itemTotal = item.quantity_requested * item.unit_price
                    const totalUnits = productConfig?.units_per_package
                      ? item.quantity_requested * productConfig.units_per_package
                      : null

                    return (
                      <div key={index} className="border rounded-lg p-4 space-y-3 bg-gray-50/50">
                        {/* Primera fila: Producto y botón eliminar */}
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <SearchableSelect
                              options={finishedProducts
                                .filter(p => p.category === "PT")
                                .map(p => ({
                                  value: p.id,
                                  label: getProductDisplayName(p),
                                  subLabel: p.price ? `$${p.price.toLocaleString()}` : undefined
                                }))}
                              value={item.product_id}
                              onChange={(value) => {
                                const newItems = [...editOrderItems]
                                newItems[index].product_id = value
                                const selectedProduct = finishedProducts.find(p => p.id === value)
                                if (selectedProduct) {
                                  newItems[index].unit_price = selectedProduct.price || 0
                                }
                                setEditOrderItems(newItems)
                              }}
                              placeholder="Buscar producto..."
                              icon={<PackageIcon size={16} />}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => {
                              if (editOrderItems.length > 1) {
                                setEditOrderItems(editOrderItems.filter((_, i) => i !== index))
                              }
                            }}
                            disabled={editOrderItems.length === 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Segunda fila: Campos numéricos en grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {/* Cantidad de paquetes */}
                          <div>
                            <Label className="text-xs text-gray-600 mb-1.5 block">
                              Paquetes
                            </Label>
                            <Input
                              type="number"
                              value={item.quantity_requested}
                              onChange={(e) => {
                                const newItems = [...editOrderItems]
                                newItems[index].quantity_requested = parseInt(e.target.value) || 0
                                setEditOrderItems(newItems)
                              }}
                              min="1"
                              className="h-9 text-sm"
                            />
                          </div>

                          {/* Unidades totales (calculado) */}
                          <div>
                            <Label className="text-xs text-gray-600 mb-1.5 block">
                              Unidades
                            </Label>
                            <div className="h-9 px-3 flex items-center bg-blue-50 border border-blue-200 rounded-md text-sm font-medium text-blue-700">
                              {totalUnits !== null ? totalUnits.toLocaleString() : '-'}
                            </div>
                          </div>

                          {/* Precio unitario (solo lectura) */}
                          <div>
                            <Label className="text-xs text-gray-600 mb-1.5 block">
                              Precio
                            </Label>
                            <div className="h-9 px-3 flex items-center bg-gray-100 border rounded-md text-sm font-medium text-gray-700">
                              ${item.unit_price.toLocaleString()}
                            </div>
                          </div>

                          {/* Total */}
                          <div>
                            <Label className="text-xs text-gray-600 mb-1.5 block">
                              Total
                            </Label>
                            <div className="h-9 px-3 flex items-center bg-green-50 border border-green-200 rounded-md text-sm font-semibold text-green-700">
                              ${itemTotal.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
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

        {/* Footer fijo con total */}
        <div className="border-t bg-white px-6 py-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-gray-700">Total del Pedido:</span>
            <span className="text-2xl font-bold text-green-600">
              ${calculateOrderTotal(editOrderItems).toLocaleString()}
            </span>
          </div>
        </div>
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

    {/* Express Delivery Modal - Super Admin Only */}
    <ExpressDeliveryModal
      open={showExpressDelivery}
      onOpenChange={setShowExpressDelivery}
      order={order}
      onDeliveryComplete={() => {
        setShowExpressDelivery(false)
        onOpenChange(false)
        window.location.reload()
      }}
    />
  </>
  )
}
