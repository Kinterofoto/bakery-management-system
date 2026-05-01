"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  useOrderItemLots,
  type DistributionRow,
  type OrderItemLotRow,
  type ProductLotWithCodes,
} from "@/hooks/use-order-item-lots"

const TOLERANCE = 0.0001

interface OrderItemLotsModalProps {
  isOpen: boolean
  onClose: () => void
  orderItemId: string | null
  productId: string | null
  productName: string
  dispatchedQty: number
  userId: string | null
  onSaved: () => void
}

interface RowState {
  lot_id: string
  lot_code: string
  expiry_date: string | null
  received_at: string
  quantity_remaining_total: number
  shift_production_id: string | null
  internal_code: string | null
  quantity: number
  internal_codes: Array<{
    shift_production_id: string | null
    internal_code: string | null
    movement_date: string
    quantity: number
  }>
}

function formatExpiry(date: string | null): string {
  if (!date) return "Sin vencimiento"
  try {
    const [y, m, d] = date.split("-")
    if (y && m && d) return `${d}/${m}/${y}`
    return date
  } catch {
    return date
  }
}

export function OrderItemLotsModal({
  isOpen,
  onClose,
  orderItemId,
  productId,
  productName,
  dispatchedQty,
  userId,
  onSaved,
}: OrderItemLotsModalProps) {
  const { getLotsForOrderItem, getProductLotsWithInternalCodes, fetchLotInternalCodes, replaceLots } =
    useOrderItemLots()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<RowState[]>([])
  const [availableLots, setAvailableLots] = useState<ProductLotWithCodes[]>([])
  const [addLotId, setAddLotId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !orderItemId || !productId) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [existing, allProductLots] = await Promise.all([
          getLotsForOrderItem(orderItemId),
          getProductLotsWithInternalCodes(productId),
        ])
        if (cancelled) return

        const byLotId = new Map(allProductLots.map(l => [l.id, l]))

        const initialRows: RowState[] = await Promise.all(
          (existing as OrderItemLotRow[]).map(async r => {
            const productLot = byLotId.get(r.lot_id)
            let codes = productLot?.internal_codes
            let lotCode = productLot?.lot_code || r.lot?.lot_code || ""
            let expiry = productLot?.expiry_date ?? r.lot?.expiry_date ?? null
            let received = productLot?.received_at ?? r.lot?.received_at ?? ""
            let remaining = productLot?.quantity_remaining ?? r.lot?.quantity_remaining ?? 0

            if (!codes) {
              codes = await fetchLotInternalCodes(r.lot_id)
            }

            return {
              lot_id: r.lot_id,
              lot_code: lotCode,
              expiry_date: expiry,
              received_at: received,
              quantity_remaining_total: Number(remaining),
              shift_production_id: r.shift_production_id,
              internal_code: r.internal_code,
              quantity: Number(r.quantity),
              internal_codes: codes,
            }
          })
        )

        setRows(initialRows)
        setAvailableLots(allProductLots)
      } catch (err: any) {
        setError(err?.message || "Error cargando lotes")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [isOpen, orderItemId, productId, getLotsForOrderItem, getProductLotsWithInternalCodes, fetchLotInternalCodes])

  useEffect(() => {
    if (!isOpen) {
      setRows([])
      setAvailableLots([])
      setAddLotId("")
      setError(null)
      setSaving(false)
    }
  }, [isOpen])

  const totalAssigned = useMemo(
    () => rows.reduce((acc, r) => acc + (Number.isFinite(r.quantity) ? Number(r.quantity) : 0), 0),
    [rows]
  )
  const remaining = dispatchedQty - totalAssigned
  const reconciled = Math.abs(remaining) < TOLERANCE && rows.length > 0
  const hasInvalidQuantity = rows.some(r => !Number.isFinite(r.quantity) || r.quantity <= 0)

  const lotsAvailableToAdd = useMemo(
    () => availableLots.filter(l => !rows.some(r => r.lot_id === l.id)),
    [availableLots, rows]
  )

  const updateQuantity = (lotId: string, value: string) => {
    const numeric = value === "" ? 0 : Number(value)
    setRows(prev => prev.map(r => (r.lot_id === lotId ? { ...r, quantity: Number.isFinite(numeric) ? numeric : 0 } : r)))
  }

  const updateInternalCode = (lotId: string, shiftProductionId: string) => {
    setRows(prev =>
      prev.map(r => {
        if (r.lot_id !== lotId) return r
        const sentinel = "__no_prod__"
        const found = r.internal_codes.find(
          c => (c.shift_production_id ?? sentinel) === shiftProductionId
        )
        return {
          ...r,
          shift_production_id: found?.shift_production_id ?? null,
          internal_code: found?.internal_code ?? null,
        }
      })
    )
  }

  const removeRow = (lotId: string) => {
    setRows(prev => prev.filter(r => r.lot_id !== lotId))
  }

  const addRow = () => {
    if (!addLotId) return
    const lot = availableLots.find(l => l.id === addLotId)
    if (!lot) return
    if (rows.some(r => r.lot_id === lot.id)) return
    const oldest = lot.internal_codes[0]
    const fillQty = Math.max(0, remaining > 0 ? Math.min(remaining, lot.quantity_remaining) : 0)
    setRows(prev => [
      ...prev,
      {
        lot_id: lot.id,
        lot_code: lot.lot_code,
        expiry_date: lot.expiry_date,
        received_at: lot.received_at,
        quantity_remaining_total: lot.quantity_remaining,
        shift_production_id: oldest?.shift_production_id ?? null,
        internal_code: oldest?.internal_code ?? null,
        quantity: fillQty,
        internal_codes: lot.internal_codes,
      },
    ])
    setAddLotId("")
  }

  const fillRemainingHere = (lotId: string) => {
    setRows(prev => prev.map(r => (r.lot_id === lotId ? { ...r, quantity: r.quantity + remaining } : r)))
  }

  const handleSave = async () => {
    if (!orderItemId) return
    if (!reconciled) return
    if (hasInvalidQuantity) {
      setError("Todas las cantidades deben ser mayores a 0")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const distribution: DistributionRow[] = rows.map((r, idx) => ({
        lot_id: r.lot_id,
        lot_code: r.lot_code,
        shift_production_id: r.shift_production_id,
        internal_code: r.internal_code,
        quantity: Number(r.quantity),
        sequence: idx + 1,
      }))
      await replaceLots(orderItemId, distribution, userId)
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.message || "Error guardando distribución")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Distribución de lotes</DialogTitle>
          <p className="text-sm text-gray-600 truncate">{productName}</p>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 border rounded-md p-3 bg-gray-50">
          <div>
            <p className="text-xs text-gray-500">Cantidad despachada</p>
            <p className="text-lg font-semibold">{dispatchedQty}</p>
          </div>
          <div
            className={`text-xs font-medium px-2 py-1 rounded ${
              reconciled ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            Restante: {remaining.toFixed(2)}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-2">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando lotes...
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-500 py-3 text-center">Sin lotes asignados.</p>
          ) : (
            rows.map(row => {
              const exceedsRemaining = row.quantity > row.quantity_remaining_total + TOLERANCE
              const codeOptions = row.internal_codes
              return (
                <div
                  key={row.lot_id}
                  className="grid grid-cols-12 gap-2 items-start text-sm border border-gray-100 rounded-md p-2"
                >
                  <div className="col-span-4">
                    <p className="font-mono font-medium truncate">{row.lot_code}</p>
                    <p className="text-xs text-gray-500">Vence: {formatExpiry(row.expiry_date)}</p>
                    <p className="text-xs text-gray-500">Disp: {row.quantity_remaining_total.toFixed(2)}</p>
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs text-gray-500">Cantidad</Label>
                    <Input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={Number.isFinite(row.quantity) ? row.quantity : 0}
                      onChange={e => updateQuantity(row.lot_id, e.target.value)}
                      className={`h-8 ${exceedsRemaining ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                    />
                    {!reconciled && Math.abs(remaining) > TOLERANCE && (
                      <button
                        type="button"
                        onClick={() => fillRemainingHere(row.lot_id)}
                        className="text-[11px] text-purple-600 hover:underline mt-1"
                      >
                        Asignar restante
                      </button>
                    )}
                  </div>
                  <div className="col-span-4">
                    <Label className="text-xs text-gray-500">Código interno</Label>
                    <Select
                      value={row.shift_production_id ?? "__no_prod__"}
                      onValueChange={val => updateInternalCode(row.lot_id, val)}
                      disabled={codeOptions.length === 0}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder={codeOptions.length === 0 ? "Sin producciones" : "Seleccionar"} />
                      </SelectTrigger>
                      <SelectContent>
                        {codeOptions.map(c => (
                          <SelectItem
                            key={(c.shift_production_id ?? "no-prod") + c.movement_date}
                            value={c.shift_production_id ?? "__no_prod__"}
                          >
                            <span className="font-mono">{c.internal_code ?? "(sin código)"}</span>
                            <span className="text-xs text-gray-500 ml-2">{Number(c.quantity).toFixed(0)}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 flex justify-end pt-5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(row.lot_id)}
                      className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                      aria-label="Eliminar lote"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {exceedsRemaining && (
                    <p className="col-span-12 text-[11px] text-red-600">
                      La cantidad supera el saldo disponible ({row.quantity_remaining_total.toFixed(2)}).
                    </p>
                  )}
                </div>
              )
            })
          )}

          {!loading && lotsAvailableToAdd.length > 0 && (
            <div className="mt-3 flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs text-gray-500">+ Añadir otro lote</Label>
                <Select value={addLotId} onValueChange={setAddLotId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Seleccionar lote disponible" />
                  </SelectTrigger>
                  <SelectContent>
                    {lotsAvailableToAdd.map(lot => (
                      <SelectItem key={lot.id} value={lot.id}>
                        <span className="font-mono">{lot.lot_code}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          Disp: {lot.quantity_remaining.toFixed(2)} · Vence {formatExpiry(lot.expiry_date)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={!addLotId}>
                <Plus className="h-4 w-4 mr-1" />
                Añadir
              </Button>
            </div>
          )}

          {error && <p className="text-xs text-red-600 pt-2">{error}</p>}
        </div>

        <DialogFooter className="border-t pt-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={!reconciled || saving || hasInvalidQuantity}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
