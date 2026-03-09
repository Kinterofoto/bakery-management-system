"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { usePrototypes, Prototype } from "@/hooks/use-prototypes"
import { usePrototypeComponents, PrototypeComponent } from "@/hooks/use-prototype-components"
import { usePrototypeOperations, PrototypeOperation, PrototypeOperationInsert } from "@/hooks/use-prototype-operations"
import { usePrototypeMaterials } from "@/hooks/use-prototype-materials"
import { usePrototypeQuality, PrototypeQuality } from "@/hooks/use-prototype-quality"
import { useMaterials } from "@/hooks/use-materials"
import { useMaterialSuppliers } from "@/hooks/use-material-suppliers"
import { useOperations } from "@/hooks/use-operations"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { PrototypeStatusBadge } from "./PrototypeStatusBadge"
import { SensoryLinkShare } from "./SensoryLinkShare"
import { ComponentCard } from "./ComponentCard"
import { OperationPhotos } from "./OperationPhotos"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Plus,
  FlaskConical,
  Package,
  Layers,
  ClipboardList,
  DollarSign,
  Star,
  Beaker,
  CheckCircle2,
  ListOrdered,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

interface PTDashboardProps {
  prototypeId: string
}

export function PTDashboard({ prototypeId }: PTDashboardProps) {
  const router = useRouter()
  const {
    getPrototypeById,
    updatePrototype,
    createPrototype,
    generateCode,
    deletePrototype,
  } = usePrototypes()
  const {
    getComponentsByPrototype,
    addComponent,
    updateComponent,
    removeComponent,
  } = usePrototypeComponents()
  const {
    getOperationsByPrototype,
    addOperation,
    updateOperation,
    removeOperation,
    reorderOperations,
  } = usePrototypeOperations()
  const { getMaterialsByPrototype } = usePrototypeMaterials()
  const { getQualityByPrototype } = usePrototypeQuality()
  const { materials: allMaterials } = useMaterials()
  const { getPreferredSupplier, getBestPriceSupplier } = useMaterialSuppliers()
  const { operations: catalogOps } = useOperations()

  const [prototype, setPrototype] = useState<Prototype | null>(null)
  const [components, setComponents] = useState<PrototypeComponent[]>([])
  const [ptOperations, setPtOperations] = useState<PrototypeOperation[]>([])
  const [ppPrototypes, setPPPrototypes] = useState<Record<string, Prototype>>({})
  const [qualityData, setQualityData] = useState<PrototypeQuality | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addType, setAddType] = useState<"PP" | "MP">("PP")
  const [newComponentName, setNewComponentName] = useState("")
  const [newComponentQty, setNewComponentQty] = useState("")
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null)
  const [selectedPPProductId, setSelectedPPProductId] = useState<string | null>(null)
  const [isNewItem, setIsNewItem] = useState(true)
  const [newUnitCost, setNewUnitCost] = useState("")
  const [activeTab, setActiveTab] = useState<"components" | "operations" | "quality" | "sensory" | "costs">("components")

  // Operations tab state
  const [showAddOp, setShowAddOp] = useState(false)
  const [newOpName, setNewOpName] = useState("")
  const [newOpIsCustom, setNewOpIsCustom] = useState(true)
  const [newOpCatalogId, setNewOpCatalogId] = useState<string | null>(null)
  const [expandedOp, setExpandedOp] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [proto, comps, ops, quals] = await Promise.all([
      getPrototypeById(prototypeId),
      getComponentsByPrototype(prototypeId),
      getOperationsByPrototype(prototypeId),
      getQualityByPrototype(prototypeId),
    ])
    setPrototype(proto)
    setComponents(comps)
    setPtOperations(ops)
    setQualityData(quals.length > 0 ? quals[0] : null)

    // Load PP prototype data for each PP component
    const ppMap: Record<string, Prototype> = {}
    for (const comp of comps) {
      if (comp.component_type === "PP" && comp.pp_prototype_id) {
        const ppProto = await getPrototypeById(comp.pp_prototype_id)
        if (ppProto) ppMap[comp.pp_prototype_id] = ppProto
      }
    }
    setPPPrototypes(ppMap)
    setLoading(false)
  }, [prototypeId, getPrototypeById, getComponentsByPrototype, getOperationsByPrototype])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAddComponent = async () => {
    if (!newComponentName.trim()) {
      toast.error("Ingresa un nombre")
      return
    }
    const qty = parseFloat(newComponentQty)
    if (isNaN(qty) || qty <= 0) {
      toast.error("Ingresa una cantidad válida en gramos")
      return
    }

    if (addType === "PP") {
      if (isNewItem) {
        const code = await generateCode()
        const ppProto = await createPrototype({
          product_name: newComponentName,
          product_category: "PP",
          is_new_product: true,
          code,
          parent_prototype_id: prototypeId,
          status: "draft",
          pp_status: "pending",
        })

        if (ppProto) {
          await addComponent({
            pt_prototype_id: prototypeId,
            component_type: "PP",
            pp_prototype_id: ppProto.id,
            material_name: newComponentName,
            quantity_grams: qty,
            display_order: components.length,
          })
        }
      } else {
        await addComponent({
          pt_prototype_id: prototypeId,
          component_type: "PP",
          pp_prototype_id: null,
          material_id: selectedPPProductId,
          material_name: newComponentName,
          is_new_material: false,
          quantity_grams: qty,
          display_order: components.length,
        })
      }
    } else {
      await addComponent({
        pt_prototype_id: prototypeId,
        component_type: "MP",
        material_id: isNewItem ? null : selectedMaterialId,
        material_name: newComponentName,
        is_new_material: isNewItem,
        quantity_grams: qty,
        unit_cost: parseFloat(newUnitCost) || null,
        cost_per_gram: parseFloat(newUnitCost) ? parseFloat(newUnitCost) / 1000 : null,
        display_order: components.length,
      })
    }

    setShowAddDialog(false)
    resetAddForm()
    await loadData()
  }

  const resetAddForm = () => {
    setNewComponentName("")
    setNewComponentQty("")
    setSelectedMaterialId(null)
    setSelectedPPProductId(null)
    setIsNewItem(true)
    setNewUnitCost("")
  }

  const handleDeleteComponent = async (id: string, ppPrototypeId?: string | null) => {
    await removeComponent(id)
    if (ppPrototypeId) {
      await deletePrototype(ppPrototypeId)
    }
    await loadData()
  }

  const handleUpdateQuantity = async (id: string, newQty: number) => {
    await updateComponent(id, { quantity_grams: newQty })
    await loadData()
  }

  // === OPERATIONS TAB HANDLERS ===
  const handleAddPTOperation = async () => {
    if (!newOpName.trim() && newOpIsCustom) {
      toast.error("Ingresa un nombre para la operación")
      return
    }

    const data: PrototypeOperationInsert = {
      prototype_id: prototypeId,
      operation_id: newOpIsCustom ? null : newOpCatalogId,
      operation_name: newOpName,
      is_custom_operation: newOpIsCustom,
      step_number: ptOperations.length + 1,
    }

    await addOperation(data)
    setShowAddOp(false)
    setNewOpName("")
    setNewOpCatalogId(null)

    const updatedOps = await getOperationsByPrototype(prototypeId)
    setPtOperations(updatedOps)
  }

  const handleRemovePTOperation = async (opId: string) => {
    // Unassign all components from this operation first
    const assignedComps = components.filter(c => c.operation_id === opId)
    for (const comp of assignedComps) {
      await updateComponent(comp.id, { operation_id: null })
    }
    await removeOperation(opId)
    const [updatedOps, updatedComps] = await Promise.all([
      getOperationsByPrototype(prototypeId),
      getComponentsByPrototype(prototypeId),
    ])
    setPtOperations(updatedOps)
    setComponents(updatedComps)
  }

  const handleUpdatePTOp = async (opId: string, field: string, value: any) => {
    await updateOperation(opId, { [field]: value })
    const updatedOps = await getOperationsByPrototype(prototypeId)
    setPtOperations(updatedOps)
  }

  const handleAssignComponent = async (componentId: string, operationId: string) => {
    await updateComponent(componentId, { operation_id: operationId })
    const updatedComps = await getComponentsByPrototype(prototypeId)
    setComponents(updatedComps)
  }

  const handleUnassignComponent = async (componentId: string) => {
    await updateComponent(componentId, { operation_id: null })
    const updatedComps = await getComponentsByPrototype(prototypeId)
    setComponents(updatedComps)
  }

  // Calculate overall progress
  const ppComponents = components.filter(c => c.component_type === "PP")
  const mpComponents = components.filter(c => c.component_type === "MP")
  const completedPPs = ppComponents.filter(c => {
    if (!c.pp_prototype_id) return true
    const pp = ppPrototypes[c.pp_prototype_id]
    return pp?.pp_status === "complete"
  })
  const allPPsComplete = ppComponents.length === 0 || completedPPs.length === ppComponents.length

  // Operations: unassigned components
  const unassignedComponents = components.filter(c => !c.operation_id)
  const assignedComponentIds = new Set(components.filter(c => c.operation_id).map(c => c.id))

  // Calculate total cost
  const totalCost = components.reduce((sum, c) => {
    const cpg = c.cost_per_gram || 0
    return sum + c.quantity_grams * cpg
  }, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-lime-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!prototype) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <p className="text-gray-500">Prototipo no encontrado</p>
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
              onClick={() => router.push("/id")}
              className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-2xl bg-lime-500 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  {prototype.product_name || "Sin nombre"}
                </h1>
                <PrototypeStatusBadge status={prototype.status} />
              </div>
              <p className="text-xs text-gray-500">{prototype.code}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[
              { key: "components", label: "Componentes", icon: Layers },
              { key: "operations", label: "Operaciones", icon: ListOrdered },
              { key: "quality", label: "Calidad", icon: Star },
              { key: "sensory", label: "Panel", icon: ClipboardList },
              { key: "costs", label: "Costos", icon: DollarSign },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* === COMPONENTS TAB === */}
        {activeTab === "components" && (
          <div className="space-y-4">
            {/* Progress Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Progreso</h3>
                {allPPsComplete && components.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Listo para receta PT
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-lg font-bold text-blue-600">{ppComponents.length}</p>
                  <p className="text-[10px] text-blue-500 uppercase tracking-wide">Prod. Proceso</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-lg font-bold text-amber-600">{mpComponents.length}</p>
                  <p className="text-[10px] text-amber-500 uppercase tracking-wide">Materias Primas</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-lg font-bold text-green-600">
                    {completedPPs.length}/{ppComponents.length}
                  </p>
                  <p className="text-[10px] text-green-500 uppercase tracking-wide">PP Completos</p>
                </div>
              </div>
            </div>

            {/* PP Components */}
            {ppComponents.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Beaker className="w-4 h-4" />
                  Productos en Proceso
                </h3>
                <div className="grid gap-2">
                  {ppComponents.map((comp, i) => (
                    <motion.div
                      key={comp.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <ComponentCard
                        component={comp}
                        ppPrototype={comp.pp_prototype_id ? ppPrototypes[comp.pp_prototype_id] : undefined}
                        onEdit={() => {
                          if (comp.pp_prototype_id) {
                            router.push(`/id/${prototypeId}/pp/${comp.pp_prototype_id}`)
                          }
                        }}
                        onDelete={() => handleDeleteComponent(comp.id, comp.pp_prototype_id)}
                        onUpdateQuantity={(qty) => handleUpdateQuantity(comp.id, qty)}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* MP Components */}
            {mpComponents.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Materias Primas
                </h3>
                <div className="grid gap-2">
                  {mpComponents.map((comp, i) => (
                    <motion.div
                      key={comp.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <ComponentCard
                        component={comp}
                        onDelete={() => handleDeleteComponent(comp.id)}
                        onUpdateQuantity={(qty) => handleUpdateQuantity(comp.id, qty)}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {components.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-gray-900 mb-1">Sin componentes</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Agrega los productos en proceso y materias primas que componen este producto
                </p>
              </div>
            )}

            {/* Add buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setAddType("PP")
                  setShowAddDialog(true)
                }}
                variant="outline"
                className="flex-1 rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar PP
              </Button>
              <Button
                onClick={() => {
                  setAddType("MP")
                  setShowAddDialog(true)
                }}
                variant="outline"
                className="flex-1 rounded-xl border-amber-200 text-amber-600 hover:bg-amber-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar MP
              </Button>
            </div>
          </div>
        )}

        {/* === OPERATIONS TAB === */}
        {activeTab === "operations" && (
          <div className="space-y-4">
            {/* Unassigned components warning */}
            {components.length > 0 && unassignedComponents.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      {unassignedComponents.length} componente{unassignedComponents.length > 1 ? "s" : ""} sin asignar
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {unassignedComponents.map(c => (
                        <span
                          key={c.id}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            c.component_type === "PP"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {c.material_name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {components.length === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
                <p className="text-sm text-gray-500">
                  Primero agrega componentes en la pestaña Componentes
                </p>
              </div>
            )}

            {/* Operations list */}
            {ptOperations.map((op, i) => {
              const opComponents = components.filter(c => c.operation_id === op.id)
              const availableToAssign = components.filter(c => !c.operation_id)
              const isExpanded = expandedOp === op.id

              return (
                <div key={op.id} className="bg-white rounded-2xl border border-gray-100">
                  {/* Operation header */}
                  <div
                    className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedOp(isExpanded ? null : op.id)}
                  >
                    <span className="w-7 h-7 rounded-full bg-lime-50 text-lime-600 text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{op.operation_name}</p>
                      <p className="text-xs text-gray-400">
                        {opComponents.length} componente{opComponents.length !== 1 ? "s" : ""} asignado{opComponents.length !== 1 ? "s" : ""}
                        {op.duration_minutes ? ` · ${op.duration_minutes} min` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          handleRemovePTOperation(op.id)
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
                          {/* Operation details */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-400 uppercase">Tiempo (min)</label>
                              <Input
                                type="number"
                                defaultValue={op.duration_minutes || ""}
                                onBlur={e => {
                                  const v = parseFloat(e.target.value)
                                  if (!isNaN(v)) handleUpdatePTOp(op.id, "duration_minutes", v)
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
                                  if (!isNaN(v)) handleUpdatePTOp(op.id, "temperature_celsius", v)
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
                                  if (!isNaN(v)) handleUpdatePTOp(op.id, "people_count", v)
                                }}
                                className="h-8 text-sm rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-400 uppercase">Uds/hora</label>
                              <Input
                                type="number"
                                defaultValue={op.speed_rpm || ""}
                                onBlur={e => {
                                  const v = parseFloat(e.target.value)
                                  if (!isNaN(v)) handleUpdatePTOp(op.id, "speed_rpm", v)
                                }}
                                className="h-8 text-sm rounded-lg"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-gray-400 uppercase">Observaciones</label>
                            <Textarea
                              defaultValue={op.observations || ""}
                              onBlur={e => handleUpdatePTOp(op.id, "observations", e.target.value)}
                              className="text-sm rounded-lg min-h-[40px]"
                              rows={1}
                            />
                          </div>

                          {/* Photos */}
                          <OperationPhotos prototypeId={prototypeId} operationId={op.id} />

                          {/* Assigned components */}
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase mb-2 block">
                              Componentes consumidos en esta operación
                            </label>
                            {opComponents.length > 0 ? (
                              <div className="space-y-1">
                                {opComponents.map(c => (
                                  <div
                                    key={c.id}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                                      c.component_type === "PP"
                                        ? "bg-blue-50 border border-blue-100"
                                        : "bg-amber-50 border border-amber-100"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {c.component_type === "PP" ? (
                                        <Beaker className="w-3.5 h-3.5 text-blue-500" />
                                      ) : (
                                        <Package className="w-3.5 h-3.5 text-amber-500" />
                                      )}
                                      <span className="font-medium text-gray-800">{c.material_name}</span>
                                      <span className="text-xs text-gray-400">{c.quantity_grams}g</span>
                                    </div>
                                    <button
                                      onClick={() => handleUnassignComponent(c.id)}
                                      className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic">Sin componentes asignados</p>
                            )}
                          </div>

                          {/* Assign component picker */}
                          {availableToAssign.length > 0 && (
                            <div>
                              <SearchableSelect
                                options={availableToAssign.map(c => ({
                                  value: c.id,
                                  label: `${c.material_name} (${c.quantity_grams}g)`,
                                  subLabel: c.component_type,
                                }))}
                                value={null}
                                onChange={(val) => {
                                  if (val) handleAssignComponent(val, op.id)
                                }}
                                placeholder="Asignar componente..."
                              />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}

            {/* Add operation */}
            {showAddOp ? (
              <div className="bg-white rounded-2xl border border-lime-200 p-4 space-y-3">
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
                  <Button size="sm" onClick={handleAddPTOperation} className="bg-lime-500 hover:bg-lime-600 rounded-lg">
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

            {/* All assigned summary */}
            {components.length > 0 && ptOperations.length > 0 && unassignedComponents.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                <p className="text-sm text-green-700 font-medium">
                  Todos los componentes están asignados a una operación
                </p>
              </div>
            )}
          </div>
        )}

        {/* === QUALITY TAB === */}
        {activeTab === "quality" && (
          <div className="space-y-4">
            {qualityData ? (
              <>
                {/* Summary */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                  <p className="text-3xl font-bold text-yellow-500">
                    {qualityData.overall_score ? Number(qualityData.overall_score).toFixed(1) : "-"}
                  </p>
                  <p className="text-xs text-gray-500 uppercase mt-1">Puntaje promedio</p>
                  {qualityData.approved !== null && (
                    <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full font-medium ${
                      qualityData.approved ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                    }`}>
                      {qualityData.approved ? "Aprobado" : "No aprobado"}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: "texture_score", label: "Textura" },
                    { key: "color_score", label: "Color" },
                    { key: "appearance_score", label: "Apariencia" },
                    { key: "taste_score", label: "Sabor" },
                    { key: "aroma_score", label: "Aroma" },
                    { key: "crumb_structure_score", label: "Miga" },
                  ].map(p => (
                    <div key={p.key} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-gray-800">
                        {(qualityData as any)[p.key] ?? "-"}
                      </p>
                      <p className="text-[10px] text-gray-500 uppercase">{p.label}</p>
                    </div>
                  ))}
                </div>
                {qualityData.overall_notes && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-400 uppercase mb-1">Notas</p>
                    <p className="text-sm text-gray-700">{qualityData.overall_notes}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-gray-900 mb-1">Sin evaluación</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Evalúa la calidad del producto terminado
                </p>
              </div>
            )}
            <Button
              onClick={() => router.push(`/id/${prototypeId}/calidad`)}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl h-12"
            >
              {qualityData ? "Editar Evaluación" : "Evaluar Calidad"}
            </Button>
          </div>
        )}

        {/* === SENSORY TAB === */}
        {activeTab === "sensory" && (
          <div className="space-y-4">
            <SensoryLinkShare
              prototypeId={prototypeId}
              sensoryToken={prototype.sensory_token}
            />
          </div>
        )}

        {/* === COSTS TAB === */}
        {activeTab === "costs" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Desglose de Costos</h3>
              {components.length === 0 ? (
                <p className="text-sm text-gray-500">Agrega componentes para ver costos</p>
              ) : (
                <div className="space-y-2">
                  {components.map(c => {
                    const cpg = c.cost_per_gram || 0
                    const subtotal = c.quantity_grams * cpg
                    return (
                      <div key={c.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            c.component_type === "PP" ? "bg-blue-400" : "bg-amber-400"
                          }`} />
                          <span className="text-gray-700">{c.material_name}</span>
                          <span className="text-gray-400 text-xs">{c.quantity_grams}g</span>
                        </div>
                        <div className="text-right">
                          {cpg > 0 ? (
                            <span className="font-medium text-gray-900">
                              ${subtotal.toFixed(0)}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">Sin costo</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div className="border-t pt-2 mt-2 flex items-center justify-between font-semibold">
                    <span>Total Material</span>
                    <span>${totalCost.toFixed(0)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Component Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {addType === "PP" ? "Agregar Producto en Proceso" : "Agregar Materia Prima"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={isNewItem ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsNewItem(true)
                  setSelectedMaterialId(null)
                  setSelectedPPProductId(null)
                  setNewComponentName("")
                }}
                className="rounded-lg text-xs"
              >
                Nuevo
              </Button>
              <Button
                variant={!isNewItem ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsNewItem(false)
                  setNewComponentName("")
                }}
                className="rounded-lg text-xs"
              >
                Existente
              </Button>
            </div>

            {!isNewItem ? (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  {addType === "PP" ? "Producto en Proceso" : "Material"}
                </label>
                <SearchableSelect
                  options={allMaterials
                    .filter(m => m.category === (addType === "PP" ? "PP" : "MP"))
                    .map(m => ({ value: m.id, label: m.name }))}
                  value={addType === "PP" ? selectedPPProductId : selectedMaterialId}
                  onChange={(val) => {
                    const item = allMaterials.find(m => m.id === val)
                    if (addType === "PP") {
                      setSelectedPPProductId(val)
                    } else {
                      setSelectedMaterialId(val)
                    }
                    if (item) {
                      setNewComponentName(item.name)
                      if (addType === "MP") {
                        const preferred = getPreferredSupplier(val)
                        const supplier = preferred || getBestPriceSupplier(val)
                        if (supplier && supplier.packaging_weight_grams) {
                          const costPerKg = (supplier.unit_price / supplier.packaging_weight_grams) * 1000
                          setNewUnitCost(costPerKg.toFixed(2))
                        } else {
                          setNewUnitCost("")
                        }
                      }
                    }
                  }}
                  placeholder={addType === "PP" ? "Buscar producto en proceso..." : "Buscar material..."}
                />
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Nombre</label>
                <Input
                  value={newComponentName}
                  onChange={e => setNewComponentName(e.target.value.toUpperCase())}
                  placeholder={addType === "PP" ? "Ej: MASA MADRE, RELLENO DE BOCADILLO" : "Ej: AZÚCAR, SAL"}
                  className="rounded-xl"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Cantidad (gramos)
              </label>
              <Input
                type="number"
                value={newComponentQty}
                onChange={e => setNewComponentQty(e.target.value)}
                placeholder="Ej: 500"
                className="rounded-xl"
              />
            </div>

            {addType === "MP" && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Costo por kg (COP)
                </label>
                <Input
                  type="number"
                  value={newUnitCost}
                  onChange={e => setNewUnitCost(e.target.value)}
                  placeholder="Ej: 5000"
                  className={`rounded-xl ${!isNewItem && selectedMaterialId ? "bg-gray-50 text-gray-500" : ""}`}
                  readOnly={!isNewItem && !!selectedMaterialId}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleAddComponent} className="bg-lime-500 hover:bg-lime-600 rounded-xl">
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
