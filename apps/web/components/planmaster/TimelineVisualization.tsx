"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { mockProductionOrders, mockCapacity } from "@/lib/mock-data/planmaster-mock"
import { Clock, AlertCircle, CheckCircle, PlayCircle } from "lucide-react"

interface TimelineVisualizationProps {
  viewType: 'product' | 'machine' | 'client' | 'order' | 'material'
  dateRange: { from: string; to: string }
}

export function TimelineVisualization({ viewType, dateRange }: TimelineVisualizationProps) {
  // Generate dates in range
  const dates = useMemo(() => {
    const start = new Date(dateRange.from)
    const end = new Date(dateRange.to)
    const dateArray: string[] = []

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dateArray.push(d.toISOString().split('T')[0])
    }

    return dateArray
  }, [dateRange])

  // Filter OPs by date range
  const filteredOps = useMemo(() => {
    return mockProductionOrders.filter(op => {
      const opDate = op.scheduled_date
      return opDate >= dateRange.from && opDate <= dateRange.to
    })
  }, [dateRange])

  // Group OPs based on view type
  const groupedData = useMemo(() => {
    const groups: { [key: string]: typeof filteredOps } = {}

    filteredOps.forEach(op => {
      let groupKey = ''

      switch (viewType) {
        case 'product':
          groupKey = op.product_name
          break
        case 'machine':
          groupKey = op.work_center_name
          break
        case 'client':
          groupKey = 'Cliente Demo' // Mock data doesn't have client info
          break
        case 'order':
          groupKey = op.order_number
          break
        case 'material':
          groupKey = 'Material: ' + op.product_name
          break
      }

      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(op)
    })

    return groups
  }, [filteredOps, viewType])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 hover:bg-green-600'
      case 'in_progress':
        return 'bg-yellow-500 hover:bg-yellow-600'
      case 'delayed':
        return 'bg-orange-500 hover:bg-orange-600'
      case 'conflict':
        return 'bg-red-500 hover:bg-red-600'
      default:
        return 'bg-gray-400 hover:bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-3 h-3" />
      case 'in_progress':
        return <PlayCircle className="w-3 h-3" />
      case 'delayed':
        return <Clock className="w-3 h-3" />
      case 'conflict':
        return <AlertCircle className="w-3 h-3" />
      default:
        return <Clock className="w-3 h-3" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado'
      case 'in_progress':
        return 'En Proceso'
      case 'delayed':
        return 'Retrasado'
      case 'conflict':
        return 'Conflicto'
      default:
        return 'Pendiente'
    }
  }

  return (
    <TooltipProvider>
      <div className="w-full overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header - Dates */}
          <div className="flex border-b">
            <div className="w-48 flex-shrink-0 p-3 bg-gray-50 font-semibold text-sm border-r">
              {viewType === 'product' ? 'Producto' :
               viewType === 'machine' ? 'Centro de Trabajo' :
               viewType === 'client' ? 'Cliente' :
               viewType === 'order' ? 'Orden' : 'Material'}
            </div>
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${dates.length}, minmax(120px, 1fr))` }}>
              {dates.map(date => {
                const dateObj = new Date(date)
                const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' })
                const dayNum = dateObj.getDate()
                const month = dateObj.toLocaleDateString('es-ES', { month: 'short' })

                return (
                  <div key={date} className="p-3 bg-gray-50 border-r text-center">
                    <div className="text-xs text-gray-500 capitalize">{dayName}</div>
                    <div className="text-sm font-semibold">{dayNum} {month}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Timeline Rows */}
          <div className="divide-y">
            {Object.entries(groupedData).map(([groupName, ops]) => (
              <div key={groupName} className="flex hover:bg-gray-50 transition-colors">
                {/* Row Header */}
                <div className="w-48 flex-shrink-0 p-3 border-r flex items-center">
                  <div className="truncate">
                    <p className="font-medium text-sm truncate">{groupName}</p>
                    <p className="text-xs text-gray-500">{ops.length} OPs</p>
                  </div>
                </div>

                {/* Timeline Cells */}
                <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${dates.length}, minmax(120px, 1fr))` }}>
                  {dates.map(date => {
                    const dateOps = ops.filter(op => op.scheduled_date === date)

                    return (
                      <div key={date} className="p-2 border-r min-h-[80px] flex flex-col gap-1">
                        {dateOps.map(op => (
                          <Tooltip key={op.id}>
                            <TooltipTrigger asChild>
                              <div
                                className={`
                                  ${getStatusColor(op.status)}
                                  text-white rounded px-2 py-1.5 text-xs cursor-pointer
                                  transition-all hover:shadow-md
                                `}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="truncate font-medium">{op.order_number}</span>
                                  {getStatusIcon(op.status)}
                                </div>
                                <div className="text-[10px] opacity-90 mt-0.5">
                                  {op.quantity_planned} und
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-semibold">{op.order_number}</p>
                                <p className="text-sm">{op.product_name}</p>
                                <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                                  <div>
                                    <p className="text-gray-400">Centro:</p>
                                    <p>{op.work_center_name}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Turno:</p>
                                    <p className="capitalize">{op.scheduled_shift}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Planeado:</p>
                                    <p>{op.quantity_planned} und</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Producido:</p>
                                    <p>{op.quantity_produced} und</p>
                                  </div>
                                </div>
                                <div className="pt-2 border-t mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {getStatusLabel(op.status)}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs ml-2 capitalize">
                                    {op.source}
                                  </Badge>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Empty state */}
            {Object.keys(groupedData).length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <p>No hay órdenes de producción en este rango de fechas</p>
              </div>
            )}
          </div>

          {/* Capacity Usage Row (only for machine view) */}
          {viewType === 'machine' && mockCapacity.length > 0 && (
            <div className="border-t-2 border-gray-300 mt-4">
              <div className="flex bg-blue-50">
                <div className="w-48 flex-shrink-0 p-3 border-r font-semibold text-sm">
                  Capacidad Utilizada
                </div>
                <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${dates.length}, minmax(120px, 1fr))` }}>
                  {dates.map(date => {
                    const capacityData = mockCapacity.find(c => c.date === date)

                    if (!capacityData) {
                      return <div key={date} className="p-3 border-r" />
                    }

                    return (
                      <div key={date} className="p-3 border-r">
                        <div className="text-xs text-gray-600 mb-1">
                          {capacityData.planned_hours}h / {capacityData.total_capacity_hours}h
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              capacityData.utilization_percentage > 100 ? 'bg-red-500' :
                              capacityData.utilization_percentage > 90 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(capacityData.utilization_percentage, 100)}%` }}
                          />
                        </div>
                        <div className={`text-xs font-semibold mt-1 ${
                          capacityData.utilization_percentage > 100 ? 'text-red-600' :
                          capacityData.utilization_percentage > 90 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {capacityData.utilization_percentage}%
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span className="text-xs text-gray-600">Completado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-500" />
          <span className="text-xs text-gray-600">En Proceso</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange-500" />
          <span className="text-xs text-gray-600">Retrasado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span className="text-xs text-gray-600">Conflicto</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-400" />
          <span className="text-xs text-gray-600">Pendiente</span>
        </div>
      </div>
    </TooltipProvider>
  )
}
