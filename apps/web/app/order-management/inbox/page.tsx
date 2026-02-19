"use client"

import { useState, useEffect, useCallback, useMemo, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Sidebar } from "@/components/layout/sidebar"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Mail,
  Search,
  Inbox,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Package,
  RefreshCw,
  Building2,
  MessageSquare,
  CalendarDays,
  MapPin,
  UserCheck,
  UserX,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns"
import { es } from "date-fns/locale"
import {
  getEmailLogs,
  getEmailDetail,
  getEmailStats,
  approveEmail,
  type EmailLog,
  type EmailDetail,
  type EmailStats,
  type ClientMatch,
  type BranchMatch,
  type ApproveResult,
} from "./actions"

// === Helpers ===

function statusDot(status: string) {
  const colors: Record<string, string> = {
    processed: "bg-emerald-400",
    pending: "bg-amber-400",
    error: "bg-red-400",
    approved: "bg-blue-400",
  }
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[status] || "bg-gray-300"}`} />
}

function statusLabel(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    processed: { label: "Procesado", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    pending: { label: "Pendiente", className: "bg-amber-50 text-amber-700 border-amber-200" },
    error: { label: "Error", className: "bg-red-50 text-red-700 border-red-200" },
    approved: { label: "Aprobado", className: "bg-blue-50 text-blue-700 border-blue-200" },
  }
  const s = map[status] || { label: status, className: "" }
  return <Badge variant="outline" className={`text-[10px] font-medium px-1.5 py-0 ${s.className}`}>{s.label}</Badge>
}

function smartDate(dateStr: string) {
  try {
    const d = new Date(dateStr)
    if (isToday(d)) return format(d, "HH:mm")
    if (isYesterday(d)) return "Ayer"
    return format(d, "d MMM", { locale: es })
  } catch {
    return ""
  }
}

function fullDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "EEEE d 'de' MMMM yyyy, HH:mm", { locale: es })
  } catch {
    return dateStr
  }
}

function relativeDate(dateStr: string) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es })
  } catch {
    return ""
  }
}

// Extract initials from email
function emailInitials(email: string) {
  if (!email) return "?"
  const name = email.split("@")[0]
  const parts = name.split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

// Deterministic color from string
function avatarColor(str: string) {
  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-rose-500",
    "bg-amber-500", "bg-cyan-500", "bg-indigo-500", "bg-pink-500",
    "bg-teal-500", "bg-orange-500",
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function extractClientMatch(logs?: Record<string, unknown>[]): ClientMatch | null {
  if (!logs) return null
  const step = logs.find((l) => l.step === "match_client")
  if (!step) return null
  return {
    status: step.status as ClientMatch["status"],
    matched_content: step.matched_content as string | undefined,
    match_type: step.match_type as string | undefined,
    similarity: step.similarity as number | undefined,
  }
}

function extractBranchMatch(logs?: Record<string, unknown>[]): BranchMatch | null {
  if (!logs) return null
  const step = logs.find((l) => l.step === "match_branch")
  if (!step) return null
  return {
    status: step.status as BranchMatch["status"],
    branch_name: step.branch_name as string | undefined,
    confidence: step.confidence as string | undefined,
    similarity: step.similarity as number | undefined,
  }
}

// === Component ===

export default function InboxPage() {
  const [emails, setEmails] = useState<EmailLog[]>([])
  const [stats, setStats] = useState<EmailStats | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<EmailDetail | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showDetail, setShowDetail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [approving, setApproving] = useState(false)
  const [approveResult, setApproveResult] = useState<ApproveResult | null>(null)
  const [approveError, setApproveError] = useState<string | null>(null)

  const loadInitialData = useCallback(async () => {
    setLoadingList(true)
    setError(null)
    const [emailsRes, statsRes] = await Promise.all([
      getEmailLogs(),
      getEmailStats(),
    ])
    if (emailsRes.data) setEmails(emailsRes.data)
    if (emailsRes.error) setError(emailsRes.error)
    if (statsRes.data) setStats(statsRes.data)
    setLoadingList(false)
  }, [])

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true)
    const { data } = await getEmailDetail(id)
    if (data) setDetail(data)
    setLoadingDetail(false)
  }, [])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setShowDetail(true)
    setApproveResult(null)
    setApproveError(null)
    startTransition(() => { loadDetail(id) })
  }

  const handleRefresh = () => {
    startTransition(() => { loadInitialData() })
  }

  const handleApproveConfirm = async () => {
    if (!selectedId || !detail) return
    setApproving(true)
    setApproveError(null)
    const { data, error: err } = await approveEmail(selectedId)
    setApproving(false)
    if (err) {
      setApproveError(err)
      return
    }
    if (data) {
      setApproveResult(data)
      setApproveDialogOpen(false)
      // Update local detail status
      setDetail((prev) => prev ? { ...prev, status: "approved", order_number: data.order_number } as EmailDetail : prev)
      // Update list item
      setEmails((prev) =>
        prev.map((e) =>
          e.id === selectedId ? { ...e, status: "approved", order_number: data.order_number } : e
        )
      )
    }
  }

  const filtered = useMemo(() => {
    if (!searchQuery) return emails
    const q = searchQuery.toLowerCase()
    return emails.filter((e) =>
      e.email_subject?.toLowerCase().includes(q) ||
      e.email_from?.toLowerCase().includes(q) ||
      e.cliente?.toLowerCase().includes(q) ||
      e.oc_number?.toLowerCase().includes(q)
    )
  }, [emails, searchQuery])

  return (
    <RouteGuard allowedRoles={['admin', 'commercial', 'super_admin', 'administrator', 'coordinador_logistico']}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b bg-white px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-sky-100">
                  <Mail className="h-4 w-4 text-sky-600" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-gray-900 leading-tight">Inbox OC</h1>
                  {stats && (
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      <span>{stats.total_orders} correos</span>
                      <span className="text-emerald-500">{stats.by_status?.processed || 0} procesados</span>
                      {(stats.by_status?.pending || 0) > 0 && (
                        <span className="text-amber-500">{stats.by_status.pending} pendientes</span>
                      )}
                      {stats.last_24_hours > 0 && (
                        <span className="text-sky-500">{stats.last_24_hours} nuevos hoy</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Email list */}
            <div className={`${showDetail ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[360px] lg:w-[400px] border-r bg-white`}>
              {/* Search */}
              <div className="px-3 py-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
                  <Input
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs bg-gray-50 border-gray-200 focus:bg-white"
                  />
                </div>
              </div>

              {/* List */}
              <ScrollArea className="flex-1">
                {error ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <AlertCircle className="h-10 w-10 mb-2 text-red-300" />
                    <p className="text-xs font-medium text-red-400">Error al cargar</p>
                    <p className="text-[11px] mt-1 text-center px-6 text-gray-400">{error}</p>
                    <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" onClick={handleRefresh}>
                      Reintentar
                    </Button>
                  </div>
                ) : loadingList ? (
                  <div className="divide-y">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-3">
                        <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3 w-2/3" />
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-2.5 w-1/3" />
                        </div>
                        <Skeleton className="h-3 w-10" />
                      </div>
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                    <Inbox className="h-10 w-10 mb-2" />
                    <p className="text-xs font-medium text-gray-400">
                      {searchQuery ? "Sin resultados" : "Sin correos"}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filtered.map((email) => {
                      const isSelected = selectedId === email.id
                      return (
                        <button
                          key={email.id}
                          onClick={() => handleSelect(email.id)}
                          className={`w-full text-left flex items-start gap-3 px-3 py-2.5 transition-colors
                            ${isSelected
                              ? "bg-sky-50 border-l-[3px] border-l-sky-500 pl-[9px]"
                              : "hover:bg-gray-50 border-l-[3px] border-l-transparent pl-[9px]"
                            }`}
                        >
                          {/* Avatar */}
                          <div className={`h-9 w-9 rounded-full ${avatarColor(email.email_from || "")} flex items-center justify-center shrink-0 mt-0.5`}>
                            <span className="text-[11px] font-semibold text-white leading-none">
                              {emailInitials(email.email_from || "")}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[13px] truncate ${isSelected ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                                {email.email_from?.split("@")[0] || "Sin remitente"}
                              </span>
                              <span className="text-[11px] text-gray-400 shrink-0 tabular-nums">
                                {smartDate(email.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 truncate mt-0.5 leading-snug">
                              {email.email_subject || "Sin asunto"}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              {statusDot(email.status)}
                              {email.cliente && (
                                <span className="text-[11px] text-gray-400 truncate">
                                  {email.cliente}
                                </span>
                              )}
                              {email.status === "processed" && email.cliente && !email.cliente_id && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-[16px] font-medium text-red-600 border-red-200 bg-red-50 shrink-0">
                                  Revisar
                                </Badge>
                              )}
                              {email.status === "approved" && email.order_number && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-[16px] font-mono text-blue-600 border-blue-200 bg-blue-50 shrink-0">
                                  #{email.order_number}
                                </Badge>
                              )}
                              {email.oc_number && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-[16px] font-mono text-gray-500 border-gray-200 shrink-0">
                                  {email.oc_number}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Detail panel */}
            <div className={`${showDetail ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-gray-50`}>
              {!selectedId ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gray-100 mb-4">
                    <Mail className="h-7 w-7 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-400">Selecciona un correo</p>
                  <p className="text-xs text-gray-300 mt-1">Para ver los productos extraídos</p>
                </div>
              ) : loadingDetail ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="mt-8 space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                </div>
              ) : detail ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Compact header */}
                  <div className="shrink-0 bg-white border-b border-gray-200 px-4 py-2.5">
                    {/* Mobile back */}
                    <button
                      onClick={() => setShowDetail(false)}
                      className="md:hidden flex items-center gap-1.5 text-xs text-gray-400 mb-2 hover:text-gray-600"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Volver
                    </button>

                    {/* Row 1: Subject + status */}
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`h-7 w-7 rounded-full ${avatarColor(detail.email_from || "")} flex items-center justify-center shrink-0`}>
                          <span className="text-[9px] font-bold text-white">
                            {emailInitials(detail.email_from || "")}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-[13px] font-semibold text-gray-900 leading-tight truncate">
                            {detail.email_subject || "Sin asunto"}
                          </h2>
                          <p className="text-[11px] text-gray-400 truncate">
                            {detail.email_from} · {relativeDate(detail.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {statusLabel(detail.status)}
                        {detail.status === "approved" && detail.order_number && (
                          <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                            #{detail.order_number}
                          </Badge>
                        )}
                        {detail.status === "processed" && detail.cliente_id && detail.fecha_entrega && (
                          <Button
                            size="sm"
                            className="h-6 text-[11px] px-2.5 bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => { setApproveError(null); setApproveDialogOpen(true) }}
                          >
                            Aprobar
                          </Button>
                        )}
                        {approveResult && detail.status === "approved" && (
                          <span className="text-[10px] text-blue-600 font-medium">Orden creada</span>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Key info chips */}
                    <div className="flex flex-wrap items-center gap-1 mt-2">
                      {detail.cliente && (
                        <div className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded max-w-[200px] ${
                          detail.cliente_id ? "bg-emerald-50 text-emerald-700" : detail.status === "processed" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {detail.cliente_id ? <UserCheck className="h-2.5 w-2.5 shrink-0" /> : detail.status === "processed" ? <UserX className="h-2.5 w-2.5 shrink-0" /> : <Building2 className="h-2.5 w-2.5 shrink-0" />}
                          <span className="truncate">{detail.cliente}</span>
                        </div>
                      )}
                      {detail.oc_number && (
                        <div className="inline-flex items-center gap-1 text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded font-mono shrink-0">
                          {detail.oc_number}
                        </div>
                      )}
                      {detail.sucursal && detail.sucursal !== detail.cliente && (
                        <div className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded max-w-[180px] ${
                          detail.sucursal_id ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          <MapPin className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{detail.sucursal}</span>
                        </div>
                      )}
                      {detail.fecha_entrega && (
                        <div className="inline-flex items-center gap-1 text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded shrink-0 font-medium">
                          <CalendarDays className="h-2.5 w-2.5" />
                          {detail.fecha_entrega}
                        </div>
                      )}
                      {/* Match results as small text */}
                      {(() => {
                        const cm = extractClientMatch(detail.processing_logs)
                        const bm = extractBranchMatch(detail.processing_logs)
                        const parts: string[] = []
                        if (cm?.status === "matched") parts.push(`${cm.matched_content} ${cm.similarity != null ? `${(cm.similarity * 100).toFixed(0)}%` : ""}`)
                        if (bm?.status === "matched" || bm?.status === "auto_single") parts.push(`${bm?.branch_name}${bm?.status === "auto_single" ? " (única)" : ""}`)
                        if (bm?.status === "default_main") parts.push(`${bm?.branch_name} (default)`)
                        if (!parts.length) return null
                        return (
                          <div className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded max-w-[220px]">
                            <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{parts.join(" · ")}</span>
                          </div>
                        )
                      })()}
                    </div>

                    {/* Observaciones */}
                    {detail.observaciones && (
                      <div className="flex items-start gap-1.5 mt-1.5 text-[10px] text-violet-600 bg-violet-50 rounded px-2 py-1">
                        <MessageSquare className="h-3 w-3 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{detail.observaciones}</span>
                      </div>
                    )}
                  </div>

                  {/* Content: PDF + Products */}
                  <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    {/* PDF Viewer */}
                    {detail.pdf_url && (
                      <div className="lg:w-[45%] xl:w-[40%] flex flex-col border-r border-gray-200 bg-gray-100 min-h-[250px] lg:min-h-0 order-2 lg:order-1">
                        <iframe
                          src={detail.pdf_url}
                          className="flex-1 w-full"
                          title="PDF del pedido"
                        />
                      </div>
                    )}

                    {/* Products panel */}
                    <div className={`${detail.pdf_url ? 'lg:w-[55%] xl:w-[60%]' : 'flex-1'} flex flex-col overflow-hidden order-1 lg:order-2 bg-white`}>
                      {detail.productos && detail.productos.length > 0 ? (
                        <>
                          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 shrink-0">
                            <div className="flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5 text-gray-400" />
                              <h3 className="text-xs font-semibold text-gray-700">Productos</h3>
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium">
                              {detail.productos.length} {detail.productos.length === 1 ? "item" : "items"}
                            </span>
                          </div>
                          <ScrollArea className="flex-1">
                            <div className="divide-y divide-gray-100">
                              {detail.productos.map((prod, i) => (
                                <div key={i} className="px-3 py-2 hover:bg-gray-50/50">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium text-gray-800 leading-tight">{prod.producto}</p>
                                      {prod.producto_id ? (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          {prod.confidence_score != null && prod.confidence_score < 0.65 ? (
                                            <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600">
                                              <AlertCircle className="h-3 w-3 shrink-0" />
                                              <span className="tabular-nums font-medium">{(prod.confidence_score * 100).toFixed(0)}%</span>
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600">
                                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                                              <span className="tabular-nums font-medium">{prod.confidence_score != null ? `${(prod.confidence_score * 100).toFixed(0)}%` : ""}</span>
                                            </span>
                                          )}
                                          {(prod.catalogo_nombre || prod.producto_nombre) && (
                                            <span className="text-[10px] text-gray-400 truncate">{prod.catalogo_nombre || prod.producto_nombre}</span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="inline-flex items-center gap-0.5 mt-0.5 text-[10px] text-red-400">
                                          <AlertCircle className="h-3 w-3" />
                                          Sin match
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="text-xs font-semibold text-gray-800 tabular-nums">{prod.cantidad ?? "—"}</span>
                                      {prod.precio != null && (
                                        <p className="text-[10px] text-gray-400 tabular-nums">${prod.precio.toLocaleString()}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center">
                          <Package className="h-8 w-8 text-gray-200 mb-2" />
                          <p className="text-xs text-gray-400">No se extrajeron productos</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Approve confirmation dialog */}
                  <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-base">Aprobar orden</DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">
                          Se creará una nueva orden con los siguientes datos:
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-3 py-2">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                          <div>
                            <span className="text-gray-400">Cliente</span>
                            <p className="font-medium text-gray-800 mt-0.5">{detail.cliente || "—"}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Sucursal</span>
                            <p className="font-medium text-gray-800 mt-0.5">{detail.sucursal || "Principal"}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Fecha entrega</span>
                            <p className="font-medium text-gray-800 mt-0.5">{detail.fecha_entrega || "—"}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">OC</span>
                            <p className="font-medium text-gray-800 mt-0.5 font-mono">{detail.oc_number || "—"}</p>
                          </div>
                        </div>

                        {detail.productos && (() => {
                          const matched = detail.productos.filter((p) => p.producto_id)
                          const unmatched = detail.productos.filter((p) => !p.producto_id)
                          return (
                            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">Productos con match</span>
                                <span className="font-semibold text-emerald-600">{matched.length}</span>
                              </div>
                              {unmatched.length > 0 && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-500">Productos sin match</span>
                                  <span className="font-semibold text-amber-600">{unmatched.length}</span>
                                </div>
                              )}
                              {unmatched.length > 0 && (
                                <p className="text-[10px] text-amber-600 mt-1">
                                  Los productos sin match no se incluirán en la orden.
                                </p>
                              )}
                            </div>
                          )
                        })()}

                        {approveError && (
                          <div className="bg-red-50 text-red-700 text-xs rounded-lg px-3 py-2">
                            {approveError}
                          </div>
                        )}
                      </div>

                      <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setApproveDialogOpen(false)} disabled={approving}>
                          Cancelar
                        </Button>
                        <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={handleApproveConfirm} disabled={approving}>
                          {approving ? "Creando orden..." : "Confirmar"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  )
}
