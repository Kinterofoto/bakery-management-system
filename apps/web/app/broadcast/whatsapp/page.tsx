"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import {
  MessageSquare,
  Clock,
  Send,
  CheckCheck,
  Eye,
  Users,
  Search,
  Loader2,
  Phone,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemplateAnalytics {
  template_id: string
  template_name: string
  sent: number
  delivered: number
  read: number
  delivery_rate: number
  read_rate: number
}

interface User {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  status: string | null
}

interface TemplateConfig {
  id: string
  template_id: string
  displayName: string
  schedule: string
  messagePreview: string
}

const TEMPLATES: TemplateConfig[] = [
  {
    id: "reporte_entregas_diario",
    template_id: "1821276051842847",
    displayName: "Reporte de Entregas",
    schedule: "Diario 8:00 PM",
    messagePreview:
      "Se completo el cierre de entregas del dia.\n\nPedidos entregados: {1}\nUnidades entregadas (in-full): {2}",
  },
  {
    id: "reporte_recepciones_diario",
    template_id: "1942460246373491",
    displayName: "Reporte de Recepciones",
    schedule: "Diario 7:00 PM",
    messagePreview:
      "Se completo el cierre de recepciones del dia.\n\nTotal recepciones registradas: {1}",
  },
]

// ---------------------------------------------------------------------------
// Role label helper
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  administrator: "Administrador",
  coordinador_logistico: "Coord. Logistico",
  commercial: "Comercial",
  reviewer: "Revisor",
  reviewer_area1: "Alistamiento",
  reviewer_area2: "Proyeccion",
  dispatcher: "Despacho",
  driver: "Conductor",
  client: "Cliente",
}

function roleLabel(role: string) {
  return ROLE_LABELS[role] || role
}

// ---------------------------------------------------------------------------
// Metric Card
// ---------------------------------------------------------------------------

