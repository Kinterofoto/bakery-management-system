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
import { Recycle, Plus, Loader2, CheckCircle2, Trash2, Leaf, AlertTriangle, Package } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const TIPOS_RESIDUO = [
  { value: "organico", label: "Org\u00E1nico", color: "bg-green-500", icon: Leaf },
  { value: "reciclable", label: "Reciclable", color: "bg-blue-500", icon: Recycle },
  { value: "ordinario", label: "Ordinario", color: "bg-gray-500", icon: Trash2 },
  { value: "peligroso", label: "Peligroso", color: "bg-red-500", icon: AlertTriangle },
]

const DISPOSICIONES = [
  "Recolector municipal",
  "Reciclador autorizado",
  "Compostera interna",
  "Gestor RESPEL",
  "Almac\u00E9n temporal",
]

function getTipoInfo(tipo: string) {
  return TIPOS_RESIDUO.find(t => t.value === tipo) || { value: tipo, label: tipo, color: "bg-gray-400", icon: Package }
}

export default function ResiduosPage() {
  const { getProgramByCode } = useQMSPrograms()
  const { getActivities } = useQMSActivities()
  const { loading: recordsLoading, getRecords, createRecord } = useQMSRecords()

  const [program, setProgram] = useState<SanitationProgram | null>(null)
  const [activities, setActivities] = useState<ProgramActivity[]>([])
  const [records, setRecords] = useState<ActivityRecord[]>([])
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [tipoResiduo, setTipoResiduo] = useState("")
  const [pesoKg, setPesoKg] = useState("")
  const [disposicion, setDisposicion] = useState("")
  const [observations, setObservations] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const prog = await getProgramByCode("residuos_solidos")
    if (prog) {
      setProgram(prog)
      const acts = await getActivities(prog.id)
      setActivities(acts)
      const recs = await getRecords({ programId: prog.id })
      setRecords(recs)
    }
  }

  const handleSubmit = async () => {
    if (!tipoResiduo || !pesoKg || !disposicion) return
    if (!program || activities.length === 0) return

    setSubmitting(true)
    try {
      await createRecord({
        activity_id: activities[0].id,
        program_id: program.id,
        scheduled_date: new Date().toISOString(),
        status: "completado",
        values: {
          tipo_residuo: tipoResiduo,
          peso_kg: parseFloat(pesoKg),
          disposicion,
        },
        observations: observations || null,
      })
      setTipoResiduo("")
      setPesoKg("")
      setDisposicion("")
      setObservations("")
      setShowForm(false)
      const recs = await getRecords({ programId: program.id })
      setRecords(recs)
    } catch {
      // Error handled by hook
    } finally {
      setSubmitting(false)
    }
  }

  // Summary cards: total kg by type this month
  const monthlySummary = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const monthRecords = records.filter(r => {
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
  }, [records])

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
                  Gesti{"\u00F3"}n Integral de Residuos S{"\u00F3"}lidos
                </h1>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                  Registro y seguimiento de residuos por tipo, peso y disposici{"\u00F3"}n final
                </p>
              </div>
              <Button
                onClick={() => setShowForm(!showForm)}
                className="bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-md shadow-green-500/30 hover:shadow-lg hover:shadow-green-500/40 active:scale-95 transition-all duration-150 h-12 px-6 font-semibold shrink-0"
              >
                <Plus className="w-5 h-5 mr-2" />
                Registrar
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
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

        {/* Quick Registration Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
                <CardHeader className="pb-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Registro de Residuos
                  </h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de residuo</Label>
                      <Select value={tipoResiduo} onValueChange={setTipoResiduo}>
                        <SelectTrigger className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-green-500/50">
                          <SelectValue placeholder="Seleccionar tipo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_RESIDUO.map(t => (
                            <SelectItem key={t.value} value={t.value}>
                              <span className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                                {t.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Peso (kg)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0.0"
                        value={pesoKg}
                        onChange={e => setPesoKg(e.target.value)}
                        className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-green-500/50"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Disposici{"\u00F3"}n</Label>
                      <Select value={disposicion} onValueChange={setDisposicion}>
                        <SelectTrigger className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-green-500/50">
                          <SelectValue placeholder="Seleccionar disposici\u00F3n..." />
                        </SelectTrigger>
                        <SelectContent>
                          {DISPOSICIONES.map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Observaciones</Label>
                      <Textarea
                        placeholder="Observaciones adicionales..."
                        value={observations}
                        onChange={e => setObservations(e.target.value)}
                        className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl text-base focus:ring-2 focus:ring-green-500/50 min-h-[48px]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || !tipoResiduo || !pesoKg || !disposicion}
                      className="bg-green-500 hover:bg-green-600 text-white rounded-xl h-12 px-8 font-semibold shadow-md shadow-green-500/30 active:scale-95 transition-all duration-150 flex-1 sm:flex-none"
                    >
                      {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                      Guardar Registro
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setShowForm(false)}
                      className="rounded-xl h-12 px-6 text-gray-500 hover:text-gray-700 active:scale-95 transition-all duration-150"
                    >
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.3 }}
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
              ) : records.length === 0 ? (
                <div className="text-center py-12">
                  <Recycle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 dark:text-gray-500 text-sm">No hay registros a{"\u00FA"}n</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto -mx-6">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200/30 dark:border-white/10">
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Peso (kg)</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Disposici{"\u00F3"}n</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Observaciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200/20 dark:divide-white/5">
                        {records.map((record, i) => {
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
                              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                                {record.observations || "-"}
                              </td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="sm:hidden space-y-3">
                    {records.map((record, i) => {
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
                        </motion.div>
                      )
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
