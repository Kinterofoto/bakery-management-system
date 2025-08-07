"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Plus, Calculator, Package, History, CheckCircle2, Clock, AlertTriangle, Trophy } from "lucide-react"
import { useInventories } from '@/hooks/use-inventories'
import { toast } from 'sonner'
import Link from 'next/link'

export default function InventoryPage() {
  const { inventories, loading, createInventory } = useInventories()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newInventoryName, setNewInventoryName] = useState('')
  const [newInventoryDescription, setNewInventoryDescription] = useState('')

  const handleCreateInventory = async () => {
    if (!newInventoryName.trim()) {
      toast.error('El nombre del inventario es requerido')
      return
    }

    try {
      await createInventory({
        name: newInventoryName.trim(),
        description: newInventoryDescription.trim() || null,
        status: 'draft'
      })
      
      setNewInventoryName('')
      setNewInventoryDescription('')
      setIsCreateDialogOpen(false)
    } catch (error) {
      // Error handled by hook
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
      hasFirstCount: firstCountItems > 0,
      hasSecondCount: secondCountItems > 0,
      firstCountItems,
      secondCountItems,
      totalProducts: Math.max(firstCountItems, secondCountItems)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
            <p className="text-gray-600">Cargando inventarios...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-blue-600 text-white p-4 md:p-8">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-4 md:mb-8">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-4xl font-bold flex items-center gap-2 md:gap-3">
                <Calculator className="h-8 w-8 md:h-10 md:w-10 text-blue-100" />
                CountPro
              </h1>
              <p className="text-blue-100 mt-1 md:mt-2 text-sm md:text-base">
                Calculadora móvil para inventarios precisos
              </p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 h-12 px-4 md:px-6">
                  <Plus className="h-5 w-5 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Nuevo Inventario</span>
                  <span className="sm:hidden">Nuevo</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Inventario</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nombre del Inventario</Label>
                    <Input
                      id="name"
                      placeholder="Ej: Inventario Mensual Enero 2024"
                      value={newInventoryName}
                      onChange={(e) => setNewInventoryName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descripción (opcional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Descripción del inventario..."
                      value={newInventoryDescription}
                      onChange={(e) => setNewInventoryDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateInventory}>
                      Crear Inventario
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

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
              onClick={() => setIsCreateDialogOpen(true)}
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
                       !summary.hasSecondCount && (
                        <Link href={`/inventory/${inventory.id}/count?second=true`}>
                          <Button variant="outline" className="w-full h-10 text-amber-600 border-amber-300">
                            Iniciar 2do Conteo
                          </Button>
                        </Link>
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
    </div>
  )
}