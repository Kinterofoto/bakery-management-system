"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Search, Check, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"

type MaterialSupplierWithDetails = {
  id: string
  material_id: string
  supplier_id: string
  unit_price: number
  packaging_weight_grams: number | null
  packaging_unit: number | null
  presentation: string | null
  is_preferred: boolean
  status: string
  material?: { id: string; name: string; unit: string | null; is_active: boolean }
  supplier?: { id: string; company_name: string }
}

interface CostsTabProps {
  materialSuppliers: MaterialSupplierWithDetails[]
  onRefresh: () => Promise<void>
}

export function CostsTab({ materialSuppliers: initialData, onRefresh }: CostsTabProps) {
  // Local copy of data to avoid full page refreshes on each cell edit
  const [localData, setLocalData] = useState<MaterialSupplierWithDetails[]>(initialData)

  // Sync when parent data changes (e.g. tab switch, initial load)
  useEffect(() => { setLocalData(initialData) }, [initialData])
  const [searchQuery, setSearchQuery] = useState("")
  const [editedCells, setEditedCells] = useState<Map<string, string>>(new Map())
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set())
  const [savedCells, setSavedCells] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const saveTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const activeAssignments = localData.filter(ms => ms.status === "active")

  // Group assignments by material
  const materialRows = useMemo(() => {
    const grouped = new Map<string, { material: { id: string; name: string; unit: string | null }; suppliers: MaterialSupplierWithDetails[] }>()

    activeAssignments.forEach(ms => {
      if (!ms.material || ms.material.is_active === false) return
      if (!grouped.has(ms.material_id)) {
        grouped.set(ms.material_id, {
          material: { id: ms.material.id, name: ms.material.name, unit: ms.material.unit },
          suppliers: [],
        })
      }
      grouped.get(ms.material_id)!.suppliers.push(ms)
    })

    // Sort suppliers within each material: preferred first, then by company name
    grouped.forEach(row => {
      row.suppliers.sort((a, b) => {
        if (a.is_preferred && !b.is_preferred) return -1
        if (!a.is_preferred && b.is_preferred) return 1
        return (a.supplier?.company_name || "").localeCompare(b.supplier?.company_name || "")
      })
    })

    return Array.from(grouped.values()).sort((a, b) => a.material.name.localeCompare(b.material.name))
  }, [activeAssignments])

  // Max number of supplier columns needed
  const maxSuppliers = useMemo(() => {
    return Math.max(materialRows.reduce((max, row) => Math.max(max, row.suppliers.length), 0), 1)
  }, [materialRows])

  const filteredRows = searchQuery
    ? materialRows.filter(r => r.material.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : materialRows

  const getCostPerGram = (ms: MaterialSupplierWithDetails): number | null => {
    if (!ms.packaging_weight_grams || ms.packaging_weight_grams === 0) return null
    return ms.unit_price / ms.packaging_weight_grams
  }

  const formatCostPerGram = (cpg: number | null): string => {
    if (cpg === null) return ""
    return cpg.toFixed(2)
  }

  const getCellValue = (assignmentId: string, ms: MaterialSupplierWithDetails): string => {
    if (editedCells.has(assignmentId)) return editedCells.get(assignmentId)!
    return formatCostPerGram(getCostPerGram(ms))
  }

  const saveCell = useCallback(async (assignmentId: string, ms: MaterialSupplierWithDetails, value: string) => {
    const newCostPerGram = parseFloat(value)
    if (isNaN(newCostPerGram) || newCostPerGram < 0) return

    const packagingWeight = ms.packaging_weight_grams || 1
    const newUnitPrice = Math.round(newCostPerGram * packagingWeight * 100) / 100

    setSavingCells(prev => new Set(prev).add(assignmentId))
    try {
      const { error } = await supabase
        .schema("compras")
        .from("material_suppliers")
        .update({ unit_price: newUnitPrice })
        .eq("id", assignmentId)

      if (error) throw error

      // Update local data in place — no full refresh needed
      setLocalData(prev => prev.map(item =>
        item.id === assignmentId ? { ...item, unit_price: newUnitPrice } : item
      ))
      setSavedCells(prev => new Set(prev).add(assignmentId))
      setTimeout(() => setSavedCells(prev => { const n = new Set(prev); n.delete(assignmentId); return n }), 1500)
      setEditedCells(prev => { const n = new Map(prev); n.delete(assignmentId); return n })
    } catch {
      toast({ title: "Error al guardar", description: "No se pudo actualizar el costo.", variant: "destructive" })
    } finally {
      setSavingCells(prev => { const n = new Set(prev); n.delete(assignmentId); return n })
    }
  }, [onRefresh, toast])

  const handleCellChange = (assignmentId: string, ms: MaterialSupplierWithDetails, value: string) => {
    setEditedCells(prev => new Map(prev).set(assignmentId, value))
    const existing = saveTimeouts.current.get(assignmentId)
    if (existing) clearTimeout(existing)
    if (value.trim() !== "") {
      const timeout = setTimeout(() => { saveCell(assignmentId, ms, value); saveTimeouts.current.delete(assignmentId) }, 1500)
      saveTimeouts.current.set(assignmentId, timeout)
    }
  }

  const handleCellBlur = (assignmentId: string, ms: MaterialSupplierWithDetails) => {
    const value = editedCells.get(assignmentId)
    if (value !== undefined && value.trim() !== "") {
      const existing = saveTimeouts.current.get(assignmentId)
      if (existing) clearTimeout(existing)
      saveTimeouts.current.delete(assignmentId)
      saveCell(assignmentId, ms, value)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, assignmentId: string, ms: MaterialSupplierWithDetails) => {
    if (e.key === "Enter") { e.preventDefault(); handleCellBlur(assignmentId, ms); (e.target as HTMLInputElement).blur() }
    if (e.key === "Escape") {
      setEditedCells(prev => { const n = new Map(prev); n.delete(assignmentId); return n })
      ;(e.target as HTMLInputElement).blur()
    }
  }

  useEffect(() => { return () => { saveTimeouts.current.forEach(t => clearTimeout(t)) } }, [])

  const uniqueSupplierCount = new Set(activeAssignments.map(ms => ms.supplier_id)).size

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Materiales con Costo</p>
          <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">{materialRows.length}</p>
        </div>
        <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Proveedores</p>
          <p className="text-3xl font-semibold text-blue-600 mt-2">{uniqueSupplierCount}</p>
        </div>
        <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Asignaciones Activas</p>
          <p className="text-3xl font-semibold text-green-600 mt-2">{activeAssignments.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar materiales..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <AlertCircle className="w-4 h-4" />
            <span>Costo por gramo ($/gr) — editable, se guarda automáticamente</span>
          </div>
        </div>
      </div>

      {/* Costs Table */}
      <div className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl overflow-hidden shadow-lg shadow-black/5">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50/50 dark:bg-white/5 backdrop-blur-sm">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 sticky left-0 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-sm z-10 min-w-[200px] border-r border-gray-200/30 dark:border-white/10">
                  Material
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[60px] border-r border-gray-200/30 dark:border-white/10">
                  Ud
                </th>
                {Array.from({ length: maxSuppliers }, (_, i) => (
                  <th key={i} className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[180px] border-r border-gray-200/30 dark:border-white/10 last:border-r-0">
                    Proveedor {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/30 dark:divide-white/10">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={2 + maxSuppliers} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {searchQuery ? "No se encontraron materiales" : "No hay asignaciones activas. Crea asignaciones en la pestaña Asignaciones."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.material.id} className="hover:bg-white/30 dark:hover:bg-white/5 transition-colors duration-150">
                    <td className="px-4 py-2 sticky left-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 border-r border-gray-200/30 dark:border-white/10">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate max-w-[200px]" title={row.material.name}>
                        {row.material.name}
                      </p>
                    </td>
                    <td className="px-4 py-2 text-center text-xs text-gray-500 dark:text-gray-400 border-r border-gray-200/30 dark:border-white/10">
                      {row.material.unit || "-"}
                    </td>
                    {Array.from({ length: maxSuppliers }, (_, i) => {
                      const ms = row.suppliers[i]
                      if (!ms) {
                        return (
                          <td key={i} className="px-2 py-2 text-center border-r border-gray-200/30 dark:border-white/10 last:border-r-0 bg-gray-50/30 dark:bg-gray-800/20">
                            <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                          </td>
                        )
                      }

                      const isSaving = savingCells.has(ms.id)
                      const isSaved = savedCells.has(ms.id)
                      const value = getCellValue(ms.id, ms)

                      return (
                        <td key={i} className={`px-2 py-1.5 border-r border-gray-200/30 dark:border-white/10 last:border-r-0 ${ms.is_preferred ? "bg-blue-50/50 dark:bg-blue-900/20" : ""}`}>
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate px-1" title={ms.supplier?.company_name}>
                              {ms.supplier?.company_name || "N/A"}
                              {ms.is_preferred && <span className="ml-1 text-blue-500 text-[10px]">★</span>}
                            </p>
                            <div className="relative">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={value}
                                onChange={(e) => handleCellChange(ms.id, ms, e.target.value)}
                                onBlur={() => handleCellBlur(ms.id, ms)}
                                onKeyDown={(e) => handleKeyDown(e, ms.id, ms)}
                                className={`w-full text-center text-sm py-1 px-2 rounded-lg bg-transparent border border-transparent hover:border-gray-300/50 dark:hover:border-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all duration-150 ${isSaving ? "text-blue-500" : "text-gray-900 dark:text-white"} ${isSaved ? "text-green-600" : ""} ${!value ? "text-gray-400 italic" : ""}`}
                                placeholder="—"
                              />
                              {isSaving && (
                                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                              )}
                              {isSaved && (
                                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                                  <Check className="w-3 h-3 text-green-500" />
                                </div>
                              )}
                            </div>
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
