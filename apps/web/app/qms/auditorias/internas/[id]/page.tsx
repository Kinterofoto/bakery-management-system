"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ClipboardCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ChevronLeft,
  Save,
  AlertTriangle,
  Plus,
  X,
} from "lucide-react"
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
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { useQMSAudits, type InternalAudit, type ChecklistItem } from "@/hooks/use-qms-audits"
import { useQMSCorrectiveActions, type CorrectiveAction } from "@/hooks/use-qms-corrective-actions"
import { useQMSPrograms, type SanitationProgram } from "@/hooks/use-qms-programs"

type ResultValue = "conforme" | "no_conforme" | "no_aplica"

const LEVEL_CONFIG = {
  basica: { label: "Basica", color: "bg-green-100 text-green-800" },
  intermedia: { label: "Intermedia", color: "bg-amber-100 text-amber-800" },
  avanzada: { label: "Avanzada", color: "bg-red-100 text-red-800" },
}

export default function InternalAuditDetailPage() {
  const params = useParams()
  const router = useRouter()
  const auditId = params.id as string

  const { getInternalAuditById, saveItemResults, updateInternalAudit } = useQMSAudits()
  const { getCorrectiveActions, createCorrectiveAction } = useQMSCorrectiveActions()
  const { getPrograms } = useQMSPrograms()

  const [audit, setAudit] = useState<InternalAudit | null>(null)
  const [programs, setPrograms] = useState<SanitationProgram[]>([])
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Results state: item_id -> { result, observations }
  const [results, setResults] = useState<Record<string, { result: ResultValue; observations: string }>>({})

  // New CA dialog
  const [showNewCA, setShowNewCA] = useState<string | null>(null) // item_id that triggered it
  const [caDescription, setCaDescription] = useState("")
  const [caProgramId, setCaProgramId] = useState("")
  const [caDate, setCaDate] = useState("")
  const [caPriority, setCaPriority] = useState("media")

  useEffect(() => {
    loadData()
  }, [auditId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [auditData, progs, cas] = await Promise.all([
        getInternalAuditById(auditId),
        getPrograms(),
        getCorrectiveActions({ internalAuditId: auditId }),
      ])
      if (auditData) {
        setAudit(auditData)
        // Pre-fill results from existing item_results
        const existing: Record<string, { result: ResultValue; observations: string }> = {}
        auditData.audit_item_results?.forEach((r) => {
          existing[r.item_id] = { result: r.result, observations: r.observations || "" }
        })
        setResults(existing)
      }
      setPrograms(progs)
      setCorrectiveActions(cas)
    } finally {
      setLoading(false)
    }
  }

  const checklistItems = useMemo<ChecklistItem[]>(() => {
    if (!audit?.audit_checklists?.items) return []
    return audit.audit_checklists.items as ChecklistItem[]
  }, [audit])

  const categories = useMemo(() => {
    const cats: Record<string, ChecklistItem[]> = {}
    checklistItems.forEach((item) => {
      const cat = item.category || "General"
      if (!cats[cat]) cats[cat] = []
      cats[cat].push(item)
    })
    return cats
  }, [checklistItems])

  const stats = useMemo(() => {
    const answered = Object.keys(results).length
    const total = checklistItems.length
    const conforme = Object.values(results).filter((r) => r.result === "conforme").length
    const noConforme = Object.values(results).filter((r) => r.result === "no_conforme").length
    const noAplica = Object.values(results).filter((r) => r.result === "no_aplica").length
    const applicable = answered - noAplica
    const score = applicable > 0 ? Math.round((conforme / applicable) * 100) : 0
    return { answered, total, conforme, noConforme, noAplica, score }
  }, [results, checklistItems])

  const setItemResult = (itemId: string, result: ResultValue) => {
    setResults((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], result, observations: prev[itemId]?.observations || "" },
    }))
  }

  const setItemObservation = (itemId: string, observations: string) => {
    setResults((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], observations },
    }))
  }

  const handleSave = async () => {
    if (!audit) return
    setSaving(true)
    try {
      const resultRows = checklistItems
        .filter((item) => results[item.id])
        .map((item) => ({
          item_id: item.id,
          question: item.question,
          category: item.category,
          result: results[item.id].result,
          observations: results[item.id].observations || undefined,
        }))

      await saveItemResults(auditId, resultRows)
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  const handleFinalize = async () => {
    if (!audit) return
    setSaving(true)
    try {
      const resultRows = checklistItems
        .filter((item) => results[item.id])
        .map((item) => ({
          item_id: item.id,
          question: item.question,
          category: item.category,
          result: results[item.id].result,
          observations: results[item.id].observations || undefined,
        }))

      await saveItemResults(auditId, resultRows)
      await updateInternalAudit(auditId, { status: "completada" })
      router.push("/qms/auditorias")
    } finally {
      setSaving(false)
    }
  }

  const handleCreateCA = async () => {
    if (!caDescription || !caProgramId) return
    setSaving(true)
    try {
      await createCorrectiveAction({
        program_id: caProgramId,
        internal_audit_id: auditId,
        audit_item_result_id: showNewCA || undefined,
        description: caDescription,
        scheduled_date: caDate || undefined,
        priority: caPriority,
      })
      setShowNewCA(null)
      setCaDescription("")
      setCaProgramId("")
      setCaDate("")
      setCaPriority("media")
      const cas = await getCorrectiveActions({ internalAuditId: auditId })
      setCorrectiveActions(cas)
    } catch {
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    )
  }

  if (!audit) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Auditoria no encontrada</p>
      </div>
    )
  }

  const levelConfig = LEVEL_CONFIG[audit.audit_checklists?.level || "basica"]
  const isEditable = audit.status === "en_progreso"

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50/50 via-white to-pink-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-6 shadow-lg shadow-black/5">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => router.push("/qms/auditorias")} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white tracking-tight truncate">{audit.title}</h1>
                  <Badge className={`${levelConfig.color} border-0 text-xs`}>{levelConfig.label}</Badge>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {format(new Date(audit.audit_date), "d 'de' MMMM yyyy", { locale: es })}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/40 dark:bg-white/5 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.answered}/{stats.total}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Respondidas</p>
              </div>
              <div className="bg-green-50/80 dark:bg-green-500/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.conforme}</p>
                <p className="text-[10px] text-green-600 uppercase tracking-wide">Conforme</p>
              </div>
              <div className="bg-red-50/80 dark:bg-red-500/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{stats.noConforme}</p>
                <p className="text-[10px] text-red-600 uppercase tracking-wide">No Conforme</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${stats.score >= 80 ? "bg-green-50/80" : stats.score >= 60 ? "bg-amber-50/80" : "bg-red-50/80"}`}>
                <p className={`text-2xl font-bold ${stats.score >= 80 ? "text-green-600" : stats.score >= 60 ? "text-amber-600" : "text-red-600"}`}>{stats.score}%</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Calificacion</p>
              </div>
            </div>

            <div className="mt-3 h-2 rounded-full bg-gray-200/50 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-500 transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.answered / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </motion.div>

        {/* Checklist Items by Category */}
        {Object.entries(categories).map(([category, items], catIdx) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: catIdx * 0.05 }}
          >
            <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200/30 dark:border-white/10">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">{category}</h2>
                <p className="text-xs text-gray-400">{items.length} items</p>
              </div>

              <div className="divide-y divide-gray-200/20 dark:divide-white/5">
                {items.map((item) => {
                  const result = results[item.id]
                  const isNoConforme = result?.result === "no_conforme"

                  return (
                    <div key={item.id} className="px-6 py-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="text-xs text-gray-400 font-mono mt-1 shrink-0">{item.id}</span>
                        <p className="text-sm text-gray-800 dark:text-gray-200 flex-1 leading-relaxed">{item.question}</p>
                      </div>

                      {isEditable ? (
                        <div className="flex items-center gap-2 ml-8">
                          <button
                            onClick={() => setItemResult(item.id, "conforme")}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                              result?.result === "conforme"
                                ? "bg-green-500 text-white shadow-md shadow-green-500/30"
                                : "bg-gray-100 dark:bg-white/10 text-gray-500 hover:bg-green-50 hover:text-green-600"
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Conforme
                          </button>
                          <button
                            onClick={() => setItemResult(item.id, "no_conforme")}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                              result?.result === "no_conforme"
                                ? "bg-red-500 text-white shadow-md shadow-red-500/30"
                                : "bg-gray-100 dark:bg-white/10 text-gray-500 hover:bg-red-50 hover:text-red-600"
                            }`}
                          >
                            <XCircle className="w-4 h-4" />
                            No Conforme
                          </button>
                          <button
                            onClick={() => setItemResult(item.id, "no_aplica")}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                              result?.result === "no_aplica"
                                ? "bg-gray-500 text-white shadow-md shadow-gray-500/30"
                                : "bg-gray-100 dark:bg-white/10 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            <MinusCircle className="w-4 h-4" />
                            N/A
                          </button>
                        </div>
                      ) : result ? (
                        <div className="ml-8">
                          <Badge className={`border-0 text-xs ${
                            result.result === "conforme" ? "bg-green-100 text-green-800" :
                            result.result === "no_conforme" ? "bg-red-100 text-red-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {result.result === "conforme" ? "Conforme" : result.result === "no_conforme" ? "No Conforme" : "N/A"}
                          </Badge>
                        </div>
                      ) : null}

                      {/* Observations field for no_conforme */}
                      {isNoConforme && isEditable && (
                        <div className="ml-8 space-y-2">
                          <Input
                            placeholder="Observaciones de la no conformidad..."
                            value={result?.observations || ""}
                            onChange={(e) => setItemObservation(item.id, e.target.value)}
                            className="bg-red-50/50 dark:bg-red-500/5 border-red-200/50 dark:border-red-500/20 rounded-xl h-10 text-sm"
                          />
                          <button
                            onClick={() => {
                              setShowNewCA(item.id)
                              setCaDescription(item.question)
                            }}
                            className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Crear Accion Correctiva
                          </button>
                        </div>
                      )}

                      {result?.observations && !isEditable && (
                        <p className="ml-8 text-xs text-gray-500 italic">{result.observations}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Corrective Actions from this audit */}
        {correctiveActions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200/30 dark:border-white/10">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  Acciones Correctivas ({correctiveActions.length})
                </h2>
              </div>
              <div className="p-4 space-y-2">
                {correctiveActions.map((ca) => (
                  <div key={ca.id} className="bg-white/40 dark:bg-white/5 rounded-xl p-4 border border-white/20 dark:border-white/5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-800 dark:text-gray-200 flex-1">{ca.description}</p>
                      <Badge className={`border-0 text-[10px] shrink-0 ${
                        ca.status === "completada" ? "bg-green-100 text-green-800" :
                        ca.status === "vencida" ? "bg-red-100 text-red-800" :
                        "bg-amber-100 text-amber-800"
                      }`}>
                        {ca.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      {ca.sanitation_programs && (
                        <Badge className="text-[10px] border-0 bg-gray-100 text-gray-700">{ca.sanitation_programs.name}</Badge>
                      )}
                      {ca.scheduled_date && <span>Programada: {format(new Date(ca.scheduled_date), "d MMM yyyy", { locale: es })}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        {isEditable && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col sm:flex-row gap-3 sticky bottom-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 text-gray-800 dark:text-white hover:bg-white rounded-xl h-12 px-8 font-semibold shadow-lg flex-1 sm:flex-none"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
              Guardar Progreso
            </Button>
            <Button
              onClick={handleFinalize}
              disabled={saving || stats.answered < stats.total}
              className="bg-green-500 hover:bg-green-600 text-white rounded-xl h-12 px-8 font-semibold shadow-md shadow-green-500/30 active:scale-95 transition-all duration-150 flex-1"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
              Finalizar Auditoria ({stats.score}%)
            </Button>
          </motion.div>
        )}

        {/* CA Dialog */}
        {showNewCA && (
          <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" onClick={() => setShowNewCA(null)} />
            <div className="fixed inset-x-4 top-[10vh] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-[60] bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-white/30 dark:border-white/15 rounded-3xl shadow-2xl">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nueva Accion Correctiva</h3>
                  <button onClick={() => setShowNewCA(null)} className="p-2 rounded-xl hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Programa asociado <span className="text-red-400">*</span></Label>
                    <Select value={caProgramId} onValueChange={setCaProgramId}>
                      <SelectTrigger className="bg-white/50 border-gray-200/50 rounded-xl h-12 text-base"><SelectValue placeholder="Seleccionar programa..." /></SelectTrigger>
                      <SelectContent>{programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Descripcion <span className="text-red-400">*</span></Label>
                    <Textarea value={caDescription} onChange={(e) => setCaDescription(e.target.value)} placeholder="Descripcion..." className="bg-white/50 border-gray-200/50 rounded-xl text-base min-h-[80px]" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fecha programada</Label>
                      <Input type="date" value={caDate} onChange={(e) => setCaDate(e.target.value)} className="bg-white/50 border-gray-200/50 rounded-xl h-12 text-base" />
                    </div>
                    <div className="space-y-2">
                      <Label>Prioridad</Label>
                      <Select value={caPriority} onValueChange={setCaPriority}>
                        <SelectTrigger className="bg-white/50 border-gray-200/50 rounded-xl h-12 text-base"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baja">Baja</SelectItem>
                          <SelectItem value="media">Media</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="critica">Critica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setShowNewCA(null)} className="rounded-xl h-12 px-6">Cancelar</Button>
                  <Button onClick={handleCreateCA} disabled={saving || !caDescription || !caProgramId} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl h-12 px-8 font-semibold shadow-md shadow-rose-500/30 flex-1">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <AlertTriangle className="w-5 h-5 mr-2" />}
                    Crear Accion
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
