import React from "react"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface TransferStatusBadgeProps {
  status: "pending_receipt" | "received" | "partially_received"
  className?: string
  showIcon?: boolean
}

export function TransferStatusBadge({
  status,
  className,
  showIcon = true
}: TransferStatusBadgeProps) {
  const statusConfig = {
    pending_receipt: {
      label: "Pendiente por recibir",
      variant: "outline" as const,
      bgColor: "bg-yellow-50 border-yellow-300",
      textColor: "text-yellow-700",
      icon: Clock
    },
    partially_received: {
      label: "Parcialmente recibido",
      variant: "outline" as const,
      bgColor: "bg-orange-50 border-orange-300",
      textColor: "text-orange-700",
      icon: AlertCircle
    },
    received: {
      label: "Recibido",
      variant: "outline" as const,
      bgColor: "bg-green-50 border-green-300",
      textColor: "text-green-700",
      icon: CheckCircle2
    }
  }

  const config = statusConfig[status] || {
    label: status || "Desconocido",
    variant: "outline" as const,
    bgColor: "bg-gray-50 border-gray-300",
    textColor: "text-gray-700",
    icon: AlertCircle
  }

  const Icon = config.icon

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1 rounded-full border",
        config.bgColor,
        config.textColor,
        className
      )}
    >
      {showIcon && <Icon size={16} />}
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  )
}
