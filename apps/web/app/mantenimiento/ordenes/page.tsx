"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Plus,
  Wrench,
  Calendar,
  User,
  ChevronRight,
  X,
  Trash2,
  Loader2,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
} from "lucide-react"

import { useMaintenanceWorkOrders, type WorkOrder, type WorkOrderInsert } from "@/hooks/use-maintenance-work-orders"
import { useMaintenanceEquipment, type Equipment } from "@/hooks/use-maintenance-equipment"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

type TabKey = "todas" | "pendientes" | "en_progreso" | "completadas"

const TABS: { key: TabKey; label: string; statusFilter?: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "pendientes", label: "Pendientes", statusFilter: "pendiente" },
  { key: "en_progreso", label: "En Progreso", statusFilter: "en_progreso" },
  { key: "completadas", label: "Completadas", statusFilter: "completada" },
]

const TYPE_BADGE: Record<string, string> = {
  preventivo: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  correctivo: "bg-red-500/20 text-red-700 border-red-500/30",
  predictivo: "bg-purple-500/20 text-purple-700 border-purple-500/30",
}

const TYPE_LABEL: Record<string, string> = {
  preventivo: "Preventivo",
  correctivo: "Correctivo",
  predictivo: "Predictivo",
}

const PRIORITY_BADGE: Record<string, string> = {
  baja: "bg-gray-500/20 text-gray-700 border-gray-500/30",
  media: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  alta: "bg-orange-500/20 text-orange-700 border-orange-500/30",
  critica: "bg-red-500/20 text-red-700 border-red-500/30",
}

const PRIORITY_LABEL: Record<string, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Critica",
}

const STATUS_BADGE: Record<string, string> = {
  pendiente: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  en_progreso: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  completada: "bg-green-500/20 text-green-700 border-green-500/30",
  cancelada: "bg-gray-500/20 text-gray-700 border-gray-500/30",
}

const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  en_progreso: "En Progreso",
  completada: "Completada",
  cancelada: "Cancelada",
}

const STATUS_ICON: Record<string, typeof Clock> = {
  pendiente: Clock,
  en_progreso: Wrench,
  completada: CheckCircle2,
  cancelada: XCircle,
}

const spring = { type: "spring" as const, stiffness: 300, damping: 30 }

// ---------------------------------------------------------------------------
// Inner component (uses useSearchParams)
// ---------------------------------------------------------------------------

function WorkOrdersPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const { loading, getWorkOrders, createWorkOrder, updateWorkOrder } =
    useMaintenanceWorkOrders()
  const { getEquipment } = useMaintenanceEquipment()

  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [detailOrder, setDetailOrder] = useState<WorkOrder | null>(null)

  // Tab from URL
  const currentTab = (searchParams.get("tab") as TabKey) || "todas"

  const setTab = useCallback(
    (tab: TabKey) => {
      const params = new URLSearchParams(searchParams.toString())
      if (tab === "todas") {
        params.delete("tab")
      } else {
        params.set("tab", tab)
      }
      router.push(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  // Fetch data
  const fetchOrders = useCallback(async () => {
    const tabDef = TABS.find((t) => t.key === currentTab)
    const data = await getWorkOrders(
      tabDef?.statusFilter ? { status: tabDef.statusFilter } : undefined,
    )
    setOrders(data)
  }, [currentTab, getWorkOrders])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    getEquipment().then(setEquipment)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Search filter (client-side)
  const filteredOrders = searchQuery
    ? orders.filter(
        (o) =>
          o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.equipment?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          String(o.order_number).includes(searchQuery),
      )
    : orders

  // Create handler
  const handleCreate = async (data: WorkOrderInsert) => {
    await createWorkOrder(data)
    setShowCreateModal(false)
    fetchOrders()
  }

  // Status update from detail
  const handleStatusUpdate = async (
    id: string,
    newStatus: WorkOrder["status"],
  ) => {
    const updates: Partial<WorkOrder> = { status: newStatus }
    if (newStatus === "en_progreso") updates.started_at = new Date().toISOString()
    if (newStatus === "completada") updates.completed_at = new Date().toISOString()
    await updateWorkOrder(id, updates)
    setDetailOrder(null)
    fetchOrders()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-yellow-50/50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Ordenes de Trabajo
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona las ordenes de mantenimiento de equipos
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="gap-2 rounded-xl bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="h-4 w-4" />
            Nueva Orden
          </Button>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.03 }}
          className="mb-6"
        >
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar por titulo, equipo o numero..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border-white/40 bg-white/60 pl-10 backdrop-blur-lg"
            />
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="mb-6 flex gap-2 overflow-x-auto"
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                currentTab === tab.key
                  ? "bg-orange-600 text-white shadow-lg shadow-orange-600/25"
                  : "bg-white/60 text-gray-600 hover:bg-white/80 backdrop-blur-lg"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredOrders.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring}
            className="flex flex-col items-center justify-center rounded-2xl border border-white/30 bg-white/80 py-20 backdrop-blur-xl"
          >
            <ClipboardList className="mb-4 h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">
              No se encontraron ordenes de trabajo
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Crea una nueva orden para comenzar
            </p>
          </motion.div>
        )}

        {/* Desktop table */}
        {!loading && filteredOrders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.08 }}
            className="hidden overflow-hidden rounded-2xl border border-white/30 bg-white/80 backdrop-blur-xl md:block"
          >
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200/60">
                  <th className="px-4 py-3 font-semibold text-gray-600">#</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Equipo</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Tipo</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Prioridad</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Fecha</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Asignado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filteredOrders.map((order, i) => {
                    const StatusIcon = STATUS_ICON[order.status] ?? Clock
                    return (
                      <motion.tr
                        key={order.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ ...spring, delay: i * 0.05 }}
                        onClick={() => setDetailOrder(order)}
                        className="cursor-pointer border-b border-gray-100/60 transition-colors hover:bg-white/60"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {order.order_number}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {order.equipment?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`${TYPE_BADGE[order.maintenance_type] ?? ""} text-xs`}
                          >
                            {TYPE_LABEL[order.maintenance_type] ?? order.maintenance_type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`${PRIORITY_BADGE[order.priority] ?? ""} text-xs`}
                          >
                            {PRIORITY_LABEL[order.priority] ?? order.priority}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`${STATUS_BADGE[order.status] ?? ""} gap-1 text-xs`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {STATUS_LABEL[order.status] ?? order.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {order.scheduled_date
                            ? format(new Date(order.scheduled_date), "dd MMM yyyy", {
                                locale: es,
                              })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {order.assigned_to ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ChevronRight className="inline-block h-4 w-4 text-gray-400" />
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </motion.div>
        )}

        {/* Mobile cards */}
        {!loading && filteredOrders.length > 0 && (
          <div className="flex flex-col gap-3 md:hidden">
            <AnimatePresence mode="popLayout">
              {filteredOrders.map((order, i) => {
                const StatusIcon = STATUS_ICON[order.status] ?? Clock
                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ ...spring, delay: i * 0.05 }}
                    onClick={() => setDetailOrder(order)}
                    className="cursor-pointer rounded-2xl border border-white/30 bg-white/80 p-4 backdrop-blur-xl active:scale-[0.98]"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{order.title}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          #{order.order_number} &middot;{" "}
                          {order.equipment?.name ?? "Sin equipo"}
                        </p>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-400" />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge
                        variant="outline"
                        className={`${TYPE_BADGE[order.maintenance_type] ?? ""} text-xs`}
                      >
                        {TYPE_LABEL[order.maintenance_type] ?? order.maintenance_type}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`${PRIORITY_BADGE[order.priority] ?? ""} text-xs`}
                      >
                        {PRIORITY_LABEL[order.priority] ?? order.priority}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`${STATUS_BADGE[order.status] ?? ""} gap-1 text-xs`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {STATUS_LABEL[order.status] ?? order.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                      {order.scheduled_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(order.scheduled_date), "dd MMM yyyy", {
                            locale: es,
                          })}
                        </span>
                      )}
                      {order.assigned_to && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {order.assigned_to}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateWorkOrderModal
            equipment={equipment}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreate}
            submitting={loading}
          />
        )}
      </AnimatePresence>

      {/* Detail modal */}
      <AnimatePresence>
        {detailOrder && (
          <DetailModal
            order={detailOrder}
            onClose={() => setDetailOrder(null)}
            onStatusUpdate={handleStatusUpdate}
            loading={loading}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create Modal
// ---------------------------------------------------------------------------

interface CreateModalProps {
  equipment: Equipment[]
  onClose: () => void
  onSubmit: (data: WorkOrderInsert) => Promise<void>
  submitting: boolean
}

function CreateWorkOrderModal({
  equipment,
  onClose,
  onSubmit,
  submitting,
}: CreateModalProps) {
  const [form, setForm] = useState<{
    equipment_id: string
    title: string
    description: string
    maintenance_type: string
    priority: string
    assigned_to: string
    scheduled_date: string
    checklist: Array<{ item: string; done: boolean }>
  }>({
    equipment_id: "",
    title: "",
    description: "",
    maintenance_type: "preventivo",
    priority: "media",
    assigned_to: "",
    scheduled_date: "",
    checklist: [],
  })
  const [newCheckItem, setNewCheckItem] = useState("")

  const addCheckItem = () => {
    const trimmed = newCheckItem.trim()
    if (!trimmed) return
    setForm((f) => ({
      ...f,
      checklist: [...f.checklist, { item: trimmed, done: false }],
    }))
    setNewCheckItem("")
  }

  const removeCheckItem = (idx: number) => {
    setForm((f) => ({
      ...f,
      checklist: f.checklist.filter((_, i) => i !== idx),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.equipment_id || !form.title) return
    await onSubmit({
      equipment_id: form.equipment_id,
      title: form.title,
      description: form.description || null,
      maintenance_type: form.maintenance_type,
      priority: form.priority,
      assigned_to: form.assigned_to || null,
      scheduled_date: form.scheduled_date || null,
      checklist: form.checklist.length > 0 ? form.checklist : undefined,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={spring}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-white/30 bg-white/95 p-6 shadow-2xl backdrop-blur-xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Nueva Orden de Trabajo</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Equipment */}
          <div className="space-y-1.5">
            <Label>Equipo *</Label>
            <Select
              value={form.equipment_id}
              onValueChange={(v) => setForm((f) => ({ ...f, equipment_id: v }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Seleccionar equipo" />
              </SelectTrigger>
              <SelectContent>
                {equipment.map((eq) => (
                  <SelectItem key={eq.id} value={eq.id}>
                    {eq.code ? `${eq.code} - ` : ""}{eq.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label>Titulo *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Titulo de la orden"
              className="rounded-xl"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Descripcion</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Descripcion detallada del trabajo"
              className="min-h-[80px] rounded-xl"
            />
          </div>

          {/* Type + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={form.maintenance_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, maintenance_type: v }))
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventivo">Preventivo</SelectItem>
                  <SelectItem value="correctivo">Correctivo</SelectItem>
                  <SelectItem value="predictivo">Predictivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Critica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assigned + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Asignado a</Label>
              <Input
                value={form.assigned_to}
                onChange={(e) =>
                  setForm((f) => ({ ...f, assigned_to: e.target.value }))
                }
                placeholder="Nombre del tecnico"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha programada</Label>
              <Input
                type="date"
                value={form.scheduled_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, scheduled_date: e.target.value }))
                }
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-1.5">
            <Label>Lista de verificacion</Label>
            <div className="flex gap-2">
              <Input
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                placeholder="Agregar item..."
                className="rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addCheckItem()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addCheckItem}
                className="shrink-0 rounded-xl"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {form.checklist.length > 0 && (
              <ul className="mt-2 space-y-1">
                {form.checklist.map((ci, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-sm"
                  >
                    <span className="text-gray-700">{ci.item}</span>
                    <button
                      type="button"
                      onClick={() => removeCheckItem(idx)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting || !form.equipment_id || !form.title}
              className="gap-2 rounded-xl bg-orange-600 hover:bg-orange-700"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear Orden
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Detail Modal
// ---------------------------------------------------------------------------

interface DetailModalProps {
  order: WorkOrder
  onClose: () => void
  onStatusUpdate: (id: string, status: WorkOrder["status"]) => Promise<void>
  loading: boolean
}

function DetailModal({ order, onClose, onStatusUpdate, loading: submitting }: DetailModalProps) {
  const StatusIcon = STATUS_ICON[order.status] ?? Clock

  const nextStatuses: Array<{ value: WorkOrder["status"]; label: string }> = []
  if (order.status === "pendiente") {
    nextStatuses.push({ value: "en_progreso", label: "Iniciar Trabajo" })
    nextStatuses.push({ value: "cancelada", label: "Cancelar" })
  }
  if (order.status === "en_progreso") {
    nextStatuses.push({ value: "completada", label: "Marcar Completada" })
    nextStatuses.push({ value: "cancelada", label: "Cancelar" })
  }
  if (order.status === "cancelada") {
    nextStatuses.push({ value: "pendiente", label: "Reabrir" })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={spring}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-white/30 bg-white/95 p-6 shadow-2xl backdrop-blur-xl"
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400">
              Orden #{order.order_number}
            </p>
            <h2 className="mt-1 text-xl font-bold text-gray-900">{order.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Badges */}
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className={`${TYPE_BADGE[order.maintenance_type] ?? ""} text-xs`}
          >
            {TYPE_LABEL[order.maintenance_type] ?? order.maintenance_type}
          </Badge>
          <Badge
            variant="outline"
            className={`${PRIORITY_BADGE[order.priority] ?? ""} text-xs`}
          >
            {PRIORITY_LABEL[order.priority] ?? order.priority}
          </Badge>
          <Badge
            variant="outline"
            className={`${STATUS_BADGE[order.status] ?? ""} gap-1 text-xs`}
          >
            <StatusIcon className="h-3 w-3" />
            {STATUS_LABEL[order.status] ?? order.status}
          </Badge>
        </div>

        {/* Info grid */}
        <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs font-medium text-gray-400">Equipo</p>
            <p className="text-gray-900">
              {order.equipment?.name ?? "—"}
              {order.equipment?.code && (
                <span className="ml-1 text-xs text-gray-400">
                  ({order.equipment.code})
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400">Asignado a</p>
            <p className="text-gray-900">{order.assigned_to ?? "Sin asignar"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400">Fecha programada</p>
            <p className="text-gray-900">
              {order.scheduled_date
                ? format(new Date(order.scheduled_date), "dd MMM yyyy", {
                    locale: es,
                  })
                : "Sin fecha"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400">Creada</p>
            <p className="text-gray-900">
              {format(new Date(order.created_at), "dd MMM yyyy HH:mm", {
                locale: es,
              })}
            </p>
          </div>
          {order.started_at && (
            <div>
              <p className="text-xs font-medium text-gray-400">Iniciada</p>
              <p className="text-gray-900">
                {format(new Date(order.started_at), "dd MMM yyyy HH:mm", {
                  locale: es,
                })}
              </p>
            </div>
          )}
          {order.completed_at && (
            <div>
              <p className="text-xs font-medium text-gray-400">Completada</p>
              <p className="text-gray-900">
                {format(new Date(order.completed_at), "dd MMM yyyy HH:mm", {
                  locale: es,
                })}
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        {order.description && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-medium text-gray-400">Descripcion</p>
            <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
              {order.description}
            </p>
          </div>
        )}

        {/* Checklist */}
        {order.checklist && order.checklist.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-gray-400">
              Lista de verificacion
            </p>
            <ul className="space-y-1">
              {order.checklist.map((ci, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-sm"
                >
                  <span
                    className={`h-4 w-4 flex-shrink-0 rounded border ${
                      ci.done
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-gray-300 bg-white"
                    } flex items-center justify-center text-xs`}
                  >
                    {ci.done && <CheckCircle2 className="h-3 w-3" />}
                  </span>
                  <span
                    className={ci.done ? "text-gray-400 line-through" : "text-gray-700"}
                  >
                    {ci.item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Observations */}
        {order.observations && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-medium text-gray-400">Observaciones</p>
            <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
              {order.observations}
            </p>
          </div>
        )}

        {/* Spare parts */}
        {order.spare_parts_used && order.spare_parts_used.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-gray-400">
              Repuestos utilizados
            </p>
            <ul className="space-y-1">
              {order.spare_parts_used.map((sp, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-sm"
                >
                  <span className="text-gray-700">{sp.name}</span>
                  <span className="text-xs text-gray-500">x{sp.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cost */}
        {order.cost != null && order.cost > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-400">Costo</p>
            <p className="text-lg font-semibold text-gray-900">
              ${order.cost.toLocaleString("es-CO")}
            </p>
          </div>
        )}

        {/* Status actions */}
        {nextStatuses.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            {nextStatuses.map((ns) => {
              const isDestructive = ns.value === "cancelada"
              return (
                <Button
                  key={ns.value}
                  variant={isDestructive ? "outline" : "default"}
                  size="sm"
                  disabled={submitting}
                  onClick={() => onStatusUpdate(order.id, ns.value)}
                  className={`gap-1.5 rounded-xl ${
                    isDestructive
                      ? "border-red-200 text-red-600 hover:bg-red-50"
                      : "bg-orange-600 hover:bg-orange-700"
                  }`}
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {ns.label}
                </Button>
              )
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Page export (wrapped in Suspense for useSearchParams)
// ---------------------------------------------------------------------------

export default function WorkOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50/30 to-yellow-50/50">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      }
    >
      <WorkOrdersPageInner />
    </Suspense>
  )
}
