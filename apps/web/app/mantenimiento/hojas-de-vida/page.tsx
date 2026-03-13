"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  History,
  Plus,
  X,
  Clock,
  DollarSign,
  Wrench,
  User,
  MapPin,
  FileText,
  ExternalLink,
  Package,
  AlertCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import {
  useMaintenanceLifeRecords,
  type EquipmentLifeRecord,
} from "@/hooks/use-maintenance-life-records"
import {
  useMaintenanceEquipment,
  type Equipment,
} from "@/hooks/use-maintenance-equipment"

const spring = { type: "spring" as const, stiffness: 300, damping: 30 }

const STATUS_CONFIG: Record<Equipment["status"], { label: string; color: string }> = {
  operativo: { label: "Operativo", color: "bg-green-100 text-green-800 border-green-200" },
  en_mantenimiento: { label: "En Mantenimiento", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  fuera_servicio: { label: "Fuera de Servicio", color: "bg-red-100 text-red-800 border-red-200" },
  dado_de_baja: { label: "Dado de Baja", color: "bg-gray-100 text-gray-600 border-gray-200" },
}

const TYPE_CONFIG: Record<
  EquipmentLifeRecord["intervention_type"],
  { label: string; color: string }
> = {
  preventivo: { label: "Preventivo", color: "bg-blue-100 text-blue-800 border-blue-200" },
  correctivo: { label: "Correctivo", color: "bg-red-100 text-red-800 border-red-200" },
  predictivo: { label: "Predictivo", color: "bg-purple-100 text-purple-800 border-purple-200" },
  instalacion: { label: "Instalación", color: "bg-green-100 text-green-800 border-green-200" },
  calibracion: { label: "Calibración", color: "bg-amber-100 text-amber-800 border-amber-200" },
  inspeccion: { label: "Inspección", color: "bg-slate-100 text-slate-800 border-slate-200" },
}

const TYPE_DOT_COLOR: Record<EquipmentLifeRecord["intervention_type"], string> = {
  preventivo: "bg-blue-500",
  correctivo: "bg-red-500",
  predictivo: "bg-purple-500",
  instalacion: "bg-green-500",
  calibracion: "bg-amber-500",
  inspeccion: "bg-slate-500",
}

const INTERVENTION_TYPES: EquipmentLifeRecord["intervention_type"][] = [
  "preventivo",
  "correctivo",
  "predictivo",
  "instalacion",
  "calibracion",
  "inspeccion",
]

const EMPTY_FORM = {
  record_date: new Date().toISOString().slice(0, 10),
  intervention_type: "preventivo" as EquipmentLifeRecord["intervention_type"],
  description: "",
  technician: "",
  cost: "",
  spare_parts_used: "",
  downtime_hours: "",
  observations: "",
}

export default function HojasDeVidaPage() {
  const { loading: loadingRecords, getLifeRecords, createLifeRecord } = useMaintenanceLifeRecords()
  const { loading: loadingEquipment, getEquipment } = useMaintenanceEquipment()

  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>("")
  const [records, setRecords] = useState<EquipmentLifeRecord[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const selectedEquipment = equipmentList.find((eq) => eq.id === selectedEquipmentId) || null

  // Load equipment list on mount
  useEffect(() => {
    getEquipment().then(setEquipmentList)
  }, [getEquipment])

  // Load records when equipment is selected
  useEffect(() => {
    if (!selectedEquipmentId) {
      setRecords([])
      return
    }
    getLifeRecords({ equipmentId: selectedEquipmentId }).then(setRecords)
  }, [selectedEquipmentId, getLifeRecords])

  const handleSubmit = async () => {
    if (!selectedEquipmentId || !form.description.trim()) return
    setSubmitting(true)
    try {
      await createLifeRecord({
        equipment_id: selectedEquipmentId,
        record_date: form.record_date,
        intervention_type: form.intervention_type,
        description: form.description.trim(),
        technician: form.technician.trim() || null,
        cost: form.cost ? parseFloat(form.cost) : null,
        spare_parts_used: form.spare_parts_used.trim() || null,
        downtime_hours: form.downtime_hours ? parseFloat(form.downtime_hours) : null,
        observations: form.observations.trim() || null,
      })
      setShowModal(false)
      setForm(EMPTY_FORM)
      // Reload records
      const updated = await getLifeRecords({ equipmentId: selectedEquipmentId })
      setRecords(updated)
    } catch {
      // Error handled by hook
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-yellow-50/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-amber-100 rounded-xl">
              <History className="h-6 w-6 text-amber-700" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Hojas de Vida de Equipos
            </h1>
          </div>
          <p className="text-muted-foreground ml-14">
            Historial completo de intervenciones y mantenimientos
          </p>
        </motion.div>

        {/* Equipment selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-4 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Label className="text-sm font-medium text-gray-700 shrink-0">
              Seleccionar equipo
            </Label>
            <div className="w-full sm:flex-1">
              <Select
                value={selectedEquipmentId}
                onValueChange={setSelectedEquipmentId}
              >
                <SelectTrigger className="bg-white/60 border-white/40 rounded-xl">
                  <SelectValue placeholder={loadingEquipment ? "Cargando equipos..." : "Seleccione un equipo"} />
                </SelectTrigger>
                <SelectContent>
                  {equipmentList.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.name}{eq.code ? ` (${eq.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedEquipmentId && (
              <Button
                onClick={() => setShowModal(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl shrink-0"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Nuevo Registro
              </Button>
            )}
          </div>
        </motion.div>

        {/* Equipment summary card */}
        <AnimatePresence mode="wait">
          {selectedEquipment && (
            <motion.div
              key={selectedEquipment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-gray-900">
                      {selectedEquipment.name}
                    </h2>
                    <Badge className={`${STATUS_CONFIG[selectedEquipment.status].color} border font-medium`}>
                      {STATUS_CONFIG[selectedEquipment.status].label}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                    {selectedEquipment.code && (
                      <span className="font-mono">{selectedEquipment.code}</span>
                    )}
                    {selectedEquipment.brand && (
                      <span className="flex items-center gap-1">
                        <Wrench className="h-3.5 w-3.5" />
                        {selectedEquipment.brand}
                      </span>
                    )}
                    {selectedEquipment.model && (
                      <span className="flex items-center gap-1">
                        <Package className="h-3.5 w-3.5" />
                        {selectedEquipment.model}
                      </span>
                    )}
                    {selectedEquipment.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {selectedEquipment.location}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground shrink-0">
                  <span className="font-semibold text-gray-700">{records.length}</span>{" "}
                  {records.length === 1 ? "registro" : "registros"}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timeline */}
        {selectedEquipmentId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-0"
          >
            {loadingRecords ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-amber-600 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Cargando registros...</p>
              </div>
            ) : records.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">
                  No hay registros de intervenciones para este equipo
                </p>
                <Button
                  onClick={() => setShowModal(true)}
                  variant="outline"
                  className="mt-4 rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Agregar primer registro
                </Button>
              </motion.div>
            ) : (
              <div className="relative">
                {/* Timeline vertical line */}
                <div className="absolute left-[17px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-amber-300 via-amber-200 to-transparent" />

                <AnimatePresence>
                  {records.map((record, i) => {
                    const typeConfig = TYPE_CONFIG[record.intervention_type]
                    const dotColor = TYPE_DOT_COLOR[record.intervention_type]
                    const formattedDate = format(
                      new Date(record.record_date),
                      "d 'de' MMMM, yyyy",
                      { locale: es }
                    )

                    return (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ ...spring, delay: i * 0.04 }}
                        className="relative pl-10 pb-6"
                      >
                        {/* Timeline dot */}
                        <div
                          className={`absolute left-2.5 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ${dotColor}`}
                        />

                        {/* Card */}
                        <div className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={`${typeConfig.color} border font-medium text-xs`}>
                                {typeConfig.label}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formattedDate}
                              </span>
                            </div>
                            {record.work_order_id && record.work_orders && (
                              <a
                                href={`/mantenimiento/ordenes?id=${record.work_order_id}`}
                                className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-800 bg-amber-50 px-2 py-1 rounded-lg hover:bg-amber-100 transition-colors shrink-0"
                              >
                                <ExternalLink className="h-3 w-3" />
                                OT #{record.work_orders.order_number}
                              </a>
                            )}
                          </div>

                          <p className="text-sm text-gray-800 mb-3">{record.description}</p>

                          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                            {record.technician && (
                              <span className="inline-flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                {record.technician}
                              </span>
                            )}
                            {record.cost != null && (
                              <span className="inline-flex items-center gap-1">
                                <DollarSign className="h-3.5 w-3.5" />
                                ${record.cost.toLocaleString("es-CO")}
                              </span>
                            )}
                            {record.spare_parts_used && (
                              <span className="inline-flex items-center gap-1">
                                <Wrench className="h-3.5 w-3.5" />
                                {record.spare_parts_used}
                              </span>
                            )}
                            {record.downtime_hours != null && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {record.downtime_hours}h inactividad
                              </span>
                            )}
                          </div>

                          {record.observations && (
                            <div className="mt-2.5 pt-2.5 border-t border-gray-100">
                              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                {record.observations}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {/* Prompt to select equipment */}
        {!selectedEquipmentId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-center py-20"
          >
            <History className="h-14 w-14 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-lg">
              Seleccione un equipo para ver su hoja de vida
            </p>
          </motion.div>
        )}
      </div>

      {/* New Record Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={spring}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/90 backdrop-blur-2xl border border-white/40 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              {/* Modal header */}
              <div className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-white/30 p-5 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-lg font-bold text-gray-900">Nuevo Registro</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-5 space-y-4">
                {/* Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="record_date">Fecha</Label>
                  <Input
                    id="record_date"
                    type="date"
                    value={form.record_date}
                    onChange={(e) => setForm({ ...form, record_date: e.target.value })}
                    className="bg-white/60 border-white/40 rounded-xl"
                  />
                </div>

                {/* Intervention type */}
                <div className="space-y-1.5">
                  <Label>Tipo de Intervención</Label>
                  <Select
                    value={form.intervention_type}
                    onValueChange={(val) =>
                      setForm({
                        ...form,
                        intervention_type: val as EquipmentLifeRecord["intervention_type"],
                      })
                    }
                  >
                    <SelectTrigger className="bg-white/60 border-white/40 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERVENTION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {TYPE_CONFIG[type].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="description">Descripción *</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describa la intervención realizada..."
                    rows={3}
                    className="bg-white/60 border-white/40 rounded-xl resize-none"
                  />
                </div>

                {/* Technician */}
                <div className="space-y-1.5">
                  <Label htmlFor="technician">Técnico</Label>
                  <Input
                    id="technician"
                    value={form.technician}
                    onChange={(e) => setForm({ ...form, technician: e.target.value })}
                    placeholder="Nombre del técnico"
                    className="bg-white/60 border-white/40 rounded-xl"
                  />
                </div>

                {/* Cost & Downtime row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cost">Costo ($)</Label>
                    <Input
                      id="cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.cost}
                      onChange={(e) => setForm({ ...form, cost: e.target.value })}
                      placeholder="0.00"
                      className="bg-white/60 border-white/40 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="downtime_hours">Horas Inactividad</Label>
                    <Input
                      id="downtime_hours"
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.downtime_hours}
                      onChange={(e) => setForm({ ...form, downtime_hours: e.target.value })}
                      placeholder="0"
                      className="bg-white/60 border-white/40 rounded-xl"
                    />
                  </div>
                </div>

                {/* Spare parts */}
                <div className="space-y-1.5">
                  <Label htmlFor="spare_parts_used">Repuestos Utilizados</Label>
                  <Input
                    id="spare_parts_used"
                    value={form.spare_parts_used}
                    onChange={(e) => setForm({ ...form, spare_parts_used: e.target.value })}
                    placeholder="Ej: Rodamiento SKF 6205, Correa A-42"
                    className="bg-white/60 border-white/40 rounded-xl"
                  />
                </div>

                {/* Observations */}
                <div className="space-y-1.5">
                  <Label htmlFor="observations">Observaciones</Label>
                  <Textarea
                    id="observations"
                    value={form.observations}
                    onChange={(e) => setForm({ ...form, observations: e.target.value })}
                    placeholder="Observaciones adicionales..."
                    rows={2}
                    className="bg-white/60 border-white/40 rounded-xl resize-none"
                  />
                </div>
              </div>

              {/* Modal footer */}
              <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-white/30 p-5 flex justify-end gap-3 rounded-b-2xl">
                <Button
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !form.description.trim()}
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
                >
                  {submitting ? "Guardando..." : "Guardar Registro"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
