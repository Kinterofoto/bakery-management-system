"use client"

import { useState, useEffect } from "react"
import { useQMSActivities, ProgramActivity, ProgramActivityInsert, SamplingScheduleItem } from "@/hooks/use-qms-activities"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Plus,
  Loader2,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Calendar,
  MapPin,
  ListChecks,
  FileText,
  Trash2,
  FlaskConical,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const FREQUENCIES = [
  { value: "diario", label: "Diario" },
  { value: "semanal", label: "Semanal" },
  { value: "quincenal", label: "Quincenal" },
  { value: "mensual", label: "Mensual" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
]

const ACTIVITY_TYPES = [
  { value: "registro_diario", label: "Registro diario" },
  { value: "inspeccion_estacion", label: "Inspección" },
  { value: "limpieza_profunda", label: "Limpieza profunda" },
  { value: "evaluacion", label: "Evaluación" },
  { value: "fumigacion", label: "Fumigación" },
  { value: "diagnostico", label: "Diagnóstico" },
  { value: "monitoreo", label: "Monitoreo" },
  { value: "capacitacion", label: "Capacitación" },
]

function getActivityTypeBadge(type: string) {
  const found = ACTIVITY_TYPES.find(t => t.value === type)
  return found?.label || type
}

const PERIOD_LABELS: Record<string, string[]> = {
  mensual: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
  trimestral: ["Q1 (Ene-Mar)", "Q2 (Abr-Jun)", "Q3 (Jul-Sep)", "Q4 (Oct-Dic)"],
  semestral: ["S1 (Ene-Jun)", "S2 (Jul-Dic)"],
  anual: ["Anual"],
}

function getPeriodCount(frequency: string): number {
  switch (frequency) {
    case "mensual": return 12
    case "trimestral": return 4
    case "semestral": return 2
    case "anual": return 1
    default: return 0
  }
}

interface ProgramActivitiesSectionProps {
  programId: string
  accentColor?: string // e.g. "blue", "green", "purple", "amber"
}

export function ProgramActivitiesSection({ programId, accentColor = "blue" }: ProgramActivitiesSectionProps) {
  const { loading, getActivities, createActivity, updateActivity } = useQMSActivities()

  const [activities, setActivities] = useState<ProgramActivity[]>([])
  const [expanded, setExpanded] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<ProgramActivity | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Activity form state
  const [actTitle, setActTitle] = useState("")
  const [actDescription, setActDescription] = useState("")
  const [actType, setActType] = useState("")
  const [actFrequency, setActFrequency] = useState("")
  const [actStartDate, setActStartDate] = useState("")
  const [actArea, setActArea] = useState("")
  const [actSchedule, setActSchedule] = useState<SamplingScheduleItem[]>([])
  const [showSchedule, setShowSchedule] = useState(false)

  useEffect(() => {
    loadActivities()
  }, [programId])

  const loadActivities = async () => {
    if (!programId) return
    const acts = await getActivities(programId)
    setActivities(acts)
  }

  const openCreateDialog = () => {
    setEditingActivity(null)
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (activity: ProgramActivity) => {
    setEditingActivity(activity)
    setActTitle(activity.title)
    setActDescription(activity.description || "")
    setActType(activity.activity_type)
    setActFrequency(activity.frequency)
    setActStartDate(activity.start_date || "")
    setActArea(activity.area || "")
    setActSchedule(activity.sampling_schedule || [])
    setShowSchedule((activity.sampling_schedule || []).length > 0)
    setDialogOpen(true)
  }

  const resetForm = () => {
    setActTitle("")
    setActDescription("")
    setActType("")
    setActFrequency("")
    setActStartDate("")
    setActArea("")
    setActSchedule([])
    setShowSchedule(false)
  }

  // Sampling schedule helpers
  const addScheduleItem = (period: number) => {
    setActSchedule(prev => [...prev, { period, sample: "", price: 0 }])
  }

  const updateScheduleItem = (index: number, field: keyof SamplingScheduleItem, value: string | number) => {
    setActSchedule(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const removeScheduleItem = (index: number) => {
    setActSchedule(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!actTitle || !actType || !actFrequency || !programId) return

    setSubmitting(true)
    try {
      const cleanSchedule = actSchedule.filter(s => s.sample.trim())
      const data: ProgramActivityInsert = {
        program_id: programId,
        title: actTitle,
        description: actDescription || null,
        activity_type: actType,
        frequency: actFrequency,
        start_date: actStartDate || null,
        area: actArea || null,
        sampling_schedule: cleanSchedule.length > 0 ? cleanSchedule : null,
      }

      if (editingActivity) {
        await updateActivity(editingActivity.id, data)
      } else {
        await createActivity(data)
      }

      setDialogOpen(false)
      resetForm()
      await loadActivities()
    } catch {
      // Error handled by hook
    } finally {
      setSubmitting(false)
    }
  }

  const ringColor = `focus:ring-${accentColor}-500/50`

  return (
    <>
      <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
        {/* Collapsible Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left p-5 sm:p-6 flex items-center gap-3 hover:bg-white/30 dark:hover:bg-white/5 transition-colors duration-150"
        >
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0">
            <ListChecks className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Actividades del Programa
            </h2>
          </div>
          <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] mr-2">
            {activities.length} actividad{activities.length !== 1 ? "es" : ""}
          </Badge>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0"
          >
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </motion.div>
        </button>

        {/* Expandable Content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="border-t border-gray-200/30 dark:border-white/10 px-5 sm:px-6 pb-5 sm:pb-6 pt-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 dark:text-gray-500 text-sm">No hay actividades configuradas</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity, j) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: j * 0.04 }}
                        onClick={() => openEditDialog(activity)}
                        className="bg-white/40 dark:bg-white/5 rounded-2xl p-4 border border-white/20 dark:border-white/5 hover:bg-white/60 dark:hover:bg-white/8 transition-colors duration-150 cursor-pointer group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                            <ListChecks className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {activity.title}
                              </span>
                              <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px]">
                                {getActivityTypeBadge(activity.activity_type)}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {FREQUENCIES.find(f => f.value === activity.frequency)?.label || activity.frequency}
                                {activity.start_date && (
                                  <span className="text-gray-400"> · Inicio {new Date(activity.start_date + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}</span>
                                )}
                              </span>
                              {activity.area && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {activity.area}
                                </span>
                              )}
                              {activity.form_fields && activity.form_fields.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {activity.form_fields.length} campo{activity.form_fields.length !== 1 ? "s" : ""}
                                </span>
                              )}
                              {activity.sampling_schedule && activity.sampling_schedule.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <FlaskConical className="w-3 h-3" />
                                  {activity.sampling_schedule.length} muestra{activity.sampling_schedule.length !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            {activity.description && (
                              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{activity.description}</p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 shrink-0 mt-1 transition-colors" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Add activity button */}
                <Button
                  variant="ghost"
                  onClick={openCreateDialog}
                  className="w-full rounded-2xl h-12 border-2 border-dashed border-gray-200/50 dark:border-white/10 text-gray-500 hover:text-gray-700 hover:border-gray-300/50 hover:bg-white/30 active:scale-[0.98] transition-all duration-150 mt-3"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar actividad
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Create/Edit Activity Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white/90 dark:bg-black/80 backdrop-blur-2xl border border-white/30 dark:border-white/15 rounded-3xl shadow-2xl shadow-black/20 max-w-lg mx-4 sm:mx-auto p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              {editingActivity ? "Editar Actividad" : "Nueva Actividad"}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Título</Label>
              <Input
                placeholder="Nombre de la actividad"
                value={actTitle}
                onChange={e => setActTitle(e.target.value)}
                className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</Label>
              <Textarea
                placeholder="Descripción opcional..."
                value={actDescription}
                onChange={e => setActDescription(e.target.value)}
                className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl text-base focus:ring-2 focus:ring-blue-500/50 min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</Label>
                <Select value={actType} onValueChange={setActType}>
                  <SelectTrigger className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-blue-500/50">
                    <SelectValue placeholder="Tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Frecuencia</Label>
                <Select value={actFrequency} onValueChange={setActFrequency}>
                  <SelectTrigger className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-blue-500/50">
                    <SelectValue placeholder="Frecuencia..." />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Inicio</Label>
              <Input
                type="date"
                value={actStartDate}
                onChange={e => setActStartDate(e.target.value)}
                className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-blue-500/50"
              />
              {actStartDate && actFrequency && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Próxima: {(() => {
                    const start = new Date(actStartDate + "T12:00:00")
                    const freqDays: Record<string, number> = {
                      diario: 1, semanal: 7, quincenal: 15, mensual: 30,
                      trimestral: 90, semestral: 182, anual: 365,
                    }
                    const days = freqDays[actFrequency] || 0
                    const next = new Date(start)
                    next.setDate(next.getDate() + days)
                    return next.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })
                  })()}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Área</Label>
              <Input
                placeholder="Ej: Producción, Empaque, etc."
                value={actArea}
                onChange={e => setActArea(e.target.value)}
                className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            {/* Sampling Schedule Section */}
            {actFrequency && getPeriodCount(actFrequency) > 0 && (
              <div className="space-y-3 border-t border-gray-200/30 dark:border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-indigo-500" />
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cronograma de Muestreo
                    </Label>
                    <span className="text-xs text-gray-400">({actSchedule.filter(s => s.sample.trim()).length} muestras)</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSchedule(!showSchedule)}
                    className="text-xs text-indigo-500 hover:text-indigo-600"
                  >
                    {showSchedule ? "Ocultar" : "Configurar"}
                  </Button>
                </div>

                {showSchedule && (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {(PERIOD_LABELS[actFrequency] || []).map((label, pi) => {
                      const period = pi + 1
                      const periodItems = actSchedule
                        .map((item, idx) => ({ ...item, _idx: idx }))
                        .filter(item => item.period === period)

                      return (
                        <div key={period} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {label}
                            </span>
                            <button
                              type="button"
                              onClick={() => addScheduleItem(period)}
                              className="text-[10px] text-indigo-500 hover:text-indigo-600 font-medium flex items-center gap-0.5"
                            >
                              <Plus className="w-3 h-3" /> Agregar
                            </button>
                          </div>

                          {periodItems.length === 0 ? (
                            <p className="text-[11px] text-gray-300 dark:text-gray-600 italic pl-1">Sin muestras</p>
                          ) : (
                            periodItems.map((item) => (
                              <div key={item._idx} className="flex items-center gap-2">
                                <Input
                                  placeholder="Nombre de muestra"
                                  value={item.sample}
                                  onChange={e => updateScheduleItem(item._idx, "sample", e.target.value)}
                                  className="bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 rounded-lg h-9 text-sm flex-1"
                                />
                                <Input
                                  type="number"
                                  placeholder="Precio"
                                  value={item.price || ""}
                                  onChange={e => updateScheduleItem(item._idx, "price", parseFloat(e.target.value) || 0)}
                                  className="bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 rounded-lg h-9 text-sm w-24"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeScheduleItem(item._idx)}
                                  className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              <Button
                onClick={handleSubmit}
                disabled={submitting || !actTitle || !actType || !actFrequency}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl h-12 px-8 font-semibold shadow-md shadow-blue-500/30 active:scale-95 transition-all duration-150 flex-1"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                {editingActivity ? "Actualizar" : "Crear Actividad"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setDialogOpen(false); resetForm() }}
                className="rounded-xl h-12 px-6 text-gray-500 hover:text-gray-700 active:scale-95 transition-all duration-150"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
