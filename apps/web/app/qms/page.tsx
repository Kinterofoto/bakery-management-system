"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CalendarDays,
  Columns3,
  Droplets,
  Trash2,
  SprayCan,
  Bug,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  PlayCircle,
  Send,
  List,
  ClipboardCheck,
  Search,
  Filter,
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
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  isBefore,
  startOfDay,
  addMonths,
  subMonths,
  getDay,
  getDate,
  getMonth,
  startOfWeek,
  endOfWeek,
  parseISO,
  isMonday,
  isTuesday,
  isWednesday,
  isThursday,
  isFriday,
  getISODay,
  getYear,
  setMonth as setDateMonth,
  getDaysInMonth,
} from "date-fns"
import { es } from "date-fns/locale"

import { useQMSPrograms, type SanitationProgram } from "@/hooks/use-qms-programs"
import { useQMSActivities, type ProgramActivity, type FormField } from "@/hooks/use-qms-activities"
import { useQMSRecords, type ActivityRecord } from "@/hooks/use-qms-records"
import { useQMSCorrectiveActions, type CorrectiveAction } from "@/hooks/use-qms-corrective-actions"

// ─── Types ──────────────────────────────────────────────────────────────────
interface ScheduledItem {
  id: string
  activity_id: string
  program_id: string
  scheduled_date: string
  status: "pendiente" | "en_progreso" | "completado" | "vencido" | "no_aplica"
  isVirtual: boolean // true = generated from frequency, not a real DB record
  record?: ActivityRecord // the real record if exists
  activity: ProgramActivity
  program_activities?: ActivityRecord["program_activities"]
}

// ─── Program color mapping ──────────────────────────────────────────────────
const PROGRAM_COLORS: Record<string, { bg: string; text: string; dot: string; ring: string; badge: string }> = {
  "agua-potable": {
    bg: "bg-cyan-500/10",
    text: "text-cyan-700 dark:text-cyan-300",
    dot: "bg-cyan-500",
    ring: "ring-cyan-500/30",
    badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  },
  residuos: {
    bg: "bg-green-500/10",
    text: "text-green-700 dark:text-green-300",
    dot: "bg-green-500",
    ring: "ring-green-500/30",
    badge: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  },
  limpieza: {
    bg: "bg-purple-500/10",
    text: "text-purple-700 dark:text-purple-300",
    dot: "bg-purple-500",
    ring: "ring-purple-500/30",
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  },
  plagas: {
    bg: "bg-orange-500/10",
    text: "text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500",
    ring: "ring-orange-500/30",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  },
}

function getProgramStyle(code?: string | null) {
  if (!code) return PROGRAM_COLORS["agua-potable"]
  const normalized = code.toLowerCase().replace(/_/g, "-").replace("solidos", "").replace("desinfeccion", "").replace("manejo-", "")
  // Try direct match first, then partial match
  if (PROGRAM_COLORS[normalized]) return PROGRAM_COLORS[normalized]
  for (const [key, val] of Object.entries(PROGRAM_COLORS)) {
    if (normalized.includes(key) || key.includes(normalized)) return val
  }
  return PROGRAM_COLORS["agua-potable"]
}

const PROGRAM_ICONS: Record<string, React.ReactNode> = {
  "agua-potable": <Droplets className="w-5 h-5" />,
  residuos: <Trash2 className="w-5 h-5" />,
  limpieza: <SprayCan className="w-5 h-5" />,
  plagas: <Bug className="w-5 h-5" />,
}

function getProgramIcon(code?: string | null) {
  if (!code) return <Activity className="w-5 h-5" />
  const normalized = code.toLowerCase().replace(/_/g, "-")
  for (const [key, icon] of Object.entries(PROGRAM_ICONS)) {
    if (normalized.includes(key)) return icon
  }
  return <Activity className="w-5 h-5" />
}

function getProgramColorCode(code?: string | null): string {
  if (!code) return "#06B6D4"
  const n = code.toLowerCase()
  if (n.includes("agua")) return "#06B6D4"
  if (n.includes("residuo")) return "#22C55E"
  if (n.includes("limpieza")) return "#A855F7"
  if (n.includes("plaga")) return "#F97316"
  return "#06B6D4"
}

// ─── Status helpers ─────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  en_progreso: { label: "En Progreso", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  completado: { label: "Completado", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  vencido: { label: "Vencido", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  no_aplica: { label: "No Aplica", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300" },
}

// ─── Schedule generation ────────────────────────────────────────────────────
function generateScheduledDates(activity: ProgramActivity, rangeStart: Date, rangeEnd: Date): string[] {
  const dates: string[] = []
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd })

  for (const day of days) {
    const dayOfWeek = getISODay(day) // 1=Mon, 7=Sun
    const dayOfMonth = getDate(day)
    const monthOfYear = getMonth(day) + 1 // 1-12

    let matches = false

    switch (activity.frequency) {
      case "diario":
        // Every weekday (Mon-Sat) - skip Sunday for factory context
        matches = dayOfWeek <= 6
        break
      case "semanal":
        // If day_of_week set, use it; else default to Monday
        matches = dayOfWeek === (activity.day_of_week || 1)
        break
      case "quincenal":
        // 1st and 15th of each month, or day_of_month if set
        if (activity.day_of_month) {
          matches = dayOfMonth === activity.day_of_month || dayOfMonth === Math.min(activity.day_of_month + 14, 28)
        } else {
          matches = dayOfMonth === 1 || dayOfMonth === 15
        }
        break
      case "mensual":
        // specific day of month or 1st
        matches = dayOfMonth === (activity.day_of_month || 1)
        break
      case "trimestral":
        // every 3 months on specific day
        matches = dayOfMonth === (activity.day_of_month || 1) && (monthOfYear % 3 === 1)
        break
      case "semestral":
        // every 6 months
        matches = dayOfMonth === (activity.day_of_month || 1) && (monthOfYear === 1 || monthOfYear === 7)
        break
      case "anual":
        // once a year
        matches = dayOfMonth === (activity.day_of_month || 1) && monthOfYear === (activity.month_of_year || 1)
        break
    }

    if (matches) {
      dates.push(format(day, "yyyy-MM-dd"))
    }
  }

  return dates
}

