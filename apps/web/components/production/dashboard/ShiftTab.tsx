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
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpandableChart
          title="Comparación por Tipo de Turno"
          description="Unidades y eficiencia por turno"
        >
          {barData.length > 0 ? (
            <ChartContainer config={shiftChartConfig} className="w-full" style={{ height: 300 }}>
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
          <ShiftScatterChart data={scatterData} />
        </ExpandableChart>
      </div>

      {/* Shift type table */}
      <div className={glassStyles.containers.card}>
        <h3 className={`${glassStyles.typography.headline} mb-4`}>Promedios por Tipo de Turno</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={glassStyles.table.header}>
                <th className={`${glassStyles.table.cell} text-left font-medium`}>Turno</th>
                <th className={`${glassStyles.table.cell} text-right font-medium`}>Cantidad</th>
                <th className={`${glassStyles.table.cell} text-right font-medium`}>Uds. Buenas</th>
                <th className={`${glassStyles.table.cell} text-right font-medium`}>Kilos</th>
                <th className={`${glassStyles.table.cell} text-right font-medium`}>Calidad %</th>
                <th className={`${glassStyles.table.cell} text-right font-medium`}>Dur. Prom.</th>
                <th className={`${glassStyles.table.cell} text-right font-medium`}>Uds/Hora</th>
              </tr>
            </thead>
            <tbody>
              {shiftTypeData.map((s) => (
                <tr key={s.shiftName} className={glassStyles.table.row}>
                  <td className={`${glassStyles.table.cell} font-medium`}>{s.shiftName}</td>
                  <td className={`${glassStyles.table.cell} text-right`}>{s.shiftCount}</td>
                  <td className={`${glassStyles.table.cell} text-right text-green-600`}>{s.goodUnits.toLocaleString()}</td>
                  <td className={`${glassStyles.table.cell} text-right text-blue-600`}>{s.totalKg.toLocaleString()}</td>
                  <td className={`${glassStyles.table.cell} text-right ${s.qualityPct >= 95 ? "text-green-600" : "text-orange-500"}`}>
                    {s.qualityPct}%
                  </td>
                  <td className={`${glassStyles.table.cell} text-right`}>
                    {Math.floor(s.avgDurationMinutes / 60)}h {s.avgDurationMinutes % 60}min
                  </td>
                  <td className={`${glassStyles.table.cell} text-right font-medium`}>{s.avgUnitsPerHour}</td>
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
