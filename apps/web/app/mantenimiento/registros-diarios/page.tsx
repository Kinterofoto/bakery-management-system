"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  FileCheck,
  Thermometer,
  Activity,
  Check,
  ChevronLeft,
  Droplets,
  Volume2,
  SprayCan,
  Sun,
  Moon,
  Sunset,
  Loader2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useMaintenanceDailyLogs, type DailyLog } from "@/hooks/use-maintenance-daily-logs"
import { useMaintenanceEquipment, type Equipment } from "@/hooks/use-maintenance-equipment"

const spring = { type: "spring" as const, stiffness: 300, damping: 30 }

const CHECK_ITEMS = [
  { key: "limpieza", label: "Limpieza OK", icon: SprayCan },
  { key: "temperatura", label: "Temperatura Normal", icon: Thermometer },
  { key: "ruido", label: "Ruido Normal", icon: Volume2 },
  { key: "vibracion", label: "Vibración Normal", icon: Activity },
  { key: "lubricacion", label: "Lubricación OK", icon: Droplets },
] as const

const SHIFTS = [
  { value: "manana" as const, label: "Mañana", icon: Sun },
  { value: "tarde" as const, label: "Tarde", icon: Sunset },
  { value: "noche" as const, label: "Noche", icon: Moon },
]

