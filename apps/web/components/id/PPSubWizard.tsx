"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { usePrototypes, Prototype } from "@/hooks/use-prototypes"
import { usePrototypeMaterials, PrototypeMaterial, PrototypeMaterialInsert } from "@/hooks/use-prototype-materials"
import { usePrototypeOperations, PrototypeOperation, PrototypeOperationInsert } from "@/hooks/use-prototype-operations"
import { usePrototypeYield } from "@/hooks/use-prototype-yield"
import { useMaterials } from "@/hooks/use-materials"
import { useOperations } from "@/hooks/use-operations"
import {
  calculateBakerPercentages,
  calculateEngineeringPercentages,
  calculateTotalGrams,
  calculateMaterialCost,
  calculateCostPerGram,
  formatPercentage,
  formatGrams,
  formatCurrency,
  type MaterialForCalc,
} from "@/lib/id-calculations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Beaker,
  ListOrdered,
  TrendingUp,
  Star,
  Check,
  GripVertical,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

interface PPSubWizardProps {
  ppPrototypeId: string
  ptPrototypeId: string
}

type PPStep = "recipe" | "operations" | "yield"

const STEPS: { key: PPStep; label: string; icon: any }[] = [
  { key: "recipe", label: "Receta", icon: Beaker },
  { key: "operations", label: "Operaciones", icon: ListOrdered },
  { key: "yield", label: "Rendimiento", icon: TrendingUp },
]

