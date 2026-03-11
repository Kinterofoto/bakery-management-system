"use client"

import { useState, useEffect, useMemo } from "react"
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
import { Bug, Plus, Loader2, CheckCircle2, MapPin, Shield, FileSearch, AlertTriangle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const TIPOS_ESTACION = [
  { value: "cebo", label: "Estaci\u00F3n de cebo" },
  { value: "trampa_mecanica", label: "Trampa mec\u00E1nica" },
  { value: "trampa_adhesiva", label: "Trampa adhesiva" },
  { value: "insectocutor", label: "Insectocutor" },
  { value: "cortina_aire", label: "Cortina de aire" },
]

const ESTADOS_ESTACION = [
  { value: "sin_actividad", label: "Sin actividad", color: "bg-green-500" },
  { value: "actividad_baja", label: "Actividad baja", color: "bg-yellow-500" },
  { value: "actividad_alta", label: "Actividad alta", color: "bg-red-500" },
  { value: "requiere_atencion", label: "Requiere atenci\u00F3n", color: "bg-orange-500" },
  { value: "fuera_servicio", label: "Fuera de servicio", color: "bg-gray-500" },
]

const TIPOS_PLAGA = [
  "Roedores",
  "Insectos rastreros",
  "Insectos voladores",
  "Aves",
  "Otros",
]

function getStationStatusInfo(status: string) {
  return ESTADOS_ESTACION.find(e => e.value === status) || { value: status, label: status, color: "bg-gray-400" }
}

export default function PlagasPage() {
  const { getProgramByCode } = useQMSPrograms()
  const { getActivities } = useQMSActivities()
  const { loading: recordsLoading, getRecords, createRecord } = useQMSRecords()

  const [program, setProgram] = useState<SanitationProgram | null>(null)
  const [activities, setActivities] = useState<ProgramActivity[]>([])
  const [records, setRecords] = useState<ActivityRecord[]>([])
  const [activeTab, setActiveTab] = useState("estaciones")
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Station form
  const [estacionNum, setEstacionNum] = useState("")
  const [tipoEstacion, setTipoEstacion] = useState("")
  const [estadoEstacion, setEstadoEstacion] = useState("")
  const [tipoPlaga, setTipoPlaga] = useState("")
  const [observationsEst, setObservationsEst] = useState("")

  // Fumigation form
  const [empresa, setEmpresa] = useState("")
  const [productoFum, setProductoFum] = useState("")
  const [numCertificado, setNumCertificado] = useState("")
  const [areaFum, setAreaFum] = useState("")
  const [observationsFum, setObservationsFum] = useState("")

  // Diagnostic form
  const [diagnosticoTipo, setDiagnosticoTipo] = useState("")
  const [hallazgos, setHallazgos] = useState("")
  const [recomendaciones, setRecomendaciones] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const prog = await getProgramByCode("manejo_plagas")
    if (prog) {
      setProgram(prog)
      const acts = await getActivities(prog.id)
      setActivities(acts)
      const recs = await getRecords({ programId: prog.id })
      setRecords(recs)
    }
  }

  const getActivityForTab = () => {
    if (activeTab === "estaciones") return activities.find(a => a.activity_type === "inspeccion_estacion") || activities[0]
    if (activeTab === "fumigaciones") return activities.find(a => a.activity_type === "fumigacion") || activities[1]
    return activities.find(a => a.activity_type === "diagnostico") || activities[2]
  }

  const filteredRecords = records.filter(r => {
    if (activeTab === "estaciones") return r.values?.tipo === "estacion" || r.program_activities?.activity_type === "inspeccion_estacion"
    if (activeTab === "fumigaciones") return r.values?.tipo === "fumigacion" || r.program_activities?.activity_type === "fumigacion"
    return r.values?.tipo === "diagnostico" || r.program_activities?.activity_type === "diagnostico"
  })

  // Station grid data
  const stationGrid = useMemo(() => {
    const stationRecords = records
      .filter(r => r.values?.tipo === "estacion" || r.program_activities?.activity_type === "inspeccion_estacion")

    const latestByStation: Record<string, ActivityRecord> = {}
    stationRecords.forEach(r => {
      const num = r.values?.estacion_num || ""
      if (!latestByStation[num] || new Date(r.scheduled_date) > new Date(latestByStation[num].scheduled_date)) {
        latestByStation[num] = r
      }
    })

    return Object.entries(latestByStation)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
  }, [records])

  const resetForm = () => {
    setEstacionNum(""); setTipoEstacion(""); setEstadoEstacion(""); setTipoPlaga(""); setObservationsEst("")
    setEmpresa(""); setProductoFum(""); setNumCertificado(""); setAreaFum(""); setObservationsFum("")
    setDiagnosticoTipo(""); setHallazgos(""); setRecomendaciones("")
  }

  const handleSubmit = async () => {
    if (!program) return
    const activity = getActivityForTab()
    if (!activity) return

    setSubmitting(true)
    try {
      let values: Record<string, any> = { tipo: activeTab === "estaciones" ? "estacion" : activeTab === "fumigaciones" ? "fumigacion" : "diagnostico" }

      if (activeTab === "estaciones") {
        if (!estacionNum || !tipoEstacion || !estadoEstacion) return
        values = { ...values, estacion_num: estacionNum, tipo_estacion: tipoEstacion, estado: estadoEstacion, tipo_plaga: tipoPlaga || null }
      } else if (activeTab === "fumigaciones") {
        if (!empresa || !productoFum) return
        values = { ...values, empresa, producto: productoFum, num_certificado: numCertificado || null, area: areaFum || null }
      } else {
        if (!diagnosticoTipo) return
        values = { ...values, tipo_diagnostico: diagnosticoTipo, hallazgos: hallazgos || null, recomendaciones: recomendaciones || null }
      }

      const obs = activeTab === "estaciones" ? observationsEst : activeTab === "fumigaciones" ? observationsFum : null

      await createRecord({
        activity_id: activity.id,
        program_id: program.id,
        scheduled_date: new Date().toISOString(),
        status: "completado",
        values,
        observations: obs,
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

  const renderStationForm = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">N{"\u00BA"} Estaci{"\u00F3"}n</Label>
        <Input
          type="number"
          min="1"
          placeholder="Ej: 1"
          value={estacionNum}
          onChange={e => setEstacionNum(e.target.value)}
          className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-amber-500/50"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de estaci{"\u00F3"}n</Label>
        <Select value={tipoEstacion} onValueChange={setTipoEstacion}>
          <SelectTrigger className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-amber-500/50">
            <SelectValue placeholder="Seleccionar tipo..." />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_ESTACION.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado</Label>
        <Select value={estadoEstacion} onValueChange={setEstadoEstacion}>
          <SelectTrigger className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-amber-500/50">
            <SelectValue placeholder="Seleccionar estado..." />
          </SelectTrigger>
          <SelectContent>
            {ESTADOS_ESTACION.map(e => (
              <SelectItem key={e.value} value={e.value}>
                <span className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${e.color}`} />
                  {e.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de plaga</Label>
        <Select value={tipoPlaga} onValueChange={setTipoPlaga}>
          <SelectTrigger className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-amber-500/50">
            <SelectValue placeholder="Opcional..." />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_PLAGA.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Observaciones</Label>
        <Textarea
          placeholder="Observaciones de la inspecci\u00F3n..."
          value={observationsEst}
          onChange={e => setObservationsEst(e.target.value)}
          className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl text-base focus:ring-2 focus:ring-amber-500/50 min-h-[48px]"
        />
      </div>
    </div>
  )

  const renderFumigationForm = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Empresa</Label>
        <Input
          placeholder="Nombre de empresa"
          value={empresa}
          onChange={e => setEmpresa(e.target.value)}
          className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-amber-500/50"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Producto aplicado</Label>
        <Input
          placeholder="Producto"
          value={productoFum}
          onChange={e => setProductoFum(e.target.value)}
          className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-amber-500/50"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">N{"\u00BA"} Certificado</Label>
        <Input
          placeholder="Opcional"
          value={numCertificado}
          onChange={e => setNumCertificado(e.target.value)}
          className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-amber-500/50"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{"\u00C1"}rea tratada</Label>
        <Input
          placeholder="Ej: Toda la planta"
          value={areaFum}
          onChange={e => setAreaFum(e.target.value)}
          className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-amber-500/50"
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Observaciones</Label>
        <Textarea
          placeholder="Observaciones..."
          value={observationsFum}
          onChange={e => setObservationsFum(e.target.value)}
          className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl text-base focus:ring-2 focus:ring-amber-500/50 min-h-[48px]"
        />
      </div>
    </div>
  )

  const renderDiagnosticForm = () => (
    <div className="grid grid-cols-1 gap-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de diagn{"\u00F3"}stico</Label>
        <Select value={diagnosticoTipo} onValueChange={setDiagnosticoTipo}>
          <SelectTrigger className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-amber-500/50">
            <SelectValue placeholder="Seleccionar tipo..." />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_PLAGA.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hallazgos</Label>
        <Textarea
          placeholder="Describa los hallazgos..."
          value={hallazgos}
          onChange={e => setHallazgos(e.target.value)}
          className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl text-base focus:ring-2 focus:ring-amber-500/50 min-h-[80px]"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Recomendaciones</Label>
        <Textarea
          placeholder="Recomendaciones..."
          value={recomendaciones}
          onChange={e => setRecomendaciones(e.target.value)}
          className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl text-base focus:ring-2 focus:ring-amber-500/50 min-h-[80px]"
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-yellow-50/50 dark:from-gray-950 dark:via-amber-950/20 dark:to-gray-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-lg shadow-black/5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
                <Bug className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                  Manejo Integral de Plagas
                </h1>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                  Inspecciones de estaciones, fumigaciones y diagn{"\u00F3"}sticos sanitarios
                </p>
              </div>
              <Button
                onClick={() => { setShowForm(!showForm); if (!showForm) resetForm() }}
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md shadow-amber-500/30 hover:shadow-lg hover:shadow-amber-500/40 active:scale-95 transition-all duration-150 h-12 px-6 font-semibold shrink-0"
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
              value="estaciones"
              className="rounded-xl data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/30 text-sm font-medium h-11 transition-all duration-200"
            >
              <MapPin className="w-4 h-4 mr-1.5 hidden sm:block" />
              Estaciones
            </TabsTrigger>
            <TabsTrigger
              value="fumigaciones"
              className="rounded-xl data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/30 text-sm font-medium h-11 transition-all duration-200"
            >
              <Shield className="w-4 h-4 mr-1.5 hidden sm:block" />
              Fumigaciones
            </TabsTrigger>
            <TabsTrigger
              value="diagnosticos"
              className="rounded-xl data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/30 text-sm font-medium h-11 transition-all duration-200"
            >
              <FileSearch className="w-4 h-4 mr-1.5 hidden sm:block" />
              Diagn{"\u00F3"}sticos
            </TabsTrigger>
          </TabsList>

          {/* Estaciones tab */}
          <TabsContent value="estaciones" className="space-y-6 mt-0">
            <AnimatePresence>
              {showForm && activeTab === "estaciones" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
                    <CardHeader className="pb-2">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Inspecci{"\u00F3"}n de Estaci{"\u00F3"}n</h2>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {renderStationForm()}
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button onClick={handleSubmit} disabled={submitting || !estacionNum || !tipoEstacion || !estadoEstacion}
                          className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-12 px-8 font-semibold shadow-md shadow-amber-500/30 active:scale-95 transition-all duration-150 flex-1 sm:flex-none">
                          {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                          Guardar
                        </Button>
                        <Button variant="ghost" onClick={() => { setShowForm(false); resetForm() }}
                          className="rounded-xl h-12 px-6 text-gray-500 hover:text-gray-700 active:scale-95 transition-all duration-150">
                          Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Station Grid Map */}
            {stationGrid.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
              >
                <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-amber-500" />
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mapa de Estaciones</h2>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 sm:gap-3">
                      {stationGrid.map(([num, record], i) => {
                        const statusInfo = getStationStatusInfo(record.values?.estado || "")
                        return (
                          <motion.div
                            key={num}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.03 }}
                            className="flex flex-col items-center gap-1"
                            title={`Est. ${num}: ${statusInfo.label}`}
                          >
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${statusInfo.color} flex items-center justify-center shadow-sm cursor-default`}>
                              <span className="text-white text-xs sm:text-sm font-bold">{num}</span>
                            </div>
                            <span className="text-[9px] text-gray-400 text-center leading-tight truncate max-w-full">
                              {statusInfo.label.split(" ").slice(0, 2).join(" ")}
                            </span>
                          </motion.div>
                        )
                      })}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-200/30 dark:border-white/10">
                      {ESTADOS_ESTACION.map(e => (
                        <div key={e.value} className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${e.color}`} />
                          <span className="text-[10px] sm:text-xs text-gray-500">{e.label}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Station Records */}
            <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
              <CardHeader className="pb-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Historial de Inspecciones</h2>
              </CardHeader>
              <CardContent>
                {recordsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <Bug className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 dark:text-gray-500 text-sm">No hay registros a{"\u00FA"}n</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRecords.map((record, i) => {
                      const statusInfo = getStationStatusInfo(record.values?.estado || "")
                      return (
                        <motion.div
                          key={record.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="bg-white/40 dark:bg-white/5 rounded-2xl p-4 border border-white/20 dark:border-white/5 hover:bg-white/50 dark:hover:bg-white/8 transition-colors duration-150"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl ${statusInfo.color} flex items-center justify-center shadow-sm shrink-0`}>
                              <span className="text-white text-xs font-bold">{record.values?.estacion_num || "?"}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                  Estaci{"\u00F3"}n {record.values?.estacion_num}
                                </span>
                                <Badge className={`${statusInfo.color} text-white rounded-full px-2.5 py-0.5 text-[10px]`}>
                                  {statusInfo.label}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                <span>{format(new Date(record.scheduled_date), "d MMM yyyy", { locale: es })}</span>
                                {record.values?.tipo_estacion && (
                                  <span>{TIPOS_ESTACION.find(t => t.value === record.values?.tipo_estacion)?.label || record.values.tipo_estacion}</span>
                                )}
                                {record.values?.tipo_plaga && <span>{record.values.tipo_plaga}</span>}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fumigaciones tab */}
          <TabsContent value="fumigaciones" className="space-y-6 mt-0">
            <AnimatePresence>
              {showForm && activeTab === "fumigaciones" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
                    <CardHeader className="pb-2">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Registro de Fumigaci{"\u00F3"}n</h2>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {renderFumigationForm()}
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button onClick={handleSubmit} disabled={submitting || !empresa || !productoFum}
                          className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-12 px-8 font-semibold shadow-md shadow-amber-500/30 active:scale-95 transition-all duration-150 flex-1 sm:flex-none">
                          {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                          Guardar
                        </Button>
                        <Button variant="ghost" onClick={() => { setShowForm(false); resetForm() }}
                          className="rounded-xl h-12 px-6 text-gray-500 hover:text-gray-700 active:scale-95 transition-all duration-150">
                          Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
              <CardHeader className="pb-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Historial de Fumigaciones</h2>
              </CardHeader>
              <CardContent>
                {recordsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 dark:text-gray-500 text-sm">No hay registros a{"\u00FA"}n</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRecords.map((record, i) => (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="bg-white/40 dark:bg-white/5 rounded-2xl p-4 border border-white/20 dark:border-white/5 hover:bg-white/50 dark:hover:bg-white/8 transition-colors duration-150"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {record.values?.empresa || "-"}
                              </span>
                              {record.values?.num_certificado && (
                                <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px]">
                                  Cert. {record.values.num_certificado}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              <span>{format(new Date(record.scheduled_date), "d MMM yyyy", { locale: es })}</span>
                              <span>{record.values?.producto || "-"}</span>
                              {record.values?.area && <span>{record.values.area}</span>}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Diagnosticos tab */}
          <TabsContent value="diagnosticos" className="space-y-6 mt-0">
            <AnimatePresence>
              {showForm && activeTab === "diagnosticos" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
                    <CardHeader className="pb-2">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Nuevo Diagn{"\u00F3"}stico</h2>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {renderDiagnosticForm()}
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button onClick={handleSubmit} disabled={submitting || !diagnosticoTipo}
                          className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-12 px-8 font-semibold shadow-md shadow-amber-500/30 active:scale-95 transition-all duration-150 flex-1 sm:flex-none">
                          {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                          Guardar
                        </Button>
                        <Button variant="ghost" onClick={() => { setShowForm(false); resetForm() }}
                          className="rounded-xl h-12 px-6 text-gray-500 hover:text-gray-700 active:scale-95 transition-all duration-150">
                          Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
              <CardHeader className="pb-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Historial de Diagn{"\u00F3"}sticos</h2>
              </CardHeader>
              <CardContent>
                {recordsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <FileSearch className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 dark:text-gray-500 text-sm">No hay diagn{"\u00F3"}sticos a{"\u00FA"}n</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRecords.map((record, i) => (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="bg-white/40 dark:bg-white/5 rounded-2xl p-4 border border-white/20 dark:border-white/5 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {record.values?.tipo_diagnostico || "-"}
                          </span>
                          <span className="text-xs text-gray-400">
                            {format(new Date(record.scheduled_date), "d MMM yyyy", { locale: es })}
                          </span>
                        </div>
                        {record.values?.hallazgos && (
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Hallazgos</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300">{record.values.hallazgos}</p>
                          </div>
                        )}
                        {record.values?.recomendaciones && (
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Recomendaciones</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300">{record.values.recomendaciones}</p>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
