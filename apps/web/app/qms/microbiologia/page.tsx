"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Microscope,
  Beef,
  Package,
  PackageOpen,
  Wind,
  Layers,
  UserCheck,
  Droplets,
  CalendarDays,
  DollarSign,
  FlaskConical,
  TestTubes,
} from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

// ── Types ───────────────────────────────────────────────────────────────────
interface SamplingItem {
  month: number        // 1-12
  sample: string       // Sample name
  price: number        // Cost in thousands
  microbiologia: boolean
  fisicoquimico: boolean
}

interface SamplingCategory {
  key: string
  label: string
  icon: React.ReactNode
  color: string        // tailwind color token (e.g. "amber")
  gradient: string     // gradient classes
  items: SamplingItem[]
}

// ── Cronograma Data 2026 (from Excel CR-06 V2.0) ───────────────────────────
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
const MONTHS_FULL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

const CATEGORIES: SamplingCategory[] = [
  {
    key: "materia_prima",
    label: "Materia Prima",
    icon: <Beef className="w-5 h-5" />,
    color: "amber",
    gradient: "from-amber-400 to-orange-600",
    items: [
      { month: 1, sample: "Carne Descargue", price: 130.9, microbiologia: true, fisicoquimico: false },
      { month: 2, sample: "Queso Campesino", price: 233.4, microbiologia: true, fisicoquimico: false },
      { month: 2, sample: "Harina de trigo", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 3, sample: "Mantequilla", price: 233.4, microbiologia: true, fisicoquimico: false },
      { month: 4, sample: "Queso Parmesano", price: 209.2, microbiologia: true, fisicoquimico: false },
      { month: 5, sample: "Jamón Cerdo", price: 130.9, microbiologia: true, fisicoquimico: false },
      { month: 6, sample: "Pechuga de pollo", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 7, sample: "Hojaldrina", price: 233.4, microbiologia: true, fisicoquimico: false },
      { month: 8, sample: "Rico Hojaldre", price: 233.4, microbiologia: true, fisicoquimico: false },
      { month: 8, sample: "Queso Costeño", price: 233.4, microbiologia: true, fisicoquimico: false },
      { month: 9, sample: "Harina Almendras", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 10, sample: "Pool Semillas", price: 136.4, microbiologia: true, fisicoquimico: false },
      { month: 11, sample: "Pool verduras", price: 209.2, microbiologia: true, fisicoquimico: false },
      { month: 12, sample: "Queso doble crema", price: 233.4, microbiologia: true, fisicoquimico: false },
    ],
  },
  {
    key: "producto_terminado",
    label: "Producto Terminado",
    icon: <Package className="w-5 h-5" />,
    color: "emerald",
    gradient: "from-emerald-400 to-green-600",
    items: [
      { month: 1, sample: "Croissant Almendras", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 1, sample: "Pañuelo Napolitano", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 2, sample: "Croissant Jamón y queso", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 3, sample: "Pastel de pollo (x5 conformidad)", price: 480, microbiologia: true, fisicoquimico: false },
      { month: 3, sample: "Pastel de Carne Ranchero", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 4, sample: "Croissant de queso", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 5, sample: "Palito de queso", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 6, sample: "Pastel de pollo", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 7, sample: "Croissant Europa", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 7, sample: "Croissant Margarina", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 8, sample: "Flauta de chocolate", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 9, sample: "Croissant Multicereal", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 9, sample: "Flauta de queso y bocadillo", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 10, sample: "Croissant Jamón y queso", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 10, sample: "Pan Blandito", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 10, sample: "Pan Pera", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 11, sample: "Pan costeño", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 11, sample: "Roscón de arequipe", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 11, sample: "Almojábana", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 12, sample: "Pan de bono", price: 112.1, microbiologia: true, fisicoquimico: false },
      { month: 12, sample: "Calentano", price: 112.1, microbiologia: true, fisicoquimico: false },
    ],
  },
  {
    key: "material_empaque",
    label: "Material de Empaque",
    icon: <PackageOpen className="w-5 h-5" />,
    color: "sky",
    gradient: "from-sky-400 to-blue-600",
    items: [
      { month: 1, sample: "Bolsatina blanca", price: 68.5, microbiologia: true, fisicoquimico: false },
      { month: 5, sample: "Bolsatina Roja", price: 68.5, microbiologia: true, fisicoquimico: false },
      { month: 7, sample: "Lámina Plástico", price: 68.5, microbiologia: true, fisicoquimico: false },
      { month: 9, sample: "Bolsatina Verde", price: 68.5, microbiologia: true, fisicoquimico: false },
      { month: 11, sample: "Lámina BOPP", price: 68.5, microbiologia: true, fisicoquimico: false },
    ],
  },
  {
    key: "ambiente",
    label: "Ambiente",
    icon: <Wind className="w-5 h-5" />,
    color: "violet",
    gradient: "from-violet-400 to-purple-600",
    items: [
      { month: 1, sample: "Cuarto frío de Materias primas", price: 44.5, microbiologia: true, fisicoquimico: false },
      { month: 2, sample: "Amasado", price: 44.5, microbiologia: true, fisicoquimico: false },
      { month: 3, sample: "Cuarto refrigeración", price: 44.5, microbiologia: true, fisicoquimico: false },
      { month: 4, sample: "Cocina", price: 44.5, microbiologia: true, fisicoquimico: false },
      { month: 5, sample: "Empaque", price: 44.5, microbiologia: true, fisicoquimico: false },
      { month: 6, sample: "Leudado", price: 44.5, microbiologia: true, fisicoquimico: false },
      { month: 7, sample: "Lego/Polilyne", price: 44.5, microbiologia: true, fisicoquimico: false },
      { month: 8, sample: "Pesaje", price: 44.5, microbiologia: true, fisicoquimico: false },
      { month: 9, sample: "Logística Materias Primas", price: 44.5, microbiologia: true, fisicoquimico: false },
      { month: 10, sample: "Batidos", price: 44.5, microbiologia: true, fisicoquimico: false },
      { month: 11, sample: "Lego/Pastelería", price: 44.5, microbiologia: true, fisicoquimico: false },
      { month: 12, sample: "Cuarto frío masas", price: 44.5, microbiologia: true, fisicoquimico: false },
    ],
  },
  {
    key: "superficie",
    label: "Superficie",
    icon: <Layers className="w-5 h-5" />,
    color: "rose",
    gradient: "from-rose-400 to-pink-600",
    items: [
      { month: 1, sample: "Mesa de empaque", price: 239.1, microbiologia: true, fisicoquimico: false },
      { month: 1, sample: "Mesa de pesaje", price: 239.1, microbiologia: true, fisicoquimico: false },
      { month: 2, sample: "Polilyne", price: 239.1, microbiologia: true, fisicoquimico: false },
      { month: 3, sample: "Croissomat", price: 239.1, microbiologia: true, fisicoquimico: false },
      { month: 4, sample: "Cocina", price: 239.1, microbiologia: true, fisicoquimico: false },
      { month: 5, sample: "Mesa Amasado", price: 239.1, microbiologia: true, fisicoquimico: false },
      { month: 6, sample: "Batidora", price: 239.1, microbiologia: true, fisicoquimico: false },
      { month: 7, sample: "Mesa Pastelería", price: 239.1, microbiologia: true, fisicoquimico: false },
      { month: 8, sample: "Amasadora Gris", price: 239.1, microbiologia: true, fisicoquimico: false },
      { month: 9, sample: "Banda Laminadora Semiautomática", price: 239.1, microbiologia: true, fisicoquimico: false },
      { month: 10, sample: "Flowpack", price: 239.1, microbiologia: true, fisicoquimico: false },
      { month: 11, sample: "Compactadora", price: 239.1, microbiologia: true, fisicoquimico: false },
      { month: 12, sample: "Mesa pesaje", price: 239.1, microbiologia: true, fisicoquimico: false },
    ],
  },
  {
    key: "manipulador",
    label: "Manipulador",
    icon: <UserCheck className="w-5 h-5" />,
    color: "teal",
    gradient: "from-teal-400 to-cyan-600",
    items: [
      { month: 1, sample: "Panadería", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 1, sample: "Cocina", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 2, sample: "Polilyne (1)", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 2, sample: "Polilyne (2)", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 3, sample: "Croissomat (1)", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 3, sample: "Croissomat (2)", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 4, sample: "Batidos", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 4, sample: "Latas", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 5, sample: "Amasado", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 5, sample: "Pastelería", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 6, sample: "Pastelería", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 6, sample: "Laminado", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 7, sample: "Empaque (1)", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 7, sample: "Empaque (2)", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 8, sample: "Pesaje", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 8, sample: "Amasado", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 9, sample: "Leudado", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 9, sample: "Pastelería", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 10, sample: "I+D", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 10, sample: "Logística", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 11, sample: "Empastador", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 11, sample: "Laminador", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 12, sample: "Margarinas", price: 39.1, microbiologia: true, fisicoquimico: false },
      { month: 12, sample: "Batidos", price: 39.1, microbiologia: true, fisicoquimico: false },
    ],
  },
  {
    key: "agua_potable",
    label: "Agua Potable",
    icon: <Droplets className="w-5 h-5" />,
    color: "cyan",
    gradient: "from-cyan-400 to-blue-500",
    items: [
      { month: 1, sample: "Muelle", price: 104.9, microbiologia: true, fisicoquimico: false },
      { month: 4, sample: "Cocina", price: 104.9, microbiologia: true, fisicoquimico: false },
      { month: 7, sample: "Filtro Sanitario entrada", price: 104.9, microbiologia: true, fisicoquimico: false },
      { month: 10, sample: "Margarinas", price: 104.9, microbiologia: true, fisicoquimico: false },
    ],
  },
]

