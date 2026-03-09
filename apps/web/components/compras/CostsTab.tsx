"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Check, AlertCircle, Plus } from "lucide-react"
import { SearchableSelect } from "@/components/ui/searchable-select"
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

type MaterialBasic = {
  id: string
  name: string
  unit: string | null
  is_active: boolean
}

type SupplierBasic = {
  id: string
  company_name: string
  status: string
}

interface CostsTabProps {
  materialSuppliers: MaterialSupplierWithDetails[]
  allMaterials: MaterialBasic[]
  allSuppliers: SupplierBasic[]
  onRefresh: () => Promise<void>
}

export function CostsTab({ materialSuppliers: initialData, allMaterials, allSuppliers, onRefresh }: CostsTabProps) {
  const [localData, setLocalData] = useState<MaterialSupplierWithDetails[]>(initialData)
  useEffect(() => { setLocalData(initialData) }, [initialData])

  const [searchQuery, setSearchQuery] = useState("")
  const [editedCells, setEditedCells] = useState<Map<string, string>>(new Map())
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set())
  const [savedCells, setSavedCells] = useState<Set<string>>(new Set())
  // Track which cells are showing the supplier picker: key = "materialId_colIndex"
  const [addingCells, setAddingCells] = useState<Set<string>>(new Set())
  const [creatingAssignment, setCreatingAssignment] = useState(false)
  const { toast } = useToast()
  const saveTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const activeAssignments = localData.filter(ms => ms.status === "active")
  const activeMaterials = allMaterials.filter(m => m.is_active !== false)
  const activeSuppliers = allSuppliers.filter(s => s.status === "active")

  // Group assignments by material
  const assignmentsByMaterial = useMemo(() => {
    const grouped = new Map<string, MaterialSupplierWithDetails[]>()
    activeAssignments.forEach(ms => {
      if (!ms.material || ms.material.is_active === false) return
      if (!grouped.has(ms.material_id)) grouped.set(ms.material_id, [])
      grouped.get(ms.material_id)!.push(ms)
    })
    grouped.forEach(list => {
      list.sort((a, b) => {
        if (a.is_preferred && !b.is_preferred) return -1
        if (!a.is_preferred && b.is_preferred) return 1
        return (a.supplier?.company_name || "").localeCompare(b.supplier?.company_name || "")
      })
    })
    return grouped
  }, [activeAssignments])

  const allRows = useMemo(() => {
    const rows: { material: { id: string; name: string; unit: string | null }; suppliers: MaterialSupplierWithDetails[]; hasAssignment: boolean }[] = []
    activeMaterials.forEach(m => {
      const suppliers = assignmentsByMaterial.get(m.id) || []
      rows.push({ material: { id: m.id, name: m.name, unit: m.unit }, suppliers, hasAssignment: suppliers.length > 0 })
    })
    return rows.sort((a, b) => a.material.name.localeCompare(b.material.name))
  }, [activeMaterials, assignmentsByMaterial])

  const maxSuppliers = useMemo(() => {
    return Math.max(allRows.reduce((max, row) => Math.max(max, row.suppliers.length), 0), 1)
  }, [allRows])

  const filteredRows = searchQuery
    ? allRows.filter(r => r.material.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allRows

  // Stats
  const totalMaterials = activeMaterials.length
  const materialsWithAssignment = allRows.filter(r => r.hasAssignment).length
  const assignmentsWithCost = activeAssignments.filter(ms => {
    if (!ms.packaging_weight_grams || ms.packaging_weight_grams === 0) return false
    return ms.unit_price > 0
  }).length
  const totalAssignments = activeAssignments.length

  const getCostPerGram = (ms: MaterialSupplierWithDetails): number | null => {
    if (!ms.packaging_weight_grams || ms.packaging_weight_grams === 0) return null
    return ms.unit_price / ms.packaging_weight_grams
  }

  const hasCost = (ms: MaterialSupplierWithDetails): boolean => {
    const cpg = getCostPerGram(ms)
    return cpg !== null && cpg > 0
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

    const needsWeight = !ms.packaging_weight_grams || ms.packaging_weight_grams === 0
    const packagingWeight = needsWeight ? 1 : ms.packaging_weight_grams!
    const newUnitPrice = Math.round(newCostPerGram * packagingWeight * 100) / 100

    setSavingCells(prev => new Set(prev).add(assignmentId))
    try {
      const updatePayload: Record<string, number> = { unit_price: newUnitPrice }
      if (needsWeight) updatePayload.packaging_weight_grams = 1

      const { error } = await supabase
        .schema("compras")
        .from("material_suppliers")
        .update(updatePayload)
        .eq("id", assignmentId)

      if (error) throw error

      setLocalData(prev => prev.map(item =>
        item.id === assignmentId
          ? { ...item, unit_price: newUnitPrice, packaging_weight_grams: needsWeight ? 1 : item.packaging_weight_grams }
          : item
      ))
      setSavedCells(prev => new Set(prev).add(assignmentId))
      setTimeout(() => setSavedCells(prev => { const n = new Set(prev); n.delete(assignmentId); return n }), 1500)
      setEditedCells(prev => { const n = new Map(prev); n.delete(assignmentId); return n })
    } catch {
      toast({ title: "Error al guardar", description: "No se pudo actualizar el costo.", variant: "destructive" })
    } finally {
      setSavingCells(prev => { const n = new Set(prev); n.delete(assignmentId); return n })
    }
  }, [toast])

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

  // Delete a material-supplier assignment
  const handleDeleteAssignment = async (assignmentId: string, supplierName: string) => {
    if (!confirm(`¿Eliminar la asignación de ${supplierName}?`)) return
    try {
      const { error } = await supabase
        .schema("compras")
        .from("material_suppliers")
        .delete()
        .eq("id", assignmentId)

      if (error) throw error

      setLocalData(prev => prev.filter(item => item.id !== assignmentId))
      toast({ title: "Asignación eliminada", description: `${supplierName} eliminado exitosamente.` })
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar la asignación.", variant: "destructive" })
    }
  }

  // Get available suppliers for a material (not already assigned)
  const getAvailableSuppliers = (materialId: string) => {
    const assignedSupplierIds = new Set(
      (assignmentsByMaterial.get(materialId) || []).map(ms => ms.supplier_id)
    )
    return activeSuppliers
      .filter(s => !assignedSupplierIds.has(s.id))
      .map(s => ({ value: s.id, label: s.company_name }))
  }

  // Create a new material-supplier assignment
  const handleAssignSupplier = async (materialId: string, supplierId: string, cellKey: string) => {
    if (!supplierId || creatingAssignment) return
    setCreatingAssignment(true)
    try {
      const { data, error } = await supabase
        .schema("compras")
        .from("material_suppliers")
        .insert([{
          material_id: materialId,
          supplier_id: supplierId,
          unit_price: 0,
          packaging_unit: 1,
          packaging_weight_grams: 1,
          status: "active",
        }])
        .select()
        .single()

      if (error) throw error

      // Add to local data
      const material = activeMaterials.find(m => m.id === materialId)
      const supplier = activeSuppliers.find(s => s.id === supplierId)
      const newAssignment: MaterialSupplierWithDetails = {
        ...data,
        material: material ? { id: material.id, name: material.name, unit: material.unit, is_active: true } : undefined,
        supplier: supplier ? { id: supplier.id, company_name: supplier.company_name } : undefined,
      }
      setLocalData(prev => [...prev, newAssignment])

      toast({ title: "Proveedor asignado", description: `${supplier?.company_name} asignado exitosamente.` })
    } catch {
      toast({ title: "Error", description: "No se pudo asignar el proveedor.", variant: "destructive" })
    } finally {
      setCreatingAssignment(false)
      setAddingCells(prev => { const n = new Set(prev); n.delete(cellKey); return n })
    }
  }

  useEffect(() => { return () => { saveTimeouts.current.forEach(t => clearTimeout(t)) } }, [])

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Materiales Activos</p>
          <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">{totalMaterials}</p>
        </div>
        <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Con al menos 1 proveedor</p>
          <p className="text-3xl font-semibold mt-2">
            <span className="text-green-600">{materialsWithAssignment}</span>
            <span className="text-lg text-gray-400 font-normal"> / {totalMaterials}</span>
          </p>
        </div>
        <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Asignaciones con costo</p>
          <p className="text-3xl font-semibold mt-2">
            <span className={assignmentsWithCost === totalAssignments ? "text-green-600" : "text-orange-500"}>{assignmentsWithCost}</span>
            <span className="text-lg text-gray-400 font-normal"> / {totalAssignments}</span>
          </p>
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
                    No se encontraron materiales
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const availableSuppliers = getAvailableSuppliers(row.material.id)

                  return (
                    <tr key={row.material.id} className="hover:bg-white/30 dark:hover:bg-white/5 transition-colors duration-150">
                      <td className="px-4 py-2 sticky left-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 border-r border-gray-200/30 dark:border-white/10">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-gray-900 dark:text-white truncate max-w-[180px]" title={row.material.name}>
                            {row.material.name}
                          </p>
                          {!row.hasAssignment && (
                            <Badge className="bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50 text-[10px] px-1.5 py-0 whitespace-nowrap shrink-0">
                              Sin asignación
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center text-xs text-gray-500 dark:text-gray-400 border-r border-gray-200/30 dark:border-white/10">
                        {row.material.unit || "-"}
                      </td>
                      {Array.from({ length: maxSuppliers }, (_, i) => {
                        const ms = row.suppliers[i]
                        const cellKey = `${row.material.id}_${i}`
                        const isAdding = addingCells.has(cellKey)

                        // Empty cell — show add button or supplier picker
                        if (!ms) {
                          const canAdd = availableSuppliers.length > 0

                          if (isAdding) {
                            return (
                              <td key={i} className="px-1 py-1 border-r border-gray-200/30 dark:border-white/10 last:border-r-0 bg-gray-50/30 dark:bg-gray-800/20">
                                <div className="relative z-20">
                                  <SearchableSelect
                                    options={availableSuppliers}
                                    value={null}
                                    onChange={(supplierId) => handleAssignSupplier(row.material.id, supplierId, cellKey)}
                                    placeholder="Buscar proveedor..."
                                    className="min-w-[160px]"
                                  />
                                  <button
                                    onClick={() => setAddingCells(prev => { const n = new Set(prev); n.delete(cellKey); return n })}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-500 text-xs z-30"
                                  >
                                    ×
                                  </button>
                                </div>
                              </td>
                            )
                          }

                          return (
                            <td key={i} className="px-2 py-2 text-center border-r border-gray-200/30 dark:border-white/10 last:border-r-0 bg-gray-50/30 dark:bg-gray-800/20">
                              {canAdd ? (
                                <button
                                  onClick={() => setAddingCells(prev => new Set(prev).add(cellKey))}
                                  className="text-gray-300 hover:text-blue-500 dark:text-gray-600 dark:hover:text-blue-400 transition-colors duration-150 mx-auto flex items-center justify-center gap-1 group"
                                  title="Asignar proveedor"
                                >
                                  <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                </button>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                              )}
                            </td>
                          )
                        }

                        // Existing assignment cell
                        const isSaving = savingCells.has(ms.id)
                        const isSaved = savedCells.has(ms.id)
                        const value = getCellValue(ms.id, ms)
                        const missingCost = !hasCost(ms) && !editedCells.has(ms.id)

                        return (
                          <td key={i} className={`px-0 py-0 border-r border-gray-200/30 dark:border-white/10 last:border-r-0 ${missingCost ? "bg-red-50/60 dark:bg-red-900/10" : ""} ${ms.is_preferred ? "bg-blue-50/30 dark:bg-blue-900/10" : ""}`}>
                            <div>
                              <div className={`px-2 py-1 border-b flex items-center justify-between gap-1 ${missingCost ? "bg-red-100/60 dark:bg-red-900/20 border-red-200/40 dark:border-red-800/30" : "bg-gray-100/80 dark:bg-white/5 border-gray-200/40 dark:border-white/10"}`}>
                                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate" title={ms.supplier?.company_name}>
                                  {ms.supplier?.company_name || "N/A"}
                                  {ms.is_preferred && <span className="ml-1 text-blue-500">★</span>}
                                </p>
                                <button
                                  onClick={() => handleDeleteAssignment(ms.id, ms.supplier?.company_name || "")}
                                  className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-[10px] leading-none"
                                  title="Eliminar asignación"
                                >
                                  ×
                                </button>
                              </div>
                              <div className="relative px-1 py-1">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={value}
                                  onChange={(e) => handleCellChange(ms.id, ms, e.target.value)}
                                  onBlur={() => handleCellBlur(ms.id, ms)}
                                  onKeyDown={(e) => handleKeyDown(e, ms.id, ms)}
                                  className={`w-full text-center font-semibold text-base py-1.5 px-2 rounded-lg bg-transparent border border-transparent hover:border-gray-300/50 dark:hover:border-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all duration-150 ${isSaving ? "text-blue-500" : "text-gray-900 dark:text-white"} ${isSaved ? "text-green-600" : ""} ${!value ? "text-gray-400 italic" : ""}`}
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
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
