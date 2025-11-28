"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  Package,
  Filter,
  Calendar,
  User,
  ShoppingCart,
  Minus,
  RotateCcw,
  Activity
} from "lucide-react"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { useInventoryMovements, MOVEMENT_TYPE_FILTERS } from "@/hooks/use-inventory-movements"

interface Material {
  id: string
  name: string
  category: string
}

export default function MovimientosPage() {
  const {
    movements,
    loading,
    refetch,
    getMovementsByMaterial,
    getMovementTypeLabel,
    getMovementTypeColor
  } = useInventoryMovements()

  const [materials, setMaterials] = useState<Material[]>([])
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<string>('todos')

  useEffect(() => {
    loadMaterials()
  }, [])

  useEffect(() => {
    if (activeTab === 'todos') {
      refetch(typeFilter !== 'all' ? typeFilter : undefined)
    }
  }, [typeFilter, activeTab])

  const loadMaterials = async () => {
    const materialsData = await getMovementsByMaterial()
    setMaterials(materialsData)
  }

  const handleMaterialSelect = (materialId: string) => {
    setSelectedMaterial(materialId)
    setActiveTab('por-producto')
  }

  // Filter movements by selected material for the "por-producto" tab
  const filteredMovementsByMaterial = selectedMaterial !== 'all'
    ? movements.filter(m => m.material_id === selectedMaterial)
    : []

  // Get stats for all movements
  const stats = {
    total: movements.length,
    recepciones: movements.filter(m => m.movement_type === 'reception').length,
    consumos: movements.filter(m => m.movement_type === 'consumption').length,
    ajustes: movements.filter(m => m.movement_type === 'adjustment').length,
    devoluciones: movements.filter(m => m.movement_type === 'return').length,
  }

  // Get icon for movement type
  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'reception':
        return ShoppingCart
      case 'consumption':
        return Minus
      case 'adjustment':
        return Activity
      case 'return':
        return RotateCcw
      default:
        return Package
    }
  }

  if (loading && movements.length === 0) {
    return (
      <RouteGuard>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
              <p className="text-gray-600 dark:text-gray-400">Cargando movimientos...</p>
            </div>
          </div>
        </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Title Section */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-purple-500/15 backdrop-blur-md border border-purple-500/20 rounded-xl p-3">
                  <TrendingUp className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Movimientos de Inventario
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Historial completo de entradas, salidas, ajustes y traslados
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {/* Total Movimientos */}
              <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="bg-gray-500/15 backdrop-blur-md border border-gray-500/20 rounded-xl p-2">
                    <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>

              {/* Recepciones */}
              <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="bg-green-500/15 backdrop-blur-md border border-green-500/20 rounded-xl p-2">
                    <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-500" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Recepciones</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.recepciones}</p>
              </div>

              {/* Consumos */}
              <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="bg-red-500/15 backdrop-blur-md border border-red-500/20 rounded-xl p-2">
                    <Minus className="w-5 h-5 text-red-600 dark:text-red-500" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Consumos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.consumos}</p>
              </div>

              {/* Ajustes */}
              <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="bg-blue-500/15 backdrop-blur-md border border-blue-500/20 rounded-xl p-2">
                    <Activity className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ajustes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.ajustes}</p>
              </div>

              {/* Devoluciones */}
              <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="bg-orange-500/15 backdrop-blur-md border border-orange-500/20 rounded-xl p-2">
                    <RotateCcw className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Devoluciones</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.devoluciones}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 md:px-8 pb-8">
          <div className="max-w-7xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 p-1">
                <TabsList className="grid w-full grid-cols-2 bg-transparent">
                  <TabsTrigger
                    value="todos"
                    className="data-[state=active]:bg-white/70 data-[state=active]:dark:bg-white/10 data-[state=active]:shadow-md"
                  >
                    Todos los Movimientos
                  </TabsTrigger>
                  <TabsTrigger
                    value="por-producto"
                    className="data-[state=active]:bg-white/70 data-[state=active]:dark:bg-white/10 data-[state=active]:shadow-md"
                  >
                    Por Producto
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Todos los Movimientos */}
              <TabsContent value="todos" className="space-y-6 mt-0">
                {/* Filters */}
                <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5">
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="bg-indigo-500/15 backdrop-blur-md border border-indigo-500/20 rounded-xl p-2">
                        <Filter className="h-5 w-5 text-indigo-600 dark:text-indigo-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filtros</h3>
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                        Tipo de Movimiento
                      </label>
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="bg-white/50 dark:bg-black/30 backdrop-blur-md border-white/20 dark:border-white/10">
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {MOVEMENT_TYPE_FILTERS.map((filter) => (
                            <SelectItem key={filter.value} value={filter.value}>
                              {filter.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Movements List */}
                <div className="space-y-4">
                  {movements.length === 0 ? (
                    <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 p-8">
                      <div className="text-center">
                        <div className="bg-gray-500/10 backdrop-blur-md border border-gray-500/20 rounded-2xl p-6 w-fit mx-auto mb-4">
                          <Package className="h-16 w-16 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          No hay movimientos registrados
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          Los movimientos de inventario aparecerán aquí
                        </p>
                      </div>
                    </div>
                  ) : (
                    movements.map((movement) => {
                      const MovementIcon = getMovementIcon(movement.movement_type)
                      const isPositive = movement.quantity_change > 0

                      return (
                        <div
                          key={movement.id}
                          className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10 transition-all duration-200"
                        >
                          <div className="p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className={`
                                    ${movement.movement_type === 'reception' ? 'bg-green-500/15 border-green-500/20' : ''}
                                    ${movement.movement_type === 'consumption' ? 'bg-red-500/15 border-red-500/20' : ''}
                                    ${movement.movement_type === 'adjustment' ? 'bg-blue-500/15 border-blue-500/20' : ''}
                                    ${movement.movement_type === 'return' ? 'bg-orange-500/15 border-orange-500/20' : ''}
                                    backdrop-blur-md border rounded-xl p-2
                                  `}>
                                    <MovementIcon className={`
                                      w-5 h-5
                                      ${movement.movement_type === 'reception' ? 'text-green-600 dark:text-green-500' : ''}
                                      ${movement.movement_type === 'consumption' ? 'text-red-600 dark:text-red-500' : ''}
                                      ${movement.movement_type === 'adjustment' ? 'text-blue-600 dark:text-blue-500' : ''}
                                      ${movement.movement_type === 'return' ? 'text-orange-600 dark:text-orange-500' : ''}
                                    `} />
                                  </div>
                                  <Badge className={getMovementTypeColor(movement.movement_type)}>
                                    {getMovementTypeLabel(movement.movement_type)}
                                  </Badge>
                                  {isPositive ? (
                                    <ArrowUpCircle className="h-5 w-5 text-green-600 dark:text-green-500" />
                                  ) : (
                                    <ArrowDownCircle className="h-5 w-5 text-red-600 dark:text-red-500" />
                                  )}
                                </div>
                                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                                  {movement.material?.name || 'Material desconocido'}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                  {movement.notes}
                                </p>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4" />
                                    {new Date(movement.movement_date).toLocaleString('es-CO')}
                                  </div>
                                  {movement.recorded_by_user && (
                                    <div className="flex items-center gap-1.5">
                                      <User className="h-4 w-4" />
                                      {movement.recorded_by_user.name}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right md:ml-6">
                                <p className={`text-3xl font-bold ${
                                  isPositive ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                                }`}>
                                  {isPositive ? '+' : ''}
                                  {movement.quantity_change.toFixed(2)}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {movement.unit_of_measure || 'kg'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </TabsContent>

              {/* Por Producto */}
              <TabsContent value="por-producto" className="space-y-6 mt-0">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Materials List */}
                  <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5">
                    <div className="p-6 border-b border-white/20 dark:border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="bg-teal-500/15 backdrop-blur-md border border-teal-500/20 rounded-xl p-2">
                          <Package className="h-5 w-5 text-teal-600 dark:text-teal-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Materias Primas
                        </h3>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {materials.map((material) => (
                          <Button
                            key={material.id}
                            variant={selectedMaterial === material.id ? "default" : "outline"}
                            className={`
                              w-full justify-start transition-all duration-200
                              ${selectedMaterial === material.id
                                ? 'bg-teal-500 hover:bg-teal-600 text-white shadow-md'
                                : 'bg-white/50 dark:bg-black/30 backdrop-blur-md border-white/20 dark:border-white/10 hover:bg-white/70 dark:hover:bg-black/40'
                              }
                            `}
                            onClick={() => handleMaterialSelect(material.id)}
                          >
                            <Package className="h-4 w-4 mr-2" />
                            {material.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Movements for selected material */}
                  <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5">
                    <div className="p-6 border-b border-white/20 dark:border-white/10">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedMaterial === 'all'
                          ? 'Selecciona un producto'
                          : `Movimientos de ${materials.find(m => m.id === selectedMaterial)?.name}`
                        }
                      </h3>
                    </div>
                    <div className="p-6">
                      {selectedMaterial === 'all' ? (
                        <div className="text-center py-12">
                          <div className="bg-gray-500/10 backdrop-blur-md border border-gray-500/20 rounded-2xl p-6 w-fit mx-auto mb-4">
                            <Package className="h-16 w-16 text-gray-400 dark:text-gray-500" />
                          </div>
                          <p className="text-gray-600 dark:text-gray-400">
                            Selecciona una materia prima para ver sus movimientos
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                          {filteredMovementsByMaterial.length === 0 ? (
                            <div className="text-center py-12">
                              <div className="bg-gray-500/10 backdrop-blur-md border border-gray-500/20 rounded-2xl p-6 w-fit mx-auto mb-4">
                                <Package className="h-16 w-16 text-gray-400 dark:text-gray-500" />
                              </div>
                              <p className="text-gray-600 dark:text-gray-400">
                                No hay movimientos para este producto
                              </p>
                            </div>
                          ) : (
                            filteredMovementsByMaterial.map((movement) => {
                              const MovementIcon = getMovementIcon(movement.movement_type)
                              const isPositive = movement.quantity_change > 0

                              return (
                                <div
                                  key={movement.id}
                                  className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-xl p-4 hover:bg-white/70 dark:hover:bg-black/40 transition-all duration-200"
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <div className={`
                                        ${movement.movement_type === 'reception' ? 'bg-green-500/15 border-green-500/20' : ''}
                                        ${movement.movement_type === 'consumption' ? 'bg-red-500/15 border-red-500/20' : ''}
                                        ${movement.movement_type === 'adjustment' ? 'bg-blue-500/15 border-blue-500/20' : ''}
                                        ${movement.movement_type === 'return' ? 'bg-orange-500/15 border-orange-500/20' : ''}
                                        backdrop-blur-md border rounded-lg p-1.5
                                      `}>
                                        <MovementIcon className={`
                                          w-4 h-4
                                          ${movement.movement_type === 'reception' ? 'text-green-600 dark:text-green-500' : ''}
                                          ${movement.movement_type === 'consumption' ? 'text-red-600 dark:text-red-500' : ''}
                                          ${movement.movement_type === 'adjustment' ? 'text-blue-600 dark:text-blue-500' : ''}
                                          ${movement.movement_type === 'return' ? 'text-orange-600 dark:text-orange-500' : ''}
                                        `} />
                                      </div>
                                      <Badge className={getMovementTypeColor(movement.movement_type)}>
                                        {getMovementTypeLabel(movement.movement_type)}
                                      </Badge>
                                    </div>
                                    <span className={`text-xl font-bold ${
                                      isPositive ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                                    }`}>
                                      {isPositive ? '+' : ''}
                                      {movement.quantity_change.toFixed(2)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    {movement.notes}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {new Date(movement.movement_date).toLocaleString('es-CO')}
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </RouteGuard>
  )
}
