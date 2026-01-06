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
import { Plus, Trash2, X, Clock, Box, Workflow } from "lucide-react"
import { useProductionRoutes } from "@/hooks/use-production-routes"
import { useMaterials } from "@/hooks/use-materials"
import { useOperations } from "@/hooks/use-operations"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { useProductivity } from "@/hooks/use-productivity"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

interface BOMItem {
  id: string
  product_id: string
  material_id: string
  operation_id: string | null
  quantity_needed: number
  unit_name: string
  unit_equivalence_grams: number
  material?: {
    id: string
    name: string
    base_unit: string
  } | null
}

interface Props {
  productId: string
  productName: string
  productWeight: string | null
  onClose: () => void
}

// Nodo personalizado para operación
function OperationNode({ data }: any) {
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

      <div className="bg-white rounded-lg border-2 border-gray-200 shadow-md p-3 sm:p-4 min-w-[240px] sm:min-w-[280px] max-w-[90vw]">
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
            <div
              key={material.id}
              className="flex items-start justify-between p-2 bg-slate-50 rounded-md border border-slate-100 text-[11px] sm:text-xs"
            >
              <div className="flex-1 min-w-0 mr-2">
                <div className="font-semibold text-blue-700 truncate">
                  {material.name}
                </div>
                <div className="text-gray-600 mt-0.5 font-medium">
                  {material.quantity} <span className="uppercase opacity-70">{material.unit}</span>
                </div>
              </div>
              <button
                onClick={() => data.onDeleteMaterial(material.bomId)}
                className="text-gray-400 hover:text-red-600 p-1 -m-1 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

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
              ? `${data.productivity.units_per_hour} u/h`
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

const nodeTypes = {
  operation: OperationNode,
}

export function ProductBOMFlow({ productId, productName, productWeight, onClose }: Props) {
  const { fetchRoutesByProduct, createRoute, deleteRoute } = useProductionRoutes()
  const { materials } = useMaterials()
  const { operations, getActiveOperations } = useOperations()
  const { workCenters } = useWorkCenters()
  const { getProductivityByProductAndOperation, upsertProductivity } = useProductivity()
  const [routes, setRoutes] = useState<any[]>([])
  const [bomItems, setBomItems] = useState<BOMItem[]>([])
  const [productivities, setProductivities] = useState<Record<string, any>>({})
  const [showMaterialDialog, setShowMaterialDialog] = useState(false)
  const [showAddOperationDialog, setShowAddOperationDialog] = useState(false)
  const [showProductivityDialog, setShowProductivityDialog] = useState(false)
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const [materialForm, setMaterialForm] = useState({
    material_id: "",
    quantity_needed: "",
    unit_name: "",
    unit_equivalence_grams: ""
  })

  const [operationForm, setOperationForm] = useState({
    operation_id: "",
    work_center_id: "",
    insertPosition: null as number | null, // null = al final, número = insertar en esa posición
    insertMode: "after" as "before" | "after" | "end"
  })

  const [productivityForm, setProductivityForm] = useState({
    operation_id: "",
    units_per_hour: ""
  })

  useEffect(() => {
    loadProductRoutes()
    loadBOMItems()
  }, [productId])

  // Actualizar nodos cuando cambien las rutas o los materiales
  useEffect(() => {
    if (routes.length > 0) {
      updateFlowNodes()
    }
  }, [routes, bomItems, productivities])

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
        .select("*")
        .in("id", materialIds)

      if (materialsError) throw materialsError

      const combined = bomData.map(bomItem => ({
        ...bomItem,
        material: materialsData?.find((m: any) => m.id === bomItem.material_id) || null
      }))

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

      const materials = operationMaterials.map(bomItem => ({
        id: bomItem.id,
        bomId: bomItem.id,
        code: bomItem.material?.name?.substring(0, 10) || 'MAT',
        name: bomItem.material?.name || 'Material',
        quantity: bomItem.quantity_needed.toLocaleString(),
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
          materials,
          productivity: productivities[route.operation?.id],
          onAddMaterial: handleAddMaterial,
          onDeleteMaterial: handleDeleteMaterial,
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

  const handleAddMaterial = (operationId: string) => {
    setSelectedOperation(operationId)
    setMaterialForm({
      material_id: "",
      quantity_needed: "",
      unit_name: "",
      unit_equivalence_grams: ""
    })
    setShowMaterialDialog(true)
  }

  const handleSaveMaterial = async () => {
    if (!materialForm.material_id || !materialForm.quantity_needed || !materialForm.unit_name || !materialForm.unit_equivalence_grams) {
      toast.error("Completa todos los campos")
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .insert({
          product_id: productId,
          operation_id: selectedOperation,
          material_id: materialForm.material_id,
          quantity_needed: parseFloat(materialForm.quantity_needed),
          unit_name: materialForm.unit_name,
          unit_equivalence_grams: parseFloat(materialForm.unit_equivalence_grams),
          is_active: true
        })

      if (error) throw error

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
      const { error } = await supabase
        .schema("produccion")
        .from("bill_of_materials")
        .delete()
        .eq("id", bomId)

      if (error) throw error

      toast.success("Material eliminado")
      await loadBOMItems() // Recargar
    } catch (error) {
      console.error("Error deleting material:", error)
      toast.error("Error al eliminar material")
    }
  }

  const handleConfigureProductivity = (operationId: string) => {
    const existingProductivity = productivities[operationId]
    setProductivityForm({
      operation_id: operationId,
      units_per_hour: existingProductivity?.units_per_hour?.toString() || ""
    })
    setShowProductivityDialog(true)
  }

  const handleSaveProductivity = async () => {
    if (!productivityForm.units_per_hour || parseFloat(productivityForm.units_per_hour) <= 0) {
      toast.error("Ingresa un valor válido de unidades por hora")
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
    <div className="h-[calc(100vh-200px)] flex flex-col">
      {/* Header compacto y responsive */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-3 sm:px-4 sm:py-3 mb-3 sm:mb-4 rounded-xl shadow-lg border border-purple-500/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
            <div className="shrink-0 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white text-base font-bold shadow-inner">
              <Box className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-bold text-sm sm:text-lg truncate leading-tight">
                {productName}{productWeight ? ` - ${productWeight}` : ''}
              </h2>
              <p className="text-purple-100 text-[10px] sm:text-xs font-medium opacity-90 truncate">
                {routes.length} {routes.length === 1 ? 'operación configurada' : 'operaciones configuradas'}
              </p>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none h-9 sm:h-10 bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40 backdrop-blur-sm transition-all font-semibold"
            >
              <X className="w-4 h-4 mr-2" />
              Cerrar
            </Button>
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
              <Select
                value={materialForm.material_id}
                onValueChange={(value) => setMaterialForm(prev => ({ ...prev, material_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.filter(m => m.is_active).map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.name}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Productividad</DialogTitle>
            <DialogDescription>
              Define las unidades por hora para esta operación
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Unidades por hora *</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder="100"
                value={productivityForm.units_per_hour}
                onChange={(e) => setProductivityForm(prev => ({ ...prev, units_per_hour: e.target.value }))}
              />
              <p className="text-xs text-gray-500">
                Cantidad de unidades que se pueden producir en una hora en esta operación
              </p>
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
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
