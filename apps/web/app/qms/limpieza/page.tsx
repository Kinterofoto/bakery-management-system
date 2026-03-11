"use client"

import { useState, useEffect } from "react"
import { useQMSPrograms, SanitationProgram } from "@/hooks/use-qms-programs"
import { useQMSActivities, ProgramActivity } from "@/hooks/use-qms-activities"
import { useQMSRecords, ActivityRecord } from "@/hooks/use-qms-records"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SprayCan, Plus, Loader2, CheckCircle2, ClipboardCheck, Sparkles, Star } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const AREAS = [
  "Producci\u00F3n",
  "Empaque",
  "Almac\u00E9n MP",
  "Almac\u00E9n PT",
  "Cuarto fr\u00EDo",
  "Ba\u00F1os",
  "Vestier",
  "Oficinas",
  "Comedor",
  "Exteriores",
]

const PRODUCTOS_LIMPIEZA = [
  "Detergente alcalino",
  "Desinfectante QAC",
  "Hipoclorito de sodio",
  "Desengrasante",
  "Jab\u00F3n l\u00EDquido",
]

const CALIFICACIONES_POES = [
  { value: "conforme", label: "Conforme", color: "bg-green-500" },
  { value: "no_conforme", label: "No conforme", color: "bg-red-500" },
  { value: "accion_correctiva", label: "Acci\u00F3n correctiva", color: "bg-orange-500" },
]

function getPOESBadge(status: string) {
  const found = CALIFICACIONES_POES.find(c => c.value === status)
  if (!found) return { label: status || "Pendiente", color: "bg-gray-400" }
  return found
}

