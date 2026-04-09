"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useQMSPrograms, SanitationProgram } from "@/hooks/use-qms-programs"
import { useQMSPqrs, Pqrs, PqrsStatus, PqrsType, PqrsAttachment } from "@/hooks/use-qms-pqrs"
import { useAuth } from "@/contexts/AuthContext"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { ProgramDocumentModal } from "@/components/qms/ProgramDocumentModal"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  MessageSquareWarning,
  FileText,
  Loader2,
  Inbox,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  Save,
  Send,
  Upload,
  X,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  Copy,
  Link2,
  Eye,
  Package,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const STATUS_CONFIG: Record<PqrsStatus, { label: string; color: string; icon: React.ElementType }> = {
  recibida: { label: "Recibida", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Inbox },
  en_revision: { label: "En Revision", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
  en_progreso: { label: "En Progreso", color: "bg-orange-100 text-orange-700 border-orange-200", icon: AlertCircle },
  resuelta: { label: "Resuelta", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  cerrada: { label: "Cerrada", color: "bg-gray-100 text-gray-700 border-gray-200", icon: CheckCircle2 },
}

const TYPE_CONFIG: Record<PqrsType, { label: string; emoji: string }> = {
  peticion: { label: "Peticion", emoji: "📋" },
  queja: { label: "Queja", emoji: "😟" },
  reclamo: { label: "Reclamo", emoji: "⚠️" },
  sugerencia: { label: "Sugerencia", emoji: "💡" },
}

const RESOLUTION_METHODS = [
  "Reemplazo de producto",
  "Devolucion de dinero",
  "Mejora de proceso",
  "Capacitacion al personal",
  "Accion correctiva en produccion",
  "Respuesta informativa",
  "Otro",
]

export default function PqrsPage() {
  const { getProgramByCode, updateProgram } = useQMSPrograms()
  const { loading, getPqrsList, getPqrsById, updatePqrs, uploadAttachment, deleteAttachment, finalizePqrs } = useQMSPqrs()
  const { user } = useAuth()

  const [program, setProgram] = useState<SanitationProgram | null>(null)
  const [pqrsList, setPqrsList] = useState<Pqrs[]>([])
  const [selectedPqrs, setSelectedPqrs] = useState<Pqrs | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("todas")
  const [showDocument, setShowDocument] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  // Resolution form state
  const [resolutionNotes, setResolutionNotes] = useState("")
  const [resolutionMethod, setResolutionMethod] = useState("")
  const [actionPlan, setActionPlan] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const prog = await getProgramByCode("pqrs")
    if (prog) setProgram(prog)
    const list = await getPqrsList()
    setPqrsList(list)
  }

  const handleSelectPqrs = async (pqrs: Pqrs) => {
    const fresh = await getPqrsById(pqrs.id)
    if (fresh) {
      setSelectedPqrs(fresh)
      setResolutionNotes(fresh.resolution_notes || "")
      setResolutionMethod(fresh.resolution_method || "")
      setActionPlan(fresh.action_plan || "")

      // If just received, mark as en_revision
      if (fresh.status === "recibida") {
        await updatePqrs(fresh.id, { status: "en_revision" })
        fresh.status = "en_revision"
        setPqrsList(prev => prev.map(p => p.id === fresh.id ? { ...p, status: "en_revision" } : p))
      }
    }
  }

  const handleSaveDraft = async () => {
    if (!selectedPqrs) return
    setSaving(true)
    const updated = await updatePqrs(selectedPqrs.id, {
      resolution_notes: resolutionNotes,
      resolution_method: resolutionMethod,
      action_plan: actionPlan,
      status: "en_progreso" as PqrsStatus,
    })
    if (updated) {
      setSelectedPqrs({ ...selectedPqrs, ...updated })
      setPqrsList(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
    }
    setSaving(false)
  }

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedPqrs || !e.target.files) return
    const files = Array.from(e.target.files)
    for (const file of files) {
      const att = await uploadAttachment(selectedPqrs.id, file, true, user?.id)
      if (att) {
        setSelectedPqrs(prev => prev ? {
          ...prev,
          pqrs_attachments: [...(prev.pqrs_attachments || []), att],
        } : prev)
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDeleteAttachment = async (att: PqrsAttachment) => {
    if (!selectedPqrs) return
    const ok = await deleteAttachment(att.id, att.file_url)
    if (ok) {
      setSelectedPqrs(prev => prev ? {
        ...prev,
        pqrs_attachments: prev.pqrs_attachments?.filter(a => a.id !== att.id),
      } : prev)
    }
  }

  const handleFinalize = async () => {
    if (!selectedPqrs || !user) return

    // First save draft
    await handleSaveDraft()

    setSendingEmail(true)
    try {
      // Finalize PQRS
      const finalized = await finalizePqrs(selectedPqrs.id, user.id)
      if (!finalized) throw new Error("Error al finalizar")

      // Send email via API
      const res = await fetch("/api/pqrs/send-resolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pqrsId: selectedPqrs.id }),
      })

      if (res.ok) {
        await updatePqrs(selectedPqrs.id, {
          resolution_email_sent: true,
          resolution_email_sent_at: new Date().toISOString(),
        })
        toast.success("PQRS finalizada y correo enviado al cliente")
      } else {
        // PQRS finalized but email failed
        toast.warning("PQRS finalizada pero no se pudo enviar el correo. Intentalo de nuevo.")
      }

      // Refresh
      const list = await getPqrsList()
      setPqrsList(list)
      setSelectedPqrs(null)
    } catch (err) {
      console.error(err)
      toast.error("Error al finalizar PQRS")
    } finally {
      setSendingEmail(false)
    }
  }

  const handleSaveDocument = async (content: string) => {
    if (!program) return
    await updateProgram(program.id, { program_document: content })
    setProgram(prev => prev ? { ...prev, program_document: content } : prev)
  }

  const filteredList = useMemo(() => {
    if (filterStatus === "todas") return pqrsList
    return pqrsList.filter(p => p.status === filterStatus)
  }, [pqrsList, filterStatus])

  const counts = useMemo(() => {
    const c: Record<string, number> = { todas: pqrsList.length }
    pqrsList.forEach(p => { c[p.status] = (c[p.status] || 0) + 1 })
    return c
  }, [pqrsList])

  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/pqrs/nuevo`
    : "/pqrs/nuevo"

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicUrl)
    toast.success("Link copiado al portapapeles")
  }

  // Detail View
  if (selectedPqrs) {
    const clientAttachments = selectedPqrs.pqrs_attachments?.filter(a => !a.is_resolution) || []
    const resolutionAttachments = selectedPqrs.pqrs_attachments?.filter(a => a.is_resolution) || []
    const statusCfg = STATUS_CONFIG[selectedPqrs.status]
    const typeCfg = TYPE_CONFIG[selectedPqrs.pqrs_type]
    const isResolved = selectedPqrs.status === "resuelta" || selectedPqrs.status === "cerrada"

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50/50 via-white to-orange-50/30 dark:from-gray-950 dark:via-red-950/10 dark:to-gray-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
          {/* Back button */}
          <button
            onClick={() => setSelectedPqrs(null)}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a la lista
          </button>

          {/* Header */}
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-6 shadow-lg shadow-black/5">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-2xl">{typeCfg.emoji}</span>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {typeCfg.label} #{selectedPqrs.id.substring(0, 8)}
                  </h1>
                  <Badge className={cn("border", statusCfg.color)}>
                    {statusCfg.label}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">
                  {format(new Date(selectedPqrs.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Client info & description */}
            <div className="lg:col-span-1 space-y-4">
              {/* Client Card */}
              <div className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <User className="w-4 h-4" /> Cliente
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-gray-900 dark:text-white">{selectedPqrs.client_name}</p>
                  <p className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-3.5 h-3.5" /> {selectedPqrs.client_email}
                  </p>
                  {selectedPqrs.client_phone && (
                    <p className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-3.5 h-3.5" /> {selectedPqrs.client_phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Product Card */}
              {selectedPqrs.product_name && (
                <div className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Package className="w-4 h-4" /> Producto
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-gray-900 dark:text-white">{selectedPqrs.product_name}</p>
                    {selectedPqrs.product_lot && (
                      <p className="text-gray-600">Lote: {selectedPqrs.product_lot}</p>
                    )}
                    {selectedPqrs.expiry_date && (
                      <p className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-3.5 h-3.5" /> Vence: {format(new Date(selectedPqrs.expiry_date), "dd/MM/yyyy")}
                      </p>
                    )}
                    {selectedPqrs.purchase_date && (
                      <p className="text-gray-600">Compra: {format(new Date(selectedPqrs.purchase_date), "dd/MM/yyyy")}</p>
                    )}
                    {selectedPqrs.purchase_location && (
                      <p className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-3.5 h-3.5" /> {selectedPqrs.purchase_location}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Client Description */}
              <div className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Descripcion del cliente</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedPqrs.description}</p>
              </div>

              {/* Client Attachments */}
              {clientAttachments.length > 0 && (
                <div className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Archivos del cliente</h3>
                  <div className="space-y-2">
                    {clientAttachments.map(att => (
                      <a
                        key={att.id}
                        href={att.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-sm"
                      >
                        {att.file_type?.startsWith("image") ? (
                          <ImageIcon className="w-4 h-4 text-blue-500" />
                        ) : (
                          <FileText className="w-4 h-4 text-orange-500" />
                        )}
                        <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{att.file_name}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Resolution */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-6 space-y-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Resolucion</h3>

                {/* Resolution Method */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Metodo de resolucion</label>
                  <select
                    value={resolutionMethod}
                    onChange={e => setResolutionMethod(e.target.value)}
                    disabled={isResolved}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all disabled:opacity-60"
                  >
                    <option value="">Seleccionar metodo...</option>
                    {RESOLUTION_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Action Plan */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Plan de accion</label>
                  <textarea
                    value={actionPlan}
                    onChange={e => setActionPlan(e.target.value)}
                    rows={3}
                    disabled={isResolved}
                    placeholder="Describe las acciones a tomar para resolver esta PQRS..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all resize-none disabled:opacity-60"
                  />
                </div>

                {/* Resolution Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notas de resolucion (se envian al cliente)</label>
                  <textarea
                    value={resolutionNotes}
                    onChange={e => setResolutionNotes(e.target.value)}
                    rows={5}
                    disabled={isResolved}
                    placeholder="Describe la resolucion que se le comunicara al cliente..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all resize-none disabled:opacity-60"
                  />
                </div>

                {/* Resolution Evidence */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Evidencias de resolucion</label>
                  {!isResolved && (
                    <>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm text-gray-600 hover:border-red-400 hover:text-red-600 transition-all"
                      >
                        <Upload className="w-4 h-4" />
                        Subir evidencia
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={handleUploadEvidence}
                        className="hidden"
                      />
                    </>
                  )}
                  {resolutionAttachments.length > 0 && (
                    <div className="space-y-2">
                      {resolutionAttachments.map(att => (
                        <div key={att.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-white/5">
                          {att.file_type?.startsWith("image") ? (
                            <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-orange-500 flex-shrink-0" />
                          )}
                          <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-gray-700 truncate hover:text-red-600">
                            {att.file_name}
                          </a>
                          {!isResolved && (
                            <button onClick={() => handleDeleteAttachment(att)} className="text-gray-400 hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {!isResolved && (
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={handleSaveDraft}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Guardar borrador
                    </button>
                    <button
                      onClick={handleFinalize}
                      disabled={sendingEmail || !resolutionNotes.trim() || !resolutionMethod}
                      className={cn(
                        "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
                        resolutionNotes.trim() && resolutionMethod
                          ? "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/25"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      {sendingEmail ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Finalizando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Finalizar y enviar
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Sent confirmation */}
                {isResolved && selectedPqrs.resolution_email_sent && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-sm text-green-700 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Correo de resolucion enviado el{" "}
                    {selectedPqrs.resolution_email_sent_at
                      ? format(new Date(selectedPqrs.resolution_email_sent_at), "d/MM/yyyy HH:mm")
                      : ""}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // List View
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50/50 via-white to-orange-50/30 dark:from-gray-950 dark:via-red-950/10 dark:to-gray-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-lg shadow-black/5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/30 shrink-0">
                <MessageSquareWarning className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                  PQRS
                </h1>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                  Peticiones, Quejas, Reclamos y Sugerencias de clientes
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
                  onClick={copyPublicLink}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors shadow-sm shadow-red-500/25"
                >
                  <Link2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Copiar link publico</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(["todas", "recibida", "en_revision", "en_progreso", "resuelta"] as const).map(status => {
            const cfg = status === "todas"
              ? { label: "Total", color: "bg-gray-100 text-gray-700", icon: MessageSquareWarning }
              : STATUS_CONFIG[status]
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "p-3 rounded-2xl border transition-all text-left",
                  filterStatus === status
                    ? "bg-white dark:bg-white/10 border-red-200 dark:border-red-800 shadow-md"
                    : "bg-white/40 dark:bg-white/5 border-transparent hover:bg-white/60"
                )}
              >
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{counts[status] || 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">{cfg.label}</p>
              </button>
            )
          })}
        </div>

        {/* PQRS List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Inbox className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-gray-500">No hay PQRS registradas</p>
              <p className="text-sm text-gray-400">Comparte el link publico con tus clientes para recibir solicitudes</p>
            </div>
          ) : (
            filteredList.map(pqrs => {
              const statusCfg = STATUS_CONFIG[pqrs.status]
              const typeCfg = TYPE_CONFIG[pqrs.pqrs_type]
              return (
                <motion.div
                  key={pqrs.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <button
                    onClick={() => handleSelectPqrs(pqrs)}
                    className="w-full bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-4 sm:p-5 text-left hover:bg-white/80 dark:hover:bg-white/10 transition-all shadow-sm hover:shadow-md group"
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-2xl mt-0.5">{typeCfg.emoji}</span>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-white text-sm">
                            {typeCfg.label} - {pqrs.client_name}
                          </span>
                          <Badge className={cn("border text-xs", statusCfg.color)}>
                            {statusCfg.label}
                          </Badge>
                        </div>
                        {pqrs.product_name && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Package className="w-3 h-3" /> {pqrs.product_name}
                            {pqrs.product_lot && <span className="ml-1">| Lote: {pqrs.product_lot}</span>}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {pqrs.description}
                        </p>
                        <p className="text-xs text-gray-400">
                          {format(new Date(pqrs.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors mt-1" />
                    </div>
                  </button>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* Program Document Modal */}
      {program && (
        <ProgramDocumentModal
          open={showDocument}
          onClose={() => setShowDocument(false)}
          programName={program.name}
          content={program.program_document || ""}
          onSave={handleSaveDocument}
        />
      )}
    </div>
  )
}
