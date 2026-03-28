"use client"

import { useState, useEffect, useMemo } from "react"
import { useQMSPrograms, SanitationProgram } from "@/hooks/use-qms-programs"
import { useQMSActivities, ProgramActivity } from "@/hooks/use-qms-activities"
import { useQMSRecords, ActivityRecord } from "@/hooks/use-qms-records"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Droplets, Loader2, CheckCircle2, AlertTriangle, XCircle, Building2 } from "lucide-react"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ProgramActivitiesSection } from "@/components/qms/ProgramActivitiesSection"
import { ActivityTrendChart } from "@/components/qms/ActivityTrendChart"
import { RecordAttachmentsModal, AttachmentsBadge } from "@/components/qms/RecordAttachmentsModal"
import { ProgramSuppliersModal } from "@/components/qms/ProgramSuppliersModal"

const FREQ_ORDER: Record<string, number> = {
  diario: 0, semanal: 1, quincenal: 2, mensual: 3,
  trimestral: 4, semestral: 5, anual: 6,
}

function formatFieldName(name: string): string {
  if (name === "pH") return "pH"
  return name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
}

function getStatusBadge(values: Record<string, any>) {
  const cloro = parseFloat(values?.cloro_residual)
  const ph = parseFloat(values?.pH)
  if (isNaN(cloro) || isNaN(ph)) return { label: "Sin datos", variant: "secondary" as const, icon: null }
  const cloroOk = cloro >= 0.3 && cloro <= 2.0
  const phOk = ph >= 6.5 && ph <= 9.0
  if (cloroOk && phOk) return { label: "Conforme", variant: "default" as const, icon: CheckCircle2 }
  if (!cloroOk && !phOk) return { label: "No conforme", variant: "destructive" as const, icon: XCircle }
  return { label: "Atención", variant: "secondary" as const, icon: AlertTriangle }
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

export default function AguaPotablePage() {
  const { getProgramByCode } = useQMSPrograms()
  const { getActivities } = useQMSActivities()
  const { loading: recordsLoading, getRecords } = useQMSRecords()

  const [program, setProgram] = useState<SanitationProgram | null>(null)
  const [activities, setActivities] = useState<ProgramActivity[]>([])
  const [records, setRecords] = useState<ActivityRecord[]>([])
  const [activeTab, setActiveTab] = useState("")
  const [viewingAttachments, setViewingAttachments] = useState<ActivityRecord | null>(null)
  const [showSuppliers, setShowSuppliers] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const prog = await getProgramByCode("agua_potable")
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

  const selectedActivity = activities.find(a => a.id === activeTab)
  const filteredRecords = useMemo(
    () => records.filter(r => r.activity_id === activeTab),
    [records, activeTab]
  )

  // Check if this is the monitoreo (cloro/pH) activity
  const isMonitoreo = selectedActivity?.form_fields?.some(f => f.name === "cloro_residual")

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50/30 to-cyan-50/50 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-lg shadow-black/5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                <Droplets className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                  Programa de Agua Potable
                </h1>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                  Control de calidad del agua: cloro residual, pH y temperatura en puntos de muestreo
                </p>
              </div>
              <button
                onClick={() => setShowSuppliers(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/60 dark:bg-white/10 border border-white/30 dark:border-white/15 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-white/15 transition-colors shadow-sm shrink-0"
              >
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">Proveedores</span>
              </button>
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
            <ProgramActivitiesSection programId={program.id} accentColor="blue" />
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
                  className="rounded-xl data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-500/30 text-xs sm:text-sm font-medium h-11 transition-all duration-200 flex-1 min-w-0 px-2 sm:px-4"
                >
                  <span className="truncate">{activity.title}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {activities.map(activity => (
              <TabsContent key={activity.id} value={activity.id} className="space-y-6 mt-0">
                {/* Trend Chart */}
                {filteredRecords.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
                  >
                    <ActivityTrendChart
                      records={filteredRecords}
                      formFields={activity.form_fields}
                      accentColor="blue"
                    />
                  </motion.div>
                )}

                {/* Records */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
                >
                  <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
                    <CardHeader className="pb-2">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Historial de Registros
                      </h2>
                    </CardHeader>
                    <CardContent>
                      {recordsLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        </div>
                      ) : filteredRecords.length === 0 ? (
                        <div className="text-center py-12">
                          <Droplets className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-400 dark:text-gray-500 text-sm">No hay registros a{"\u00FA"}n</p>
                        </div>
                      ) : isMonitoreo ? (
                        <>
                          {/* Desktop table for monitoreo */}
                          <div className="hidden sm:block overflow-x-auto -mx-6">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-gray-200/30 dark:border-white/10">
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Punto</th>
                                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cloro (mg/L)</th>
                                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">pH</th>
                                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Temp ({"\u00B0"}C)</th>
                                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Evidencias</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200/20 dark:divide-white/5">
                                {filteredRecords.map((record, i) => {
                                  const status = getStatusBadge(record.values || {})
                                  const StatusIcon = status.icon
                                  return (
                                    <motion.tr
                                      key={record.id}
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: i * 0.03 }}
                                      className="hover:bg-white/30 dark:hover:bg-white/5 transition-colors duration-150"
                                    >
                                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                        {format(new Date(record.scheduled_date), "d MMM yyyy", { locale: es })}
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                        {record.values?.punto_muestreo || "-"}
                                      </td>
                                      <td className="px-6 py-4 text-sm text-center font-mono font-medium text-gray-900 dark:text-white">
                                        {record.values?.cloro_residual ?? "-"}
                                      </td>
                                      <td className="px-6 py-4 text-sm text-center font-mono font-medium text-gray-900 dark:text-white">
                                        {record.values?.pH ?? "-"}
                                      </td>
                                      <td className="px-6 py-4 text-sm text-center font-mono text-gray-500 dark:text-gray-400">
                                        {record.values?.temperatura ?? "-"}
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                        <Badge variant={status.variant} className="rounded-full px-3 py-1 text-xs font-medium gap-1">
                                          {StatusIcon && <StatusIcon className="w-3 h-3" />}
                                          {status.label}
                                        </Badge>
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                        <AttachmentsBadge
                                          count={record.record_attachments?.length || 0}
                                          onClick={() => setViewingAttachments(record)}
                                        />
                                      </td>
                                    </motion.tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile cards for monitoreo */}
                          <div className="sm:hidden space-y-3">
                            {filteredRecords.map((record, i) => {
                              const status = getStatusBadge(record.values || {})
                              const StatusIcon = status.icon
                              return (
                                <motion.div
                                  key={record.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.03 }}
                                  className="bg-white/40 dark:bg-white/5 rounded-2xl p-4 space-y-3 border border-white/20 dark:border-white/5"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                      {format(new Date(record.scheduled_date), "d MMM yyyy", { locale: es })}
                                    </span>
                                    <Badge variant={status.variant} className="rounded-full px-3 py-1 text-xs font-medium gap-1">
                                      {StatusIcon && <StatusIcon className="w-3 h-3" />}
                                      {status.label}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {record.values?.punto_muestreo || "-"}
                                  </p>
                                  <div className="grid grid-cols-3 gap-3">
                                    <div className="text-center">
                                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Cloro</p>
                                      <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                                        {record.values?.cloro_residual ?? "-"}
                                      </p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">pH</p>
                                      <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                                        {record.values?.pH ?? "-"}
                                      </p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Temp</p>
                                      <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                                        {record.values?.temperatura ?? "-"}
                                      </p>
                                    </div>
                                  </div>
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
                        </>
                      ) : (
                        /* Generic records for other activity types */
                        <div className="space-y-3">
                          {filteredRecords.map((record, i) => {
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
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {format(new Date(record.scheduled_date), "d MMM yyyy", { locale: es })}
                                  </span>
                                  <Badge variant={statusInfo.variant} className="rounded-full px-3 py-1 text-xs font-medium">
                                    {statusInfo.label}
                                  </Badge>
                                </div>
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
                </motion.div>
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
          programName="Programa de Agua Potable"
          accentColor="blue"
        />
      )}
    </div>
  )
}