export default function LimpiezaPage() {
  const { getProgramByCode } = useQMSPrograms()
  const { getActivities } = useQMSActivities()
  const { loading: recordsLoading, getRecords, createRecord } = useQMSRecords()

  const [program, setProgram] = useState<SanitationProgram | null>(null)
  const [activities, setActivities] = useState<ProgramActivity[]>([])
  const [records, setRecords] = useState<ActivityRecord[]>([])
  const [activeTab, setActiveTab] = useState("diario")
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Shared form state
  const [area, setArea] = useState("")
  const [producto, setProducto] = useState("")
  const [concentracion, setConcentracion] = useState("")
  const [calificacion, setCalificacion] = useState("")
  const [observations, setObservations] = useState("")

  // Deep cleaning extra
  const [descripcionProfunda, setDescripcionProfunda] = useState("")

  // Evaluation extra
  const [puntaje, setPuntaje] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const prog = await getProgramByCode("limpieza_desinfeccion")
    if (prog) {
      setProgram(prog)
      const acts = await getActivities(prog.id)
      setActivities(acts)
      const recs = await getRecords({ programId: prog.id })
      setRecords(recs)
    }
  }

  const getActivityForTab = () => {
    if (activeTab === "diario") return activities.find(a => a.activity_type === "registro_diario") || activities[0]
    if (activeTab === "profunda") return activities.find(a => a.activity_type === "limpieza_profunda") || activities[1]
    return activities.find(a => a.activity_type === "evaluacion") || activities[2]
  }

  const filteredRecords = records.filter(r => {
    if (activeTab === "diario") return r.values?.tipo === "diario" || r.program_activities?.activity_type === "registro_diario"
    if (activeTab === "profunda") return r.values?.tipo === "profunda" || r.program_activities?.activity_type === "limpieza_profunda"
    return r.values?.tipo === "evaluacion" || r.program_activities?.activity_type === "evaluacion"
  })

  const resetForm = () => {
    setArea("")
    setProducto("")
    setConcentracion("")
    setCalificacion("")
    setObservations("")
    setDescripcionProfunda("")
    setPuntaje("")
  }

  const handleSubmit = async () => {
    if (!area) return
    if (!program) return

    const activity = getActivityForTab()
    if (!activity) return

    setSubmitting(true)
    try {
      const values: Record<string, any> = {
        tipo: activeTab,
        area,
        producto_limpieza: producto || null,
        concentracion: concentracion || null,
        calificacion_poes: calificacion || null,
      }

      if (activeTab === "profunda") {
        values.descripcion = descripcionProfunda || null
      }
      if (activeTab === "evaluaciones") {
        values.puntaje = puntaje ? parseInt(puntaje) : null
      }

      await createRecord({
        activity_id: activity.id,
        program_id: program.id,
        scheduled_date: new Date().toISOString(),
        status: "completado",
        values,
        observations: observations || null,
      })
      resetForm()
      setShowForm(false)
      const recs = await getRecords({ programId: program.id })
      setRecords(recs)
    } catch {
      // Error handled by hook
    } finally {
      setSubmitting(false)
    }
  }

  const renderForm = () => (
    <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
      <CardHeader className="pb-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {activeTab === "diario" && "Registro Diario de Limpieza"}
          {activeTab === "profunda" && "Registro de Limpieza Profunda"}
          {activeTab === "evaluaciones" && "Evaluaci\u00F3n POES"}
        </h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{"\u00C1"}rea</Label>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-purple-500/50">
                <SelectValue placeholder="Seleccionar \u00E1rea..." />
              </SelectTrigger>
              <SelectContent>
                {AREAS.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Producto de limpieza</Label>
            <Select value={producto} onValueChange={setProducto}>
              <SelectTrigger className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-purple-500/50">
                <SelectValue placeholder="Seleccionar producto..." />
              </SelectTrigger>
              <SelectContent>
                {PRODUCTOS_LIMPIEZA.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Concentraci{"\u00F3"}n (ppm)</Label>
            <Input
              type="number"
              placeholder="Ej: 200"
              value={concentracion}
              onChange={e => setConcentracion(e.target.value)}
              className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Calificaci{"\u00F3"}n POES</Label>
            <Select value={calificacion} onValueChange={setCalificacion}>
              <SelectTrigger className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-purple-500/50">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {CALIFICACIONES_POES.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${c.color}`} />
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activeTab === "profunda" && (
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Descripci{"\u00F3"}n de actividad</Label>
              <Textarea
                placeholder="Detalle de la limpieza profunda realizada..."
                value={descripcionProfunda}
                onChange={e => setDescripcionProfunda(e.target.value)}
                className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl text-base focus:ring-2 focus:ring-purple-500/50 min-h-[80px]"
              />
            </div>
          )}

          {activeTab === "evaluaciones" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Puntaje (0-100)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="0 - 100"
                value={puntaje}
                onChange={e => setPuntaje(e.target.value)}
                className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          )}

          <div className="space-y-2 sm:col-span-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Observaciones</Label>
            <Textarea
              placeholder="Observaciones..."
              value={observations}
              onChange={e => setObservations(e.target.value)}
              className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl text-base focus:ring-2 focus:ring-purple-500/50 min-h-[48px]"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={submitting || !area}
            className="bg-purple-500 hover:bg-purple-600 text-white rounded-xl h-12 px-8 font-semibold shadow-md shadow-purple-500/30 active:scale-95 transition-all duration-150 flex-1 sm:flex-none"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
            Guardar
          </Button>
          <Button
            variant="ghost"
            onClick={() => { setShowForm(false); resetForm() }}
            className="rounded-xl h-12 px-6 text-gray-500 hover:text-gray-700 active:scale-95 transition-all duration-150"
          >
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const renderRecordsList = (recordsList: ActivityRecord[]) => (
    <>
      {recordsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        </div>
      ) : recordsList.length === 0 ? (
        <div className="text-center py-12">
          <SprayCan className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 dark:text-gray-500 text-sm">No hay registros a{"\u00FA"}n</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recordsList.map((record, i) => {
            const poes = getPOESBadge(record.values?.calificacion_poes || "")
            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white/40 dark:bg-white/5 rounded-2xl p-4 border border-white/20 dark:border-white/5 hover:bg-white/50 dark:hover:bg-white/8 transition-colors duration-150"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {record.values?.area || "-"}
                      </span>
                      <Badge className={`${poes.color} text-white rounded-full px-2.5 py-0.5 text-[10px] font-medium`}>
                        {poes.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>{format(new Date(record.scheduled_date), "d MMM yyyy", { locale: es })}</span>
                      {record.values?.producto_limpieza && (
                        <span>{record.values.producto_limpieza}</span>
                      )}
                      {record.values?.concentracion && (
                        <span>{record.values.concentracion} ppm</span>
                      )}
                      {record.values?.puntaje != null && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {record.values.puntaje}/100
                        </span>
                      )}
                    </div>
                    {record.observations && (
                      <p className="text-xs text-gray-400 mt-1 italic">{record.observations}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50/30 to-fuchsia-50/50 dark:from-gray-950 dark:via-purple-950/20 dark:to-gray-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-lg shadow-black/5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
                <SprayCan className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                  Limpieza y Desinfecci{"\u00F3"}n
                </h1>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                  Programa POES: registros diarios, limpieza profunda y evaluaciones
                </p>
              </div>
              <Button
                onClick={() => { setShowForm(!showForm); if (!showForm) resetForm() }}
                className="bg-purple-500 hover:bg-purple-600 text-white rounded-xl shadow-md shadow-purple-500/30 hover:shadow-lg hover:shadow-purple-500/40 active:scale-95 transition-all duration-150 h-12 px-6 font-semibold shrink-0"
              >
                <Plus className="w-5 h-5 mr-2" />
                Registrar
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setShowForm(false); resetForm() }} className="space-y-6">
          <TabsList className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl p-1.5 h-auto w-full grid grid-cols-3 gap-1">
            <TabsTrigger
              value="diario"
              className="rounded-xl data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-purple-500/30 text-sm font-medium h-11 transition-all duration-200"
            >
              <ClipboardCheck className="w-4 h-4 mr-1.5 hidden sm:block" />
              Registro Diario
            </TabsTrigger>
            <TabsTrigger
              value="profunda"
              className="rounded-xl data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-purple-500/30 text-sm font-medium h-11 transition-all duration-200"
            >
              <Sparkles className="w-4 h-4 mr-1.5 hidden sm:block" />
              L. Profunda
            </TabsTrigger>
            <TabsTrigger
              value="evaluaciones"
              className="rounded-xl data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-purple-500/30 text-sm font-medium h-11 transition-all duration-200"
            >
              <Star className="w-4 h-4 mr-1.5 hidden sm:block" />
              Evaluaciones
            </TabsTrigger>
          </TabsList>

          {["diario", "profunda", "evaluaciones"].map(tab => (
            <TabsContent key={tab} value={tab} className="space-y-6 mt-0">
              <AnimatePresence>
                {showForm && activeTab === tab && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    {renderForm()}
                  </motion.div>
                )}
              </AnimatePresence>

              <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
                <CardHeader className="pb-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {tab === "diario" && "Registros Diarios"}
                    {tab === "profunda" && "Limpiezas Profundas"}
                    {tab === "evaluaciones" && "Evaluaciones POES"}
                  </h2>
                </CardHeader>
                <CardContent>
                  {renderRecordsList(filteredRecords)}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
