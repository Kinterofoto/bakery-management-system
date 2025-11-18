"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Package, AlertCircle, CheckCircle2, Plus, Trash2, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useWorkCenterInventory } from "@/hooks/use-work-center-inventory"
import { useTransferNotifications } from "@/hooks/use-transfer-notifications"
import { useMaterialTransfers } from "@/hooks/use-material-transfers"
import { useMaterialReturns } from "@/hooks/use-material-returns"
import { TransferStatusBadge } from "@/components/compras/TransferStatusBadge"
import { ReceiveTransferDialog } from "@/components/production/ReceiveTransferDialog"
import { toast } from "sonner"

type InventoryManagementDialogProps = {
  workCenterId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTab?: "inventory" | "transfers" | "returns"
}

type ReturnItem = {
  material_id: string
  quantity_returned: number
  batch_number?: string
  expiry_date?: string
  unit_of_measure: string
  notes?: string
}

export function InventoryManagementDialog({
  workCenterId,
  open,
  onOpenChange,
  initialTab = "inventory"
}: InventoryManagementDialogProps) {
  const { inventory, loading: inventoryLoading, error: inventoryError, fetchInventoryByWorkCenter } = useWorkCenterInventory()
  const { pendingTransfersCount, fetchPendingTransfersCount } = useTransferNotifications()
  const { transfers, loading: transfersLoading, error: transfersError } = useMaterialTransfers()
  const { createReturn } = useMaterialReturns()

  const [activeTab, setActiveTab] = useState<"inventory" | "transfers" | "returns">(initialTab)
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null)
  const [showReceiveDialog, setShowReceiveDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    reason: "",
    notes: ""
  })

  const [items, setItems] = useState<ReturnItem[]>([
    { material_id: "", quantity_returned: 0, unit_of_measure: "" }
  ])

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      fetchInventoryByWorkCenter(workCenterId)
      fetchPendingTransfersCount(workCenterId)
      setActiveTab(initialTab)
    }
  }, [open, workCenterId, initialTab])

  // Auto-refetch every 30 seconds when open
  useEffect(() => {
    if (!open) return

    const interval = setInterval(() => {
      fetchInventoryByWorkCenter(workCenterId)
      fetchPendingTransfersCount(workCenterId)
    }, 30000)

    return () => clearInterval(interval)
  }, [open, workCenterId])

  // Pending transfers
  const pendingTransfers = transfers.filter(t =>
    t.work_center_id === workCenterId && t.status === 'pending_receipt'
  )

  const selectedTransfer = transfers.find(t => t.id === selectedTransferId)

  if (showReceiveDialog && selectedTransfer) {
    return (
      <ReceiveTransferDialog
        transfer={selectedTransfer}
        onClose={() => {
          setShowReceiveDialog(false)
          setSelectedTransferId(null)
        }}
        onSuccess={() => {
          setShowReceiveDialog(false)
          setSelectedTransferId(null)
          setActiveTab("transfers")
          fetchInventoryByWorkCenter(workCenterId)
          fetchPendingTransfersCount(workCenterId)
        }}
      />
    )
  }

  // Return dialog handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleItemChange = (index: number, field: keyof ReturnItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    if (field === 'material_id' && value) {
      const material = inventory.find(m => m.material_id === value)
      if (material) {
        newItems[index].unit_of_measure = material.unit_of_measure || ''
        newItems[index].batch_number = material.batch_number || ''
        newItems[index].expiry_date = material.expiry_date || ''
      }
    }

    setItems(newItems)
  }

  const getAvailableQuantity = (materialId: string) => {
    const material = inventory.find(m => m.material_id === materialId)
    if (!material) return 0
    return material.quantity_available - material.quantity_consumed
  }

  const addItem = () => {
    setItems([...items, { material_id: "", quantity_returned: 0, unit_of_measure: "" }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (items.length === 0 || items.some(item => !item.material_id || item.quantity_returned <= 0)) {
        toast.error("Debes agregar al menos un material con cantidad válida")
        setLoading(false)
        return
      }

      for (const item of items) {
        if (item.material_id) {
          const available = getAvailableQuantity(item.material_id)
          if (item.quantity_returned > available) {
            toast.error(`Cantidad insuficiente. Disponible: ${available}`)
            setLoading(false)
            return
          }
        }
      }

      const returnData = {
        work_center_id: workCenterId,
        items: items.filter(item => item.material_id && item.quantity_returned > 0),
        reason: formData.reason || undefined,
        notes: formData.notes || undefined
      }

      const newReturn = await createReturn(
        workCenterId,
        returnData.items,
        returnData.reason,
        returnData.notes
      )

      if (newReturn) {
        toast.success(`Devolución ${newReturn.return_number} creada exitosamente`)
        setFormData({ reason: "", notes: "" })
        setItems([{ material_id: "", quantity_returned: 0, unit_of_measure: "" }])
        fetchInventoryByWorkCenter(workCenterId)
      } else {
        toast.error("No se pudo crear la devolución")
      }
    } catch (error) {
      toast.error("Ocurrió un error al crear la devolución")
    } finally {
      setLoading(false)
    }
  }

  const availableMaterials = inventory.filter(m => (m.quantity_available - m.quantity_consumed) > 0)

  if (!open) return null

  return (
    <div className="fixed z-50 flex items-center justify-center p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Backdrop */}
      <div className="fixed bg-black/30 backdrop-blur-sm" style={{ top: 0, left: 0, right: 0, bottom: 0 }} />

      {/* Dialog */}
      <div className="
        relative
        bg-white/90 dark:bg-black/80
        backdrop-blur-2xl
        border border-white/30 dark:border-white/15
        rounded-3xl
        shadow-2xl shadow-black/20
        max-w-4xl
        w-full
        max-h-[90vh]
        overflow-hidden
        flex flex-col
      ">
        {/* Header */}
        <div className="
          bg-gradient-to-r from-blue-500/20 to-purple-500/20
          dark:from-blue-500/10 dark:to-purple-500/10
          backdrop-blur-sm
          border-b border-white/20 dark:border-white/10
          px-6 py-4
          flex items-center justify-between
        ">
          <div className="flex items-center gap-3">
            <div className="
              p-2 rounded-xl
              bg-gradient-to-br from-blue-500/30 to-purple-500/30
              border border-white/30 dark:border-white/15
            ">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Inventario</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">Gestión de materiales</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="
              text-gray-500 dark:text-gray-400
              hover:bg-white/20 dark:hover:bg-black/20
              rounded-lg
              p-2
              transition-colors
            "
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
          <TabsList className="
            w-full
            bg-transparent
            border-b border-white/10 dark:border-white/5
            rounded-none
            p-0
            h-auto
            justify-start
            px-6
          ">
            <TabsTrigger
              value="inventory"
              className="
                rounded-none
                border-b-2 border-transparent
                data-[state=active]:border-blue-500
                data-[state=active]:bg-blue-500/10
                bg-transparent
                text-gray-700 dark:text-gray-300
                hover:bg-white/20 dark:hover:bg-white/5
                px-4 py-3
                font-medium
                transition-all
              "
            >
              Inventario Local
            </TabsTrigger>
            <TabsTrigger
              value="transfers"
              className="
                rounded-none
                border-b-2 border-transparent
                data-[state=active]:border-green-500
                data-[state=active]:bg-green-500/10
                bg-transparent
                text-gray-700 dark:text-gray-300
                hover:bg-white/20 dark:hover:bg-white/5
                px-4 py-3
                font-medium
                transition-all
                relative
              "
            >
              Materiales por Recibir
              {pendingTransfersCount > 0 && (
                <span className="
                  ml-2
                  inline-flex items-center justify-center
                  w-5 h-5
                  bg-red-500
                  text-white
                  text-xs
                  font-bold
                  rounded-full
                ">
                  {pendingTransfersCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="returns"
              className="
                rounded-none
                border-b-2 border-transparent
                data-[state=active]:border-purple-500
                data-[state=active]:bg-purple-500/10
                bg-transparent
                text-gray-700 dark:text-gray-300
                hover:bg-white/20 dark:hover:bg-white/5
                px-4 py-3
                font-medium
                transition-all
              "
            >
              Devolver Material
            </TabsTrigger>
          </TabsList>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Inventory Tab */}
            <TabsContent value="inventory" className="space-y-4 m-0">
              {inventoryError && (
                <div className="
                  bg-red-50 dark:bg-red-950/30
                  border border-red-200 dark:border-red-800/50
                  rounded-lg
                  p-4
                  flex items-center gap-3
                ">
                  <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
                  <div>
                    <p className="font-semibold text-red-900 dark:text-red-300">Error</p>
                    <p className="text-sm text-red-800 dark:text-red-400">{inventoryError}</p>
                  </div>
                </div>
              )}

              {inventoryLoading && (
                <div className="
                  bg-white/50 dark:bg-black/30
                  backdrop-blur-md
                  border border-white/30 dark:border-white/15
                  rounded-lg
                  p-8
                  text-center
                ">
                  <p className="text-gray-600 dark:text-gray-400">Cargando inventario...</p>
                </div>
              )}

              {!inventoryLoading && inventory.length === 0 && (
                <div className="
                  bg-white/50 dark:bg-black/30
                  backdrop-blur-md
                  border border-white/30 dark:border-white/15
                  rounded-lg
                  p-8
                  text-center
                ">
                  <Package className="mx-auto mb-3 text-gray-400 dark:text-gray-600" size={32} />
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">No hay materiales en inventario</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Realiza un traslado para agregar materiales</p>
                </div>
              )}

              {!inventoryLoading && inventory.length > 0 && (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/20 dark:border-white/10">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Material</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Disponible</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Consumido</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Neto</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Unidad</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Lote</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Vencimiento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventory.map((item, idx) => {
                          const netAvailable = item.quantity_available - item.quantity_consumed
                          const isLowStock = netAvailable < 5 && netAvailable > 0
                          const isOutOfStock = netAvailable <= 0

                          return (
                            <tr
                              key={idx}
                              className={`
                                border-b border-white/10 dark:border-white/5
                                hover:bg-white/30 dark:hover:bg-black/20
                                transition-colors
                                ${isOutOfStock ? 'bg-red-50/50 dark:bg-red-950/20' : isLowStock ? 'bg-yellow-50/50 dark:bg-yellow-950/20' : ''}
                              `}
                            >
                              <td className="py-3 px-4">
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {item.material_name}
                                </p>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {item.quantity_available.toFixed(2)}
                                </p>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <p className="font-medium text-orange-600 dark:text-orange-400">
                                  {item.quantity_consumed.toFixed(2)}
                                </p>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <p className={`
                                  font-bold
                                  ${isOutOfStock ? 'text-red-600 dark:text-red-400' : isLowStock ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}
                                `}>
                                  {netAvailable.toFixed(2)}
                                </p>
                              </td>
                              <td className="py-3 px-4 text-center text-xs text-gray-600 dark:text-gray-400">
                                {item.unit_of_measure}
                              </td>
                              <td className="py-3 px-4 text-center text-xs">
                                {item.batch_number ? (
                                  <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                                    {item.batch_number}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center text-xs">
                                {item.expiry_date ? (
                                  <span className={`
                                    inline-block px-2 py-1 rounded text-xs font-medium
                                    ${new Date(item.expiry_date) < new Date()
                                      ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300'
                                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                    }
                                  `}>
                                    {new Date(item.expiry_date).toLocaleDateString('es-CO')}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-3 mt-6">
                    <div className="
                      bg-green-50/50 dark:bg-green-950/30
                      border border-green-200/50 dark:border-green-800/50
                      rounded-lg
                      p-4
                    ">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Total Disponible</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {inventory.reduce((sum, item) => sum + item.quantity_available, 0).toFixed(0)}
                      </p>
                    </div>

                    <div className="
                      bg-orange-50/50 dark:bg-orange-950/30
                      border border-orange-200/50 dark:border-orange-800/50
                      rounded-lg
                      p-4
                    ">
                      <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1">Total Consumido</p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {inventory.reduce((sum, item) => sum + item.quantity_consumed, 0).toFixed(0)}
                      </p>
                    </div>

                    <div className="
                      bg-blue-50/50 dark:bg-blue-950/30
                      border border-blue-200/50 dark:border-blue-800/50
                      rounded-lg
                      p-4
                    ">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Total Neto</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {inventory.reduce((sum, item) => sum + (item.quantity_available - item.quantity_consumed), 0).toFixed(0)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Transfers Tab */}
            <TabsContent value="transfers" className="space-y-4 m-0">
              {transfersError && (
                <div className="
                  bg-red-50 dark:bg-red-950/30
                  border border-red-200 dark:border-red-800/50
                  rounded-lg
                  p-4
                  flex items-center gap-3
                ">
                  <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
                  <div>
                    <p className="font-semibold text-red-900 dark:text-red-300">Error</p>
                    <p className="text-sm text-red-800 dark:text-red-400">{transfersError}</p>
                  </div>
                </div>
              )}

              {transfersLoading && (
                <p className="text-center text-gray-600 dark:text-gray-400">Cargando traslados...</p>
              )}

              {!transfersLoading && pendingTransfers.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle2 className="mx-auto mb-3 text-green-600 dark:text-green-400" size={32} />
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">No hay traslados pendientes</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Todos los traslados han sido recibidos</p>
                </div>
              )}

              <div className="space-y-3">
                {pendingTransfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="
                      bg-white/50 dark:bg-black/30
                      backdrop-blur-md
                      border border-white/30 dark:border-white/15
                      rounded-lg
                      p-4
                      hover:bg-white/60 dark:hover:bg-black/40
                      transition-colors
                    "
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {transfer.transfer_number}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Solicitado: {new Date(transfer.requested_at).toLocaleDateString('es-CO')}
                            </p>
                          </div>
                          <TransferStatusBadge status={transfer.status} />
                        </div>

                        {transfer.items && transfer.items.length > 0 && (
                          <div className="bg-white/40 dark:bg-black/20 rounded p-3 space-y-2">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                              Materiales ({transfer.items.length}):
                            </p>
                            <div className="space-y-1">
                              {transfer.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <span className="text-gray-700 dark:text-gray-300">
                                    {item.material_name}
                                  </span>
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {item.quantity_requested} {item.unit_of_measure}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {transfer.notes && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                            {transfer.notes}
                          </p>
                        )}
                      </div>

                      <Button
                        onClick={() => {
                          setSelectedTransferId(transfer.id)
                          setShowReceiveDialog(true)
                        }}
                        className="
                          bg-green-500
                          text-white
                          font-semibold
                          px-4
                          py-2
                          rounded-lg
                          shadow-md shadow-green-500/30
                          hover:bg-green-600
                          hover:shadow-lg hover:shadow-green-500/40
                          active:scale-95
                          transition-all duration-150
                          whitespace-nowrap
                        "
                      >
                        Recibir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Returns Tab */}
            <TabsContent value="returns" className="space-y-6 m-0">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Reason and Notes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="reason" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Motivo de la Devolución *
                      </Label>
                      <Select
                        value={formData.reason}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
                      >
                        <SelectTrigger className="
                          mt-1.5
                          bg-white/50 dark:bg-black/30
                          backdrop-blur-md
                          border-gray-200/50 dark:border-white/10
                          rounded-xl
                        ">
                          <SelectValue placeholder="Seleccionar motivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Exceso de producción">Exceso de producción</SelectItem>
                          <SelectItem value="Rechazo de calidad">Rechazo de calidad</SelectItem>
                          <SelectItem value="Material dañado">Material dañado</SelectItem>
                          <SelectItem value="Stock sobrante">Stock sobrante</SelectItem>
                          <SelectItem value="Error de cantidad">Error de cantidad</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Notas Adicionales
                    </Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={3}
                      className="
                        mt-1.5
                        bg-white/50 dark:bg-black/30
                        backdrop-blur-md
                        border-gray-200/50 dark:border-white/10
                        rounded-xl
                        focus:ring-2 focus:ring-purple-500/50
                        focus:border-purple-500/50
                      "
                      placeholder="Información adicional sobre la devolución..."
                    />
                  </div>
                </div>

                {/* Materials */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Materiales a Devolver</h3>
                    <Button
                      type="button"
                      onClick={addItem}
                      disabled={availableMaterials.length === 0}
                      className="
                        bg-purple-500
                        text-white
                        font-semibold
                        px-4
                        py-2
                        rounded-xl
                        shadow-md shadow-purple-500/30
                        hover:bg-purple-600
                        hover:shadow-lg hover:shadow-purple-500/40
                        active:scale-95
                        transition-all duration-150
                        disabled:opacity-50
                        disabled:cursor-not-allowed
                      "
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Material
                    </Button>
                  </div>

                  {availableMaterials.length === 0 && (
                    <p className="text-sm text-orange-600 dark:text-orange-400">
                      No hay materiales disponibles para devolver
                    </p>
                  )}

                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div
                        key={index}
                        className="
                          bg-white/50 dark:bg-black/30
                          backdrop-blur-md
                          border border-white/30 dark:border-white/15
                          rounded-xl
                          p-4
                        "
                      >
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                          <div className="md:col-span-5">
                            <Label className="text-xs text-gray-600 dark:text-gray-400">Material</Label>
                            <Select
                              value={item.material_id}
                              onValueChange={(value) => handleItemChange(index, 'material_id', value)}
                            >
                              <SelectTrigger className="
                                mt-1
                                bg-white/50 dark:bg-black/30
                                backdrop-blur-md
                                border-gray-200/50 dark:border-white/10
                                rounded-lg
                              ">
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableMaterials.map((material) => {
                                  const netAvailable = material.quantity_available - material.quantity_consumed
                                  return (
                                    <SelectItem key={material.material_id} value={material.material_id}>
                                      {material.material_name} (Disponible: {netAvailable} {material.unit_of_measure})
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="md:col-span-3">
                            <Label className="text-xs text-gray-600 dark:text-gray-400">Cantidad *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max={item.material_id ? getAvailableQuantity(item.material_id) : undefined}
                              value={item.quantity_returned}
                              onChange={(e) => handleItemChange(index, 'quantity_returned', parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              className="
                                mt-1
                                bg-white/50 dark:bg-black/30
                                backdrop-blur-md
                                border-gray-200/50 dark:border-white/10
                                rounded-lg
                              "
                            />
                          </div>

                          <div className="md:col-span-3">
                            <Label className="text-xs text-gray-600 dark:text-gray-400">Unidad</Label>
                            <div className="mt-1 p-2 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                              {item.unit_of_measure || '—'}
                            </div>
                          </div>

                          <div className="md:col-span-1 flex items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => removeItem(index)}
                              disabled={items.length === 1}
                              className="
                                w-full
                                bg-red-500/10
                                hover:bg-red-500/20
                                text-red-600
                                rounded-lg
                                disabled:opacity-30
                              "
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="
                      bg-purple-500
                      text-white
                      font-semibold
                      px-6
                      rounded-xl
                      shadow-md shadow-purple-500/30
                      hover:bg-purple-600
                      hover:shadow-lg hover:shadow-purple-500/40
                      active:scale-95
                      transition-all duration-150
                      disabled:opacity-50
                      disabled:cursor-not-allowed
                    "
                  >
                    {loading ? "Creando..." : "Crear Devolución"}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
