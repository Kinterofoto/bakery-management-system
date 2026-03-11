"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ExternalLink,
  Loader2,
  ChevronLeft,
  AlertTriangle,
  Plus,
  X,
  Calendar,
  User,
  Building2,
  CheckCircle2,
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

import { useQMSAudits, type ExternalAudit } from "@/hooks/use-qms-audits"
import { useQMSCorrectiveActions, type CorrectiveAction } from "@/hooks/use-qms-corrective-actions"
import { useQMSPrograms, type SanitationProgram } from "@/hooks/use-qms-programs"

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  baja: { label: "Baja", color: "bg-gray-100 text-gray-700" },
  media: { label: "Media", color: "bg-amber-100 text-amber-800" },
  alta: { label: "Alta", color: "bg-orange-100 text-orange-800" },
  critica: { label: "Critica", color: "bg-red-100 text-red-800" },
}

export default function ExternalAuditDetailPage() {
  const params = useParams()
  const router = useRouter()
  const auditId = params.id as string

  const { getExternalAudits, updateExternalAudit } = useQMSAudits()
  const { getCorrectiveActions, createCorrectiveAction, updateCorrectiveAction, completeCorrectiveAction } = useQMSCorrectiveActions()
  const { getPrograms } = useQMSPrograms()

  const [audit, setAudit] = useState<ExternalAudit | null>(null)
  const [programs, setPrograms] = useState<SanitationProgram[]>([])
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // New CA
  const [showNewCA, setShowNewCA] = useState(false)
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
      const [audits, progs, cas] = await Promise.all([
        getExternalAudits(),
        getPrograms(),
        getCorrectiveActions({ externalAuditId: auditId }),
      ])
      const found = audits.find((a) => a.id === auditId) || null
      setAudit(found)
      setPrograms(progs)
      setCorrectiveActions(cas)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCA = async () => {
    if (!caDescription || !caProgramId) return
    setSaving(true)
    try {
      await createCorrectiveAction({
        program_id: caProgramId,
        external_audit_id: auditId,
        description: caDescription,
        scheduled_date: caDate || undefined,
        priority: caPriority,
      })
      setShowNewCA(false)
      setCaDescription("")
      setCaProgramId("")
      setCaDate("")
      setCaPriority("media")
      const cas = await getCorrectiveActions({ externalAuditId: auditId })
      setCorrectiveActions(cas)
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const handleCompleteCA = async (caId: string) => {
    setSaving(true)
    try {
      await completeCorrectiveAction(caId)
      const cas = await getCorrectiveActions({ externalAuditId: auditId })
      setCorrectiveActions(cas)
    } finally {
      setSaving(false)
    }
  }

  const handleCloseAudit = async () => {
    if (!audit) return
    setSaving(true)
    try {
      await updateExternalAudit(auditId, { status: "cerrada" })
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
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
                  <Badge className={`border-0 text-xs ${
                    audit.status === "en_progreso" ? "bg-blue-100 text-blue-800" :
                    audit.status === "completada" ? "bg-green-100 text-green-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {audit.status === "en_progreso" ? "En Progreso" : audit.status === "completada" ? "Completada" : "Cerrada"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(audit.audit_date), "d 'de' MMMM yyyy", { locale: es })}
                  </span>
                  {audit.auditor_name && (
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {audit.auditor_name}
                    </span>
                  )}
                  {audit.organization && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      {audit.organization}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {audit.observations && (
              <div className="mt-3 p-3 bg-gray-50/80 dark:bg-white/5 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400">{audit.observations}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Corrective Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200/30 dark:border-white/10 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Acciones Correctivas ({correctiveActions.length})
              </h2>
              {audit.status !== "cerrada" && (
                <Button
                  onClick={() => setShowNewCA(true)}
                  size="sm"
                  className="bg-rose-500 hover:bg-rose-600 text-white rounded-lg shadow-sm text-xs h-9 px-4"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar
                </Button>
              )}
            </div>

            <div className="p-4 space-y-3">
              {correctiveActions.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No hay acciones correctivas</p>
                  <p className="text-xs text-gray-400 mt-1">Agrega acciones correctivas derivadas de esta auditoria</p>
                </div>
              ) : (
                correctiveActions.map((ca) => {
                  const priorityConfig = PRIORITY_CONFIG[ca.priority] || PRIORITY_CONFIG.media
                  return (
                    <div key={ca.id} className="bg-white/50 dark:bg-white/5 rounded-2xl p-4 border border-white/20 dark:border-white/5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-gray-800 dark:text-gray-200 flex-1">{ca.description}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge className={`border-0 text-[10px] ${priorityConfig.color}`}>{priorityConfig.label}</Badge>
                          <Badge className={`border-0 text-[10px] ${
                            ca.status === "completada" ? "bg-green-100 text-green-800" :
                            ca.status === "vencida" ? "bg-red-100 text-red-800" :
                            ca.status === "en_progreso" ? "bg-blue-100 text-blue-800" :
                            "bg-amber-100 text-amber-800"
                          }`}>
                            {ca.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                        {ca.sanitation_programs && (
                          <Badge className="text-[10px] border-0 bg-gray-100 text-gray-700">{ca.sanitation_programs.name}</Badge>
                        )}
                        {ca.scheduled_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(ca.scheduled_date), "d MMM yyyy", { locale: es })}
                          </span>
                        )}
                      </div>
                      {ca.status !== "completada" && ca.status !== "vencida" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCompleteCA(ca.id)}
                          disabled={saving}
                          className="text-xs text-green-600 hover:text-green-700 rounded-lg h-8"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Completar
                        </Button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </motion.div>

        {/* Close audit */}
        {audit.status !== "cerrada" && (
          <div className="flex justify-end">
            <Button
              onClick={handleCloseAudit}
              disabled={saving}
              variant="outline"
              className="rounded-xl h-12 px-6"
            >
              Cerrar Auditoria
            </Button>
          </div>
        )}

        {/* New CA Dialog */}
        {showNewCA && (
          <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" onClick={() => setShowNewCA(false)} />
            <div className="fixed inset-x-4 top-[10vh] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-[60] bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-white/30 rounded-3xl shadow-2xl">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nueva Accion Correctiva</h3>
                  <button onClick={() => setShowNewCA(false)} className="p-2 rounded-xl hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
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
                    <Textarea value={caDescription} onChange={(e) => setCaDescription(e.target.value)} placeholder="Describir hallazgo y accion correctiva..." className="bg-white/50 border-gray-200/50 rounded-xl text-base min-h-[80px]" />
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
                  <Button variant="ghost" onClick={() => setShowNewCA(false)} className="rounded-xl h-12 px-6">Cancelar</Button>
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
