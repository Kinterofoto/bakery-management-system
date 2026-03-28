"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ClipboardCheck,
  Plus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Calendar,
  User,
  Building2,
  ChevronRight,
  Search,
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

import { useQMSAudits, type InternalAudit, type ExternalAudit, type AuditChecklist } from "@/hooks/use-qms-audits"
import { useQMSCorrectiveActions, type CorrectiveAction } from "@/hooks/use-qms-corrective-actions"
import { useQMSPrograms, type SanitationProgram } from "@/hooks/use-qms-programs"

const LEVEL_CONFIG = {
  basica: { label: "Basica", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300", items: "~10 preguntas" },
  intermedia: { label: "Intermedia", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", items: "~20 preguntas" },
  avanzada: { label: "Avanzada", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", items: "~35 preguntas" },
}

const STATUS_CONFIG = {
  en_progreso: { label: "En Progreso", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  completada: { label: "Completada", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  cerrada: { label: "Cerrada", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300" },
}

const PRIORITY_CONFIG = {
  baja: { label: "Baja", color: "bg-gray-100 text-gray-700" },
  media: { label: "Media", color: "bg-amber-100 text-amber-800" },
  alta: { label: "Alta", color: "bg-orange-100 text-orange-800" },
  critica: { label: "Critica", color: "bg-red-100 text-red-800" },
}

export default function AuditoriasPage() {
  const router = useRouter()
  const { loading, getChecklists, getInternalAudits, createInternalAudit, getExternalAudits, createExternalAudit } = useQMSAudits()
  const { getCorrectiveActions, createCorrectiveAction } = useQMSCorrectiveActions()
  const { getPrograms } = useQMSPrograms()

  const [tab, setTab] = useState<"internas" | "externas">("internas")
  const [checklists, setChecklists] = useState<AuditChecklist[]>([])
  const [internalAudits, setInternalAudits] = useState<InternalAudit[]>([])
  const [externalAudits, setExternalAudits] = useState<ExternalAudit[]>([])
  const [programs, setPrograms] = useState<SanitationProgram[]>([])
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([])
  const [pageLoading, setPageLoading] = useState(true)

  // New audit dialogs
  const [showNewInternal, setShowNewInternal] = useState(false)
  const [showNewExternal, setShowNewExternal] = useState(false)
  const [showNewCA, setShowNewCA] = useState<{ auditType: "internal" | "external"; auditId: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Internal audit form
  const [iaTitle, setIaTitle] = useState("")
  const [iaDate, setIaDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [iaChecklistId, setIaChecklistId] = useState("")

  // External audit form
  const [eaTitle, setEaTitle] = useState("")
  const [eaDate, setEaDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [eaAuditor, setEaAuditor] = useState("")
  const [eaOrg, setEaOrg] = useState("")
  const [eaObs, setEaObs] = useState("")

  // Corrective action form
  const [caDescription, setCaDescription] = useState("")
  const [caProgramId, setCaProgramId] = useState("")
  const [caDate, setCaDate] = useState("")
  const [caPriority, setCaPriority] = useState("media")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setPageLoading(true)
    try {
      const [cl, ia, ea, progs, cas] = await Promise.all([
        getChecklists(),
        getInternalAudits(),
        getExternalAudits(),
        getPrograms(),
        getCorrectiveActions(),
      ])
      setChecklists(cl)
      setInternalAudits(ia)
      setExternalAudits(ea)
      setPrograms(progs)
      setCorrectiveActions(cas)
    } finally {
      setPageLoading(false)
    }
  }

  const handleCreateInternal = async () => {
    if (!iaTitle || !iaChecklistId || !iaDate) return
    setSubmitting(true)
    try {
      const audit = await createInternalAudit({
        checklist_id: iaChecklistId,
        title: iaTitle,
        audit_date: iaDate,
      })
      if (audit) {
        router.push(`/qms/auditorias/internas/${audit.id}`)
      }
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateExternal = async () => {
    if (!eaTitle || !eaDate) return
    setSubmitting(true)
    try {
      const audit = await createExternalAudit({
        title: eaTitle,
        audit_date: eaDate,
        auditor_name: eaAuditor || undefined,
        organization: eaOrg || undefined,
        observations: eaObs || undefined,
      })
      if (audit) {
        setShowNewExternal(false)
        setEaTitle("")
        setEaAuditor("")
        setEaOrg("")
        setEaObs("")
        loadData()
      }
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateCA = async () => {
    if (!caDescription || !caProgramId || !showNewCA) return
    setSubmitting(true)
    try {
      await createCorrectiveAction({
        program_id: caProgramId,
        description: caDescription,
        scheduled_date: caDate || undefined,
        priority: caPriority,
        ...(showNewCA.auditType === "internal"
          ? { internal_audit_id: showNewCA.auditId }
          : { external_audit_id: showNewCA.auditId }),
      })
      setShowNewCA(null)
      setCaDescription("")
      setCaProgramId("")
      setCaDate("")
      setCaPriority("media")
      loadData()
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  // Count CAs by audit
  const caByInternalAudit = useMemo(() => {
    const map: Record<string, number> = {}
    correctiveActions.forEach((ca) => {
      if (ca.internal_audit_id) {
        map[ca.internal_audit_id] = (map[ca.internal_audit_id] || 0) + 1
      }
    })
    return map
  }, [correctiveActions])

  const caByExternalAudit = useMemo(() => {
    const map: Record<string, number> = {}
    correctiveActions.forEach((ca) => {
      if (ca.external_audit_id) {
        map[ca.external_audit_id] = (map[ca.external_audit_id] || 0) + 1
      }
    })
    return map
  }, [correctiveActions])

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando auditorias...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50/50 via-white to-pink-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-lg shadow-black/5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0">
                <ClipboardCheck className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                  Auditorias
                </h1>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                  Auditorias internas y externas del sistema de gestion de calidad
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab Toggle */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex bg-white/60 dark:bg-white/5 backdrop-blur-2xl rounded-2xl p-1 border border-white/20 dark:border-white/10 shadow-sm self-start w-fit">
            <button
              onClick={() => setTab("internas")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] ${
                tab === "internas"
                  ? "bg-white dark:bg-white/15 shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              Internas
              <span className="text-xs bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full">{internalAudits.length}</span>
            </button>
            <button
              onClick={() => setTab("externas")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] ${
                tab === "externas"
                  ? "bg-white dark:bg-white/15 shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              Externas
              <span className="text-xs bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full">{externalAudits.length}</span>
            </button>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {tab === "internas" ? (
            <motion.div key="internas" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
              {/* New Internal Button */}
              <div className="flex justify-end">
                <Button
                  onClick={() => setShowNewInternal(true)}
                  className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-md shadow-rose-500/30 hover:shadow-lg active:scale-95 transition-all duration-150 h-12 px-6 font-semibold"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Nueva Auditoria Interna
                </Button>
              </div>

              {/* New Internal Dialog */}
              <AnimatePresence>
                {showNewInternal && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg overflow-hidden"
                  >
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nueva Auditoria Interna</h3>
                        <button onClick={() => setShowNewInternal(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10">
                          <X className="w-5 h-5 text-gray-400" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Titulo</Label>
                          <Input
                            value={iaTitle}
                            onChange={(e) => setIaTitle(e.target.value)}
                            placeholder="Ej: Auditoria mensual marzo 2026"
                            className="bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Fecha</Label>
                          <Input
                            type="date"
                            value={iaDate}
                            onChange={(e) => setIaDate(e.target.value)}
                            className="bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Nivel de Verificacion</Label>
                          <Select value={iaChecklistId} onValueChange={setIaChecklistId}>
                            <SelectTrigger className="bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {checklists.map((cl) => {
                                const config = LEVEL_CONFIG[cl.level]
                                return (
                                  <SelectItem key={cl.id} value={cl.id}>
                                    <span className="flex items-center gap-2">
                                      {cl.name}
                                      <span className="text-xs text-gray-400">({config.items})</span>
                                    </span>
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Checklist level cards */}
                      {checklists.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                          {checklists.map((cl) => {
                            const config = LEVEL_CONFIG[cl.level]
                            const isSelected = iaChecklistId === cl.id
                            return (
                              <button
                                key={cl.id}
                                onClick={() => setIaChecklistId(cl.id)}
                                className={`text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
                                  isSelected
                                    ? "border-rose-500 bg-rose-50/50 dark:bg-rose-500/10 shadow-md"
                                    : "border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/5 hover:border-gray-300"
                                }`}
                              >
                                <Badge className={`${config.color} border-0 text-xs mb-2`}>{config.label}</Badge>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{cl.name}</p>
                                <p className="text-xs text-gray-500 mt-1">{(cl.items as any[]).length} preguntas</p>
                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{cl.description}</p>
                              </button>
                            )
                          })}
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <Button variant="ghost" onClick={() => setShowNewInternal(false)} className="rounded-xl h-12 px-6">Cancelar</Button>
                        <Button
                          onClick={handleCreateInternal}
                          disabled={submitting || !iaTitle || !iaChecklistId}
                          className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl h-12 px-8 font-semibold shadow-md shadow-rose-500/30 active:scale-95 transition-all duration-150"
                        >
                          {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ClipboardCheck className="w-5 h-5 mr-2" />}
                          Iniciar Auditoria
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Internal Audits List */}
              {internalAudits.length === 0 ? (
                <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-12 text-center">
                  <ClipboardCheck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No hay auditorias internas registradas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {internalAudits.map((audit, i) => {
                    const levelConfig = LEVEL_CONFIG[audit.audit_checklists?.level || "basica"]
                    const statusConfig = STATUS_CONFIG[audit.status]
                    const caCount = caByInternalAudit[audit.id] || 0
                    return (
                      <motion.div
                        key={audit.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl p-5 hover:shadow-md transition-all duration-200 group"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white truncate">{audit.title}</h3>
                              <Badge className={`${levelConfig.color} border-0 text-[10px]`}>{levelConfig.label}</Badge>
                              <Badge className={`${statusConfig.color} border-0 text-[10px]`}>{statusConfig.label}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {format(new Date(audit.audit_date), "d MMM yyyy", { locale: es })}
                              </span>
                              {audit.overall_score != null && (
                                <span className={`font-semibold ${audit.overall_score >= 80 ? "text-green-600" : audit.overall_score >= 60 ? "text-amber-600" : "text-red-600"}`}>
                                  {audit.overall_score}% conforme
                                </span>
                              )}
                              {caCount > 0 && (
                                <span className="flex items-center gap-1 text-rose-500">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  {caCount} acciones correctivas
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowNewCA({ auditType: "internal", auditId: audit.id })}
                              className="text-xs text-rose-500 hover:text-rose-600 rounded-lg"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Accion Correctiva
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/qms/auditorias/internas/${audit.id}`)}
                              className="text-xs rounded-lg"
                            >
                              {audit.status === "en_progreso" ? "Continuar" : "Ver"}
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="externas" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
              {/* New External Button */}
              <div className="flex justify-end">
                <Button
                  onClick={() => setShowNewExternal(true)}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/30 hover:shadow-lg active:scale-95 transition-all duration-150 h-12 px-6 font-semibold"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Nueva Auditoria Externa
                </Button>
              </div>

              {/* New External Dialog */}
              <AnimatePresence>
                {showNewExternal && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg overflow-hidden"
                  >
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nueva Auditoria Externa</h3>
                        <button onClick={() => setShowNewExternal(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10">
                          <X className="w-5 h-5 text-gray-400" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Titulo</Label>
                          <Input
                            value={eaTitle}
                            onChange={(e) => setEaTitle(e.target.value)}
                            placeholder="Ej: Auditoria cliente OXXO"
                            className="bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Fecha</Label>
                          <Input
                            type="date"
                            value={eaDate}
                            onChange={(e) => setEaDate(e.target.value)}
                            className="bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Auditor</Label>
                          <Input
                            value={eaAuditor}
                            onChange={(e) => setEaAuditor(e.target.value)}
                            placeholder="Nombre del auditor externo"
                            className="bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Organizacion</Label>
                          <Input
                            value={eaOrg}
                            onChange={(e) => setEaOrg(e.target.value)}
                            placeholder="Empresa u organizacion"
                            className="bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Observaciones</Label>
                          <Textarea
                            value={eaObs}
                            onChange={(e) => setEaObs(e.target.value)}
                            placeholder="Observaciones generales..."
                            className="bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 rounded-xl text-base min-h-[48px]"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button variant="ghost" onClick={() => setShowNewExternal(false)} className="rounded-xl h-12 px-6">Cancelar</Button>
                        <Button
                          onClick={handleCreateExternal}
                          disabled={submitting || !eaTitle}
                          className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl h-12 px-8 font-semibold shadow-md shadow-indigo-500/30 active:scale-95 transition-all duration-150"
                        >
                          {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ExternalLink className="w-5 h-5 mr-2" />}
                          Crear Auditoria
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* External Audits List */}
              {externalAudits.length === 0 ? (
                <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-12 text-center">
                  <ExternalLink className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No hay auditorias externas registradas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {externalAudits.map((audit, i) => {
                    const statusConfig = STATUS_CONFIG[audit.status]
                    const caCount = caByExternalAudit[audit.id] || 0
                    return (
                      <motion.div
                        key={audit.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl p-5 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white truncate">{audit.title}</h3>
                              <Badge className={`${statusConfig.color} border-0 text-[10px]`}>{statusConfig.label}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {format(new Date(audit.audit_date), "d MMM yyyy", { locale: es })}
                              </span>
                              {audit.auditor_name && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5" />
                                  {audit.auditor_name}
                                </span>
                              )}
                              {audit.organization && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3.5 h-3.5" />
                                  {audit.organization}
                                </span>
                              )}
                              {caCount > 0 && (
                                <span className="flex items-center gap-1 text-rose-500">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  {caCount} acciones correctivas
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowNewCA({ auditType: "external", auditId: audit.id })}
                              className="text-xs text-rose-500 hover:text-rose-600 rounded-lg"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Accion Correctiva
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/qms/auditorias/externas/${audit.id}`)}
                              className="text-xs rounded-lg"
                            >
                              Ver
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Corrective Action Dialog */}
        <AnimatePresence>
          {showNewCA && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-[60]" onClick={() => !submitting && setShowNewCA(null)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-x-4 top-[10vh] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-[61] bg-white dark:bg-gray-900 rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.2)]"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nueva Accion Correctiva</h3>
                    <button onClick={() => !submitting && setShowNewCA(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10">
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Programa asociado <span className="text-red-400">*</span></Label>
                      <Select value={caProgramId} onValueChange={setCaProgramId}>
                        <SelectTrigger className="bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base">
                          <SelectValue placeholder="Seleccionar programa..." />
                        </SelectTrigger>
                        <SelectContent>
                          {programs.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Descripcion <span className="text-red-400">*</span></Label>
                      <Textarea
                        value={caDescription}
                        onChange={(e) => setCaDescription(e.target.value)}
                        placeholder="Describir la no conformidad y accion correctiva requerida..."
                        className="bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 rounded-xl text-base min-h-[80px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Fecha programada</Label>
                        <Input
                          type="date"
                          value={caDate}
                          onChange={(e) => setCaDate(e.target.value)}
                          className="bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Prioridad</Label>
                        <Select value={caPriority} onValueChange={setCaPriority}>
                          <SelectTrigger className="bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 rounded-xl h-12 text-base">
                            <SelectValue />
                          </SelectTrigger>
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
                    <Button variant="ghost" onClick={() => !submitting && setShowNewCA(null)} disabled={submitting} className="rounded-xl h-12 px-6 flex-1 sm:flex-none">Cancelar</Button>
                    <Button
                      onClick={handleCreateCA}
                      disabled={submitting || !caDescription || !caProgramId}
                      className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl h-12 px-8 font-semibold shadow-md shadow-rose-500/30 active:scale-95 transition-all duration-150 flex-1"
                    >
                      {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <AlertTriangle className="w-5 h-5 mr-2" />}
                      Crear Accion
                    </Button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
