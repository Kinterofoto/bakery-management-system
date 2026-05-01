"use client"

import { useEffect, useMemo, useState } from "react"
import {
  GitBranch,
  Factory,
  PackageOpen,
  Layers,
  CornerDownRight,
  AlertCircle,
  Loader2,
  CalendarClock,
  Boxes,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { glassStyles } from "@/components/dashboard/glass-styles"
import { productNameWithWeight } from "@/lib/production-analytics-utils"
import { useLotTraceability, type LotRow, type ParentLotRow } from "@/hooks/use-lot-traceability"
import type { Database } from "@/lib/database.types"

type Product = Database["public"]["Tables"]["products"]["Row"]

const MAX_DEPTH = 5
const LABEL_CLASS = "text-[11px] font-medium tracking-wide text-gray-500 uppercase block mb-1.5"

interface TrazabilidadTabProps {
  products: Product[]
  initialProductId?: string
  onProductChange?: (productId: string) => void
}

function sourceTypeBadge(source: string) {
  switch (source) {
    case "production":
      return { label: "Producción", className: "bg-blue-100 text-blue-700 border-blue-200", icon: Factory }
    case "reception":
      return { label: "Recepción", className: "bg-green-100 text-green-700 border-green-200", icon: PackageOpen }
    case "manual":
      return { label: "Manual", className: "bg-amber-100 text-amber-700 border-amber-200", icon: Layers }
    case "backfill":
      return { label: "Inicial", className: "bg-gray-100 text-gray-700 border-gray-200", icon: Layers }
    default:
      return { label: source || "—", className: "bg-gray-100 text-gray-700 border-gray-200", icon: Layers }
  }
}

function formatNumber(n: number | null | undefined, digits = 2) {
  if (n == null || isNaN(Number(n))) return "—"
  return Number(n).toLocaleString("es-CO", { maximumFractionDigits: digits })
}

function formatDateRelative(dateStr: string | null | undefined) {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    const rel = formatDistanceToNow(d, { addSuffix: true, locale: es })
    const abs = format(d, "dd/MM/yyyy HH:mm")
    return { rel, abs }
  } catch {
    return null
  }
}

function formatExpiry(dateStr: string | null | undefined) {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr + "T12:00:00")
    const abs = format(d, "dd/MM/yyyy")
    const now = new Date()
    const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return { abs, days }
  } catch {
    return null
  }
}

