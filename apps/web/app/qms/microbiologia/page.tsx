"use client"

import { useState, useEffect, useMemo } from "react"
import { useQMSPrograms, SanitationProgram } from "@/hooks/use-qms-programs"
import { useQMSActivities, ProgramActivity } from "@/hooks/use-qms-activities"
import { useQMSRecords, ActivityRecord } from "@/hooks/use-qms-records"
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

// ── Types ───────────────────────────────────────────────────────────────────
interface SamplingItem {
  month: number
  sample: string
  price: number
  microbiologia: boolean
  fisicoquimico: boolean
  /** key that maps to activity title fragment for matching records */
  activityKey: string
}

interface SamplingCategory {
  key: string
  label: string
  activityKey: string  // matches against activity title
  icon: React.ReactNode
  color: string
  gradient: string
  items: SamplingItem[]
}

// ── Cronograma Data 2026 (CR-06 V2.0) ──────────────────────────────────────
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
const MONTHS_FULL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

const CATEGORIES: SamplingCategory[] = [
  {
    key: "materia_prima", label: "Materia Prima", activityKey: "materia prima",
    icon: <Beef className="w-5 h-5" />, color: "amber", gradient: "from-amber-400 to-orange-600",
    items: [
      { month: 1, sample: "Carne Descargue", price: 130.9, microbiologia: true, fisicoquimico: false, activityKey: "materia prima" },
      { month: 2, sample: "Queso Campesino", price: 233.4, microbiologia: true, fisicoquimico: false, activityKey: "materia prima" },
      { month: 2, sample: "Harina de trigo", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "materia prima" },
      { month: 3, sample: "Mantequilla", price: 233.4, microbiologia: true, fisicoquimico: false, activityKey: "materia prima" },
      { month: 4, sample: "Queso Parmesano", price: 209.2, microbiologia: true, fisicoquimico: false, activityKey: "materia prima" },
      { month: 5, sample: "Jamón Cerdo", price: 130.9, microbiologia: true, fisicoquimico: false, activityKey: "materia prima" },
      { month: 6, sample: "Pechuga de pollo", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "materia prima" },
      { month: 7, sample: "Hojaldrina", price: 233.4, microbiologia: true, fisicoquimico: false, activityKey: "materia prima" },
      { month: 8, sample: "Rico Hojaldre", price: 233.4, microbiologia: true, fisicoquimico: false, activityKey: "materia prima" },
      { month: 8, sample: "Queso Costeño", price: 233.4, microbiologia: true, fisicoquimico: false, activityKey: "materia prima" },
      { month: 9, sample: "Harina Almendras", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "materia prima" },
      { month: 10, sample: "Pool Semillas", price: 136.4, microbiologia: true, fisicoquimico: false, activityKey: "materia prima" },
      { month: 11, sample: "Pool verduras", price: 209.2, microbiologia: true, fisicoquimico: false, activityKey: "materia prima" },
      { month: 12, sample: "Queso doble crema", price: 233.4, microbiologia: true, fisicoquimico: false, activityKey: "materia prima" },
    ],
  },
  {
    key: "producto_terminado", label: "Producto Terminado", activityKey: "producto terminado",
    icon: <Package className="w-5 h-5" />, color: "emerald", gradient: "from-emerald-400 to-green-600",
    items: [
      { month: 1, sample: "Croissant Almendras", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "producto terminado" },
      { month: 1, sample: "Pañuelo Napolitano", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "producto terminado" },
      { month: 2, sample: "Croissant Jamón y queso", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "producto terminado" },
      { month: 3, sample: "Pastel de pollo (x5 conformidad)", price: 480, microbiologia: true, fisicoquimico: false, activityKey: "producto terminado" },
      { month: 3, sample: "Pastel de Carne Ranchero", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "producto terminado" },
      { month: 4, sample: "Croissant de queso", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "producto terminado" },
      { month: 5, sample: "Palito de queso", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "producto terminado" },
      { month: 6, sample: "Pastel de pollo", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "producto terminado" },
      { month: 7, sample: "Croissant Europa", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "producto terminado" },
      { month: 7, sample: "Croissant Margarina", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "producto terminado" },
      { month: 8, sample: "Flauta de chocolate", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "producto terminado" },
      { month: 9, sample: "Croissant Multicereal", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "producto terminado" },
      { month: 9, sample: "Flauta de queso y bocadillo", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "producto terminado" },
      { month: 10, sample: "Croissant Jamón y queso", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "producto terminado" },
      { month: 10, sample: "Pan Blandito", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "producto terminado" },
      { month: 10, sample: "Pan Pera", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "producto terminado" },
      { month: 11, sample: "Pan costeño", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "producto terminado" },
      { month: 11, sample: "Roscón de arequipe", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "producto terminado" },
      { month: 11, sample: "Almojábana", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "producto terminado" },
      { month: 12, sample: "Pan de bono", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "producto terminado" },
      { month: 12, sample: "Calentano", price: 112.1, microbiologia: true, fisicoquimico: false, activityKey: "producto terminado" },
    ],
  },
  {
    key: "material_empaque", label: "Material de Empaque", activityKey: "material de empaque",
    icon: <PackageOpen className="w-5 h-5" />, color: "sky", gradient: "from-sky-400 to-blue-600",
    items: [
      { month: 1, sample: "Bolsatina blanca", price: 68.5, microbiologia: true, fisicoquimico: false, activityKey: "material de empaque" },
      { month: 5, sample: "Bolsatina Roja", price: 68.5, microbiologia: true, fisicoquimico: false, activityKey: "material de empaque" },
      { month: 7, sample: "Lámina Plástico", price: 68.5, microbiologia: true, fisicoquimico: false, activityKey: "material de empaque" },
      { month: 9, sample: "Bolsatina Verde", price: 68.5, microbiologia: true, fisicoquimico: false, activityKey: "material de empaque" },
      { month: 11, sample: "Lámina BOPP", price: 68.5, microbiologia: true, fisicoquimico: false, activityKey: "material de empaque" },
    ],
  },
  {
    key: "ambiente", label: "Ambiente", activityKey: "ambiental",
    icon: <Wind className="w-5 h-5" />, color: "violet", gradient: "from-violet-400 to-purple-600",
    items: [
      { month: 1, sample: "Cuarto frío de Materias primas", price: 44.5, microbiologia: true, fisicoquimico: false, activityKey: "ambiental" },
      { month: 2, sample: "Amasado", price: 44.5, microbiologia: true, fisicoquimico: false, activityKey: "ambiental" },
      { month: 3, sample: "Cuarto refrigeración", price: 44.5, microbiologia: true, fisicoquimico: false, activityKey: "ambiental" },
      { month: 4, sample: "Cocina", price: 44.5, microbiologia: true, fisicoquimico: false, activityKey: "ambiental" },
      { month: 5, sample: "Empaque", price: 44.5, microbiologia: true, fisicoquimico: false, activityKey: "ambiental" },
      { month: 6, sample: "Leudado", price: 44.5, microbiologia: true, fisicoquimico: false, activityKey: "ambiental" },
      { month: 7, sample: "Lego/Polilyne", price: 44.5, microbiologia: true, fisicoquimico: false, activityKey: "ambiental" },
      { month: 8, sample: "Pesaje", price: 44.5, microbiologia: true, fisicoquimico: false, activityKey: "ambiental" },
      { month: 9, sample: "Logística Materias Primas", price: 44.5, microbiologia: true, fisicoquimico: false, activityKey: "ambiental" },
      { month: 10, sample: "Batidos", price: 44.5, microbiologia: true, fisicoquimico: false, activityKey: "ambiental" },
      { month: 11, sample: "Lego/Pastelería", price: 44.5, microbiologia: true, fisicoquimico: false, activityKey: "ambiental" },
      { month: 12, sample: "Cuarto frío masas", price: 44.5, microbiologia: true, fisicoquimico: false, activityKey: "ambiental" },
    ],
  },
  {
    key: "superficie", label: "Superficie", activityKey: "superficies",
    icon: <Layers className="w-5 h-5" />, color: "rose", gradient: "from-rose-400 to-pink-600",
    items: [
      { month: 1, sample: "Mesa de empaque", price: 239.1, microbiologia: true, fisicoquimico: false, activityKey: "superficies" },
      { month: 1, sample: "Mesa de pesaje", price: 239.1, microbiologia: true, fisicoquimico: false, activityKey: "superficies" },
      { month: 2, sample: "Polilyne", price: 239.1, microbiologia: true, fisicoquimico: false, activityKey: "superficies" },
      { month: 3, sample: "Croissomat", price: 239.1, microbiologia: true, fisicoquimico: false, activityKey: "superficies" },
      { month: 4, sample: "Cocina", price: 239.1, microbiologia: true, fisicoquimico: false, activityKey: "superficies" },
      { month: 5, sample: "Mesa Amasado", price: 239.1, microbiologia: true, fisicoquimico: false, activityKey: "superficies" },
      { month: 6, sample: "Batidora", price: 239.1, microbiologia: true, fisicoquimico: false, activityKey: "superficies" },
      { month: 7, sample: "Mesa Pastelería", price: 239.1, microbiologia: true, fisicoquimico: false, activityKey: "superficies" },
      { month: 8, sample: "Amasadora Gris", price: 239.1, microbiologia: true, fisicoquimico: false, activityKey: "superficies" },
      { month: 9, sample: "Banda Laminadora Semiautomática", price: 239.1, microbiologia: true, fisicoquimico: false, activityKey: "superficies" },
      { month: 10, sample: "Flowpack", price: 239.1, microbiologia: true, fisicoquimico: false, activityKey: "superficies" },
      { month: 11, sample: "Compactadora", price: 239.1, microbiologia: true, fisicoquimico: false, activityKey: "superficies" },
      { month: 12, sample: "Mesa pesaje", price: 239.1, microbiologia: true, fisicoquimico: false, activityKey: "superficies" },
    ],
  },
  {
    key: "manipulador", label: "Manipulador", activityKey: "manipuladores",
    icon: <UserCheck className="w-5 h-5" />, color: "teal", gradient: "from-teal-400 to-cyan-600",
    items: [
      { month: 1, sample: "Panadería", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 1, sample: "Cocina", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 2, sample: "Polilyne (1)", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 2, sample: "Polilyne (2)", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 3, sample: "Croissomat (1)", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 3, sample: "Croissomat (2)", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 4, sample: "Batidos", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 4, sample: "Latas", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 5, sample: "Amasado", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 5, sample: "Pastelería", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 6, sample: "Pastelería", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 6, sample: "Laminado", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 7, sample: "Empaque (1)", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 7, sample: "Empaque (2)", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 8, sample: "Pesaje", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 8, sample: "Amasado", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 9, sample: "Leudado", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 9, sample: "Pastelería", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 10, sample: "I+D", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 10, sample: "Logística", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 11, sample: "Empastador", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 11, sample: "Laminador", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 12, sample: "Margarinas", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
      { month: 12, sample: "Batidos", price: 39.1, microbiologia: true, fisicoquimico: false, activityKey: "manipuladores" },
    ],
  },
  {
    key: "agua_potable", label: "Agua Potable", activityKey: "agua potable",
    icon: <Droplets className="w-5 h-5" />, color: "cyan", gradient: "from-cyan-400 to-blue-500",
    items: [
      { month: 1, sample: "Muelle", price: 104.9, microbiologia: true, fisicoquimico: false, activityKey: "agua potable" },
      { month: 4, sample: "Cocina", price: 104.9, microbiologia: true, fisicoquimico: false, activityKey: "agua potable" },
      { month: 7, sample: "Filtro Sanitario entrada", price: 104.9, microbiologia: true, fisicoquimico: false, activityKey: "agua potable" },
      { month: 10, sample: "Margarinas", price: 104.9, microbiologia: true, fisicoquimico: false, activityKey: "agua potable" },
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

function getResultBadge(resultado?: string) {
  if (!resultado) return { label: "Pendiente", variant: "secondary" as const, icon: Clock }
  if (resultado === "Conforme") return { label: "Conforme", variant: "default" as const, icon: CheckCircle2 }
  if (resultado === "No Conforme") return { label: "No Conforme", variant: "destructive" as const, icon: AlertTriangle }
  return { label: resultado, variant: "secondary" as const, icon: Clock }
}

/**
 * Match a record to a cronograma item by checking if the record's muestra value
 * matches the sample name (case-insensitive, trimmed).
 */
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

  const currentMonth = new Date().getMonth() + 1

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
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
  }

  const handleSaveDocument = async (content: string) => {
    if (!program) return
    await updateProgram(program.id, { program_document: content })
    setProgram(prev => prev ? { ...prev, program_document: content } : prev)
  }

  // Map activities by their title key for matching to cronograma categories
  const activityMap = useMemo(() => {
    const map: Record<string, ProgramActivity> = {}
    activities.forEach(act => {
      const titleLower = act.title.toLowerCase()
      CATEGORIES.forEach(cat => {
        if (titleLower.includes(cat.activityKey)) {
          map[cat.key] = act
        }
      })
    })
    return map
  }, [activities])

  // Map records by activity_id for quick lookups
  const recordsByActivity = useMemo(() => {
    const map: Record<string, ActivityRecord[]> = {}
    records.forEach(r => {
      if (!map[r.activity_id]) map[r.activity_id] = []
      map[r.activity_id].push(r)
    })
    return map
  }, [records])

  // Find records matching a specific cronograma item
  function findRecordsForItem(item: SamplingItem, catKey: string): ActivityRecord[] {
    const activity = activityMap[catKey]
    if (!activity) return []
    const actRecords = recordsByActivity[activity.id] || []
    const normalized = normalizeSample(item.sample)
    return actRecords.filter(r => {
      const muestra = r.values?.muestra || r.values?.["Zona/Área"] || r.values?.["Superficie/Equipo"] || r.values?.["Manipulador/Área"] || r.values?.["Punto de Muestreo"] || ""
      if (normalizeSample(muestra) === normalized) return true
      // Also match by month
      const recMonth = new Date(r.scheduled_date).getMonth() + 1
      if (recMonth === item.month && normalizeSample(muestra).includes(normalized.slice(0, 8))) return true
      return false
    })
  }

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

  const displayMonth = selectedMonth ?? currentMonth

  // Stats
  const stats = useMemo(() => {
    const allItems = CATEGORIES.flatMap(c => c.items)
    const totalSamples = allItems.length
    const totalCost = allItems.reduce((s, i) => s + i.price, 0)
    const monthItems = allItems.filter(i => i.month === displayMonth)
    const monthCost = monthItems.reduce((s, i) => s + i.price, 0)

    // Count completed records
    const completedCount = records.filter(r => r.status === "completado").length

    return { totalSamples, totalCost, monthCost, monthCount: monthItems.length, completedCount }
  }, [displayMonth, records])

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

            {/* Month samples with records */}
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
                        const itemRecords = findRecordsForItem(d.item, d.category.key)
                        const hasRecords = itemRecords.length > 0
                        const latestRecord = hasRecords ? itemRecords.sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime())[0] : null
                        const resultado = latestRecord?.values?.resultado
                        const resultBadge = getResultBadge(resultado)
                        const ResultIcon = resultBadge.icon
                        const totalAttachments = itemRecords.reduce((s, r) => s + (r.record_attachments?.length || 0), 0)

                        return (
                          <motion.div
                            key={`${d.item.sample}-${i}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className={cn(
                              "rounded-2xl border transition-colors duration-150",
                              colors.bg, colors.border,
                              "hover:shadow-sm"
                            )}
                          >
                            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
                              <div className={cn("w-2 h-2 rounded-full shrink-0", hasRecords ? "bg-green-500" : colors.dot)} />
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
                                {hasRecords ? (
                                  <Badge variant={resultBadge.variant} className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold gap-1">
                                    <ResultIcon className="w-3 h-3" />
                                    {resultBadge.label}
                                  </Badge>
                                ) : (
                                  <>
                                    {d.item.microbiologia && (
                                      <Badge className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", colors.badge)}>
                                        MB
                                      </Badge>
                                    )}
                                  </>
                                )}
                                {totalAttachments > 0 && (
                                  <AttachmentsBadge
                                    count={totalAttachments}
                                    onClick={() => setViewingAttachments(latestRecord)}
                                  />
                                )}
                                <span className="text-xs font-mono text-gray-500 dark:text-gray-400 tabular-nums hidden sm:inline">
                                  {formatPrice(d.item.price)}
                                </span>
                              </div>
                            </div>

                            {/* Expanded record details */}
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
                                          {record.values?.laboratorio && (
                                            <span className="text-gray-400">Lab: {record.values.laboratorio}</span>
                                          )}
                                          {record.values?.lote && (
                                            <span className="text-gray-400">Lote: {record.values.lote}</span>
                                          )}
                                        </div>
                                        {record.observations && (
                                          <p className="text-gray-400 italic mt-0.5">{record.observations}</p>
                                        )}
                                      </div>
                                      {(record.record_attachments?.length || 0) > 0 && (
                                        <button
                                          onClick={() => setViewingAttachments(record)}
                                          className="flex items-center gap-1 text-indigo-500 hover:text-indigo-600 shrink-0"
                                        >
                                          <Paperclip className="w-3 h-3" />
                                          <span>{record.record_attachments!.length}</span>
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

          {/* ── By Category View ────────────────────────────────────────── */}
          <TabsContent value="categorias" className="space-y-4 mt-0">
            {CATEGORIES.map((cat, catIdx) => {
              const colors = COLOR_MAP[cat.color]
              const catCost = cat.items.reduce((s, i) => s + i.price, 0)
              const activity = activityMap[cat.key]
              const catRecords = activity ? (recordsByActivity[activity.id] || []) : []
              const completedInCat = catRecords.filter(r => r.status === "completado").length
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
                            {completedInCat > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400"> &middot; {completedInCat} registrados</span>
                            )}
                          </p>
                        </div>
                        {activity && (
                          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px]">
                            {activity.frequency}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Mini calendar grid */}
                      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
                        {MONTHS.map((m, mi) => {
                          const monthItems = cat.items.filter(it => it.month === mi + 1)
                          const hasItems = monthItems.length > 0
                          const isCurrentMonth = mi + 1 === currentMonth
                          // Check if records exist for this month's items
                          const monthHasRecords = hasItems && monthItems.some(item => findRecordsForItem(item, cat.key).length > 0)
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
                              <div className="flex items-center justify-center gap-1">
                                <span className={cn(
                                  "text-[10px] font-bold uppercase tracking-wider",
                                  hasItems ? colors.text : "text-gray-400 dark:text-gray-600"
                                )}>
                                  {m}
                                </span>
                                {monthHasRecords && (
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                                )}
                              </div>
                              {hasItems ? (
                                <div className="flex-1 flex flex-col justify-center mt-1 gap-0.5">
                                  {monthItems.map((it, idx) => {
                                    const itRecords = findRecordsForItem(it, cat.key)
                                    return (
                                      <p
                                        key={idx}
                                        className={cn(
                                          "text-[9px] sm:text-[10px] leading-tight truncate",
                                          itRecords.length > 0
                                            ? "text-emerald-700 dark:text-emerald-300 font-medium"
                                            : "text-gray-700 dark:text-gray-300"
                                        )}
                                        title={`${it.sample}${itRecords.length > 0 ? " ✓" : ""}`}
                                      >
                                        {it.sample}
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

                      {/* Records list for this category */}
                      {catRecords.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200/30 dark:border-white/10 space-y-2">
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                            Registros ({catRecords.length})
                          </h4>
                          {catRecords.slice(0, 5).map((record) => {
                            const recResult = getResultBadge(record.values?.resultado)
                            const RecIcon = recResult.icon
                            return (
                              <div key={record.id} className="flex items-center gap-3 text-xs bg-white/30 dark:bg-white/5 rounded-xl px-3 py-2">
                                <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                  {format(new Date(record.scheduled_date), "d MMM", { locale: es })}
                                </span>
                                <span className="flex-1 text-gray-700 dark:text-gray-300 truncate font-medium">
                                  {record.values?.muestra || record.values?.["Zona/Área"] || record.values?.["Superficie/Equipo"] || record.values?.["Manipulador/Área"] || record.values?.["Punto de Muestreo"] || "-"}
                                </span>
                                <Badge variant={recResult.variant} className="rounded-full px-2 py-0 text-[10px] gap-0.5 shrink-0">
                                  <RecIcon className="w-2.5 h-2.5" />
                                  {recResult.label}
                                </Badge>
                                {(record.record_attachments?.length || 0) > 0 && (
                                  <button
                                    onClick={() => setViewingAttachments(record)}
                                    className="flex items-center gap-1 text-indigo-500 hover:text-indigo-600 shrink-0"
                                  >
                                    <Paperclip className="w-3 h-3" />
                                    <span>{record.record_attachments!.length}</span>
                                  </button>
                                )}
                              </div>
                            )
                          })}
                          {catRecords.length > 5 && (
                            <p className="text-[10px] text-gray-400 text-center">
                              +{catRecords.length - 5} registros más
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
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
        <ProgramSuppliersModal
          open={showSuppliers}
          onClose={() => setShowSuppliers(false)}
          programId={program.id}
          programName="Muestreo Microbiológico"
          accentColor="indigo"
        />
      )}

      {program && (
        <ProgramDocumentModal
          open={showDocument}
          onClose={() => setShowDocument(false)}
          programName="Muestreo Microbiológico"
          accentColor="indigo"
          document={program.program_document}
          onSave={handleSaveDocument}
        />
      )}
    </div>
  )
}
