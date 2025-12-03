"use client"

import { useState, useEffect } from "react"
import { Package, Trash2, AlertCircle, TrendingUp, MapPin, DollarSign, Calendar } from "lucide-react"
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

interface WasteHistoryItem {
  id: string
  product_id: string
  product_name: string
  product_code: string
  location_name: string
  quantity: number
  unit_of_measure: string
  unit_price: number
  total_value: number
  waste_reason: string
  movement_date: string
  recorded_by_name: string
  created_at: string
}

export default function BajasPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [wasteHistory, setWasteHistory] = useState<WasteHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
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

  const fetchWasteHistory = async () => {
    try {
      setHistoryLoading(true)

      // Fetch warehouse locations first to filter waste movements
      const { data: locations } = await supabase
        .schema('inventario')
        .from('locations')
        .select('id, code, name, location_type, path, bin_type')

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

      const warehouseLocationIds = warehouseLocations.map(l => l.id)

      if (warehouseLocationIds.length === 0) {
        setWasteHistory([])
        return
      }

      // Fetch waste movements from warehouse locations
      const { data: movements, error: movementsError } = await supabase
        .schema('inventario')
        .from('inventory_movements')
        .select(`
          id,
          product_id,
          quantity,
          unit_of_measure,
          location_id_from,
          notes,
          movement_date,
          recorded_by,
          created_at
        `)
        .eq('reason_type', 'waste')
        .in('location_id_from', warehouseLocationIds)
        .order('movement_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100)

      if (movementsError) throw movementsError

      if (!movements || movements.length === 0) {
        setWasteHistory([])
        return
      }

      // Get unique product IDs, location IDs, and user IDs
      const productIds = [...new Set(movements.map(m => m.product_id))]
      const locationIds = [...new Set(movements.map(m => m.location_id_from).filter(Boolean) as string[])]
      const userIds = [...new Set(movements.map(m => m.recorded_by).filter(Boolean) as string[])]

      // Fetch products with prices
      const { data: products } = await supabase
        .from('products')
        .select('id, name, unit, price')
        .in('id', productIds)

      // Fetch locations
      const { data: locationsData } = await supabase
        .schema('inventario')
        .from('locations')
        .select('id, code, name')
        .in('id', locationIds)

      // Fetch users
      const { data: users } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds)

      // Create maps for lookup
      const productsMap = new Map(products?.map(p => [p.id, p]) || [])
      const locationsMap = new Map(locationsData?.map(l => [l.id, l]) || [])
      const usersMap = new Map(users?.map(u => [u.id, u]) || [])

      // Enrich movements with related data
      const enrichedHistory: WasteHistoryItem[] = movements.map(movement => {
        const product = productsMap.get(movement.product_id)
        const location = locationsMap.get(movement.location_id_from)
        const user = usersMap.get(movement.recorded_by || '')

        // Extract waste reason from notes (format: "Desperdicio: reason")
        const wasteReason = movement.notes?.replace('Desperdicio: ', '') || 'Sin razón especificada'

        // Calculate values (quantity is absolute for OUT movements)
        const quantity = Math.abs(movement.quantity)
        const unitPrice = product?.price || 0
        const totalValue = quantity * unitPrice

        return {
          id: movement.id,
          product_id: movement.product_id,
          product_name: product?.name || 'Desconocido',
          product_code: product?.id?.substring(0, 8) || '',
          location_name: location?.name || 'Desconocido',
          quantity,
          unit_of_measure: movement.unit_of_measure,
          unit_price: unitPrice,
          total_value: totalValue,
          waste_reason: wasteReason,
          movement_date: movement.movement_date,
          recorded_by_name: user?.email?.split('@')[0] || 'Desconocido',
          created_at: movement.created_at,
        }
      })

      setWasteHistory(enrichedHistory)
    } catch (error) {
      console.error('Error fetching waste history:', error)
      toast.error('Error al cargar el historial de bajas')
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    fetchWarehouseInventory()
    fetchWasteHistory()
  }, [])

  const totalStock = inventory.reduce((sum, item) => sum + item.quantity_on_hand, 0)
  const totalProducts = new Set(inventory.map(i => i.product_id)).size
  const totalLocations = new Set(inventory.map(i => i.location_id)).size
  const totalWasteValue = wasteHistory.reduce((sum, item) => sum + item.total_value, 0)
  const totalWasteQuantity = wasteHistory.reduce((sum, item) => sum + item.quantity, 0)

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
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

          {/* Total Waste Value */}
          <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="bg-red-500/15 rounded-xl p-2">
                <DollarSign className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  Valor Total Bajas
                </p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                  ${totalWasteValue.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Waste History Section */}
        <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 border-b border-white/20 dark:border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-500/15 rounded-xl p-2">
                <Calendar className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                  Historial de Bajas
                </h2>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  Últimos 100 movimientos de desperdicio desde bodega
                </p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              </div>
            ) : wasteHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full p-4 mb-4">
                  <Trash2 className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-center">
                  No hay bajas registradas
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50/50 dark:bg-white/5">
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Ubicación
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Precio Unit.
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Valor Total
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Razón
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Registrado Por
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {wasteHistory.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-white/30 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {new Date(item.movement_date).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {item.product_name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.product_code}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {item.location_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                        {item.quantity.toFixed(2)} {item.unit_of_measure}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700 dark:text-gray-300">
                        ${item.unit_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-red-600 dark:text-red-400">
                        ${item.total_value.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="max-w-xs truncate" title={item.waste_reason}>
                          {item.waste_reason}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {item.recorded_by_name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
          fetchWasteHistory()
          toast.success('Baja registrada exitosamente')
        }}
      />
    </div>
  )
}
