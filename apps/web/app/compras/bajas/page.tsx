"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, Trash2, AlertCircle, Plus } from "lucide-react"
import { BajasModal } from "@/components/compras/BajasModal"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface InventoryItem {
  product_id: string
  product_name: string
  product_code: string
  location_id: string
  location_name: string
  location_code: string
  quantity_on_hand: number
  unit_of_measure: string
  last_movement_date: string
}

export default function BajasPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showBajasModal, setShowBajasModal] = useState(false)

  const fetchWarehouseInventory = async () => {
    try {
      setLoading(true)

      // Fetch inventory balances for warehouse locations only (not production)
      const { data: balances, error: balancesError } = await supabase
        .schema('inventario')
        .from('inventory_balances')
        .select(`
          product_id,
          location_id,
          quantity_on_hand,
          last_updated_at
        `)
        .gt('quantity_on_hand', 0)
        .order('last_updated_at', { ascending: false })

      if (balancesError) throw balancesError

      if (!balances || balances.length === 0) {
        setInventory([])
        return
      }

      // Get unique product and location IDs
      const productIds = [...new Set(balances.map(b => b.product_id))]
      const locationIds = [...new Set(balances.map(b => b.location_id))]

      // Fetch products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, unit_of_measure')
        .in('id', productIds)

      if (productsError) throw productsError

      // Fetch locations - Filter only warehouse type locations (not production centers)
      const { data: locations, error: locationsError } = await supabase
        .schema('inventario')
        .from('locations')
        .select('id, code, name, location_type')
        .in('id', locationIds)
        .eq('location_type', 'warehouse') // Only warehouse locations

      if (locationsError) throw locationsError

      // Create maps for quick lookup
      const productsMap = new Map(products?.map(p => [p.id, p]) || [])
      const locationsMap = new Map(locations?.map(l => [l.id, l]) || [])

      // Combine data - only include items from warehouse locations
      const enrichedInventory: InventoryItem[] = balances
        .filter(b => locationsMap.has(b.location_id)) // Filter out non-warehouse locations
        .map(balance => {
          const product = productsMap.get(balance.product_id)
          const location = locationsMap.get(balance.location_id)

          return {
            product_id: balance.product_id,
            product_name: product?.name || 'Desconocido',
            product_code: product?.id?.substring(0, 8) || '',
            location_id: balance.location_id,
            location_name: location?.name || 'Desconocido',
            location_code: location?.code || '',
            quantity_on_hand: balance.quantity_on_hand,
            unit_of_measure: product?.unit_of_measure || 'unidad',
            last_movement_date: balance.last_updated_at
          }
        })
        .sort((a, b) => a.product_name.localeCompare(b.product_name))

      setInventory(enrichedInventory)
    } catch (error) {
      console.error('Error fetching warehouse inventory:', error)
      toast.error('Error al cargar el inventario')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWarehouseInventory()
  }, [])

  const totalStock = inventory.reduce((sum, item) => sum + item.quantity_on_hand, 0)
  const totalProducts = new Set(inventory.map(i => i.product_id)).size
  const totalLocations = new Set(inventory.map(i => i.location_id)).size

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Bajas de Inventario</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Registra desperdicios y bajas de materiales en bodega
          </p>
        </div>

        <Button
          onClick={() => setShowBajasModal(true)}
          size="lg"
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <Trash2 className="w-5 h-5 mr-2" />
          Registrar Baja
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total en Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalStock.toFixed(0)}</div>
            <p className="text-xs text-gray-500 mt-1">unidades totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalProducts}</div>
            <p className="text-xs text-gray-500 mt-1">diferentes productos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Ubicaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalLocations}</div>
            <p className="text-xs text-gray-500 mt-1">ubicaciones activas</p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Inventario en Bodega
          </CardTitle>
          <CardDescription>
            Materiales disponibles en bodega general
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Cargando inventario...
            </div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                No hay inventario en bodega
              </h3>
              <p className="text-gray-500">
                No se encontraron materiales en las ubicaciones de bodega
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Producto
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Código
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Ubicación
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Cantidad
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Unidad
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item, idx) => (
                    <tr
                      key={`${item.product_id}-${item.location_id}`}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {item.product_name}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="font-mono text-xs">
                          {item.product_code}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.location_name}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="font-bold text-green-600 dark:text-green-400">
                          {item.quantity_on_hand.toFixed(2)}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {item.unit_of_measure}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bajas Modal */}
      <BajasModal
        open={showBajasModal}
        onOpenChange={setShowBajasModal}
        inventory={inventory}
        onSuccess={() => {
          fetchWarehouseInventory()
          toast.success('Baja registrada exitosamente')
        }}
      />
    </div>
  )
}
