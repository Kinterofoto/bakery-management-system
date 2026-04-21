"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Search, Check, Plus, X } from "lucide-react"
import { SearchableSelect } from "@/components/ui/searchable-select"
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

type MaterialOption = {
  id: string
  name: string
  category: string
}

export function PTProportionsMatrix() {
  const [products, setProducts] = useState<PTProduct[]>([])
  const [operations, setOperations] = useState<Operation[]>([])
  const [bomEntries, setBomEntries] = useState<BOMEntry[]>([])
  const [allMaterials, setAllMaterials] = useState<MaterialOption[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set())
  const [savedCells, setSavedCells] = useState<Set<string>>(new Set())
  // For changing material on existing entry
  const [changingMaterial, setChangingMaterial] = useState<string | null>(null)
  // For adding new entry to empty cell: "productId_operationId"
  const [addingCell, setAddingCell] = useState<string | null>(null)
  const [addForm, setAddForm] = useState({ material_id: "", quantity: "", unit: "GR" })

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

      // 4. Get all BOM entries for PT products
      const { data: bom } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .select("id, product_id, operation_id, material_id, quantity_needed, unit_name")
        .in("product_id", ptIds)
        .eq("is_active", true)

      // 5. Get all MP and PP products (for material selection)
      const { data: mpPpProducts } = await supabase
        .from("products")
        .select("id, name, category")
        .in("category", ["MP", "PP"])
        .eq("is_active", true)
        .order("name")

      // 6. Get material names for BOM entries
      const materialIds = [...new Set((bom || []).map(b => b.material_id).filter(Boolean))]
      const materialMap = new Map<string, string>()
      mpPpProducts?.forEach(m => materialMap.set(m.id, m.name))
      // Also fetch any materials not in MP/PP (edge case)
      if (materialIds.length > 0) {
        const { data: extraMats } = await supabase
          .from("products")
          .select("id, name")
          .in("id", materialIds)
        extraMats?.forEach(m => { if (!materialMap.has(m.id)) materialMap.set(m.id, m.name) })
      }

      const bomWithNames: BOMEntry[] = (bom || []).map(b => ({
        ...b,
        material_name: materialMap.get(b.material_id) || "—"
      }))

      setProducts(ptProducts || [])
      setOperations(Array.from(opsMap.values()))
      setBomEntries(bomWithNames)
      setAllMaterials(mpPpProducts || [])
    } catch (error) {
      console.error("Error loading matrix data:", error)
      toast.error("Error al cargar datos de la matriz")
    }
  }

  const materialOptions = useMemo(() =>
    allMaterials.map(m => ({
      value: m.id,
      label: m.name,
      subLabel: m.category
    })),
    [allMaterials]
  )

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

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products
    const lower = searchTerm.toLowerCase()
    return products.filter(p => p.name.toLowerCase().includes(lower))
  }, [products, searchTerm])

  // Show columns for operations that have routes for PT (not just BOM entries)
  const activeOperations = useMemo(() => {
    const opIds = new Set(bomEntries.map(b => b.operation_id))
    return operations.filter(op => opIds.has(op.id))
  }, [operations, bomEntries])

  // --- Handlers ---

  const markSaved = (key: string) => {
    setSavedCells(prev => new Set(prev).add(key))
    setTimeout(() => setSavedCells(prev => { const n = new Set(prev); n.delete(key); return n }), 1500)
  }

  const handleSaveQuantity = useCallback(async (bomId: string, newValue: string) => {
    const parsed = parseFloat(newValue.replace(",", "."))
    if (isNaN(parsed) || parsed < 0) return

    setSavingCells(prev => new Set(prev).add(bomId))
    try {
      const { error } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .update({ quantity_needed: parsed, original_quantity: parsed, updated_at: new Date().toISOString() })
        .eq("id", bomId)
      if (error) throw error

      setBomEntries(prev => prev.map(b => b.id === bomId ? { ...b, quantity_needed: parsed } : b))
      markSaved(bomId)
    } catch (error) {
      console.error("Error saving:", error)
      toast.error("Error al guardar")
    } finally {
      setSavingCells(prev => { const n = new Set(prev); n.delete(bomId); return n })
    }
  }, [])

  const handleChangeMaterial = async (bomId: string, newMaterialId: string) => {
    const mat = allMaterials.find(m => m.id === newMaterialId)
    if (!mat) return

    setSavingCells(prev => new Set(prev).add(bomId))
    try {
      const { error } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .update({ material_id: newMaterialId, updated_at: new Date().toISOString() })
        .eq("id", bomId)
      if (error) throw error

      setBomEntries(prev => prev.map(b =>
        b.id === bomId ? { ...b, material_id: newMaterialId, material_name: mat.name } : b
      ))
      setChangingMaterial(null)
      markSaved(bomId)
    } catch (error) {
      console.error("Error changing material:", error)
      toast.error("Error al cambiar material")
    } finally {
      setSavingCells(prev => { const n = new Set(prev); n.delete(bomId); return n })
    }
  }

  const handleDeleteEntry = async (bomId: string, materialName: string) => {
    if (!confirm(`¿Eliminar "${materialName}" de este BOM?`)) return

    setSavingCells(prev => new Set(prev).add(bomId))
    try {
      const { error } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .delete()
        .eq("id", bomId)
      if (error) throw error

      setBomEntries(prev => prev.filter(b => b.id !== bomId))
      toast.success("Material eliminado")
    } catch (error) {
      console.error("Error deleting entry:", error)
      toast.error("Error al eliminar material")
    } finally {
      setSavingCells(prev => { const n = new Set(prev); n.delete(bomId); return n })
    }
  }

  const handleAddEntry = async (productId: string, operationId: string) => {
    if (!addForm.material_id || !addForm.quantity) {
      toast.error("Selecciona material y cantidad")
      return
    }
    const parsed = parseFloat(addForm.quantity.replace(",", "."))
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Cantidad inválida")
      return
    }

    const mat = allMaterials.find(m => m.id === addForm.material_id)
    try {
      const { data, error } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .insert({
          product_id: productId,
          operation_id: operationId,
          material_id: addForm.material_id,
          quantity_needed: parsed,
          original_quantity: parsed,
          unit_name: addForm.unit || "GR",
          unit_equivalence_grams: 1,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      setBomEntries(prev => [...prev, {
        ...data,
        material_name: mat?.name || "—"
      }])
      setAddingCell(null)
      setAddForm({ material_id: "", quantity: "", unit: "GR" })
      toast.success("Material agregado")
    } catch (error) {
      console.error("Error adding entry:", error)
      toast.error("Error al agregar material")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, bomId: string) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSaveQuantity(bomId, editValue)
      setEditingCell(null)
    }
    if (e.key === "Escape") setEditingCell(null)
  }

  const handleBlur = (bomId: string) => {
    if (editingCell === bomId) {
      handleSaveQuantity(bomId, editValue)
      setEditingCell(null)
    }
  }

  // Shared add form UI
  const renderAddForm = (productId: string, opId: string) => (
    <div className="space-y-2 p-2 bg-gray-50 rounded-lg">
      <SearchableSelect
        options={materialOptions}
        value={addForm.material_id || null}
        onChange={(v) => setAddForm(f => ({ ...f, material_id: v }))}
        placeholder="Seleccionar material..."
      />
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="decimal"
          placeholder="Cantidad"
          value={addForm.quantity}
          onChange={(e) => setAddForm(f => ({ ...f, quantity: e.target.value }))}
          onKeyDown={(e) => { if (e.key === "Enter") handleAddEntry(productId, opId) }}
          className="flex-1 text-sm px-2 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="text"
          placeholder="Ud"
          value={addForm.unit}
          onChange={(e) => setAddForm(f => ({ ...f, unit: e.target.value }))}
          className="w-14 text-sm px-2 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <div className="flex gap-2">
        <button onClick={() => handleAddEntry(productId, opId)} className="flex-1 text-xs bg-blue-500 text-white rounded-lg py-1.5 hover:bg-blue-600 font-medium">Agregar</button>
        <button onClick={() => setAddingCell(null)} className="px-3 py-1.5 text-gray-500 hover:text-gray-700 border rounded-lg text-xs">Cancelar</button>
      </div>
    </div>
  )

  // Shared entry renderer
  const renderEntry = (entry: BOMEntry) => {
    const isEditing = editingCell === entry.id
    const isChanging = changingMaterial === entry.id
    const isSaving = savingCells.has(entry.id)
    const isSaved = savedCells.has(entry.id)

    return (
      <div key={entry.id} className="group px-2 py-1.5 sm:py-1.5">
        {isChanging ? (
          <div className="relative mb-1">
            <SearchableSelect options={materialOptions} value={entry.material_id} onChange={(v) => handleChangeMaterial(entry.id, v)} placeholder="Cambiar material..." />
            <button onClick={() => setChangingMaterial(null)} className="absolute -top-1 -right-1 w-5 h-5 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-500 text-xs z-30">×</button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button onClick={() => setChangingMaterial(entry.id)} className="text-xs sm:text-[10px] font-medium text-blue-700 truncate hover:underline flex-1 min-w-0 text-left" title={`${entry.material_name} — click para cambiar`}>{entry.material_name}</button>
            <button
              onClick={() => handleDeleteEntry(entry.id, entry.material_name)}
              disabled={isSaving}
              className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-red-500 transition-colors sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 disabled:opacity-30"
              title="Eliminar ingrediente"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-1.5 mt-0.5">
          {isEditing ? (
            <input type="text" inputMode="decimal" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => handleKeyDown(e, entry.id)} onBlur={() => handleBlur(entry.id)} autoFocus className="w-full text-sm sm:text-xs font-mono px-2 py-1 sm:px-1 sm:py-0.5 border border-blue-300 rounded-lg sm:rounded bg-white focus:outline-none focus:ring-2 sm:focus:ring-1 focus:ring-blue-400" />
          ) : (
            <button onClick={() => { setEditingCell(entry.id); setEditValue(entry.quantity_needed.toString()) }} className="text-sm sm:text-xs font-mono text-gray-700 hover:text-blue-600 hover:underline cursor-text">{entry.quantity_needed.toLocaleString()}</button>
          )}
          <span className="text-xs sm:text-[10px] text-gray-400 uppercase shrink-0">{entry.unit_name}</span>
          {isSaving && <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />}
          {isSaved && <Check className="w-3 h-3 text-green-500 shrink-0" />}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input placeholder="Buscar producto PT..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-10" />
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-gray-500 text-sm">No se encontraron productos</div>
      )}

      {/* Mobile: Card view */}
      <div className="sm:hidden space-y-3">
        {filteredProducts.map(product => (
          <div key={product.id} className="border rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-3 py-2.5 border-b">
              <p className="font-semibold text-sm text-gray-900">{product.name}{product.weight ? ` - ${product.weight}` : ""}</p>
            </div>
            <div className="divide-y">
              {activeOperations.map(op => {
                const cellKey = `${product.id}_${op.id}`
                const entries = bomLookup.get(cellKey) || []
                const isAdding = addingCell === cellKey

                return (
                  <div key={op.id} className="px-3 py-2">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">{op.name}</p>
                    {entries.length === 0 && !isAdding && (
                      <button
                        onClick={() => { setAddingCell(cellKey); setAddForm({ material_id: "", quantity: "", unit: "GR" }) }}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 py-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar material
                      </button>
                    )}
                    {entries.map(entry => renderEntry(entry))}
                    {isAdding ? renderAddForm(product.id, op.id) : (
                      entries.length > 0 && (
                        <button
                          onClick={() => { setAddingCell(cellKey); setAddForm({ material_id: "", quantity: "", unit: "GR" }) }}
                          className="flex items-center gap-1 text-[11px] text-gray-300 hover:text-blue-500 mt-1"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Table view */}
      <div className="hidden sm:block border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10 w-[320px] max-w-[320px] border-r border-gray-200">Producto PT</th>
                {activeOperations.map(op => (
                  <th key={op.id} className="px-3 py-2.5 text-center font-semibold text-gray-700 min-w-[180px] border-r border-gray-200 last:border-r-0">{op.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-2 sticky left-0 bg-white z-10 w-[320px] max-w-[320px] border-r border-gray-200">
                    <p className="font-medium text-gray-900 truncate" title={product.name}>{product.name}{product.weight ? ` - ${product.weight}` : ""}</p>
                  </td>
                  {activeOperations.map(op => {
                    const cellKey = `${product.id}_${op.id}`
                    const entries = bomLookup.get(cellKey) || []
                    const isAdding = addingCell === cellKey

                    if (entries.length === 0 && !isAdding) {
                      return (
                        <td key={op.id} className="px-2 py-1 text-center border-r border-gray-200 last:border-r-0 bg-gray-50/30">
                          <button onClick={() => { setAddingCell(cellKey); setAddForm({ material_id: "", quantity: "", unit: "GR" }) }} className="text-gray-300 hover:text-blue-500 transition-colors mx-auto flex items-center justify-center" title="Agregar material"><Plus className="w-3.5 h-3.5" /></button>
                        </td>
                      )
                    }

                    if (isAdding && entries.length === 0) {
                      return (
                        <td key={op.id} className="px-1 py-1 border-r border-gray-200 last:border-r-0 align-top">
                          {renderAddForm(product.id, op.id)}
                        </td>
                      )
                    }

                    return (
                      <td key={op.id} className="px-0 py-0 border-r border-gray-200 last:border-r-0 align-top">
                        <div className="divide-y divide-gray-100">
                          {entries.map(entry => renderEntry(entry))}
                          {isAdding ? renderAddForm(product.id, op.id) : (
                            <div className="px-2 py-1">
                              <button onClick={() => { setAddingCell(cellKey); setAddForm({ material_id: "", quantity: "", unit: "GR" }) }} className="text-gray-300 hover:text-blue-500 transition-colors flex items-center gap-0.5 text-[10px]"><Plus className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
