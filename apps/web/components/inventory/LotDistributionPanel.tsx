"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ProductLot } from "@/hooks/use-product-lots"

export interface LotAssignment {
  lotId: string
  lotCode: string
  expiryDate: string | null
  currentRemaining: number
  delta: number
}

interface LotDistributionPanelProps {
  lots: ProductLot[]
  loading: boolean
  totalDelta: number
  assignments: LotAssignment[]
  onAssignmentsChange: (next: LotAssignment[]) => void
}

const FIFO_TOLERANCE = 0.0001

function formatExpiry(date: string | null): string {
  if (!date) return "Sin vencimiento"
  try {
    const d = new Date(date)
    return d.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })
  } catch {
    return date
  }
}

function buildSuggestion(lots: ProductLot[], totalDelta: number): LotAssignment[] {
  if (lots.length === 0) return []

  if (Math.abs(totalDelta) < FIFO_TOLERANCE) {
    const latest = [...lots].sort(
      (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    )[0]
    return [
      {
        lotId: latest.id,
        lotCode: latest.lot_code,
        expiryDate: latest.expiry_date,
        currentRemaining: latest.quantity_remaining,
        delta: 0,
      },
    ]
  }

  if (totalDelta > 0) {
    const latest = [...lots].sort(
      (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    )[0]
    return [
      {
        lotId: latest.id,
        lotCode: latest.lot_code,
        expiryDate: latest.expiry_date,
        currentRemaining: latest.quantity_remaining,
        delta: totalDelta,
      },
    ]
  }

  const fifoLots = [...lots].sort(
    (a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
  )
  let remaining = Math.abs(totalDelta)
  const result: LotAssignment[] = []
  for (const lot of fifoLots) {
    if (remaining <= FIFO_TOLERANCE) break
    if (lot.quantity_remaining <= 0) continue
    const take = Math.min(lot.quantity_remaining, remaining)
    result.push({
      lotId: lot.id,
      lotCode: lot.lot_code,
      expiryDate: lot.expiry_date,
      currentRemaining: lot.quantity_remaining,
      delta: -take,
    })
    remaining -= take
  }

  if (remaining > FIFO_TOLERANCE) {
    const latest = [...lots].sort(
      (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    )[0]
    const idx = result.findIndex(r => r.lotId === latest.id)
    if (idx >= 0) {
      result[idx] = { ...result[idx], delta: result[idx].delta - remaining }
    } else {
      result.push({
        lotId: latest.id,
        lotCode: latest.lot_code,
        expiryDate: latest.expiry_date,
        currentRemaining: latest.quantity_remaining,
        delta: -remaining,
      })
    }
  }

  if (result.length === 0) {
    const latest = [...lots].sort(
      (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    )[0]
    result.push({
      lotId: latest.id,
      lotCode: latest.lot_code,
      expiryDate: latest.expiry_date,
      currentRemaining: latest.quantity_remaining,
      delta: totalDelta,
    })
  }

  return result
}

export function LotDistributionPanel({
  lots,
  loading,
  totalDelta,
  assignments,
  onAssignmentsChange,
}: LotDistributionPanelProps) {
  const [addLotId, setAddLotId] = useState<string>("")
  const [signatureSeed, setSignatureSeed] = useState<string>("")

  const lotsSignature = useMemo(() => lots.map(l => l.id).sort().join("|"), [lots])

  useEffect(() => {
    if (loading) return
    const seed = `${lotsSignature}::${totalDelta}`
    if (seed === signatureSeed) return
    setSignatureSeed(seed)
    const suggestion = buildSuggestion(lots, totalDelta)
    onAssignmentsChange(suggestion)
  }, [lots, lotsSignature, totalDelta, loading, onAssignmentsChange, signatureSeed])

  const assignedSum = assignments.reduce((acc, a) => acc + (Number.isFinite(a.delta) ? a.delta : 0), 0)
  const pending = totalDelta - assignedSum
  const reconciled = Math.abs(pending) < FIFO_TOLERANCE

  const availableToAdd = lots.filter(l => !assignments.some(a => a.lotId === l.id))

  const updateDelta = (lotId: string, value: string) => {
    const numeric = value === "" || value === "-" ? 0 : Number(value)
    const next = assignments.map(a =>
      a.lotId === lotId ? { ...a, delta: Number.isFinite(numeric) ? numeric : 0 } : a
    )
    onAssignmentsChange(next)
  }

  const removeRow = (lotId: string) => {
    onAssignmentsChange(assignments.filter(a => a.lotId !== lotId))
  }

  const addRow = () => {
    if (!addLotId) return
    const lot = lots.find(l => l.id === addLotId)
    if (!lot) return
    if (assignments.some(a => a.lotId === lot.id)) return
    onAssignmentsChange([
      ...assignments,
      {
        lotId: lot.id,
        lotCode: lot.lot_code,
        expiryDate: lot.expiry_date,
        currentRemaining: lot.quantity_remaining,
        delta: 0,
      },
    ])
    setAddLotId("")
  }

  const fillRemaining = (lotId: string) => {
    const next = assignments.map(a =>
      a.lotId === lotId ? { ...a, delta: a.delta + pending } : a
    )
    onAssignmentsChange(next)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm">Distribución por lote</h4>
        <div
          className={`text-xs font-medium px-2 py-1 rounded ${
            reconciled
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          Restante: {pending.toFixed(2)} g
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando lotes...
        </div>
      ) : assignments.length === 0 ? (
        <p className="text-sm text-gray-500 py-3">Sin lotes asignados.</p>
      ) : (
        <div className="space-y-2">
          {assignments.map(assignment => {
            const projected = assignment.currentRemaining + (Number.isFinite(assignment.delta) ? assignment.delta : 0)
            const negative = projected < -FIFO_TOLERANCE
            return (
              <div
                key={assignment.lotId}
                className="grid grid-cols-12 gap-2 items-center text-sm border border-gray-100 rounded-md p-2"
              >
                <div className="col-span-4">
                  <p className="font-medium truncate">{assignment.lotCode}</p>
                  <p className="text-xs text-gray-500">{formatExpiry(assignment.expiryDate)}</p>
                </div>
                <div className="col-span-3 text-right">
                  <p className="text-xs text-gray-500">Actual</p>
                  <p className="font-medium">{assignment.currentRemaining.toFixed(2)}</p>
                </div>
                <div className="col-span-4">
                  <Label className="text-xs text-gray-500">Delta</Label>
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={Number.isFinite(assignment.delta) ? assignment.delta : 0}
                    onChange={e => updateDelta(assignment.lotId, e.target.value)}
                    className={`h-8 ${negative ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                  />
                  {!reconciled && Math.abs(pending) > FIFO_TOLERANCE && (
                    <button
                      type="button"
                      onClick={() => fillRemaining(assignment.lotId)}
                      className="text-[11px] text-purple-600 hover:underline mt-1"
                    >
                      Asignar restante aquí
                    </button>
                  )}
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(assignment.lotId)}
                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                    aria-label="Eliminar lote"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {negative && (
                  <p className="col-span-12 text-[11px] text-red-600">
                    El saldo del lote quedaría negativo ({projected.toFixed(2)}).
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {availableToAdd.length > 0 && (
        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-xs text-gray-500">+ Asignar a otro lote</Label>
            <Select value={addLotId} onValueChange={setAddLotId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Seleccionar lote disponible" />
              </SelectTrigger>
              <SelectContent>
                {availableToAdd.map(lot => (
                  <SelectItem key={lot.id} value={lot.id}>
                    {lot.lot_code} · {lot.quantity_remaining.toFixed(2)} g
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
            disabled={!addLotId}
          >
            <Plus className="h-4 w-4 mr-1" />
            Añadir
          </Button>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-gray-600 border-t pt-2">
        <span>Suma asignada: {assignedSum.toFixed(2)} g</span>
        <span>Total ajuste: {totalDelta.toFixed(2)} g</span>
      </div>
    </div>
  )
}

export function isReconciled(assignments: LotAssignment[], totalDelta: number) {
  const sum = assignments.reduce((acc, a) => acc + (Number.isFinite(a.delta) ? a.delta : 0), 0)
  return Math.abs(totalDelta - sum) < FIFO_TOLERANCE
}
