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
  Filter,
  MoreVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import {
  getEmailLogs,
  getEmailDetail,
  getEmailStats,
  type EmailLog,
  type EmailDetail,
  type EmailStats,
} from "./actions"

// === Helpers ===

function statusDot(status: string) {
  const colors: Record<string, string> = {
    processed: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]",
    pending: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]",
    error: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]",
  }
  return <div className={cn("h-1.5 w-1.5 rounded-full", colors[status] || "bg-slate-300")} />
}

function statusLabel(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    processed: { label: "Procesado", className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    pending: { label: "Pendiente", className: "bg-amber-50 text-amber-700 border-amber-100" },
    error: { label: "Error", className: "bg-rose-50 text-rose-700 border-rose-100" },
  }
  const s = map[status] || { label: status, className: "bg-slate-50 text-slate-600 border-slate-100" }
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border shadow-none", s.className)}>
      {s.label}
    </Badge>
  )
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

function emailInitials(email: string) {
  if (!email) return "?"
  const name = email.split("@")[0]
  const parts = name.split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function avatarGradient(str: string) {
  const gradients = [
    "from-blue-400 to-blue-600",
    "from-emerald-400 to-emerald-600",
    "from-violet-400 to-violet-600",
    "from-rose-400 to-rose-600",
    "from-amber-400 to-amber-600",
    "from-cyan-400 to-cyan-600",
    "from-indigo-400 to-indigo-600",
    "from-pink-400 to-pink-600",
    "from-teal-400 to-teal-600",
    "from-orange-400 to-orange-600",
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return gradients[Math.abs(hash) % gradients.length]
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
    try {
      const [emailsRes, statsRes] = await Promise.all([
        getEmailLogs(),
        getEmailStats(),
      ])
      if (emailsRes.data) setEmails(emailsRes.data)
      if (emailsRes.error) setError(emailsRes.error)
      if (statsRes.data) setStats(statsRes.data)
    } catch (err) {
      setError("Error inesperado al cargar datos")
    } finally {
      setLoadingList(false)
    }
  }, [])

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true)
    try {
      const { data } = await getEmailDetail(id)
      if (data) setDetail(data)
    } finally {
      setLoadingDetail(false)
    }
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
      <div className="flex h-screen bg-[#FBFBFD] text-slate-900 font-sans antialiased">
        <Sidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* List Header */}
          <header className="h-[72px] border-b border-slate-200/60 bg-white/80 backdrop-blur-md z-10 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <h1 className="text-[19px] font-semibold tracking-tight text-slate-900">Buzón de Órdenes</h1>
                {stats && (
                  <p className="text-[12px] font-medium text-slate-400">
                    {stats.by_status?.processed || 0} procesados • {stats.last_24_hours} hoy
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative group hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  placeholder="Buscar órdenes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 w-[240px] bg-slate-100/50 border-none rounded-full text-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all shadow-none"
                />
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 rounded-full hover:bg-slate-100 transition-colors" 
                onClick={handleRefresh}
              >
                <RefreshCw className={cn("h-4 w-4 text-slate-500", loadingList && "animate-spin")} />
              </Button>
            </div>
          </header>

          <main className="flex-1 flex overflow-hidden">
            {/* Master List */}
            <div className={cn(
              "flex flex-col bg-white border-r border-slate-200/60 transition-all duration-300",
              showDetail ? "hidden lg:flex lg:w-[380px] xl:w-[420px]" : "w-full lg:w-[380px] xl:w-[420px]"
            )}>
              {/* Mobile Search */}
              <div className="p-4 border-b border-slate-100 sm:hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 bg-slate-100/50 border-none rounded-xl text-sm"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                {error ? (
                  <div className="flex flex-col items-center justify-center h-full py-20 px-10 text-center">
                    <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
                      <AlertCircle className="h-6 w-6 text-rose-500" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">Error al cargar el buzón</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
                    <Button variant="outline" size="sm" className="rounded-full px-4 border-slate-200" onClick={handleRefresh}>
                      Reintentar
                    </Button>
                  </div>
                ) : loadingList ? (
                  <div className="p-2 space-y-1">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white">
                        <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between items-center">
                            <Skeleton className="h-3 w-1/3 rounded-full" />
                            <Skeleton className="h-2 w-10 rounded-full" />
                          </div>
                          <Skeleton className="h-4 w-3/4 rounded-full" />
                          <Skeleton className="h-2 w-1/2 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-32 px-10 text-center">
                    <div className="h-16 w-16 rounded-[24px] bg-slate-50 flex items-center justify-center mb-6 border border-slate-100">
                      <Inbox className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">Buzón vacío</h3>
                    <p className="text-sm text-slate-400 mt-1 max-w-[200px] mx-auto">
                      {searchQuery ? "No encontramos órdenes que coincidan con tu búsqueda." : "No hay órdenes para mostrar en este momento."}
                    </p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filtered.map((email) => {
                      const isSelected = selectedId === email.id
                      return (
                        <button
                          key={email.id}
                          onClick={() => handleSelect(email.id)}
                          className={cn(
                            "w-full text-left group flex items-start gap-4 p-4 rounded-2xl transition-all duration-200 relative",
                            isSelected 
                              ? "bg-blue-50/60 shadow-sm ring-1 ring-blue-500/10" 
                              : "hover:bg-slate-50"
                          )}
                        >
                          {/* Avatar with Gradient */}
                          <div className={cn(
                            "h-11 w-11 rounded-full bg-gradient-to-br flex items-center justify-center shrink-0 mt-0.5 shadow-sm text-white text-[13px] font-bold",
                            avatarGradient(email.email_from || "")
                          )}>
                            {emailInitials(email.email_from || "")}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className={cn(
                                "text-[14px] truncate transition-colors",
                                isSelected ? "font-bold text-blue-700" : "font-semibold text-slate-900"
                              )}>
                                {email.email_from?.split("@")[0] || "Desconocido"}
                              </span>
                              <span className="text-[11px] font-medium text-slate-400 tabular-nums">
                                {smartDate(email.created_at)}
                              </span>
                            </div>
                            
                            <h4 className={cn(
                              "text-[13px] leading-tight mb-2 line-clamp-1",
                              isSelected ? "text-slate-900 font-medium" : "text-slate-600 font-normal"
                            )}>
                              {email.email_subject || "Sin asunto"}
                            </h4>
                            
                            <div className="flex items-center gap-3 mt-auto">
                              <div className="flex items-center gap-1.5">
                                {statusDot(email.status)}
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-tight">
                                  {email.status}
                                </span>
                              </div>
                              {email.oc_number && (
                                <div className="flex items-center gap-1 bg-slate-100/80 px-1.5 py-0.5 rounded-md">
                                  <FileText className="h-2.5 w-2.5 text-slate-400" />
                                  <span className="text-[10px] font-mono font-bold text-slate-500">{email.oc_number}</span>
                                </div>
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

            {/* Detail View */}
            <div className={cn(
              "flex-1 flex flex-col bg-[#FBFBFD] transition-all duration-300",
              showDetail ? "flex" : "hidden lg:flex"
            )}>
              {!selectedId ? (
                <div className="flex-1 flex flex-col items-center justify-center px-10 text-center">
                  <div className="w-24 h-24 rounded-[32px] bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center mb-8 border border-slate-100/50">
                    <Mail className="h-10 w-10 text-slate-200" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Selecciona un correo</h3>
                  <p className="text-slate-400 text-sm mt-2 max-w-[260px] mx-auto leading-relaxed">
                    Selecciona una orden de la lista para ver los detalles extraídos automáticamente por la IA.
                  </p>
                </div>
              ) : loadingDetail ? (
                <div className="p-8 max-w-4xl mx-auto w-full space-y-8">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
                    <Skeleton className="h-8 w-2/3 rounded-full" />
                    <Skeleton className="h-4 w-1/3 rounded-full" />
                    <div className="flex gap-2 pt-4">
                      <Skeleton className="h-6 w-24 rounded-full" />
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                      <Skeleton className="h-5 w-32 rounded-full" />
                    </div>
                    <div className="p-6 space-y-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full rounded-xl" />
                      ))}
                    </div>
                  </div>
                </div>
              ) : detail ? (
                <ScrollArea className="flex-1">
                  <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
                    {/* Navigation for mobile */}
                    <button
                      onClick={() => setShowDetail(false)}
                      className="lg:hidden flex items-center gap-2 text-[13px] font-semibold text-blue-600 mb-2 active:opacity-60 transition-opacity"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Volver al buzón
                    </button>

                    {/* Main Header Card */}
                    <section className="bg-white rounded-[28px] border border-slate-200/60 shadow-sm overflow-hidden">
                      <div className="p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "h-14 w-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-lg shadow-slate-200/50 text-white text-xl font-bold",
                              avatarGradient(detail.email_from || "")
                            )}>
                              {emailInitials(detail.email_from || "")}
                            </div>
                            <div className="min-w-0">
                              <h2 className="text-[22px] font-bold text-slate-900 tracking-tight leading-tight mb-1">
                                {detail.email_subject || "Sin asunto"}
                              </h2>
                              <div className="flex items-center gap-2 text-slate-500">
                                <span className="text-sm font-medium">{detail.email_from}</span>
                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                <span className="text-xs">{relativeDate(detail.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            {statusLabel(detail.status)}
                            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-slate-400">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                            <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                              <Building2 className="h-4 w-4 text-slate-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Cliente</p>
                              <p className="text-sm font-semibold text-slate-900 truncate">{detail.cliente || "No especificado"}</p>
                            </div>
                          </div>
                          
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                            <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                              <FileText className="h-4 w-4 text-slate-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Orden de Compra</p>
                              <p className="text-sm font-bold text-blue-600 font-mono tracking-tight">{detail.oc_number || "Pendiente"}</p>
                            </div>
                          </div>

                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3 sm:col-span-2 lg:col-span-1">
                            <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                              <MapPin className="h-4 w-4 text-slate-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Sucursal / Entrega</p>
                              <p className="text-sm font-semibold text-slate-900 truncate">{detail.sucursal || detail.direccion || "No especificada"}</p>
                            </div>
                          </div>
                        </div>

                        {detail.pdf_url && (
                          <div className="mt-6 flex justify-end">
                            <a
                              href={detail.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white text-[13px] font-semibold rounded-full transition-all shadow-lg shadow-slate-200 active:scale-[0.98]"
                            >
                              <FileText className="h-4 w-4" />
                              Ver Documento PDF
                              <ExternalLink className="h-3 w-3 opacity-60 ml-1" />
                            </a>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Products Section */}
                    <section className="bg-white rounded-[28px] border border-slate-200/60 shadow-sm overflow-hidden">
                      <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                            <Package className="h-4 w-4 text-slate-900" />
                          </div>
                          <h3 className="text-[16px] font-bold text-slate-900 tracking-tight">Productos Extraídos</h3>
                        </div>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100 font-bold border-none rounded-lg px-2.5 py-1">
                          {detail.productos?.length || 0} ITEMS
                        </Badge>
                      </div>

                      {detail.productos && detail.productos.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent border-slate-100">
                                <TableHead className="pl-8 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] h-12">Descripción</TableHead>
                                <TableHead className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] text-right w-[100px] h-12">Cantidad</TableHead>
                                <TableHead className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] w-[100px] h-12 text-center">Unidad</TableHead>
                                <TableHead className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] text-right w-[140px] h-12">Precio Unit.</TableHead>
                                <TableHead className="pr-8 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] w-[140px] h-12 text-center">Entrega</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {detail.productos.map((prod, i) => (
                                <TableRow key={i} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                                  <TableCell className="pl-8 py-4 text-[14px] font-semibold text-slate-900">
                                    {prod.producto}
                                  </TableCell>
                                  <TableCell className="py-4 text-[14px] text-right tabular-nums font-bold text-slate-900">
                                    {prod.cantidad ?? "—"}
                                  </TableCell>
                                  <TableCell className="py-4 text-[12px] font-medium text-slate-500 text-center">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded-md">{prod.unidad || "—"}</span>
                                  </TableCell>
                                  <TableCell className="py-4 text-[14px] text-right tabular-nums font-semibold text-slate-900">
                                    {prod.precio != null ? `$${prod.precio.toLocaleString()}` : "—"}
                                  </TableCell>
                                  <TableCell className="pr-8 py-4 text-[12px] font-medium text-slate-500 text-center">
                                    {prod.fecha_entrega || "—"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-center px-8">
                          <div className="h-16 w-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
                            <AlertCircle className="h-8 w-8 text-slate-200" />
                          </div>
                          <p className="text-sm font-semibold text-slate-900">No se extrajeron productos</p>
                          <p className="text-xs text-slate-400 mt-1">Nuestra IA no pudo encontrar una tabla de productos clara en este documento.</p>
                        </div>
                      )}
                      
                      <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                        <div className="flex items-start gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                          <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <Mail className="h-3 w-3 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-blue-800 uppercase tracking-tight mb-0.5">Nota de Extracción</p>
                            <p className="text-[12px] leading-relaxed text-blue-700/80">
                              Los productos mostrados arriba fueron extraídos automáticamente. Por favor, verifica que la información coincida con el PDF original antes de procesar la orden.
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </ScrollArea>
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </RouteGuard>
  )
}