function RemainingBar({ initial, remaining }: { initial: number; remaining: number }) {
  const pct = initial > 0 ? Math.max(0, Math.min(100, (remaining / initial) * 100)) : 0
  const color = pct > 50 ? "bg-green-500" : pct > 20 ? "bg-amber-500" : "bg-red-500"
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between text-[11px] text-gray-500 mb-1">
        <span>{formatNumber(remaining)} disponibles</span>
        <span>de {formatNumber(initial)}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div className={`${color} h-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function HeaderCard({ lot, product }: { lot: LotRow; product: Product | undefined }) {
  const badge = sourceTypeBadge(lot.source_type)
  const Icon = badge.icon
  const received = formatDateRelative(lot.received_at)
  const expiry = formatExpiry(lot.expiry_date)
  const productName = product ? productNameWithWeight(product) : "Producto"

  return (
    <div className={`${glassStyles.containers.card} !p-4 md:!p-6`}>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
              <Icon className="h-3 w-3" />
              {badge.label}
            </span>
            <span className="font-mono text-sm md:text-base font-semibold text-gray-900 break-all">{lot.lot_code}</span>
          </div>
          <h3 className="mt-1 text-base md:text-lg font-semibold text-gray-900 truncate">{productName}</h3>
          {received && (
            <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              {lot.source_type === "production" ? "Producido" : "Recibido"} {received.rel}
              <span className="text-gray-400">· {received.abs}</span>
            </p>
          )}
        </div>

        <div className="md:w-64 w-full flex-shrink-0">
          <RemainingBar initial={lot.quantity_initial} remaining={lot.quantity_remaining} />
        </div>
      </div>

      {(expiry || lot.shift_production_id) && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
          {expiry && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              Vence: <span className="font-medium text-gray-800">{expiry.abs}</span>
              {expiry.days >= 0 ? (
                <span className="text-gray-400">({expiry.days} d)</span>
              ) : (
                <span className="text-red-500">(vencido hace {Math.abs(expiry.days)} d)</span>
              )}
            </span>
          )}
          {lot.shift_production_id && (
            <a
              href={`/produccion/historial/turno/${lot.shift_production_id}`}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
            >
              <Factory className="h-3.5 w-3.5" />
              Ver producción
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function ParentLotsList({
  parents,
  depth,
  expandedIds,
  onToggle,
  childrenByParent,
  loadingParentIds,
}: {
  parents: ParentLotRow[]
  depth: number
  expandedIds: Set<string>
  onToggle: (lot: ParentLotRow) => void
  childrenByParent: Map<string, ParentLotRow[] | "leaf" | "error">
  loadingParentIds: Set<string>
}) {
  if (parents.length === 0) return null
  const indent = depth === 0 ? 0 : 1

  return (
    <ul className={`space-y-2 ${indent ? "ml-3 md:ml-6 border-l border-dashed border-gray-200 pl-3 md:pl-4" : ""}`}>
      {parents.map((parent) => {
        const badge = sourceTypeBadge(parent.source_type)
        const Icon = badge.icon
        const expiry = formatExpiry(parent.expiry_date)
        const isExpandable = parent.source_type === "production" && !!parent.shift_production_id && depth + 1 < MAX_DEPTH
        const isExpanded = expandedIds.has(parent.id)
        const isLoading = loadingParentIds.has(parent.id)
        const childData = childrenByParent.get(parent.id)

        return (
          <li key={parent.id}>
            <div
              className={`relative rounded-xl border border-gray-200/70 bg-white/60 backdrop-blur-sm p-3 transition-colors ${
                isExpandable ? "hover:border-blue-300 cursor-pointer" : ""
              }`}
              onClick={() => isExpandable && onToggle(parent)}
            >
              <div className="flex items-start gap-2 md:gap-3">
                <CornerDownRight className="h-4 w-4 text-gray-300 mt-0.5 flex-shrink-0 hidden md:block" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                      <Icon className="h-3 w-3" />
                      {badge.label}
                    </span>
                    <span className="font-mono text-xs md:text-sm font-semibold text-gray-900 break-all">{parent.lot_code}</span>
                    {parent.productCategory && (
                      <span className="text-[10px] uppercase tracking-wide text-gray-400">{parent.productCategory}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-800 truncate">{parent.productName}</p>

                  <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-1 text-[11px] md:text-xs">
                    <div>
                      <span className="text-gray-500">Consumido:</span>{" "}
                      <span className="font-semibold text-gray-900">
                        {formatNumber(parent.consumedQuantity)} {parent.consumedUnit || parent.productUnit || ""}
                      </span>
                    </div>
                    {expiry && (
                      <div>
                        <span className="text-gray-500">Vence:</span>{" "}
                        <span className={expiry.days < 0 ? "text-red-600 font-medium" : "text-gray-800"}>{expiry.abs}</span>
                      </div>
                    )}
                    <div className="col-span-2 md:col-span-1">
                      <span className="text-gray-500">Disponible:</span>{" "}
                      <span className="text-gray-800">
                        {formatNumber(parent.quantity_remaining)} / {formatNumber(parent.quantity_initial)}
                      </span>
                    </div>
                  </div>
                </div>

                {isExpandable && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggle(parent)
                    }}
                    className="flex-shrink-0 self-start text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isExpanded ? (
                      "Contraer"
                    ) : (
                      "Expandir"
                    )}
                  </button>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="mt-2">
                {isLoading && (
                  <div className="ml-3 md:ml-6 text-xs text-gray-400 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Cargando componentes...
                  </div>
                )}
                {!isLoading && childData === "error" && (
                  <div className="ml-3 md:ml-6 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Error al cargar componentes
                  </div>
                )}
                {!isLoading && childData === "leaf" && (
                  <div className="ml-3 md:ml-6 text-xs text-gray-400 italic">Sin componentes registrados</div>
                )}
                {!isLoading && Array.isArray(childData) && childData.length > 0 && (
                  <ParentLotsList
                    parents={childData}
                    depth={depth + 1}
                    expandedIds={expandedIds}
                    onToggle={onToggle}
                    childrenByParent={childrenByParent}
                    loadingParentIds={loadingParentIds}
                  />
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function TrazabilidadTab({ products, initialProductId, onProductChange }: TrazabilidadTabProps) {
  const { getLotsForProduct, getParentLots } = useLotTraceability()

  const [productId, setProductId] = useState<string>(
    initialProductId && initialProductId !== "all" ? initialProductId : ""
  )
  const [lots, setLots] = useState<LotRow[]>([])
  const [lotsLoading, setLotsLoading] = useState(false)
  const [lotsError, setLotsError] = useState<string | null>(null)

  const [selectedLotId, setSelectedLotId] = useState<string>("")

  const [rootParents, setRootParents] = useState<ParentLotRow[] | null>(null)
  const [rootLoading, setRootLoading] = useState(false)
  const [rootError, setRootError] = useState<string | null>(null)

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [childrenByParent, setChildrenByParent] = useState<Map<string, ParentLotRow[] | "leaf" | "error">>(new Map())
  const [loadingParentIds, setLoadingParentIds] = useState<Set<string>>(new Set())

  const productOptions = useMemo(() => {
    const filtered = products.filter((p) => p.category === "PT" || p.category === "PP")
    return [
      { value: "", label: "Selecciona un producto..." },
      ...filtered.map((p) => ({ value: p.id, label: productNameWithWeight(p), subLabel: p.category || undefined })),
    ]
  }, [products])

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const selectedLot = useMemo(() => lots.find((l) => l.id === selectedLotId) || null, [lots, selectedLotId])

  // Reset state when product changes
  useEffect(() => {
    if (!productId) {
      setLots([])
      setSelectedLotId("")
      setRootParents(null)
      setExpandedIds(new Set())
      setChildrenByParent(new Map())
      return
    }

    let cancelled = false
    setLotsLoading(true)
    setLotsError(null)
    setRootParents(null)
    setExpandedIds(new Set())
    setChildrenByParent(new Map())

    getLotsForProduct(productId)
      .then((data) => {
        if (cancelled) return
        setLots(data)
        setSelectedLotId(data.length > 0 ? data[0].id : "")
      })
      .catch((err) => {
        if (cancelled) return
        console.error("Error loading lots", err)
        setLotsError(err?.message || "Error cargando lotes")
        setLots([])
      })
      .finally(() => {
        if (!cancelled) setLotsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [productId, getLotsForProduct])

  // Load root parents whenever the selected lot changes
  useEffect(() => {
    if (!selectedLot) {
      setRootParents(null)
      return
    }

    setExpandedIds(new Set())
    setChildrenByParent(new Map())

    if (!selectedLot.shift_production_id) {
      setRootParents([])
      setRootError(null)
      return
    }

    let cancelled = false
    setRootLoading(true)
    setRootError(null)

    getParentLots(selectedLot.shift_production_id)
      .then((parents) => {
        if (cancelled) return
        setRootParents(parents)
      })
      .catch((err) => {
        if (cancelled) return
        console.error("Error loading parent lots", err)
        setRootError(err?.message || "Error cargando trazabilidad")
        setRootParents([])
      })
      .finally(() => {
        if (!cancelled) setRootLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedLot, getParentLots])

  const lotOptions = useMemo(() => {
    return lots.map((l) => {
      const dt = l.received_at ? format(new Date(l.received_at), "dd/MM/yyyy") : ""
      const badge = sourceTypeBadge(l.source_type).label
      return {
        value: l.id,
        label: `${l.lot_code} · ${dt}`,
        subLabel: `${badge} · ${formatNumber(l.quantity_remaining)} disp.`,
      }
    })
  }, [lots])

  const handleToggleParent = async (parent: ParentLotRow) => {
    const isExpanded = expandedIds.has(parent.id)
    if (isExpanded) {
      const next = new Set(expandedIds)
      next.delete(parent.id)
      setExpandedIds(next)
      return
    }

    const next = new Set(expandedIds)
    next.add(parent.id)
    setExpandedIds(next)

    if (childrenByParent.has(parent.id)) return

    if (!parent.shift_production_id) {
      const newMap = new Map(childrenByParent)
      newMap.set(parent.id, "leaf")
      setChildrenByParent(newMap)
      return
    }

    const loadingNext = new Set(loadingParentIds)
    loadingNext.add(parent.id)
    setLoadingParentIds(loadingNext)

    try {
      const children = await getParentLots(parent.shift_production_id)
      const newMap = new Map(childrenByParent)
      newMap.set(parent.id, children.length === 0 ? "leaf" : children)
      setChildrenByParent(newMap)
    } catch (err) {
      console.error("Error loading children", err)
      const newMap = new Map(childrenByParent)
      newMap.set(parent.id, "error")
      setChildrenByParent(newMap)
    } finally {
      const loadingDone = new Set(loadingParentIds)
      loadingDone.delete(parent.id)
      setLoadingParentIds(loadingDone)
    }
  }

  const handleProductChange = (value: string) => {
    setProductId(value)
    onProductChange?.(value)
  }

  const product = productId ? productMap.get(productId) : undefined

  return (
    <div className="space-y-3 md:space-y-4">
      <div className={`${glassStyles.containers.card} !p-3 md:!p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm md:text-base font-semibold text-gray-900">Trazabilidad de Lotes</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
          <div>
            <label className={LABEL_CLASS}>Producto</label>
            <SearchableSelect
              options={productOptions}
              value={productId}
              onChange={handleProductChange}
              placeholder="Selecciona un producto..."
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Lote</label>
            <SearchableSelect
              options={lotOptions}
              value={selectedLotId}
              onChange={setSelectedLotId}
              placeholder={
                !productId ? "Primero selecciona un producto" : lotsLoading ? "Cargando..." : lots.length === 0 ? "Sin lotes" : "Selecciona un lote..."
              }
              disabled={!productId || lotsLoading || lots.length === 0}
            />
          </div>
        </div>
        {lotsError && (
          <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            {lotsError}
          </p>
        )}
      </div>

      {!productId && (
        <div className={`${glassStyles.containers.card} !p-8 md:!p-12 text-center`}>
          <Boxes className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">Selecciona un producto para ver su trazabilidad</p>
        </div>
      )}

      {productId && !lotsLoading && lots.length === 0 && !lotsError && (
        <div className={`${glassStyles.containers.card} !p-8 md:!p-12 text-center`}>
          <Boxes className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">Este producto aún no tiene lotes registrados</p>
        </div>
      )}

      {productId && lotsLoading && (
        <div className={`${glassStyles.containers.card} !p-8 text-center`}>
          <Loader2 className="h-6 w-6 mx-auto text-gray-400 animate-spin" />
        </div>
      )}

      {selectedLot && (
        <>
          <HeaderCard lot={selectedLot} product={product} />

          <div className={`${glassStyles.containers.card} !p-3 md:!p-6`}>
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <GitBranch className="h-4 w-4 text-gray-500" />
              <h4 className="text-sm md:text-base font-semibold text-gray-900">Componentes consumidos</h4>
            </div>

            {rootLoading && (
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Cargando trazabilidad...
              </div>
            )}

            {!rootLoading && rootError && (
              <div className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {rootError}
              </div>
            )}

            {!rootLoading && !rootError && selectedLot.source_type !== "production" && (
              <p className="text-sm text-gray-500 italic">
                {selectedLot.source_type === "reception"
                  ? "Lote de recepción — sin componentes"
                  : selectedLot.source_type === "backfill"
                  ? "Lote inicial — sin componentes"
                  : "Lote sin componentes registrados"}
              </p>
            )}

            {!rootLoading &&
              !rootError &&
              selectedLot.source_type === "production" &&
              rootParents !== null &&
              rootParents.length === 0 && (
                <p className="text-sm text-gray-500 italic">Sin componentes registrados para este lote</p>
              )}

            {!rootLoading && !rootError && rootParents && rootParents.length > 0 && (
              <ParentLotsList
                parents={rootParents}
                depth={0}
                expandedIds={expandedIds}
                onToggle={handleToggleParent}
                childrenByParent={childrenByParent}
                loadingParentIds={loadingParentIds}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}
