"use client"

import { useState, useEffect, useMemo } from "react"
import { useQMSPrograms, SanitationProgram } from "@/hooks/use-qms-programs"
import { useQMSActivities, ProgramActivity } from "@/hooks/use-qms-activities"
import { useQMSRecords, ActivityRecord } from "@/hooks/use-qms-records"
import { useQMSCorrectiveActions, CorrectiveAction } from "@/hooks/use-qms-corrective-actions"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bug, Loader2, MapPin, Building2, FileText, AlertTriangle } from "lucide-react"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ProgramActivitiesSection } from "@/components/qms/ProgramActivitiesSection"
import { ActivityTrendChart } from "@/components/qms/ActivityTrendChart"
import { RecordAttachmentsModal, AttachmentsBadge } from "@/components/qms/RecordAttachmentsModal"
import { ProgramSuppliersModal } from "@/components/qms/ProgramSuppliersModal"
import { ProgramDocumentModal } from "@/components/qms/ProgramDocumentModal"

const FREQ_ORDER: Record<string, number> = {
  diario: 0, semanal: 1, quincenal: 2, mensual: 3,
  trimestral: 4, semestral: 5, anual: 6,
}

const TIPOS_ESTACION = [
  { value: "cebo", label: "Estación de cebo" },
  { value: "trampa_mecanica", label: "Trampa mecánica" },
  { value: "trampa_adhesiva", label: "Trampa adhesiva" },
  { value: "insectocutor", label: "Insectocutor" },
  { value: "cortina_aire", label: "Cortina de aire" },
]

const ESTADOS_ESTACION = [
  { value: "sin_actividad", label: "Sin actividad", color: "bg-green-500" },
  { value: "actividad_baja", label: "Actividad baja", color: "bg-yellow-500" },
  { value: "actividad_alta", label: "Actividad alta", color: "bg-red-500" },
  { value: "requiere_atencion", label: "Requiere atención", color: "bg-orange-500" },
  { value: "fuera_servicio", label: "Fuera de servicio", color: "bg-gray-500" },
]

function getStationStatusInfo(status: string) {
  return ESTADOS_ESTACION.find(e => e.value === status) || { value: status, label: status, color: "bg-gray-400" }
}

function formatFieldName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
}

function getRecordStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    completado: { label: "Completado", variant: "default" },
    pendiente: { label: "Pendiente", variant: "secondary" },
    vencido: { label: "Vencido", variant: "destructive" },
    en_progreso: { label: "En progreso", variant: "secondary" },
    no_aplica: { label: "N/A", variant: "outline" },
  }
  return map[status] || { label: status || "Pendiente", variant: "secondary" as const }
}

