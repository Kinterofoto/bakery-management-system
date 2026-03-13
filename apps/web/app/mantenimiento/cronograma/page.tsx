"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Wrench,
  Filter,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useMaintenanceSchedules,
  type MaintenanceSchedule,
} from "@/hooks/use-maintenance-schedules"
import {
  useMaintenanceEquipment,
  type Equipment,
  type EquipmentCategory,
} from "@/hooks/use-maintenance-equipment"
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfWeek,
  endOfWeek,
  startOfDay,
  getDay,
  parseISO,
} from "date-fns"
import { es } from "date-fns/locale"

const spring = { type: "spring" as const, stiffness: 300, damping: 30 }

const TYPE_CONFIG: Record<
  MaintenanceSchedule["maintenance_type"],
  { label: string; color: string; dot: string; badge: string }
> = {
  preventivo: {
    label: "Preventivo",
    color: "text-blue-700",
    dot: "bg-blue-500",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
  },
  correctivo: {
    label: "Correctivo",
    color: "text-red-700",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-800 border-red-200",
  },
  predictivo: {
    label: "Predictivo",
    color: "text-purple-700",
    dot: "bg-purple-500",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
  },
}

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

function isOverdue(schedule: MaintenanceSchedule): boolean {
  if (!schedule.next_due_date) return false
  return isBefore(parseISO(schedule.next_due_date), startOfDay(new Date()))
}

