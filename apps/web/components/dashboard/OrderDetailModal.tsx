"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Package, Calendar, User, DollarSign, ShoppingBag } from "lucide-react"

interface OrderItem {
  id: string
  product: {
    id: string
    name: string
    weight?: string | null
    category?: string | null
  }
  quantity_requested: number
  quantity_delivered: number
  quantity_returned: number
  unit_price: number
}

interface Order {
  id: string
  order_number: string
  client: {
    id: string
    name: string
  }
  expected_delivery_date: string
  status: string
  total_value: number
  order_items: OrderItem[]
}

interface OrderDetailModalProps {
  order: Order | null
  isOpen: boolean
  onClose: () => void
}

export function OrderDetailModal({ order, isOpen, onClose }: OrderDetailModalProps) {
  if (!order) return null

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Get status configuration
  const getStatusConfig = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      'received': { label: 'Recibido', className: 'bg-blue-100 text-blue-800' },
      'review_area1': { label: 'Revisión 1', className: 'bg-yellow-100 text-yellow-800' },
      'review_area2': { label: 'Revisión 2', className: 'bg-yellow-100 text-yellow-800' },
      'ready_dispatch': { label: 'Listo', className: 'bg-purple-100 text-purple-800' },
      'dispatched': { label: 'Despachado', className: 'bg-indigo-100 text-indigo-800' },
      'in_delivery': { label: 'En Entrega', className: 'bg-orange-100 text-orange-800' },
      'delivered': { label: 'Entregado', className: 'bg-green-100 text-green-800' },
      'partially_delivered': { label: 'Parcial', className: 'bg-amber-100 text-amber-800' },
      'returned': { label: 'Devuelto', className: 'bg-red-100 text-red-800' }
    }
    return statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
  }

  const statusConfig = getStatusConfig(order.status)

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString + 'T00:00:00')
      return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Detalle del Pedido #{order.order_number}
          </DialogTitle>
          <DialogDescription>
            Resumen completo del pedido y sus productos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Cliente</p>
                <p className="text-sm font-semibold text-gray-900">{order.client.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Fecha de Entrega</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatDate(order.expected_delivery_date)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Estado</p>
                <Badge className={`${statusConfig.className} text-xs mt-1`} variant="secondary">
                  {statusConfig.label}
                </Badge>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Valor Total</p>
                <p className="text-sm font-bold text-green-600">{formatCurrency(order.total_value || 0)}</p>
              </div>
            </div>
          </div>

          {/* Order Items Table */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="h-5 w-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">Productos del Pedido</h3>
              <Badge variant="secondary" className="ml-auto">
                {order.order_items.length} producto{order.order_items.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Referencia</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Cant. Solicitada</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Cant. Entregada</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Cant. Devuelta</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Valor Unitario</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {order.order_items.map((item) => {
                    const totalItemValue = item.quantity_requested * item.unit_price
                    const productName = `${item.product.name}${item.product.weight ? ` ${item.product.weight}` : ''}`

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{productName}</div>
                          {item.product.category && (
                            <div className="text-xs text-gray-500">{item.product.category}</div>
                          )}
                        </td>
                        <td className="text-center py-3 px-4 font-semibold text-gray-900">
                          {item.quantity_requested.toLocaleString('es-CO')}
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className={`font-semibold ${item.quantity_delivered > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {item.quantity_delivered.toLocaleString('es-CO')}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          {item.quantity_returned > 0 ? (
                            <span className="font-semibold text-red-600">
                              {item.quantity_returned.toLocaleString('es-CO')}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-700">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="text-right py-3 px-4 font-bold text-gray-900">
                          {formatCurrency(totalItemValue)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={5} className="py-3 px-4 text-right font-bold text-gray-900">
                      Total del Pedido:
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-green-600 text-lg">
                      {formatCurrency(order.total_value || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-600 font-medium mb-1">Total Solicitado</p>
              <p className="text-xl font-bold text-blue-900">
                {order.order_items.reduce((sum, item) => sum + item.quantity_requested, 0).toLocaleString('es-CO')}
              </p>
            </div>

            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-600 font-medium mb-1">Total Entregado</p>
              <p className="text-xl font-bold text-green-900">
                {order.order_items.reduce((sum, item) => sum + item.quantity_delivered, 0).toLocaleString('es-CO')}
              </p>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600 font-medium mb-1">Total Devuelto</p>
              <p className="text-xl font-bold text-red-900">
                {order.order_items.reduce((sum, item) => sum + item.quantity_returned, 0).toLocaleString('es-CO')}
              </p>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-xs text-purple-600 font-medium mb-1">Productos</p>
              <p className="text-xl font-bold text-purple-900">
                {order.order_items.length}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
