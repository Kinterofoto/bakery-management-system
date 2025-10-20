"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Package,
  Factory,
  Users,
  FileText,
  Boxes,
  Calendar
} from "lucide-react"

interface FiltersPanelProps {
  selectedView: 'product' | 'machine' | 'client' | 'order' | 'material'
  onViewChange: (view: 'product' | 'machine' | 'client' | 'order' | 'material') => void
  dateRange: { from: string; to: string }
  onDateRangeChange: (range: { from: string; to: string }) => void
}

export function FiltersPanel({
  selectedView,
  onViewChange,
  dateRange,
  onDateRangeChange
}: FiltersPanelProps) {
  const views = [
    { id: 'product' as const, label: 'Por Producto', icon: Package },
    { id: 'machine' as const, label: 'Por Máquina', icon: Factory },
    { id: 'client' as const, label: 'Por Cliente', icon: Users },
    { id: 'order' as const, label: 'Por Pedido', icon: FileText },
    { id: 'material' as const, label: 'Por Materiales', icon: Boxes }
  ]

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* View Type Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Tipo de Vista
            </label>
            <div className="flex flex-wrap gap-2">
              {views.map((view) => {
                const IconComponent = view.icon
                const isSelected = selectedView === view.id
                return (
                  <Button
                    key={view.id}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onViewChange(view.id)}
                    className={isSelected ? 'bg-blue-600 hover:bg-blue-700' : ''}
                  >
                    <IconComponent className="w-4 h-4 mr-2" />
                    {view.label}
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Date Range Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Rango de Fechas
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDateRangeChange({ from: '2025-10-20', to: '2025-10-26' })}
                className={
                  dateRange.from === '2025-10-20' && dateRange.to === '2025-10-26'
                    ? 'bg-blue-50 border-blue-300'
                    : ''
                }
              >
                Semana 42
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDateRangeChange({ from: '2025-10-27', to: '2025-11-02' })}
                className={
                  dateRange.from === '2025-10-27' && dateRange.to === '2025-11-02'
                    ? 'bg-blue-50 border-blue-300'
                    : ''
                }
              >
                Semana 43
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDateRangeChange({ from: '2025-10-20', to: '2025-11-02' })}
                className={
                  dateRange.from === '2025-10-20' && dateRange.to === '2025-11-02'
                    ? 'bg-blue-50 border-blue-300'
                    : ''
                }
              >
                Ambas Semanas
              </Button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {dateRange.from}
              </Badge>
              <span className="text-gray-400">→</span>
              <Badge variant="outline" className="text-xs">
                {dateRange.to}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
