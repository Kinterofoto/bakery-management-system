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
  CheckCircle,
  AlertCircle,
  FileText,
  ArrowLeft,
  Package,
  RefreshCw,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  getEmailLogs,
  getEmailDetail,
  getEmailStats,
  type EmailLog,
  type EmailDetail,
  type EmailStats,
} from "./actions"

// === Helpers ===

function statusBadge(status: string) {
  switch (status) {
    case "processed":
      return <Badge className="bg-green-100 text-green-700 border-green-200">Procesado</Badge>
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pendiente</Badge>
    case "error":
      return <Badge className="bg-red-100 text-red-700 border-red-200">Error</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "processed":
      return <CheckCircle className="h-3.5 w-3.5 text-green-500" />
    case "pending":
      return <Clock className="h-3.5 w-3.5 text-yellow-500" />
    case "error":
      return <AlertCircle className="h-3.5 w-3.5 text-red-500" />
    default:
      return <Mail className="h-3.5 w-3.5 text-gray-400" />
  }
}

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "d MMM, HH:mm", { locale: es })
  } catch {
    return dateStr
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
  const [, startTransition] = useTransition()

  // Parallel initial load: emails + stats at once
  const loadInitialData = useCallback(async () => {
    setLoadingList(true)
    const [emailsRes, statsRes] = await Promise.all([
      getEmailLogs(),
      getEmailStats(),
    ])
    if (emailsRes.data) setEmails(emailsRes.data)
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
    // Use transition so the list stays interactive while detail loads
    startTransition(() => {
      loadDetail(id)
    })
  }

  const handleRefresh = () => {
    startTransition(() => {
      loadInitialData()
    })
  }

  // Memoized filter so we don't re-filter on every render
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
          {/* Stats Bar */}
          <div className="border-b bg-white px-4 py-3 md:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-sky-600" />
                <h1 className="text-lg font-semibold text-gray-900">Inbox Órdenes de Compra</h1>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Actualizar
              </Button>
            </div>
            {stats && (
              <div className="flex gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Inbox className="h-3.5 w-3.5" />
                  {stats.total_orders} total
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  {stats.by_status?.processed || 0} procesados
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-yellow-500" />
                  {stats.by_status?.pending || 0} pendientes
                </span>
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 text-blue-500" />
                  {stats.last_24_hours} últimas 24h
                </span>
              </div>
            )}
          </div>

          {/* Main content: list + detail */}
          <div className="flex-1 flex overflow-hidden">
            {/* Email list panel */}
            <div className={`${showDetail ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[380px] lg:w-[420px] border-r bg-white`}>
              {/* Search */}
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por asunto, cliente o OC..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Email list */}
              <ScrollArea className="flex-1">
                {loadingList ? (
                  <div className="p-3 space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="p-3 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <Inbox className="h-12 w-12 mb-3" />
                    <p className="text-sm font-medium">No hay correos</p>
                    <p className="text-xs mt-1">
                      {searchQuery ? "Intenta con otra búsqueda" : "Los correos procesados aparecerán aquí"}
                    </p>
                  </div>
                ) : (
                  <div>
                    {filtered.map((email) => (
                      <button
                        key={email.id}
                        onClick={() => handleSelect(email.id)}
                        className={`w-full text-left px-4 py-3 border-b transition-colors hover:bg-gray-50 ${
                          selectedId === email.id ? "bg-sky-50 border-l-2 border-l-sky-500" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {statusIcon(email.status)}
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {email.email_from || "Sin remitente"}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 truncate">
                              {email.email_subject || "Sin asunto"}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {email.cliente && (
                                <span className="text-xs text-gray-500 truncate">
                                  {email.cliente}
                                </span>
                              )}
                              {email.oc_number && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  OC {email.oc_number}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[11px] text-gray-400">
                              {formatDate(email.created_at)}
                            </span>
                            {statusBadge(email.status)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Detail panel */}
            <div className={`${showDetail ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white`}>
              {!selectedId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <Mail className="h-16 w-16 mb-4 text-gray-200" />
                  <p className="text-sm font-medium">Selecciona un correo</p>
                  <p className="text-xs mt-1">Para ver el detalle y los productos extraídos</p>
                </div>
              ) : loadingDetail ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="mt-6 space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              ) : detail ? (
                <ScrollArea className="flex-1">
                  <div className="p-4 md:p-6">
                    {/* Mobile back button */}
                    <button
                      onClick={() => setShowDetail(false)}
                      className="md:hidden flex items-center gap-1 text-sm text-gray-500 mb-4 hover:text-gray-700"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Volver a la lista
                    </button>

                    {/* Header */}
                    <div className="mb-6">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {detail.email_subject || "Sin asunto"}
                        </h2>
                        {statusBadge(detail.status)}
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-gray-500">
                        <p>
                          <span className="text-gray-400">De:</span>{" "}
                          {detail.email_from || "Desconocido"}
                        </p>
                        <p>
                          <span className="text-gray-400">Fecha:</span>{" "}
                          {format(new Date(detail.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                        </p>
                        {detail.cliente && (
                          <p>
                            <span className="text-gray-400">Cliente:</span>{" "}
                            <span className="font-medium text-gray-700">{detail.cliente}</span>
                          </p>
                        )}
                        {detail.oc_number && (
                          <p>
                            <span className="text-gray-400">OC:</span>{" "}
                            <Badge variant="outline" className="ml-1">{detail.oc_number}</Badge>
                          </p>
                        )}
                      </div>

                      {detail.pdf_url && (
                        <a
                          href={detail.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-3 text-sm text-sky-600 hover:text-sky-700 hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          Ver PDF original
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    {/* Products table */}
                    {detail.productos && detail.productos.length > 0 ? (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Package className="h-4 w-4 text-gray-500" />
                          <h3 className="text-sm font-semibold text-gray-700">
                            Productos extraídos ({detail.productos.length})
                          </h3>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50">
                                <TableHead className="text-xs font-medium">Producto</TableHead>
                                <TableHead className="text-xs font-medium text-right">Cant.</TableHead>
                                <TableHead className="text-xs font-medium">Unidad</TableHead>
                                <TableHead className="text-xs font-medium text-right">Precio</TableHead>
                                <TableHead className="text-xs font-medium">Entrega</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {detail.productos.map((prod, i) => (
                                <TableRow key={i}>
                                  <TableCell className="text-sm font-medium">{prod.nombre}</TableCell>
                                  <TableCell className="text-sm text-right">{prod.cantidad ?? "-"}</TableCell>
                                  <TableCell className="text-sm text-gray-500">{prod.unidad ?? "-"}</TableCell>
                                  <TableCell className="text-sm text-right">
                                    {prod.precio != null ? `$${prod.precio.toLocaleString()}` : "-"}
                                  </TableCell>
                                  <TableCell className="text-sm text-gray-500">
                                    {prod.fecha_entrega || "-"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-400 border rounded-lg">
                        <Package className="h-10 w-10 mb-2 text-gray-200" />
                        <p className="text-sm">No se extrajeron productos</p>
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
