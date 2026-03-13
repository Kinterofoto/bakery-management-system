"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  ArrowLeft,
  Wrench,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Settings,
  Activity,
  CalendarDays,
  Loader2,
  ChevronRight,
  TrendingUp,
  XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format, isPast, isToday, isFuture, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"

import {
  useMaintenanceEquipment,
  type Equipment,
  type EquipmentCategory,
} from "@/hooks/use-maintenance-equipment"
import {
  useMaintenanceWorkOrders,
  type WorkOrder,
} from "@/hooks/use-maintenance-work-orders"
import {
  useMaintenanceSchedules,
  type MaintenanceSchedule,
} from "@/hooks/use-maintenance-schedules"

// ─── Animation config ──────────────────────────────────────────────────────
const spring = { type: "spring" as const, stiffness: 300, damping: 30 }

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: spring },
}

// ─── Status helpers ────────────────────────────────────────────────────────
const equipmentStatusLabels: Record<Equipment["status"], string> = {
  operativo: "Operativo",
  en_mantenimiento: "En mantenimiento",
  fuera_servicio: "Fuera de servicio",
  dado_de_baja: "Dado de baja",
}

const equipmentStatusColors: Record<Equipment["status"], string> = {
  operativo: "bg-emerald-100 text-emerald-700 border-emerald-200",
  en_mantenimiento: "bg-amber-100 text-amber-700 border-amber-200",
  fuera_servicio: "bg-red-100 text-red-700 border-red-200",
  dado_de_baja: "bg-gray-100 text-gray-500 border-gray-200",
}

const workOrderStatusLabels: Record<WorkOrder["status"], string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  completada: "Completada",
  cancelada: "Cancelada",
}

const workOrderStatusColors: Record<WorkOrder["status"], string> = {
  pendiente: "bg-amber-100 text-amber-700 border-amber-200",
  en_progreso: "bg-blue-100 text-blue-700 border-blue-200",
  completada: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelada: "bg-gray-100 text-gray-500 border-gray-200",
}

