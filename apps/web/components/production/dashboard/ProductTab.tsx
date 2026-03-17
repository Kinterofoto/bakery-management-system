"use client"

import { ExpandableChart } from "./ExpandableChart"
import { ProductBarChart } from "./charts/ProductBarChart"
import { glassStyles } from "@/components/dashboard/glass-styles"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { ProductAggregate } from "@/lib/production-analytics-utils"

const kgChartConfig = {
  totalKg: { label: "Kilos", color: "#2563eb" },
} satisfies ChartConfig

interface ProductTabProps {
  productData: ProductAggregate[]
  loading: boolean
}

export function ProductTab({ productData, loading }: ProductTabProps) {
  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
  }

  const kgData = productData.slice(0, 10).map((d) => ({
    name: d.productName.length > 25 ? d.productName.substring(0, 22) + "..." : d.productName,
    totalKg: d.totalKg,
  }))

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        <ExpandableChart
          title="Producción por Producto"
          description="Unidades buenas vs malas"
          expandedContent={<ProductBarChart data={productData} height={500} limit={20} />}
        >
          <ProductBarChart data={productData} height={260} />
        </ExpandableChart>

        <ExpandableChart
          title="Kilos por Producto"
          description="Top 10 productos por peso"
        >
          {kgData.length > 0 ? (
            <ChartContainer config={kgChartConfig} className="w-full" style={{ height: 260 }}>
              <BarChart data={kgData} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 9 }} />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="totalKg" fill="var(--color-totalKg)" radius={[0, 4, 4, 0]} name="Kilos" />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Sin datos</div>
          )}
        </ExpandableChart>
      </div>

      {/* Product table */}
      <div className={`${glassStyles.containers.card} !p-3 md:!p-6`}>
        <h3 className="text-sm md:text-lg font-semibold mb-3">Detalle por Producto</h3>
        <div className="overflow-x-auto -mx-3 md:mx-0">
          <table className="w-full text-xs md:text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-gray-200/30">
                <th className="px-3 md:px-4 py-2 text-left font-medium text-gray-500">Producto</th>
                <th className="px-3 md:px-4 py-2 text-right font-medium text-gray-500">Buenas</th>
                <th className="px-3 md:px-4 py-2 text-right font-medium text-gray-500">Malas</th>
                <th className="px-3 md:px-4 py-2 text-right font-medium text-gray-500">Kilos</th>
                <th className="px-3 md:px-4 py-2 text-right font-medium text-gray-500">Calidad</th>
                <th className="px-3 md:px-4 py-2 text-right font-medium text-gray-500">Turnos</th>
              </tr>
            </thead>
            <tbody>
              {productData.map((p) => (
                <tr key={p.productId} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 md:px-4 py-2 font-medium">{p.productName}</td>
                  <td className="px-3 md:px-4 py-2 text-right text-green-600">{p.goodUnits.toLocaleString()}</td>
                  <td className="px-3 md:px-4 py-2 text-right text-red-500">{p.badUnits.toLocaleString()}</td>
                  <td className="px-3 md:px-4 py-2 text-right text-blue-600">{p.totalKg.toLocaleString()}</td>
                  <td className={`px-3 md:px-4 py-2 text-right ${p.qualityPct >= 95 ? "text-green-600" : "text-orange-500"}`}>
                    {p.qualityPct}%
                  </td>
                  <td className="px-3 md:px-4 py-2 text-right">{p.shiftCount}</td>
                </tr>
              ))}
              {productData.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Sin datos para el período seleccionado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
