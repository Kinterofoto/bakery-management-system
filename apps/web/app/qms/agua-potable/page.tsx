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
import { Droplets, Plus, Loader2, CheckCircle2, AlertTriangle, XCircle, TrendingUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const PUNTOS_MUESTREO = [
  "Entrada planta",
  "Tanque almacenamiento",
  "Punto producción 1",
  "Punto producción 2",
  "Lavamanos",
  "Cuarto frío",
]

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

function getCloroColor(val: number) {
  if (val >= 0.3 && val <= 2.0) return "bg-green-500"
  if (val < 0.3) return "bg-red-500"
  return "bg-orange-500"
}

export default function AguaPotablePage() {
  const { getProgramByCode } = useQMSPrograms()
  const { getActivities } = useQMSActivities()
  const { loading: recordsLoading, getRecords, createRecord } = useQMSRecords()

  const [program, setProgram] = useState<SanitationProgram | null>(null)
  const [activities, setActivities] = useState<ProgramActivity[]>([])
  const [records, setRecords] = useState<ActivityRecord[]>([])
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [puntoMuestreo, setPuntoMuestreo] = useState("")
  const [cloroResidual, setCloroResidual] = useState("")
  const [ph, setPh] = useState("")
  const [temperatura, setTemperatura] = useState("")
  const [observations, setObservations] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const prog = await getProgramByCode("agua_potable")
    if (prog) {
      setProgram(prog)
      const acts = await getActivities(prog.id)
      setActivities(acts)
      const recs = await getRecords({ programId: prog.id })
      setRecords(recs)
    }
  }

  const handleSubmit = async () => {
    if (!puntoMuestreo || !cloroResidual || !ph) return
    if (!program || activities.length === 0) return

    setSubmitting(true)
    try {
      await createRecord({
        activity_id: activities[0].id,
        program_id: program.id,
        scheduled_date: new Date().toISOString(),
        status: "completado",
        values: {
          punto_muestreo: puntoMuestreo,
          cloro_residual: parseFloat(cloroResidual),
          pH: parseFloat(ph),
          temperatura: temperatura ? parseFloat(temperatura) : null,
        },
        observations: observations || null,
      })
      // Reset form
      setPuntoMuestreo("")
      setCloroResidual("")
      setPh("")
      setTemperatura("")
      setObservations("")
      setShowForm(false)
      // Refresh
      const recs = await getRecords({ programId: program.id })
      setRecords(recs)
    } catch {
      // Error handled by hook
    } finally {
      setSubmitting(false)
    }
  }

  // Last 7 records for mini chart
  const trendData = useMemo(() => {
    return records
      .filter(r => r.values?.cloro_residual != null)
      .slice(0, 7)
      .reverse()
  }, [records])

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
              <Button
                onClick={() => setShowForm(!showForm)}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40 active:scale-95 transition-all duration-150 h-12 px-6 font-semibold shrink-0"
              >
                <Plus className="w-5 h-5 mr-2" />
                Registrar
              </Button>
            </div>
          </div>
        </motion.div>

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
                    Registro de Muestreo
                  </h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Punto de muestreo</Label>
                      <Select value={puntoMuestreo} onValueChange={setPuntoMuestreo}>
                        <SelectTrigger className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-blue-500/50">
                          <SelectValue placeholder="Seleccionar punto..." />
                        </SelectTrigger>
                        <SelectContent>
                          {PUNTOS_MUESTREO.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Cloro residual (mg/L)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        placeholder="0.3 - 2.0"
                        value={cloroResidual}
                        onChange={e => setCloroResidual(e.target.value)}
                        className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-blue-500/50"
                      />
                      <p className="text-xs text-gray-400">Rango aceptable: 0.3 - 2.0 mg/L</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        pH
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="14"
                        placeholder="6.5 - 9.0"
                        value={ph}
                        onChange={e => setPh(e.target.value)}
                        className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-blue-500/50"
                      />
                      <p className="text-xs text-gray-400">Rango aceptable: 6.5 - 9.0</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Temperatura ({"\u00B0"}C)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Opcional"
                        value={temperatura}
                        onChange={e => setTemperatura(e.target.value)}
                        className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Observaciones
                      </Label>
                      <Textarea
                        placeholder="Observaciones adicionales..."
                        value={observations}
                        onChange={e => setObservations(e.target.value)}
                        className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl text-base focus:ring-2 focus:ring-blue-500/50 min-h-[48px]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || !puntoMuestreo || !cloroResidual || !ph}
                      className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl h-12 px-8 font-semibold shadow-md shadow-blue-500/30 active:scale-95 transition-all duration-150 flex-1 sm:flex-none"
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

        {/* Trend Chart - Last 7 days */}
        {trendData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
          >
            <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Tendencia Cloro Residual
                  </h2>
                  <span className="text-xs text-gray-400 ml-auto">
                    {"\u00DA"}ltimos {trendData.length} registros
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {/* Range reference lines */}
                <div className="relative h-32 sm:h-40 flex items-end gap-2 sm:gap-3 px-2">
                  {/* Acceptable range background */}
                  <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none">
                    <div
                      className="absolute inset-x-0 bg-green-500/10 dark:bg-green-500/5 border-y border-green-500/20"
                      style={{ bottom: `${(0.3 / 3) * 100}%`, top: `${100 - (2.0 / 3) * 100}%` }}
                    />
                    <div className="absolute right-2 text-[10px] text-green-600 dark:text-green-400 font-medium" style={{ bottom: `${(0.3 / 3) * 100}%`, transform: "translateY(50%)" }}>
                      0.3
                    </div>
                    <div className="absolute right-2 text-[10px] text-green-600 dark:text-green-400 font-medium" style={{ bottom: `${(2.0 / 3) * 100}%`, transform: "translateY(50%)" }}>
                      2.0
                    </div>
                  </div>

                  {trendData.map((r, i) => {
                    const val = parseFloat(r.values?.cloro_residual) || 0
                    const height = Math.min((val / 3) * 100, 100)
                    return (
                      <motion.div
                        key={r.id}
                        className="flex-1 flex flex-col items-center gap-1 relative z-10"
                        initial={{ opacity: 0, scaleY: 0 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        transition={{ delay: i * 0.05 }}
                        style={{ originY: 1 }}
                      >
                        <span className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400">
                          {val.toFixed(1)}
                        </span>
                        <div
                          className={`w-full max-w-[40px] rounded-t-lg ${getCloroColor(val)} transition-all duration-300`}
                          style={{ height: `${height}%`, minHeight: "4px" }}
                        />
                        <span className="text-[9px] sm:text-[10px] text-gray-400 truncate max-w-full">
                          {format(new Date(r.scheduled_date), "d MMM", { locale: es })}
                        </span>
                      </motion.div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* History */}
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
              ) : records.length === 0 ? (
                <div className="text-center py-12">
                  <Droplets className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
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
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Punto</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cloro (mg/L)</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">pH</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Temp ({"\u00B0"}C)</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200/20 dark:divide-white/5">
                        {records.map((record, i) => {
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
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="sm:hidden space-y-3">
                    {records.map((record, i) => {
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
