"use client"

import { useState, useEffect, useMemo, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useQMSPrograms, SanitationProgram } from "@/hooks/use-qms-programs"
import { useQMSActivities, ProgramActivity } from "@/hooks/use-qms-activities"
import { useQMSRecords, ActivityRecord } from "@/hooks/use-qms-records"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
  UserCheck,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  BarChart3,
  ClipboardList,
  Users,
  Save,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { RecordAttachmentsModal, AttachmentsBadge } from "@/components/qms/RecordAttachmentsModal"
import { ProgramActivitiesSection } from "@/components/qms/ProgramActivitiesSection"

// ─── BPM INVIMA Checklist Items (Resolución 2674/2013) ──────────────────────
const BPM_CHECKLIST_ITEMS = [
  { key: "uniforme_limpio", label: "Uniforme limpio y completo" },
  { key: "cofia_gorro", label: "Gorro/cofia (cabello cubierto)" },
  { key: "tapabocas", label: "Tapabocas bien colocado" },
  { key: "sin_joyas", label: "Sin joyas ni accesorios" },
  { key: "unas_cortas", label: "Uñas cortas, limpias, sin esmalte" },
  { key: "manos_limpias", label: "Manos limpias y desinfectadas" },
  { key: "calzado_adecuado", label: "Calzado cerrado y adecuado" },
  { key: "sin_heridas", label: "Sin heridas expuestas" },
  { key: "sin_afecciones", label: "Sin afecciones respiratorias/cutáneas" },
  { key: "lavado_manos", label: "Lavado de manos correcto" },
]

interface EmployeeOption {
  id: string
  full_name: string
  position: string | null
}

interface EmployeeInspection {
  empleado_id: string
  empleado_nombre: string
  empleado_cargo: string
  items: Record<string, boolean>
  puntaje: number
  cumple: boolean
}

function calculateScore(items: Record<string, boolean>): number {
  return BPM_CHECKLIST_ITEMS.filter(i => items[i.key]).length
}

function getScoreBadge(puntaje: number, total: number) {
  const pct = (puntaje / total) * 100
  if (pct >= 80) return { color: "bg-green-500", label: `${puntaje}/${total}` }
  if (pct >= 60) return { color: "bg-yellow-500", label: `${puntaje}/${total}` }
  return { color: "bg-red-500", label: `${puntaje}/${total}` }
}

export default function BPMPage() {
  return (
    <Suspense>
      <BPMPageContent />
    </Suspense>
  )
}

