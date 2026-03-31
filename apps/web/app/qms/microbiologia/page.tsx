"use client"

import { useState, useEffect, useMemo } from "react"
import { useQMSPrograms, SanitationProgram } from "@/hooks/use-qms-programs"
import { useQMSActivities, ProgramActivity, SamplingScheduleItem } from "@/hooks/use-qms-activities"
import { useQMSRecords, ActivityRecord } from "@/hooks/use-qms-records"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Microscope,
  CalendarDays,
  DollarSign,
  FlaskConical,
  TestTubes,
  Loader2,
  Building2,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Paperclip,
} from "lucide-react"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { ProgramActivitiesSection } from "@/components/qms/ProgramActivitiesSection"
import { RecordAttachmentsModal, AttachmentsBadge } from "@/components/qms/RecordAttachmentsModal"
import { ProgramSuppliersModal } from "@/components/qms/ProgramSuppliersModal"
import { ProgramDocumentModal } from "@/components/qms/ProgramDocumentModal"

// ── Constants ───────────────────────────────────────────────────────────────
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
const MONTHS_FULL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

// Activity accent colors by keyword
const ACTIVITY_COLORS: Record<string, { bg: string; text: string; border: string; badge: string; dot: string; gradient: string }> = {
  "materia prima":     { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200/50 dark:border-amber-800/30", badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300", dot: "bg-amber-500", gradient: "from-amber-400 to-orange-600" },
  "producto terminado":{ bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200/50 dark:border-emerald-800/30", badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500", gradient: "from-emerald-400 to-green-600" },
  "material de empaque":{ bg: "bg-sky-50 dark:bg-sky-950/30", text: "text-sky-700 dark:text-sky-300", border: "border-sky-200/50 dark:border-sky-800/30", badge: "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300", dot: "bg-sky-500", gradient: "from-sky-400 to-blue-600" },
  ambiental:           { bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200/50 dark:border-violet-800/30", badge: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300", dot: "bg-violet-500", gradient: "from-violet-400 to-purple-600" },
  superficies:         { bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200/50 dark:border-rose-800/30", badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300", dot: "bg-rose-500", gradient: "from-rose-400 to-pink-600" },
  manipuladores:       { bg: "bg-teal-50 dark:bg-teal-950/30", text: "text-teal-700 dark:text-teal-300", border: "border-teal-200/50 dark:border-teal-800/30", badge: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300", dot: "bg-teal-500", gradient: "from-teal-400 to-cyan-600" },
  "agua potable":      { bg: "bg-cyan-50 dark:bg-cyan-950/30", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-200/50 dark:border-cyan-800/30", badge: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500", gradient: "from-cyan-400 to-blue-500" },
}

const DEFAULT_COLOR = { bg: "bg-indigo-50 dark:bg-indigo-950/30", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200/50 dark:border-indigo-800/30", badge: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500", gradient: "from-indigo-400 to-purple-600" }

function getActivityColor(title: string) {
  const t = title.toLowerCase()
  for (const [key, val] of Object.entries(ACTIVITY_COLORS)) {
    if (t.includes(key)) return val
  }
  return DEFAULT_COLOR
}

/**
 * Convert a period number to a month number based on frequency.
 * For monthly: period = month (1-12)
 * For quarterly: period 1 = months 1-3, period 2 = months 4-6, etc.
 * For the cronograma we map quarterly period to its first month.
 */
function periodToMonth(period: number, frequency: string): number {
  switch (frequency) {
    case "trimestral": return (period - 1) * 3 + 1
    case "semestral": return (period - 1) * 6 + 1
    case "anual": return 1
    default: return period // mensual
  }
}

function periodMatchesMonth(period: number, frequency: string, month: number): boolean {
  switch (frequency) {
    case "trimestral": {
      const qStart = (period - 1) * 3 + 1
      return month >= qStart && month < qStart + 3
    }
    case "semestral": {
      const sStart = (period - 1) * 6 + 1
      return month >= sStart && month < sStart + 6
    }
    case "anual": return true
    default: return period === month // mensual
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatPrice(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v * 1000)
}

function getResultBadge(resultado?: string) {
  if (!resultado) return { label: "Pendiente", variant: "secondary" as const, icon: Clock }
  if (resultado === "Conforme") return { label: "Conforme", variant: "default" as const, icon: CheckCircle2 }
  if (resultado === "No Conforme") return { label: "No Conforme", variant: "destructive" as const, icon: AlertTriangle }
  return { label: resultado, variant: "secondary" as const, icon: Clock }
}

function normalizeSample(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, " ")
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function MicrobiologiaPage() {
  const { getProgramByCode, updateProgram } = useQMSPrograms()
  const { getActivities } = useQMSActivities()
  const { loading: recordsLoading, getRecords } = useQMSRecords()

  const [program, setProgram] = useState<SanitationProgram | null>(null)
  const [activities, setActivities] = useState<ProgramActivity[]>([])
  const [records, setRecords] = useState<ActivityRecord[]>([])
  const [view, setView] = useState<"cronograma" | "categorias">("cronograma")
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [viewingAttachments, setViewingAttachments] = useState<ActivityRecord | null>(null)
  const [showSuppliers, setShowSuppliers] = useState(false)
  const [showDocument, setShowDocument] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)

  const currentMonth = new Date().getMonth() + 1

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setDataLoading(true)
    const prog = await getProgramByCode("microbiologia")
    if (prog) {
      setProgram(prog)
      const [acts, recs] = await Promise.all([
        getActivities(prog.id),
        getRecords({ programId: prog.id }),
      ])
      setActivities(acts)
      setRecords(recs)
    }
    setDataLoading(false)
  }

  const handleSaveDocument = async (content: string) => {
    if (!program) return
    await updateProgram(program.id, { program_document: content })
    setProgram(prev => prev ? { ...prev, program_document: content } : prev)
  }

  // Build cronograma items from activities' sampling_schedule
  const cronogramaItems = useMemo(() => {
    const items: { activity: ProgramActivity; scheduleItem: SamplingScheduleItem; month: number }[] = []
    activities.forEach(act => {
      if (!act.sampling_schedule) return
      act.sampling_schedule.forEach(si => {
        // For mensual, period = month directly
        // For trimestral, we map to the first month of the quarter
        const month = periodToMonth(si.period, act.frequency)
        items.push({ activity: act, scheduleItem: si, month })
      })
    })
    return items
  }, [activities])

  // Group by month
  const monthlyData = useMemo(() => {
    const map: Record<number, typeof cronogramaItems> = {}
    for (let m = 1; m <= 12; m++) map[m] = []
    cronogramaItems.forEach(item => {
      // For non-monthly frequencies, add to the mapped month
      if (item.activity.frequency === "mensual") {
        map[item.month].push(item)
      } else {
        // For quarterly/etc, add to the first month of that period
        map[item.month].push(item)
      }
    })
    return map
  }, [cronogramaItems])

  // Map records by activity_id
  const recordsByActivity = useMemo(() => {
    const map: Record<string, ActivityRecord[]> = {}
    records.forEach(r => {
      if (!map[r.activity_id]) map[r.activity_id] = []
      map[r.activity_id].push(r)
    })
    return map
  }, [records])

  // Find records for a specific schedule item
  function findRecordsForItem(activityId: string, sampleName: string): ActivityRecord[] {
    const actRecords = recordsByActivity[activityId] || []
    const normalized = normalizeSample(sampleName)
    return actRecords.filter(r => {
      const muestra = r.values?.muestra || r.values?.["Zona/Área"] || r.values?.["Superficie/Equipo"] || r.values?.["Manipulador/Área"] || r.values?.["Punto de Muestreo"] || ""
      return normalizeSample(muestra) === normalized
    })
  }

  const displayMonth = selectedMonth ?? currentMonth

  // Stats
  const stats = useMemo(() => {
    const totalSamples = cronogramaItems.length
    const totalCost = cronogramaItems.reduce((s, i) => s + (i.scheduleItem.price || 0), 0)
    const monthItems = monthlyData[displayMonth] || []
    const monthCost = monthItems.reduce((s, i) => s + (i.scheduleItem.price || 0), 0)
    const completedCount = records.filter(r => r.status === "completado").length
    return { totalSamples, totalCost, monthCost, monthCount: monthItems.length, completedCount }
  }, [cronogramaItems, displayMonth, monthlyData, records])

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50/30 to-violet-50/50 dark:from-gray-950 dark:via-indigo-950/20 dark:to-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50/30 to-violet-50/50 dark:from-gray-950 dark:via-indigo-950/20 dark:to-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-lg shadow-black/5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
                <Microscope className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                  Cronograma de Muestreo Microbiológico
                </h1>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                  Plan de muestreo 2026 &middot; Código CR-06 V2.0
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setShowDocument(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/60 dark:bg-white/10 border border-white/30 dark:border-white/15 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-white/15 transition-colors shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Programa</span>
                </button>
                <button
                  onClick={() => setShowSuppliers(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/60 dark:bg-white/10 border border-white/30 dark:border-white/15 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-white/15 transition-colors shadow-sm"
                >
                  <Building2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Proveedores</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
        >
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TestTubes className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Muestras</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalSamples}</p>
            <p className="text-xs text-gray-400 mt-0.5">Año 2026</p>
          </div>
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Registrados</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completedCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">De {stats.totalSamples} programados</p>
          </div>
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{MONTHS_FULL[displayMonth - 1]}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.monthCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">Muestras del mes</p>
          </div>
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Costo Mes</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(stats.monthCost)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{MONTHS_FULL[displayMonth - 1]} 2026</p>
          </div>
        </motion.div>

        {/* Activities Section (editable) */}
        {program && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
          >
            <ProgramActivitiesSection programId={program.id} accentColor="indigo" />
          </motion.div>
        )}

        {/* View Tabs */}
        <Tabs value={view} onValueChange={(v) => setView(v as "cronograma" | "categorias")} className="space-y-6">
          <TabsList className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl p-1.5 h-auto w-full flex gap-1">
            <TabsTrigger value="cronograma" className="rounded-xl data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/30 text-sm font-medium h-11 transition-all duration-200 flex-1">
              <CalendarDays className="w-4 h-4 mr-2" />
              Cronograma Mensual
            </TabsTrigger>
            <TabsTrigger value="categorias" className="rounded-xl data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/30 text-sm font-medium h-11 transition-all duration-200 flex-1">
              <FlaskConical className="w-4 h-4 mr-2" />
              Por Actividad
            </TabsTrigger>
          </TabsList>

          {/* ── Cronograma View ─────────────────────────────────────────── */}
          <TabsContent value="cronograma" className="space-y-4 mt-0">
            {/* Month selector */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(i + 1)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0",
                    displayMonth === i + 1
                      ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
                      : i + 1 === currentMonth
                        ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
                        : "bg-white/60 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-white/80 dark:hover:bg-white/10 border border-white/20 dark:border-white/10"
                  )}
                >
                  {m}
                  <span className="ml-1.5 text-[10px] opacity-70">({(monthlyData[i + 1] || []).length})</span>
                </button>
              ))}
            </div>

            {/* Month samples */}
            <motion.div key={displayMonth} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{MONTHS_FULL[displayMonth - 1]} 2026</h2>
                    <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
                      {(monthlyData[displayMonth] || []).length} muestras &middot; {formatPrice((monthlyData[displayMonth] || []).reduce((s, d) => s + (d.scheduleItem.price || 0), 0))}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {(monthlyData[displayMonth] || []).length === 0 ? (
                    <div className="text-center py-12">
                      <Microscope className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 dark:text-gray-500 text-sm">No hay muestras programadas este mes</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(monthlyData[displayMonth] || []).map((d, i) => {
                        const colors = getActivityColor(d.activity.title)
                        const itemRecords = findRecordsForItem(d.activity.id, d.scheduleItem.sample)
                        const hasRecords = itemRecords.length > 0
                        const latestRecord = hasRecords ? itemRecords.sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime())[0] : null
                        const resultado = latestRecord?.values?.resultado
                        const resultBadge = getResultBadge(resultado)
                        const ResultIcon = resultBadge.icon
                        const totalAttachments = itemRecords.reduce((s, r) => s + (r.record_attachments?.length || 0), 0)

                        return (
                          <motion.div
                            key={`${d.activity.id}-${d.scheduleItem.sample}-${i}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className={cn("rounded-2xl border transition-colors duration-150", colors.bg, colors.border, "hover:shadow-sm")}
                          >
                            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
                              <div className={cn("w-2 h-2 rounded-full shrink-0", hasRecords ? "bg-green-500" : colors.dot)} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{d.scheduleItem.sample}</p>
                                <span className={cn("text-xs font-medium", colors.text)}>{d.activity.title.replace("Muestreo ", "")}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {hasRecords ? (
                                  <Badge variant={resultBadge.variant} className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold gap-1">
                                    <ResultIcon className="w-3 h-3" />
                                    {resultBadge.label}
                                  </Badge>
                                ) : (
                                  <Badge className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", colors.badge)}>MB</Badge>
                                )}
                                {totalAttachments > 0 && (
                                  <AttachmentsBadge count={totalAttachments} onClick={() => setViewingAttachments(latestRecord)} />
                                )}
                                <span className="text-xs font-mono text-gray-500 dark:text-gray-400 tabular-nums hidden sm:inline">
                                  {formatPrice(d.scheduleItem.price || 0)}
                                </span>
                              </div>
                            </div>

                            {hasRecords && (
                              <div className="border-t border-white/20 dark:border-white/5 px-4 pb-3 pt-2 space-y-2">
                                {itemRecords.map((record) => {
                                  const recResult = getResultBadge(record.values?.resultado)
                                  const RecResultIcon = recResult.icon
                                  return (
                                    <div key={record.id} className="flex items-start gap-3 text-xs">
                                      <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap mt-0.5">
                                        {format(new Date(record.scheduled_date), "d MMM yyyy", { locale: es })}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Badge variant={recResult.variant} className="rounded-full px-2 py-0 text-[10px] gap-0.5">
                                            <RecResultIcon className="w-2.5 h-2.5" />
                                            {recResult.label}
                                          </Badge>
                                          {record.values?.laboratorio && <span className="text-gray-400">Lab: {record.values.laboratorio}</span>}
                                          {record.values?.lote && <span className="text-gray-400">Lote: {record.values.lote}</span>}
                                        </div>
                                        {record.observations && <p className="text-gray-400 italic mt-0.5">{record.observations}</p>}
                                      </div>
                                      {(record.record_attachments?.length || 0) > 0 && (
                                        <button onClick={() => setViewingAttachments(record)} className="flex items-center gap-1 text-indigo-500 hover:text-indigo-600 shrink-0">
                                          <Paperclip className="w-3 h-3" /><span>{record.record_attachments!.length}</span>
                                        </button>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ── By Activity View ────────────────────────────────────────── */}
          <TabsContent value="categorias" className="space-y-4 mt-0">
            {activities.filter(act => act.sampling_schedule && act.sampling_schedule.length > 0).map((act, actIdx) => {
              const colors = getActivityColor(act.title)
              const schedule = act.sampling_schedule || []
              const actCost = schedule.reduce((s, i) => s + (i.price || 0), 0)
              const actRecords = recordsByActivity[act.id] || []
              const completedInAct = actRecords.filter(r => r.status === "completado").length

              return (
                <motion.div key={act.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: actIdx * 0.05 }}>
                  <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md text-white", colors.gradient)}>
                          <FlaskConical className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{act.title.replace("Muestreo ", "")}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {schedule.length} muestras &middot; {formatPrice(actCost)}
                            {completedInAct > 0 && <span className="text-emerald-600 dark:text-emerald-400"> &middot; {completedInAct} registrados</span>}
                          </p>
                        </div>
                        <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px]">{act.frequency}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Mini calendar grid */}
                      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
                        {MONTHS.map((m, mi) => {
                          const month = mi + 1
                          const monthItems = schedule.filter(si => periodMatchesMonth(si.period, act.frequency, month))
                          const hasItems = monthItems.length > 0
                          const isCurrentMonth = month === currentMonth
                          const monthHasRecords = hasItems && monthItems.some(si => findRecordsForItem(act.id, si.sample).length > 0)

                          return (
                            <div
                              key={m}
                              className={cn(
                                "rounded-xl p-2 text-center transition-all duration-150 min-h-[72px] flex flex-col",
                                hasItems ? cn(colors.bg, colors.border, "border") : "bg-gray-50/50 dark:bg-white/[0.02] border border-transparent",
                                isCurrentMonth && "ring-2 ring-offset-1 ring-offset-white/60 dark:ring-offset-black/40 ring-indigo-500/20"
                              )}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span className={cn("text-[10px] font-bold uppercase tracking-wider", hasItems ? colors.text : "text-gray-400 dark:text-gray-600")}>{m}</span>
                                {monthHasRecords && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />}
                              </div>
                              {hasItems ? (
                                <div className="flex-1 flex flex-col justify-center mt-1 gap-0.5">
                                  {monthItems.map((si, idx) => {
                                    const siRecords = findRecordsForItem(act.id, si.sample)
                                    return (
                                      <p
                                        key={idx}
                                        className={cn(
                                          "text-[9px] sm:text-[10px] leading-tight truncate",
                                          siRecords.length > 0 ? "text-emerald-700 dark:text-emerald-300 font-medium" : "text-gray-700 dark:text-gray-300"
                                        )}
                                        title={`${si.sample}${siRecords.length > 0 ? " ✓" : ""}`}
                                      >
                                        {si.sample}
                                      </p>
                                    )
                                  })}
                                </div>
                              ) : (
                                <div className="flex-1 flex items-center justify-center">
                                  <span className="text-[10px] text-gray-300 dark:text-gray-700">&mdash;</span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Records list */}
                      {actRecords.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200/30 dark:border-white/10 space-y-2">
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Registros ({actRecords.length})</h4>
                          {actRecords.slice(0, 5).map((record) => {
                            const recResult = getResultBadge(record.values?.resultado)
                            const RecIcon = recResult.icon
                            return (
                              <div key={record.id} className="flex items-center gap-3 text-xs bg-white/30 dark:bg-white/5 rounded-xl px-3 py-2">
                                <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{format(new Date(record.scheduled_date), "d MMM", { locale: es })}</span>
                                <span className="flex-1 text-gray-700 dark:text-gray-300 truncate font-medium">
                                  {record.values?.muestra || record.values?.["Zona/Área"] || record.values?.["Superficie/Equipo"] || record.values?.["Manipulador/Área"] || record.values?.["Punto de Muestreo"] || "-"}
                                </span>
                                <Badge variant={recResult.variant} className="rounded-full px-2 py-0 text-[10px] gap-0.5 shrink-0">
                                  <RecIcon className="w-2.5 h-2.5" />{recResult.label}
                                </Badge>
                                {(record.record_attachments?.length || 0) > 0 && (
                                  <button onClick={() => setViewingAttachments(record)} className="flex items-center gap-1 text-indigo-500 hover:text-indigo-600 shrink-0">
                                    <Paperclip className="w-3 h-3" /><span>{record.record_attachments!.length}</span>
                                  </button>
                                )}
                              </div>
                            )
                          })}
                          {actRecords.length > 5 && <p className="text-[10px] text-gray-400 text-center">+{actRecords.length - 5} registros más</p>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}

            {activities.filter(act => act.sampling_schedule && act.sampling_schedule.length > 0).length === 0 && (
              <div className="text-center py-16">
                <FlaskConical className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  No hay cronogramas configurados. Edita las actividades y agrega muestras en &quot;Cronograma de Muestreo&quot;.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <RecordAttachmentsModal
        attachments={viewingAttachments?.record_attachments || []}
        open={!!viewingAttachments}
        onClose={() => setViewingAttachments(null)}
        title={viewingAttachments ? `${format(new Date(viewingAttachments.scheduled_date), "d MMM yyyy", { locale: es })}` : undefined}
      />

      {program && (
        <ProgramSuppliersModal open={showSuppliers} onClose={() => setShowSuppliers(false)} programId={program.id} programName="Muestreo Microbiológico" accentColor="indigo" />
      )}

      {program && (
        <ProgramDocumentModal open={showDocument} onClose={() => setShowDocument(false)} programName="Muestreo Microbiológico" accentColor="indigo" document={program.program_document} onSave={handleSaveDocument} />
      )}
    </div>
  )
}