export function PPSubWizard({ ppPrototypeId, ptPrototypeId }: PPSubWizardProps) {
  const router = useRouter()
  const { getPrototypeById, updatePrototype } = usePrototypes()
  const {
    getMaterialsByPrototype,
    addMaterial,
    updateMaterial,
    removeMaterial,
    recalculatePercentages,
  } = usePrototypeMaterials()
  const {
    getOperationsByPrototype,
    addOperation,
    updateOperation,
    removeOperation,
    reorderOperations,
  } = usePrototypeOperations()
  const { getYieldByPrototype, saveYield } = usePrototypeYield()
  const { materials: allMaterials } = useMaterials()
  const { operations: catalogOps } = useOperations()

  const [ppPrototype, setPPPrototype] = useState<Prototype | null>(null)
  const [currentStep, setCurrentStep] = useState<PPStep>("recipe")
  const [materials, setMaterials] = useState<PrototypeMaterial[]>([])
  const [operations, setOperations] = useState<PrototypeOperation[]>([])
  const [yieldData, setYieldData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Recipe form state
  const [showAddMaterial, setShowAddMaterial] = useState(false)
  const [newMatName, setNewMatName] = useState("")
  const [newMatQty, setNewMatQty] = useState("")
  const [newMatUnit, setNewMatUnit] = useState("gramos")
  const [newMatCost, setNewMatCost] = useState("")
  const [newMatIsNew, setNewMatIsNew] = useState(true)
  const [newMatId, setNewMatId] = useState<string | null>(null)

  // Operation form state
  const [showAddOp, setShowAddOp] = useState(false)
  const [newOpName, setNewOpName] = useState("")
  const [newOpIsCustom, setNewOpIsCustom] = useState(true)
  const [newOpCatalogId, setNewOpCatalogId] = useState<string | null>(null)

  // Yield form state
  const [yieldInput, setYieldInput] = useState("")
  const [yieldOutput, setYieldOutput] = useState("")
  const [yieldNotes, setYieldNotes] = useState("")

  const loadData = useCallback(async () => {
    setLoading(true)
    const [proto, mats, ops, yld] = await Promise.all([
      getPrototypeById(ppPrototypeId),
      getMaterialsByPrototype(ppPrototypeId),
      getOperationsByPrototype(ppPrototypeId),
      getYieldByPrototype(ppPrototypeId),
    ])
    setPPPrototype(proto)
    setMaterials(mats)
    setOperations(ops)
    const yieldRecord = Array.isArray(yld) ? yld[0] || null : yld
    setYieldData(yieldRecord)

    if (yieldRecord) {
      setYieldInput(yieldRecord.total_input_weight_grams?.toString() || "")
      setYieldOutput(yieldRecord.total_output_weight_grams?.toString() || "")
      setYieldNotes(yieldRecord.notes || "")
    }

    // Determine current step based on pp_status
    if (proto) {
      if (proto.pp_status === "pending" || proto.pp_status === "recipe_done") {
        if (mats.length > 0 && (proto.pp_status === "recipe_done" || proto.pp_status === "operations_done")) {
          setCurrentStep("operations")
        }
      }
      if (proto.pp_status === "operations_done" || proto.pp_status === "yield_done") {
        setCurrentStep("yield")
      }
    }

    setLoading(false)
  }, [ppPrototypeId, getPrototypeById, getMaterialsByPrototype, getOperationsByPrototype, getYieldByPrototype])

  useEffect(() => {
    loadData()
  }, [loadData])

  // === RECIPE STEP ===
  const handleAddMaterial = async () => {
    const qty = parseFloat(newMatQty)
    if ((!newMatName.trim() && newMatIsNew) || isNaN(qty) || qty <= 0) {
      toast.error("Completa nombre y cantidad")
      return
    }

    const data: PrototypeMaterialInsert = {
      prototype_id: ppPrototypeId,
      material_id: newMatIsNew ? null : newMatId,
      material_name: newMatName,
      is_new_material: newMatIsNew,
      is_base_ingredient: materials.length === 0, // First material is base by default
      original_quantity: qty,
      unit_name: newMatUnit,
      unit_equivalence_grams: newMatUnit === "gramos" ? 1 : newMatUnit === "kilogramos" ? 1000 : 1,
      unit_cost: parseFloat(newMatCost) || null,
    }

    await addMaterial(data)
    setShowAddMaterial(false)
    setNewMatName("")
    setNewMatQty("")
    setNewMatCost("")
    setNewMatId(null)

    const updatedMats = await getMaterialsByPrototype(ppPrototypeId)
    setMaterials(updatedMats)
  }

  const handleRemoveMaterial = async (id: string) => {
    await removeMaterial(id, ppPrototypeId)
    const updatedMats = await getMaterialsByPrototype(ppPrototypeId)
    setMaterials(updatedMats)
  }

  const handleSetBaseIngredient = async (id: string) => {
    // Unset all, then set the selected one
    for (const mat of materials) {
      if (mat.is_base_ingredient) {
        await updateMaterial(mat.id, ppPrototypeId, { is_base_ingredient: false })
      }
    }
    await updateMaterial(id, ppPrototypeId, { is_base_ingredient: true })
    const updatedMats = await getMaterialsByPrototype(ppPrototypeId)
    setMaterials(updatedMats)
  }

  const handleFinishRecipe = async () => {
    if (materials.length === 0) {
      toast.error("Agrega al menos un material")
      return
    }
    await updatePrototype(ppPrototypeId, { pp_status: "recipe_done" })
    setCurrentStep("operations")
  }

  // === OPERATIONS STEP ===
  const handleAddOperation = async () => {
    if (!newOpName.trim() && newOpIsCustom) {
      toast.error("Ingresa un nombre para la operación")
      return
    }

    const data: PrototypeOperationInsert = {
      prototype_id: ppPrototypeId,
      operation_id: newOpIsCustom ? null : newOpCatalogId,
      operation_name: newOpName,
      is_custom_operation: newOpIsCustom,
      step_number: operations.length + 1,
    }

    await addOperation(data)
    setShowAddOp(false)
    setNewOpName("")
    setNewOpCatalogId(null)

    const updatedOps = await getOperationsByPrototype(ppPrototypeId)
    setOperations(updatedOps)
  }

  const handleUpdateOp = async (id: string, field: string, value: any) => {
    await updateOperation(id, { [field]: value })
    const updatedOps = await getOperationsByPrototype(ppPrototypeId)
    setOperations(updatedOps)
  }

  const handleRemoveOp = async (id: string) => {
    await removeOperation(id)
    const updatedOps = await getOperationsByPrototype(ppPrototypeId)
    setOperations(updatedOps)
  }

  const handleFinishOperations = async () => {
    if (operations.length === 0) {
      toast.error("Agrega al menos una operación")
      return
    }
    await updatePrototype(ppPrototypeId, { pp_status: "operations_done" })
    setCurrentStep("yield")
  }

  // === YIELD STEP ===
  const handleSaveYield = async () => {
    const input = parseFloat(yieldInput)
    const output = parseFloat(yieldOutput)

    if (isNaN(input) || input <= 0) {
      toast.error("Ingresa el peso de entrada")
      return
    }
    if (isNaN(output) || output <= 0) {
      toast.error("Ingresa el peso de salida")
      return
    }

    const yieldPct = (output / input) * 100
    const wasteGrams = input - output
    const wastePct = (wasteGrams / input) * 100

    // Calculate total material cost
    const matsForCalc: MaterialForCalc[] = materials.map(m => ({
      original_quantity: m.original_quantity || 0,
      unit_equivalence_grams: m.unit_equivalence_grams || 1,
      is_base_ingredient: m.is_base_ingredient,
      unit_cost: m.unit_cost,
    }))
    const totalMaterialCost = calculateMaterialCost(matsForCalc)
    const costPerGram = calculateCostPerGram(totalMaterialCost, output)

    await saveYield({
      prototype_id: ppPrototypeId,
      total_input_weight_grams: input,
      total_output_weight_grams: output,
      notes: yieldNotes,
    })

    // Update prototype with cost_per_gram and status
    await updatePrototype(ppPrototypeId, {
      pp_status: "complete",
      cost_per_gram: costPerGram,
      total_input_grams: input,
      total_output_grams: output,
    })

    // Update the component's cost_per_gram in the parent PT
    const { supabase } = await import("@/lib/supabase")
    await (supabase.schema("investigacion" as any))
      .from("prototype_components")
      .update({ cost_per_gram: costPerGram })
      .eq("pp_prototype_id", ppPrototypeId)

    toast.success("PP completado - Costo/gramo calculado")
    router.push(`/id/${ptPrototypeId}`)
  }

  // Calculations for display
  const matsForCalc: MaterialForCalc[] = materials.map(m => ({
    original_quantity: m.original_quantity || 0,
    unit_equivalence_grams: m.unit_equivalence_grams || 1,
    is_base_ingredient: m.is_base_ingredient,
    unit_cost: m.unit_cost,
  }))
  const bakerPcts = calculateBakerPercentages(matsForCalc)
  const engPcts = calculateEngineeringPercentages(matsForCalc)
  const totalGrams = calculateTotalGrams(matsForCalc)
  const totalMaterialCost = calculateMaterialCost(matsForCalc)

  const stepIndex = STEPS.findIndex(s => s.key === currentStep)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => router.push(`/id/${ptPrototypeId}`)}
              className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-2xl bg-blue-500 flex items-center justify-center">
              <Beaker className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {ppPrototype?.product_name || "Producto en Proceso"}
              </h1>
              <p className="text-xs text-gray-500">Sub-wizard PP</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex gap-1">
            {STEPS.map((step, i) => (
              <button
                key={step.key}
                onClick={() => {
                  if (i <= stepIndex || (ppPrototype?.pp_status && ppPrototype.pp_status !== "pending")) {
                    setCurrentStep(step.key)
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentStep === step.key
                    ? "bg-blue-500 text-white"
                    : i < stepIndex
                    ? "bg-blue-50 text-blue-600"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {i < stepIndex ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <step.icon className="w-3.5 h-3.5" />
                )}
                {step.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* === RECIPE STEP === */}
          {currentStep === "recipe" && (
            <motion.div
              key="recipe"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Summary bar */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{materials.length}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Materiales</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{formatGrams(totalGrams)}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Total</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(totalMaterialCost)}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Costo</p>
                  </div>
                </div>
              </div>

              {/* Materials list */}
              {materials.map((mat, i) => (
                <div key={mat.id} className="bg-white rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{mat.material_name}</span>
                      {mat.is_base_ingredient && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                          Base
                        </span>
                      )}
                      {mat.is_new_material && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-lime-50 text-lime-600 font-medium">
                          Nuevo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!mat.is_base_ingredient && (
                        <button
                          onClick={() => handleSetBaseIngredient(mat.id)}
                          className="text-[10px] px-2 py-0.5 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                        >
                          Base
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveMaterial(mat.id)}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Cantidad</span>
                      <p className="font-medium">{mat.original_quantity} {mat.unit_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">% Panadero</span>
                      <p className="font-medium text-blue-600">{formatPercentage(bakerPcts[i])}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">% Ingeniería</span>
                      <p className="font-medium text-purple-600">{formatPercentage(engPcts[i])}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Costo</span>
                      <p className="font-medium">{mat.unit_cost ? formatCurrency(mat.original_quantity * mat.unit_cost) : "-"}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add material */}
              {showAddMaterial ? (
                <div className="bg-white rounded-xl border border-blue-200 p-4 space-y-3">
                  <div className="flex gap-2 mb-2">
                    <Button
                      variant={newMatIsNew ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewMatIsNew(true)}
                      className="text-xs rounded-lg"
                    >
                      Nuevo
                    </Button>
                    <Button
                      variant={!newMatIsNew ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewMatIsNew(false)}
                      className="text-xs rounded-lg"
                    >
                      Existente
                    </Button>
                  </div>

                  {!newMatIsNew ? (
                    <SearchableSelect
                      options={allMaterials
                        .filter(m => m.category === "MP")
                        .map(m => ({ value: m.id, label: m.name }))}
                      value={newMatId}
                      onChange={val => {
                        setNewMatId(val)
                        const m = allMaterials.find(x => x.id === val)
                        if (m) {
                          setNewMatName(m.name)
                          setNewMatCost(m.unit_cost?.toString() || "")
                        }
                      }}
                      placeholder="Buscar material..."
                    />
                  ) : (
                    <Input
                      value={newMatName}
                      onChange={e => setNewMatName(e.target.value.toUpperCase())}
                      placeholder="Nombre del material"
                      className="rounded-xl"
                    />
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      value={newMatQty}
                      onChange={e => setNewMatQty(e.target.value)}
                      placeholder="Cantidad"
                      className="rounded-xl"
                    />
                    <Select value={newMatUnit} onValueChange={setNewMatUnit}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gramos">Gramos</SelectItem>
                        <SelectItem value="kilogramos">Kilogramos</SelectItem>
                        <SelectItem value="mililitros">Mililitros</SelectItem>
                        <SelectItem value="litros">Litros</SelectItem>
                        <SelectItem value="unidades">Unidades</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={newMatCost}
                      onChange={e => setNewMatCost(e.target.value)}
                      placeholder="Costo/unidad"
                      className="rounded-xl"
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setShowAddMaterial(false)} className="rounded-lg">
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleAddMaterial} className="bg-blue-500 hover:bg-blue-600 rounded-lg">
                      Agregar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowAddMaterial(true)}
                  className="w-full rounded-xl border-dashed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Material
                </Button>
              )}

              {/* Next */}
              <Button
                onClick={handleFinishRecipe}
                disabled={materials.length === 0}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl h-12"
              >
                Siguiente: Operaciones
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* === OPERATIONS STEP === */}
          {currentStep === "operations" && (
            <motion.div
              key="operations"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {operations.map((op, i) => (
                <div key={op.id} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{op.operation_name}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveOp(op.id)}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase">Tiempo (min)</label>
                      <Input
                        type="number"
                        defaultValue={op.duration_minutes || ""}
                        onBlur={e => {
                          const v = parseFloat(e.target.value)
                          if (!isNaN(v)) handleUpdateOp(op.id, "duration_minutes", v)
                        }}
                        className="h-8 text-sm rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase">Temp (°C)</label>
                      <Input
                        type="number"
                        defaultValue={op.temperature_celsius || ""}
                        onBlur={e => {
                          const v = parseFloat(e.target.value)
                          if (!isNaN(v)) handleUpdateOp(op.id, "temperature_celsius", v)
                        }}
                        className="h-8 text-sm rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase">Personas</label>
                      <Input
                        type="number"
                        defaultValue={op.people_count || 1}
                        onBlur={e => {
                          const v = parseInt(e.target.value)
                          if (!isNaN(v)) handleUpdateOp(op.id, "people_count", v)
                        }}
                        className="h-8 text-sm rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase">Velocidad RPM</label>
                      <Input
                        type="number"
                        defaultValue={op.speed_rpm || ""}
                        onBlur={e => {
                          const v = parseFloat(e.target.value)
                          if (!isNaN(v)) handleUpdateOp(op.id, "speed_rpm", v)
                        }}
                        className="h-8 text-sm rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 uppercase">Observaciones</label>
                    <Textarea
                      defaultValue={op.observations || ""}
                      onBlur={e => handleUpdateOp(op.id, "observations", e.target.value)}
                      className="text-sm rounded-lg min-h-[40px]"
                      rows={1}
                    />
                  </div>
                </div>
              ))}

              {/* Add operation */}
              {showAddOp ? (
                <div className="bg-white rounded-xl border border-blue-200 p-4 space-y-3">
                  <div className="flex gap-2 mb-2">
                    <Button
                      variant={newOpIsCustom ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewOpIsCustom(true)}
                      className="text-xs rounded-lg"
                    >
                      Personalizada
                    </Button>
                    <Button
                      variant={!newOpIsCustom ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewOpIsCustom(false)}
                      className="text-xs rounded-lg"
                    >
                      Del catálogo
                    </Button>
                  </div>

                  {!newOpIsCustom ? (
                    <SearchableSelect
                      options={catalogOps.map(op => ({ value: op.id, label: op.name }))}
                      value={newOpCatalogId}
                      onChange={val => {
                        setNewOpCatalogId(val)
                        const op = catalogOps.find(o => o.id === val)
                        if (op) setNewOpName(op.name)
                      }}
                      placeholder="Buscar operación..."
                    />
                  ) : (
                    <Input
                      value={newOpName}
                      onChange={e => setNewOpName(e.target.value.toUpperCase())}
                      placeholder="Nombre de la operación"
                      className="rounded-xl"
                    />
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setShowAddOp(false)} className="rounded-lg">
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleAddOperation} className="bg-blue-500 hover:bg-blue-600 rounded-lg">
                      Agregar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowAddOp(true)}
                  className="w-full rounded-xl border-dashed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Operación
                </Button>
              )}

              {/* Navigation */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("recipe")}
                  className="rounded-xl"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Receta
                </Button>
                <Button
                  onClick={handleFinishOperations}
                  disabled={operations.length === 0}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-xl h-12"
                >
                  Siguiente: Rendimiento
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* === YIELD STEP === */}
          {currentStep === "yield" && (
            <motion.div
              key="yield"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Rendimiento</h3>

                <div className="bg-blue-50 rounded-xl p-3 text-sm">
                  <p className="text-blue-700">
                    <strong>Peso teórico de entrada:</strong> {formatGrams(totalGrams)}
                  </p>
                  <p className="text-blue-600 text-xs mt-1">
                    Suma de todos los materiales de la receta
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Peso entrada real (g)
                    </label>
                    <Input
                      type="number"
                      value={yieldInput}
                      onChange={e => setYieldInput(e.target.value)}
                      placeholder={totalGrams.toFixed(0)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Peso salida real (g)
                    </label>
                    <Input
                      type="number"
                      value={yieldOutput}
                      onChange={e => setYieldOutput(e.target.value)}
                      placeholder="Ej: 8000"
                      className="rounded-xl"
                    />
                  </div>
                </div>

                {/* Calculated metrics */}
                {yieldInput && yieldOutput && parseFloat(yieldInput) > 0 && parseFloat(yieldOutput) > 0 && (
                  <div className="grid grid-cols-3 gap-3 text-center bg-gray-50 rounded-xl p-3">
                    <div>
                      <p className="text-lg font-bold text-green-600">
                        {((parseFloat(yieldOutput) / parseFloat(yieldInput)) * 100).toFixed(1)}%
                      </p>
                      <p className="text-[10px] text-gray-500 uppercase">Rendimiento</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-500">
                        {formatGrams(parseFloat(yieldInput) - parseFloat(yieldOutput))}
                      </p>
                      <p className="text-[10px] text-gray-500 uppercase">Merma</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-purple-600">
                        ${(totalMaterialCost / parseFloat(yieldOutput)).toFixed(2)}/g
                      </p>
                      <p className="text-[10px] text-gray-500 uppercase">Costo/gramo</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Notas</label>
                  <Textarea
                    value={yieldNotes}
                    onChange={e => setYieldNotes(e.target.value)}
                    placeholder="Observaciones sobre el rendimiento..."
                    className="rounded-xl"
                    rows={2}
                  />
                </div>
              </div>

              {/* Recap: cost breakdown */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Resumen de Costos</h3>
                <div className="space-y-1">
                  {materials.map(m => (
                    <div key={m.id} className="flex justify-between text-xs">
                      <span className="text-gray-600">{m.material_name} ({m.original_quantity} {m.unit_name})</span>
                      <span className="font-medium">
                        {m.unit_cost ? formatCurrency(m.original_quantity * m.unit_cost) : "-"}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-1 mt-1 flex justify-between text-sm font-semibold">
                    <span>Total materiales</span>
                    <span>{formatCurrency(totalMaterialCost)}</span>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("operations")}
                  className="rounded-xl"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Operaciones
                </Button>
                <Button
                  onClick={handleSaveYield}
                  disabled={!yieldInput || !yieldOutput}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl h-12"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Completar PP
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
