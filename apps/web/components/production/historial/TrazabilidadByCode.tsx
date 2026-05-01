"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { GitBranch, AlertCircle, Loader2, Search, Boxes } from "lucide-react"
import { Input } from "@/components/ui/input"
import { glassStyles } from "@/components/dashboard/glass-styles"
import { supabase } from "@/lib/supabase"
import {
  useLotTraceability,
  type LotRow,
  type LotInternalCodeRow,
} from "@/hooks/use-lot-traceability"
import type { Database } from "@/lib/database.types"
import { HeaderCard, LABEL_CLASS, LotTraceabilityTree } from "./traceability-shared"

type Product = Database["public"]["Tables"]["products"]["Row"]

interface Props {
  products: Product[]
}

interface SearchResult {
  lot: LotRow
  matched_by: "lot_code" | "internal_code"
  matches: number
}

export function TrazabilidadByCode({ products }: Props) {
  const { findLotByCode, getLotInternalCodes } = useLotTraceability()
  const [input, setInput] = useState("")
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [internalCodes, setInternalCodes] = useState<LotInternalCodeRow[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const handleSearch = async (raw: string) => {
    const code = raw.trim()
    if (!code) {
      setResult(null)
      setNotFound(false)
      setError(null)
      return
    }

    setSearching(true)
    setError(null)
    setNotFound(false)

    try {
      const found = await findLotByCode(code)
      if (!found) {
        setResult(null)
        setNotFound(true)
        return
      }

      const { data: lotData, error: lotErr } = await supabase
        .schema("inventario")
        .from("lots")
        .select("id, lot_code, quantity_initial, quantity_remaining, expiry_date, received_at, source_type, product_id, shift_production_id, reception_id")
        .eq("id", found.lot_id)
        .single()

      if (lotErr) throw lotErr
      if (!lotData) {
        setResult(null)
        setNotFound(true)
        return
      }

      setResult({ lot: lotData as LotRow, matched_by: found.matched_by, matches: found.matches })

      try {
        const codes = await getLotInternalCodes(lotData.id)
        setInternalCodes(codes)
      } catch {
        setInternalCodes([])
      }
    } catch (err: any) {
      console.error("Error searching code", err)
      setError(err?.message || "Error en la búsqueda")
      setResult(null)
    } finally {
      setSearching(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(input)
  }

  const handleBlur = () => {
    if (input.trim() && (!result || (result.lot.lot_code !== input.trim() && !internalCodes.some((c) => c.internal_code === input.trim())))) {
      handleSearch(input)
    }
  }

  useEffect(() => {
    if (!input.trim()) {
      setResult(null)
      setNotFound(false)
      setError(null)
      setInternalCodes([])
    }
  }, [input])

  const product = result ? productMap.get(result.lot.product_id) : undefined

  return (
    <div className="space-y-3 md:space-y-4">
      <div className={`${glassStyles.containers.card} !p-3 md:!p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm md:text-base font-semibold text-gray-900">Trazabilidad por código</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <label className={LABEL_CLASS}>Lot code o código interno</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onBlur={handleBlur}
                placeholder="Ej. 2613, 2613L, 25-03M 09:30"
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
              No se encontró ningún lote o producción con ese código
            </span>
          )}
          {!error && !notFound && result && (
            <span className="text-gray-600">
              {result.matches > 1 ? `${result.matches} resultados` : "1 resultado"} ·{" "}
              <span className="font-medium text-gray-800">
                {result.matched_by === "lot_code" ? "lot_code" : "internal_code"}
              </span>
              {result.matches > 1 && <span className="text-gray-400"> (mostrando el más reciente)</span>}
            </span>
          )}
        </div>
      </div>

      {!result && !searching && !notFound && (
        <div className={`${glassStyles.containers.card} !p-8 md:!p-12 text-center`}>
          <Boxes className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">Ingresa un lot_code o internal_code para ver su trazabilidad</p>
        </div>
      )}

      {result && (
        <>
          <HeaderCard lot={result.lot} product={product} internalCodes={internalCodes} />
          <LotTraceabilityTree selectedLot={result.lot} rootShiftProductionId={result.lot.shift_production_id} />
        </>
      )}
    </div>
  )
}