export default function RegistrosDiariosPage() {
  // Hooks
  const { loading: logsLoading, getDailyLogs, createDailyLog } = useMaintenanceDailyLogs()
  const { loading: equipLoading, getEquipment } = useMaintenanceEquipment()

  // State
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [todayLogs, setTodayLogs] = useState<DailyLog[]>([])

  // Form state
  const [checks, setChecks] = useState<Record<string, boolean>>({
    limpieza: false,
    temperatura: false,
    ruido: false,
    vibracion: false,
    lubricacion: false,
  })
  const [temperatureValue, setTemperatureValue] = useState("")
  const [vibrationValue, setVibrationValue] = useState("")
  const [shift, setShift] = useState<"manana" | "tarde" | "noche">("manana")
  const [observations, setObservations] = useState("")
  const [saving, setSaving] = useState(false)

  const today = format(new Date(), "yyyy-MM-dd")

  // Load equipment on mount
  useEffect(() => {
    getEquipment({ status: "operativo" }).then(setEquipment)
  }, [getEquipment])

  // Load today's logs
  const loadTodayLogs = useCallback(async () => {
    const logs = await getDailyLogs({ date: today })
    setTodayLogs(logs)
  }, [getDailyLogs, today])

  useEffect(() => {
    loadTodayLogs()
  }, [loadTodayLogs])

  const resetForm = () => {
    setChecks({
      limpieza: false,
      temperatura: false,
      ruido: false,
      vibracion: false,
      lubricacion: false,
    })
    setTemperatureValue("")
    setVibrationValue("")
    setShift("manana")
    setObservations("")
  }

  const handleSubmit = async () => {
    if (!selectedEquipment) return
    setSaving(true)
    try {
      await createDailyLog({
        equipment_id: selectedEquipment.id,
        log_date: today,
        shift,
        checks,
        temperature: temperatureValue ? parseFloat(temperatureValue) : null,
        vibration: vibrationValue ? parseFloat(vibrationValue) : null,
        observations: observations.trim() || null,
      })
      resetForm()
      setSelectedEquipment(null)
      await loadTodayLogs()
    } catch {
      // error handled by hook toast
    } finally {
      setSaving(false)
    }
  }

  const toggleCheck = (key: string) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-yellow-50/50">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
        >
          <div className="flex items-center gap-3">
            {selectedEquipment && (
              <Button
                variant="ghost"
                size="icon"
                className="min-h-[44px] min-w-[44px] rounded-xl"
                onClick={() => {
                  setSelectedEquipment(null)
                  resetForm()
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Registros Diarios</h1>
              <p className="text-sm text-gray-500">
                {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
              </p>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {!selectedEquipment ? (
            /* Equipment Selector */
            <motion.div
              key="equipment-selector"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={spring}
              className="space-y-4"
            >
              <div className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-5">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Seleccionar Equipo
                </h2>

                {equipLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                  </div>
                ) : equipment.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No hay equipos operativos registrados.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {equipment.map((eq, index) => (
                      <motion.button
                        key={eq.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...spring, delay: index * 0.05 }}
                        onClick={() => setSelectedEquipment(eq)}
                        className="flex items-center gap-4 w-full min-h-[64px] p-4 rounded-xl border border-gray-200/60 bg-white/60 hover:bg-amber-50/80 hover:border-amber-200 active:scale-[0.98] transition-all text-left"
                      >
                        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                          <FileCheck className="h-5 w-5 text-amber-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {eq.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {eq.code || "Sin código"}
                            {eq.equipment_categories?.name
                              ? ` · ${eq.equipment_categories.name}`
                              : ""}
                          </p>
                        </div>
                        <ChevronLeft className="h-4 w-4 text-gray-400 rotate-180 flex-shrink-0" />
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* Check Form */
            <motion.div
              key="check-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={spring}
              className="space-y-4"
            >
              {/* Selected equipment header */}
              <div className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <FileCheck className="h-5 w-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedEquipment.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedEquipment.code || "Sin código"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Toggle checks */}
              <div className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-5 space-y-3">
                <h3 className="text-base font-semibold text-gray-800">
                  Verificaciones Rápidas
                </h3>
                <div className="space-y-2">
                  {CHECK_ITEMS.map(({ key, label, icon: Icon }) => (
                    <motion.button
                      key={key}
                      onClick={() => toggleCheck(key)}
                      whileTap={{ scale: 0.97 }}
                      className={`flex items-center gap-3 w-full min-h-[52px] p-3 rounded-xl border transition-all ${
                        checks[key]
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-gray-50/60 border-gray-200/60 text-gray-600"
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                          checks[key] ? "bg-emerald-500" : "bg-gray-300"
                        }`}
                      >
                        {checks[key] ? (
                          <Check className="h-4 w-4 text-white" />
                        ) : (
                          <Icon className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <span className="font-medium text-sm">{label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Numeric inputs */}
              <div className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-5 space-y-4">
                <h3 className="text-base font-semibold text-gray-800">
                  Mediciones (Opcional)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="temperature"
                      className="flex items-center gap-1.5 text-sm"
                    >
                      <Thermometer className="h-4 w-4 text-red-500" />
                      Temperatura (°C)
                    </Label>
                    <Input
                      id="temperature"
                      type="number"
                      step="0.1"
                      placeholder="ej. 85"
                      value={temperatureValue}
                      onChange={(e) => setTemperatureValue(e.target.value)}
                      className="min-h-[44px] rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="vibration"
                      className="flex items-center gap-1.5 text-sm"
                    >
                      <Activity className="h-4 w-4 text-blue-500" />
                      Vibración (mm/s)
                    </Label>
                    <Input
                      id="vibration"
                      type="number"
                      step="0.01"
                      placeholder="ej. 2.5"
                      value={vibrationValue}
                      onChange={(e) => setVibrationValue(e.target.value)}
                      className="min-h-[44px] rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Shift selector */}
              <div className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-5 space-y-3">
                <h3 className="text-base font-semibold text-gray-800">Turno</h3>
                <div className="grid grid-cols-3 gap-3">
                  {SHIFTS.map(({ value, label, icon: Icon }) => (
                    <motion.button
                      key={value}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShift(value)}
                      className={`flex flex-col items-center gap-1.5 min-h-[64px] p-3 rounded-xl border transition-all ${
                        shift === value
                          ? "bg-amber-100 border-amber-300 text-amber-900"
                          : "bg-gray-50/60 border-gray-200/60 text-gray-500"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${
                          shift === value ? "text-amber-700" : "text-gray-400"
                        }`}
                      />
                      <span className="text-sm font-medium">{label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Observations */}
              <div className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-5 space-y-3">
                <Label htmlFor="observations" className="text-base font-semibold text-gray-800">
                  Observaciones
                </Label>
                <Textarea
                  id="observations"
                  placeholder="Notas adicionales sobre el estado del equipo..."
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={3}
                  className="rounded-xl min-h-[80px] resize-none"
                />
              </div>

              {/* Submit */}
              <motion.div whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={handleSubmit}
                  disabled={saving || logsLoading}
                  className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-base shadow-lg shadow-amber-200/50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <FileCheck className="h-5 w-5 mr-2" />
                      Guardar Registro
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Today's logs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.15 }}
          className="space-y-3"
        >
          <h2 className="text-lg font-semibold text-gray-800">
            Registros de Hoy
          </h2>

          {logsLoading && todayLogs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
            </div>
          ) : todayLogs.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-6 text-center">
              <p className="text-gray-500 text-sm">
                No hay registros para hoy.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayLogs.map((log, index) => {
                const checksOk = log.checks
                  ? Object.values(log.checks).filter(Boolean).length
                  : 0
                const checksTotal = log.checks
                  ? Object.keys(log.checks).length
                  : 0
                const shiftLabel = SHIFTS.find(
                  (s) => s.value === log.shift
                )?.label

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...spring, delay: index * 0.05 }}
                    className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate text-sm">
                          {log.equipment?.name || "Equipo"}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {shiftLabel && (
                            <Badge variant="outline" className="text-xs">
                              {shiftLabel}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            {checksOk}/{checksTotal} OK
                          </span>
                          {log.temperature != null && (
                            <span className="text-xs text-gray-500">
                              {log.temperature}°C
                            </span>
                          )}
                          {log.vibration != null && (
                            <span className="text-xs text-gray-500">
                              {log.vibration} mm/s
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                          checksOk === checksTotal && checksTotal > 0
                            ? "bg-emerald-100"
                            : "bg-amber-100"
                        }`}
                      >
                        <Check
                          className={`h-4 w-4 ${
                            checksOk === checksTotal && checksTotal > 0
                              ? "text-emerald-600"
                              : "text-amber-600"
                          }`}
                        />
                      </div>
                    </div>
                    {log.observations && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                        {log.observations}
                      </p>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
