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
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  getDay,
  startOfWeek,
  endOfWeek,
  parseISO,
} from "date-fns"
import { es } from "date-fns/locale"

import { useQMSPrograms, type SanitationProgram } from "@/hooks/use-qms-programs"
import { useQMSActivities } from "@/hooks/use-qms-activities"
import { useQMSRecords, type ActivityRecord } from "@/hooks/use-qms-records"

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
  const normalized = code.toLowerCase().replace(/_/g, "-")
  return PROGRAM_COLORS[normalized] || PROGRAM_COLORS["agua-potable"]
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
  return PROGRAM_ICONS[normalized] || <Activity className="w-5 h-5" />
}

// ─── Status helpers ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pendiente: { label: "Pendiente", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  en_progreso: { label: "En Progreso", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  completado: { label: "Completado", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  vencido: { label: "Vencido", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  no_aplica: { label: "No Aplica", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300" },
}

// ─── Animation variants ─────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
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
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-gray-200/50 dark:text-white/10"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  )
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function QMSDashboardPage() {
  const { getPrograms } = useQMSPrograms()
  const { getActivities } = useQMSActivities()
  const { getRecords, loading: recordsLoading } = useQMSRecords()

  const [programs, setPrograms] = useState<SanitationProgram[]>([])
  const [records, setRecords] = useState<ActivityRecord[]>([])
  const [loading, setLoading] = useState(true)

  // View state
  const [view, setView] = useState<"calendar" | "kanban">("calendar")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Fetch data on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [programsData, recordsData] = await Promise.all([
          getPrograms(),
          getRecords(),
        ])
        setPrograms(programsData)
        setRecords(recordsData)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [getPrograms, getRecords])

  // ─── Computed metrics ───────────────────────────────────────────────────
  const todayStr = format(new Date(), "yyyy-MM-dd")

  const todayRecords = useMemo(
    () => records.filter((r) => r.scheduled_date?.startsWith(todayStr)),
    [records, todayStr]
  )

  const metrics = useMemo(() => {
    const total = todayRecords.length
    const completadas = todayRecords.filter((r) => r.status === "completado").length
    const pendientes = todayRecords.filter((r) => r.status === "pendiente" || r.status === "en_progreso").length
    const vencidas = todayRecords.filter((r) => r.status === "vencido").length
    return { total, completadas, pendientes, vencidas }
  }, [todayRecords])

  // ─── Calendar data ──────────────────────────────────────────────────────
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const recordsByDate = useMemo(() => {
    const map: Record<string, ActivityRecord[]> = {}
    records.forEach((r) => {
      if (!r.scheduled_date) return
      const key = r.scheduled_date.substring(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(r)
    })
    return map
  }, [records])

  const selectedDayRecords = useMemo(() => {
    if (!selectedDay) return []
    const key = format(selectedDay, "yyyy-MM-dd")
    return recordsByDate[key] || []
  }, [selectedDay, recordsByDate])

  // ─── Kanban data ────────────────────────────────────────────────────────
  const kanbanColumns = useMemo(() => {
    const cols = {
      pendiente: [] as ActivityRecord[],
      en_progreso: [] as ActivityRecord[],
      completado: [] as ActivityRecord[],
      vencido: [] as ActivityRecord[],
    }
    records.forEach((r) => {
      if (r.status in cols) {
        cols[r.status as keyof typeof cols].push(r)
      }
    })
    return cols
  }, [records])

  // ─── Program overview ──────────────────────────────────────────────────
  const programStats = useMemo(() => {
    return programs.map((p) => {
      const programRecords = records.filter((r) => r.program_id === p.id)
      const total = programRecords.length
      const completed = programRecords.filter((r) => r.status === "completado").length
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0
      return { ...p, total, completed, pct }
    })
  }, [programs, records])

  // ─── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando dashboard...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-50/80 via-white to-purple-50/60 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8"
      >
        {/* ─── Header ────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Sistema de Gestion de Calidad
            </h1>
            <p className="mt-1 text-sm sm:text-base text-gray-500 dark:text-gray-400">
              Programas de Saneamiento Basico INVIMA
            </p>
          </div>

          {/* View toggle */}
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
          </div>
        </motion.div>

        {/* ─── Metric Cards ──────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            title="Total Hoy"
            value={metrics.total}
            percentage={100}
            color="#14B8A6"
            icon={<Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
            bgClass="from-teal-500/10 to-teal-500/5"
          />
          <MetricCard
            title="Completadas"
            value={metrics.completadas}
            percentage={metrics.total > 0 ? Math.round((metrics.completadas / metrics.total) * 100) : 0}
            color="#22C55E"
            icon={<CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />}
            bgClass="from-green-500/10 to-green-500/5"
          />
          <MetricCard
            title="Pendientes"
            value={metrics.pendientes}
            percentage={metrics.total > 0 ? Math.round((metrics.pendientes / metrics.total) * 100) : 0}
            color="#F59E0B"
            icon={<Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            bgClass="from-amber-500/10 to-amber-500/5"
          />
          <MetricCard
            title="Vencidas"
            value={metrics.vencidas}
            percentage={metrics.total > 0 ? Math.round((metrics.vencidas / metrics.total) * 100) : 0}
            color="#EF4444"
            icon={<AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />}
            bgClass="from-red-500/10 to-red-500/5"
          />
        </motion.div>

        {/* ─── Main View ─────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {view === "calendar" ? (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
            >
              <CalendarView
                currentMonth={currentMonth}
                calendarDays={calendarDays}
                monthStart={monthStart}
                recordsByDate={recordsByDate}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                onPrevMonth={() => setCurrentMonth((m) => subMonths(m, 1))}
                onNextMonth={() => setCurrentMonth((m) => addMonths(m, 1))}
              />
            </motion.div>
          ) : (
            <motion.div
              key="kanban"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
            >
              <KanbanView columns={kanbanColumns} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Program Overview ───────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Programas de Saneamiento
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {programStats.map((p) => {
              const style = getProgramStyle(p.code)
              const icon = getProgramIcon(p.code)
              return (
                <motion.div
                  key={p.id}
                  variants={itemVariants}
                  className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${style.bg} ${style.text}`}>
                      {icon}
                    </div>
                    <div className="relative">
                      <CircularProgress value={p.pct} size={44} strokeWidth={3.5} color={style.dot.replace("bg-", "").includes("cyan") ? "#06B6D4" : style.dot.includes("green") ? "#22C55E" : style.dot.includes("purple") ? "#A855F7" : "#F97316"} />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700 dark:text-gray-300">
                        {p.pct}%
                      </span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                    {p.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {p.completed} de {p.total} actividades
                  </p>
                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 rounded-full bg-gray-200/50 dark:bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${p.pct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                      className={`h-full rounded-full ${style.dot}`}
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </motion.div>

      {/* ─── Day Detail Slide-out ──────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedDay && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setSelectedDay(null)}
            />
            <motion.div
              variants={slideInRight}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl border-l border-white/20 dark:border-white/10 shadow-2xl z-50 flex flex-col"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200/30 dark:border-white/10">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Actividades del</p>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                    {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Cerrar panel"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Panel content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {selectedDayRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                    <CalendarDays className="w-10 h-10 mb-3 opacity-50" />
                    <p className="text-sm">No hay actividades programadas</p>
                  </div>
                ) : (
                  selectedDayRecords.map((record) => {
                    const programCode = record.program_activities?.sanitation_programs?.code
                    const style = getProgramStyle(programCode)
                    const status = STATUS_CONFIG[record.status] || STATUS_CONFIG.pendiente
                    return (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm text-gray-900 dark:text-white leading-snug">
                            {record.program_activities?.title || "Actividad"}
                          </h4>
                          <Badge className={`text-[10px] shrink-0 ${status.color} border-0`}>
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-[10px] border-0 ${style.badge}`}>
                            {record.program_activities?.sanitation_programs?.name || "Programa"}
                          </Badge>
                          {record.program_activities?.area && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              {record.program_activities.area}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Metric Card Component ──────────────────────────────────────────────────
function MetricCard({
  title,
  value,
  percentage,
  color,
  icon,
  bgClass,
}: {
  title: string
  value: number
  percentage: number
  color: string
  icon: React.ReactNode
  bgClass: string
}) {
  return (
    <div className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-xl bg-gradient-to-br ${bgClass}`}>{icon}</div>
        <div className="relative">
          <CircularProgress value={percentage} size={40} strokeWidth={3} color={color} />
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-600 dark:text-gray-300">
            {percentage}%
          </span>
        </div>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</p>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">{title}</p>
    </div>
  )
}

// ─── Calendar View ──────────────────────────────────────────────────────────
function CalendarView({
  currentMonth,
  calendarDays,
  monthStart,
  recordsByDate,
  selectedDay,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
}: {
  currentMonth: Date
  calendarDays: Date[]
  monthStart: Date
  recordsByDate: Record<string, ActivityRecord[]>
  selectedDay: Date | null
  onSelectDay: (d: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}) {
  const weekDays = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"]

  return (
    <div className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-sm overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200/30 dark:border-white/10">
        <button
          onClick={onPrevMonth}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </h3>
        <button
          onClick={onNextMonth}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-200/20 dark:border-white/5">
        {weekDays.map((d) => (
          <div key={d} className="text-center py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => {
          const dateKey = format(day, "yyyy-MM-dd")
          const dayRecords = recordsByDate[dateKey] || []
          const isCurrentMonth = isSameMonth(day, monthStart)
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
          const today = isToday(day)

          // Get unique program codes for this day (max 4 dots)
          const uniquePrograms = Array.from(
            new Set(dayRecords.map((r) => r.program_activities?.sanitation_programs?.code).filter(Boolean))
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
              <span
                className={`
                  text-sm sm:text-base font-medium leading-none
                  ${today ? "bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center" : ""}
                  ${!today && isCurrentMonth ? "text-gray-700 dark:text-gray-300" : ""}
                  ${!today && !isCurrentMonth ? "text-gray-300 dark:text-gray-600" : ""}
                `}
              >
                {format(day, "d")}
              </span>

              {/* Activity dots */}
              {uniquePrograms.length > 0 && (
                <div className="flex items-center gap-0.5 mt-1.5">
                  {uniquePrograms.map((code, i) => {
                    const style = getProgramStyle(code)
                    return (
                      <span
                        key={i}
                        className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${style.dot}`}
                      />
                    )
                  })}
                </div>
              )}

              {/* Record count badge (desktop only) */}
              {dayRecords.length > 0 && (
                <span className="hidden sm:block text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {dayRecords.length}
                </span>
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
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 capitalize">
              {code.replace("-", " ")}
            </span>
          </div>
        ))}
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
}: {
  columns: Record<"pendiente" | "en_progreso" | "completado" | "vencido", ActivityRecord[]>
}) {
  return (
    <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory sm:snap-none">
      {KANBAN_COLUMNS.map((col) => {
        const Icon = col.icon
        const items = columns[col.key]
        return (
          <div
            key={col.key}
            className="flex-shrink-0 w-[280px] sm:w-full sm:flex-1 snap-start"
          >
            <div className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
              {/* Column header */}
              <div className={`flex items-center gap-2 p-3 sm:p-4 ${col.headerBg} border-b border-white/10`}>
                <Icon className={`w-4 h-4 ${col.color}`} />
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{col.label}</span>
                <span className="ml-auto text-xs font-medium text-gray-400 dark:text-gray-500 bg-white/40 dark:bg-white/10 px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>

              {/* Column cards */}
              <div className="p-2 sm:p-3 space-y-2 max-h-[60vh] overflow-y-auto">
                {items.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">
                    Sin actividades
                  </p>
                ) : (
                  items.map((record) => (
                    <KanbanCard key={record.id} record={record} />
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

function KanbanCard({ record }: { record: ActivityRecord }) {
  const programCode = record.program_activities?.sanitation_programs?.code
  const style = getProgramStyle(programCode)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl p-3 hover:shadow-md transition-all duration-200 cursor-default"
    >
      <h4 className="text-sm font-medium text-gray-900 dark:text-white leading-snug mb-2 line-clamp-2">
        {record.program_activities?.title || "Actividad"}
      </h4>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge className={`text-[10px] border-0 ${style.badge}`}>
          {record.program_activities?.sanitation_programs?.name || "Programa"}
        </Badge>
        {record.program_activities?.area && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[100px]">
            {record.program_activities.area}
          </span>
        )}
      </div>
      {record.scheduled_date && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
          {format(parseISO(record.scheduled_date), "d MMM yyyy", { locale: es })}
        </p>
      )}
    </motion.div>
  )
}
