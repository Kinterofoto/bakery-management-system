"use client"

import { useState, useMemo } from "react"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { useMaterialReception } from "@/hooks/use-material-reception"
import { usePurchaseOrders } from "@/hooks/use-purchase-orders"
import { useSuppliers } from "@/hooks/use-suppliers"
import {
  Package,
  Plus,
  Clock,
  AlertCircle,
  Calendar,
  X,
  ChevronDown,
  CheckCircle2
} from "lucide-react"

export default function RecepcionPage() {
  const { receptions, createReception, loading: loadingReceptions, getTodayReceptions } = useMaterialReception()
  const { purchaseOrders } = usePurchaseOrders()
  const { suppliers } = useSuppliers()

  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [receptionItems, setReceptionItems] = useState<Array<any>>([])
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-fetch purchase order items when order is selected
  const selectedOrder = purchaseOrders.find(o => o.id === selectedOrderId)
  const orderItems = useMemo(() => {
    if (!selectedOrder?.items) return []
    return selectedOrder.items.map((item: any) => ({
      purchase_order_item_id: item.id,
      material_id: item.material_id,
      material_name: item.material?.name || 'Desconocido',
      material_unit: item.material?.unit || '',
      quantity_ordered: item.quantity_ordered,
      quantity_received: item.quantity_ordered,
      batch_number: '',
      expiry_date: '',
      notes: ''
    }))
  }, [selectedOrder])

  // When order changes, auto-populate reception items
  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId)
    if (orderId) {
      const order = purchaseOrders.find(o => o.id === orderId)
      if (order?.items) {
        setReceptionItems(order.items.map((item: any) => ({
          purchase_order_item_id: item.id,
          material_id: item.material_id,
          material_name: item.material?.name || 'Desconocido',
          material_unit: item.material?.unit || '',
          quantity_ordered: item.quantity_ordered,
          quantity_received: item.quantity_ordered,
          batch_number: '',
          expiry_date: '',
          notes: ''
        })))
      }
    } else {
      setReceptionItems([])
    }
  }

  const updateItemField = (index: number, field: string, value: any) => {
    const updated = [...receptionItems]
    updated[index] = { ...updated[index], [field]: value }
    setReceptionItems(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!selectedOrderId) {
      setFormError('Selecciona una orden de compra')
      return
    }

    if (receptionItems.length === 0) {
      setFormError('No hay materiales para recibir')
      return
    }

    if (receptionItems.some(item => !item.batch_number)) {
      setFormError('Todos los materiales deben tener un número de lote')
      return
    }

    try {
      setIsSubmitting(true)

      await createReception({
        type: 'purchase_order',
        purchase_order_id: selectedOrderId,
        supplier_id: selectedOrder?.supplier_id,
        items: receptionItems.map(item => ({
          purchase_order_item_id: item.purchase_order_item_id,
          material_id: item.material_id,
          quantity_received: item.quantity_received,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date || null,
          notes: item.notes || null
        })),
        notes: notes || null
      })

      setFormData({
        selectedOrderId: '',
        receptionItems: [],
        notes: ''
      })
      setShowForm(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear la recepción')
    } finally {
      setIsSubmitting(false)
    }
  }

  const setFormData = (data: any) => {
    setSelectedOrderId(data.selectedOrderId)
    setReceptionItems(data.receptionItems)
    setNotes(data.notes)
    setFormError(null)
  }

  const todayReceptions = getTodayReceptions()
  const pendingOrders = purchaseOrders.filter(o => o.status !== 'received' && o.status !== 'cancelled')

  if (loadingReceptions) {
    return (
      <RouteGuard>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        {/* Header */}
        <div className="sticky top-0 bg-white/70 dark:bg-black/50 backdrop-blur-xl border-b border-white/20 dark:border-white/10 p-4 md:p-6 z-20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">
                Recepción de Materiales
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Registra la entrada de materiales al inventario
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Nueva</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-6">
          {/* Today's Summary */}
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Recepciones Hoy</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{todayReceptions.length}</p>
              </div>
            </div>
          </div>

          {/* Recent Receptions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Últimas Recepciones</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">{receptions.length} total</span>
            </div>

            {receptions.length === 0 ? (
              <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-8 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">No hay recepciones registradas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {receptions.slice(0, 10).map((reception) => (
                  <div
                    key={reception.id}
                    className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl p-4 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {reception.reception_number}
                          </p>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-700 dark:text-green-300">
                            Orden: {reception.purchase_order?.order_number || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(reception.reception_date).toLocaleDateString()}
                          </span>
                          <span>{reception.items?.length || 0} materiales</span>
                        </div>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>

                    {/* Reception Items */}
                    {reception.items && reception.items.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                        {reception.items.map((item: any, idx: number) => (
                          <div key={idx} className="text-sm">
                            <div className="flex justify-between items-start">
                              <span className="text-gray-900 dark:text-white font-medium">
                                {/* Material name would go here */}
                                {item.material_id}
                              </span>
                              <span className="text-gray-600 dark:text-gray-400">
                                {item.quantity_received}
                              </span>
                            </div>
                            {item.batch_number && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                Lote: {item.batch_number}
                                {item.expiry_date && ` - Vto: ${item.expiry_date}`}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Form */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-black/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-white/20 dark:border-white/10 p-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nueva Recepción de Orden</h3>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setFormError(null)
                    setFormData({
                      selectedOrderId: '',
                      receptionItems: [],
                      notes: ''
                    })
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Error Alert */}
                {formError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">{formError}</p>
                  </div>
                )}

                {/* Order Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Orden de Compra *
                  </label>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => handleOrderChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecciona una orden de compra</option>
                    {pendingOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.order_number} - {order.supplier?.company_name} ({order.items?.length || 0} materiales)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reception Items */}
                {receptionItems.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Materiales a Recibir</h4>
                    <div className="space-y-4">
                      {receptionItems.map((item, index) => (
                        <div
                          key={index}
                          className="bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-white/20 dark:border-white/10 rounded-lg p-4 space-y-3"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{item.material_name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Cantidad: {item.quantity_received} {item.material_unit}
                              </p>
                            </div>
                          </div>

                          {/* Batch Number */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                              Lote *
                            </label>
                            <input
                              type="text"
                              value={item.batch_number}
                              onChange={(e) => updateItemField(index, 'batch_number', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm"
                              placeholder="Número de lote del proveedor"
                              required
                            />
                          </div>

                          {/* Expiry Date */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                              Fecha de Vencimiento
                            </label>
                            <input
                              type="date"
                              value={item.expiry_date}
                              onChange={(e) => updateItemField(index, 'expiry_date', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm"
                            />
                          </div>

                          {/* Notes */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                              Notas
                            </label>
                            <input
                              type="text"
                              value={item.notes}
                              onChange={(e) => updateItemField(index, 'notes', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm"
                              placeholder="Notas adicionales"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* General Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notas Generales
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                    placeholder="Información adicional sobre la recepción..."
                  />
                </div>
              </form>

              {/* Footer */}
              <div className="bg-gray-50/50 dark:bg-white/5 backdrop-blur-sm px-6 py-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setFormError(null)
                    setFormData({
                      selectedOrderId: '',
                      receptionItems: [],
                      notes: ''
                    })
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !selectedOrderId || receptionItems.length === 0}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creando...' : 'Crear Recepción'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RouteGuard>
  )
}
