"use client"

import { useState } from "react"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { useMaterialReception } from "@/hooks/use-material-reception"
import { usePurchaseOrders } from "@/hooks/use-purchase-orders"
import { useSuppliers } from "@/hooks/use-suppliers"
import { useMaterialSuppliers } from "@/hooks/use-material-suppliers"
import {
  Package,
  Plus,
  Search,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  FileText,
  X
} from "lucide-react"

type MaterialReceptionInsert = {
  type: 'specific_material' | 'purchase_order'
  purchase_order_id?: string
  material_id?: string
  quantity_received: number
  unit_of_measure?: string
  reception_date?: string
  reception_time?: string
  batch_number?: string
  lot_number?: string
  supplier_id?: string
  operator_id?: string
  notes?: string
}

export default function RecepcionPage() {
  const { receptions, createReception, loading: loadingReceptions, getTodayReceptions } = useMaterialReception()
  const { purchaseOrders } = usePurchaseOrders()
  const { suppliers } = useSuppliers()
  const { materialSuppliers } = useMaterialSuppliers()

  const [activeTab, setActiveTab] = useState<'specific' | 'purchase_order'>('specific')
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const [formData, setFormData] = useState<Partial<MaterialReceptionInsert>>({
    type: 'specific_material',
    quantity_received: 0
  })

  const handleCreateReception = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.material_id && !formData.purchase_order_id) {
      setFormError('Selecciona un material u orden de compra')
      return
    }

    if (!formData.quantity_received || formData.quantity_received <= 0) {
      setFormError('La cantidad debe ser mayor a 0')
      return
    }

    try {
      await createReception(formData as MaterialReceptionInsert)
      setFormData({
        type: 'specific_material',
        quantity_received: 0
      })
      setShowForm(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error creating reception')
    }
  }

  const todayReceptions = getTodayReceptions()

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

          {/* Tabs */}
          <div className="flex gap-2 bg-white/50 dark:bg-white/5 p-2 rounded-xl backdrop-blur-sm">
            <button
              onClick={() => setActiveTab('specific')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
                activeTab === 'specific'
                  ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Material Específico
            </button>
            <button
              onClick={() => setActiveTab('purchase_order')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
                activeTab === 'purchase_order'
                  ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Orden de Compra
            </button>
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
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {reception.reception_number}
                          </p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            reception.type === 'purchase_order'
                              ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                              : 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                          }`}>
                            {reception.type === 'purchase_order' ? 'Orden' : 'Material'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {reception.material?.name || reception.purchase_order?.order_number || 'Sin especificar'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(reception.reception_date).toLocaleDateString()}
                          </span>
                          {reception.batch_number && (
                            <span>Lote: {reception.batch_number}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900 dark:text-white">
                          {reception.quantity_received}
                        </p>
                        <p className="text-xs text-gray-500">{reception.unit_of_measure}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Form */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-black/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-white/20 dark:border-white/10 p-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nueva Recepción</h3>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setFormError(null)
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleCreateReception} className="p-6 space-y-4">
                {formError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">{formError}</p>
                  </div>
                )}

                {/* Type Selection */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, type: 'specific_material', purchase_order_id: undefined })
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
                      formData.type === 'specific_material'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Material
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, type: 'purchase_order', material_id: undefined })
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
                      formData.type === 'purchase_order'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Orden
                  </button>
                </div>

                {/* Material/Order Selection */}
                {formData.type === 'specific_material' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Material
                    </label>
                    <select
                      value={formData.material_id || ''}
                      onChange={(e) => setFormData({ ...formData, material_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                    >
                      <option value="">Selecciona un material</option>
                      {materialSuppliers.map((ms) => (
                        <option key={ms.material_id} value={ms.material_id}>
                          {ms.material?.name || 'Sin nombre'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Orden de Compra
                    </label>
                    <select
                      value={formData.purchase_order_id || ''}
                      onChange={(e) => setFormData({ ...formData, purchase_order_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                    >
                      <option value="">Selecciona una orden</option>
                      {purchaseOrders.filter(po => po.status !== 'received' && po.status !== 'cancelled').map((po) => (
                        <option key={po.id} value={po.id}>
                          {po.order_number} - {po.supplier?.company_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantity_received || ''}
                    onChange={(e) => setFormData({ ...formData, quantity_received: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>

                {/* Unit of Measure */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Unidad
                  </label>
                  <input
                    type="text"
                    value={formData.unit_of_measure || ''}
                    onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                    placeholder="kg, L, unidades, etc."
                  />
                </div>

                {/* Batch/Lot Numbers */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Lote
                    </label>
                    <input
                      type="text"
                      value={formData.batch_number || ''}
                      onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                      placeholder="Lote"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Número
                    </label>
                    <input
                      type="text"
                      value={formData.lot_number || ''}
                      onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                      placeholder="Número"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notas
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                    placeholder="Observaciones..."
                    rows={3}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Registrar Recepción
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </RouteGuard>
  )
}
