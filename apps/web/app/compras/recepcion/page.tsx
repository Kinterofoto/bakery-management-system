"use client"

import { useState, useMemo } from "react"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { useMaterialReception } from "@/hooks/use-material-reception"
import { usePurchaseOrders } from "@/hooks/use-purchase-orders"
import { useSuppliers } from "@/hooks/use-suppliers"
import { useProducts } from "@/hooks/use-products"
import {
  Package,
  Plus,
  Clock,
  AlertCircle,
  Calendar,
  X,
  ChevronDown,
  CheckCircle2,
  Edit2,
  Trash2
} from "lucide-react"

export default function RecepcionPage() {
  const { receptions, createReception, updateReception, updateReceptionItem, deleteReception, loading: loadingReceptions, getTodayReceptions, fetchReceptions } = useMaterialReception()
  const { purchaseOrders } = usePurchaseOrders()
  const { suppliers } = useSuppliers()
  const { products } = useProducts()

  const [showTypeSelection, setShowTypeSelection] = useState(false)
  const [receptionType, setReceptionType] = useState<'order' | 'direct' | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [receptionItems, setReceptionItems] = useState<Array<any>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedReception, setSelectedReception] = useState<any>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

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

    // Validations based on reception type
    if (receptionType === 'order') {
      if (!selectedOrderId) {
        setFormError('Selecciona una orden de compra')
        return
      }
    }

    if (receptionItems.length === 0) {
      setFormError('No hay materiales para recibir')
      return
    }

    if (receptionItems.some(item => !item.batch_number)) {
      setFormError('Todos los materiales deben tener un número de lote')
      return
    }

    if (receptionType === 'direct') {
      if (receptionItems.some(item => !item.material_id)) {
        setFormError('Todos los materiales deben estar seleccionados')
        return
      }
      if (receptionItems.some(item => item.quantity_received <= 0)) {
        setFormError('Todas las cantidades deben ser mayores a cero')
        return
      }
    }

    try {
      setIsSubmitting(true)

      if (receptionType === 'order') {
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
          notes: null
        })
      } else {
        // Direct reception
        await createReception({
          type: 'direct',
          purchase_order_id: null,
          supplier_id: null,
          items: receptionItems.map(item => ({
            purchase_order_item_id: null,
            material_id: item.material_id,
            quantity_received: item.quantity_received,
            batch_number: item.batch_number,
            expiry_date: item.expiry_date || null,
            notes: item.notes || null
          })),
          notes: null
        })
      }

      setFormData({
        selectedOrderId: '',
        receptionItems: []
      })
      setShowForm(false)
      setReceptionType(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear la recepción')
    } finally {
      setIsSubmitting(false)
    }
  }

  const setFormData = (data: any) => {
    setSelectedOrderId(data.selectedOrderId)
    setReceptionItems(data.receptionItems)
    setFormError(null)
  }

  const openEditForm = (reception: any) => {
    setSelectedReception(reception)
    setEditError(null)
    setShowEditForm(true)
  }

  const closeEditForm = () => {
    setShowEditForm(false)
    setSelectedReception(null)
    setEditError(null)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedReception) return

    try {
      setEditError(null)
      setIsSubmitting(true)

      const updateData: any = {}

      // Always include notes (even if empty)
      updateData.notes = selectedReception.notes || null

      console.log('Update data:', updateData, 'Reception notes:', selectedReception.notes)

      // Update reception items if they were modified
      if (selectedReception.items && selectedReception.items.length > 0) {
        for (const item of selectedReception.items) {
          if (item.id) {
            const itemUpdate: any = {}
            if (item.quantity_received !== undefined) itemUpdate.quantity_received = item.quantity_received
            if (item.batch_number !== undefined) itemUpdate.batch_number = item.batch_number
            if (item.expiry_date !== undefined) itemUpdate.expiry_date = item.expiry_date
            if (item.notes !== undefined) itemUpdate.notes = item.notes

            if (Object.keys(itemUpdate).length > 0) {
              await updateReceptionItem(item.id, itemUpdate)
            }
          }
        }
      }

      // Update reception header
      if (Object.keys(updateData).length > 0) {
        await updateReception(selectedReception.id, updateData)
      } else {
        // Even if no fields changed, refresh the data
        await fetchReceptions()
      }

      closeEditForm()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Error al actualizar la recepción')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteReception = async (receptionId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta recepción?')) return

    try {
      await deleteReception(receptionId)
    } catch (err) {
      alert('Error al eliminar: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    }
  }

  const updateEditItemField = (index: number, field: string, value: any) => {
    if (!selectedReception) return
    const updated = [...(selectedReception.items || [])]
    updated[index] = { ...updated[index], [field]: value }
    setSelectedReception({ ...selectedReception, items: updated })
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
              onClick={() => setShowTypeSelection(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-md shadow-blue-600/30 hover:shadow-lg hover:shadow-blue-600/40 active:scale-95 transition-all duration-150"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Nueva</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-6">
          {/* Today's Summary */}
          <div className="bg-blue-500/10 dark:bg-blue-500/5 backdrop-blur-xl border border-blue-500/30 dark:border-blue-500/40 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/15 rounded-lg p-2">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Recepciones Hoy</p>
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
                    className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl p-4 hover:shadow-lg hover:bg-white/80 dark:hover:bg-black/60 transition-all duration-200"
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditForm(reception)}
                          className="p-2 hover:bg-blue-500/20 rounded-lg transition-all duration-150 text-blue-600 dark:text-blue-400 hover:scale-105 active:scale-95"
                          title="Editar recepción"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteReception(reception.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-all duration-150 text-red-600 dark:text-red-400 hover:scale-105 active:scale-95"
                          title="Eliminar recepción"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                    </div>

                    {/* Reception Items */}
                    {reception.items && reception.items.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                        {reception.items.map((item: any, idx: number) => (
                          <div key={idx} className="text-sm">
                            <div className="flex justify-between items-start">
                              <span className="text-gray-900 dark:text-white font-medium">
                                {item.material_name || 'Desconocido'}
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

        {/* Type Selection Modal */}
        {showTypeSelection && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-black/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl w-full max-w-2xl p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Selecciona el Tipo de Recepción
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Elige cómo deseas registrar la entrada de materiales
                </p>
              </div>

              {/* Selection Buttons */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Purchase Order Button */}
                <button
                  onClick={() => {
                    setReceptionType('order')
                    setShowTypeSelection(false)
                    setShowForm(true)
                  }}
                  className="group relative bg-gradient-to-br from-blue-500/10 to-blue-600/5 hover:from-blue-500/20 hover:to-blue-600/10 border-2 border-blue-500/30 hover:border-blue-500/50 rounded-2xl p-8 transition-all duration-300 hover:scale-105 active:scale-100"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-blue-500/20 group-hover:bg-blue-500/30 rounded-2xl p-6 transition-colors">
                      <Package className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Recibir Orden
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Registra materiales de una orden de compra existente
                      </p>
                    </div>
                  </div>
                </button>

                {/* Direct Reception Button */}
                <button
                  onClick={() => {
                    setReceptionType('direct')
                    setShowTypeSelection(false)
                    setShowForm(true)
                  }}
                  className="group relative bg-gradient-to-br from-green-500/10 to-green-600/5 hover:from-green-500/20 hover:to-green-600/10 border-2 border-green-500/30 hover:border-green-500/50 rounded-2xl p-8 transition-all duration-300 hover:scale-105 active:scale-100"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-green-500/20 group-hover:bg-green-500/30 rounded-2xl p-6 transition-colors">
                      <Package className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Recepción Directa
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Registra materiales sin orden de compra
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Cancel Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    setShowTypeSelection(false)
                    setReceptionType(null)
                  }}
                  className="px-6 py-3 rounded-xl border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-150"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Form */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-black/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-white/20 dark:border-white/10 p-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {receptionType === 'order' ? 'Nueva Recepción de Orden' : 'Nueva Recepción Directa'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setReceptionType(null)
                    setFormError(null)
                    setFormData({
                      selectedOrderId: '',
                      receptionItems: []
                    })
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Error Alert */}
                {formError && (
                  <div className="bg-red-500/10 dark:bg-red-500/5 backdrop-blur-xl border border-red-500/30 dark:border-red-500/40 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">{formError}</p>
                  </div>
                )}

                {/* Purchase Order Reception Form */}
                {receptionType === 'order' && (
                  <>
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
                    <h4 className="font-semibold text-gray-900 dark:text-white text-base">Materiales a Recibir</h4>
                    <div className="space-y-3">
                      {receptionItems.map((item, index) => (
                        <div
                          key={index}
                          className="bg-white/30 dark:bg-black/20 backdrop-blur-md border border-white/30 dark:border-white/20 rounded-lg p-4 space-y-3"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">{item.material_name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Solicitado: {item.quantity_ordered} {item.material_unit}
                              </p>
                            </div>
                          </div>

                          {/* Quantity to Receive */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                              Cantidad a Recibir *
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.quantity_received}
                                onChange={(e) => updateItemField(index, 'quantity_received', parseFloat(e.target.value) || 0)}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-black transition-all duration-150"
                                placeholder="0"
                                required
                              />
                              <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                {item.material_unit}
                              </span>
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
                              className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-black transition-all duration-150"
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
                              className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-black transition-all duration-150"
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
                              className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-black transition-all duration-150"
                              placeholder="Notas adicionales"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                  </>
                )}

                {/* Direct Reception Form */}
                {receptionType === 'direct' && (
                  <>
                    {/* Material Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Materiales a Recibir *
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setReceptionItems([...receptionItems, {
                              material_id: '',
                              material_name: '',
                              material_unit: '',
                              quantity_received: 0,
                              batch_number: '',
                              expiry_date: '',
                              notes: ''
                            }])
                          }}
                          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                          <Plus className="w-4 h-4" />
                          Agregar Material
                        </button>
                      </div>

                      {receptionItems.length === 0 && (
                        <div className="bg-white/30 dark:bg-black/20 backdrop-blur-md border border-white/30 dark:border-white/20 rounded-lg p-6 text-center">
                          <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Haz clic en "Agregar Material" para empezar
                          </p>
                        </div>
                      )}

                      {/* Reception Items for Direct */}
                      {receptionItems.length > 0 && (
                        <div className="space-y-3">
                          {receptionItems.map((item, index) => (
                            <div
                              key={index}
                              className="bg-white/30 dark:bg-black/20 backdrop-blur-md border border-white/30 dark:border-white/20 rounded-lg p-4 space-y-3"
                            >
                              {/* Header with delete button */}
                              <div className="flex items-center justify-between">
                                <h5 className="font-medium text-gray-900 dark:text-white">Material {index + 1}</h5>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = receptionItems.filter((_, i) => i !== index)
                                    setReceptionItems(updated)
                                  }}
                                  className="p-1 hover:bg-red-500/20 rounded-lg transition-colors text-red-600 dark:text-red-400"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Material Selection */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                                  Material *
                                </label>
                                <select
                                  value={item.material_id}
                                  onChange={(e) => {
                                    const selectedProduct = products.find(p => p.id === e.target.value)
                                    updateItemField(index, 'material_id', e.target.value)
                                    updateItemField(index, 'material_name', selectedProduct?.name || '')
                                    updateItemField(index, 'material_unit', selectedProduct?.unit || '')
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                                  required
                                >
                                  <option value="">Selecciona un material</option>
                                  {products
                                    .filter(p => p.category === 'raw_material')
                                    .map((product) => (
                                      <option key={product.id} value={product.id}>
                                        {product.name} ({product.unit})
                                      </option>
                                    ))}
                                </select>
                              </div>

                              {/* Quantity */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                                  Cantidad Recibida *
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.quantity_received}
                                    onChange={(e) => updateItemField(index, 'quantity_received', parseFloat(e.target.value) || 0)}
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                                    placeholder="0"
                                    required
                                  />
                                  <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                    {item.material_unit || '-'}
                                  </span>
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
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                                  placeholder="Número de lote"
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
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
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
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                                  placeholder="Notas adicionales"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </form>

              {/* Footer */}
              <div className="bg-white/40 dark:bg-white/5 backdrop-blur-md px-6 py-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setFormError(null)
                    setFormData({
                      selectedOrderId: '',
                      receptionItems: []
                    })
                  }}
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-lg border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-150 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !selectedOrderId || receptionItems.length === 0}
                  className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-md shadow-blue-600/30 hover:shadow-lg hover:shadow-blue-600/40 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creando...' : 'Crear Recepción'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal Form */}
        {showEditForm && selectedReception && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-black/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-white/20 dark:border-white/10 p-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Editar Recepción: {selectedReception.reception_number}</h3>
                <button
                  onClick={closeEditForm}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                {/* Error Alert */}
                {editError && (
                  <div className="bg-red-500/10 dark:bg-red-500/5 backdrop-blur-xl border border-red-500/30 dark:border-red-500/40 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">{editError}</p>
                  </div>
                )}

                {/* Reception Info */}
                <div className="bg-white/30 dark:bg-black/20 backdrop-blur-md border border-white/30 dark:border-white/20 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Número de Recepción</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedReception.reception_number}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Fecha</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {new Date(selectedReception.reception_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Recibido</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedReception.quantity_received}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Materiales</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedReception.items?.length || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Reception Items */}
                {selectedReception.items && selectedReception.items.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-base">Materiales Recibidos</h4>
                    <div className="space-y-3">
                      {selectedReception.items.map((item: any, index: number) => (
                        <div
                          key={index}
                          className="bg-white/30 dark:bg-black/20 backdrop-blur-md border border-white/30 dark:border-white/20 rounded-lg p-4 space-y-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Material</p>
                            <p className="text-gray-900 dark:text-white font-semibold">{item.material_name || 'Desconocido'}</p>
                          </div>

                          {/* Quantity Received */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                              Cantidad Recibida
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.quantity_received}
                              onChange={(e) => updateEditItemField(index, 'quantity_received', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-black transition-all duration-150"
                            />
                          </div>

                          {/* Batch Number */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                              Lote
                            </label>
                            <input
                              type="text"
                              value={item.batch_number || ''}
                              onChange={(e) => updateEditItemField(index, 'batch_number', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-black transition-all duration-150"
                            />
                          </div>

                          {/* Expiry Date */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                              Fecha de Vencimiento
                            </label>
                            <input
                              type="date"
                              value={item.expiry_date || ''}
                              onChange={(e) => updateEditItemField(index, 'expiry_date', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-black transition-all duration-150"
                            />
                          </div>

                          {/* Notes */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">
                              Notas
                            </label>
                            <input
                              type="text"
                              value={item.notes || ''}
                              onChange={(e) => updateEditItemField(index, 'notes', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-black transition-all duration-150"
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
                    value={selectedReception.notes || ''}
                    onChange={(e) => setSelectedReception({ ...selectedReception, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                    placeholder="Información adicional sobre la recepción..."
                  />
                </div>
              </form>

              {/* Footer */}
              <div className="bg-white/40 dark:bg-white/5 backdrop-blur-md px-6 py-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditForm}
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-lg border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-150 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  onClick={handleEditSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-md shadow-blue-600/30 hover:shadow-lg hover:shadow-blue-600/40 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RouteGuard>
  )
}
