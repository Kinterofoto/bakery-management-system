"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useOrderItemLots, type OrderItemLotRow } from "@/hooks/use-order-item-lots"

interface OrderItemLotBadgeProps {
  orderItemId: string
  fallbackLote: string | null
  onClick: (rows: OrderItemLotRow[]) => void
  refreshKey?: number
  disabled?: boolean
  className?: string
}

export function OrderItemLotBadge({
  orderItemId,
  fallbackLote,
  onClick,
  refreshKey = 0,
  disabled = false,
  className = "",
}: OrderItemLotBadgeProps) {
  const { getLotsForOrderItem } = useOrderItemLots()
  const [rows, setRows] = useState<OrderItemLotRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const data = await getLotsForOrderItem(orderItemId)
        if (!cancelled) setRows(data)
      } catch {
        if (!cancelled) setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [orderItemId, refreshKey, getLotsForOrderItem])

  const handleClick = () => {
    if (disabled) return
    onClick(rows)
  }

  if (loading) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className={`w-full max-w-[180px] justify-start font-mono ${className}`}
      >
        <Loader2 className="h-3 w-3 animate-spin mr-2" />
        Cargando...
      </Button>
    )
  }

  if (rows.length === 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={disabled}
        className={`w-full max-w-[180px] justify-start font-mono ${className}`}
      >
        {fallbackLote || "Sin lote"}
      </Button>
    )
  }

  if (rows.length === 1) {
    const r = rows[0]
    const lotCode = r.lot?.lot_code || ""
    const label = r.internal_code ? `${lotCode} · ${r.internal_code}` : lotCode
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={disabled}
        className={`w-full max-w-[200px] justify-start font-mono text-xs ${className}`}
      >
        {label || fallbackLote || "Sin lote"}
      </Button>
    )
  }

  const first = rows[0]
  const second = rows[1]
  const more = rows.length - 2
  const summary = `${first.lot?.lot_code || ""}, ${second.lot?.lot_code || ""}${more > 0 ? ` +${more}` : ""}`

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClick}
            disabled={disabled}
            className={`w-full max-w-[200px] justify-start font-mono text-xs ${className}`}
          >
            {summary}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            {rows.map(r => (
              <div key={r.id} className="text-xs font-mono">
                <span className="font-semibold">{r.lot?.lot_code}</span>
                {" · "}
                <span>{Number(r.quantity).toFixed(0)}</span>
                {r.internal_code ? <span className="text-gray-300"> · {r.internal_code}</span> : null}
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
