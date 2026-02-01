"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Calculator, Package, History, CheckCircle2, Clock, AlertTriangle, Trophy, Settings, MapPin, ArrowLeft } from "lucide-react"
import { useInventories } from '@/hooks/use-inventories'
import { useInventoryCounts } from '@/hooks/use-inventory-counts'
import { RouteGuard } from "@/components/auth/RouteGuard"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function InventoryPage() {
  const router = useRouter()
  const { hasPermission } = useAuth()
  const { inventories, loading, createInventory, generateInventoryName, updateInventory } = useInventories()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [generatedName, setGeneratedName] = useState('')
  const [isGeneratingName, setIsGeneratingName] = useState(false)
  const [isConfirmFinishOpen, setIsConfirmFinishOpen] = useState(false)
  const [inventoryToFinish, setInventoryToFinish] = useState<string | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const [locations, setLocations] = useState<any[]>([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [showProductionSubMenu, setShowProductionSubMenu] = useState(false)

  // Cargar locations disponibles para conteo (excluir warehouses raíz)
  useEffect(() => {
    const fetchLocations = async () => {
      setLoadingLocations(true)
      try {
        const { data, error } = await supabase
          .schema('inventario')
          .from('locations')
          .select('id, code, name, bin_type, path')
          .not('parent_id', 'is', null) // Excluir WH1 y WH3 (warehouses raíz)
          .eq('is_active', true)
          .order('path')

        if (error) throw error
        setLocations(data || [])
      } catch (error) {
        console.error('Error fetching locations:', error)
        toast.error('Error al cargar ubicaciones')
      } finally {
        setLoadingLocations(false)
      }
    }

    fetchLocations()
  }, [])

  const handleOpenCreateDialog = async () => {
    setIsCreateDialogOpen(true)
    setIsGeneratingName(true)
    setShowProductionSubMenu(false) // Reset sub-menu state
    setSelectedLocationId('') // Reset selection
    try {
      const name = await generateInventoryName()
      setGeneratedName(name)
    } catch (error) {
      // Error handled by hook
      setIsCreateDialogOpen(false)
    } finally {
      setIsGeneratingName(false)
    }
  }

  const handleCreateInventory = async () => {
    if (!selectedLocationId) {
      toast.error('Por favor selecciona una ubicación')
      return
    }

    try {
      // Encontrar la location seleccionada para agregar su nombre
      const selectedLocation = locations.find(loc => loc.id === selectedLocationId)
      const locationName = selectedLocation?.name || ''

      // Concatenar la ubicación al nombre
      const fullName = `${generatedName} - ${locationName}`

      await createInventory({
        name: fullName,
        description: null,
        status: 'draft',
        location_id: selectedLocationId,
        inventory_type: null // Deprecated, ahora usamos location_id
      })

      setGeneratedName('')
      setSelectedLocationId('')
      setIsCreateDialogOpen(false)
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleOpenFinishDialog = (inventoryId: string) => {
    setInventoryToFinish(inventoryId)
    setIsConfirmFinishOpen(true)
  }

  const handleFinishWithFirstCount = async () => {
    if (!inventoryToFinish) return

    try {
      // 1. Obtener los items del primer conteo
      const { data: countData, error: countError } = await supabase
        .from('inventory_counts')
        .select(`
          id,
          inventory_count_items (
            product_id,
            quantity_units,
            grams_per_unit,
            total_grams
          )
        `)
        .eq('inventory_id', inventoryToFinish)
        .eq('count_number', 1)
        .single()

      if (countError) throw countError

      // 2. Crear registros en inventory_final_results basados en el primer conteo
      // Solo si hay productos contados
      const countItems = countData.inventory_count_items || []

      if (countItems.length > 0) {
        // Nota: final_total_grams es una columna generada, no la incluimos
        const finalResults = countItems.map((item: any) => ({
          inventory_id: inventoryToFinish,
          product_id: item.product_id,
          final_quantity: item.quantity_units,
          final_grams_per_unit: item.grams_per_unit,
          resolution_method: 'accept_count1',
          variance_from_count1_percentage: 0,
          variance_from_count2_percentage: null,
          notes: 'Finalizado con primer conteo únicamente'
        }))

        const { error: insertError } = await supabase
          .from('inventory_final_results')
          .insert(finalResults)

        if (insertError) throw insertError
      }

      // 3. Actualizar el inventario a completado (incluso si no hay productos)
      await updateInventory(inventoryToFinish, {
        status: 'completed'
      })

      if (countItems.length === 0) {
        toast.success('Inventario finalizado. Revisa Ajustes para productos con inventario positivo.')
      } else {
        toast.success('Inventario finalizado exitosamente')
      }

      setIsConfirmFinishOpen(false)

      // 4. Redirigir según si hay productos o no
      if (countItems.length === 0) {
        // Si no hay productos contados, ir directo a ajustes
        router.push(`/inventory/adjustments/${inventoryToFinish}`)
      } else {
        // Si hay productos, mostrar resultados finales
        router.push(`/inventory/${inventoryToFinish}/final-results`)
      }
    } catch (error) {
      console.error('Error finishing inventory:', error)
      toast.error('Error al finalizar el inventario')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Borrador</Badge>
      case 'in_progress':
        return <Badge variant="default"><Calculator className="h-3 w-3 mr-1" />En Progreso</Badge>
      case 'completed':
        return <Badge variant="default" className="bg-purple-500"><Trophy className="h-3 w-3 mr-1" />Finalizado</Badge>
      case 'cancelled':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Cancelado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getInventorySummary = (inventory: any) => {
    const counts = inventory.inventory_counts || []
    const firstCount = counts.find((c: any) => c.count_number === 1)
    const secondCount = counts.find((c: any) => c.count_number === 2)

    const firstCountItems = firstCount?.inventory_count_items?.length || 0
    const secondCountItems = secondCount?.inventory_count_items?.length || 0

    return {
      // hasFirstCount should be true if count exists and is completed, regardless of item count
      hasFirstCount: !!firstCount && firstCount.status === 'completed',
      hasSecondCount: !!secondCount && secondCount.status === 'completed',
      firstCountItems,
      secondCountItems,
      totalProducts: Math.max(firstCountItems, secondCountItems)
    }
  }

  if (loading) {
    return (
      <RouteGuard>
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
            <p className="text-gray-600">Cargando inventarios...</p>
          </div>
        </div>
      </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard>
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-blue-600 text-white p-4 md:p-8">
        <div className="container mx-auto">
          {/* Top row: Back button + Title + Actions */}
          <div className="flex items-center gap-3 mb-4 md:mb-8">
            {/* Back Arrow */}
            <Link
              href="/dashboard"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </Link>

            {/* Title */}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-4xl font-bold flex items-center gap-2 md:gap-3">
                <Calculator className="h-6 w-6 md:h-10 md:w-10 text-blue-100" />
                CountPro
              </h1>
              <p className="text-blue-100 mt-0.5 md:mt-2 text-xs md:text-base truncate">
                Calculadora móvil para inventarios precisos
              </p>
            </div>

            {/* Actions - Desktop */}
            <div className="hidden sm:flex gap-2">
              {hasPermission('inventory_adjustment') && (
                <Link href="/inventory/adjustments">
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white/10 text-white border-white/30 hover:bg-white/20 h-12 px-6"
                  >
                    <Settings className="h-5 w-5 mr-2" />
                    Ajustes
                  </Button>
                </Link>
              )}

              <Button
                size="lg"
                className="bg-white text-blue-600 hover:bg-blue-50 h-12 px-6"
                onClick={handleOpenCreateDialog}
              >
                <Plus className="h-5 w-5 mr-2" />
                Nuevo
              </Button>
            </div>

            {/* Actions - Mobile (icon only) */}
            <div className="flex sm:hidden gap-2">
              {hasPermission('inventory_adjustment') && (
                <Link href="/inventory/adjustments">
                  <Button
                    size="icon"
                    variant="outline"
                    className="bg-white/10 text-white border-white/30 hover:bg-white/20 h-10 w-10"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </Link>
              )}

              <Button
                size="icon"
                className="bg-white text-blue-600 hover:bg-blue-50 h-10 w-10"
                onClick={handleOpenCreateDialog}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Inventario</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {isGeneratingName ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <Calculator className="h-12 w-12 mx-auto mb-4 text-blue-600 animate-pulse" />
                        <p className="text-gray-600">Generando nombre del inventario...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <Label className="text-sm text-gray-600 mb-2 block">Nombre del inventario:</Label>
                        <p className="text-lg font-semibold text-blue-900">{generatedName}</p>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Ubicación a Contar <span className="text-red-500">*</span>
                        </Label>
                        {loadingLocations ? (
                          <div className="text-center py-8">
                            <p className="text-sm text-gray-500">Cargando ubicaciones...</p>
                          </div>
                        ) : !showProductionSubMenu ? (
                          // Vista principal: 4 botones principales
                          <div className="space-y-2">
                            {(() => {
                              // Encontrar las ubicaciones principales por bin_type
                              const mainLocations = [
                                {
                                  id: 'receiving',
                                  name: 'Área de Recepción',
                                  icon: '📦',
                                  location: locations.find(l => l.bin_type === 'receiving')
                                },
                                {
                                  id: 'general',
                                  name: 'General PT',
                                  icon: '🏭',
                                  location: locations.find(l => l.bin_type === 'general')
                                },
                                {
                                  id: 'quarantine',
                                  name: 'Unidades Defectuosas',
                                  icon: '⚠️',
                                  location: locations.find(l => l.bin_type === 'quarantine')
                                },
                                {
                                  id: 'production',
                                  name: 'Producción',
                                  icon: '⚙️',
                                  isSubmenu: true
                                }
                              ]

                              return mainLocations.map((main) => {
                                const isSelected = main.location && selectedLocationId === main.location.id

                                return (
                                  <button
                                    key={main.id}
                                    type="button"
                                    onClick={() => {
                                      if (main.isSubmenu) {
                                        setShowProductionSubMenu(true)
                                      } else if (main.location) {
                                        setSelectedLocationId(main.location.id)
                                      }
                                    }}
                                    disabled={!main.isSubmenu && !main.location}
                                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                                      isSelected
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                                    } ${!main.isSubmenu && !main.location ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="text-2xl">{main.icon}</span>
                                      <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                                        {main.name}
                                      </span>
                                      {main.isSubmenu && (
                                        <span className="ml-auto text-gray-400">→</span>
                                      )}
                                    </div>
                                  </button>
                                )
                              })
                            })()}
                          </div>
                        ) : (
                          // Sub-menú: ubicaciones de producción
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowProductionSubMenu(false)
                                setSelectedLocationId('')
                              }}
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
                            >
                              ← Volver
                            </button>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                              {locations
                                .filter(loc => loc.bin_type === 'production')
                                .map((location) => {
                                  const isSelected = selectedLocationId === location.id

                                  return (
                                    <button
                                      key={location.id}
                                      type="button"
                                      onClick={() => setSelectedLocationId(location.id)}
                                      className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                                        isSelected
                                          ? 'border-blue-500 bg-blue-50'
                                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-xl">⚙️</span>
                                        <span className={`text-sm font-medium truncate ${
                                          isSelected ? 'text-blue-900' : 'text-gray-900'
                                        }`}>
                                          {location.name}
                                        </span>
                                      </div>
                                    </button>
                                  )
                                })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsCreateDialogOpen(false)
                            setSelectedLocationId('')
                            setShowProductionSubMenu(false)
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleCreateInventory}
                          disabled={!selectedLocationId}
                        >
                          Crear Inventario
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>

          {/* Mobile Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 md:p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-200" />
                <div>
                  <p className="text-blue-200 text-xs md:text-sm">Total</p>
                  <p className="text-white text-lg md:text-2xl font-bold">{inventories.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 md:p-4">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-200" />
                <div>
                  <p className="text-blue-200 text-xs md:text-sm">En Progreso</p>
                  <p className="text-white text-lg md:text-2xl font-bold">
                    {inventories.filter(inv => inv.status === 'in_progress').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 md:p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-200" />
                <div>
                  <p className="text-blue-200 text-xs md:text-sm">Completos</p>
                  <p className="text-white text-lg md:text-2xl font-bold">
                    {inventories.filter(inv => inv.status === 'completed').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 md:p-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-200" />
                <div>
                  <p className="text-blue-200 text-xs md:text-sm">Borradores</p>
                  <p className="text-white text-lg md:text-2xl font-bold">
                    {inventories.filter(inv => inv.status === 'draft').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inventarios List */}
      <div className="container mx-auto p-4 space-y-4">
        {inventories.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <Calculator className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No hay inventarios creados
            </h3>
            <p className="text-gray-500 mb-6">
              Crea tu primer inventario para comenzar a utilizar CountPro
            </p>
            <Button
              onClick={handleOpenCreateDialog}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 h-12 px-8"
            >
              <Plus className="h-5 w-5 mr-2" />
              Crear Primer Inventario
            </Button>
          </div>
        ) : (
          inventories.map((inventory) => {
            const summary = getInventorySummary(inventory)
            return (
              <div key={inventory.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {inventory.name}
                      </h3>
                      {inventory.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {inventory.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-4">
                      {getStatusBadge(inventory.status)}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="p-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{summary.totalProducts}</p>
                      <p className="text-sm text-gray-600">Productos</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Conteos</p>
                      <div className="flex justify-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${summary.hasFirstCount ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                        <span className={`w-3 h-3 rounded-full ${summary.hasSecondCount ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4">
                  <div className="space-y-2">
                    {/* Solo mostrar botón de conteo principal si no hay segundo conteo activo y no están ambos completados */}
                    {!(summary.hasSecondCount || 
                       (summary.hasFirstCount && summary.hasSecondCount && 
                        inventory.inventory_counts?.find(c => c.count_number === 1)?.status === 'completed' &&
                        inventory.inventory_counts?.find(c => c.count_number === 2)?.status === 'completed')) && (
                      <Link href={`/inventory/${inventory.id}/count`} className="block">
                        <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg font-semibold">
                          <Calculator className="h-5 w-5 mr-2" />
                          {(() => {
                            const firstCount = inventory.inventory_counts?.find(c => c.count_number === 1)
                            if (!firstCount) return 'Iniciar Primer Conteo'
                            if (firstCount.status === 'in_progress') return 'Continuar Primer Conteo'
                            return 'Continuar Conteo'
                          })()}
                        </Button>
                      </Link>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2">
                      {/* Solo mostrar botón de segundo conteo si el primer conteo está COMPLETADO */}
                      {summary.hasFirstCount &&
                       inventory.inventory_counts?.find(c => c.count_number === 1)?.status === 'completed' &&
                       !summary.hasSecondCount &&
                       inventory.status !== 'completed' && (
                        <Link href={`/inventory/${inventory.id}/count?second=true`}>
                          <Button variant="outline" className="w-full h-10 text-amber-600 border-amber-300">
                            Iniciar 2do Conteo
                          </Button>
                        </Link>
                      )}

                      {/* Botón para finalizar con primer conteo */}
                      {summary.hasFirstCount &&
                       inventory.inventory_counts?.find(c => c.count_number === 1)?.status === 'completed' &&
                       !summary.hasSecondCount &&
                       inventory.status !== 'completed' && (
                        <Button
                          variant="outline"
                          className="w-full h-10 text-green-600 border-green-300 bg-green-50"
                          onClick={() => handleOpenFinishDialog(inventory.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Finalizar con 1er Conteo</span>
                          <span className="sm:hidden">Finalizar</span>
                        </Button>
                      )}

                      {/* Continuar segundo conteo si está en progreso */}
                      {summary.hasSecondCount &&
                       inventory.inventory_counts?.find(c => c.count_number === 2)?.status === 'in_progress' && (
                        <Link href={`/inventory/${inventory.id}/count?second=true`}>
                          <Button variant="outline" className="w-full h-10 text-blue-600 border-blue-300">
                            Continuar 2do
                          </Button>
                        </Link>
                      )}

                      {summary.hasFirstCount && (
                        <Link href={`/inventory/${inventory.id}/summary`}>
                          <Button variant="outline" className="w-full h-10">
                            <History className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Ver Resumen</span>
                            <span className="sm:hidden">Resumen</span>
                          </Button>
                        </Link>
                      )}

                      {summary.hasFirstCount && summary.hasSecondCount && 
                       inventory.inventory_counts?.find(c => c.count_number === 2)?.status === 'completed' && 
                       inventory.status !== 'completed' && (
                        <Link href={`/inventory/${inventory.id}/reconciliation`}>
                          <Button variant="outline" className="w-full h-10 text-green-600 border-green-300">
                            Conciliar
                          </Button>
                        </Link>
                      )}

                      <Link href={`/inventory/${inventory.id}/final-results`}>
                        <Button variant="outline" className="w-full h-10 text-purple-600 border-purple-300 bg-purple-50">
                          <Trophy className="h-4 w-4 mr-1" />
                          {inventory.status === 'completed' ? 'Resultados Finales' : 'Ver Estado'}
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="mt-3 text-center">
                    <p className="text-xs text-gray-500">
                      Creado: {new Date(inventory.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal de confirmación para finalizar con primer conteo */}
      <Dialog open={isConfirmFinishOpen} onOpenChange={setIsConfirmFinishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Finalizar inventario con primer conteo?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Al confirmar, el inventario se finalizará usando únicamente los datos del primer conteo.
              No se requerirá un segundo conteo ni proceso de conciliación.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 mb-2">
                <strong>Nota:</strong> Esta acción creará los resultados finales directamente y marcará el inventario como completado.
              </p>
              <p className="text-sm text-blue-900">
                Si no contaste productos, el inventario se completará sin resultados finales.
                Los productos con inventario positivo aparecerán en <strong>Ajustes</strong> para que puedas aplicar correcciones manualmente.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsConfirmFinishOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleFinishWithFirstCount}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Sí, Finalizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </RouteGuard>
  )
}