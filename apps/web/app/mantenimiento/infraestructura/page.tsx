"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Building2,
  Zap,
  Droplets,
  Wind,
  Lightbulb,
  Layers,
  MoreHorizontal,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  useMaintenanceInfrastructure,
  type InfrastructureSchedule,
} from "@/hooks/use-maintenance-infrastructure"
import { format, parseISO, isBefore, startOfDay } from "date-fns"
import { es } from "date-fns/locale"

const spring = { type: "spring" as const, stiffness: 300, damping: 30 }

type Category = InfrastructureSchedule["category"]

const CATEGORY_CONFIG: Record<
  Category,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  electrico: {
    label: "Eléctrico",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    bgColor: "bg-yellow-50",
    icon: Zap,
  },
  hidraulico: {
    label: "Hidráulico",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    bgColor: "bg-blue-50",
    icon: Droplets,
  },
  estructural: {
    label: "Estructural",
    color: "bg-stone-100 text-stone-800 border-stone-200",
    bgColor: "bg-stone-50",
    icon: Building2,
  },
  sanitario: {
    label: "Sanitario",
    color: "bg-green-100 text-green-800 border-green-200",
    bgColor: "bg-green-50",
    icon: Droplets,
  },
  ventilacion: {
    label: "Ventilación",
    color: "bg-cyan-100 text-cyan-800 border-cyan-200",
    bgColor: "bg-cyan-50",
    icon: Wind,
  },
  iluminacion: {
    label: "Iluminación",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    bgColor: "bg-amber-50",
    icon: Lightbulb,
  },
  pisos: {
    label: "Pisos",
    color: "bg-slate-100 text-slate-800 border-slate-200",
    bgColor: "bg-slate-50",
    icon: Layers,
  },
  otro: {
    label: "Otro",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    bgColor: "bg-gray-50",
    icon: MoreHorizontal,
  },
}

const STATUS_CONFIG: Record<
  InfrastructureSchedule["status"],
  { label: string; color: string }
