"use client"

import { useState, useEffect } from "react"
import { useQMSPrograms, SanitationProgram } from "@/hooks/use-qms-programs"
import { useQMSActivities, ProgramActivity, ProgramActivityInsert } from "@/hooks/use-qms-activities"
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
  FileText,
  Plus,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Droplets,
  Recycle,
  SprayCan,
  Bug,
  Calendar,
  MapPin,
  ListChecks,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const PROGRAM_ICONS: Record<string, any> = {
  agua_potable: Droplets,
  residuos_solidos: Recycle,
  limpieza_desinfeccion: SprayCan,
  manejo_plagas: Bug,
}

const PROGRAM_COLORS: Record<string, string> = {
  agua_potable: "from-sky-400 to-blue-600",
  residuos_solidos: "from-green-400 to-emerald-600",
  limpieza_desinfeccion: "from-purple-400 to-violet-600",
  manejo_plagas: "from-amber-400 to-orange-600",
}

const PROGRAM_ACCENTS: Record<string, string> = {
  agua_potable: "blue",
  residuos_solidos: "green",
  limpieza_desinfeccion: "purple",
  manejo_plagas: "amber",
}

const FREQUENCIES = [
  { value: "diario", label: "Diario" },
  { value: "semanal", label: "Semanal" },
  { value: "quincenal", label: "Quincenal" },
  { value: "mensual", label: "Mensual" },
  { value: "trimestral", label: "Trimestral" },
  { value: "cuatrimestral", label: "Cuatrimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
]

const ACTIVITY_TYPES = [
  { value: "registro_diario", label: "Registro diario" },
  { value: "inspeccion_estacion", label: "Inspecci\u00F3n" },
  { value: "limpieza_profunda", label: "Limpieza profunda" },
  { value: "evaluacion", label: "Evaluaci\u00F3n" },
  { value: "fumigacion", label: "Fumigaci\u00F3n" },
  { value: "diagnostico", label: "Diagn\u00F3stico" },
  { value: "monitoreo", label: "Monitoreo" },
  { value: "capacitacion", label: "Capacitaci\u00F3n" },
]

function getActivityTypeBadge(type: string) {
  const found = ACTIVITY_TYPES.find(t => t.value === type)
  return found?.label || type
}

export default function ProgramasPage() {
  const { loading: programsLoading, getPrograms } = useQMSPrograms()
  const { loading: activitiesLoading, getActivities, createActivity, updateActivity } = useQMSActivities()

  const [programs, setPrograms] = useState<SanitationProgram[]>([])
  const [activitiesByProgram, setActivitiesByProgram] = useState<Record<string, ProgramActivity[]>>({})
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set())

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<ProgramActivity | null>(null)
  const [dialogProgramId, setDialogProgramId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Activity form state
  const [actTitle, setActTitle] = useState("")
  const [actDescription, setActDescription] = useState("")
  const [actType, setActType] = useState("")
  const [actFrequency, setActFrequency] = useState("")
  const [actArea, setActArea] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const progs = await getPrograms()
    setPrograms(progs)

    const allActivities = await getActivities()
    const grouped: Record<string, ProgramActivity[]> = {}
    allActivities.forEach(act => {
      if (!grouped[act.program_id]) grouped[act.program_id] = []
      grouped[act.program_id].push(act)
    })
    setActivitiesByProgram(grouped)
  }

  const toggleExpand = (id: string) => {
    setExpandedPrograms(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openCreateDialog = (programId: string) => {
    setEditingActivity(null)
    setDialogProgramId(programId)
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (activity: ProgramActivity) => {
    setEditingActivity(activity)
    setDialogProgramId(activity.program_id)
    setActTitle(activity.title)
    setActDescription(activity.description || "")
    setActType(activity.activity_type)
    setActFrequency(activity.frequency)
    setActArea(activity.area || "")
    setDialogOpen(true)
  }

  const resetForm = () => {
    setActTitle("")
    setActDescription("")
    setActType("")
    setActFrequency("")
    setActArea("")
  }

  const handleSubmit = async () => {
    if (!actTitle || !actType || !actFrequency || !dialogProgramId) return

    setSubmitting(true)
    try {
      const data: ProgramActivityInsert = {
        program_id: dialogProgramId,
        title: actTitle,
        description: actDescription || null,
        activity_type: actType,
        frequency: actFrequency,
        area: actArea || null,
      }

      if (editingActivity) {
        await updateActivity(editingActivity.id, data)
      } else {
        await createActivity(data)
      }

      setDialogOpen(false)
      resetForm()
      await loadData()
    } catch {
      // Error handled by hook
    } finally {
      setSubmitting(false)
    }
  }

  const loading = programsLoading || activitiesLoading

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50/30 to-zinc-50/50 dark:from-gray-950 dark:via-gray-950/50 dark:to-gray-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-lg shadow-black/5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-400 to-gray-600 flex items-center justify-center shadow-lg shadow-gray-500/30 shrink-0">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                  Gesti{"\u00F3"}n de Programas
                </h1>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                  Programas sanitarios y sus actividades configuradas
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Programs List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : programs.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 dark:text-gray-500">No hay programas configurados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {programs.map((program, i) => {
              const isExpanded = expandedPrograms.has(program.id)
              const activities = activitiesByProgram[program.id] || []
              const ProgramIcon = PROGRAM_ICONS[program.code] || FileText
              const gradient = PROGRAM_COLORS[program.code] || "from-gray-400 to-gray-600"

              return (
                <motion.div
                  key={program.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30, delay: i * 0.05 }}
                >
                  <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
                    {/* Program Header - Clickable */}
                    <button
                      onClick={() => toggleExpand(program.id)}
                      className="w-full text-left p-5 sm:p-6 flex items-center gap-4 hover:bg-white/30 dark:hover:bg-white/5 transition-colors duration-150 min-h-[72px]"
                    >
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md shrink-0`}>
                        <ProgramIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                          {program.name}
                        </h2>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {program.description || "Sin descripci\u00F3n"}
                          </span>
                          <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">
                            {activities.length} actividad{activities.length !== 1 ? "es" : ""}
                          </Badge>
                          <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">
                            <Calendar className="w-2.5 h-2.5 mr-1" />
                            {FREQUENCIES.find(f => f.value === program.frequency)?.label || program.frequency}
                          </Badge>
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="shrink-0"
                      >
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      </motion.div>
                    </button>

                    {/* Expanded Activities */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-gray-200/30 dark:border-white/10 px-5 sm:px-6 pb-5 sm:pb-6 pt-4 space-y-3">
                            {activities.length === 0 ? (
                              <p className="text-sm text-gray-400 text-center py-6">
                                No hay actividades configuradas
                              </p>
                            ) : (
                              activities.map((activity, j) => (
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
                                      </div>
                                      {activity.description && (
                                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{activity.description}</p>
                                      )}
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 shrink-0 mt-1 transition-colors" />
                                  </div>
                                </motion.div>
                              ))
                            )}

                            {/* Add activity button */}
                            <Button
                              variant="ghost"
                              onClick={() => openCreateDialog(program.id)}
                              className="w-full rounded-2xl h-12 border-2 border-dashed border-gray-200/50 dark:border-white/10 text-gray-500 hover:text-gray-700 hover:border-gray-300/50 hover:bg-white/30 active:scale-[0.98] transition-all duration-150"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Agregar actividad
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}

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
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">T{"\u00ED"}tulo</Label>
                <Input
                  placeholder="Nombre de la actividad"
                  value={actTitle}
                  onChange={e => setActTitle(e.target.value)}
                  className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Descripci{"\u00F3"}n</Label>
                <Textarea
                  placeholder="Descripci\u00F3n opcional..."
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
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{"\u00C1"}rea</Label>
                <Input
                  placeholder="Ej: Producci\u00F3n, Empaque, etc."
                  value={actArea}
                  onChange={e => setActArea(e.target.value)}
                  className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

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
      </div>
    </div>
  )
}
