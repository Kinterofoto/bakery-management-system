"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X, Package, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react"
import { usePurchaseOrders } from "@/hooks/use-purchase-orders"
import { useToast } from "@/components/ui/use-toast"

type PurchaseOrderDetailsDialogProps = {
  orderId: string
  onClose: () => void
}

const STATUS_CONFIG = {
  pending: {
    label: "Pendiente",
    color: "bg-orange-500/20 text-orange-600 border-orange-500/30",
    icon: Clock
  },
  ordered: {
    label: "Ordenado",
    color: "bg-blue-500/20 text-blue-600 border-blue-500/30",
    icon: Package
  },
  partially_received: {
    label: "Recibido Parcial",
    color: "bg-purple-500/20 text-purple-600 border-purple-500/30",
    icon: Package
  },
  received: {
    label: "Recibido",
    color: "bg-green-500/20 text-green-600 border-green-500/30",
    icon: CheckCircle2
  },
  cancelled: {
    label: "Cancelado",
    color: "bg-red-500/20 text-red-600 border-red-500/30",
    icon: XCircle
  }
}

export function PurchaseOrderDetailsDialog({ orderId, onClose }: PurchaseOrderDetailsDialogProps) {
  const {
    getPurchaseOrderById,
    updateOrderStatus,
    updateOrderItem,
    receiveFullOrder,
    cancelPurchaseOrder,
    getOrderCompletion
  } = usePurchaseOrders()
  const { toast } = useToast()

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({})

  useEffect(() => {
    loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    setLoading(true)
    const orderData = await getPurchaseOrderById(orderId)
    if (orderData) {
      setOrder(orderData)
      // Initialize received quantities
      const quantities: Record<string, number> = {}
      orderData.items?.forEach((item: any) => {
        quantities[item.id] = item.quantity_received || 0
      })
      setReceivedQuantities(quantities)
    }
    setLoading(false)
  }

  const handleUpdateStatus = async (newStatus: string) => {
    setSaving(true)
    const success = await updateOrderStatus(orderId, newStatus)

    if (success) {
      toast({
        title: "Estado actualizado",
        description: `La orden ha sido marcada como ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label.toLowerCase()}`,
      })
      await loadOrder()
    } else {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive"
      })
    }
    setSaving(false)
  }

  const handleReceiveItem = async (itemId: string, quantity: number) => {
    setSaving(true)
    const success = await updateOrderItem(itemId, { quantity_received: quantity })

    if (success) {
      toast({
        title: "Cantidad registrada",
        description: "La cantidad recibida ha sido actualizada",
      })
      await loadOrder()
    } else {
      toast({
        title: "Error",
        description: "No se pudo actualizar la cantidad",
        variant: "destructive"
      })
    }
    setSaving(false)
  }

  const handleReceiveFullOrder = async () => {
    setSaving(true)
    const success = await receiveFullOrder(orderId)

    if (success) {
      toast({
        title: "Orden recibida",
        description: "Todos los materiales han sido marcados como recibidos",
      })
      await loadOrder()
    } else {
      toast({
        title: "Error",
        description: "No se pudo recibir la orden completa",
        variant: "destructive"
      })
    }
    setSaving(false)
  }

  const handleCancelOrder = async () => {
    if (!confirm("¿Estás seguro de que deseas cancelar esta orden?")) return

    setSaving(true)
    const success = await cancelPurchaseOrder(orderId)

    if (success) {
      toast({
        title: "Orden cancelada",
        description: "La orden ha sido cancelada",
      })
      await loadOrder()
    } else {
      toast({
        title: "Error",
        description: "No se pudo cancelar la orden",
        variant: "destructive"
      })
    }
    setSaving(false)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No especificada'
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const isOverdue = () => {
    if (!order?.expected_delivery_date || order.status === 'received' || order.status === 'cancelled') {
      return false
    }
    const today = new Date().toISOString().split('T')[0]
    return order.expected_delivery_date < today
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="
          bg-white/90 dark:bg-black/80
          backdrop-blur-2xl
          border border-white/30 dark:border-white/15
          rounded-3xl
          shadow-2xl shadow-black/20
          p-8
          text-center
        ">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            Orden no encontrada
          </p>
          <Button onClick={onClose} className="mt-4">
            Cerrar
          </Button>
        </div>
      </div>
    )
  }

  const config = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
  const Icon = config.icon

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="
        bg-white/90 dark:bg-black/80
        backdrop-blur-2xl
        border border-white/30 dark:border-white/15
        rounded-3xl
        shadow-2xl shadow-black/20
        max-w-4xl
        w-full
        max-h-[90vh]
        overflow-hidden
      ">
        {/* Header */}
        <div className="
          bg-green-500
          px-6 py-4
          flex items-center justify-between
        ">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">
              Orden {order.order_number}
            </h2>
            <Badge className={`${config.color} backdrop-blur-md border flex items-center gap-1.5`}>
              <Icon className="w-3.5 h-3.5" />
              {config.label}
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="
              text-white
              hover:bg-white/20
              rounded-lg
              p-2
              transition-colors
            "
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">

          {/* Order Info */}
          <div className="
            bg-white/50 dark:bg-black/30
            backdrop-blur-md
            border border-white/30 dark:border-white/15
            rounded-xl
            p-6
          ">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Información de la Orden
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600 dark:text-gray-400">Proveedor</Label>
                <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                  {order.supplier?.company_name || 'N/A'}
                </p>
              </div>

              <div>
                <Label className="text-sm text-gray-600 dark:text-gray-400">Fecha de Orden</Label>
                <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                  {formatDate(order.order_date)}
                </p>
              </div>

              <div>
                <Label className="text-sm text-gray-600 dark:text-gray-400">Entrega Esperada</Label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {formatDate(order.expected_delivery_date)}
                  </p>
                  {isOverdue() && (
                    <Badge className="bg-red-500/20 text-red-600 border-red-500/30 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Vencida
                    </Badge>
                  )}
                </div>
              </div>

              {order.actual_delivery_date && (
                <div>
                  <Label className="text-sm text-gray-600 dark:text-gray-400">Entrega Real</Label>
                  <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                    {formatDate(order.actual_delivery_date)}
                  </p>
                </div>
              )}

              <div>
                <Label className="text-sm text-gray-600 dark:text-gray-400">Total</Label>
                <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                  ${order.total_amount?.toLocaleString('es-CO', { maximumFractionDigits: 0 }) || '0'}
                </p>
              </div>

              <div>
                <Label className="text-sm text-gray-600 dark:text-gray-400">Progreso de Recepción</Label>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 bg-gray-200/50 dark:bg-gray-700/50 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${getOrderCompletion(order)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {getOrderCompletion(order).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {order.notes && (
              <div className="mt-4">
                <Label className="text-sm text-gray-600 dark:text-gray-400">Notas</Label>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  {order.notes}
                </p>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="
            bg-white/50 dark:bg-black/30
            backdrop-blur-md
            border border-white/30 dark:border-white/15
            rounded-xl
            p-6
          ">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Materiales Ordenados
            </h3>

            <div className="space-y-3">
              {order.items?.map((item: any) => (
                <div
                  key={item.id}
                  className="
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border border-white/30 dark:border-white/15
                    rounded-lg
                    p-4
                  "
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {item.material?.name || 'Material Desconocido'}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Ordenado:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">
                            {item.quantity_ordered.toLocaleString('es-CO')}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Precio:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">
                            ${item.unit_price.toLocaleString('es-CO')}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                          <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
                            ${(item.quantity_ordered * item.unit_price).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {order.status !== 'cancelled' && order.status !== 'received' && (
                      <div className="flex items-center gap-2">
                        <div className="w-32">
                          <Label className="text-xs text-gray-600 dark:text-gray-400">Recibido</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max={item.quantity_ordered}
                            value={receivedQuantities[item.id] || 0}
                            onChange={(e) => setReceivedQuantities(prev => ({
                              ...prev,
                              [item.id]: parseFloat(e.target.value) || 0
                            }))}
                            className="
                              mt-1
                              bg-white/50 dark:bg-black/30
                              backdrop-blur-md
                              border-gray-200/50 dark:border-white/10
                              rounded-lg
                            "
                          />
                        </div>
                        <Button
                          onClick={() => handleReceiveItem(item.id, receivedQuantities[item.id])}
                          disabled={saving}
                          className="
                            mt-5
                            bg-green-500
                            text-white
                            rounded-lg
                            px-4
                            py-2
                            hover:bg-green-600
                          "
                        >
                          Registrar
                        </Button>
                      </div>
                    )}

                    {(order.status === 'received' || order.status === 'cancelled') && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          Recibido: {item.quantity_received?.toLocaleString('es-CO') || 0}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer - Actions */}
        <div className="
          bg-gray-50/50 dark:bg-white/5
          backdrop-blur-sm
          px-6 py-4
          flex flex-wrap justify-between gap-3
        ">
          <div className="flex gap-2">
            {order.status === 'pending' && (
              <Button
                onClick={() => handleUpdateStatus('ordered')}
                disabled={saving}
                className="
                  bg-blue-500
                  text-white
                  rounded-xl
                  px-4
                  hover:bg-blue-600
                "
              >
                <Package className="w-4 h-4 mr-2" />
                Marcar como Ordenada
              </Button>
            )}

            {(order.status === 'pending' || order.status === 'ordered' || order.status === 'partially_received') && (
              <>
                <Button
                  onClick={handleReceiveFullOrder}
                  disabled={saving}
                  className="
                    bg-green-500
                    text-white
                    rounded-xl
                    px-4
                    hover:bg-green-600
                  "
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Recibir Todo
                </Button>
                <Button
                  onClick={handleCancelOrder}
                  disabled={saving}
                  variant="ghost"
                  className="
                    bg-red-500/10
                    text-red-600
                    rounded-xl
                    px-4
                    hover:bg-red-500/20
                  "
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar Orden
                </Button>
              </>
            )}
          </div>

          <Button
            onClick={onClose}
            variant="ghost"
            className="
              bg-white/20 dark:bg-black/20
              backdrop-blur-md
              border border-white/30 dark:border-white/20
              rounded-xl
              hover:bg-white/30 dark:hover:bg-black/30
            "
          >
            Cerrar
          </Button>
        </div>

      </div>
    </div>
  )
}