export default function CronogramaPage() {
  const { loading: schedulesLoading, getSchedules } = useMaintenanceSchedules()
  const { getEquipment, getCategories } = useMaintenanceEquipment()

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [categories, setCategories] = useState<EquipmentCategory[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Filters
  const [filterEquipment, setFilterEquipment] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")

  // Load equipment and categories once
  useEffect(() => {
    getEquipment().then(setEquipment)
    getCategories().then(setCategories)
  }, [getEquipment, getCategories])

  // Load schedules
  useEffect(() => {
    const filters: { equipmentId?: string; type?: string } = {}
    if (filterEquipment !== "all") filters.equipmentId = filterEquipment
    if (filterType !== "all") filters.type = filterType
    getSchedules({ ...filters, status: "activo" }).then(setSchedules)
  }, [getSchedules, filterEquipment, filterType])

  // Filter by category client-side (not supported in hook)
  const filteredSchedules = useMemo(() => {
    if (filterCategory === "all") return schedules
    return schedules.filter(
      (s) => s.equipment?.equipment_categories?.id === filterCategory
    )
  }, [schedules, filterCategory])

  // Calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  // Map: date string -> schedules for that day
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, MaintenanceSchedule[]>()
    for (const schedule of filteredSchedules) {
      if (!schedule.next_due_date) continue
      const dateKey = schedule.next_due_date.split("T")[0]
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey)!.push(schedule)
    }
    return map
  }, [filteredSchedules])

  // Schedules for the selected month (for the list below calendar)
  const monthSchedules = useMemo(() => {
    return filteredSchedules.filter((s) => {
      if (!s.next_due_date) return false
      return isSameMonth(parseISO(s.next_due_date), currentMonth)
    })
  }, [filteredSchedules, currentMonth])

  const today = startOfDay(new Date())

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-yellow-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-amber-100 rounded-xl">
              <Calendar className="h-6 w-6 text-amber-700" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Cronograma de Mantenimiento
            </h1>
          </div>
          <p className="text-muted-foreground ml-14">
            Calendario y programacion de mantenimientos
          </p>
        </motion.div>

        {/* Filter bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-gray-700">Filtros</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Equipment filter */}
            <Select value={filterEquipment} onValueChange={setFilterEquipment}>
              <SelectTrigger className="bg-white/60 border-white/40 rounded-xl min-w-[200px]">
                <SelectValue placeholder="Todos los equipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los equipos</SelectItem>
                {equipment.map((eq) => (
                  <SelectItem key={eq.id} value={eq.id}>
                    {eq.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category filter */}
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="bg-white/60 border-white/40 rounded-xl min-w-[200px]">
                <SelectValue placeholder="Todas las categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type filter */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="bg-white/60 border-white/40 rounded-xl min-w-[180px]">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="preventivo">Preventivo</SelectItem>
                <SelectItem value="correctivo">Correctivo</SelectItem>
                <SelectItem value="predictivo">Predictivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Calendar card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-6 shadow-sm"
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="rounded-xl hover:bg-amber-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold text-gray-900 capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="rounded-xl hover:bg-amber-50"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd")
              const daySchedules = schedulesByDate.get(dateKey) || []
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isToday = isSameDay(day, today)
              const hasOverdue = daySchedules.some(isOverdue)

              // Collect unique types for dots
              const types = Array.from(
                new Set(daySchedules.map((s) => s.maintenance_type))
              )

              return (
                <motion.button
                  key={dateKey}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={spring}
                  onClick={() => setSelectedDay(day)}
                  className={`
                    relative p-2 min-h-[72px] rounded-xl text-left transition-colors
                    ${isCurrentMonth ? "bg-white/60" : "bg-white/20 opacity-40"}
                    ${isToday ? "ring-2 ring-amber-400 bg-amber-50/60" : ""}
                    ${selectedDay && isSameDay(day, selectedDay) ? "ring-2 ring-amber-600 bg-amber-100/60" : ""}
                    ${hasOverdue ? "bg-red-50/60" : ""}
                    hover:bg-amber-50/80
                  `}
                >
                  <span
                    className={`text-sm font-medium ${
                      isToday
                        ? "text-amber-700 font-bold"
                        : isCurrentMonth
                          ? "text-gray-900"
                          : "text-gray-400"
                    }`}
                  >
                    {format(day, "d")}
                  </span>

                  {/* Colored dots */}
                  {types.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {types.map((type) => (
                        <span
                          key={type}
                          className={`w-2 h-2 rounded-full ${TYPE_CONFIG[type].dot}`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Overdue indicator */}
                  {hasOverdue && (
                    <AlertTriangle className="absolute top-1 right-1 h-3 w-3 text-red-500" />
                  )}

                  {/* Count badge if many */}
                  {daySchedules.length > 2 && (
                    <span className="absolute bottom-1 right-1 text-[10px] font-medium text-muted-foreground bg-gray-100 rounded-full px-1.5">
                      {daySchedules.length}
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            {(Object.entries(TYPE_CONFIG) as [MaintenanceSchedule["maintenance_type"], typeof TYPE_CONFIG["preventivo"]][]).map(
              ([key, config]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                  {config.label}
                </div>
              )
            )}
            <div className="flex items-center gap-1.5 text-xs text-red-500">
              <AlertTriangle className="h-3 w-3" />
              Vencido
            </div>
          </div>
        </motion.div>

        {/* Selected day detail */}
        <AnimatePresence>
          {selectedDay && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={spring}
              className="overflow-hidden"
            >
              <div className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 capitalize">
                  {format(selectedDay, "EEEE d 'de' MMMM yyyy", { locale: es })}
                </h3>
                {(() => {
                  const dateKey = format(selectedDay, "yyyy-MM-dd")
                  const daySchedules = schedulesByDate.get(dateKey) || []
                  if (daySchedules.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground">
                        No hay mantenimientos programados para este dia.
                      </p>
                    )
                  }
                  return (
                    <div className="space-y-2">
                      {daySchedules.map((s) => (
                        <div
                          key={s.id}
                          className={`flex items-center gap-3 p-3 rounded-xl ${
                            isOverdue(s) ? "bg-red-50/80 border border-red-200" : "bg-white/60 border border-white/40"
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${TYPE_CONFIG[s.maintenance_type].dot}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {s.equipment?.name || "Equipo desconocido"}
                            </p>
                          </div>
                          <Badge className={`text-xs border ${TYPE_CONFIG[s.maintenance_type].badge}`}>
                            {TYPE_CONFIG[s.maintenance_type].label}
                          </Badge>
                          {isOverdue(s) && (
                            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Monthly schedule list */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.15 }}
          className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="h-5 w-5 text-amber-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              Programaciones del Mes
            </h2>
            <span className="ml-auto text-sm text-muted-foreground">
              {monthSchedules.length} programacion{monthSchedules.length !== 1 ? "es" : ""}
            </span>
          </div>

          {schedulesLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Cargando cronogramas...
            </p>
          ) : monthSchedules.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">
                No hay mantenimientos programados para este mes
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {monthSchedules.map((schedule, i) => {
                  const overdue = isOverdue(schedule)
                  return (
                    <motion.div
                      key={schedule.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ ...spring, delay: i * 0.03 }}
                      className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
                        overdue
                          ? "bg-red-50/80 border border-red-200"
                          : "bg-white/60 border border-white/40 hover:bg-white/80"
                      }`}
                    >
                      {/* Type dot */}
                      <span
                        className={`w-3 h-3 rounded-full shrink-0 ${TYPE_CONFIG[schedule.maintenance_type].dot}`}
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {schedule.equipment?.name || "Equipo desconocido"}
                          </p>
                          {schedule.equipment?.equipment_categories && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 shrink-0"
                            >
                              {schedule.equipment.equipment_categories.name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {schedule.title}
                        </p>
                      </div>

                      {/* Type badge */}
                      <Badge
                        className={`text-xs border shrink-0 ${TYPE_CONFIG[schedule.maintenance_type].badge}`}
                      >
                        {TYPE_CONFIG[schedule.maintenance_type].label}
                      </Badge>

                      {/* Frequency */}
                      <span className="text-xs text-muted-foreground hidden sm:block min-w-[80px] text-center">
                        {schedule.frequency}
                      </span>

                      {/* Responsible */}
                      <span className="text-xs text-muted-foreground hidden md:block min-w-[100px] truncate text-center">
                        {schedule.responsible || "Sin asignar"}
                      </span>

                      {/* Due date */}
                      <span
                        className={`text-xs font-medium min-w-[90px] text-right shrink-0 ${
                          overdue ? "text-red-600" : "text-gray-600"
                        }`}
                      >
                        {schedule.next_due_date
                          ? format(parseISO(schedule.next_due_date), "dd MMM yyyy", {
                              locale: es,
                            })
                          : "Sin fecha"}
                      </span>

                      {/* Overdue warning */}
                      {overdue && (
                        <div className="flex items-center gap-1 shrink-0">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-xs font-medium text-red-600 hidden lg:block">
                            Vencido
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
