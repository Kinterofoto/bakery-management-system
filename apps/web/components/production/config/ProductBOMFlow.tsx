"use client"

import { useState, useEffect, useCallback } from "react"
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Handle,
  Position,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Plus, Trash2, X, Clock, Box, Workflow, Check, ChevronsUpDown, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useProductionRoutes } from "@/hooks/use-production-routes"
import { useMaterials } from "@/hooks/use-materials"
import { useOperations } from "@/hooks/use-operations"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { useProductivity } from "@/hooks/use-productivity"
import { useBillOfMaterials } from "@/hooks/use-bill-of-materials"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

interface BOMItem {
  id: string
  product_id: string
  material_id: string
  operation_id: string | null
  quantity_needed: number
  original_quantity?: number | null
  unit_name: string
  unit_equivalence_grams: number
  tiempo_reposo_horas: number | null
  material?: {
    id: string
    name: string
    base_unit: string
    category: string
  } | null
}

interface Props {
  productId: string
  productName: string
  productWeight: string | null
  productLoteMinimo: number | null
  onClose: () => void
}

interface Product {
  id: string
  name: string
  weight: string | null
  lote_minimo: number | null
  is_recipe_by_grams: boolean
}

// Material item with inline edit and drag
function MaterialItem({ material, onDelete, onUpdateQuantity }: {
  material: any
  onDelete: (bomId: string) => void
  onUpdateQuantity: (bomId: string, qty: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState("")

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditValue(String(material.rawQuantity))
    setEditing(true)
  }

  const handleSave = () => {
    const val = parseFloat(editValue)
    if (!isNaN(val) && val > 0) {
      onUpdateQuantity(material.bomId, val)
    }
    setEditing(false)
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/bom-material", JSON.stringify({
          bomId: material.bomId,
          name: material.name
        }))
        e.dataTransfer.effectAllowed = "move"
      }}
      className="flex items-start justify-between p-2 bg-slate-50 rounded-md border border-slate-100 text-[11px] sm:text-xs cursor-grab active:cursor-grabbing hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
    >
      <div className="flex-1 min-w-0 mr-2">
        <div className="font-semibold text-blue-700 truncate">
          {material.name}
        </div>
        {editing ? (
          <div className="flex items-center gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
            <input
              type="number"
              step="any"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
                if (e.key === "Escape") setEditing(false)
              }}
              onBlur={handleSave}
              autoFocus
              className="w-16 h-5 px-1 text-[11px] border border-blue-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <span className="uppercase opacity-70 text-gray-600">{material.unit}</span>
          </div>
        ) : (
          <button
            onClick={handleStartEdit}
            className="text-gray-600 mt-0.5 font-medium hover:text-blue-600 hover:underline cursor-text"
          >
            {material.quantity} <span className="uppercase opacity-70">{material.unit}</span>
          </button>
        )}
      </div>
      <button
        onClick={() => onDelete(material.bomId)}
        className="text-gray-400 hover:text-red-600 p-1 -m-1 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// Nodo personalizado para operación
