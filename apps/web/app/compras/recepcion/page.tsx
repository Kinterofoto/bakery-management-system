"use client"

import { useState, useMemo } from "react"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { useMaterialReception, type ReceptionQualityParameters, type ItemQualityParameters } from "@/hooks/use-material-reception"
import { usePurchaseOrders } from "@/hooks/use-purchase-orders"
import { useSuppliers } from "@/hooks/use-suppliers"
import { useProducts } from "@/hooks/use-products"
import { DatePicker } from "@/components/ui/date-picker"
import { format } from "date-fns"
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
  Trash2,
  Camera,
  Thermometer,
  Eye,
  CheckCircle
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
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  const [itemQualityParams, setItemQualityParams] = useState<Record<number, ItemQualityParameters>>({})
  const [receptionQualityParams, setReceptionQualityParams] = useState<ReceptionQualityParameters>({})
  const [generalQualityExpanded, setGeneralQualityExpanded] = useState(false)
  const [showQualityModal, setShowQualityModal] = useState(false)
  const [selectedQualityData, setSelectedQualityData] = useState<any>(null)

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
      expiry_date: ''
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
          expiry_date: ''
        })))
        // Expand first item by default
        setExpandedItems(new Set([0]))
      }
    } else {
      setReceptionItems([])
      setExpandedItems(new Set())
    }
  }

  const updateItemField = (index: number, field: string, value: any, shouldCollapse: boolean = false) => {
    const updated = [...receptionItems]
    updated[index] = { ...updated[index], [field]: value }
    setReceptionItems(updated)

    // Only collapse when explicitly requested (e.g., when date is selected)
    if (shouldCollapse) {
      const newExpanded = new Set(expandedItems)
      newExpanded.delete(index)
      setExpandedItems(newExpanded)
    }
  }

  const isItemComplete = (item: any) => {
    if (receptionType === 'order') {
      return item.quantity_received > 0 && item.batch_number && item.batch_number.trim() !== ''
    } else {
      return item.material_id && item.quantity_received > 0 && item.batch_number && item.batch_number.trim() !== ''
    }
  }

  const toggleItemExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedItems(newExpanded)
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

    // Validate temperature is present for all items
    const missingTempIndexes: number[] = []
    for (let i = 0; i < receptionItems.length; i++) {
      if (!itemQualityParams[i]?.temperature) {
        missingTempIndexes.push(i)
      }
    }

    if (missingTempIndexes.length > 0) {
      // Expand the first accordion missing temperature
      setExpandedItems(new Set([missingTempIndexes[0]]))
      setFormError(`Falta la temperatura del producto en ${missingTempIndexes.length} material(es). Revisa los campos marcados en rojo.`)
      return
    }

    try {
      setIsSubmitting(true)

      if (receptionType === 'order') {
        await createReception({
          type: 'purchase_order',
          purchase_order_id: selectedOrderId,
          supplier_id: selectedOrder?.supplier_id,
          items: receptionItems.map((item, index) => ({
            purchase_order_item_id: item.purchase_order_item_id,
            material_id: item.material_id,
            quantity_received: item.quantity_received,
            batch_number: item.batch_number,
            expiry_date: item.expiry_date || null,
            notes: null,
            quality_parameters: {
              temperature: itemQualityParams[index]?.temperature || 0
            }
          })),
          reception_quality: receptionQualityParams,
          notes: null
        })
      } else {
        // Direct reception
        await createReception({
          type: 'specific_material',
          purchase_order_id: null,
          supplier_id: null,
          items: receptionItems.map((item, index) => ({
            purchase_order_item_id: null,
            material_id: item.material_id,
            quantity_received: item.quantity_received,
            batch_number: item.batch_number,
            expiry_date: item.expiry_date || null,
            notes: null,
            quality_parameters: {
              temperature: itemQualityParams[index]?.temperature || 0
            }
          })),
          reception_quality: receptionQualityParams,
          notes: null
        })
      }

      setFormData({
        selectedOrderId: '',
        receptionItems: []
      })
      setItemQualityParams({})
      setReceptionQualityParams({})
      setGeneralQualityExpanded(false)
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

          {/* Compact DataTable */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recepciones</h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">{receptions.length} total</span>
            </div>

            {receptions.length === 0 ? (
              <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg p-8 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">No hay recepciones</p>
              </div>
            ) : (
              <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/80 dark:bg-white/5 border-b border-gray-200/50 dark:border-white/10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Movimiento</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Material</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Cantidad</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Lote</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Vencimiento</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Calidad</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {receptions.slice(0, 50).flatMap((reception) =>
                        reception.items?.map((item: any, idx: number) => (
                          <tr key={`${reception.id}-${idx}`} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors group">
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-xs font-mono font-semibold text-blue-700 dark:text-blue-300">
                                {reception.reception_number}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800/50 text-xs text-gray-700 dark:text-gray-300 font-medium">
                                <Calendar className="w-3 h-3" />
                                {new Date(reception.reception_date).toLocaleDateString('es-ES', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: '2-digit'
                                })}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Package className="w-3.5 h-3.5 text-purple-500" />
                                <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                  {item.material_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-500/15 border border-green-500/30 text-xs font-bold text-green-700 dark:text-green-300">
                                {item.quantity_received} {item.unit}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {item.batch_number ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-xs font-mono font-semibold text-amber-700 dark:text-amber-300">
                                  {item.batch_number}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {item.expiry_date ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs font-semibold text-rose-700 dark:text-rose-300">
                                  {new Date(item.expiry_date).toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: '2-digit'
                                  })}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {item.quality_parameters ? (
                                <button
                                  onClick={() => {
                                    setSelectedQualityData(item)
                                    setShowQualityModal(true)
                                  }}
                                  className="p-1.5 hover:bg-purple-500/30 rounded-lg transition-all text-purple-600 dark:text-purple-400 hover:scale-110 active:scale-95"
                                  title="Ver Calidad"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {idx === 0 && (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => openEditForm(reception)}
                                    className="p-1.5 hover:bg-blue-500/30 rounded-lg transition-all text-blue-600 dark:text-blue-400 hover:scale-110 active:scale-95"
                                    title="Editar"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteReception(reception.id)}
                                    className="p-1.5 hover:bg-red-500/30 rounded-lg transition-all text-red-600 dark:text-red-400 hover:scale-110 active:scale-95"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )) || []
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Type Selection Modal */}
        {showTypeSelection && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowTypeSelection(false)
                setReceptionType(null)
              }
            }}
          >
            <div
              className="
                bg-white dark:bg-black/90
                backdrop-blur-xl
                w-full md:max-w-2xl
                rounded-t-[2rem] md:rounded-3xl
                animate-slide-up md:animate-none
                max-h-[85vh] md:max-h-none
                overflow-y-auto
                border-t border-white/20 dark:border-white/10 md:border
              "
            >
              {/* Header - Mobile style with title left and X right */}
              <div className="sticky top-0 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                    Selecciona el Tipo de Recepción
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 hidden md:block">
                    Elige cómo deseas registrar la entrada de materiales
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowTypeSelection(false)
                    setReceptionType(null)
                  }}
                  className="
                    p-2 rounded-full
                    hover:bg-gray-100 dark:hover:bg-white/10
                    transition-colors
                    flex-shrink-0
                  "
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Purchase Order Button */}
                <button
                  onClick={() => {
                    setReceptionType('order')
                    setShowTypeSelection(false)
                    setShowForm(true)
                  }}
                  className="
                    w-full text-left
                    bg-gray-100/80 dark:bg-white/5
                    hover:bg-gray-200/80 dark:hover:bg-white/10
                    rounded-2xl p-6
                    transition-all duration-200
                    active:scale-[0.98]
                    border border-gray-200/50 dark:border-white/10
                  "
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-500/20 rounded-xl p-4 flex-shrink-0">
                      <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
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
                  className="
                    w-full text-left
                    bg-gray-100/80 dark:bg-white/5
                    hover:bg-gray-200/80 dark:hover:bg-white/10
                    rounded-2xl p-6
                    transition-all duration-200
                    active:scale-[0.98]
                    border border-gray-200/50 dark:border-white/10
                  "
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-green-500/20 rounded-xl p-4 flex-shrink-0">
                      <Package className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        Recepción Directa
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Registra materiales sin orden de compra
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Safe area for mobile bottom */}
              <div className="h-8 md:hidden" />
            </div>
          </div>
        )}

        {/* Modal Form */}
        {showForm && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center md:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowForm(false)
                setReceptionType(null)
                setFormError(null)
                setFormData({
                  selectedOrderId: '',
                  receptionItems: []
                })
                setItemQualityParams({})
                setReceptionQualityParams({})
                setGeneralQualityExpanded(false)
              }
            }}
          >
            <div
              className="
                bg-white dark:bg-black/90
                backdrop-blur-xl
                w-full md:max-w-2xl
                rounded-t-[2rem] md:rounded-3xl
                animate-slide-up md:animate-none
                max-h-[90vh]
                overflow-hidden
                flex flex-col
                border-t border-white/20 dark:border-white/10 md:border
              "
            >
              {/* Header - Sticky */}
              <div className="sticky top-0 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 p-6 flex items-center justify-between z-10">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
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
                    setItemQualityParams({})
                    setReceptionQualityParams({})
                    setGeneralQualityExpanded(false)
                  }}
                  className="
                    p-2 rounded-full
                    hover:bg-gray-100 dark:hover:bg-white/10
                    transition-colors
                    flex-shrink-0
                  "
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
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

                {/* General Quality Parameters Section - Collapsible */}
                {receptionItems.length > 0 && (
                  <div className="mb-4">
                    <div
                      className={`
                        rounded-xl border-2 transition-all duration-200
                        ${generalQualityExpanded
                          ? 'bg-purple-50/80 dark:bg-purple-900/20 border-purple-500/50 shadow-lg shadow-purple-500/10'
                          : 'bg-white/30 dark:bg-black/20 border-purple-500/30'
                        }
                      `}
                    >
                      <button
                        type="button"
                        onClick={() => setGeneralQualityExpanded(!generalQualityExpanded)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Camera className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Parámetros Generales de Calidad</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                              Aplicables a toda la recepción
                            </p>
                          </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${generalQualityExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      {generalQualityExpanded && (
                        <div className="px-4 pb-4 space-y-3 border-t border-purple-200/50 dark:border-purple-700/50 pt-3">
                          {/* Vehicle Temperature (OPTIONAL) */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Temperatura del Vehículo (°C)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={receptionQualityParams.vehicle_temperature || ''}
                              onChange={(e) => {
                                setReceptionQualityParams({
                                  ...receptionQualityParams,
                                  vehicle_temperature: parseFloat(e.target.value) || null
                                })
                              }}
                              className="w-full px-3 py-2.5 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              placeholder="Ej: 5.0"
                            />
                          </div>

                          {/* Certificate Upload */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Certificado de Calidad (Foto)
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  setReceptionQualityParams({
                                    ...receptionQualityParams,
                                    certificate_file: file
                                  })
                                }
                              }}
                              className="hidden"
                              id="general-cert-upload"
                            />
                            <label htmlFor="general-cert-upload">
                              <div className="flex items-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 hover:border-purple-500 cursor-pointer transition-colors">
                                <Camera className="w-4 h-4 text-purple-600" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {receptionQualityParams.certificate_file ? receptionQualityParams.certificate_file.name : 'Tomar foto del certificado'}
                                </span>
                              </div>
                            </label>
                            {receptionQualityParams.certificate_file && (
                              <div className="mt-2">
                                <img
                                  src={URL.createObjectURL(receptionQualityParams.certificate_file)}
                                  alt="Preview"
                                  className="w-full h-32 object-cover rounded-lg"
                                />
                              </div>
                            )}
                          </div>

                          {/* Quality Checklist */}
                          <div>
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Checklist de Verificación
                            </p>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                              {[
                                { key: 'check_dotacion', label: 'Dotación' },
                                { key: 'check_food_handling', label: 'Carné de manipulación de alimentos' },
                                { key: 'check_vehicle_health', label: 'Acta sanitaria del vehículo' },
                                { key: 'check_arl', label: 'ARL' },
                                { key: 'check_vehicle_clean', label: 'Vehículo limpio' },
                                { key: 'check_pest_free', label: 'Libre de plagas' },
                                { key: 'check_toxic_free', label: 'Libre de sustancias tóxicas' },
                                { key: 'check_baskets_clean', label: 'Canastillas limpias' },
                                { key: 'check_pallets_good', label: 'Buen estado de estivas' },
                                { key: 'check_packaging_good', label: 'Condiciones de embalaje' }
                              ].map(({ key, label }) => (
                                <label key={key} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={receptionQualityParams[key as keyof ReceptionQualityParameters] ?? true}
                                    onChange={(e) => {
                                      setReceptionQualityParams({
                                        ...receptionQualityParams,
                                        [key]: e.target.checked
                                      })
                                    }}
                                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                  />
                                  <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Reception Items - Accordion Style */}
                {receptionItems.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-base">Materiales a Recibir</h4>
                    <div className="space-y-3">
                      {receptionItems.map((item, index) => {
                        const isExpanded = expandedItems.has(index)
                        const isComplete = isItemComplete(item)

                        return (
                          <div
                            key={index}
                            className={`
                              rounded-xl border-2 transition-all duration-200
                              ${isExpanded
                                ? 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-500/50 shadow-lg shadow-blue-500/10'
                                : isComplete
                                  ? 'bg-green-50/50 dark:bg-green-900/10 border-green-500/30'
                                  : 'bg-white/30 dark:bg-black/20 border-white/30 dark:border-white/20'
                              }
                            `}
                          >
                            {/* Header - Always Visible */}
                            <button
                              type="button"
                              onClick={() => toggleItemExpanded(index)}
                              className="w-full p-4 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  {isComplete && (
                                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                  )}
                                  <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">{item.material_name}</p>
                                    {!isExpanded && isComplete && (
                                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        {item.quantity_received} {item.material_unit} • Lote: {item.batch_number}
                                      </p>
                                    )}
                                    {!isExpanded && !isComplete && (
                                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Solicitado: {item.quantity_ordered} {item.material_unit}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <ChevronDown className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className="px-4 pb-4 space-y-3 border-t border-blue-200/50 dark:border-blue-700/50 pt-3">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Solicitado: {item.quantity_ordered} {item.material_unit}
                                </p>

                                {/* Quantity to Receive */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Cantidad a Recibir *
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={item.quantity_received}
                                      onChange={(e) => updateItemField(index, 'quantity_received', parseFloat(e.target.value) || 0)}
                                      className="flex-1 px-3 py-2.5 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder="0"
                                      required
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap font-medium">
                                      {item.material_unit}
                                    </span>
                                  </div>
                                </div>

                                {/* Temperature (REQUIRED) - Item-specific */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                                    <Thermometer className="w-4 h-4 text-blue-600" />
                                    Temperatura del Producto (°C) *
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={itemQualityParams[index]?.temperature || ''}
                                      onChange={(e) => {
                                        setItemQualityParams({
                                          ...itemQualityParams,
                                          [index]: {
                                            temperature: parseFloat(e.target.value) || 0
                                          }
                                        })
                                      }}
                                      className={`flex-1 px-3 py-2.5 border rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                        !itemQualityParams[index]?.temperature && formError
                                          ? 'border-red-500 dark:border-red-400'
                                          : 'border-gray-300 dark:border-white/20'
                                      }`}
                                      placeholder="Ej: 4.5"
                                      required
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setItemQualityParams({
                                          ...itemQualityParams,
                                          [index]: {
                                            temperature: 20
                                          }
                                        })
                                      }}
                                      className="px-3 py-2.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                                    >
                                      Ambiente
                                    </button>
                                  </div>
                                  {!itemQualityParams[index]?.temperature && formError && (
                                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" />
                                      Campo obligatorio
                                    </p>
                                  )}
                                </div>

                                {/* Batch Number */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Lote *
                                  </label>
                                  <input
                                    type="text"
                                    value={item.batch_number}
                                    onChange={(e) => updateItemField(index, 'batch_number', e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Número de lote del proveedor"
                                    required
                                  />
                                </div>

                                {/* Expiry Date */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Fecha de Vencimiento (opcional)
                                  </label>
                                  <DatePicker
                                    value={item.expiry_date}
                                    onChange={(date) => {
                                      const formatted = date ? format(date, 'yyyy-MM-dd') : ''
                                      updateItemField(index, 'expiry_date', formatted, !!date)
                                    }}
                                    placeholder="Seleccionar fecha"
                                    buttonClassName="w-full px-3 py-2.5 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm h-auto"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                  </>
                )}

                {/* Direct Reception Form */}
                {receptionType === 'direct' && (
                  <>
                    {/* General Quality Parameters Section - Collapsible */}
                    {receptionItems.length > 0 && (
                      <div className="mb-4">
                        <div
                          className={`
                            rounded-xl border-2 transition-all duration-200
                            ${generalQualityExpanded
                              ? 'bg-purple-50/80 dark:bg-purple-900/20 border-purple-500/50 shadow-lg shadow-purple-500/10'
                              : 'bg-white/30 dark:bg-black/20 border-purple-500/30'
                            }
                          `}
                        >
                          <button
                            type="button"
                            onClick={() => setGeneralQualityExpanded(!generalQualityExpanded)}
                            className="w-full p-4 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Camera className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">Parámetros Generales de Calidad</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                  Aplicables a toda la recepción
                                </p>
                              </div>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${generalQualityExpanded ? 'rotate-180' : ''}`} />
                          </button>

                          {generalQualityExpanded && (
                            <div className="px-4 pb-4 space-y-3 border-t border-purple-200/50 dark:border-purple-700/50 pt-3">
                              {/* Vehicle Temperature (OPTIONAL) */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Temperatura del Vehículo (°C)
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={receptionQualityParams.vehicle_temperature || ''}
                                  onChange={(e) => {
                                    setReceptionQualityParams({
                                      ...receptionQualityParams,
                                      vehicle_temperature: parseFloat(e.target.value) || null
                                    })
                                  }}
                                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                  placeholder="Ej: 5.0"
                                />
                              </div>

                              {/* Certificate Upload */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Certificado de Calidad (Foto)
                                </label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                      setReceptionQualityParams({
                                        ...receptionQualityParams,
                                        certificate_file: file
                                      })
                                    }
                                  }}
                                  className="hidden"
                                  id="general-cert-upload-direct"
                                />
                                <label htmlFor="general-cert-upload-direct">
                                  <div className="flex items-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 hover:border-purple-500 cursor-pointer transition-colors">
                                    <Camera className="w-4 h-4 text-purple-600" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                      {receptionQualityParams.certificate_file ? receptionQualityParams.certificate_file.name : 'Tomar foto del certificado'}
                                    </span>
                                  </div>
                                </label>
                                {receptionQualityParams.certificate_file && (
                                  <div className="mt-2">
                                    <img
                                      src={URL.createObjectURL(receptionQualityParams.certificate_file)}
                                      alt="Preview"
                                      className="w-full h-32 object-cover rounded-lg"
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Quality Checklist */}
                              <div>
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Checklist de Verificación
                                </p>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                  {[
                                    { key: 'check_dotacion', label: 'Dotación' },
                                    { key: 'check_food_handling', label: 'Carné de manipulación de alimentos' },
                                    { key: 'check_vehicle_health', label: 'Acta sanitaria del vehículo' },
                                    { key: 'check_arl', label: 'ARL' },
                                    { key: 'check_vehicle_clean', label: 'Vehículo limpio' },
                                    { key: 'check_pest_free', label: 'Libre de plagas' },
                                    { key: 'check_toxic_free', label: 'Libre de sustancias tóxicas' },
                                    { key: 'check_baskets_clean', label: 'Canastillas limpias' },
                                    { key: 'check_pallets_good', label: 'Buen estado de estivas' },
                                    { key: 'check_packaging_good', label: 'Condiciones de embalaje' }
                                  ].map(({ key, label }) => (
                                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={receptionQualityParams[key as keyof ReceptionQualityParameters] ?? true}
                                        onChange={(e) => {
                                          setReceptionQualityParams({
                                            ...receptionQualityParams,
                                            [key]: e.target.checked
                                          })
                                        }}
                                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                      />
                                      <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-base">Materiales a Recibir</h4>

                      {/* Empty State */}
                      {receptionItems.length === 0 && (
                        <div className="bg-white/30 dark:bg-black/20 backdrop-blur-md border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl p-8 text-center">
                          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            No hay materiales agregados
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const newIndex = receptionItems.length
                              setReceptionItems([...receptionItems, {
                                material_id: '',
                                material_name: '',
                                material_unit: '',
                                quantity_received: 0,
                                batch_number: '',
                                expiry_date: ''
                              }])
                              setExpandedItems(new Set([newIndex]))
                            }}
                            className="
                              inline-flex items-center gap-2
                              px-4 py-2
                              bg-blue-600 text-white
                              rounded-lg
                              hover:bg-blue-700
                              transition-all duration-150
                              font-medium
                            "
                          >
                            <Plus className="w-4 h-4" />
                            Agregar Primer Material
                          </button>
                        </div>
                      )}

                      {/* Reception Items - Accordion Style */}
                      {receptionItems.length > 0 && (
                        <div className="space-y-3">
                          {receptionItems.map((item, index) => {
                            const isExpanded = expandedItems.has(index)
                            const isComplete = isItemComplete(item)

                            return (
                              <div
                                key={index}
                                className={`
                                  rounded-xl border-2 transition-all duration-200
                                  ${isExpanded
                                    ? 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-500/50 shadow-lg shadow-blue-500/10'
                                    : isComplete
                                      ? 'bg-green-50/50 dark:bg-green-900/10 border-green-500/30'
                                      : 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-500/30'
                                  }
                                `}
                              >
                                {/* Header - Always Visible */}
                                <button
                                  type="button"
                                  onClick={() => toggleItemExpanded(index)}
                                  className="w-full p-4 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                      {isComplete ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                      ) : (
                                        <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                                      )}
                                      <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                          {item.material_name || `Material ${index + 1}`}
                                        </p>
                                        {!isExpanded && isComplete && (
                                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            {item.quantity_received} {item.material_unit} • Lote: {item.batch_number}
                                          </p>
                                        )}
                                        {!isExpanded && !isComplete && (
                                          <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                                            Faltan datos
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const updated = receptionItems.filter((_, i) => i !== index)
                                        setReceptionItems(updated)
                                        const newExpanded = new Set(expandedItems)
                                        newExpanded.delete(index)
                                        setExpandedItems(newExpanded)
                                      }}
                                      className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors text-red-600 dark:text-red-400"
                                      title="Eliminar material"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                    <ChevronDown className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </div>
                                </button>

                                {/* Expanded Content */}
                                {isExpanded && (
                                  <div className="px-4 pb-4 space-y-3 border-t border-blue-200/50 dark:border-blue-700/50 pt-3">
                                    {/* Material Selection */}
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Material *
                                      </label>
                                      <select
                                        value={item.material_id || ''}
                                        onChange={(e) => {
                                          const value = e.target.value
                                          const selectedProduct = products.find(p => p.id === value)
                                          const updated = [...receptionItems]
                                          updated[index] = {
                                            ...updated[index],
                                            material_id: value,
                                            material_name: selectedProduct?.name || '',
                                            material_unit: selectedProduct?.unit || ''
                                          }
                                          setReceptionItems(updated)
                                        }}
                                        className="w-full px-3 py-2.5 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                      >
                                        <option value="" disabled>Selecciona un material</option>
                                        {products
                                          .filter(p => p.category === 'MP')
                                          .map((product) => (
                                            <option key={product.id} value={product.id}>
                                              {product.name} ({product.unit})
                                            </option>
                                          ))}
                                      </select>
                                    </div>

                                    {/* Quantity */}
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Cantidad Recibida *
                                      </label>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={item.quantity_received}
                                          onChange={(e) => updateItemField(index, 'quantity_received', parseFloat(e.target.value) || 0)}
                                          className="flex-1 px-3 py-2.5 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          placeholder="0"
                                          required
                                        />
                                        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap font-medium">
                                          {item.material_unit || '-'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Temperature (REQUIRED) - Item-specific */}
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                                        <Thermometer className="w-4 h-4 text-blue-600" />
                                        Temperatura del Producto (°C) *
                                      </label>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          step="0.1"
                                          value={itemQualityParams[index]?.temperature || ''}
                                          onChange={(e) => {
                                            setItemQualityParams({
                                              ...itemQualityParams,
                                              [index]: {
                                                temperature: parseFloat(e.target.value) || 0
                                              }
                                            })
                                          }}
                                          className={`flex-1 px-3 py-2.5 border rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            !itemQualityParams[index]?.temperature && formError
                                              ? 'border-red-500 dark:border-red-400'
                                              : 'border-gray-300 dark:border-white/20'
                                          }`}
                                          placeholder="Ej: 4.5"
                                          required
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setItemQualityParams({
                                              ...itemQualityParams,
                                              [index]: {
                                                temperature: 20
                                              }
                                            })
                                          }}
                                          className="px-3 py-2.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                                        >
                                          Ambiente
                                        </button>
                                      </div>
                                      {!itemQualityParams[index]?.temperature && formError && (
                                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3" />
                                          Campo obligatorio
                                        </p>
                                      )}
                                    </div>

                                    {/* Batch Number */}
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Lote *
                                      </label>
                                      <input
                                        type="text"
                                        value={item.batch_number}
                                        onChange={(e) => updateItemField(index, 'batch_number', e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Número de lote"
                                        required
                                      />
                                    </div>

                                    {/* Expiry Date */}
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Fecha de Vencimiento (opcional)
                                      </label>
                                      <DatePicker
                                        value={item.expiry_date}
                                        onChange={(date) => {
                                          const formatted = date ? format(date, 'yyyy-MM-dd') : ''
                                          updateItemField(index, 'expiry_date', formatted, !!date)
                                        }}
                                        placeholder="Seleccionar fecha"
                                        buttonClassName="w-full px-3 py-2.5 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm h-auto"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Add Material Button - Always at bottom */}
                      {receptionItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newIndex = receptionItems.length
                            setReceptionItems([...receptionItems, {
                              material_id: '',
                              material_name: '',
                              material_unit: '',
                              quantity_received: 0,
                              batch_number: '',
                              expiry_date: ''
                            }])
                            setExpandedItems(new Set([newIndex]))
                          }}
                          className="
                            w-full
                            flex items-center justify-center gap-2
                            px-4 py-3
                            bg-white/50 dark:bg-white/5
                            hover:bg-white dark:hover:bg-white/10
                            border-2 border-dashed border-gray-300 dark:border-white/20
                            rounded-xl
                            text-gray-700 dark:text-gray-300
                            font-medium
                            transition-all duration-150
                            hover:border-blue-500
                            hover:text-blue-600 dark:hover:text-blue-400
                          "
                        >
                          <Plus className="w-5 h-5" />
                          Agregar Otro Material
                        </button>
                      )}
                    </div>
                  </>
                )}
                </form>
              </div>

              {/* Footer - Sticky */}
              <div className="sticky bottom-0 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-white/10 p-6 flex flex-col-reverse md:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setFormError(null)
                    setFormData({
                      selectedOrderId: '',
                      receptionItems: []
                    })
                    setItemQualityParams({})
                    setReceptionQualityParams({})
                    setGeneralQualityExpanded(false)
                  }}
                  disabled={isSubmitting}
                  className="
                    w-full md:w-auto
                    px-6 py-3 md:py-2
                    rounded-xl
                    border border-gray-300 dark:border-white/20
                    text-gray-700 dark:text-gray-300
                    font-medium
                    hover:bg-gray-100 dark:hover:bg-white/10
                    transition-all duration-150
                    disabled:opacity-50
                  "
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting ||
                    receptionItems.length === 0 ||
                    (receptionType === 'order' && !selectedOrderId)
                  }
                  className="
                    w-full md:w-auto
                    px-6 py-3 md:py-2
                    rounded-xl
                    bg-blue-600 text-white
                    font-semibold
                    hover:bg-blue-700
                    shadow-lg shadow-blue-600/30
                    hover:shadow-xl hover:shadow-blue-600/40
                    active:scale-[0.98]
                    transition-all duration-150
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {isSubmitting ? 'Creando...' : 'Crear Recepción'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal Form */}
        {showEditForm && selectedReception && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center md:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeEditForm()
              }
            }}
          >
            <div
              className="
                bg-white dark:bg-black/90
                backdrop-blur-xl
                w-full md:max-w-2xl
                rounded-t-[2rem] md:rounded-3xl
                animate-slide-up md:animate-none
                max-h-[90vh]
                overflow-hidden
                flex flex-col
                border-t border-white/20 dark:border-white/10 md:border
              "
            >
              {/* Header - Sticky */}
              <div className="sticky top-0 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 p-6 flex items-center justify-between z-10">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  Editar Recepción: {selectedReception.reception_number}
                </h3>
                <button
                  onClick={closeEditForm}
                  className="
                    p-2 rounded-full
                    hover:bg-gray-100 dark:hover:bg-white/10
                    transition-colors
                    flex-shrink-0
                  "
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
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
                            <DatePicker
                              value={item.expiry_date || ''}
                              onChange={(date) => {
                                const formatted = date ? format(date, 'yyyy-MM-dd') : ''
                                updateEditItemField(index, 'expiry_date', formatted)
                              }}
                              placeholder="Seleccionar fecha"
                              buttonClassName="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm h-auto"
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
              </div>

              {/* Footer - Sticky */}
              <div className="sticky bottom-0 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-white/10 p-6 flex flex-col-reverse md:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditForm}
                  disabled={isSubmitting}
                  className="
                    w-full md:w-auto
                    px-6 py-3 md:py-2
                    rounded-xl
                    border border-gray-300 dark:border-white/20
                    text-gray-700 dark:text-gray-300
                    font-medium
                    hover:bg-gray-100 dark:hover:bg-white/10
                    transition-all duration-150
                    disabled:opacity-50
                  "
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  onClick={handleEditSubmit}
                  disabled={isSubmitting}
                  className="
                    w-full md:w-auto
                    px-6 py-3 md:py-2
                    rounded-xl
                    bg-blue-600 text-white
                    font-semibold
                    hover:bg-blue-700
                    shadow-lg shadow-blue-600/30
                    hover:shadow-xl hover:shadow-blue-600/40
                    active:scale-[0.98]
                    transition-all duration-150
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quality Parameters Modal */}
        {showQualityModal && selectedQualityData && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center md:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowQualityModal(false)
                setSelectedQualityData(null)
              }
            }}
          >
            <div
              className="
                bg-white dark:bg-black/90
                backdrop-blur-xl
                w-full md:max-w-2xl
                rounded-t-[2rem] md:rounded-3xl
                animate-slide-up md:animate-none
                max-h-[90vh]
                overflow-hidden
                flex flex-col
                border-t border-white/20 dark:border-white/10 md:border
              "
            >
              {/* Header */}
              <div className="sticky top-0 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 p-6 flex items-center justify-between z-10">
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                    Parámetros de Calidad
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedQualityData.material_name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowQualityModal(false)
                    setSelectedQualityData(null)
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Temperature Section */}
                <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-200/50 dark:border-blue-700/50">
                  <div className="flex items-center gap-3 mb-3">
                    <Thermometer className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">Temperaturas</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Temperatura del Producto:</span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {selectedQualityData.quality_parameters.temperature}°C
                      </span>
                    </div>
                    {selectedQualityData.quality_parameters.vehicle_temperature && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Temperatura del Vehículo:</span>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {selectedQualityData.quality_parameters.vehicle_temperature}°C
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quality Checklist */}
                <div className="bg-green-50/50 dark:bg-green-900/10 rounded-xl p-4 border border-green-200/50 dark:border-green-700/50">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">Checklist de Verificación</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[
                      { key: 'check_dotacion', label: 'Dotación' },
                      { key: 'check_food_handling', label: 'Carné de manipulación de alimentos' },
                      { key: 'check_vehicle_health', label: 'Acta sanitaria del vehículo' },
                      { key: 'check_arl', label: 'ARL' },
                      { key: 'check_vehicle_clean', label: 'Vehículo limpio' },
                      { key: 'check_pest_free', label: 'Libre de plagas' },
                      { key: 'check_toxic_free', label: 'Libre de sustancias tóxicas' },
                      { key: 'check_baskets_clean', label: 'Canastillas limpias' },
                      { key: 'check_pallets_good', label: 'Buen estado de estivas' },
                      { key: 'check_packaging_good', label: 'Condiciones de embalaje' }
                    ].map(({ key, label }) => {
                      const isChecked = selectedQualityData.quality_parameters[key] !== false
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <CheckCircle2 className={`w-4 h-4 ${isChecked ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className={`text-sm ${isChecked ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-500'}`}>
                            {label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Quality Certificate */}
                {selectedQualityData.quality_parameters.quality_certificate_url && (
                  <div className="bg-purple-50/50 dark:bg-purple-900/10 rounded-xl p-4 border border-purple-200/50 dark:border-purple-700/50">
                    <div className="flex items-center gap-3 mb-3">
                      <Camera className="w-5 h-5 text-purple-600" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">Certificado de Calidad</h4>
                    </div>
                    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                      <img
                        src={selectedQualityData.quality_parameters.quality_certificate_url}
                        alt="Certificado de Calidad"
                        className="w-full h-auto max-h-96 object-contain bg-gray-100 dark:bg-gray-800"
                      />
                    </div>
                    <a
                      href={selectedQualityData.quality_parameters.quality_certificate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-3 text-sm text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      <Eye className="w-4 h-4" />
                      Ver imagen completa
                    </a>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-white/10 p-6">
                <button
                  onClick={() => {
                    setShowQualityModal(false)
                    setSelectedQualityData(null)
                  }}
                  className="w-full px-6 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RouteGuard>
  )
}