export default function PlagasPage() {
  const { getProgramByCode, updateProgram } = useQMSPrograms()
  const { getActivities } = useQMSActivities()
  const { loading: recordsLoading, getRecords } = useQMSRecords()
  const { getCorrectiveActions } = useQMSCorrectiveActions()

  const [program, setProgram] = useState<SanitationProgram | null>(null)
  const [activities, setActivities] = useState<ProgramActivity[]>([])
  const [records, setRecords] = useState<ActivityRecord[]>([])
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([])
  const [activeTab, setActiveTab] = useState("")
  const [viewingAttachments, setViewingAttachments] = useState<ActivityRecord | null>(null)
  const [showSuppliers, setShowSuppliers] = useState(false)
  const [showDocument, setShowDocument] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const prog = await getProgramByCode("manejo_plagas")
    if (prog) {
      setProgram(prog)
      const [acts, recs, cas] = await Promise.all([
        getActivities(prog.id),
        getRecords({ programId: prog.id }),
        getCorrectiveActions({ programId: prog.id }),
      ])
      const sorted = [...acts].sort((a, b) => (FREQ_ORDER[a.frequency] ?? 99) - (FREQ_ORDER[b.frequency] ?? 99))
      setActivities(sorted)
      setRecords(recs)
      setCorrectiveActions(cas)
      if (sorted.length > 0) setActiveTab(sorted[0].id)
    }
  }

  const caByRecord = useMemo(() => {
    const map: Record<string, CorrectiveAction[]> = {}
    correctiveActions.forEach(ca => {
      if (ca.record_id) {
        if (!map[ca.record_id]) map[ca.record_id] = []
        map[ca.record_id].push(ca)
      }
    })
    return map
  }, [correctiveActions])

  const handleSaveDocument = async (content: string) => {
    if (!program) return
    await updateProgram(program.id, { program_document: content })
    setProgram(prev => prev ? { ...prev, program_document: content } : prev)
  }

  const selectedActivity = activities.find(a => a.id === activeTab)
  const filteredRecords = useMemo(
    () => records.filter(r => r.activity_id === activeTab),
    [records, activeTab]
  )

  // Check if this is the station inspection activity
  const isStationInspection = selectedActivity?.form_fields?.some(f => f.name === "estacion_num")

  // Station grid data for inspection tab
  const stationGrid = useMemo(() => {
    if (!isStationInspection) return []

    const latestByStation: Record<string, ActivityRecord> = {}
    filteredRecords.forEach(r => {
      const num = r.values?.estacion_num || ""
      if (!latestByStation[num] || new Date(r.scheduled_date) > new Date(latestByStation[num].scheduled_date)) {
        latestByStation[num] = r
      }
    })

    return Object.entries(latestByStation)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
  }, [filteredRecords, isStationInspection])

  // Check if this is the fumigation activity
  const isFumigacion = selectedActivity?.activity_type === "fumigacion"

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
                  Inspecciones de estaciones, fumigaciones y diagnósticos sanitarios
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

        {/* Activities Section */}
        {program && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.05 }}
          >
            <ProgramActivitiesSection programId={program.id} accentColor="amber" />
          </motion.div>
        )}

        {/* Tabs */}
        {activities.length > 0 && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl p-1.5 h-auto w-full flex gap-1 overflow-x-auto">
              {activities.map(activity => (
                <TabsTrigger
                  key={activity.id}
                  value={activity.id}
                  title={activity.title}
                  className="rounded-xl data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/30 text-xs sm:text-sm font-medium h-11 transition-all duration-200 flex-1 min-w-0 px-2 sm:px-4"
                >
                  <span className="truncate">{activity.title}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {activities.map(activity => {
              const tabIsStation = activity.form_fields?.some(f => f.name === "estacion_num")
              const tabIsFumigacion = activity.activity_type === "fumigacion"

              return (
                <TabsContent key={activity.id} value={activity.id} className="space-y-6 mt-0">

                  {/* Station Grid Map - only for station inspection activity */}
                  {tabIsStation && activeTab === activity.id && stationGrid.length > 0 && (
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

                  {/* Trend Chart - for non-station tabs */}
                  {!tabIsStation && activeTab === activity.id && filteredRecords.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
                    >
                      <ActivityTrendChart
                        records={filteredRecords}
                        formFields={activity.form_fields}
                        accentColor="amber"
                      />
                    </motion.div>
                  )}

                  {/* Records */}
                  <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
                    <CardHeader className="pb-2">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Historial de Registros
                      </h2>
                    </CardHeader>
                    <CardContent>
                      {recordsLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                        </div>
                      ) : (activeTab === activity.id ? filteredRecords : []).length === 0 ? (
                        <div className="text-center py-12">
                          <Bug className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-400 dark:text-gray-500 text-sm">No hay registros a{"\u00FA"}n</p>
                        </div>
                      ) : tabIsStation ? (
                        /* Station inspection records */
                        <div className="space-y-3">
                          {(activeTab === activity.id ? filteredRecords : []).map((record, i) => {
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
                                        Estación {record.values?.estacion_num}
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
                                    {record.observations && (
                                      <p className="text-xs text-gray-400 mt-1 italic">{record.observations}</p>
                                    )}
                                    {((caByRecord[record.id]?.length || 0) > 0 || (record.record_attachments?.length || 0) > 0) && (
                                      <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-3">
                                        {(caByRecord[record.id]?.length || 0) > 0 && (
                                          <Badge className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full px-2.5 py-0.5 text-[10px] font-medium gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            {caByRecord[record.id].length} AC
                                          </Badge>
                                        )}
                                        {(record.record_attachments?.length || 0) > 0 && (
                                          <AttachmentsBadge
                                            count={record.record_attachments?.length || 0}
                                            onClick={() => setViewingAttachments(record)}
                                          />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      ) : tabIsFumigacion ? (
                        /* Fumigation records */
                        <div className="space-y-3">
                          {(activeTab === activity.id ? filteredRecords : []).map((record, i) => (
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
                                    {record.values?.certificado_num && (
                                      <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px]">
                                        Cert. {record.values.certificado_num}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    <span>{format(new Date(record.scheduled_date), "d MMM yyyy", { locale: es })}</span>
                                    {record.values?.producto && <span>{record.values.producto}</span>}
                                    {record.values?.productos_aplicados && <span>{record.values.productos_aplicados}</span>}
                                    {record.values?.tipo_servicio && <span>{record.values.tipo_servicio}</span>}
                                    {record.values?.area && <span>{record.values.area}</span>}
                                    {record.values?.tecnico && <span>Téc: {record.values.tecnico}</span>}
                                  </div>
                                  {record.observations && (
                                    <p className="text-xs text-gray-400 mt-1 italic">{record.observations}</p>
                                  )}
                                  {((caByRecord[record.id]?.length || 0) > 0 || (record.record_attachments?.length || 0) > 0) && (
                                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-3">
                                      {(caByRecord[record.id]?.length || 0) > 0 && (
                                        <Badge className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full px-2.5 py-0.5 text-[10px] font-medium gap-1">
                                          <AlertTriangle className="w-3 h-3" />
                                          {caByRecord[record.id].length} AC
                                        </Badge>
                                      )}
                                      {(record.record_attachments?.length || 0) > 0 && (
                                        <AttachmentsBadge
                                          count={record.record_attachments?.length || 0}
                                          onClick={() => setViewingAttachments(record)}
                                        />
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        /* Generic records (diagnostics, etc.) */
                        <div className="space-y-3">
                          {(activeTab === activity.id ? filteredRecords : []).map((record, i) => {
                            const statusInfo = getRecordStatusBadge(record.status)
                            const fields = activity.form_fields?.length
                              ? activity.form_fields
                              : Object.keys(record.values || {}).map(k => ({ name: k, type: "text" as const }))
                            return (
                              <motion.div
                                key={record.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="bg-white/40 dark:bg-white/5 rounded-2xl p-4 border border-white/20 dark:border-white/5 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {record.values?.tipo_diagnostico || format(new Date(record.scheduled_date), "d MMM yyyy", { locale: es })}
                                  </span>
                                  <Badge variant={statusInfo.variant} className="rounded-full px-2.5 py-0.5 text-[10px]">
                                    {statusInfo.label}
                                  </Badge>
                                </div>
                                {record.values?.tipo_diagnostico && (
                                  <span className="text-xs text-gray-400">
                                    {format(new Date(record.scheduled_date), "d MMM yyyy", { locale: es })}
                                  </span>
                                )}
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
                                {!record.values?.hallazgos && !record.values?.recomendaciones && !record.values?.tipo_diagnostico && (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                                    {fields.map(f => (
                                      <div key={f.name}>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                                          {("label" in f && f.label) || formatFieldName(f.name)}
                                        </p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                          {record.values?.[f.name] != null ? String(record.values[f.name]) : "-"}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {record.observations && (
                                  <p className="text-xs text-gray-400 italic">{record.observations}</p>
                                )}
                                {((caByRecord[record.id]?.length || 0) > 0 || (record.record_attachments?.length || 0) > 0) && (
                                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-3">
                                    {(caByRecord[record.id]?.length || 0) > 0 && (
                                      <Badge className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full px-2.5 py-0.5 text-[10px] font-medium gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        {caByRecord[record.id].length} AC
                                      </Badge>
                                    )}
                                    {(record.record_attachments?.length || 0) > 0 && (
                                      <AttachmentsBadge
                                        count={record.record_attachments?.length || 0}
                                        onClick={() => setViewingAttachments(record)}
                                      />
                                    )}
                                  </div>
                                )}
                              </motion.div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )
            })}
          </Tabs>
        )}
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
          programName="Manejo Integral de Plagas"
          accentColor="orange"
        />
      )}

      {program && (
        <ProgramDocumentModal
          open={showDocument}
          onClose={() => setShowDocument(false)}
          programName="Manejo Integral de Plagas"
          accentColor="orange"
          document={program.program_document}
          onSave={handleSaveDocument}
        />
      )}
    </div>
  )
}