// ── Color maps ──────────────────────────────────────────────────────────────
const COLOR_MAP: Record<string, { bg: string; text: string; border: string; badge: string; ring: string; dot: string }> = {
  amber:   { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200/50 dark:border-amber-800/30", badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300", ring: "ring-amber-500/20", dot: "bg-amber-500" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200/50 dark:border-emerald-800/30", badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-500/20", dot: "bg-emerald-500" },
  sky:     { bg: "bg-sky-50 dark:bg-sky-950/30", text: "text-sky-700 dark:text-sky-300", border: "border-sky-200/50 dark:border-sky-800/30", badge: "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300", ring: "ring-sky-500/20", dot: "bg-sky-500" },
  violet:  { bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200/50 dark:border-violet-800/30", badge: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300", ring: "ring-violet-500/20", dot: "bg-violet-500" },
  rose:    { bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200/50 dark:border-rose-800/30", badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300", ring: "ring-rose-500/20", dot: "bg-rose-500" },
  teal:    { bg: "bg-teal-50 dark:bg-teal-950/30", text: "text-teal-700 dark:text-teal-300", border: "border-teal-200/50 dark:border-teal-800/30", badge: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300", ring: "ring-teal-500/20", dot: "bg-teal-500" },
  cyan:    { bg: "bg-cyan-50 dark:bg-cyan-950/30", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-200/50 dark:border-cyan-800/30", badge: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300", ring: "ring-cyan-500/20", dot: "bg-cyan-500" },
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatPrice(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v * 1000)
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function MicrobiologiaPage() {
  const [view, setView] = useState<"cronograma" | "categorias">("cronograma")
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

  const currentMonth = new Date().getMonth() + 1 // 1-12

  // Stats
  const stats = useMemo(() => {
    const allItems = CATEGORIES.flatMap(c => c.items)
    const totalSamples = allItems.length
    const totalCost = allItems.reduce((s, i) => s + i.price, 0)
    const monthItems = selectedMonth != null
      ? allItems.filter(i => i.month === selectedMonth)
      : allItems.filter(i => i.month === currentMonth)
    const monthCost = monthItems.reduce((s, i) => s + i.price, 0)
    return { totalSamples, totalCost, monthItems, monthCost, monthCount: monthItems.length }
  }, [selectedMonth, currentMonth])

  const displayMonth = selectedMonth ?? currentMonth

  // Items grouped by month for cronograma view
  const monthlyData = useMemo(() => {
    const map: Record<number, { category: SamplingCategory; item: SamplingItem }[]> = {}
    for (let m = 1; m <= 12; m++) map[m] = []
    CATEGORIES.forEach(cat => {
      cat.items.forEach(item => {
        map[item.month].push({ category: cat, item })
      })
    })
    return map
  }, [])

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
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Costo Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(stats.totalCost)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Presupuesto anual</p>
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
              <FlaskConical className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Costo Mes</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(stats.monthCost)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{MONTHS_FULL[displayMonth - 1]} 2026</p>
          </div>
        </motion.div>

        {/* View Tabs */}
        <Tabs value={view} onValueChange={(v) => setView(v as "cronograma" | "categorias")} className="space-y-6">
          <TabsList className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl p-1.5 h-auto w-full flex gap-1">
            <TabsTrigger
              value="cronograma"
              className="rounded-xl data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/30 text-sm font-medium h-11 transition-all duration-200 flex-1"
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              Cronograma Mensual
            </TabsTrigger>
            <TabsTrigger
              value="categorias"
              className="rounded-xl data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/30 text-sm font-medium h-11 transition-all duration-200 flex-1"
            >
              <FlaskConical className="w-4 h-4 mr-2" />
              Por Categoría
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
                  <span className="ml-1.5 text-[10px] opacity-70">({monthlyData[i + 1].length})</span>
                </button>
              ))}
            </div>

            {/* Month samples */}
            <motion.div
              key={displayMonth}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {MONTHS_FULL[displayMonth - 1]} 2026
                    </h2>
                    <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
                      {monthlyData[displayMonth].length} muestras &middot; {formatPrice(monthlyData[displayMonth].reduce((s, d) => s + d.item.price, 0))}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {monthlyData[displayMonth].length === 0 ? (
                    <div className="text-center py-12">
                      <Microscope className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 dark:text-gray-500 text-sm">No hay muestras programadas este mes</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {monthlyData[displayMonth].map((d, i) => {
                        const colors = COLOR_MAP[d.category.color]
                        return (
                          <motion.div
                            key={`${d.item.sample}-${i}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className={cn(
                              "flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-colors duration-150",
                              colors.bg, colors.border,
                              "hover:shadow-sm"
                            )}
                          >
                            <div className={cn("w-2 h-2 rounded-full shrink-0", colors.dot)} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {d.item.sample}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={cn("text-xs font-medium", colors.text)}>
                                  {d.category.label}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {d.item.microbiologia && (
                                <Badge className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", colors.badge)}>
                                  MB
                                </Badge>
                              )}
                              {d.item.fisicoquimico && (
                                <Badge className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                  FQ
                                </Badge>
                              )}
                              <span className="text-xs font-mono text-gray-500 dark:text-gray-400 tabular-nums hidden sm:inline">
                                {formatPrice(d.item.price)}
                              </span>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ── By Category View ────────────────────────────────────────── */}
          <TabsContent value="categorias" className="space-y-4 mt-0">
            {CATEGORIES.map((cat, catIdx) => {
              const colors = COLOR_MAP[cat.color]
              const catCost = cat.items.reduce((s, i) => s + i.price, 0)
              return (
                <motion.div
                  key={cat.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: catIdx * 0.05 }}
                >
                  <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md text-white", cat.gradient)}>
                          {cat.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{cat.label}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {cat.items.length} muestras &middot; {formatPrice(catCost)}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Mini calendar grid */}
                      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
                        {MONTHS.map((m, mi) => {
                          const monthItems = cat.items.filter(it => it.month === mi + 1)
                          const hasItems = monthItems.length > 0
                          const isCurrentMonth = mi + 1 === currentMonth
                          return (
                            <div
                              key={m}
                              className={cn(
                                "rounded-xl p-2 text-center transition-all duration-150 min-h-[72px] flex flex-col",
                                hasItems
                                  ? cn(colors.bg, colors.border, "border")
                                  : "bg-gray-50/50 dark:bg-white/[0.02] border border-transparent",
                                isCurrentMonth && "ring-2 ring-offset-1 ring-offset-white/60 dark:ring-offset-black/40",
                                isCurrentMonth && colors.ring
                              )}
                            >
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider",
                                hasItems ? colors.text : "text-gray-400 dark:text-gray-600"
                              )}>
                                {m}
                              </span>
                              {hasItems ? (
                                <div className="flex-1 flex flex-col justify-center mt-1 gap-0.5">
                                  {monthItems.map((it, idx) => (
                                    <p key={idx} className="text-[9px] sm:text-[10px] text-gray-700 dark:text-gray-300 leading-tight truncate" title={it.sample}>
                                      {it.sample}
                                    </p>
                                  ))}
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
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
