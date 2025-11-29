import { cn } from '@/lib/utils'

interface StockProgressBarProps {
  warehouseStock: number
  productionStock: number
  unit?: string
  showLabels?: boolean
  height?: 'sm' | 'md' | 'lg'
}

const heightClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
}

export function StockProgressBar({
  warehouseStock,
  productionStock,
  unit = 'kg',
  showLabels = true,
  height = 'md',
}: StockProgressBarProps) {
  const total = warehouseStock + productionStock
  const warehousePercent = total > 0 ? (warehouseStock / total) * 100 : 0
  const productionPercent = total > 0 ? (productionStock / total) * 100 : 0

  return (
    <div className="space-y-2">
      {/* Progress Bar */}
      <div className={cn('w-full bg-white/5 rounded-full overflow-hidden', heightClasses[height])}>
        <div className="flex h-full">
          {/* Warehouse portion */}
          {warehousePercent > 0 && (
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300"
              style={{ width: `${warehousePercent}%` }}
            />
          )}
          {/* Production portion */}
          {productionPercent > 0 && (
            <div
              className="bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-300"
              style={{ width: `${productionPercent}%` }}
            />
          )}
        </div>
      </div>

      {/* Labels */}
      {showLabels && total > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-400" />
              <span>Bodega: {warehouseStock.toFixed(2)} {unit}</span>
            </div>
            <span className="text-gray-600">•</span>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-400" />
              <span>Producción: {productionStock.toFixed(2)} {unit}</span>
            </div>
          </div>
          <div className="font-medium text-gray-300">
            Total: {total.toFixed(2)} {unit}
          </div>
        </div>
      )}
    </div>
  )
}
