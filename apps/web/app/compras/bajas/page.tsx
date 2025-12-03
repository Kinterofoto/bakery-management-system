"use client"

import { useState, useEffect } from "react"
import { Package, Trash2, AlertCircle, TrendingUp, MapPin } from "lucide-react"
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
        .select('id, name, unit')
        .in('id', productIds)

      if (productsError) throw productsError

      // Fetch locations - Filter warehouse locations (not production centers)
      // Include locations that start with WH (warehouse) in their code/path
      const { data: locations, error: locationsError } = await supabase
        .schema('inventario')
        .from('locations')
        .select('id, code, name, location_type, path, bin_type')
        .in('id', locationIds)

      if (locationsError) throw locationsError

      // Create maps for quick lookup
      const productsMap = new Map(products?.map(p => [p.id, p]) || [])
      const locationsMap = new Map(locations?.map(l => [l.id, l]) || [])

      // Filter to only warehouse locations (not production centers)
      // Production centers have codes like "DECORADO", "HORNOS", etc.
      // Warehouse locations have codes starting with "WH" or path containing "/WH"
      const warehouseLocations = locations?.filter(loc =>
        loc.code?.startsWith('WH') ||
        loc.path?.includes('/WH') ||
        loc.bin_type === 'receiving' ||
        loc.bin_type === 'general' ||
        loc.bin_type === 'storage' ||
        loc.bin_type === 'shipping' ||
        loc.bin_type === 'quarantine' ||
        loc.bin_type === 'staging'
      ) || []

      const warehouseLocationIds = new Set(warehouseLocations.map(l => l.id))

      // Combine data - only include items from warehouse locations
      const enrichedInventory: InventoryItem[] = balances
        .filter(b => warehouseLocationIds.has(b.location_id)) // Filter out production centers
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
            unit_of_measure: product?.unit || 'unidad',
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white/70 dark:bg-black/50 backdrop-blur-xl border-b border-white/20 dark:border-white/10 p-4 md:p-6 z-20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">
              Bajas de Inventario
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Registra desperdicios y bajas de materiales en bodega
            </p>
          </div>
          <button
            onClick={() => setShowBajasModal(true)}
            className="bg-red-600 text-white font-semibold px-4 md:px-6 py-2.5 md:py-3 rounded-xl shadow-md shadow-red-600/30 hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/40 active:scale-95 transition-all duration-150 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Registrar Baja</span>
            <span className="sm:hidden">Baja</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {/* Total Stock */}
          <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="bg-green-500/15 rounded-xl p-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  Total en Stock
                </p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                  {totalStock.toFixed(0)}
                </p>
              </div>
            </div>
          </div>

          {/* Total Products */}
          <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/15 rounded-xl p-2">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  Productos
                </p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                  {totalProducts}
                </p>
              </div>
            </div>
          </div>

          {/* Total Locations */}
          <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="bg-purple-500/15 rounded-xl p-2">
                <MapPin className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  Ubicaciones
                </p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                  {totalLocations}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl overflow-hidden">
          <div className="p-4 md:p-5 border-b border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Inventario en Bodega
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Materiales disponibles en bodega general
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/10">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Ubicación
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    Cantidad
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    Unidad
                  </th>
                </tr>
              </thead>
              <tbody>
                {inventory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="text-gray-500 dark:text-gray-400">
                        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-semibold mb-1">No hay inventario en bodega</p>
                        <p className="text-sm">No se encontraron materiales en las ubicaciones de bodega</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  inventory.map((item) => (
                    <tr
                      key={`${item.product_id}-${item.location_id}`}
                      className="border-b border-white/10 hover:bg-white/50 dark:hover:bg-black/30 transition-colors duration-200"
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                        {item.product_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-gray-200/50 dark:bg-white/10 rounded-md text-xs font-mono text-gray-700 dark:text-gray-300">
                          {item.product_code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {item.location_name}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">
                        {item.quantity_on_hand.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {item.unit_of_measure}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