function BPMPageContent() {
  const searchParams = useSearchParams()
  const { getProgramByCode } = useQMSPrograms()
  const { getActivities } = useQMSActivities()
  const { loading: recordsLoading, getRecords, createRecord, completeRecord } = useQMSRecords()

  const [program, setProgram] = useState<SanitationProgram | null>(null)
  const [activity, setActivity] = useState<ProgramActivity | null>(null)
  const [records, setRecords] = useState<ActivityRecord[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [viewingAttachments, setViewingAttachments] = useState<ActivityRecord | null>(null)

  // URL-driven: auto-open form when coming from dashboard calendar
  const dateParam = searchParams.get("date")
  const registerParam = searchParams.get("register")

  // New record form state
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const [inspections, setInspections] = useState<EmployeeInspection[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [observations, setObservations] = useState("")
  const [saving, setSaving] = useState(false)

  // Expanded records
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null)

  // Auto-open form from dashboard link
  useEffect(() => {
    if (registerParam === "true") {
      setShowForm(true)
      if (dateParam) setFormDate(dateParam)
    }
  }, [registerParam, dateParam])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const prog = await getProgramByCode("bpm")
    if (prog) {
      setProgram(prog)
      const [acts, recs] = await Promise.all([
        getActivities(prog.id),
        getRecords({ programId: prog.id }),
      ])
      if (acts.length > 0) setActivity(acts[0])
      setRecords(recs)
    }
    // Fetch employees from HR directory
    setLoadingEmployees(true)
    const { data: empData } = await supabase
      .from("employee_directory")
      .select("id, full_name, position")
      .eq("status", "Activo")
      .order("full_name")
    setEmployees(empData || [])
    setLoadingEmployees(false)
  }

  const employeeOptions = useMemo(() =>
    employees
      .filter(e => !inspections.some(ins => ins.empleado_id === e.id))
      .map(e => ({
        value: e.id,
        label: e.full_name,
        subLabel: e.position || undefined,
      })),
    [employees, inspections]
  )

  const addEmployee = useCallback(() => {
    if (!selectedEmployee) return
    const emp = employees.find(e => e.id === selectedEmployee)
    if (!emp) return

    const defaultItems: Record<string, boolean> = {}
    BPM_CHECKLIST_ITEMS.forEach(i => { defaultItems[i.key] = true })

    setInspections(prev => [...prev, {
      empleado_id: emp.id,
      empleado_nombre: emp.full_name,
      empleado_cargo: emp.position || "",
      items: defaultItems,
      puntaje: BPM_CHECKLIST_ITEMS.length,
      cumple: true,
    }])
    setSelectedEmployee(null)
  }, [selectedEmployee, employees])

  const removeEmployee = useCallback((idx: number) => {
    setInspections(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const toggleItem = useCallback((empIdx: number, itemKey: string) => {
    setInspections(prev => prev.map((ins, i) => {
      if (i !== empIdx) return ins
      const newItems = { ...ins.items, [itemKey]: !ins.items[itemKey] }
      const score = calculateScore(newItems)
      return {
        ...ins,
        items: newItems,
        puntaje: score,
        cumple: score >= 8,
      }
    }))
  }, [])

  const handleSave = async () => {
    if (!activity || !program || inspections.length === 0) {
      toast.error("Agregue al menos un empleado")
      return
    }

    setSaving(true)
    try {
      const promedioCumplimiento = Math.round(
        (inspections.reduce((sum, ins) => sum + ins.puntaje, 0) / (inspections.length * BPM_CHECKLIST_ITEMS.length)) * 100
      )

      const record = await createRecord({
        activity_id: activity.id,
        program_id: program.id,
        scheduled_date: formDate,
        status: "completado",
      })

      await completeRecord(record.id, {
        inspecciones: inspections,
        total_empleados: inspections.length,
        promedio_cumplimiento: promedioCumplimiento,
        empleados_cumplen: inspections.filter(i => i.cumple).length,
        empleados_no_cumplen: inspections.filter(i => !i.cumple).length,
      }, observations || undefined)

      // Refresh records
      const recs = await getRecords({ programId: program.id })
      setRecords(recs)
      setInspections([])
      setObservations("")
      setShowForm(false)
      toast.success("Registro BPM guardado exitosamente")
    } catch {
      toast.error("Error al guardar el registro")
    } finally {
      setSaving(false)
    }
  }

  // Chart data: compliance % over last records
  const chartData = useMemo(() => {
    return records
      .filter(r => r.values?.promedio_cumplimiento != null)
      .slice(0, 12)
      .reverse()
  }, [records])

  const maxPct = 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-lime-50 via-green-50/30 to-emerald-50/50 dark:from-gray-950 dark:via-lime-950/20 dark:to-gray-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-lg shadow-black/5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-lime-400 to-green-600 flex items-center justify-center shadow-lg shadow-lime-500/30 shrink-0">
                <UserCheck className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                  Buenas Prácticas de Manufactura
                </h1>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                  Inspección de higiene personal - Resolución 2674/2013 INVIMA. Lunes, Miércoles y Sábado.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Activities Section */}
        {program && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.05 }}
          >
            <ProgramActivitiesSection programId={program.id} accentColor="lime" />
          </motion.div>
        )}

        {/* New Record Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-lime-500" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Nuevo Registro BPM — {format(parseISO(formDate), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                    </h2>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Employee selector */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <SearchableSelect
                        options={employeeOptions}
                        value={selectedEmployee}
                        onChange={setSelectedEmployee}
                        placeholder={loadingEmployees ? "Cargando empleados..." : "Buscar empleado..."}
                        icon={<Users className="w-4 h-4" />}
                        disabled={loadingEmployees}
                      />
                    </div>
                    <Button
                      onClick={addEmployee}
                      disabled={!selectedEmployee}
                      className="bg-lime-500 hover:bg-lime-600 text-white rounded-xl shrink-0"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar
                    </Button>
                  </div>

                  {/* Inspections list */}
                  {inspections.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 dark:text-gray-500 text-sm">
                        Agregue empleados para iniciar la inspección
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {inspections.map((ins, empIdx) => {
                        const badge = getScoreBadge(ins.puntaje, BPM_CHECKLIST_ITEMS.length)
                        return (
                          <motion.div
                            key={ins.empleado_id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white/50 dark:bg-white/5 rounded-2xl border border-white/20 dark:border-white/5 overflow-hidden"
                          >
                            {/* Employee header */}
                            <div className="flex items-center gap-3 p-4">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                                  {ins.empleado_nombre}
                                </p>
                                {ins.empleado_cargo && (
                                  <p className="text-xs text-gray-400 truncate">{ins.empleado_cargo}</p>
                                )}
                              </div>
                              <Badge className={`${badge.color} text-white rounded-full px-2.5 py-0.5 text-[11px] font-medium`}>
                                {badge.label}
                              </Badge>
                              {ins.cumple ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                              )}
                              <button
                                onClick={() => removeEmployee(empIdx)}
                                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Checklist grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-t border-white/10 dark:border-white/5">
                              {BPM_CHECKLIST_ITEMS.map((item, itemIdx) => (
                                <button
                                  key={item.key}
                                  onClick={() => toggleItem(empIdx, item.key)}
                                  className={`flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 ${
                                    ins.items[item.key]
                                      ? "bg-green-50/50 dark:bg-green-500/5 hover:bg-green-50 dark:hover:bg-green-500/10"
                                      : "bg-red-50/50 dark:bg-red-500/5 hover:bg-red-50 dark:hover:bg-red-500/10"
                                  } ${itemIdx % 2 === 0 && itemIdx < BPM_CHECKLIST_ITEMS.length - 1 ? "sm:border-r border-white/10 dark:border-white/5" : ""}`}
                                >
                                  {ins.items[item.key] ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                                  )}
                                  <span className={`text-xs font-medium ${
                                    ins.items[item.key]
                                      ? "text-gray-700 dark:text-gray-300"
                                      : "text-red-600 dark:text-red-400"
                                  }`}>
                                    {item.label}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}

                  {/* Observations */}
                  {inspections.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                        Observaciones (opcional)
                      </label>
                      <textarea
                        value={observations}
                        onChange={e => setObservations(e.target.value)}
                        placeholder="Observaciones generales del registro..."
                        className="w-full rounded-xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/5 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-500/30 resize-none"
                        rows={2}
                      />
                    </div>
                  )}

                  {/* Summary + Save */}
                  {inspections.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-white/10">
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span><strong className="text-gray-700 dark:text-gray-300">{inspections.length}</strong> empleados</span>
                        <span><strong className="text-green-600">{inspections.filter(i => i.cumple).length}</strong> cumplen</span>
                        <span><strong className="text-red-600">{inspections.filter(i => !i.cumple).length}</strong> no cumplen</span>
                        <span>
                          Promedio: <strong className="text-gray-700 dark:text-gray-300">
                            {Math.round((inspections.reduce((s, i) => s + i.puntaje, 0) / (inspections.length * BPM_CHECKLIST_ITEMS.length)) * 100)}%
                          </strong>
                        </span>
                      </div>
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-lime-500 hover:bg-lime-600 text-white rounded-xl shadow-md shadow-lime-500/30"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Guardar Registro
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compliance Chart */}
        {chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
          >
            <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-lime-500" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Evolución del Cumplimiento BPM
                  </h2>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative h-36 sm:h-44 flex items-end gap-2 sm:gap-3 px-2">
                  {/* 80% threshold line */}
                  <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none">
                    <div
                      className="absolute inset-x-0 bg-green-500/10 dark:bg-green-500/5 border-y border-green-500/20"
                      style={{ bottom: "80%", top: "0%" }}
                    />
                    <div
                      className="absolute right-2 text-[10px] text-green-600 dark:text-green-400 font-medium"
                      style={{ bottom: "80%", transform: "translateY(50%)" }}
                    >
                      80%
                    </div>
                  </div>

                  {chartData.map((r, i) => {
                    const pct = r.values?.promedio_cumplimiento || 0
                    const barColor = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500"
                    return (
                      <motion.div
                        key={r.id}
                        className="flex-1 flex flex-col items-center gap-1 relative z-10"
                        initial={{ opacity: 0, scaleY: 0 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        transition={{ delay: i * 0.05 }}
                        style={{ originY: 1 }}
                      >
                        <span className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400">
                          {pct}%
                        </span>
                        <div
                          className={`w-full max-w-[40px] rounded-t-lg ${barColor} transition-all duration-300`}
                          style={{ height: `${pct}%`, minHeight: "4px" }}
                        />
                        <span className="text-[9px] sm:text-[10px] text-gray-400 truncate max-w-full">
                          {format(new Date(r.scheduled_date), "d MMM", { locale: es })}
                        </span>
                      </motion.div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Records History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.15 }}
        >
          <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
            <CardHeader className="pb-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Historial de Registros
              </h2>
            </CardHeader>
            <CardContent>
              {recordsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-lime-500" />
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 dark:text-gray-500 text-sm">No hay registros aún</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {records.map((record, i) => {
                    const pct = record.values?.promedio_cumplimiento ?? 0
                    const totalEmp = record.values?.total_empleados ?? 0
                    const cumplen = record.values?.empleados_cumplen ?? 0
                    const noCumplen = record.values?.empleados_no_cumplen ?? 0
                    const isExpanded = expandedRecord === record.id
                    const inspList: EmployeeInspection[] = record.values?.inspecciones || []
                    const pctColor = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500"

                    return (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="bg-white/40 dark:bg-white/5 rounded-2xl border border-white/20 dark:border-white/5 overflow-hidden"
                      >
                        {/* Record header */}
                        <button
                          onClick={() => setExpandedRecord(isExpanded ? null : record.id)}
                          className="w-full flex items-center gap-3 p-4 hover:bg-white/30 dark:hover:bg-white/8 transition-colors text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {format(new Date(record.scheduled_date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                              </span>
                              <Badge className={`${pctColor} text-white rounded-full px-2.5 py-0.5 text-[10px] font-medium`}>
                                {pct}%
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                              <span>{totalEmp} empleados</span>
                              <span className="text-green-600">{cumplen} cumplen</span>
                              {noCumplen > 0 && (
                                <span className="text-red-600">{noCumplen} no cumplen</span>
                              )}
                            </div>
                            {record.observations && (
                              <p className="text-xs text-gray-400 mt-1 italic">{record.observations}</p>
                            )}
                          </div>
                          {(record.record_attachments?.length || 0) > 0 && (
                            <AttachmentsBadge
                              count={record.record_attachments?.length || 0}
                              onClick={(e) => {
                                e.stopPropagation()
                                setViewingAttachments(record)
                              }}
                            />
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                          )}
                        </button>

                        {/* Expanded: employee details */}
                        <AnimatePresence>
                          {isExpanded && inspList.length > 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="border-t border-white/10 dark:border-white/5 overflow-hidden"
                            >
                              <div className="p-4 space-y-2">
                                {inspList.map((ins, idx) => {
                                  const badge = getScoreBadge(ins.puntaje, BPM_CHECKLIST_ITEMS.length)
                                  const failedItems = BPM_CHECKLIST_ITEMS.filter(item => !ins.items[item.key])
                                  return (
                                    <div
                                      key={idx}
                                      className="flex items-start gap-3 bg-white/30 dark:bg-white/3 rounded-xl p-3"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {ins.empleado_nombre}
                                          </span>
                                          <Badge className={`${badge.color} text-white rounded-full px-2 py-0 text-[10px]`}>
                                            {badge.label}
                                          </Badge>
                                          {ins.cumple ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                          ) : (
                                            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                                          )}
                                        </div>
                                        {ins.empleado_cargo && (
                                          <p className="text-[11px] text-gray-400">{ins.empleado_cargo}</p>
                                        )}
                                        {failedItems.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-1.5">
                                            {failedItems.map(fi => (
                                              <span key={fi.key} className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
                                                {fi.label}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <RecordAttachmentsModal
        attachments={viewingAttachments?.record_attachments || []}
        open={!!viewingAttachments}
        onClose={() => setViewingAttachments(null)}
        title={viewingAttachments ? `${format(new Date(viewingAttachments.scheduled_date), "d MMM yyyy", { locale: es })}` : undefined}
      />
    </div>
  )
}