const priorityColors: Record<WorkOrder["priority"], string> = {
  baja: "bg-gray-100 text-gray-600 border-gray-200",
  media: "bg-blue-100 text-blue-700 border-blue-200",
  alta: "bg-orange-100 text-orange-700 border-orange-200",
  critica: "bg-red-100 text-red-700 border-red-200",
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function MantenimientoDashboard() {
  const { getEquipment, getCategories } = useMaintenanceEquipment()
  const { getWorkOrders } = useMaintenanceWorkOrders()
  const { getSchedules } = useMaintenanceSchedules()

  const [loading, setLoading] = useState(true)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [categories, setCategories] = useState<EquipmentCategory[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [eq, cats, wo, sch] = await Promise.all([
        getEquipment(),
        getCategories(),
        getWorkOrders(),
        getSchedules({ status: "activo" }),
      ])
      if (cancelled) return
      setEquipment(eq)
      setCategories(cats)
      setWorkOrders(wo)
      setSchedules(sch)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [getEquipment, getCategories, getWorkOrders, getSchedules])

  // ─── Derived data ──────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const operativos = equipment.filter((e) => e.status === "operativo").length
    const pendientes = workOrders.filter(
      (o) => o.status === "pendiente" || o.status === "en_progreso"
    ).length

    const today = new Date()
    const vencidos = schedules.filter(
      (s) => s.next_due_date && isPast(new Date(s.next_due_date)) && !isToday(new Date(s.next_due_date))
    ).length

    const totalSchedules = schedules.length
    const completedOrders = workOrders.filter((o) => o.status === "completada").length
    const totalOrders = workOrders.length
    const cumplimiento =
      totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 100

    return { operativos, pendientes, vencidos, cumplimiento }
  }, [equipment, workOrders, schedules])

  const nextSchedules = useMemo(() => {
    const today = new Date()
    return schedules
      .filter((s) => s.next_due_date)
      .sort(
        (a, b) =>
          new Date(a.next_due_date!).getTime() -
          new Date(b.next_due_date!).getTime()
      )
      .slice(0, 5)
  }, [schedules])

  const recentOrders = useMemo(() => {
    return workOrders.slice(0, 5)
  }, [workOrders])

  const categoryStats = useMemo(() => {
    return categories.map((cat) => {
      const catEquipment = equipment.filter((e) => e.category_id === cat.id)
      const statusCounts = {
        operativo: 0,
        en_mantenimiento: 0,
        fuera_servicio: 0,
        dado_de_baja: 0,
      }
      catEquipment.forEach((e) => {
        statusCounts[e.status]++
      })
      return { category: cat, total: catEquipment.length, ...statusCounts }
    }).filter((c) => c.total > 0)
  }, [categories, equipment])

  // ─── Loading state ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-yellow-50/50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring}
          className="flex flex-col items-center gap-3"
        >
          <Loader2 className="h-10 w-10 text-amber-600 animate-spin" />
          <p className="text-sm text-gray-500 font-medium">
            Cargando panel de mantenimiento...
          </p>
        </motion.div>
      </div>
    )
  }

  // ─── KPI card config ───────────────────────────────────────────────────
  const kpiCards = [
    {
      label: "Equipos Operativos",
      value: kpis.operativos,
      total: equipment.length,
      icon: Settings,
      color: "emerald",
      bgIcon: "bg-emerald-500/15 border-emerald-500/20",
      textIcon: "text-emerald-600",
    },
    {
      label: "Órdenes Pendientes",
      value: kpis.pendientes,
      icon: ClipboardList,
      color: "amber",
      bgIcon: "bg-amber-500/15 border-amber-500/20",
      textIcon: "text-amber-600",
    },
    {
      label: "Mantenimientos Vencidos",
      value: kpis.vencidos,
      icon: AlertTriangle,
      color: "red",
      bgIcon: "bg-red-500/15 border-red-500/20",
      textIcon: "text-red-600",
    },
    {
      label: "Cumplimiento %",
      value: `${kpis.cumplimiento}%`,
      icon: TrendingUp,
      color: "blue",
      bgIcon: "bg-blue-500/15 border-blue-500/20",
      textIcon: "text-blue-600",
    },
  ]

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-yellow-50/50">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="flex items-start justify-between"
        >
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-full bg-white/60 backdrop-blur-xl border border-white/30 hover:bg-white/80 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
                Panel de Mantenimiento
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Resumen de equipos, órdenes y cronogramas de mantenimiento
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 bg-white/60 backdrop-blur-xl border border-white/30 rounded-full px-3 py-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </div>
        </motion.div>

        {/* ── KPI Cards ───────────────────────────────────────────────── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon
            return (
              <motion.div
                key={kpi.label}
                variants={itemVariants}
                className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl shadow-lg shadow-black/5 p-5 hover:shadow-xl hover:shadow-black/10 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {kpi.label}
                    </p>
                    <p className="text-3xl font-semibold text-gray-900 mt-1.5">
                      {kpi.value}
                    </p>
                    {kpi.total !== undefined && (
                      <p className="text-xs text-gray-400 mt-1">
                        de {kpi.total} equipos
                      </p>
                    )}
                  </div>
                  <div
                    className={`${kpi.bgIcon} backdrop-blur-md border rounded-xl p-3`}
                  >
                    <Icon className={`w-6 h-6 ${kpi.textIcon}`} />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* ── Vencidos alert ──────────────────────────────────────────── */}
        {kpis.vencidos > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-2xl p-4"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-600">
                  {kpis.vencidos}{" "}
                  {kpis.vencidos === 1
                    ? "mantenimiento vencido"
                    : "mantenimientos vencidos"}
                </p>
                <p className="text-xs text-red-500">
                  Revisa los cronogramas que han superado su fecha programada
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Main content grid ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Próximos mantenimientos ──────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.15 }}
            className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl shadow-lg shadow-black/5 p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/15 backdrop-blur-md border border-amber-500/20 rounded-xl p-2">
                  <CalendarDays className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Próximos Mantenimientos
                </h3>
              </div>
              <Link
                href="/mantenimiento/cronogramas"
                className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-0.5"
              >
                Ver todos <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {nextSchedules.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No hay mantenimientos programados
              </div>
            ) : (
              <div className="space-y-3">
                {nextSchedules.map((schedule) => {
                  const dueDate = new Date(schedule.next_due_date!)
                  const isOverdue = isPast(dueDate) && !isToday(dueDate)
                  const isDueToday = isToday(dueDate)
                  const daysUntil = differenceInDays(dueDate, new Date())

                  return (
                    <div
                      key={schedule.id}
                      className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                        isOverdue
                          ? "bg-red-50/80 border border-red-100"
                          : isDueToday
                          ? "bg-amber-50/80 border border-amber-100"
                          : "bg-white/50 border border-gray-100/50"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {schedule.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {schedule.equipment?.name || "Sin equipo"} &middot;{" "}
                          {schedule.frequency}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        {isOverdue ? (
                          <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">
                            Vencido
                          </Badge>
                        ) : isDueToday ? (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
                            Hoy
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {daysUntil}d
                          </span>
                        )}
                        <span className="text-xs text-gray-400 hidden sm:block">
                          {format(dueDate, "d MMM", { locale: es })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* ── Órdenes recientes ────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.2 }}
            className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl shadow-lg shadow-black/5 p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/15 backdrop-blur-md border border-blue-500/20 rounded-xl p-2">
                  <Wrench className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Órdenes Recientes
                </h3>
              </div>
              <Link
                href="/mantenimiento/ordenes"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
              >
                Ver todas <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No hay órdenes de trabajo registradas
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/50 border border-gray-100/50 hover:bg-white/70 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-gray-400">
                          #{order.order_number}
                        </span>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {order.title}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {order.equipment?.name || "Sin equipo"} &middot;{" "}
                        {order.maintenance_type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <Badge
                        className={`${priorityColors[order.priority]} text-[10px]`}
                      >
                        {order.priority}
                      </Badge>
                      <Badge
                        className={`${workOrderStatusColors[order.status]} text-[10px]`}
                      >
                        {workOrderStatusLabels[order.status]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Equipment by category ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.25 }}
          className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl shadow-lg shadow-black/5 p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="bg-purple-500/15 backdrop-blur-md border border-purple-500/20 rounded-xl p-2">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Resumen de Equipos por Categoría
              </h3>
            </div>
            <Link
              href="/mantenimiento/equipos"
              className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-0.5"
            >
              Ver equipos <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {categoryStats.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No hay equipos registrados
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryStats.map((stat) => {
                const operativoPercent =
                  stat.total > 0
                    ? Math.round((stat.operativo / stat.total) * 100)
                    : 0

                return (
                  <div
                    key={stat.category.id}
                    className="p-4 rounded-xl bg-white/50 border border-gray-100/50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {stat.category.icon ? (
                          <span className="text-lg">{stat.category.icon}</span>
                        ) : (
                          <Settings className="h-4 w-4 text-gray-400" />
                        )}
                        <h4 className="text-sm font-semibold text-gray-900">
                          {stat.category.name}
                        </h4>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">
                        {stat.total} {stat.total === 1 ? "equipo" : "equipos"}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${operativoPercent}%` }}
                      />
                    </div>

                    {/* Status counts */}
                    <div className="flex flex-wrap gap-1.5">
                      {stat.operativo > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          {stat.operativo}
                        </span>
                      )}
                      {stat.en_mantenimiento > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {stat.en_mantenimiento}
                        </span>
                      )}
                      {stat.fuera_servicio > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 border border-red-100 rounded-full px-2 py-0.5">
                          <XCircle className="h-2.5 w-2.5" />
                          {stat.fuera_servicio}
                        </span>
                      )}
                      {stat.dado_de_baja > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
                          <XCircle className="h-2.5 w-2.5" />
                          {stat.dado_de_baja}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
