"use client"

import { useState, useEffect, useMemo } from "react"
import { useQMSPrograms, SanitationProgram } from "@/hooks/use-qms-programs"
import { useQMSActivities, ProgramActivity } from "@/hooks/use-qms-activities"
import { useQMSRecords, ActivityRecord } from "@/hooks/use-qms-records"
import { useQMSCorrectiveActions, CorrectiveAction } from "@/hooks/use-qms-corrective-actions"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Recycle, Loader2, Trash2, Leaf, AlertTriangle, Package, Building2, FileText } from "lucide-react"
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

const TIPOS_RESIDUO = [
  { value: "organico", label: "Orgánico", color: "bg-green-500", icon: Leaf },
  { value: "reciclable", label: "Reciclable", color: "bg-blue-500", icon: Recycle },
  { value: "ordinario", label: "Ordinario", color: "bg-gray-500", icon: Trash2 },
  { value: "peligroso", label: "Peligroso", color: "bg-red-500", icon: AlertTriangle },
]

function getTipoInfo(tipo: string) {
  return TIPOS_RESIDUO.find(t => t.value === tipo) || { value: tipo, label: tipo, color: "bg-gray-400", icon: Package }
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

export default function ResiduosPage() {
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
    const prog = await getProgramByCode("residuos_solidos")
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

  // Check if this is the waste registration activity (has tipo_residuo field)
  const isRegistro = selectedActivity?.form_fields?.some(f => f.name === "tipo_residuo")

  // Monthly summary for waste registration tab
  const monthlySummary = useMemo(() => {
    if (!isRegistro) return []
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const monthRecords = filteredRecords.filter(r => {
      const d = new Date(r.scheduled_date)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })

    const totals: Record<string, number> = {}
    monthRecords.forEach(r => {
      const tipo = r.values?.tipo_residuo || "otro"
      const peso = parseFloat(r.values?.peso_kg) || 0
      totals[tipo] = (totals[tipo] || 0) + peso
    })

    return TIPOS_RESIDUO.map(t => ({
      ...t,
      total: totals[t.value] || 0,
    }))
  }, [filteredRecords, isRegistro])

  const totalMes = monthlySummary.reduce((acc, t) => acc + t.total, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50/30 to-teal-50/50 dark:from-gray-950 dark:via-green-950/20 dark:to-gray-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-lg shadow-black/5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30 shrink-0">
                <Recycle className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                  Gestión Integral de Residuos Sólidos
                </h1>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                  Registro y seguimiento de residuos por tipo, peso y disposición final
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
            <ProgramActivitiesSection programId={program.id} accentColor="green" />
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
                  className="rounded-xl data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-green-500/30 text-xs sm:text-sm font-medium h-11 transition-all duration-200 flex-1 min-w-0 px-2 sm:px-4"
                >
                  <span className="truncate">{activity.title}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {activities.map(activity => {
              const tabRecords = records.filter(r => r.activity_id === activity.id)
              const tabIsRegistro = activity.form_fields?.some(f => f.name === "tipo_residuo")

              return (
                <TabsContent key={activity.id} value={activity.id} className="space-y-6 mt-0">

                  {/* Waste Summary Cards - only for registration activity */}
                  {tabIsRegistro && activeTab === activity.id && monthlySummary.length > 0 && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      {monthlySummary.map((tipo, i) => {
                        const TipoIcon = tipo.icon
                        return (
                          <motion.div
                            key={tipo.value}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30, delay: i * 0.05 }}
                          >
                            <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 overflow-hidden">
                              <CardContent className="p-4 sm:p-5">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className={`w-10 h-10 rounded-xl ${tipo.color} flex items-center justify-center shadow-sm`}>
                                    <TipoIcon className="w-5 h-5 text-white" />
                                  </div>
                                  <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                                    {tipo.label}
                                  </span>
                                </div>
                                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                                  {tipo.total.toFixed(1)}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">kg este mes</p>
                                {totalMes > 0 && (
                                  <div className="mt-3">
                                    <div className="w-full h-1.5 bg-gray-200/50 dark:bg-white/10 rounded-full overflow-hidden">
                                      <motion.div
                                        className={`h-full ${tipo.color} rounded-full`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(tipo.total / totalMes) * 100}%` }}
                                        transition={{ duration: 0.5, delay: 0.3 + i * 0.05 }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}

                  {/* Trend Chart */}
                  {activeTab === activity.id && filteredRecords.length > 0 && !tabIsRegistro && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
                    >
                      <ActivityTrendChart
                        records={filteredRecords}
                        formFields={activity.form_fields}
                        accentColor="green"
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
                            <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                          </div>
                        ) : filteredRecords.length === 0 ? (
                          <div className="text-center py-12">
                            <Recycle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400 dark:text-gray-500 text-sm">No hay registros a{"\u00FA"}n</p>
                          </div>
                        ) : tabIsRegistro ? (
                          <>
                            {/* Desktop table for waste registration */}
                            <div className="hidden sm:block overflow-x-auto -mx-6">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-gray-200/30 dark:border-white/10">
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Peso (kg)</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Disposición</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">AC</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Observaciones</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200/20 dark:divide-white/5">
                                  {filteredRecords.map((record, i) => {
                                    const tipo = getTipoInfo(record.values?.tipo_residuo || "")
                                    const TipoIcon = tipo.icon
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
                                        <td className="px-6 py-4">
                                          <Badge className={`${tipo.color} text-white rounded-full px-3 py-1 text-xs font-medium gap-1.5`}>
                                            <TipoIcon className="w-3 h-3" />
                                            {tipo.label}
                                          </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-center font-mono font-medium text-gray-900 dark:text-white">
                                          {record.values?.peso_kg ?? "-"}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                          {record.values?.disposicion || "-"}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                          {(caByRecord[record.id]?.length || 0) > 0 && (
                                            <Badge className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full px-2.5 py-0.5 text-[10px] font-medium gap-1">
                                              <AlertTriangle className="w-3 h-3" />
                                              {caByRecord[record.id].length}
                                            </Badge>
                                          )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                                          {record.observations || "-"}
                                        </td>
                                      </motion.tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Mobile cards for waste registration */}
                            <div className="sm:hidden space-y-3">
                              {filteredRecords.map((record, i) => {
                                const tipo = getTipoInfo(record.values?.tipo_residuo || "")
                                const TipoIcon = tipo.icon
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
                                      <Badge className={`${tipo.color} text-white rounded-full px-3 py-1 text-xs font-medium gap-1.5`}>
                                        <TipoIcon className="w-3 h-3" />
                                        {tipo.label}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
                                        {record.values?.peso_kg ?? "0"} kg
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {record.values?.disposicion || "-"}
                                    </p>
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
                  </motion.div>
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
          programName="Gestión Integral de Residuos Sólidos"
          accentColor="green"
        />
      )}

      {program && (
        <ProgramDocumentModal
          open={showDocument}
          onClose={() => setShowDocument(false)}
          programName="Gestión Integral de Residuos Sólidos"
          accentColor="green"
          document={program.program_document}
          onSave={handleSaveDocument}
        />
      )}
    </div>
  )
}
