"use client"

import { useState, useEffect, useMemo } from "react"
import { useQMSPrograms, SanitationProgram } from "@/hooks/use-qms-programs"
import { useQMSActivities, ProgramActivity } from "@/hooks/use-qms-activities"
import { useQMSRecords, ActivityRecord } from "@/hooks/use-qms-records"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SprayCan, Loader2, Star, Building2, FileText } from "lucide-react"
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

const CALIFICACIONES_POES = [
  { value: "conforme", label: "Conforme", color: "bg-green-500" },
  { value: "no_conforme", label: "No conforme", color: "bg-red-500" },
  { value: "accion_correctiva", label: "Acción correctiva", color: "bg-orange-500" },
]

function getPOESBadge(status: string) {
  const found = CALIFICACIONES_POES.find(c => c.value === status)
  if (!found) return { label: status || "Pendiente", color: "bg-gray-400" }
  return found
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

export default function LimpiezaPage() {
  const { getProgramByCode, updateProgram } = useQMSPrograms()
  const { getActivities } = useQMSActivities()
  const { loading: recordsLoading, getRecords } = useQMSRecords()

  const [program, setProgram] = useState<SanitationProgram | null>(null)
  const [activities, setActivities] = useState<ProgramActivity[]>([])
  const [records, setRecords] = useState<ActivityRecord[]>([])
  const [activeTab, setActiveTab] = useState("")
  const [viewingAttachments, setViewingAttachments] = useState<ActivityRecord | null>(null)
  const [showSuppliers, setShowSuppliers] = useState(false)
  const [showDocument, setShowDocument] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const prog = await getProgramByCode("limpieza_desinfeccion")
    if (prog) {
      setProgram(prog)
      const [acts, recs] = await Promise.all([
        getActivities(prog.id),
        getRecords({ programId: prog.id }),
      ])
      const sorted = [...acts].sort((a, b) => (FREQ_ORDER[a.frequency] ?? 99) - (FREQ_ORDER[b.frequency] ?? 99))
      setActivities(sorted)
      setRecords(recs)
      if (sorted.length > 0) setActiveTab(sorted[0].id)
    }
  }

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
                  Limpieza y Desinfección
                </h1>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                  Programa POES: registros diarios, limpieza profunda, evaluaciones y verificación
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
            <ProgramActivitiesSection programId={program.id} accentColor="purple" />
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
                  className="rounded-xl data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-purple-500/30 text-xs sm:text-sm font-medium h-11 transition-all duration-200 flex-1 min-w-0 px-2 sm:px-4"
                >
                  <span className="truncate">{activity.title}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {activities.map(activity => (
              <TabsContent key={activity.id} value={activity.id} className="space-y-6 mt-0">

                {/* Trend Chart */}
                {activeTab === activity.id && filteredRecords.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
                  >
                    <ActivityTrendChart
                      records={filteredRecords}
                      formFields={activity.form_fields}
                      accentColor="purple"
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
                        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                      </div>
                    ) : (activeTab === activity.id ? filteredRecords : []).length === 0 ? (
                      <div className="text-center py-12">
                        <SprayCan className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400 dark:text-gray-500 text-sm">No hay registros a{"\u00FA"}n</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(activeTab === activity.id ? filteredRecords : []).map((record, i) => {
                          const poes = getPOESBadge(record.values?.calificacion_poes || record.values?.cumple_poes || "")
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
                              className="bg-white/40 dark:bg-white/5 rounded-2xl p-4 border border-white/20 dark:border-white/5 hover:bg-white/50 dark:hover:bg-white/8 transition-colors duration-150"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-1">
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                      {record.values?.area || format(new Date(record.scheduled_date), "d MMM yyyy", { locale: es })}
                                    </span>
                                    {(record.values?.calificacion_poes || record.values?.cumple_poes) ? (
                                      <Badge className={`${poes.color} text-white rounded-full px-2.5 py-0.5 text-[10px] font-medium`}>
                                        {poes.label}
                                      </Badge>
                                    ) : (
                                      <Badge variant={statusInfo.variant} className="rounded-full px-2.5 py-0.5 text-[10px] font-medium">
                                        {statusInfo.label}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                    {record.values?.area && (
                                      <span>{format(new Date(record.scheduled_date), "d MMM yyyy", { locale: es })}</span>
                                    )}
                                    {record.values?.producto_limpieza && (
                                      <span>{record.values.producto_limpieza}</span>
                                    )}
                                    {record.values?.producto_utilizado && (
                                      <span>{record.values.producto_utilizado}</span>
                                    )}
                                    {record.values?.concentracion && (
                                      <span>{record.values.concentracion} ppm</span>
                                    )}
                                    {record.values?.turno && (
                                      <span>Turno: {record.values.turno}</span>
                                    )}
                                    {record.values?.puntaje != null && (
                                      <span className="flex items-center gap-1">
                                        <Star className="w-3 h-3" />
                                        {record.values.puntaje}/100
                                      </span>
                                    )}
                                  </div>
                                  {/* Show remaining fields generically */}
                                  {!record.values?.area && !record.values?.producto_limpieza && !record.values?.producto_utilizado && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-2">
                                      {fields.map(f => (
                                        <div key={f.name}>
                                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                                            {("label" in f && f.label) || formatFieldName(f.name)}
                                          </p>
                                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                            {record.values?.[f.name] != null ? String(record.values[f.name]) : "-"}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {record.observations && (
                                    <p className="text-xs text-gray-400 mt-1 italic">{record.observations}</p>
                                  )}
                                  {(record.record_attachments?.length || 0) > 0 && (
                                    <div className="mt-3 pt-3 border-t border-white/10">
                                      <AttachmentsBadge
                                        count={record.record_attachments?.length || 0}
                                        onClick={() => setViewingAttachments(record)}
                                      />
                                    </div>
                                  )}
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
            ))}
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
          programName="Limpieza y Desinfección"
          accentColor="purple"
        />
      )}

      {program && (
        <ProgramDocumentModal
          open={showDocument}
          onClose={() => setShowDocument(false)}
          programName="Limpieza y Desinfección"
          accentColor="purple"
          document={program.program_document}
          onSave={handleSaveDocument}
        />
      )}
    </div>
  )
}
