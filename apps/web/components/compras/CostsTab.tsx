"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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

type CellKey = `${string}_${string}`

interface CostsTabProps {
  materialSuppliers: MaterialSupplierWithDetails[]
  onRefresh: () => Promise<void>
}

export function CostsTab({ materialSuppliers, onRefresh }: CostsTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [editedCells, setEditedCells] = useState<Map<CellKey, string>>(new Map())
  const [savingCells, setSavingCells] = useState<Set<CellKey>>(new Set())
  const [savedCells, setSavedCells] = useState<Set<CellKey>>(new Set())
  const { toast } = useToast()
  const saveTimeouts = useRef<Map<CellKey, NodeJS.Timeout>>(new Map())

  const activeAssignments = materialSuppliers.filter(ms => ms.status === "active")

  // Unique suppliers with active assignments
  const suppliersMap = new Map<string, string>()
  activeAssignments.forEach(ms => {
    if (ms.supplier) suppliersMap.set(ms.supplier.id, ms.supplier.company_name)
  })
  const uniqueSuppliers = Array.from(suppliersMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  // Unique active materials with assignments
  const materialsMap = new Map<string, { id: string; name: string; unit: string | null }>()
  activeAssignments.forEach(ms => {
    if (ms.material && ms.material.is_active !== false) {
      materialsMap.set(ms.material.id, { id: ms.material.id, name: ms.material.name, unit: ms.material.unit })
    }
  })
  const uniqueMaterials = Array.from(materialsMap.values()).sort((a, b) => a.name.localeCompare(b.name))

  const filteredMaterials = searchQuery
    ? uniqueMaterials.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : uniqueMaterials

  // Lookup: materialId_supplierId -> assignment
  const assignmentLookup = new Map<CellKey, MaterialSupplierWithDetails>()
  activeAssignments.forEach(ms => {
    assignmentLookup.set(`${ms.material_id}_${ms.supplier_id}`, ms)
  })

  const getCostPerGram = (ms: MaterialSupplierWithDetails): number | null => {
    if (!ms.packaging_weight_grams || ms.packaging_weight_grams === 0) return null
    return ms.unit_price / ms.packaging_weight_grams
  }

  const formatCostPerGram = (cpg: number | null): string => {
    if (cpg === null) return ""
    return cpg.toFixed(2)
  }

  const getCellValue = (materialId: string, supplierId: string): string => {
    const key: CellKey = `${materialId}_${supplierId}`
    if (editedCells.has(key)) return editedCells.get(key)!
    const assignment = assignmentLookup.get(key)
    if (!assignment) return ""
    return formatCostPerGram(getCostPerGram(assignment))
  }

  const hasAssignment = (materialId: string, supplierId: string): boolean => {
    return assignmentLookup.has(`${materialId}_${supplierId}`)
  }

  const saveCell = useCallback(async (key: CellKey, value: string) => {
    const assignment = assignmentLookup.get(key)
    if (!assignment) return

    const newCostPerGram = parseFloat(value)
    if (isNaN(newCostPerGram) || newCostPerGram < 0) return

    const packagingWeight = assignment.packaging_weight_grams || 1
    const newUnitPrice = Math.round(newCostPerGram * packagingWeight * 100) / 100

    setSavingCells(prev => new Set(prev).add(key))
    try {
      const { error } = await supabase
        .schema("compras")
        .from("material_suppliers")
        .update({ unit_price: newUnitPrice })
        .eq("id", assignment.id)

      if (error) throw error

      setSavedCells(prev => new Set(prev).add(key))
      setTimeout(() => setSavedCells(prev => { const n = new Set(prev); n.delete(key); return n }), 1500)
      setEditedCells(prev => { const n = new Map(prev); n.delete(key); return n })
      await onRefresh()
    } catch {
      toast({ title: "Error al guardar", description: "No se pudo actualizar el costo.", variant: "destructive" })
    } finally {
      setSavingCells(prev => { const n = new Set(prev); n.delete(key); return n })
    }
  }, [assignmentLookup, onRefresh, toast])

  const handleCellChange = (materialId: string, supplierId: string, value: string) => {
    const key: CellKey = `${materialId}_${supplierId}`
    setEditedCells(prev => new Map(prev).set(key, value))
    const existing = saveTimeouts.current.get(key)
    if (existing) clearTimeout(existing)
    if (value.trim() !== "") {
      const timeout = setTimeout(() => { saveCell(key, value); saveTimeouts.current.delete(key) }, 1500)
      saveTimeouts.current.set(key, timeout)
    }
  }

  const handleCellBlur = (materialId: string, supplierId: string) => {
    const key: CellKey = `${materialId}_${supplierId}`
    const value = editedCells.get(key)
    if (value !== undefined && value.trim() !== "") {
      const existing = saveTimeouts.current.get(key)
      if (existing) clearTimeout(existing)
      saveTimeouts.current.delete(key)
      saveCell(key, value)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, materialId: string, supplierId: string) => {
    if (e.key === "Enter") { e.preventDefault(); handleCellBlur(materialId, supplierId); (e.target as HTMLInputElement).blur() }
    if (e.key === "Escape") {
      const key: CellKey = `${materialId}_${supplierId}`
      setEditedCells(prev => { const n = new Map(prev); n.delete(key); return n })
      ;(e.target as HTMLInputElement).blur()
    }
  }

  useEffect(() => { return () => { saveTimeouts.current.forEach(t => clearTimeout(t)) } }, [])

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Materiales con Costo</p>
          <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">{uniqueMaterials.length}</p>
        </div>
        <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Proveedores</p>
          <p className="text-3xl font-semibold text-blue-600 mt-2">{uniqueSuppliers.length}</p>
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
                {uniqueSuppliers.map(supplier => (
                  <th key={supplier.id} className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[150px] border-r border-gray-200/30 dark:border-white/10 last:border-r-0">
                    <div className="truncate max-w-[150px]" title={supplier.name}>{supplier.name}</div>
                    <div className="text-xs font-normal text-gray-400 mt-0.5">$/gr</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/30 dark:divide-white/10">
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={2 + uniqueSuppliers.length} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {searchQuery ? "No se encontraron materiales" : "No hay asignaciones activas. Crea asignaciones en la pestaña Asignaciones."}
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((material) => (
                  <tr key={material.id} className="hover:bg-white/30 dark:hover:bg-white/5 transition-colors duration-150">
                    <td className="px-4 py-2 sticky left-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 border-r border-gray-200/30 dark:border-white/10">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate max-w-[200px]" title={material.name}>{material.name}</p>
                    </td>
                    <td className="px-4 py-2 text-center text-xs text-gray-500 dark:text-gray-400 border-r border-gray-200/30 dark:border-white/10">
                      {material.unit || "-"}
                    </td>
                    {uniqueSuppliers.map(supplier => {
                      const key: CellKey = `${material.id}_${supplier.id}`
                      const has = hasAssignment(material.id, supplier.id)
                      const isSaving = savingCells.has(key)
                      const isSaved = savedCells.has(key)
                      const value = getCellValue(material.id, supplier.id)
                      const assignment = assignmentLookup.get(key)
                      const isPreferred = assignment?.is_preferred

                      return (
                        <td key={supplier.id} className={`px-1 py-1 text-center border-r border-gray-200/30 dark:border-white/10 last:border-r-0 ${!has ? "bg-gray-100/50 dark:bg-gray-800/30" : ""} ${isPreferred ? "bg-blue-50/50 dark:bg-blue-900/20" : ""}`}>
                          {has ? (
                            <div className="relative">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={value}
                                onChange={(e) => handleCellChange(material.id, supplier.id, e.target.value)}
                                onBlur={() => handleCellBlur(material.id, supplier.id)}
                                onKeyDown={(e) => handleKeyDown(e, material.id, supplier.id)}
                                className={`w-full text-center text-sm py-1.5 px-2 rounded-lg bg-transparent border border-transparent hover:border-gray-300/50 dark:hover:border-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all duration-150 ${isSaving ? "text-blue-500" : "text-gray-900 dark:text-white"} ${isSaved ? "text-green-600" : ""} ${!value ? "text-gray-400 italic" : ""}`}
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
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                          )}
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
