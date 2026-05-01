"use client"

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  GitBranch,
  AlertCircle,
  Loader2,
  Search,
  Boxes,
  Package,
  CalendarClock,
  ChevronRight,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { glassStyles } from "@/components/dashboard/glass-styles"
import { supabase } from "@/lib/supabase"
import {
  useLotTraceability,
  type LotRow,
  type OrderForTraceability,
  type OrderItemForTraceability,
  type OrderItemLotRow,
} from "@/hooks/use-lot-traceability"
import type { Database } from "@/lib/database.types"
import {
  HeaderCard,
  LABEL_CLASS,
  LotTraceabilityTree,
  formatNumber,
  sourceTypeBadge,
} from "./traceability-shared"

type Product = Database["public"]["Tables"]["products"]["Row"]

interface Props {
  products: Product[]
}

interface DrillDown {
  lot: LotRow
  internalCode: string | null
  shiftProductionId: string | null
}

export function TrazabilidadByOrder({ products }: Props) {
  const { getOrderLots, getLotInternalCodes } = useLotTraceability()
  const [input, setInput] = useState("")
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [order, setOrder] = useState<OrderForTraceability | null>(null)
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null)
  const [drillInternalCodes, setDrillInternalCodes] = useState<Awaited<ReturnType<typeof getLotInternalCodes>>>([])

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const handleSearch = async (raw: string) => {
    const code = raw.trim()
    if (!code) {
      setOrder(null)
      setNotFound(false)
      setError(null)
      return
    }

    setSearching(true)
    setError(null)
    setNotFound(false)
    setDrillDown(null)
    setDrillInternalCodes([])

    try {
      const found = await getOrderLots(code)
      if (!found) {
        setOrder(null)
        setNotFound(true)
        return
      }
      setOrder(found)
    } catch (err: any) {
      console.error("Error searching order", err)
      setError(err?.message || "Error en la búsqueda")
      setOrder(null)
    } finally {
      setSearching(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(input)
  }

  const handleBlur = () => {
    if (input.trim() && (!order || order.order_number !== input.trim())) {
      handleSearch(input)
    }
  }

  useEffect(() => {
    if (!input.trim()) {
      setOrder(null)
      setNotFound(false)
      setError(null)
      setDrillDown(null)
      setDrillInternalCodes([])
    }
  }, [input])

  const handleDrillDown = async (item: OrderItemForTraceability, oil: OrderItemLotRow) => {
    setDrillDown(null)
    setDrillInternalCodes([])
    try {
      const { data: lotData, error: lotErr } = await supabase
        .schema("inventario")
        .from("lots")
        .select("id, lot_code, quantity_initial, quantity_remaining, expiry_date, received_at, source_type, product_id, shift_production_id, reception_id")
        .eq("id", oil.lot_id)
        .single()
      if (lotErr) throw lotErr
      if (!lotData) return

      setDrillDown({
        lot: lotData as LotRow,
        internalCode: oil.internal_code,
        shiftProductionId: oil.parent_shift_production_id,
      })

      try {
        const codes = await getLotInternalCodes(lotData.id)
        setDrillInternalCodes(codes)
      } catch {
        setDrillInternalCodes([])
      }

      if (typeof window !== "undefined") {
        setTimeout(() => {
          document.getElementById("trazabilidad-drilldown")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }, 100)
      }
    } catch (err: any) {
      console.error("Error loading drilldown lot", err)
      setError(err?.message || "Error cargando lote")
    }
  }

  const drillProduct = drillDown ? productMap.get(drillDown.lot.product_id) : undefined

  return (
    <div className="space-y-3 md:space-y-4">
      <div className={`${glassStyles.containers.card} !p-3 md:!p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm md:text-base font-semibold text-gray-900">Trazabilidad por pedido</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <label className={LABEL_CLASS}>Número de pedido</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onBlur={handleBlur}
                placeholder="Ej. ORD-12345"
                className="pl-9"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={searching || !input.trim()}
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </button>
          </div>
        </form>

        <div className="mt-2 min-h-[18px] text-xs">
          {error && (
            <span className="text-red-500 inline-flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </span>
          )}
          {!error && notFound && (
            <span className="text-amber-600 inline-flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              No se encontró ningún pedido con ese número
            </span>
          )}
          {!error && !notFound && order && (
            <span className="text-gray-600">
              {order.items.length} {order.items.length === 1 ? "ítem" : "ítems"} encontrados
            </span>
          )}
        </div>
      </div>

      {!order && !searching && !notFound && (
        <div className={`${glassStyles.containers.card} !p-8 md:!p-12 text-center`}>
          <Boxes className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">Ingresa un número de pedido para ver su trazabilidad</p>
        </div>
      )}

      {order && (
        <>
          <div className={`${glassStyles.containers.card} !p-4 md:!p-6`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium tracking-wide text-gray-500 uppercase">Pedido</p>
                <h3 className="text-base md:text-lg font-semibold text-gray-900 font-mono">{order.order_number}</h3>
                {order.client_name && <p className="text-sm text-gray-600 mt-0.5">{order.client_name}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Entrega: {format(new Date(order.expected_delivery_date + "T12:00:00"), "dd/MM/yyyy", { locale: es })}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 text-[11px] font-medium uppercase tracking-wide">
                  {order.status}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 md:space-y-3">
            {order.items.map((item) => {
              const product = item.product_id ? productMap.get(item.product_id) : undefined
              const productName = product ? product.name : item.product_name || "Producto"
              const weight = product?.weight ? parseFloat(product.weight) : NaN
              const displayName = !isNaN(weight) && weight > 0 ? `${productName} (${weight}g)` : productName
              return (
                <div key={item.id} className={`${glassStyles.containers.card} !p-3 md:!p-4`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <h4 className="text-sm md:text-base font-semibold text-gray-900 truncate">{displayName}</h4>
                        {item.product_category && (
                          <span className="text-[10px] uppercase tracking-wide text-gray-400">{item.product_category}</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-600 ml-6">
                        Despachado:{" "}
                        <span className="font-medium text-gray-800">
                          {formatNumber(item.quantity_dispatched ?? 0)} {item.product_unit || ""}
                        </span>
                        <span className="text-gray-400"> / Solicitado: {formatNumber(item.quantity_requested)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 ml-6 space-y-1.5">
                    {item.lots.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Sin lote asignado</p>
                    ) : (
                      item.lots.map((oil) => {
                        const badge = sourceTypeBadge(oil.source_type)
                        const Icon = badge.icon
                        const isActive = drillDown?.lot.id === oil.lot_id
                        return (
                          <button
                            key={oil.id}
                            type="button"
                            onClick={() => handleDrillDown(item, oil)}
                            className={`w-full text-left rounded-lg border p-2 md:p-2.5 transition-colors flex items-center gap-2 flex-wrap ${
                              isActive
                                ? "border-blue-300 bg-blue-50/60"
                                : "border-gray-200/70 bg-white/60 hover:border-blue-200 hover:bg-blue-50/30"
                            }`}
                          >
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                              <Icon className="h-3 w-3" />
                              {badge.label}
                            </span>
                            <span className="font-mono text-xs md:text-sm font-semibold text-gray-900 break-all">
                              {oil.lot_code || "—"}
                            </span>
                            {oil.internal_code && (
                              <span className="font-mono text-[11px] text-gray-700 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">
                                {oil.internal_code}
                              </span>
                            )}
                            <span className="text-xs text-gray-600">
                              <span className="text-gray-400">qty:</span>{" "}
                              <span className="font-medium text-gray-800">
                                {formatNumber(oil.quantity)} {item.product_unit || ""}
                              </span>
                            </span>
                            <ChevronRight className="h-3.5 w-3.5 text-gray-400 ml-auto" />
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {drillDown && (
            <div id="trazabilidad-drilldown" className="space-y-3 md:space-y-4 pt-2">
              <HeaderCard lot={drillDown.lot} product={drillProduct} internalCodes={drillInternalCodes} />
              <LotTraceabilityTree
                selectedLot={drillDown.lot}
                rootShiftProductionId={drillDown.shiftProductionId || drillDown.lot.shift_production_id}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
