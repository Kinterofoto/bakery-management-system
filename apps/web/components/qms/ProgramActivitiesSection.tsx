"use client"

import { useState, useEffect } from "react"
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
  Plus,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Calendar,
  MapPin,
  ListChecks,
  FileText,
} from "lucide-react"
import { motion } from "framer-motion"

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

interface ProgramActivitiesSectionProps {
  programId: string
  accentColor?: string // e.g. "blue", "green", "purple", "amber"
}

export function ProgramActivitiesSection({ programId, accentColor = "blue" }: ProgramActivitiesSectionProps) {
  const { loading, getActivities, createActivity, updateActivity } = useQMSActivities()

  const [activities, setActivities] = useState<ProgramActivity[]>([])

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<ProgramActivity | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Activity form state
  const [actTitle, setActTitle] = useState("")
  const [actDescription, setActDescription] = useState("")
  const [actType, setActType] = useState("")
  const [actFrequency, setActFrequency] = useState("")
  const [actArea, setActArea] = useState("")

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
    if (!actTitle || !actType || !actFrequency || !programId) return

    setSubmitting(true)
    try {
      const data: ProgramActivityInsert = {
        program_id: programId,
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
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Actividades del Programa
              </h2>
              <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">
                {activities.length}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
        </CardContent>
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
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Área</Label>
              <Input
                placeholder="Ej: Producción, Empaque, etc."
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
    </>
  )
}
