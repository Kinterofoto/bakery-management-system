"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, ArrowLeft, Package, CheckCircle2, Calendar } from "lucide-react"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Inventory {
  id: string
  name: string
  status: string
  created_at: string
  inventory_final_results: Array<{
    id: string
    product_id: string
    final_quantity: number
    final_grams_per_unit: number
    final_total_grams: number
  }>
}

export default function InventoryAdjustmentsPage() {
  const router = useRouter()
  const { hasPermission } = useAuth()
  const [inventories, setInventories] = useState<Inventory[]>([])
  const [loading, setLoading] = useState(true)

  // Check permission
  useEffect(() => {
    if (!hasPermission('inventory_adjustment')) {
      router.push('/inventory')
    }
  }, [hasPermission, router])

  useEffect(() => {
    fetchCompletedInventories()
  }, [])

  const fetchCompletedInventories = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('inventories')
        .select(`
          id,
          name,
          status,
          created_at,
          inventory_final_results (
            id,
            product_id,
            final_quantity,
            final_grams_per_unit,
            final_total_grams
          )
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Include ALL completed inventories, even those with zero products counted
      // This allows adjustments for uncounted products with inventory_balances > 0
      setInventories((data || []) as Inventory[])
    } catch (error) {
      console.error('Error fetching inventories:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <RouteGuard>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
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
        {/* Header */}
        <div className="bg-purple-600 text-white p-4 md:p-8">
          <div className="container mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/inventory">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className="text-2xl md:text-4xl font-bold flex items-center gap-2 md:gap-3">
                  <Settings className="h-8 w-8 md:h-10 md:w-10 text-purple-100" />
                  Ajustes de Inventario
                </h1>
                <p className="text-purple-100 mt-1 md:mt-2 text-sm md:text-base">
                  Revisa y ajusta las diferencias entre conteos e inventario real
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              <div className="bg-white/10 backdrop-blur rounded-xl p-3 md:p-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-200" />
                  <div>
                    <p className="text-purple-200 text-xs md:text-sm">Inventarios Finalizados</p>
                    <p className="text-white text-lg md:text-2xl font-bold">{inventories.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto p-4 space-y-4">
          {inventories.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <Settings className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No hay inventarios finalizados
              </h3>
              <p className="text-gray-500 mb-6">
                Los inventarios completados aparecerán aquí para que puedas realizar ajustes
              </p>
              <Link href="/inventory">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver a Inventarios
                </Button>
              </Link>
            </div>
          ) : (
            inventories.map((inventory) => (
              <Card key={inventory.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                        {inventory.name}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          {new Date(inventory.created_at).toLocaleDateString('es-CO', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completado
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Productos contados</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {inventory.inventory_final_results?.length || 0}
                      </p>
                      {(!inventory.inventory_final_results || inventory.inventory_final_results.length === 0) && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠️ Sin productos contados - Revisa ajustes
                        </p>
                      )}
                    </div>
                    <Link href={`/inventory/adjustments/${inventory.id}`}>
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        <Settings className="h-4 w-4 mr-2" />
                        Ver Ajustes
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </RouteGuard>
  )
}
