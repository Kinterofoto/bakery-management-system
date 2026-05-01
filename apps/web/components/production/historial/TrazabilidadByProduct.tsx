"use client"

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { GitBranch, AlertCircle, Loader2, Boxes } from "lucide-react"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { glassStyles } from "@/components/dashboard/glass-styles"
import { productNameWithWeight } from "@/lib/production-analytics-utils"
import {
  useLotTraceability,
  type LotRow,
  type LotInternalCodeRow,
} from "@/hooks/use-lot-traceability"
import type { Database } from "@/lib/database.types"
import {
  HeaderCard,
  LABEL_CLASS,
  LotTraceabilityTree,
  formatInternalCodesPreview,
  formatNumber,
  sourceTypeBadge,
} from "./traceability-shared"

type Product = Database["public"]["Tables"]["products"]["Row"]

interface Props {
  products: Product[]
  initialProductId?: string
  onProductChange?: (productId: string) => void
}

export function TrazabilidadByProduct({ products, initialProductId, onProductChange }: Props) {
  const { getLotsForProduct, getLotInternalCodes } = useLotTraceability()

  const [productId, setProductId] = useState<string>(
    initialProductId && initialProductId !== "all" ? initialProductId : ""
  )
  const [lots, setLots] = useState<LotRow[]>([])
  const [lotsLoading, setLotsLoading] = useState(false)
  const [lotsError, setLotsError] = useState<string | null>(null)

  const [selectedLotId, setSelectedLotId] = useState<string>("")
  const [internalCodesByLot, setInternalCodesByLot] = useState<Map<string, LotInternalCodeRow[]>>(new Map())

  const productOptions = useMemo(() => {
    const filtered = products.filter((p) => p.category === "PT" || p.category === "PP")
    return [
      { value: "", label: "Selecciona un producto..." },
      ...filtered.map((p) => ({ value: p.id, label: productNameWithWeight(p), subLabel: p.category || undefined })),
    ]
  }, [products])

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const selectedLot = useMemo(() => lots.find((l) => l.id === selectedLotId) || null, [lots, selectedLotId])

  useEffect(() => {
    if (!productId) {
      setLots([])
      setSelectedLotId("")
      setInternalCodesByLot(new Map())
      return
    }

    let cancelled = false
    setLotsLoading(true)
    setLotsError(null)

    getLotsForProduct(productId)
      .then(async (data) => {
        if (cancelled) return
        setLots(data)
        setSelectedLotId(data.length > 0 ? data[0].id : "")

        const codeMap = new Map<string, LotInternalCodeRow[]>()
        const productionLots = data.filter((l) => l.source_type === "production")
        const results = await Promise.allSettled(
          productionLots.map((l) => getLotInternalCodes(l.id).then((codes) => ({ id: l.id, codes })))
        )
        if (cancelled) return
        for (const r of results) {
          if (r.status === "fulfilled") codeMap.set(r.value.id, r.value.codes)
        }
        setInternalCodesByLot(codeMap)
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
  }, [productId, getLotsForProduct, getLotInternalCodes])

  const lotOptions = useMemo(() => {
    return lots.map((l) => {
      const dt = l.received_at ? format(new Date(l.received_at), "dd/MM/yyyy") : ""
      const badge = sourceTypeBadge(l.source_type).label
      const codes = internalCodesByLot.get(l.id) || []
      const codesPreview = formatInternalCodesPreview(codes.map((c) => c.internal_code))
      const subLabelParts = [l.lot_code, codesPreview, `${badge}`, `${formatNumber(l.quantity_remaining)} disp.`].filter(Boolean)
      return {
        value: l.id,
        label: `${l.lot_code} · ${dt}`,
        subLabel: subLabelParts.join(" · "),
      }
    })
  }, [lots, internalCodesByLot])

  const handleProductChange = (value: string) => {
    setProductId(value)
    onProductChange?.(value)
  }

  const product = productId ? productMap.get(productId) : undefined
  const selectedInternalCodes = selectedLotId ? internalCodesByLot.get(selectedLotId) : undefined

  return (
    <div className="space-y-3 md:space-y-4">
      <div className={`${glassStyles.containers.card} !p-3 md:!p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm md:text-base font-semibold text-gray-900">Trazabilidad por producto</h3>
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
          <HeaderCard lot={selectedLot} product={product} internalCodes={selectedInternalCodes} />
          <LotTraceabilityTree selectedLot={selectedLot} rootShiftProductionId={selectedLot.shift_production_id} />
        </>
      )}
    </div>
  )
}