function OperationNode({ data }: any) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <div className="relative group">
      {/* Handle de entrada (izquierda) */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-purple-600 !border-2 !border-white"
      />

      {/* Botón + a la izquierda - minimalista */}
      <button
        onClick={() => data.onAddOperationBefore(data.sequenceOrder)}
        className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 border border-gray-300 bg-white hover:bg-gray-50 text-gray-400 hover:text-blue-600 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20"
        title="Agregar antes"
      >
        <Plus className="w-3 h-3" />
      </button>

      <div
        className={`bg-white rounded-lg border-2 shadow-md p-3 sm:p-4 min-w-[240px] sm:min-w-[280px] max-w-[90vw] transition-colors ${
          dragOver ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200'
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = "move"
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          try {
            const raw = e.dataTransfer.getData("application/bom-material")
            if (raw) {
              const { bomId } = JSON.parse(raw)
              data.onMoveMaterial(bomId, data.operationId)
            }
          } catch {}
        }}
      >
        {/* Header */}
        <div className="mb-3 relative">
          {data.isFirst && (
            <div className="text-[10px] sm:text-xs text-yellow-600 font-bold mb-1 uppercase tracking-wider">1ra operación</div>
          )}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm sm:text-base text-gray-800 leading-tight truncate">{data.operationName}</div>
              <div className="text-[10px] sm:text-xs text-gray-500 font-medium">Producción</div>
            </div>
            <button
              onClick={() => data.onDeleteOperation(data.routeId)}
              className="text-gray-400 hover:text-red-600 p-1 -m-1 transition-colors"
              title="Eliminar operación"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Materiales */}
        <div className="space-y-1.5 mb-3">
          {data.materials?.map((material: any) => (
            <MaterialItem
              key={material.id}
              material={material}
              onDelete={data.onDeleteMaterial}
              onUpdateQuantity={data.onUpdateQuantity}
            />
          ))}
        </div>

        {dragOver && (
          <div className="text-[10px] text-blue-500 text-center py-1 mb-2 border border-dashed border-blue-300 rounded">
            Soltar aquí
          </div>
        )}

        {/* Botones de acción */}
        <div className="space-y-2">
          <Button
            onClick={() => data.onAddMaterial(data.operationId)}
            variant="outline"
            size="sm"
            className="w-full text-blue-600 border-blue-300 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Materiales
          </Button>

          <Button
            onClick={() => data.onConfigureProductivity(data.operationId)}
            variant="outline"
            size="sm"
            className={`w-full text-xs ${data.productivity
              ? 'text-green-700 border-green-300 bg-green-50 hover:bg-green-100'
              : 'text-gray-600 border-gray-300'
              }`}
          >
            <Clock className="w-3 h-3 mr-1" />
            {data.productivity
              ? `${data.productivity.units_per_hour} h/h`
              : 'Configurar productividad'}
          </Button>
        </div>
      </div>

      {/* Botón + a la derecha - mejorado para touch */}
      <button
        onClick={() => data.onAddOperationAfter(data.sequenceOrder)}
        className="absolute -right-10 top-1/2 -translate-y-1/2 w-8 h-8 border-2 border-blue-100 bg-white hover:bg-blue-50 text-blue-500 hover:text-blue-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 active:scale-95 transition-all z-20 shadow-sm"
        title="Agregar después"
      >
        <Plus className="w-4 h-4" />
      </button>

      {/* Handle de salida (derecha) */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-purple-600 !border-2 !border-white"
      />
    </div>
  )
}

// Editable grams cell for formula table
function EditableGrams({ grams, bomId, onSave }: {
  grams: number
  bomId: string
  onSave: (bomId: string, newGrams: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState("")

  const handleStart = () => {
    setValue(grams.toFixed(1))
    setEditing(true)
  }

  const handleSave = () => {
    if (!editing) return
    setEditing(false)
    const parsed = parseFloat(value.replace(",", "."))
    if (!isNaN(parsed) && parsed > 0) {
      onSave(bomId, parsed)
    }
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        = <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === "Enter") {
              e.preventDefault()
              handleSave()
            }
            if (e.key === "Escape") setEditing(false)
          }}
          onBlur={handleSave}
          autoFocus
          className="w-20 h-5 px-1 text-right text-[9px] sm:text-xs font-mono bg-white/90 text-gray-900 border border-white/40 rounded focus:outline-none focus:ring-1 focus:ring-white"
        />
      </span>
    )
  }

  return (
    <button
      onClick={handleStart}
      className="hover:bg-white/20 rounded px-1 -mx-1 transition-colors cursor-text"
    >
      = {grams.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
    </button>
  )
}

const nodeTypes = {
  operation: OperationNode,
}

export function ProductBOMFlow({ productId, productName, productWeight, productLoteMinimo, onClose }: Props) {
  const { fetchRoutesByProduct, createRoute, deleteRoute } = useProductionRoutes()
  const { materials } = useMaterials()
  const { operations, getActiveOperations } = useOperations()
  const { workCenters } = useWorkCenters()
  const { getProductivityByProductAndOperation, upsertProductivity } = useProductivity()
  const { createBOMItem, deleteBOMItem, updateBOMItem } = useBillOfMaterials()
  const [routes, setRoutes] = useState<any[]>([])
  const [bomItems, setBomItems] = useState<BOMItem[]>([])
  const [productivities, setProductivities] = useState<Record<string, any>>({})
  const [showMaterialDialog, setShowMaterialDialog] = useState(false)
  const [showAddOperationDialog, setShowAddOperationDialog] = useState(false)
  const [showProductivityDialog, setShowProductivityDialog] = useState(false)
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [materialComboOpen, setMaterialComboOpen] = useState(false)
  const [loteMinimo, setLoteMinimo] = useState<string>(productLoteMinimo?.toString() || "")
  const [isEditingLoteMinimo, setIsEditingLoteMinimo] = useState(false)
  const [showFormula, setShowFormula] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const [materialForm, setMaterialForm] = useState({
    material_id: "",
    quantity_needed: "",
    unit_name: "",
    unit_equivalence_grams: "",
    tiempo_reposo_horas: "0",
    operation_id: ""
  })

  const [inlineRow, setInlineRow] = useState<null | {
    material_id: string
    operation_id: string
    grams: string
    quantity: string
    unit_name: string
  }>(null)
  const [inlineMaterialComboOpen, setInlineMaterialComboOpen] = useState(false)

  const [operationForm, setOperationForm] = useState({
    operation_id: "",
    work_center_id: "",
    insertPosition: null as number | null, // null = al final, número = insertar en esa posición
    insertMode: "after" as "before" | "after" | "end"
  })

  const [productivityForm, setProductivityForm] = useState({
    operation_id: "",
    units_per_hour: "",
    // Campos para la calculadora
    calculator_hours: "1",
    calculator_quantity: "",
    calculator_total_grams: 0
  })

  useEffect(() => {
    loadProduct()
    loadProductRoutes()
    loadBOMItems()
  }, [productId])

  // Actualizar nodos cuando cambien las rutas o los materiales
  useEffect(() => {
    if (routes.length > 0) {
      updateFlowNodes()
    }
  }, [routes, bomItems, productivities])

  const loadProduct = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, weight, lote_minimo, is_recipe_by_grams")
        .eq("id", productId)
        .single()

      if (error) throw error
      setProduct(data)
    } catch (error) {
      console.error("Error loading product:", error)
      toast.error("Error al cargar producto")
    }
  }

  const loadProductRoutes = async () => {
    try {
      const data = await fetchRoutesByProduct(productId)
      setRoutes(data)
      // Cargar productividades para cada operación
      await loadProductivities(data)
    } catch (error) {
      console.error("Error loading routes:", error)
      toast.error("Error al cargar las operaciones")
    }
  }

  const loadProductivities = async (routesData: any[]) => {
    try {
      const productivitiesMap: Record<string, any> = {}

      for (const route of routesData) {
        if (route.operation?.id) {
          const productivity = await getProductivityByProductAndOperation(productId, route.operation.id)
          if (productivity) {
            productivitiesMap[route.operation.id] = productivity
          }
        }
      }

      setProductivities(productivitiesMap)
    } catch (error) {
      console.error("Error loading productivities:", error)
    }
  }

  const loadBOMItems = async () => {
    try {
      const { data: bomData, error: bomError } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .select("*")
        .eq("product_id", productId)

      if (bomError) throw bomError

      if (!bomData || bomData.length === 0) {
        setBomItems([])
        return
      }

      const materialIds = [...new Set(bomData.map(item => item.material_id))]
      const { data: materialsData, error: materialsError } = await supabase
        .from("products")
        .select("id, name, unit, category")
        .in("id", materialIds)

      if (materialsError) throw materialsError

      const combined = bomData.map(bomItem => {
        const material = materialsData?.find((m: any) => m.id === bomItem.material_id)
        return {
          ...bomItem,
          material: material ? {
            id: material.id,
            name: material.name,
            base_unit: material.unit,
            category: material.category
          } : null
        }
      })

      setBomItems(combined)
    } catch (error) {
      console.error("Error loading BOM items:", error)
      toast.error("Error al cargar los materiales")
    }
  }

  const updateFlowNodes = () => {
    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    const horizontalSpacing = 400
    const startX = 100

    routes.forEach((route, index) => {
      const operationMaterials = bomItems.filter(
        item => item.operation_id === route.operation?.id
      )

      const allMaterials = operationMaterials.map(bomItem => ({
        id: bomItem.id,
        bomId: bomItem.id,
        code: bomItem.material?.name?.substring(0, 10) || 'MAT',
        name: bomItem.material?.name || 'Material',
        rawQuantity: bomItem.quantity_needed,
        quantity: (bomItem.quantity_needed).toLocaleString(),
        unit: bomItem.unit_name
      }))

      newNodes.push({
        id: `op-${route.id}`,
        type: 'operation',
        position: {
          x: startX + (index * horizontalSpacing),
          y: 150
        },
        data: {
          routeId: route.id,
          operationId: route.operation?.id,
          operationName: route.operation?.name || route.work_center?.name,
          sequenceOrder: route.sequence_order,
          isFirst: index === 0,
          materials: allMaterials,
          productivity: productivities[route.operation?.id],
          onAddMaterial: handleAddMaterial,
          onDeleteMaterial: handleDeleteMaterial,
          onUpdateQuantity: handleUpdateQuantity,
          onMoveMaterial: handleMoveMaterial,
          onDeleteOperation: handleDeleteOperation,
          onAddOperationBefore: handleAddOperationBefore,
          onAddOperationAfter: handleAddOperationAfter,
          onConfigureProductivity: handleConfigureProductivity
        }
      })

      // Conectar con el siguiente nodo
      if (index < routes.length - 1) {
        newEdges.push({
          id: `edge-${route.id}-${routes[index + 1].id}`,
          source: `op-${route.id}`,
          target: `op-${routes[index + 1].id}`,
          type: 'smoothstep',
          animated: true,
          style: {
            stroke: '#9333ea',
            strokeWidth: 2
          },
          markerEnd: {
            type: 'ArrowClosed' as any,
            color: '#9333ea'
          }
        })
      }
    })

    setNodes(newNodes)
    setEdges(newEdges)
  }

  const handleSaveLoteMinimo = async () => {
    try {
      const parsed = loteMinimo ? parseFloat(loteMinimo) : NaN
      const loteValue = Number.isFinite(parsed)
        ? Math.round(parsed * 1000) / 1000
        : null

      const { error } = await supabase
        .from("products")
        .update({ lote_minimo: loteValue })
        .eq("id", productId)

      if (error) throw error

      toast.success("Lote mínimo actualizado")
      setIsEditingLoteMinimo(false)
    } catch (error: any) {
      console.error("Error updating lote minimo:", error)
      toast.error(`Error al actualizar lote mínimo: ${error.message || 'Error desconocido'}`)
    }
  }

  const handleToggleRecipeByGrams = async () => {
    try {
      const next = !product?.is_recipe_by_grams
      const { error } = await supabase
        .from("products")
        .update({ is_recipe_by_grams: next })
        .eq("id", productId)
      if (error) throw error

      // When enabling and items already exist, normalize current quantities to fractions.
      if (next && bomItems.length > 0) {
        const totalRaw = bomItems.reduce((s, it) => s + (it.quantity_needed || 0), 0)
        if (totalRaw > 0) {
          const normalized = bomItems.map(it => ({
            id: it.id,
            quantity_needed: Math.round(((it.quantity_needed || 0) / totalRaw) * 1_000_000) / 1_000_000,
          }))
          const sum = normalized.reduce((s, it) => s + it.quantity_needed, 0)
          const diff = Math.round((1 - sum) * 1_000_000) / 1_000_000
          if (diff !== 0 && normalized.length > 0) {
            let idx = 0
            for (let i = 1; i < normalized.length; i++) {
              if (normalized[i].quantity_needed > normalized[idx].quantity_needed) idx = i
            }
            normalized[idx].quantity_needed = Math.round((normalized[idx].quantity_needed + diff) * 1_000_000) / 1_000_000
          }
          await Promise.all(normalized.map(n =>
            supabase
              .schema("produccion")
              .from("bill_of_materials")
              .update({
                quantity_needed: n.quantity_needed,
                original_quantity: n.quantity_needed,
                updated_at: new Date().toISOString(),
              })
              .eq("id", n.id)
          ))
        }
      }

      toast.success(next ? "Receta por gramos activada" : "Receta por gramos desactivada")
      await loadProduct()
      await loadBOMItems()
    } catch (error: any) {
      console.error("Error toggling recipe by grams:", error)
      toast.error(`Error al cambiar modo: ${error.message || "Error desconocido"}`)
    }
  }

  const handleStartInlineAdd = () => {
    if (routes.length === 0) {
      toast.error("Agrega primero una operación")
      return
    }
    setInlineRow({
      material_id: "",
      operation_id: routes[0]?.operation?.id ?? "",
      grams: "",
      quantity: "",
      unit_name: "g",
    })
  }

  const handleCancelInlineAdd = () => {
    setInlineRow(null)
    setInlineMaterialComboOpen(false)
  }

  const handleSaveInlineRow = async () => {
    if (!inlineRow) return
    const isByGrams = !!product?.is_recipe_by_grams

    if (!inlineRow.material_id) {
      toast.error("Selecciona un material")
      return
    }
    if (!inlineRow.operation_id) {
      toast.error("Selecciona una operación")
      return
    }

    try {
      setLoading(true)
      if (isByGrams) {
        const grams = parseFloat(inlineRow.grams)
        if (!Number.isFinite(grams) || grams <= 0) {
          toast.error("Ingresa los gramos")
          setLoading(false)
          return
        }
        const round6 = (x: number) => Math.round(x * 1_000_000) / 1_000_000
        const currentLote = parseFloat(loteMinimo) || 0

        if (bomItems.length === 0 || currentLote <= 0) {
          // First ingredient / no batch yet: this item defines the batch.
          const newLote = round6(grams)
          await supabase.from("products").update({ lote_minimo: newLote }).eq("id", productId)
          await supabase.schema("produccion").from("bill_of_materials").insert({
            product_id: productId,
            operation_id: inlineRow.operation_id,
            material_id: inlineRow.material_id,
            quantity_needed: 1,
            original_quantity: 1,
            unit_name: "g",
            unit_equivalence_grams: 1,
            is_active: true,
          })
          setLoteMinimo(newLote.toString())
        } else {
          // Additive: grow the lote so existing items keep their gram amounts
          // and the new ingredient contributes the entered grams on top.
          const existingGramsTotal = bomItems.reduce(
            (s, it) => s + (it.quantity_needed || 0) * currentLote,
            0,
          )
          const newLote = round6(existingGramsTotal + grams)
          const scale = currentLote / newLote

          const rescaled = bomItems.map(it => ({
            id: it.id,
            quantity_needed: round6((it.quantity_needed || 0) * scale),
          }))
          let newItemFraction = round6(grams / newLote)

          // Push rounding residual onto the largest fraction so the total stays 1.
          const sum = rescaled.reduce((s, r) => s + r.quantity_needed, 0) + newItemFraction
          const diff = round6(1 - sum)
          if (diff !== 0) {
            let maxFraction = newItemFraction
            let maxIdx = -1 // -1 means new item has the largest fraction
            rescaled.forEach((r, i) => {
              if (r.quantity_needed > maxFraction) {
                maxFraction = r.quantity_needed
                maxIdx = i
              }
            })
            if (maxIdx === -1) {
              newItemFraction = round6(newItemFraction + diff)
            } else {
              rescaled[maxIdx].quantity_needed = round6(rescaled[maxIdx].quantity_needed + diff)
            }
          }

          await Promise.all(rescaled.map(r =>
            supabase
              .schema("produccion")
              .from("bill_of_materials")
              .update({
                quantity_needed: r.quantity_needed,
                original_quantity: r.quantity_needed,
                updated_at: new Date().toISOString(),
              })
              .eq("id", r.id)
          ))
          await supabase.from("products").update({ lote_minimo: newLote }).eq("id", productId)
          await supabase.schema("produccion").from("bill_of_materials").insert({
            product_id: productId,
            operation_id: inlineRow.operation_id,
            material_id: inlineRow.material_id,
            quantity_needed: newItemFraction,
            original_quantity: newItemFraction,
            unit_name: "g",
            unit_equivalence_grams: 1,
            is_active: true,
          })
          setLoteMinimo(newLote.toString())
        }
      } else {
        const qty = parseFloat(inlineRow.quantity)
        if (!Number.isFinite(qty) || qty <= 0) {
          toast.error("Ingresa una cantidad")
          setLoading(false)
          return
        }
        const unit = inlineRow.unit_name.trim() || "g"
        await createBOMItem({
          product_id: productId,
          operation_id: inlineRow.operation_id,
          material_id: inlineRow.material_id,
          quantity_needed: qty,
          unit_name: unit,
          unit_equivalence_grams: 1,
          tiempo_reposo_horas: null,
          is_active: true,
        })
      }

      toast.success("Material agregado")
      setInlineRow(null)
      await loadBOMItems()
    } catch (error: any) {
      console.error("Error saving inline row:", error)
      toast.error(`Error al agregar material: ${error.message || "Error desconocido"}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMaterial = (operationId: string | null) => {
    setSelectedOperation(operationId)
    const defaultOperation = operationId ?? (routes[0]?.operation?.id ?? "")
    setMaterialForm({
      material_id: "",
      quantity_needed: "",
      unit_name: "",
      unit_equivalence_grams: "",
      tiempo_reposo_horas: "0",
      operation_id: defaultOperation,
    })
    setShowMaterialDialog(true)
  }

  const handleSaveMaterial = async () => {
    if (!materialForm.material_id || !materialForm.quantity_needed || !materialForm.unit_name || !materialForm.unit_equivalence_grams) {
      toast.error("Completa todos los campos")
      return
    }

    const targetOperation = materialForm.operation_id || selectedOperation
    if (!targetOperation) {
      toast.error("Selecciona una operación")
      return
    }

    try {
      setLoading(true)
      await createBOMItem({
        product_id: productId,
        operation_id: targetOperation,
        material_id: materialForm.material_id,
        quantity_needed: parseFloat(materialForm.quantity_needed),
        unit_name: materialForm.unit_name,
        unit_equivalence_grams: parseFloat(materialForm.unit_equivalence_grams),
        tiempo_reposo_horas: materialForm.tiempo_reposo_horas ? parseFloat(materialForm.tiempo_reposo_horas) : null,
        is_active: true
      })

      toast.success("Material agregado")
      setShowMaterialDialog(false)
      await loadBOMItems() // Recargar
    } catch (error) {
      console.error("Error adding material:", error)
      toast.error("Error al agregar material")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMaterial = async (bomId: string) => {
    if (!confirm("¿Eliminar este material?")) return

    try {
      await deleteBOMItem(bomId, productId)
      toast.success("Material eliminado")
      await loadBOMItems() // Recargar
    } catch (error) {
      console.error("Error deleting material:", error)
      toast.error("Error al eliminar material")
    }
  }

  const handleUpdateQuantity = async (bomId: string, newQuantity: number) => {
    try {
      await updateBOMItem(bomId, { quantity_needed: newQuantity })
      await loadBOMItems()
    } catch (error) {
      console.error("Error updating quantity:", error)
      toast.error("Error al actualizar cantidad")
    }
  }

  const handleUpdateGrams = async (bomId: string, newGrams: number) => {
    try {
      const loteValue = parseFloat(loteMinimo) || 0
      if (loteValue <= 0 || newGrams <= 0) return

      const target = bomItems.find(i => i.id === bomId)
      if (!target) return

      const currentFraction = target.quantity_needed || 0
      if (currentFraction <= 0) return

      // Preserve the recipe ratio: scale the whole batch so this ingredient
      // reaches newGrams while fractions stay the same.
      const currentGrams = currentFraction * loteValue
      if (currentGrams <= 0) return

      const scaleFactor = newGrams / currentGrams
      const newLote = Math.round(loteValue * scaleFactor * 1000) / 1000

      const { error } = await supabase
        .from("products")
        .update({ lote_minimo: newLote })
        .eq("id", productId)
      if (error) throw error

      setLoteMinimo(newLote.toString())
      await loadBOMItems()
    } catch (error) {
      console.error("Error updating grams:", error)
      toast.error("Error al actualizar gramos")
    }
  }

  const handleMoveMaterial = async (bomId: string, newOperationId: string) => {
    try {
      await updateBOMItem(bomId, { operation_id: newOperationId })
      toast.success("Material movido")
      await loadBOMItems()
    } catch (error) {
      console.error("Error moving material:", error)
      toast.error("Error al mover material")
    }
  }

  const handleConfigureProductivity = (operationId: string) => {
    const existingProductivity = productivities[operationId]

    // Calcular el total de gramos de todos los materiales del BOM
    // Usar original_quantity si existe, sino quantity_needed
    const totalGrams = bomItems.reduce((sum, item) => {
      const quantity = item.original_quantity ?? item.quantity_needed
      const quantityInGrams = quantity * item.unit_equivalence_grams
      console.log(`Material: ${item.material?.name}, Cantidad: ${quantity}, Unidad: ${item.unit_name}, Equivalencia: ${item.unit_equivalence_grams}, Total: ${quantityInGrams}`)
      return sum + quantityInGrams
    }, 0)

    console.log("Total de gramos calculado:", totalGrams)

    setProductivityForm({
      operation_id: operationId,
      units_per_hour: existingProductivity?.units_per_hour?.toString() || "",
      calculator_hours: "1",
      calculator_quantity: "",
      calculator_total_grams: totalGrams
    })
    setShowProductivityDialog(true)
  }

  const handleSaveProductivity = async () => {
    if (!productivityForm.units_per_hour || parseFloat(productivityForm.units_per_hour) <= 0) {
      toast.error("Ingresa un valor válido de horas/hombre")
      return
    }

    try {
      setLoading(true)
      await upsertProductivity(
        productId,
        productivityForm.operation_id,
        parseFloat(productivityForm.units_per_hour)
      )

      toast.success("Productividad configurada")
      setShowProductivityDialog(false)

      // Recargar productividades
      await loadProductivities(routes)
    } catch (error) {
      console.error("Error saving productivity:", error)
      toast.error("Error al guardar productividad")
    } finally {
      setLoading(false)
    }
  }

  const handleAddOperation = async () => {
    if (!operationForm.operation_id) {
      toast.error("Selecciona una operación")
      return
    }

    try {
      setLoading(true)

      const workCenter = workCenters.find((wc: any) => (wc as any).operation_id === operationForm.operation_id)

      if (!workCenter) {
        toast.error("No hay centros de trabajo para esta operación")
        return
      }

      let newSequence: number

      if (operationForm.insertMode === "end" || operationForm.insertPosition === null) {
        // Agregar al final
        const maxSequence = routes.length > 0
          ? Math.max(...routes.map(r => r.sequence_order))
          : 0
        newSequence = maxSequence + 1
      } else {
        // Insertar en posición específica
        const targetSequence = operationForm.insertMode === "before"
          ? operationForm.insertPosition
          : operationForm.insertPosition + 1

        // Actualizar secuencias de las rutas existentes (mover las que vienen después)
        const routesToUpdate = routes.filter(r => r.sequence_order >= targetSequence)
        for (const route of routesToUpdate) {
          await supabase
            .schema("produccion")
            .from("production_routes")
            .update({ sequence_order: route.sequence_order + 1 })
            .eq("id", route.id)
        }

        newSequence = targetSequence
      }

      await createRoute({
        product_id: productId,
        work_center_id: workCenter.id,
        sequence_order: newSequence,
        is_active: true
      })

      toast.success("Operación agregada")
      setShowAddOperationDialog(false)
      setOperationForm({ operation_id: "", work_center_id: "", insertPosition: null, insertMode: "after" })
      await loadProductRoutes()
    } catch (error) {
      console.error("Error adding operation:", error)
      toast.error("Error al agregar operación")
    } finally {
      setLoading(false)
    }
  }

  const handleAddOperationBefore = (sequenceOrder: number) => {
    setOperationForm({
      operation_id: "",
      work_center_id: "",
      insertPosition: sequenceOrder,
      insertMode: "before"
    })
    setShowAddOperationDialog(true)
  }

  const handleAddOperationAfter = (sequenceOrder: number) => {
    setOperationForm({
      operation_id: "",
      work_center_id: "",
      insertPosition: sequenceOrder,
      insertMode: "after"
    })
    setShowAddOperationDialog(true)
  }

  const handleDeleteOperation = async (routeId: string) => {
    if (!confirm("¿Eliminar esta operación de la secuencia?")) return

    try {
      await deleteRoute(routeId)
      toast.success("Operación eliminada")
      await loadProductRoutes()
    } catch (error) {
      console.error("Error deleting operation:", error)
      toast.error("Error al eliminar operación")
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header compacto y responsive */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-3 sm:px-4 sm:py-3 mb-3 sm:mb-4 rounded-xl shadow-lg border border-purple-500/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
            <button
              onClick={onClose}
              className="shrink-0 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-white font-bold text-sm sm:text-lg truncate leading-tight">
                {productName}{productWeight ? ` - ${productWeight}` : ''}
              </h2>
              {/* Lote Mínimo */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-purple-100 text-[10px] sm:text-xs font-medium">Lote mínimo:</span>
                {isEditingLoteMinimo ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.001"
                      value={loteMinimo}
                      onChange={(e) => setLoteMinimo(e.target.value)}
                      className="h-6 w-24 bg-white/90 text-gray-900 text-xs px-2"
                      placeholder="0"
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveLoteMinimo}
                      className="h-6 px-2 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setLoteMinimo(productLoteMinimo?.toString() || "")
                        setIsEditingLoteMinimo(false)
                      }}
                      className="h-6 px-2 text-white hover:bg-white/10"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingLoteMinimo(true)}
                    className="text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded text-xs font-semibold transition-colors"
                  >
                    {loteMinimo || "Sin definir"} {loteMinimo && "unidades"}
                  </button>
                )}

                <span className="text-purple-100 text-[10px] sm:text-xs font-medium ml-2">Receta por gramos:</span>
                <button
                  onClick={handleToggleRecipeByGrams}
                  role="switch"
                  aria-checked={!!product?.is_recipe_by_grams}
                  title="Cuando está activo, las cantidades se normalizan a fracciones que suman 1.000"
                  className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/40",
                    product?.is_recipe_by_grams ? "bg-green-500" : "bg-white/20"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                      product?.is_recipe_by_grams ? "translate-x-4" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>

              {/* Formula / ingredients table */}
              {(bomItems.length > 0 || routes.length > 0) && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowFormula(!showFormula)}
                    className="flex items-center gap-1 text-purple-100 hover:text-white text-[10px] sm:text-xs font-medium transition-colors"
                  >
                    {product?.is_recipe_by_grams ? "Ver fórmula" : "Ver ingredientes"}
                    {showFormula ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {showFormula && (() => {
                    const isByGrams = !!product?.is_recipe_by_grams
                    const loteValue = parseFloat(loteMinimo) || 0
                    const totalFraction = bomItems.reduce((sum, item) => sum + (item.quantity_needed || 0), 0)
                    const valueColCount = isByGrams ? 3 : 2
                    const footerSpan = 2 + valueColCount + 1
                    return (
                      <div className="mt-1.5 bg-white/10 rounded-lg p-1.5 sm:p-2 backdrop-blur-sm overflow-x-auto max-w-[calc(100vw-4rem)]">
                        <table className="w-full text-[9px] sm:text-xs text-white">
                          <thead>
                            <tr className="border-b border-white/20">
                              <th className="text-left py-1 pr-1 sm:pr-2 font-semibold">Material</th>
                              <th className="text-left py-1 px-1 sm:px-2 font-semibold">Operación</th>
                              {isByGrams ? (
                                <>
                                  <th className="text-right py-1 px-1 sm:px-2 font-semibold">Fracción</th>
                                  <th className="hidden sm:table-cell text-right py-1 px-2 font-semibold">× Lote mín.</th>
                                  <th className="text-right py-1 pl-1 sm:pl-2 font-semibold">= Gramos</th>
                                </>
                              ) : (
                                <>
                                  <th className="text-right py-1 px-1 sm:px-2 font-semibold">Cantidad</th>
                                  <th className="text-left py-1 pl-1 sm:pl-2 font-semibold">Unidad</th>
                                </>
                              )}
                              <th className="py-1 pl-1 sm:pl-2 w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {bomItems.map((item) => {
                              const grams = (item.quantity_needed || 0) * loteValue
                              return (
                                <tr key={item.id} className="border-b border-white/10">
                                  <td className="py-1 pr-1 sm:pr-2 truncate">{item.material?.name || "—"}</td>
                                  <td className="py-1 px-1 sm:px-2">
                                    <select
                                      value={item.operation_id || ""}
                                      onChange={(e) => handleMoveMaterial(item.id, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="bg-white/10 hover:bg-white/20 text-white text-[9px] sm:text-xs rounded px-1 py-0.5 border border-white/20 focus:outline-none focus:ring-1 focus:ring-white/50 max-w-[120px] truncate"
                                    >
                                      {routes.map((route) => (
                                        <option
                                          key={route.id}
                                          value={route.operation?.id || ""}
                                          className="text-gray-900"
                                        >
                                          {route.operation?.name || route.work_center?.name || "—"}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  {isByGrams ? (
                                    <>
                                      <td className="text-right py-1 px-1 sm:px-2 font-mono">{(item.quantity_needed || 0).toFixed(3)}</td>
                                      <td className="hidden sm:table-cell text-right py-1 px-2 font-mono text-purple-200">× {loteValue.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                                      <td className="text-right py-1 pl-1 sm:pl-2 font-mono font-semibold">
                                        <EditableGrams
                                          grams={grams}
                                          bomId={item.id}
                                          onSave={handleUpdateGrams}
                                        />
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="text-right py-1 px-1 sm:px-2 font-mono">{(item.quantity_needed || 0).toLocaleString("es-CO", { maximumFractionDigits: 3 })}</td>
                                      <td className="py-1 pl-1 sm:pl-2 font-mono text-purple-200 uppercase">{item.unit_name}</td>
                                    </>
                                  )}
                                  <td className="py-1 pl-1 sm:pl-2 text-right">
                                    <button
                                      onClick={() => handleDeleteMaterial(item.id)}
                                      className="text-purple-200 hover:text-red-300 transition-colors p-0.5 -m-0.5"
                                      title="Eliminar ingrediente"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                            {inlineRow && (
                              <tr className="border-b border-white/10 bg-white/5">
                                <td className="py-1 pr-1 sm:pr-2">
                                  <Popover open={inlineMaterialComboOpen} onOpenChange={setInlineMaterialComboOpen}>
                                    <PopoverTrigger asChild>
                                      <button
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full text-left text-white bg-white/10 hover:bg-white/20 rounded px-2 py-1 text-[10px] sm:text-xs truncate border border-white/20"
                                      >
                                        {inlineRow.material_id
                                          ? materials.find((m) => m.id === inlineRow.material_id)?.name || "..."
                                          : "Buscar material..."}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 p-0" align="start">
                                      <Command>
                                        <CommandInput placeholder="Buscar material..." />
                                        <CommandList>
                                          <CommandEmpty>No se encontró ningún material.</CommandEmpty>
                                          <CommandGroup>
                                            {materials.filter(m => m.is_active).map((material) => (
                                              <CommandItem
                                                key={material.id}
                                                value={material.name}
                                                onSelect={() => {
                                                  setInlineRow((prev) => prev ? { ...prev, material_id: material.id } : prev)
                                                  setInlineMaterialComboOpen(false)
                                                }}
                                              >
                                                <Check
                                                  className={cn(
                                                    "mr-2 h-4 w-4",
                                                    inlineRow.material_id === material.id ? "opacity-100" : "opacity-0"
                                                  )}
                                                />
                                                {material.name}
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                </td>
                                <td className="py-1 px-1 sm:px-2">
                                  <select
                                    value={inlineRow.operation_id}
                                    onChange={(e) => setInlineRow((prev) => prev ? { ...prev, operation_id: e.target.value } : prev)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-white/10 hover:bg-white/20 text-white text-[9px] sm:text-xs rounded px-1 py-0.5 border border-white/20 focus:outline-none focus:ring-1 focus:ring-white/50 max-w-[120px] truncate"
                                  >
                                    {routes.map((route) => (
                                      <option key={route.id} value={route.operation?.id || ""} className="text-gray-900">
                                        {route.operation?.name || route.work_center?.name || "—"}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                {isByGrams ? (
                                  <>
                                    <td className="text-right py-1 px-1 sm:px-2 font-mono text-purple-200">—</td>
                                    <td className="hidden sm:table-cell text-right py-1 px-2 font-mono text-purple-200">× {loteValue.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                                    <td className="text-right py-1 pl-1 sm:pl-2 font-mono">
                                      <input
                                        type="number"
                                        step="any"
                                        autoFocus
                                        value={inlineRow.grams}
                                        onChange={(e) => setInlineRow((prev) => prev ? { ...prev, grams: e.target.value } : prev)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") { e.preventDefault(); handleSaveInlineRow() }
                                          if (e.key === "Escape") handleCancelInlineAdd()
                                        }}
                                        placeholder="Gramos"
                                        className="w-24 h-6 px-1 text-right text-[10px] sm:text-xs font-mono bg-white/90 text-gray-900 border border-white/40 rounded focus:outline-none focus:ring-1 focus:ring-white"
                                      />
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="text-right py-1 px-1 sm:px-2 font-mono">
                                      <input
                                        type="number"
                                        step="any"
                                        autoFocus
                                        value={inlineRow.quantity}
                                        onChange={(e) => setInlineRow((prev) => prev ? { ...prev, quantity: e.target.value } : prev)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") { e.preventDefault(); handleSaveInlineRow() }
                                          if (e.key === "Escape") handleCancelInlineAdd()
                                        }}
                                        placeholder="Cantidad"
                                        className="w-20 h-6 px-1 text-right text-[10px] sm:text-xs font-mono bg-white/90 text-gray-900 border border-white/40 rounded focus:outline-none focus:ring-1 focus:ring-white"
                                      />
                                    </td>
                                    <td className="py-1 pl-1 sm:pl-2">
                                      <input
                                        type="text"
                                        value={inlineRow.unit_name}
                                        onChange={(e) => setInlineRow((prev) => prev ? { ...prev, unit_name: e.target.value } : prev)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") { e.preventDefault(); handleSaveInlineRow() }
                                          if (e.key === "Escape") handleCancelInlineAdd()
                                        }}
                                        placeholder="Unidad"
                                        className="w-16 h-6 px-1 text-[10px] sm:text-xs font-mono bg-white/90 text-gray-900 border border-white/40 rounded focus:outline-none focus:ring-1 focus:ring-white uppercase"
                                      />
                                    </td>
                                  </>
                                )}
                                <td className="py-1 pl-1 sm:pl-2">
                                  <div className="flex items-center gap-1 justify-end">
                                    <button
                                      onClick={handleSaveInlineRow}
                                      disabled={loading}
                                      className="text-green-300 hover:text-green-200 disabled:opacity-40 transition-colors p-0.5 -m-0.5"
                                      title="Guardar"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={handleCancelInlineAdd}
                                      className="text-purple-200 hover:text-white transition-colors p-0.5 -m-0.5"
                                      title="Cancelar"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                            {isByGrams && bomItems.length > 0 && (
                              <tr className="border-t border-white/30 font-bold">
                                <td className="py-1 pr-1 sm:pr-2">TOTAL</td>
                                <td className="py-1 px-1 sm:px-2"></td>
                                <td className="text-right py-1 px-1 sm:px-2 font-mono">{totalFraction.toFixed(3)}</td>
                                <td className="hidden sm:table-cell text-right py-1 px-2"></td>
                                <td className="text-right py-1 pl-1 sm:pl-2 font-mono">= {(totalFraction * loteValue).toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                                <td className="py-1 pl-1 sm:pl-2"></td>
                              </tr>
                            )}
                            {!inlineRow && (
                              <tr>
                                <td colSpan={footerSpan} className="pt-1.5">
                                  <button
                                    onClick={handleStartInlineAdd}
                                    disabled={routes.length === 0}
                                    className="w-full flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] sm:text-xs font-medium rounded px-2 py-1 border border-white/20 transition-colors"
                                    title={routes.length === 0 ? "Agrega primero una operación" : "Agregar material"}
                                  >
                                    <Plus className="w-3 h-3" />
                                    Agregar material
                                  </button>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                        {isByGrams && bomItems.length > 0 && (
                          <p className={cn(
                            "mt-1.5 text-[10px] font-medium",
                            Math.abs(totalFraction - 1) < 0.001 ? "text-green-300" : "text-yellow-300"
                          )}>
                            {Math.abs(totalFraction - 1) < 0.001
                              ? `✓ Verificado: fracciones suman ${totalFraction.toFixed(3)}`
                              : `⚠ Atención: fracciones suman ${totalFraction.toFixed(3)} (esperado: 1.000)`
                            }
                          </p>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* React Flow */}
      <div className="flex-1 border-2 border-slate-200 rounded-xl relative bg-slate-50 overflow-hidden shadow-inner">
        {routes.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.2}
            maxZoom={1.5}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true
            }}
          >
            <Background color="#cbd5e1" gap={20} />
            <Controls className="!bg-white !border-slate-200 !shadow-lg rounded-lg overflow-hidden" />
          </ReactFlow>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-6 p-6">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center shadow-inner">
              <Workflow className="w-10 h-10 text-slate-300" />
            </div>
            <div className="text-center max-w-sm">
              <h3 className="text-slate-600 text-lg font-bold mb-2">Proceso vacío</h3>
              <p className="text-sm">Inicia configurando la primera operación de producción para este producto.</p>
            </div>
            <Button
              onClick={() => {
                setOperationForm({ operation_id: "", work_center_id: "", insertPosition: null, insertMode: "end" })
                setShowAddOperationDialog(true)
              }}
              className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/20 active:scale-95 transition-all h-12 px-8 rounded-full font-bold"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Configurar Proceso
            </Button>
          </div>
        )}
      </div>

      {/* Dialog para agregar operación */}
      <Dialog open={showAddOperationDialog} onOpenChange={setShowAddOperationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {operationForm.insertMode === "before"
                ? "Insertar Operación Antes"
                : operationForm.insertMode === "after"
                  ? "Insertar Operación Después"
                  : "Agregar Operación"}
            </DialogTitle>
            <DialogDescription>
              Selecciona la operación del proceso de producción
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Operación *</Label>
              <Select
                value={operationForm.operation_id}
                onValueChange={(value) => setOperationForm(prev => ({ ...prev, operation_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una operación" />
                </SelectTrigger>
                <SelectContent>
                  {getActiveOperations().map((operation) => (
                    <SelectItem key={operation.id} value={operation.id}>
                      {operation.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {operationForm.insertPosition !== null && (
                <p className="text-xs text-blue-600 font-medium">
                  Se insertará {operationForm.insertMode === "before" ? "antes" : "después"} de la operación {operationForm.insertPosition}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddOperationDialog(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddOperation} disabled={loading}>
              {loading ? "Agregando..." : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para agregar material */}
      <Dialog open={showMaterialDialog} onOpenChange={setShowMaterialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Material</DialogTitle>
            <DialogDescription>
              Agrega un material a esta operación
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Material *</Label>
              <Popover open={materialComboOpen} onOpenChange={setMaterialComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={materialComboOpen}
                    className="w-full justify-between font-normal"
                  >
                    {materialForm.material_id
                      ? materials.find((m) => m.id === materialForm.material_id)?.name
                      : "Buscar material..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar material..." />
                    <CommandList>
                      <CommandEmpty>No se encontró ningún material.</CommandEmpty>
                      <CommandGroup>
                        {materials.filter(m => m.is_active).map((material) => (
                          <CommandItem
                            key={material.id}
                            value={material.name}
                            onSelect={() => {
                              setMaterialForm(prev => ({ ...prev, material_id: material.id }))
                              setMaterialComboOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                materialForm.material_id === material.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {material.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Operación *</Label>
              <Select
                value={materialForm.operation_id}
                onValueChange={(value) => setMaterialForm(prev => ({ ...prev, operation_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una operación" />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((route) => (
                    <SelectItem
                      key={route.id}
                      value={route.operation?.id || ""}
                    >
                      {route.operation?.name || route.work_center?.name || "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cantidad *</Label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="10.5"
                  value={materialForm.quantity_needed}
                  onChange={(e) => setMaterialForm(prev => ({ ...prev, quantity_needed: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Unidad *</Label>
                <Input
                  placeholder="ej: GR, KG, Bulto"
                  value={materialForm.unit_name}
                  onChange={(e) => setMaterialForm(prev => ({ ...prev, unit_name: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Equivalencia en gramos *</Label>
              <Input
                type="number"
                step="0.001"
                placeholder="1000"
                value={materialForm.unit_equivalence_grams}
                onChange={(e) => setMaterialForm(prev => ({ ...prev, unit_equivalence_grams: e.target.value }))}
              />
              <p className="text-xs text-gray-500">
                Cuántos gramos equivale 1 {materialForm.unit_name || "unidad"}
              </p>
            </div>

            {/* Campo tiempo de reposo - solo para PP */}
            {materialForm.material_id && materials.find(m => m.id === materialForm.material_id)?.category === 'PP' && (
              <div className="space-y-2 bg-amber-50 p-3 rounded-lg border border-amber-200">
                <Label className="flex items-center gap-2 text-amber-800">
                  <Clock className="w-4 h-4" />
                  Tiempo de reposo (horas)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={materialForm.tiempo_reposo_horas}
                  onChange={(e) => setMaterialForm(prev => ({ ...prev, tiempo_reposo_horas: e.target.value }))}
                  className="border-amber-300"
                />
                <p className="text-xs text-amber-700">
                  Tiempo de reposo para este producto en proceso (por defecto: 0 horas)
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMaterialDialog(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveMaterial} disabled={loading}>
              {loading ? "Guardando..." : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para configurar productividad */}
      <Dialog open={showProductivityDialog} onOpenChange={setShowProductivityDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Calculadora de Productividad</DialogTitle>
            <DialogDescription>
              {product?.is_recipe_by_grams
                ? "Calcula la productividad en gramos por hora basado en el total de la receta"
                : "Calcula la productividad en unidades por hora"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Información del total */}
            {product?.is_recipe_by_grams && productivityForm.calculator_total_grams > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Box className="w-5 h-5 text-blue-600" />
                  <Label className="text-blue-900 font-semibold">Total de la Receta</Label>
                </div>
                <p className="text-2xl font-bold text-blue-700">
                  {productivityForm.calculator_total_grams.toLocaleString('es-CO', { maximumFractionDigits: 2 })} gramos
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Suma de todos los ingredientes configurados en el BOM
                </p>
              </div>
            )}

            {/* Calculadora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tiempo (horas) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="1"
                  value={productivityForm.calculator_hours}
                  onChange={(e) => {
                    const newHours = e.target.value
                    setProductivityForm(prev => {
                      const hours = parseFloat(newHours) || 0
                      const quantity = parseFloat(prev.calculator_quantity) || 0
                      let calculatedValue = 0

                      if (product?.is_recipe_by_grams) {
                        // Para gramos: (cantidad de lotes * gramos por lote) / horas
                        calculatedValue = hours > 0 ? (quantity * prev.calculator_total_grams) / hours : 0
                      } else {
                        // Para unidades: cantidad / horas
                        calculatedValue = hours > 0 ? quantity / hours : 0
                      }

                      return {
                        ...prev,
                        calculator_hours: newHours,
                        units_per_hour: calculatedValue > 0 ? calculatedValue.toFixed(2) : ""
                      }
                    })
                  }}
                  className="text-lg font-semibold"
                />
                <p className="text-xs text-gray-500">
                  ¿En cuántas horas?
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  {product?.is_recipe_by_grams ? "Cantidad de lotes" : "Cantidad de unidades"} *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={product?.is_recipe_by_grams ? "2" : "100"}
                  value={productivityForm.calculator_quantity}
                  onChange={(e) => {
                    const newQuantity = e.target.value
                    setProductivityForm(prev => {
                      const hours = parseFloat(prev.calculator_hours) || 0
                      const quantity = parseFloat(newQuantity) || 0
                      let calculatedValue = 0

                      if (product?.is_recipe_by_grams) {
                        // Para gramos: (cantidad de lotes * gramos por lote) / horas
                        calculatedValue = hours > 0 ? (quantity * prev.calculator_total_grams) / hours : 0
                      } else {
                        // Para unidades: cantidad / horas
                        calculatedValue = hours > 0 ? quantity / hours : 0
                      }

                      return {
                        ...prev,
                        calculator_quantity: newQuantity,
                        units_per_hour: calculatedValue > 0 ? calculatedValue.toFixed(2) : ""
                      }
                    })
                  }}
                  className="text-lg font-semibold"
                />
                <p className="text-xs text-gray-500">
                  {product?.is_recipe_by_grams
                    ? "¿Cuántos lotes completos se hacen?"
                    : "¿Cuántas unidades se producen?"
                  }
                </p>
              </div>
            </div>

            {/* Resultado */}
            {productivityForm.units_per_hour && parseFloat(productivityForm.units_per_hour) > 0 && (
              <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  <Label className="text-green-900 font-semibold">Productividad Calculada</Label>
                </div>
                <p className="text-3xl font-bold text-green-700">
                  {parseFloat(productivityForm.units_per_hour).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                  {product?.is_recipe_by_grams ? " gramos" : " unidades"} / hora
                </p>
                <p className="text-sm text-green-600 mt-2">
                  {product?.is_recipe_by_grams
                    ? `Esto significa que cada hora se producen ${parseFloat(productivityForm.units_per_hour).toLocaleString('es-CO', { maximumFractionDigits: 2 })} gramos`
                    : `Esto significa que cada hora se producen ${parseFloat(productivityForm.units_per_hour).toLocaleString('es-CO', { maximumFractionDigits: 2 })} unidades`
                  }
                </p>
              </div>
            )}

            {/* Modo manual (opcional) */}
            <div className="border-t pt-4">
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 select-none">
                  ⚙️ Modo manual (avanzado)
                </summary>
                <div className="mt-4 space-y-2">
                  <Label>
                    {product?.is_recipe_by_grams ? "Gramos por hora" : "Unidades por hora"} *
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={product?.is_recipe_by_grams ? "5000" : "100"}
                    value={productivityForm.units_per_hour}
                    onChange={(e) => setProductivityForm(prev => ({ ...prev, units_per_hour: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500">
                    Ingresa directamente el valor si prefieres no usar la calculadora
                  </p>
                </div>
              </details>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowProductivityDialog(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveProductivity} disabled={loading}>
              {loading ? "Guardando..." : "Guardar Productividad"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