function MetricCard({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  suffix?: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 py-3 px-4 min-w-0">
      <div className="text-gray-400">{icon}</div>
      <span className="text-2xl font-light text-gray-900 dark:text-white tabular-nums">
        {value}
        {suffix && <span className="text-sm font-normal text-gray-400 ml-0.5">{suffix}</span>}
      </span>
      <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
        {label}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Template Card
// ---------------------------------------------------------------------------

function TemplateCard({
  template,
  analytics,
  users,
  selectedUserIds,
  onToggleUser,
  analyticsLoading,
}: {
  template: TemplateConfig
  analytics: TemplateAnalytics | null
  users: User[]
  selectedUserIds: Set<string>
  onToggleUser: (userId: string) => void
  analyticsLoading: boolean
}) {
  const [showRecipients, setShowRecipients] = useState(false)
  const [search, setSearch] = useState("")

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-sky-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {template.displayName}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-400">{template.schedule}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Message preview */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-5">
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed font-mono">
            {template.messagePreview}
          </p>
        </div>

        {/* Metrics */}
        {analyticsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
          </div>
        ) : analytics ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
            <MetricCard
              icon={<Send className="w-4 h-4" />}
              label="Enviados"
              value={analytics.sent}
            />
            <MetricCard
              icon={<CheckCheck className="w-4 h-4" />}
              label="Entregados"
              value={analytics.delivered}
            />
            <MetricCard
              icon={<Eye className="w-4 h-4" />}
              label="Leidos"
              value={analytics.read}
            />
            <MetricCard
              icon={<CheckCheck className="w-4 h-4" />}
              label="Entrega"
              value={analytics.delivery_rate}
              suffix="%"
            />
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400">Sin datos de analitica</p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 dark:border-gray-800" />

      {/* Recipients toggle */}
      <button
        onClick={() => setShowRecipients(!showRecipients)}
        className={cn(
          "w-full flex items-center justify-between px-6 py-4",
          "text-left transition-colors duration-150",
          "hover:bg-gray-50 dark:hover:bg-gray-800/50",
          "active:bg-gray-100 dark:active:bg-gray-800"
        )}
      >
        <div className="flex items-center gap-2.5">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Destinatarios
          </span>
          {selectedUserIds.size > 0 && (
            <Badge
              variant="secondary"
              className="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 border-0 text-[11px] px-2 py-0"
            >
              {selectedUserIds.size}
            </Badge>
          )}
        </div>
        <svg
          className={cn(
            "w-4 h-4 text-gray-400 transition-transform duration-200",
            showRecipients && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Recipients list */}
      {showRecipients && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {/* Search */}
          <div className="px-6 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  "w-full pl-9 pr-4 py-2.5 rounded-xl text-sm",
                  "bg-gray-50 dark:bg-gray-800/50",
                  "border border-gray-100 dark:border-gray-700",
                  "placeholder:text-gray-400",
                  "focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/40",
                  "transition-all duration-200"
                )}
              />
            </div>
          </div>

          {/* User list */}
          <div className="max-h-72 overflow-y-auto px-3 pb-3">
            {filteredUsers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin resultados</p>
            ) : (
              <div className="space-y-0.5">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUserIds.has(user.id)
                  return (
                    <button
                      key={user.id}
                      onClick={() => onToggleUser(user.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left",
                        "transition-all duration-150",
                        isSelected
                          ? "bg-sky-50 dark:bg-sky-500/10"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      )}
                    >
                      {/* Checkbox */}
                      <div
                        className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0",
                          "transition-all duration-150",
                          isSelected
                            ? "bg-sky-500 border-sky-500"
                            : "border-gray-300 dark:border-gray-600"
                        )}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      {/* User info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-medium truncate",
                            isSelected ? "text-sky-700 dark:text-sky-300" : "text-gray-900 dark:text-white"
                          )}>
                            {user.name}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 border-0 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-normal"
                          >
                            {roleLabel(user.role)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {user.phone ? (
                            <>
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-400">{user.phone}</span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-300 dark:text-gray-600 italic">
                              Sin telefono
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WhatsAppPage() {
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [analytics, setAnalytics] = useState<TemplateAnalytics[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  // Separate selected user sets per template
  const [selectedByTemplate, setSelectedByTemplate] = useState<
    Record<string, Set<string>>
  >({
    reporte_entregas_diario: new Set(),
    reporte_recepciones_diario: new Set(),
  })

  const [saving, setSaving] = useState(false)

  // Fetch users
  useEffect(() => {
    async function fetchUsers() {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, name, email, phone, role, status")
          .eq("status", "active")
          .order("name")

        if (error) throw error
        setUsers(data || [])
      } catch (err) {
        console.error("Error fetching users:", err)
        toast.error("Error al cargar usuarios")
      } finally {
        setUsersLoading(false)
      }
    }
    fetchUsers()
  }, [])

  // Fetch analytics
  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/broadcast/whatsapp/analytics")
        if (!res.ok) throw new Error("Failed to fetch analytics")
        const json = await res.json()
        setAnalytics(json.data || [])
      } catch (err) {
        console.error("Error fetching analytics:", err)
        // Silently fail - analytics are non-critical
      } finally {
        setAnalyticsLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  const toggleUser = useCallback(
    (templateId: string, userId: string) => {
      setSelectedByTemplate((prev) => {
        const current = new Set(prev[templateId])
        if (current.has(userId)) {
          current.delete(userId)
        } else {
          current.add(userId)
        }
        return { ...prev, [templateId]: current }
      })
    },
    []
  )

  const handleSave = async () => {
    setSaving(true)
    try {
      // For now, log the selection. In production this would persist to a
      // broadcast_recipients table or similar.
      const payload = Object.fromEntries(
        Object.entries(selectedByTemplate).map(([key, set]) => [
          key,
          Array.from(set),
        ])
      )
      console.log("Saving recipient selections:", payload)
      toast.success("Destinatarios guardados")
    } catch (err) {
      console.error("Error saving recipients:", err)
      toast.error("Error al guardar destinatarios")
    } finally {
      setSaving(false)
    }
  }

  const totalSelected = Object.values(selectedByTemplate).reduce(
    (sum, set) => sum + set.size,
    0
  )

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-black">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                Plantillas WhatsApp
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Gestiona plantillas y destinatarios de mensajes automaticos
              </p>
            </div>
            {totalSelected > 0 && (
              <button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold",
                  "bg-sky-500 text-white",
                  "hover:bg-sky-600 active:scale-[0.97]",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-all duration-150",
                  "shadow-sm shadow-sky-500/20"
                )}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {usersLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
          </div>
        ) : (
          TEMPLATES.map((template) => {
            const templateAnalytics =
              analytics.find(
                (a) => a.template_name === template.id
              ) || null

            return (
              <TemplateCard
                key={template.id}
                template={template}
                analytics={templateAnalytics}
                users={users}
                selectedUserIds={selectedByTemplate[template.id] || new Set()}
                onToggleUser={(userId) => toggleUser(template.id, userId)}
                analyticsLoading={analyticsLoading}
              />
            )
          })
        )}
      </main>
    </div>
  )
}
