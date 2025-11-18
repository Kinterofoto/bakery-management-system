"use client"

import { useEffect } from "react"
import { useWorkCenterInventory } from "@/hooks/use-work-center-inventory"
import { AlertCircle, Package } from "lucide-react"

type WorkCenterInventoryViewProps = {
  workCenterId: string
}

export function WorkCenterInventoryView({ workCenterId }: WorkCenterInventoryViewProps) {
  const { inventory, loading, error, fetchInventoryByWorkCenter } = useWorkCenterInventory()

  useEffect(() => {
    fetchInventoryByWorkCenter(workCenterId)
  }, [workCenterId])

  if (error) {
    return (
      <div className="
        bg-red-50 dark:bg-red-950/30
        border border-red-200 dark:border-red-800/50
        rounded-lg
        p-4
        flex items-center gap-3
      ">
        <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
        <div>
          <p className="font-semibold text-red-900 dark:text-red-300">Error</p>
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="
        bg-white/50 dark:bg-black/30
        backdrop-blur-md
        border border-white/30 dark:border-white/15
        rounded-lg
        p-8
        text-center
      ">
        <p className="text-gray-600 dark:text-gray-400">Cargando inventario...</p>
      </div>
    )
  }

  if (inventory.length === 0) {
    return (
      <div className="
        bg-white/50 dark:bg-black/30
        backdrop-blur-md
        border border-white/30 dark:border-white/15
        rounded-lg
        p-8
        text-center
      ">
        <Package className="mx-auto mb-3 text-gray-400 dark:text-gray-600" size={32} />
        <p className="font-semibold text-gray-900 dark:text-white mb-1">No hay materiales en inventario</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">Realiza un traslado para agregar materiales</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/20 dark:border-white/10">
              <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Material</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Disponible</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Consumido</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Neto</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Unidad</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Lote</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Vencimiento</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item, idx) => {
              const netAvailable = item.quantity_available - item.quantity_consumed
              const isLowStock = netAvailable < 5 && netAvailable > 0
              const isOutOfStock = netAvailable <= 0

              return (
                <tr
                  key={idx}
                  className={`
                    border-b border-white/10 dark:border-white/5
                    hover:bg-white/30 dark:hover:bg-black/20
                    transition-colors
                    ${isOutOfStock ? 'bg-red-50/50 dark:bg-red-950/20' : isLowStock ? 'bg-yellow-50/50 dark:bg-yellow-950/20' : ''}
                  `}
                >
                  <td className="py-3 px-4">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {item.material_name}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.quantity_available.toFixed(2)}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <p className="font-medium text-orange-600 dark:text-orange-400">
                      {item.quantity_consumed.toFixed(2)}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <p className={`
                      font-bold text-lg
                      ${isOutOfStock ? 'text-red-600 dark:text-red-400' : isLowStock ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}
                    `}>
                      {netAvailable.toFixed(2)}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-center text-sm text-gray-600 dark:text-gray-400">
                    {item.unit_of_measure}
                  </td>
                  <td className="py-3 px-4 text-center text-sm">
                    {item.batch_number ? (
                      <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                        {item.batch_number}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center text-sm">
                    {item.expiry_date ? (
                      <span className={`
                        inline-block px-2 py-1 rounded text-xs font-medium
                        ${new Date(item.expiry_date) < new Date()
                          ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }
                      `}>
                        {new Date(item.expiry_date).toLocaleDateString('es-CO')}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="
          bg-green-50/50 dark:bg-green-950/30
          border border-green-200/50 dark:border-green-800/50
          rounded-lg
          p-4
        ">
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Total Disponible</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {inventory.reduce((sum, item) => sum + item.quantity_available, 0).toFixed(0)}
          </p>
        </div>

        <div className="
          bg-orange-50/50 dark:bg-orange-950/30
          border border-orange-200/50 dark:border-orange-800/50
          rounded-lg
          p-4
        ">
          <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1">Total Consumido</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {inventory.reduce((sum, item) => sum + item.quantity_consumed, 0).toFixed(0)}
          </p>
        </div>

        <div className="
          bg-blue-50/50 dark:bg-blue-950/30
          border border-blue-200/50 dark:border-blue-800/50
          rounded-lg
          p-4
        ">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Total Neto</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {inventory.reduce((sum, item) => sum + (item.quantity_available - item.quantity_consumed), 0).toFixed(0)}
          </p>
        </div>
      </div>
    </div>
  )
}