> = {
  activo: {
    label: "Activo",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  inactivo: {
    label: "Inactivo",
    color: "bg-gray-100 text-gray-600 border-gray-200",
  },
  vencido: {
    label: "Vencido",
    color: "bg-red-100 text-red-800 border-red-200",
  },
}

const ALL_CATEGORIES: Category[] = [
  "electrico",
  "hidraulico",
  "estructural",
  "sanitario",
  "ventilacion",
  "iluminacion",
  "pisos",
  "otro",
]

function isOverdue(nextDueDate: string | null): boolean {
  if (!nextDueDate) return false
  try {
    return isBefore(parseISO(nextDueDate), startOfDay(new Date()))
  } catch {
    return false
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  try {
    return format(parseISO(dateStr), "d MMM yyyy", { locale: es })
  } catch {
    return dateStr
  }
}

export default function InfraestructuraPage() {
  const { loading, getInfrastructureSchedules, updateInfrastructureSchedule } =
    useMaintenanceInfrastructure()

  const [schedules, setSchedules] = useState<InfrastructureSchedule[]>([])
  const [categoryFilter, setCategoryFilter] = useState<Category | "">("")

  const loadSchedules = useCallback(async () => {
    const filters: { category?: string } = {}
    if (categoryFilter) filters.category = categoryFilter
    const data = await getInfrastructureSchedules(filters)
    setSchedules(data)
  }, [categoryFilter, getInfrastructureSchedules])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  const groupedSchedules = useMemo(() => {
    const groups: Partial<Record<Category, InfrastructureSchedule[]>> = {}
    for (const schedule of schedules) {
      if (!groups[schedule.category]) groups[schedule.category] = []
      groups[schedule.category]!.push(schedule)
    }
    return groups
  }, [schedules])

  const handleMarkCompleted = async (schedule: InfrastructureSchedule) => {
    const today = new Date().toISOString().split("T")[0]
    await updateInfrastructureSchedule(schedule.id, {
      last_completed_date: today,
    })
    await loadSchedules()
  }

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
              <Building2 className="h-6 w-6 text-amber-700" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Cronograma de Infraestructura
            </h1>
          </div>
          <p className="text-muted-foreground ml-14">
            Programación y seguimiento de mantenimiento de infraestructura
          </p>
        </motion.div>

        {/* Category filter buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-4 shadow-sm"
        >
          <div className="flex flex-wrap gap-2">
            <Button
              variant={categoryFilter === "" ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter("")}
              className="rounded-xl"
            >
              Todos
            </Button>
            {ALL_CATEGORIES.map((cat) => {
              const config = CATEGORY_CONFIG[cat]
              const Icon = config.icon
              return (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter(cat)}
                  className="rounded-xl gap-1.5"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {config.label}
                </Button>
              )
            })}
          </div>
        </motion.div>

        {/* Count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm text-muted-foreground"
        >
          {loading
            ? "Cargando cronograma..."
            : `${schedules.length} registro${schedules.length !== 1 ? "s" : ""} encontrado${schedules.length !== 1 ? "s" : ""}`}
        </motion.div>

        {/* Grouped schedule cards */}
        <div className="space-y-8">
          <AnimatePresence mode="popLayout">
            {Object.entries(groupedSchedules).map(
              ([category, items], groupIndex) => {
                const catKey = category as Category
                const config = CATEGORY_CONFIG[catKey]
                const Icon = config.icon

                return (
                  <motion.div
                    key={catKey}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ ...spring, delay: groupIndex * 0.05 }}
                    className="space-y-3"
                  >
                    {/* Category heading */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-lg ${config.bgColor}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {config.label}
                      </h2>
                      <Badge
                        variant="secondary"
                        className="text-xs"
                      >
                        {items!.length}
                      </Badge>
                    </div>

                    {/* Cards grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items!.map((schedule, i) => {
                        const overdue = isOverdue(schedule.next_due_date)
                        const statusConfig = STATUS_CONFIG[schedule.status]

                        return (
                          <motion.div
                            key={schedule.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ ...spring, delay: i * 0.05 }}
                            className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-5 shadow-sm hover:shadow-md hover:bg-white/90 transition-all"
                          >
                            {/* Title and status */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <h3 className="font-semibold text-gray-900 leading-snug">
                                {schedule.title}
                              </h3>
                              <Badge
                                className={`${statusConfig.color} border font-medium shrink-0`}
                              >
                                {statusConfig.label}
                              </Badge>
                            </div>

                            {/* Description */}
                            {schedule.description && (
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                {schedule.description}
                              </p>
                            )}

                            {/* Details */}
                            <div className="space-y-1.5 mb-3">
                              <div className="flex items-center gap-2 text-sm">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">Área:</span>
                                <span className="font-medium text-gray-900">
                                  {schedule.area}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">Frecuencia:</span>
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${config.color} border`}
                                >
                                  {schedule.frequency}
                                </Badge>
                              </div>

                              {schedule.responsible && (
                                <div className="flex items-center gap-2 text-sm">
                                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground">Responsable:</span>
                                  <span className="font-medium text-gray-900">
                                    {schedule.responsible}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">Próxima fecha:</span>
                                <span
                                  className={`font-medium ${overdue ? "text-red-600" : "text-gray-900"}`}
                                >
                                  {formatDate(schedule.next_due_date)}
                                </span>
                              </div>
                            </div>

                            {/* Overdue warning */}
                            {overdue && (
                              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-3">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <span className="font-medium">Vencido</span>
                              </div>
                            )}

                            {/* Last completed */}
                            {schedule.last_completed_date && (
                              <p className="text-xs text-muted-foreground mb-3">
                                Última vez completado:{" "}
                                {formatDate(schedule.last_completed_date)}
                              </p>
                            )}

                            {/* Mark as completed */}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={loading}
                              onClick={() => handleMarkCompleted(schedule)}
                              className="w-full rounded-xl gap-1.5"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Marcar como completado
                            </Button>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>
                )
              }
            )}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {!loading && schedules.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">
              No se encontraron registros de infraestructura
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
