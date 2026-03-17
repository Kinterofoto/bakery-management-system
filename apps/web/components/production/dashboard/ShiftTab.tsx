"use client"

import { ExpandableChart } from "./ExpandableChart"
import { ShiftScatterChart } from "./charts/ShiftScatterChart"
import { glassStyles } from "@/components/dashboard/glass-styles"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { ShiftTypeAggregate, ScatterPoint } from "@/lib/production-analytics-utils"

const shiftChartConfig = {
  goodUnits: { label: "Unidades Buenas", color: "#16a34a" },
  avgUnitsPerHour: { label: "Uds/Hora", color: "#2563eb" },
} satisfies ChartConfig

interface ShiftTabProps {
  shiftTypeData: ShiftTypeAggregate[]
  scatterData: ScatterPoint[]
  loading: boolean
}

export function ShiftTab({ shiftTypeData, scatterData, loading }: ShiftTabProps) {
  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
  }

  const barData = shiftTypeData.map((d) => ({
    name: d.shiftName,
    goodUnits: d.goodUnits,
    avgUnitsPerHour: d.avgUnitsPerHour,
  }))

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        <ExpandableChart
          title="Por Tipo de Turno"
          description="Unidades y eficiencia"
        >
          {barData.length > 0 ? (
            <ChartContainer config={shiftChartConfig} className="w-full" style={{ height: 260 }}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar yAxisId="left" dataKey="goodUnits" fill="var(--color-goodUnits)" radius={[4, 4, 0, 0]} name="Unidades Buenas" />
                <Bar yAxisId="right" dataKey="avgUnitsPerHour" fill="var(--color-avgUnitsPerHour)" radius={[4, 4, 0, 0]} name="Uds/Hora" />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Sin datos</div>
          )}
        </ExpandableChart>

        <ExpandableChart
          title="Duración vs Producción"
          description="Cada punto es un turno"
          expandedContent={<ShiftScatterChart data={scatterData} height={500} />}
        >
          <ShiftScatterChart data={scatterData} height={260} />
        </ExpandableChart>
      </div>

      {/* Shift type table */}
      <div className={`${glassStyles.containers.card} !p-3 md:!p-6`}>
        <h3 className="text-sm md:text-lg font-semibold mb-3">Promedios por Tipo de Turno</h3>
        <div className="overflow-x-auto -mx-3 md:mx-0">
          <table className="w-full text-xs md:text-sm min-w-[550px]">
            <thead>
              <tr className="border-b border-gray-200/30">
                <th className="px-3 md:px-4 py-2 text-left font-medium text-gray-500">Turno</th>
                <th className="px-3 md:px-4 py-2 text-right font-medium text-gray-500">Cant.</th>
                <th className="px-3 md:px-4 py-2 text-right font-medium text-gray-500">Buenas</th>
                <th className="px-3 md:px-4 py-2 text-right font-medium text-gray-500">Kilos</th>
                <th className="px-3 md:px-4 py-2 text-right font-medium text-gray-500">Calidad</th>
                <th className="px-3 md:px-4 py-2 text-right font-medium text-gray-500">Dur.</th>
                <th className="px-3 md:px-4 py-2 text-right font-medium text-gray-500">Uds/h</th>
              </tr>
            </thead>
            <tbody>
              {shiftTypeData.map((s) => (
                <tr key={s.shiftName} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 md:px-4 py-2 font-medium">{s.shiftName}</td>
                  <td className="px-3 md:px-4 py-2 text-right">{s.shiftCount}</td>
                  <td className="px-3 md:px-4 py-2 text-right text-green-600">{s.goodUnits.toLocaleString()}</td>
                  <td className="px-3 md:px-4 py-2 text-right text-blue-600">{s.totalKg.toLocaleString()}</td>
                  <td className={`px-3 md:px-4 py-2 text-right ${s.qualityPct >= 95 ? "text-green-600" : "text-orange-500"}`}>
                    {s.qualityPct}%
                  </td>
                  <td className="px-3 md:px-4 py-2 text-right">
                    {Math.floor(s.avgDurationMinutes / 60)}h {s.avgDurationMinutes % 60}m
                  </td>
                  <td className="px-3 md:px-4 py-2 text-right font-medium">{s.avgUnitsPerHour}</td>
                </tr>
              ))}
              {shiftTypeData.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Sin datos para el período seleccionado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
