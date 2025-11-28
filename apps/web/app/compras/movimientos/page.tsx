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
  User
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

  if (loading && movements.length === 0) {
    return (
      <RouteGuard>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
              <p className="text-gray-600">Cargando movimientos...</p>
            </div>
          </div>
        </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 md:p-8">
          <div className="container mx-auto">
            <div className="mb-4">
              <h1 className="text-2xl md:text-4xl font-bold flex items-center gap-3">
                <TrendingUp className="h-8 w-8 md:h-10 md:w-10" />
                Movimientos de Inventario
              </h1>
              <p className="text-blue-100 mt-2 text-sm md:text-base">
                Historial completo de entradas, salidas, ajustes y traslados
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white/10 backdrop-blur rounded-xl p-3">
                <p className="text-blue-100 text-xs">Total Movimientos</p>
                <p className="text-white text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-3">
                <p className="text-blue-100 text-xs">Recepciones</p>
                <p className="text-white text-2xl font-bold">{stats.recepciones}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-3">
                <p className="text-blue-100 text-xs">Consumos</p>
                <p className="text-white text-2xl font-bold">{stats.consumos}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-3">
                <p className="text-blue-100 text-xs">Ajustes</p>
                <p className="text-white text-2xl font-bold">{stats.ajustes}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-3">
                <p className="text-blue-100 text-xs">Devoluciones</p>
                <p className="text-white text-2xl font-bold">{stats.devoluciones}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full md:w-auto grid-cols-2 md:grid-cols-3">
              <TabsTrigger value="todos">Todos los Movimientos</TabsTrigger>
              <TabsTrigger value="por-producto">Por Producto</TabsTrigger>
            </TabsList>

            {/* Todos los Movimientos */}
            <TabsContent value="todos" className="space-y-4">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Filtros
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">Tipo de Movimiento</label>
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger>
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
                </CardContent>
              </Card>

              {/* Movements List */}
              <div className="space-y-3">
                {movements.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        No hay movimientos registrados
                      </h3>
                      <p className="text-gray-500">
                        Los movimientos de inventario aparecerán aquí
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  movements.map((movement) => (
                    <Card key={movement.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge className={getMovementTypeColor(movement.movement_type)}>
                                {getMovementTypeLabel(movement.movement_type)}
                              </Badge>
                              {movement.quantity_change > 0 ? (
                                <ArrowUpCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <ArrowDownCircle className="h-5 w-5 text-red-600" />
                              )}
                            </div>
                            <h3 className="font-semibold text-lg mb-1">
                              {movement.material?.name || 'Material desconocido'}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              {movement.notes}
                            </p>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(movement.movement_date).toLocaleString('es-CO')}
                              </div>
                              {movement.recorded_by_user && (
                                <div className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  {movement.recorded_by_user.name}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${
                              movement.quantity_change > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {movement.quantity_change > 0 ? '+' : ''}
                              {movement.quantity_change.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {movement.unit_of_measure || 'kg'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Por Producto */}
            <TabsContent value="por-producto" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Materials List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Materias Primas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {materials.map((material) => (
                        <Button
                          key={material.id}
                          variant={selectedMaterial === material.id ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => handleMaterialSelect(material.id)}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          {material.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Movements for selected material */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {selectedMaterial === 'all'
                        ? 'Selecciona un producto'
                        : `Movimientos de ${materials.find(m => m.id === selectedMaterial)?.name}`
                      }
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedMaterial === 'all' ? (
                      <div className="text-center py-8">
                        <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-600">
                          Selecciona una materia prima para ver sus movimientos
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {filteredMovementsByMaterial.length === 0 ? (
                          <div className="text-center py-8">
                            <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                            <p className="text-gray-600">
                              No hay movimientos para este producto
                            </p>
                          </div>
                        ) : (
                          filteredMovementsByMaterial.map((movement) => (
                            <div key={movement.id} className="border rounded-lg p-3 hover:bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <Badge className={getMovementTypeColor(movement.movement_type)}>
                                  {getMovementTypeLabel(movement.movement_type)}
                                </Badge>
                                <span className={`text-lg font-bold ${
                                  movement.quantity_change > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {movement.quantity_change > 0 ? '+' : ''}
                                  {movement.quantity_change.toFixed(2)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {movement.notes}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(movement.movement_date).toLocaleString('es-CO')}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </RouteGuard>
  )
}
