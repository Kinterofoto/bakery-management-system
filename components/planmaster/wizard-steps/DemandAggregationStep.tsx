"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockMPSData } from "@/lib/mock-data/planmaster-mock"
import { TrendingUp, Package, AlertCircle, Calendar as CalendarIcon } from "lucide-react"

interface DemandAggregationStepProps {
  planData: any
  onDataChange: (data: any) => void
}

// Helper to format date as "Lun 21"
const formatDateShort = (dateStr: string) => {
  const date = new Date(dateStr)
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const dayName = days[date.getDay()]
  const dayNum = date.getDate()
  return `${dayName} ${dayNum}`
}

export function DemandAggregationStep({ planData, onDataChange }: DemandAggregationStepProps) {
  const totalDemand = mockMPSData.reduce((sum, item) => sum + item.total_demand, 0)
  const totalSuggestedProduction = mockMPSData.reduce((sum, item) => sum + item.total_suggested_production, 0)
  const conflictsCount = mockMPSData.reduce((sum, item) =>
    sum + item.daily_schedule.filter(day => !day.fulfills_demand).length, 0
  )

  // Get unique dates from first product
  const dates = mockMPSData[0]?.daily_schedule.map(d => d.date) || []

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Master Production Schedule (MPS)</h3>
        <p className="text-sm text-gray-500 mt-1">
          Plan de producción sugerido basado en demanda diaria y capacidad disponible
        </p>
      </div>

      {/* Summary Cards - Compact */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Demanda Total</p>
                <p className="text-xl font-bold text-blue-700">{totalDemand.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Producción Sugerida</p>
                <p className="text-xl font-bold text-green-700">{totalSuggestedProduction.toLocaleString()}</p>
              </div>
              <Package className="w-6 h-6 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Productos</p>
                <p className="text-xl font-bold text-purple-700">{mockMPSData.length}</p>
              </div>
              <CalendarIcon className="w-6 h-6 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Conflictos</p>
                <p className="text-xl font-bold text-red-700">{conflictsCount}</p>
              </div>
              <AlertCircle className="w-6 h-6 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MPS Table - Full height */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Plan Maestro de Producción Semanal</CardTitle>
          <CardDescription className="text-xs">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-green-100 border border-green-300 rounded"></span>
              <span>Cumple demanda</span>
            </span>
            <span className="inline-flex items-center gap-2 ml-4">
              <span className="inline-block w-3 h-3 bg-red-100 border border-red-300 rounded"></span>
              <span>No cumple demanda</span>
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left p-2 font-semibold text-gray-700 bg-gray-50 sticky left-0 z-20 min-w-[180px] border-r-2 border-gray-300">
                    Producto
                  </th>
                  {dates.map((date) => (
                    <th key={date} className="text-center p-2 font-semibold text-gray-700 bg-gray-50 min-w-[100px]">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-500">📅</span>
                        <span>{formatDateShort(date)}</span>
                      </div>
                    </th>
                  ))}
                  <th className="text-center p-2 font-semibold text-gray-700 bg-blue-50 min-w-[90px] border-l-2 border-gray-300">
                    Total
                  </th>
                </tr>
                <tr className="border-b bg-gray-50">
                  <th className="text-[10px] text-left p-1 text-gray-500 sticky left-0 z-20 bg-gray-50 border-r-2 border-gray-300">
                    Tasa prod. (u/h)
                  </th>
                  {dates.map((date, idx) => (
                    <th key={date} className="text-[10px] text-center p-1 text-gray-500">
                      <div className="text-blue-600">Demanda</div>
                      <div className="text-green-600">Producción</div>
                    </th>
                  ))}
                  <th className="text-[10px] text-center p-1 text-gray-500 bg-blue-50 border-l-2 border-gray-300">
                    Dem / Prod
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockMPSData.map((product, productIdx) => (
                  <tr key={product.product_id} className={`border-b hover:bg-gray-50 ${productIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="p-2 font-medium sticky left-0 z-10 bg-inherit border-r border-gray-200">
                      <div className="flex flex-col">
                        <span className="text-gray-900">{product.product_name}</span>
                        <span className="text-[10px] text-gray-500">{product.production_rate_per_hour} u/h</span>
                      </div>
                    </td>
                    {product.daily_schedule.map((day) => (
                      <td
                        key={day.date}
                        className={`p-1 text-center ${
                          day.fulfills_demand
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-red-50 border border-red-300'
                        }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="text-blue-700 font-semibold text-xs">
                            {day.demand}
                          </div>
                          <div className={`text-[11px] font-bold ${
                            day.fulfills_demand ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {day.suggested_production}
                          </div>
                          {!day.fulfills_demand && (
                            <div className="text-[9px] text-red-600 font-semibold">
                              ⚠ -{day.demand - day.suggested_production}
                            </div>
                          )}
                        </div>
                      </td>
                    ))}
                    <td className="p-2 text-center font-bold bg-blue-50 border-l border-gray-300">
                      <div className="flex flex-col">
                        <span className="text-blue-700 text-sm">{product.total_demand}</span>
                        <span className="text-green-700 text-sm">{product.total_suggested_production}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-blue-50 font-bold">
                  <td className="p-2 sticky left-0 z-10 bg-blue-50 border-r border-gray-300">TOTAL SEMANAL</td>
                  {dates.map((date, idx) => {
                    const dayDemand = mockMPSData.reduce((sum, p) => sum + p.daily_schedule[idx].demand, 0)
                    const dayProduction = mockMPSData.reduce((sum, p) => sum + p.daily_schedule[idx].suggested_production, 0)
                    return (
                      <td key={date} className="p-2 text-center">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-blue-700 text-sm">{dayDemand}</span>
                          <span className="text-green-700 text-sm">{dayProduction}</span>
                        </div>
                      </td>
                    )
                  })}
                  <td className="p-2 text-center bg-blue-100 border-l-2 border-gray-300">
                    <div className="flex flex-col">
                      <span className="text-blue-800 text-base">{totalDemand}</span>
                      <span className="text-green-800 text-base">{totalSuggestedProduction}</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="bg-gray-50">
        <CardContent className="p-3">
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="font-semibold text-blue-700">Demanda:</span>
              <span className="text-gray-600 ml-1">Unidades requeridas por día</span>
            </div>
            <div>
              <span className="font-semibold text-green-700">Producción Sugerida:</span>
              <span className="text-gray-600 ml-1">Optimizada según capacidad disponible</span>
            </div>
            <div>
              <span className="font-semibold text-red-700">Conflictos:</span>
              <span className="text-gray-600 ml-1">Producción sugerida no cubre la demanda</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
