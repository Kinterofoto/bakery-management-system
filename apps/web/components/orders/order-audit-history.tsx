"use client"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  useOrderAudit,
  parseOrderChanges,
  formatRelativeTime,
  type OrderAuditLog,
  type FieldChange
} from "@/hooks/use-order-audit"
import { Clock, User, AlertCircle, ArrowRight } from "lucide-react"

interface OrderAuditHistoryProps {
  orderId: string
  className?: string
}

export function OrderAuditHistory({ orderId, className }: OrderAuditHistoryProps) {
  const { logs, loading, error } = useOrderAudit(orderId)

  if (loading) {
    return (
      <div className={className}>
        <div className="space-y-4 p-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-2 sm:gap-4">
              <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 text-destructive p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">Error al cargar historial: {error}</p>
        </div>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className={className}>
        <div className="text-center py-8 text-muted-foreground">
          <p>No hay cambios registrados para esta orden</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className} flex flex-col overflow-hidden max-h-full`}>
      <div className="mb-2 px-2 flex-shrink-0">
        <p className="text-sm text-muted-foreground">
          {logs.length} {logs.length === 1 ? 'cambio registrado' : 'cambios registrados'}
        </p>
      </div>
      <div className="rounded-lg border bg-card overflow-y-auto flex-1 min-h-0">
        <div className="space-y-3 sm:space-y-4 p-2 sm:p-4">
          {logs.map((log, index) => (
            <AuditLogEntry
              key={log.id}
              log={log}
              isFirst={index === 0}
              isLast={index === logs.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface AuditLogEntryProps {
  log: OrderAuditLog
  isFirst: boolean
  isLast: boolean
}

function AuditLogEntry({ log, isFirst, isLast }: AuditLogEntryProps) {
  const changes = parseOrderChanges(log)

  return (
    <div className="relative">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-4 sm:left-6 top-10 sm:top-12 bottom-0 w-0.5 bg-border" />
      )}

      <div className="flex gap-2 sm:gap-4">
        {/* Avatar/Icon */}
        <div className={`
          flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center
          ${getActionColor(log.action)} ${isFirst ? 'ring-2 sm:ring-4 ring-primary/10' : ''}
        `}>
          <User className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 pb-4 sm:pb-6 min-w-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm sm:text-base truncate">
                  {log.changed_by_name || 'Usuario desconocido'}
                </p>
                {log.source_table && <SourceTableBadge source={log.source_table} />}
              </div>
              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span className="whitespace-nowrap">{formatRelativeTime(log.changed_at)}</span>
                <span className="hidden sm:inline">•</span>
                <span className="text-xs hidden sm:inline whitespace-nowrap">
                  {new Date(log.changed_at).toLocaleString('es-CO')}
                </span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <ActionBadge action={log.action} />
            </div>
          </div>

          {/* Changes */}
          <div className="mt-2 sm:mt-3 space-y-2">
            {changes.map((change, idx) => (
              <ChangeItem key={idx} change={change} />
            ))}
          </div>

          {/* Metadata */}
          {(log.ip_address || log.user_agent) && (
            <details className="mt-2 sm:mt-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">
                Detalles técnicos
              </summary>
              <div className="mt-2 space-y-1 pl-3 sm:pl-4 border-l-2 border-border">
                {log.ip_address && (
                  <p className="break-all">IP: {log.ip_address}</p>
                )}
                {log.user_agent && (
                  <p className="break-all">User Agent: {log.user_agent}</p>
                )}
              </div>
            </details>
          )}
        </div>
      </div>

      {!isLast && <Separator className="mt-2" />}
    </div>
  )
}

interface ChangeItemProps {
  change: FieldChange
}

function ChangeItem({ change }: ChangeItemProps) {
  const getBadgeVariant = (type: FieldChange['type']) => {
    switch (type) {
      case 'critical': return 'destructive'
      case 'important': return 'default'
      case 'normal': return 'secondary'
      default: return 'secondary'
    }
  }

  return (
    <div className={`
      p-2 sm:p-3 rounded-lg border
      ${change.type === 'critical' ? 'bg-destructive/5 border-destructive/20' : ''}
      ${change.type === 'important' ? 'bg-primary/5 border-primary/20' : ''}
      ${change.type === 'normal' ? 'bg-muted' : ''}
    `}>
      <div className="flex items-start gap-2 mb-2">
        <Badge variant={getBadgeVariant(change.type)} className="text-xs flex-shrink-0">
          {change.label}
        </Badge>
      </div>
      <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm">
        <code className="px-2 py-1 rounded bg-background/50 text-foreground break-all flex-1 min-w-0">
          {formatValue(change.oldValue)}
        </code>
        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 self-center sm:self-auto" />
        <code className="px-2 py-1 rounded bg-background/50 font-semibold text-foreground break-all flex-1 min-w-0">
          {formatValue(change.newValue)}
        </code>
      </div>
    </div>
  )
}

function ActionBadge({ action }: { action: OrderAuditLog['action'] }) {
  const config = {
    INSERT: { label: 'Creación', variant: 'default' as const },
    UPDATE: { label: 'Modificación', variant: 'secondary' as const },
    DELETE: { label: 'Eliminación', variant: 'destructive' as const }
  }

  const { label, variant } = config[action]

  return <Badge variant={variant} className="text-xs whitespace-nowrap">{label}</Badge>
}

function SourceTableBadge({ source }: { source: 'orders' | 'order_items' | 'order_item_deliveries' }) {
  const config = {
    orders: { label: 'Orden', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
    order_items: { label: 'Productos', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
    order_item_deliveries: { label: 'Entregas', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' }
  }

  const { label, color } = config[source]

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${color}`}>
      {label}
    </span>
  )
}

function getActionColor(action: OrderAuditLog['action']): string {
  switch (action) {
    case 'INSERT': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    case 'UPDATE': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
    case 'DELETE': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }
}

function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return 'N/A'
  }
  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}
