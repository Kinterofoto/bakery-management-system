"use client"

import { useState, useEffect, useCallback, useMemo, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Sidebar } from "@/components/layout/sidebar"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Mail,
  Search,
  Inbox,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowLeft,
  Package,
  RefreshCw,
  ExternalLink,
  Building2,
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
  type EmailLog,
  type EmailDetail,
  type EmailStats,
  type ClientMatch,
  type BranchMatch,
} from "./actions"

// === Helpers ===

function statusDot(status: string) {
  const colors: Record<string, string> = {
    processed: "bg-emerald-400",
    pending: "bg-amber-400",
    error: "bg-red-400",
  }
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[status] || "bg-gray-300"}`} />
}

function statusLabel(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    processed: { label: "Procesado", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    pending: { label: "Pendiente", className: "bg-amber-50 text-amber-700 border-amber-200" },
    error: { label: "Error", className: "bg-red-50 text-red-700 border-red-200" },
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
    startTransition(() => { loadDetail(id) })
  }

  const handleRefresh = () => {
    startTransition(() => { loadInitialData() })
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
                <ScrollArea className="flex-1">
                  <div className="max-w-3xl mx-auto p-5 md:p-8">
                    {/* Mobile back */}
                    <button
                      onClick={() => setShowDetail(false)}
                      className="md:hidden flex items-center gap-1.5 text-xs text-gray-400 mb-4 hover:text-gray-600"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Volver
                    </button>

                    {/* Email header card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-full ${avatarColor(detail.email_from || "")} flex items-center justify-center shrink-0`}>
                          <span className="text-xs font-semibold text-white">
                            {emailInitials(detail.email_from || "")}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h2 className="text-sm font-semibold text-gray-900 leading-snug">
                                {detail.email_subject || "Sin asunto"}
                              </h2>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {detail.email_from || "Desconocido"}
                              </p>
                            </div>
                            {statusLabel(detail.status)}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {fullDate(detail.created_at)}
                            </span>
                            <span className="text-gray-300">
                              ({relativeDate(detail.created_at)})
                            </span>
                          </div>

                          {/* Metadata chips */}
                          <div className="flex flex-wrap gap-2 mt-3">
                            {detail.cliente && (
                              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md ${
                                detail.cliente_id
                                  ? "bg-emerald-50 text-emerald-700"
                                  : detail.status === "processed"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-gray-50 text-gray-600"
                              }`}>
                                {detail.cliente_id ? (
                                  <UserCheck className="h-3 w-3" />
                                ) : detail.status === "processed" ? (
                                  <UserX className="h-3 w-3" />
                                ) : (
                                  <Building2 className="h-3 w-3" />
                                )}
                                {detail.cliente}
                              </div>
                            )}
                            {detail.oc_number && (
                              <div className="flex items-center gap-1 text-xs bg-sky-50 text-sky-700 px-2 py-1 rounded-md font-mono">
                                <FileText className="h-3 w-3" />
                                {detail.oc_number}
                              </div>
                            )}
                            {detail.sucursal && detail.sucursal !== detail.cliente && (
                              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md ${
                                detail.sucursal_id
                                  ? "bg-emerald-50 text-emerald-700"
                                  : detail.status === "processed" && detail.cliente_id
                                    ? "bg-red-50 text-red-700"
                                    : "bg-gray-50 text-gray-600"
                              }`}>
                                <MapPin className="h-3 w-3" />
                                {detail.sucursal}
                              </div>
                            )}
                          </div>

                          {/* Client match info */}
                          {(() => {
                            const match = extractClientMatch(detail.processing_logs)
                            if (!match) return null
                            if (match.status === "matched") {
                              return (
                                <div className="flex items-center gap-2 mt-2 text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md px-2.5 py-1.5">
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                  <span>
                                    Match: <span className="font-medium">{match.matched_content}</span>
                                    {match.match_type && <span className="text-emerald-400 ml-1">({match.match_type})</span>}
                                    {match.similarity != null && <span className="text-emerald-400 ml-1">{(match.similarity * 100).toFixed(0)}%</span>}
                                  </span>
                                </div>
                              )
                            }
                            if (match.status === "no_match") {
                              return (
                                <div className="flex items-center gap-2 mt-2 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-md px-2.5 py-1.5">
                                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                  <span>No se encontró match para este cliente. Requiere asignación manual.</span>
                                </div>
                              )
                            }
                            if (match.status === "error") {
                              return (
                                <div className="flex items-center gap-2 mt-2 text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-2.5 py-1.5">
                                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                  <span>Error al buscar match de cliente</span>
                                </div>
                              )
                            }
                            return null
                          })()}

                          {/* Branch match info */}
                          {(() => {
                            const match = extractBranchMatch(detail.processing_logs)
                            if (!match) return null
                            if (match.status === "matched") {
                              return (
                                <div className="flex items-center gap-2 mt-1 text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md px-2.5 py-1.5">
                                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                                  <span>
                                    Sucursal: <span className="font-medium">{match.branch_name}</span>
                                    {match.similarity != null && <span className="text-emerald-400 ml-1">{(match.similarity * 100).toFixed(0)}%</span>}
                                  </span>
                                </div>
                              )
                            }
                            if (match.status === "auto_single") {
                              return (
                                <div className="flex items-center gap-2 mt-1 text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md px-2.5 py-1.5">
                                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                                  <span>
                                    Sucursal: <span className="font-medium">{match.branch_name}</span>
                                    <span className="text-emerald-400 ml-1">(única)</span>
                                  </span>
                                </div>
                              )
                            }
                            if (match.status === "default_main") {
                              return (
                                <div className="flex items-center gap-2 mt-1 text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-2.5 py-1.5">
                                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                                  <span>
                                    Sucursal principal asignada por defecto: <span className="font-medium">{match.branch_name}</span>
                                  </span>
                                </div>
                              )
                            }
                            if (match.status === "no_branches") {
                              return (
                                <div className="flex items-center gap-2 mt-1 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-md px-2.5 py-1.5">
                                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                                  <span>Cliente sin sucursales registradas</span>
                                </div>
                              )
                            }
                            return null
                          })()}

                          {detail.pdf_url && (
                            <a
                              href={detail.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Ver PDF original
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Products */}
                    {detail.productos && detail.productos.length > 0 ? (
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-400" />
                            <h3 className="text-sm font-semibold text-gray-700">Productos</h3>
                          </div>
                          <Badge variant="outline" className="text-xs font-medium">
                            {detail.productos.length} {detail.productos.length === 1 ? "item" : "items"}
                          </Badge>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50/50">
                              <TableHead className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Producto</TableHead>
                              <TableHead className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right w-20">Cant.</TableHead>
                              <TableHead className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-20">Unidad</TableHead>
                              <TableHead className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right w-24">Precio</TableHead>
                              <TableHead className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-24">Entrega</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detail.productos.map((prod, i) => (
                              <TableRow key={i} className="hover:bg-gray-50/50">
                                <TableCell className="text-xs font-medium text-gray-800">{prod.producto}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums font-medium">{prod.cantidad ?? "—"}</TableCell>
                                <TableCell className="text-xs text-gray-500">{prod.unidad ?? "—"}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums">
                                  {prod.precio != null ? `$${prod.precio.toLocaleString()}` : "—"}
                                </TableCell>
                                <TableCell className="text-xs text-gray-500">
                                  {prod.fecha_entrega || "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-12">
                        <Package className="h-8 w-8 text-gray-200 mb-2" />
                        <p className="text-xs text-gray-400">No se extrajeron productos</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  )
}
