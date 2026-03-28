"use client"

import { useState, useEffect } from "react"
import { useQMSPrograms, SanitationProgram } from "@/hooks/use-qms-programs"
import { useQMSActivities, ProgramActivity } from "@/hooks/use-qms-activities"
import { useQMSRecords, ActivityRecord } from "@/hooks/use-qms-records"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SprayCan, Loader2, ClipboardCheck, Sparkles, Star } from "lucide-react"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ProgramActivitiesSection } from "@/components/qms/ProgramActivitiesSection"

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

export default function LimpiezaPage() {
  const { getProgramByCode } = useQMSPrograms()
  const { getActivities } = useQMSActivities()
  const { loading: recordsLoading, getRecords } = useQMSRecords()

  const [program, setProgram] = useState<SanitationProgram | null>(null)
  const [records, setRecords] = useState<ActivityRecord[]>([])
  const [activeTab, setActiveTab] = useState("diario")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const prog = await getProgramByCode("limpieza_desinfeccion")
    if (prog) {
      setProgram(prog)
      const recs = await getRecords({ programId: prog.id })
      setRecords(recs)
    }
  }

  const filteredRecords = records.filter(r => {
    if (activeTab === "diario") return r.values?.tipo === "diario" || r.program_activities?.activity_type === "registro_diario"
    if (activeTab === "profunda") return r.values?.tipo === "profunda" || r.program_activities?.activity_type === "limpieza_profunda"
    return r.values?.tipo === "evaluacion" || r.program_activities?.activity_type === "evaluacion"
  })

  const renderRecordsList = (recordsList: ActivityRecord[]) => (
    <>
      {recordsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        </div>
      ) : recordsList.length === 0 ? (
        <div className="text-center py-12">
          <SprayCan className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 dark:text-gray-500 text-sm">No hay registros aún</p>
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
                  Limpieza y Desinfección
                </h1>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                  Programa POES: registros diarios, limpieza profunda y evaluaciones
                </p>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
