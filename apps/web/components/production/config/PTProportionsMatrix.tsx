"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Search, Check } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

type PTProduct = {
  id: string
  name: string
  weight: string | null
  category: string
}

type Operation = {
  id: string
  name: string
  code: string
}

type BOMEntry = {
  id: string
  product_id: string
  operation_id: string
  material_id: string
  quantity_needed: number
  unit_name: string
  material_name: string
}

export function PTProportionsMatrix() {
  const [products, setProducts] = useState<PTProduct[]>([])
  const [operations, setOperations] = useState<Operation[]>([])
  const [bomEntries, setBomEntries] = useState<BOMEntry[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set())
  const [savedCells, setSavedCells] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // 1. Get all PT products
      const { data: ptProducts } = await supabase
        .from("products")
        .select("id, name, weight, category")
        .eq("category", "PT")
        .eq("is_active", true)
        .order("name")

      // 2. Get all production routes with operations (for PT products only)
      const ptIds = (ptProducts || []).map(p => p.id)
      const { data: routes } = await supabase
        .schema("produccion")
        .from("production_routes")
        .select("product_id, work_center:work_centers(operation:operations(id, name, code))")
        .in("product_id", ptIds)
        .eq("is_active", true)

      // 3. Extract unique operations that have PT products
      const opsMap = new Map<string, Operation>()
      routes?.forEach((route: any) => {
        const op = route.work_center?.operation
        if (op) opsMap.set(op.id, op)
      })

      // 4. Get all BOM entries for PT products with material names
      const { data: bom } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .select("id, product_id, operation_id, material_id, quantity_needed, unit_name")
        .in("product_id", ptIds)
        .eq("is_active", true)

      // 5. Get material names
      const materialIds = [...new Set((bom || []).map(b => b.material_id).filter(Boolean))]
      const { data: materials } = await supabase
        .from("products")
        .select("id, name")
        .in("id", materialIds)

      const materialMap = new Map((materials || []).map(m => [m.id, m.name]))

      const bomWithNames: BOMEntry[] = (bom || []).map(b => ({
        ...b,
        material_name: materialMap.get(b.material_id) || "—"
      }))

      setProducts(ptProducts || [])
      setOperations(Array.from(opsMap.values()))
      setBomEntries(bomWithNames)
    } catch (error) {
      console.error("Error loading matrix data:", error)
      toast.error("Error al cargar datos de la matriz")
    }
  }

  // Build lookup: productId_operationId -> BOMEntry[]
  const bomLookup = useMemo(() => {
    const map = new Map<string, BOMEntry[]>()
    bomEntries.forEach(entry => {
      const key = `${entry.product_id}_${entry.operation_id}`
      const existing = map.get(key) || []
      existing.push(entry)
      map.set(key, existing)
    })
    return map
  }, [bomEntries])

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products
    const lower = searchTerm.toLowerCase()
    return products.filter(p => p.name.toLowerCase().includes(lower))
  }, [products, searchTerm])

  // Which operations actually have BOM entries for PT products
  const activeOperations = useMemo(() => {
    const opIds = new Set(bomEntries.map(b => b.operation_id))
    return operations.filter(op => opIds.has(op.id))
  }, [operations, bomEntries])

  const handleSaveQuantity = useCallback(async (bomId: string, newValue: string) => {
    const parsed = parseFloat(newValue.replace(",", "."))
    if (isNaN(parsed) || parsed < 0) return

    const cellKey = bomId
    setSavingCells(prev => new Set(prev).add(cellKey))

    try {
      const { error } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .update({
          quantity_needed: parsed,
          original_quantity: parsed,
          updated_at: new Date().toISOString()
        })
        .eq("id", bomId)

      if (error) throw error

      setBomEntries(prev => prev.map(b =>
        b.id === bomId ? { ...b, quantity_needed: parsed } : b
      ))

      setSavedCells(prev => new Set(prev).add(cellKey))
      setTimeout(() => setSavedCells(prev => {
        const n = new Set(prev)
        n.delete(cellKey)
        return n
      }), 1500)
    } catch (error) {
      console.error("Error saving:", error)
      toast.error("Error al guardar")
    } finally {
      setSavingCells(prev => {
        const n = new Set(prev)
        n.delete(cellKey)
        return n
      })
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent, bomId: string) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSaveQuantity(bomId, editValue)
      setEditingCell(null)
    }
    if (e.key === "Escape") {
      setEditingCell(null)
    }
  }

  const handleBlur = (bomId: string) => {
    if (editingCell === bomId) {
      handleSaveQuantity(bomId, editValue)
      setEditingCell(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Buscar producto PT..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-10"
        />
      </div>

      {/* Matrix */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10 min-w-[200px] border-r border-gray-200">
                  Producto PT
                </th>
                {activeOperations.map(op => (
                  <th
                    key={op.id}
                    className="px-3 py-2.5 text-center font-semibold text-gray-700 min-w-[160px] border-r border-gray-200 last:border-r-0"
                  >
                    {op.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={1 + activeOperations.length} className="px-6 py-12 text-center text-gray-500 text-sm">
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-2 sticky left-0 bg-white z-10 border-r border-gray-200">
                      <p className="font-medium text-gray-900 truncate" title={product.name}>
                        {product.name}{product.weight ? ` - ${product.weight}` : ""}
                      </p>
                    </td>
                    {activeOperations.map(op => {
                      const cellKey = `${product.id}_${op.id}`
                      const entries = bomLookup.get(cellKey) || []

                      if (entries.length === 0) {
                        return (
                          <td key={op.id} className="px-2 py-1 text-center border-r border-gray-200 last:border-r-0 bg-gray-50/30">
                            <span className="text-gray-300">—</span>
                          </td>
                        )
                      }

                      return (
                        <td key={op.id} className="px-0 py-0 border-r border-gray-200 last:border-r-0 align-top">
                          <div className="divide-y divide-gray-100">
                            {entries.map(entry => {
                              const isEditing = editingCell === entry.id
                              const isSaving = savingCells.has(entry.id)
                              const isSaved = savedCells.has(entry.id)

                              return (
                                <div key={entry.id} className="px-2 py-1.5">
                                  <p className="text-[10px] font-medium text-blue-700 truncate" title={entry.material_name}>
                                    {entry.material_name}
                                  </p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, entry.id)}
                                        onBlur={() => handleBlur(entry.id)}
                                        autoFocus
                                        className="w-full text-xs font-mono px-1 py-0.5 border border-blue-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                                      />
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setEditingCell(entry.id)
                                          setEditValue(entry.quantity_needed.toString())
                                        }}
                                        className="text-xs font-mono text-gray-700 hover:text-blue-600 hover:underline cursor-text"
                                      >
                                        {entry.quantity_needed.toLocaleString()}
                                      </button>
                                    )}
                                    <span className="text-[10px] text-gray-400 uppercase shrink-0">
                                      {entry.unit_name}
                                    </span>
                                    {isSaving && (
                                      <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
                                    )}
                                    {isSaved && (
                                      <Check className="w-3 h-3 text-green-500 shrink-0" />
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
