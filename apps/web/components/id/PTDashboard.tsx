"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { usePrototypes, Prototype } from "@/hooks/use-prototypes"
import { usePrototypeComponents, PrototypeComponent } from "@/hooks/use-prototype-components"
import { usePrototypeMaterials } from "@/hooks/use-prototype-materials"
import { useMaterials } from "@/hooks/use-materials"
import { PrototypeStatusBadge } from "./PrototypeStatusBadge"
import { SensoryLinkShare } from "./SensoryLinkShare"
import { ComponentCard } from "./ComponentCard"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  const { getMaterialsByPrototype } = usePrototypeMaterials()
  const { materials: allMaterials } = useMaterials()

  const [prototype, setPrototype] = useState<Prototype | null>(null)
  const [components, setComponents] = useState<PrototypeComponent[]>([])
  const [ppPrototypes, setPPPrototypes] = useState<Record<string, Prototype>>({})
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addType, setAddType] = useState<"PP" | "MP">("PP")
  const [newComponentName, setNewComponentName] = useState("")
  const [newComponentQty, setNewComponentQty] = useState("")
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null)
  const [isNewMaterial, setIsNewMaterial] = useState(true)
  const [newUnitCost, setNewUnitCost] = useState("")
  const [activeTab, setActiveTab] = useState<"components" | "quality" | "sensory" | "costs">("components")

  const loadData = useCallback(async () => {
    setLoading(true)
    const [proto, comps] = await Promise.all([
      getPrototypeById(prototypeId),
      getComponentsByPrototype(prototypeId),
    ])
    setPrototype(proto)
    setComponents(comps)

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
  }, [prototypeId, getPrototypeById, getComponentsByPrototype])

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
      // Create a PP prototype as child
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
      // MP component
      await addComponent({
        pt_prototype_id: prototypeId,
        component_type: "MP",
        material_id: isNewMaterial ? null : selectedMaterialId,
        material_name: newComponentName,
        is_new_material: isNewMaterial,
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
    setIsNewMaterial(true)
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

  // Calculate overall progress
  const ppComponents = components.filter(c => c.component_type === "PP")
  const mpComponents = components.filter(c => c.component_type === "MP")
  const completedPPs = ppComponents.filter(c => {
    if (!c.pp_prototype_id) return false
    const pp = ppPrototypes[c.pp_prototype_id]
    return pp?.pp_status === "complete"
  })
  const allPPsComplete = ppComponents.length === 0 || completedPPs.length === ppComponents.length

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
              { key: "quality", label: "Calidad", icon: Star },
              { key: "sensory", label: "Sensorial", icon: ClipboardList },
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

            {/* PT Recipe button - only visible when all PPs are complete */}
            {allPPsComplete && components.length > 0 && (
              <Button
                onClick={() => router.push(`/id/${prototypeId}/receta`)}
                className="w-full bg-lime-500 hover:bg-lime-600 text-white rounded-xl h-12"
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                Definir Receta del Producto Terminado
              </Button>
            )}
          </div>
        )}

        {activeTab === "quality" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">Evaluación de Calidad</h3>
            <p className="text-sm text-gray-500 mb-4">
              Evalúa la calidad del producto terminado una vez completada la receta
            </p>
            <Button
              onClick={() => router.push(`/id/${prototypeId}/calidad`)}
              variant="outline"
              className="rounded-xl"
            >
              Ir a Evaluación
            </Button>
          </div>
        )}

        {activeTab === "sensory" && (
          <div className="space-y-4">
            <SensoryLinkShare
              prototypeId={prototypeId}
              sensoryToken={prototype.sensory_token}
            />
          </div>
        )}

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
            {addType === "MP" && (
              <div className="flex gap-2">
                <Button
                  variant={isNewMaterial ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsNewMaterial(true)}
                  className="rounded-lg text-xs"
                >
                  Nuevo
                </Button>
                <Button
                  variant={!isNewMaterial ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsNewMaterial(false)}
                  className="rounded-lg text-xs"
                >
                  Existente
                </Button>
              </div>
            )}

            {addType === "MP" && !isNewMaterial ? (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Material</label>
                <Select
                  value={selectedMaterialId || ""}
                  onValueChange={(val) => {
                    setSelectedMaterialId(val)
                    const mat = allMaterials.find(m => m.id === val)
                    if (mat) {
                      setNewComponentName(mat.name)
                      setNewUnitCost(mat.unit_cost?.toString() || "")
                    }
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Seleccionar material..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allMaterials
                      .filter(m => m.category === "MP")
                      .map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Nombre</label>
                <Input
                  value={newComponentName}
                  onChange={e => setNewComponentName(e.target.value)}
                  placeholder={addType === "PP" ? "Ej: Masa madre, Relleno de bocadillo" : "Ej: Azúcar, Sal"}
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
                  className="rounded-xl"
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