// ─── Animation variants ─────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 28 } },
}

const slideInRight = {
  hidden: { x: "100%", opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
  exit: { x: "100%", opacity: 0, transition: { duration: 0.2 } },
}

// ─── Circular Progress ──────────────────────────────────────────────────────
function CircularProgress({ value, size = 48, strokeWidth = 4, color }: { value: number; size?: number; strokeWidth?: number; color: string }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-gray-200/50 dark:text-white/10" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700 ease-out" />
    </svg>
  )
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function QMSDashboardPage() {
  const { getPrograms } = useQMSPrograms()
  const { getActivities } = useQMSActivities()
  const { getRecords, createRecord, completeRecord } = useQMSRecords()
  const { getCorrectiveActions } = useQMSCorrectiveActions()

  const [programs, setPrograms] = useState<SanitationProgram[]>([])
  const [activities, setActivities] = useState<ProgramActivity[]>([])
  const [records, setRecords] = useState<ActivityRecord[]>([])
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([])
  const [loading, setLoading] = useState(true)

  // View state
  const [view, setView] = useState<"calendar" | "kanban" | "lista">("calendar")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [calendarMode, setCalendarMode] = useState<"mes" | "anual">("mes")

  // Filters
  const [selectedProgramIds, setSelectedProgramIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")

  // Completion dialog
  const [completingItem, setCompletingItem] = useState<ScheduledItem | null>(null)
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const [formObservations, setFormObservations] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Fetch data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [programsData, activitiesData, recordsData, caData] = await Promise.all([
        getPrograms(),
        getActivities(),
        getRecords(),
        getCorrectiveActions(),
      ])
      setPrograms(programsData)
      setActivities(activitiesData)
      setRecords(recordsData)
      setCorrectiveActions(caData)
    } finally {
      setLoading(false)
    }
  }, [getPrograms, getActivities, getRecords, getCorrectiveActions])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ─── Build scheduled items (merge real records + virtual pending) ──────
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = calendarMode === "anual"
    ? startOfMonth(new Date(getYear(currentMonth), 0, 1))
    : startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = calendarMode === "anual"
    ? endOfMonth(new Date(getYear(currentMonth), 11, 31))
    : endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = calendarMode === "anual"
    ? [] // Annual view generates its own days per month
    : eachDayOfInterval({ start: startOfWeek(monthStart, { weekStartsOn: 1 }), end: endOfWeek(monthEnd, { weekStartsOn: 1 }) })

  const allItems = useMemo(() => {
    const items: ScheduledItem[] = []
    const today = startOfDay(new Date())

    // Index real records by activity_id + date for quick lookup
    const recordIndex = new Map<string, ActivityRecord>()
    records.forEach((r) => {
      const key = `${r.activity_id}::${r.scheduled_date?.substring(0, 10)}`
      recordIndex.set(key, r)
    })

    // For each active activity, generate scheduled dates across the visible calendar range
    activities.forEach((activity) => {
      if (activity.status !== "activo") return

      const scheduledDates = generateScheduledDates(activity, calendarStart, calendarEnd)

      scheduledDates.forEach((dateStr) => {
        const key = `${activity.id}::${dateStr}`
        const existingRecord = recordIndex.get(key)

        if (existingRecord) {
          // Real record exists for this date
          items.push({
            id: existingRecord.id,
            activity_id: activity.id,
            program_id: activity.program_id,
            scheduled_date: dateStr,
            status: existingRecord.status,
            isVirtual: false,
            record: existingRecord,
            activity,
            program_activities: existingRecord.program_activities || {
              id: activity.id,
              title: activity.title,
              activity_type: activity.activity_type,
              area: activity.area,
              form_fields: activity.form_fields,
              requires_evidence: activity.requires_evidence,
              sanitation_programs: activity.sanitation_programs,
            },
          })
          // Remove from index so we don't double-count
          recordIndex.delete(key)
        } else {
          // Virtual scheduled item - no record yet
          const scheduledDay = parseISO(dateStr)
          const isPast = isBefore(scheduledDay, today)

          items.push({
            id: `virtual::${activity.id}::${dateStr}`,
            activity_id: activity.id,
            program_id: activity.program_id,
            scheduled_date: dateStr,
            status: isPast ? "vencido" : "pendiente",
            isVirtual: true,
            activity,
            program_activities: {
              id: activity.id,
              title: activity.title,
              activity_type: activity.activity_type,
              area: activity.area,
              form_fields: activity.form_fields,
              requires_evidence: activity.requires_evidence,
              sanitation_programs: activity.sanitation_programs,
            },
          })
        }
      })
    })

    // Also add any real records that didn't match a generated schedule (manual entries)
    recordIndex.forEach((record) => {
      const dateStr = record.scheduled_date?.substring(0, 10)
      if (!dateStr) return
      const matchedActivity = activities.find((a) => a.id === record.activity_id)
      items.push({
        id: record.id,
        activity_id: record.activity_id,
        program_id: record.program_id,
        scheduled_date: dateStr,
        status: record.status,
        isVirtual: false,
        record: record,
        activity: matchedActivity!,
        program_activities: record.program_activities,
      })
    })

    // Also add corrective actions that have a scheduled_date in this range
    correctiveActions.forEach((ca) => {
      if (!ca.scheduled_date) return
      const dateStr = ca.scheduled_date.substring(0, 10)
      const caDay = parseISO(dateStr)
      if (isBefore(caDay, calendarStart) || isBefore(calendarEnd, caDay)) return

      const mappedStatus = ca.status === "completada" ? "completado" : ca.status === "vencida" ? "vencido" : ca.status === "en_progreso" ? "en_progreso" : "pendiente"

      items.push({
        id: `ca::${ca.id}`,
        activity_id: "",
        program_id: ca.program_id,
        scheduled_date: dateStr,
        status: mappedStatus as any,
        isVirtual: false,
        activity: null as any,
        program_activities: {
          id: ca.id,
          title: `AC: ${ca.description.substring(0, 60)}`,
          activity_type: "accion_correctiva",
          area: null,
          form_fields: [],
          requires_evidence: false,
          sanitation_programs: ca.sanitation_programs || undefined,
        },
      })
    })

    return items
  }, [activities, records, correctiveActions, calendarStart, calendarEnd])

  // ─── Filter items by program and search ───────────────────────────────
  const filteredItems = useMemo(() => {
    let items = allItems

    // Filter by selected programs
    if (selectedProgramIds.size > 0) {
      items = items.filter((item) => selectedProgramIds.has(item.program_id))
    }

    // Filter by search query (activity title)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      items = items.filter((item) => {
        const title = (item.program_activities?.title || item.activity?.title || "").toLowerCase()
        return title.includes(q)
      })
    }

    return items
  }, [allItems, selectedProgramIds, searchQuery])

  // ─── Computed metrics (today only) ────────────────────────────────────
  const todayStr = format(new Date(), "yyyy-MM-dd")

  const todayItems = useMemo(
    () => filteredItems.filter((item) => item.scheduled_date === todayStr),
    [filteredItems, todayStr]
  )

  const metrics = useMemo(() => {
    const total = todayItems.length
    const completadas = todayItems.filter((r) => r.status === "completado").length
    const pendientes = todayItems.filter((r) => r.status === "pendiente" || r.status === "en_progreso").length
    const vencidas = todayItems.filter((r) => r.status === "vencido").length
    return { total, completadas, pendientes, vencidas }
  }, [todayItems])

  // ─── Calendar data ────────────────────────────────────────────────────
  const itemsByDate = useMemo(() => {
    const map: Record<string, ScheduledItem[]> = {}
    filteredItems.forEach((item) => {
      const key = item.scheduled_date
      if (!map[key]) map[key] = []
      map[key].push(item)
    })
    return map
  }, [filteredItems])

  const selectedDayItems = useMemo(() => {
    if (!selectedDay) return []
    const key = format(selectedDay, "yyyy-MM-dd")
    return (itemsByDate[key] || []).sort((a, b) => {
      // Pending/vencido first, then completed
      const order = { vencido: 0, pendiente: 1, en_progreso: 2, completado: 3, no_aplica: 4 }
      return (order[a.status] ?? 5) - (order[b.status] ?? 5)
    })
  }, [selectedDay, itemsByDate])

  // ─── Kanban data ──────────────────────────────────────────────────────
  const kanbanColumns = useMemo(() => {
    const cols = {
      pendiente: [] as ScheduledItem[],
      en_progreso: [] as ScheduledItem[],
      completado: [] as ScheduledItem[],
      vencido: [] as ScheduledItem[],
    }
    // For kanban, show items from this month
    filteredItems.forEach((item) => {
      if (item.status in cols) {
        cols[item.status as keyof typeof cols].push(item)
      }
    })
    return cols
  }, [allItems])

  // ─── Program overview ─────────────────────────────────────────────────
  const programStats = useMemo(() => {
    return programs.map((p) => {
      const programItems = filteredItems.filter((item) => item.program_id === p.id)
      const total = programItems.length
      const completed = programItems.filter((r) => r.status === "completado").length
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0
      return { ...p, total, completed, pct }
    })
  }, [programs, filteredItems])

  // ─── Completion handlers ──────────────────────────────────────────────
  const openCompleteDialog = (item: ScheduledItem) => {
    if (item.status === "completado") return
    setCompletingItem(item)
    setFormValues({})
    setFormObservations("")
  }

  const handleComplete = async () => {
    if (!completingItem) return
    setSubmitting(true)
    try {
      if (completingItem.isVirtual) {
        // Create a new completed record
        await createRecord({
          activity_id: completingItem.activity_id,
          program_id: completingItem.program_id,
          scheduled_date: completingItem.scheduled_date,
          status: "completado",
          values: formValues,
          observations: formObservations || null,
        })
      } else if (completingItem.record) {
        // Complete existing record
        await completeRecord(completingItem.record.id, formValues, formObservations || undefined)
      }
      setCompletingItem(null)
      // Refresh data
      const newRecords = await getRecords()
      setRecords(newRecords)
    } catch {
      // Error handled by hook
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Loading state ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando dashboard...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-50/80 via-white to-purple-50/60 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" />

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* ─── Header ────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Sistema de Gestion de Calidad
            </h1>
            <p className="mt-1 text-sm sm:text-base text-gray-500 dark:text-gray-400">
              Programas de Saneamiento Basico INVIMA
            </p>
          </div>

          <div className="flex bg-white/60 dark:bg-white/5 backdrop-blur-2xl rounded-2xl p-1 border border-white/20 dark:border-white/10 shadow-sm self-start sm:self-auto">
            <button
              onClick={() => setView("calendar")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] ${
                view === "calendar"
                  ? "bg-white dark:bg-white/15 shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">Calendario</span>
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] ${
                view === "kanban"
                  ? "bg-white dark:bg-white/15 shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Columns3 className="w-4 h-4" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              onClick={() => setView("lista")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] ${
                view === "lista"
                  ? "bg-white dark:bg-white/15 shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Acciones</span>
              {correctiveActions.filter(ca => ca.status !== "completada").length > 0 && (
                <span className="text-[10px] bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {correctiveActions.filter(ca => ca.status !== "completada").length}
                </span>
              )}
            </button>
          </div>
        </motion.div>

        {/* ─── Metric Cards ──────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard title="Total Hoy" value={metrics.total} percentage={100} color="#14B8A6" icon={<Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />} bgClass="from-teal-500/10 to-teal-500/5" />
          <MetricCard title="Completadas" value={metrics.completadas} percentage={metrics.total > 0 ? Math.round((metrics.completadas / metrics.total) * 100) : 0} color="#22C55E" icon={<CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />} bgClass="from-green-500/10 to-green-500/5" />
          <MetricCard title="Pendientes" value={metrics.pendientes} percentage={metrics.total > 0 ? Math.round((metrics.pendientes / metrics.total) * 100) : 0} color="#F59E0B" icon={<Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />} bgClass="from-amber-500/10 to-amber-500/5" />
          <MetricCard title="Vencidas" value={metrics.vencidas} percentage={metrics.total > 0 ? Math.round((metrics.vencidas / metrics.total) * 100) : 0} color="#EF4444" icon={<AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />} bgClass="from-red-500/10 to-red-500/5" />
        </motion.div>

        {/* ─── Filters & Search (Calendar/Kanban views) ──────────────── */}
        {view !== "lista" && (
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar actividad..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white/60 dark:bg-white/5 backdrop-blur-xl border-white/20 dark:border-white/10 rounded-xl h-10 text-sm"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Calendar mode toggle (only when calendar view) */}
              {view === "calendar" && (
                <div className="flex bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-xl p-0.5 border border-white/20 dark:border-white/10 self-start">
                  <button
                    onClick={() => setCalendarMode("mes")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      calendarMode === "mes"
                        ? "bg-white dark:bg-white/15 shadow-sm text-gray-900 dark:text-white"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                    }`}
                  >
                    Mes
                  </button>
                  <button
                    onClick={() => setCalendarMode("anual")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      calendarMode === "anual"
                        ? "bg-white dark:bg-white/15 shadow-sm text-gray-900 dark:text-white"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                    }`}
                  >
                    Anual
                  </button>
                </div>
              )}
            </div>

            {/* Program filter chips */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <button
                onClick={() => setSelectedProgramIds(new Set())}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                  selectedProgramIds.size === 0
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent"
                    : "bg-white/60 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-white/20 dark:border-white/10 hover:bg-white/80"
                }`}
              >
                Todos
              </button>
              {programs.map((p) => {
                const style = getProgramStyle(p.code)
                const isActive = selectedProgramIds.has(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProgramIds((prev) => {
                        const next = new Set(prev)
                        if (next.has(p.id)) {
                          next.delete(p.id)
                        } else {
                          next.add(p.id)
                        }
                        return next
                      })
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                      isActive
                        ? `${style.badge} border-transparent shadow-sm`
                        : "bg-white/60 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-white/20 dark:border-white/10 hover:bg-white/80"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                    {p.name}
                  </button>
                )
              })}
              {(selectedProgramIds.size > 0 || searchQuery) && (
                <span className="text-[10px] text-gray-400 ml-1">
                  {filteredItems.length} actividades
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── Main View ─────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {view === "calendar" ? (
            calendarMode === "anual" ? (
              <motion.div key="annual" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}>
                <AnnualCalendarView
                  currentYear={getYear(currentMonth)}
                  itemsByDate={itemsByDate}
                  onSelectDay={(d) => { setSelectedDay(d); setCalendarMode("mes"); setCurrentMonth(d) }}
                  onPrevYear={() => setCurrentMonth((m) => new Date(getYear(m) - 1, m.getMonth(), 1))}
                  onNextYear={() => setCurrentMonth((m) => new Date(getYear(m) + 1, m.getMonth(), 1))}
                />
              </motion.div>
            ) : (
              <motion.div key="calendar" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}>
                <CalendarView
                  currentMonth={currentMonth}
                  calendarDays={calendarDays}
                  monthStart={monthStart}
                  itemsByDate={itemsByDate}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  onPrevMonth={() => setCurrentMonth((m) => subMonths(m, 1))}
                  onNextMonth={() => setCurrentMonth((m) => addMonths(m, 1))}
                />
              </motion.div>
            )
          ) : view === "kanban" ? (
            <motion.div key="kanban" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}>
              <KanbanView columns={kanbanColumns} onComplete={openCompleteDialog} />
            </motion.div>
          ) : (
            <motion.div key="lista" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}>
              <CorrectiveActionsListView actions={correctiveActions} programs={programs} onRefresh={loadData} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Program Overview ───────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">Programas de Saneamiento</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {programStats.map((p) => {
              const style = getProgramStyle(p.code)
              const icon = getProgramIcon(p.code)
              return (
                <motion.div key={p.id} variants={itemVariants} className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 group">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${style.bg} ${style.text}`}>{icon}</div>
                    <div className="relative">
                      <CircularProgress value={p.pct} size={44} strokeWidth={3.5} color={getProgramColorCode(p.code)} />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700 dark:text-gray-300">{p.pct}%</span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">{p.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{p.completed} de {p.total} actividades</p>
                  <div className="mt-3 h-1.5 rounded-full bg-gray-200/50 dark:bg-white/10 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }} className={`h-full rounded-full ${style.dot}`} />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </motion.div>

      {/* ─── Day Detail Slide-out ──────────────────────────────────────── */}
      <AnimatePresence>
        {selectedDay && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setSelectedDay(null)} />
            <motion.div variants={slideInRight} initial="hidden" animate="visible" exit="exit" className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl border-l border-white/20 dark:border-white/10 shadow-2xl z-50 flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-gray-200/30 dark:border-white/10">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Actividades del</p>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                    {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
                  </h3>
                </div>
                <button onClick={() => setSelectedDay(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Cerrar panel">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {selectedDayItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                    <CalendarDays className="w-10 h-10 mb-3 opacity-50" />
                    <p className="text-sm">No hay actividades programadas</p>
                  </div>
                ) : (
                  selectedDayItems.map((item) => {
                    const programCode = item.program_activities?.sanitation_programs?.code || item.activity?.sanitation_programs?.code
                    const style = getProgramStyle(programCode)
                    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pendiente
                    const isActionable = item.status !== "completado" && item.status !== "no_aplica"

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl p-4 space-y-3 ${
                          isActionable ? "cursor-pointer hover:bg-white/80 dark:hover:bg-white/8 hover:shadow-md transition-all duration-150" : ""
                        }`}
                        onClick={() => isActionable && openCompleteDialog(item)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-snug">
                            {item.program_activities?.title || item.activity?.title || "Actividad"}
                          </h4>
                          <Badge className={`text-[10px] shrink-0 ${status.color} border-0`}>
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-[10px] border-0 ${style.badge}`}>
                            {item.program_activities?.sanitation_programs?.name || item.activity?.sanitation_programs?.name || "Programa"}
                          </Badge>
                          {(item.program_activities?.area || item.activity?.area) && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              {item.program_activities?.area || item.activity?.area}
                            </span>
                          )}
                        </div>
                        {isActionable && (
                          <div className="flex items-center gap-2 pt-1">
                            <button className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors">
                              <PlayCircle className="w-4 h-4" />
                              Completar actividad
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Completion Dialog ─────────────────────────────────────────── */}
      <AnimatePresence>
        {completingItem && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" onClick={() => !submitting && setCompletingItem(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="fixed inset-x-4 top-[5vh] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-[60] max-h-[90vh] overflow-hidden flex flex-col bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-white/30 dark:border-white/15 rounded-3xl shadow-2xl"
            >
              {/* Dialog header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200/30 dark:border-white/10 shrink-0">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {completingItem.activity?.title || "Completar Actividad"}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-[10px] border-0 ${getProgramStyle(completingItem.activity?.sanitation_programs?.code).badge}`}>
                      {completingItem.activity?.sanitation_programs?.name || "Programa"}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {format(parseISO(completingItem.scheduled_date), "d MMM yyyy", { locale: es })}
                    </span>
                  </div>
                </div>
                <button onClick={() => !submitting && setCompletingItem(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Dialog form */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Dynamic form fields from activity */}
                {completingItem.activity?.form_fields && completingItem.activity.form_fields.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {completingItem.activity.form_fields.map((field: FormField) => (
                      <div key={field.name} className={`space-y-2 ${field.type === "text" && !field.options ? "sm:col-span-2" : ""}`}>
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {field.label} {field.required && <span className="text-red-400">*</span>}
                        </Label>
                        {field.type === "select" && field.options ? (
                          <Select value={formValues[field.name] || ""} onValueChange={(v) => setFormValues((prev) => ({ ...prev, [field.name]: v }))}>
                            <SelectTrigger className="bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options.map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.type === "number" ? (
                          <Input
                            type="number"
                            step="any"
                            min={field.min}
                            max={field.max}
                            placeholder={field.min != null && field.max != null ? `${field.min} - ${field.max}` : ""}
                            value={formValues[field.name] ?? ""}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, [field.name]: e.target.value ? parseFloat(e.target.value) : "" }))}
                            className="bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base"
                          />
                        ) : field.type === "date" ? (
                          <Input
                            type="date"
                            value={formValues[field.name] || ""}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                            className="bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base"
                          />
                        ) : (
                          <Input
                            type="text"
                            placeholder={field.label}
                            value={formValues[field.name] || ""}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                            className="bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base"
                          />
                        )}
                        {field.min != null && field.max != null && field.type === "number" && (
                          <p className="text-[10px] text-gray-400">Rango: {field.min} - {field.max}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Esta actividad no tiene campos de registro configurados.
                  </p>
                )}

                {/* Observations */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Observaciones</Label>
                  <Textarea
                    placeholder="Observaciones adicionales..."
                    value={formObservations}
                    onChange={(e) => setFormObservations(e.target.value)}
                    className="bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 rounded-xl text-base min-h-[60px]"
                  />
                </div>
              </div>

              {/* Dialog footer */}
              <div className="flex gap-3 p-5 border-t border-gray-200/30 dark:border-white/10 shrink-0">
                <Button
                  variant="ghost"
                  onClick={() => !submitting && setCompletingItem(null)}
                  disabled={submitting}
                  className="rounded-xl h-12 px-6 text-gray-500 hover:text-gray-700 flex-1 sm:flex-none"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={submitting}
                  className="bg-green-500 hover:bg-green-600 text-white rounded-xl h-12 px-8 font-semibold shadow-md shadow-green-500/30 active:scale-95 transition-all duration-150 flex-1"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                  Completar
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Metric Card Component ──────────────────────────────────────────────────
function MetricCard({ title, value, percentage, color, icon, bgClass }: { title: string; value: number; percentage: number; color: string; icon: React.ReactNode; bgClass: string }) {
  return (
    <div className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-xl bg-gradient-to-br ${bgClass}`}>{icon}</div>
        <div className="relative">
          <CircularProgress value={percentage} size={40} strokeWidth={3} color={color} />
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-600 dark:text-gray-300">{percentage}%</span>
        </div>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</p>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">{title}</p>
    </div>
  )
}

// ─── Calendar View ──────────────────────────────────────────────────────────
function CalendarView({
  currentMonth, calendarDays, monthStart, itemsByDate, selectedDay, onSelectDay, onPrevMonth, onNextMonth,
}: {
  currentMonth: Date; calendarDays: Date[]; monthStart: Date; itemsByDate: Record<string, ScheduledItem[]>; selectedDay: Date | null; onSelectDay: (d: Date) => void; onPrevMonth: () => void; onNextMonth: () => void
}) {
  const weekDays = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"]

  return (
    <div className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200/30 dark:border-white/10">
        <button onClick={onPrevMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Mes anterior">
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </h3>
        <button onClick={onNextMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Mes siguiente">
          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-200/20 dark:border-white/5">
        {weekDays.map((d) => (
          <div key={d} className="text-center py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => {
          const dateKey = format(day, "yyyy-MM-dd")
          const dayItems = itemsByDate[dateKey] || []
          const isCurrentMonth = isSameMonth(day, monthStart)
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
          const today = isToday(day)

          const completedCount = dayItems.filter((i) => i.status === "completado").length
          const pendingCount = dayItems.filter((i) => i.status === "pendiente" || i.status === "en_progreso").length
          const overdueCount = dayItems.filter((i) => i.status === "vencido").length

          // Get unique program codes for dots
          const uniquePrograms = Array.from(
            new Set(dayItems.map((i) => i.program_activities?.sanitation_programs?.code || i.activity?.sanitation_programs?.code).filter(Boolean))
          ).slice(0, 4)

          return (
            <button
              key={idx}
              onClick={() => onSelectDay(day)}
              className={`
                relative flex flex-col items-center justify-start
                min-h-[52px] sm:min-h-[72px] py-2 sm:py-3
                border-b border-r border-gray-200/15 dark:border-white/5
                transition-all duration-150
                ${isCurrentMonth ? "hover:bg-blue-50/50 dark:hover:bg-blue-500/5" : "opacity-30"}
                ${isSelected ? "bg-blue-50/70 dark:bg-blue-500/10 ring-1 ring-inset ring-blue-500/20" : ""}
              `}
              aria-label={format(day, "d 'de' MMMM", { locale: es })}
            >
              <span className={`
                text-sm sm:text-base font-medium leading-none
                ${today ? "bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center" : ""}
                ${!today && isCurrentMonth ? "text-gray-700 dark:text-gray-300" : ""}
                ${!today && !isCurrentMonth ? "text-gray-300 dark:text-gray-600" : ""}
              `}>
                {format(day, "d")}
              </span>

              {/* Activity dots */}
              {uniquePrograms.length > 0 && (
                <div className="flex items-center gap-0.5 mt-1.5">
                  {uniquePrograms.map((code, i) => {
                    const style = getProgramStyle(code)
                    return <span key={i} className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${style.dot}`} />
                  })}
                </div>
              )}

              {/* Status summary (desktop) */}
              {dayItems.length > 0 && (
                <div className="hidden sm:flex items-center gap-1 mt-0.5">
                  {completedCount > 0 && <span className="text-[8px] font-bold text-green-600">{completedCount}</span>}
                  {completedCount > 0 && (pendingCount > 0 || overdueCount > 0) && <span className="text-[8px] text-gray-300">/</span>}
                  {pendingCount > 0 && <span className="text-[8px] font-bold text-amber-500">{pendingCount}</span>}
                  {overdueCount > 0 && <span className="text-[8px] font-bold text-red-500">{overdueCount}</span>}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 p-4 border-t border-gray-200/20 dark:border-white/5">
        {Object.entries(PROGRAM_COLORS).map(([code, style]) => (
          <div key={code} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 capitalize">{code.replace("-", " ")}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-[10px] font-bold text-green-600">N</span>
          <span className="text-[10px] text-gray-400">completadas</span>
          <span className="text-[10px] font-bold text-amber-500 ml-1">N</span>
          <span className="text-[10px] text-gray-400">pendientes</span>
          <span className="text-[10px] font-bold text-red-500 ml-1">N</span>
          <span className="text-[10px] text-gray-400">vencidas</span>
        </div>
      </div>
    </div>
  )
}

// ─── Annual Calendar View ──────────────────────────────────────────────────
function AnnualCalendarView({
  currentYear, itemsByDate, onSelectDay, onPrevYear, onNextYear,
}: {
  currentYear: number
  itemsByDate: Record<string, ScheduledItem[]>
  onSelectDay: (d: Date) => void
  onPrevYear: () => void
  onNextYear: () => void
}) {
  const months = Array.from({ length: 12 }, (_, i) => i)
  const weekDays = ["L", "M", "M", "J", "V", "S", "D"]

  return (
    <div className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200/30 dark:border-white/10">
        <button onClick={onPrevYear} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Ano anterior">
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
          {currentYear}
        </h3>
        <button onClick={onNextYear} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Ano siguiente">
          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-200/20 dark:bg-white/5 p-3 sm:p-4">
        {months.map((monthIdx) => {
          const monthDate = new Date(currentYear, monthIdx, 1)
          const monthName = format(monthDate, "MMMM", { locale: es })
          const daysInMonth = getDaysInMonth(monthDate)
          const firstDayOfWeek = (getDay(monthDate) + 6) % 7 // 0=Mon

          // Build grid: leading blanks + days
          const cells: (number | null)[] = Array(firstDayOfWeek).fill(null)
          for (let d = 1; d <= daysInMonth; d++) cells.push(d)

          return (
            <div key={monthIdx} className="bg-white/40 dark:bg-white/[0.03] rounded-xl p-2.5 sm:p-3">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 capitalize mb-2 text-center">
                {monthName}
              </h4>
              <div className="grid grid-cols-7 gap-px mb-0.5">
                {weekDays.map((d, i) => (
                  <div key={i} className="text-center text-[8px] font-medium text-gray-400 dark:text-gray-500">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px">
                {cells.map((dayNum, idx) => {
                  if (dayNum === null) return <div key={`blank-${idx}`} />

                  const dateKey = `${currentYear}-${String(monthIdx + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
                  const dayItems = itemsByDate[dateKey] || []
                  const today = isToday(new Date(currentYear, monthIdx, dayNum))

                  const hasCompleted = dayItems.some((i) => i.status === "completado")
                  const hasPending = dayItems.some((i) => i.status === "pendiente" || i.status === "en_progreso")
                  const hasOverdue = dayItems.some((i) => i.status === "vencido")

                  // Get unique program dots
                  const uniquePrograms = Array.from(
                    new Set(dayItems.map((i) => i.program_activities?.sanitation_programs?.code || i.activity?.sanitation_programs?.code).filter(Boolean))
                  ).slice(0, 3)

                  const hasItems = dayItems.length > 0

                  return (
                    <button
                      key={dayNum}
                      onClick={() => onSelectDay(new Date(currentYear, monthIdx, dayNum))}
                      className={`
                        relative flex flex-col items-center justify-center
                        w-full aspect-square rounded-md text-[9px] sm:text-[10px]
                        transition-all duration-100
                        ${today ? "bg-blue-500 text-white font-bold" : ""}
                        ${!today && hasItems ? "hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer" : ""}
                        ${!today ? "text-gray-600 dark:text-gray-400" : ""}
                        ${hasOverdue && !today ? "font-semibold" : ""}
                      `}
                      title={hasItems ? `${dayItems.length} actividades` : undefined}
                    >
                      <span>{dayNum}</span>
                      {uniquePrograms.length > 0 && (
                        <div className="flex gap-px mt-px">
                          {uniquePrograms.map((code, i) => {
                            const style = getProgramStyle(code)
                            return <span key={i} className={`w-1 h-1 rounded-full ${style.dot}`} />
                          })}
                        </div>
                      )}
                      {hasItems && uniquePrograms.length === 0 && (
                        <div className={`w-1 h-1 rounded-full mt-px ${
                          hasOverdue ? "bg-red-500" : hasPending ? "bg-amber-500" : "bg-green-500"
                        }`} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 p-4 border-t border-gray-200/20 dark:border-white/5">
        {Object.entries(PROGRAM_COLORS).map(([code, style]) => (
          <div key={code} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 capitalize">{code.replace("-", " ")}</span>
          </div>
        ))}
        <span className="text-[10px] text-gray-400 ml-auto">Click en un dia para ver detalle mensual</span>
      </div>
    </div>
  )
}

// ─── Kanban View ────────────────────────────────────────────────────────────
const KANBAN_COLUMNS = [
  { key: "pendiente" as const, label: "Pendiente", icon: Clock, color: "text-amber-500", headerBg: "bg-amber-500/10" },
  { key: "en_progreso" as const, label: "En Progreso", icon: Activity, color: "text-blue-500", headerBg: "bg-blue-500/10" },
  { key: "completado" as const, label: "Completado", icon: CheckCircle2, color: "text-green-500", headerBg: "bg-green-500/10" },
  { key: "vencido" as const, label: "Vencido", icon: AlertTriangle, color: "text-red-500", headerBg: "bg-red-500/10" },
]

function KanbanView({
  columns,
  onComplete,
}: {
  columns: Record<"pendiente" | "en_progreso" | "completado" | "vencido", ScheduledItem[]>
  onComplete: (item: ScheduledItem) => void
}) {
  return (
    <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory sm:snap-none">
      {KANBAN_COLUMNS.map((col) => {
        const Icon = col.icon
        const items = columns[col.key]
        return (
          <div key={col.key} className="flex-shrink-0 w-[280px] sm:w-full sm:flex-1 snap-start">
            <div className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
              <div className={`flex items-center gap-2 p-3 sm:p-4 ${col.headerBg} border-b border-white/10`}>
                <Icon className={`w-4 h-4 ${col.color}`} />
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{col.label}</span>
                <span className="ml-auto text-xs font-medium text-gray-400 dark:text-gray-500 bg-white/40 dark:bg-white/10 px-2 py-0.5 rounded-full">{items.length}</span>
              </div>

              <div className="p-2 sm:p-3 space-y-2 max-h-[60vh] overflow-y-auto">
                {items.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">Sin actividades</p>
                ) : (
                  items.map((item) => (
                    <KanbanCard key={item.id} item={item} onComplete={onComplete} />
                  ))
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KanbanCard({ item, onComplete }: { item: ScheduledItem; onComplete: (item: ScheduledItem) => void }) {
  const programCode = item.program_activities?.sanitation_programs?.code || item.activity?.sanitation_programs?.code
  const style = getProgramStyle(programCode)
  const isActionable = item.status !== "completado" && item.status !== "no_aplica"
  const isCA = item.id.startsWith("ca::")

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl p-3 transition-all duration-200 ${
        isCA ? "border-l-2 border-l-rose-400" : ""
      } ${
        isActionable && !isCA ? "hover:shadow-md cursor-pointer hover:border-blue-200 dark:hover:border-blue-500/30" : isCA ? "" : "cursor-default"
      }`}
      onClick={() => isActionable && !isCA && onComplete(item)}
    >
      <div className="flex items-start gap-2">
        {isCA && <ClipboardCheck className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
        <h4 className="text-sm font-medium text-gray-900 dark:text-white leading-snug mb-2 line-clamp-2 flex-1">
          {item.program_activities?.title || item.activity?.title || "Actividad"}
        </h4>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge className={`text-[10px] border-0 ${style.badge}`}>
          {item.program_activities?.sanitation_programs?.name || item.activity?.sanitation_programs?.name || "Programa"}
        </Badge>
        {isCA && <Badge className="text-[10px] border-0 bg-rose-100 text-rose-800">Accion Correctiva</Badge>}
        {!isCA && (item.program_activities?.area || item.activity?.area) && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[100px]">
            {item.program_activities?.area || item.activity?.area}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          {format(parseISO(item.scheduled_date), "d MMM yyyy", { locale: es })}
        </p>
        {isActionable && !isCA && (
          <span className="text-[10px] font-semibold text-blue-500 flex items-center gap-1">
            <PlayCircle className="w-3.5 h-3.5" />
            Completar
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ─── Corrective Actions List View ────────────────────────────────────────────
const PRIORITY_STYLES: Record<string, { label: string; color: string }> = {
  baja: { label: "Baja", color: "bg-gray-100 text-gray-700" },
  media: { label: "Media", color: "bg-amber-100 text-amber-800" },
  alta: { label: "Alta", color: "bg-orange-100 text-orange-800" },
  critica: { label: "Critica", color: "bg-red-100 text-red-800" },
}

function CorrectiveActionsListView({ actions, programs, onRefresh }: {
  actions: CorrectiveAction[]
  programs: SanitationProgram[]
  onRefresh: () => void
}) {
  const { completeCorrectiveAction, updateCorrectiveAction } = useQMSCorrectiveActions()
  const [filterProgram, setFilterProgram] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [completing, setCompleting] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let result = [...actions]
    if (filterProgram) result = result.filter((a) => a.program_id === filterProgram)
    if (filterStatus) result = result.filter((a) => a.status === filterStatus)
    // Sort: pending first, then by priority (critica > alta > media > baja)
    const priorityOrder = { critica: 0, alta: 1, media: 2, baja: 3 }
    const statusOrder = { pendiente: 0, en_progreso: 1, vencida: 2, completada: 3 }
    result.sort((a, b) => {
      const sd = (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4)
      if (sd !== 0) return sd
      return (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4)
    })
    return result
  }, [actions, filterProgram, filterStatus])

  const handleComplete = async (id: string) => {
    setCompleting(id)
    try {
      await completeCorrectiveAction(id)
      onRefresh()
    } finally {
      setCompleting(null)
    }
  }

  const pendingCount = actions.filter((a) => a.status === "pendiente").length
  const progressCount = actions.filter((a) => a.status === "en_progreso").length
  const overdueCount = actions.filter((a) => a.status === "vencida").length
  const completedCount = actions.filter((a) => a.status === "completada").length

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-amber-50/80 dark:bg-amber-500/10 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-[10px] text-amber-600 uppercase tracking-wide font-medium">Pendientes</p>
        </div>
        <div className="bg-blue-50/80 dark:bg-blue-500/10 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{progressCount}</p>
          <p className="text-[10px] text-blue-600 uppercase tracking-wide font-medium">En Progreso</p>
        </div>
        <div className="bg-red-50/80 dark:bg-red-500/10 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
          <p className="text-[10px] text-red-600 uppercase tracking-wide font-medium">Vencidas</p>
        </div>
        <div className="bg-green-50/80 dark:bg-green-500/10 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
          <p className="text-[10px] text-green-600 uppercase tracking-wide font-medium">Completadas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterProgram} onValueChange={setFilterProgram}>
          <SelectTrigger className="bg-white/60 dark:bg-white/5 backdrop-blur-xl border-white/20 dark:border-white/10 rounded-xl h-10 w-[200px] text-sm">
            <SelectValue placeholder="Todos los programas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los programas</SelectItem>
            {programs.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="bg-white/60 dark:bg-white/5 backdrop-blur-xl border-white/20 dark:border-white/10 rounded-xl h-10 w-[180px] text-sm">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="en_progreso">En Progreso</SelectItem>
            <SelectItem value="vencida">Vencida</SelectItem>
            <SelectItem value="completada">Completada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Actions list */}
      <div className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No hay acciones correctivas</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200/20 dark:divide-white/5">
            {filtered.map((action) => {
              const priority = PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.media
              const programStyle = getProgramStyle(action.sanitation_programs?.code)
              return (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 sm:px-6 hover:bg-white/30 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{action.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {action.sanitation_programs && (
                          <Badge className={`text-[10px] border-0 ${programStyle.badge}`}>
                            {action.sanitation_programs.name}
                          </Badge>
                        )}
                        <Badge className={`text-[10px] border-0 ${priority.color}`}>{priority.label}</Badge>
                        <Badge className={`text-[10px] border-0 ${
                          action.status === "completada" ? "bg-green-100 text-green-800" :
                          action.status === "vencida" ? "bg-red-100 text-red-800" :
                          action.status === "en_progreso" ? "bg-blue-100 text-blue-800" :
                          "bg-amber-100 text-amber-800"
                        }`}>
                          {action.status}
                        </Badge>
                        {action.internal_audits && (
                          <span className="text-[10px] text-gray-400">Audit. Interna: {action.internal_audits.title}</span>
                        )}
                        {action.external_audits && (
                          <span className="text-[10px] text-gray-400">Audit. Externa: {action.external_audits.title}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {action.scheduled_date && (
                          <span>Programada: {format(parseISO(action.scheduled_date), "d MMM yyyy", { locale: es })}</span>
                        )}
                        {action.due_date && (
                          <span>Vence: {format(parseISO(action.due_date), "d MMM yyyy", { locale: es })}</span>
                        )}
                      </div>
                    </div>
                    {action.status !== "completada" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleComplete(action.id)}
                        disabled={completing === action.id}
                        className="text-xs text-green-600 hover:text-green-700 rounded-lg shrink-0"
                      >
                        {completing === action.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                        )}
                        Completar
                      </Button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
