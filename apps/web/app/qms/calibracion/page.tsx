"use client"

import { useState, useEffect, useMemo } from "react"
import { useQMSPrograms, SanitationProgram } from "@/hooks/use-qms-programs"
import { useQMSActivities, ProgramActivity } from "@/hooks/use-qms-activities"
import { useQMSRecords, ActivityRecord } from "@/hooks/use-qms-records"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Gauge, Loader2, Building2, FileText } from "lucide-react"
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

function getCumpleBadge(value: string) {
  if (value === "Sí") return { label: "Cumple", color: "bg-green-500" }
  if (value === "No") return { label: "No Cumple", color: "bg-red-500" }
  return { label: value || "Pendiente", color: "bg-gray-400" }
}

function getResultadoBadge(value: string) {
  if (value === "Aprobado") return { label: "Aprobado", color: "bg-green-500" }
  if (value === "Rechazado") return { label: "Rechazado", color: "bg-red-500" }
  return { label: value || "Pendiente", color: "bg-gray-400" }
}

export default function CalibracionPage() {
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
    const prog = await getProgramByCode("calibracion")
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

  // Determine if current tab is a certificate activity
  const isCertificateActivity = selectedActivity?.activity_type === "certificado"

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50/30 to-orange-50/50 dark:from-gray-950 dark:via-amber-950/20 dark:to-gray-950">
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
                <Gauge className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                  Calibración
                </h1>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                  Verificación quincenal y certificación anual de termómetros, balanzas y básculas
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
                        <Gauge className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400 dark:text-gray-500 text-sm">No hay registros a{"\u00FA"}n</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(activeTab === activity.id ? filteredRecords : []).map((record, i) => {
                          const statusInfo = getRecordStatusBadge(record.status)
                          const isCert = activity.activity_type === "certificado"
                          const fields = activity.form_fields?.length
                            ? activity.form_fields
                            : Object.keys(record.values || {}).map(k => ({ name: k, type: "text" as const }))

                          // Multi-entry records store { entries: [...] }
                          const entries: Record<string, any>[] = Array.isArray(record.values?.entries)
                            ? record.values.entries
                            : [record.values || {}]
                          const isMulti = entries.length > 1

                          return (
                            <motion.div
                              key={record.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className="bg-white/40 dark:bg-white/5 rounded-2xl p-4 border border-white/20 dark:border-white/5 hover:bg-white/50 dark:hover:bg-white/8 transition-colors duration-150"
                            >
                              {/* Record date header for multi-entry */}
                              {isMulti && (
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200/30 dark:border-white/5">
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {format(new Date(record.scheduled_date), "d MMM yyyy", { locale: es })}
                                  </span>
                                  <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px] font-medium">
                                    {entries.length} equipos
                                  </Badge>
                                  <Badge variant={statusInfo.variant} className="rounded-full px-2.5 py-0.5 text-[10px] font-medium">
                                    {statusInfo.label}
                                  </Badge>
                                </div>
                              )}

                              <div className={isMulti ? "space-y-3" : ""}>
                                {entries.map((entryValues, entryIdx) => {
                                  const cumple = getCumpleBadge(entryValues?.cumple || "")
                                  const resultado = getResultadoBadge(entryValues?.resultado || "")
                                  const badge = isCert ? resultado : cumple
                                  const hasBadgeValue = isCert ? !!entryValues?.resultado : !!entryValues?.cumple

                                  return (
                                    <div key={entryIdx} className={isMulti ? "bg-white/30 dark:bg-white/[0.03] rounded-xl p-3 border border-gray-100/50 dark:border-white/5" : ""}>
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-3 mb-1">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                              {entryValues?.equipo || (!isMulti ? format(new Date(record.scheduled_date), "d MMM yyyy", { locale: es }) : `Equipo ${entryIdx + 1}`)}
                                            </span>
                                            {hasBadgeValue ? (
                                              <Badge className={`${badge.color} text-white rounded-full px-2.5 py-0.5 text-[10px] font-medium`}>
                                                {badge.label}
                                              </Badge>
                                            ) : !isMulti ? (
                                              <Badge variant={statusInfo.variant} className="rounded-full px-2.5 py-0.5 text-[10px] font-medium">
                                                {statusInfo.label}
                                              </Badge>
                                            ) : null}
                                          </div>
                                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                            {!isMulti && entryValues?.equipo && (
                                              <span>{format(new Date(record.scheduled_date), "d MMM yyyy", { locale: es })}</span>
                                            )}
                                            {entryValues?.diferencia != null && (
                                              <span>Diferencia: {entryValues.diferencia}°C</span>
                                            )}
                                            {entryValues?.variacion != null && (
                                              <span>Variación: {entryValues.variacion} kg</span>
                                            )}
                                            {entryValues?.laboratorio && (
                                              <span>Lab: {entryValues.laboratorio}</span>
                                            )}
                                            {entryValues?.numero_certificado && (
                                              <span>Cert: {entryValues.numero_certificado}</span>
                                            )}
                                            {entryValues?.masa_patron != null && (
                                              <span>Patrón: {entryValues.masa_patron} kg</span>
                                            )}
                                          </div>
                                          {/* Generic field display for certificate activities */}
                                          {isCert && !entryValues?.laboratorio && (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-2">
                                              {fields.map(f => (
                                                <div key={f.name}>
                                                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                                                    {("label" in f && f.label) || formatFieldName(f.name)}
                                                  </p>
                                                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                    {entryValues?.[f.name] != null ? String(entryValues[f.name]) : "-"}
                                                  </p>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>

                              {record.observations && (
                                <p className="text-xs text-gray-400 mt-2 italic">{record.observations}</p>
                              )}
                              {(record.record_attachments?.length || 0) > 0 && (
                                <div className="mt-3 pt-3 border-t border-white/10">
                                  <AttachmentsBadge
                                    count={record.record_attachments?.length || 0}
                                    onClick={() => setViewingAttachments(record)}
                                  />
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
          programName="Calibración"
          accentColor="amber"
        />
      )}

      {program && (
        <ProgramDocumentModal
          open={showDocument}
          onClose={() => setShowDocument(false)}
          programName="Calibración"
          accentColor="amber"
          document={program.program_document}
          onSave={handleSaveDocument}
        />
      )}
    </div>
  )
}
