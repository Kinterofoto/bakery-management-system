"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { ArrowLeft, Calendar, Package, RefreshCw, Info } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMaterialExplosion } from "@/hooks/use-material-explosion"
import { Card } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function MaterialExplosionPage() {
  const router = useRouter()
  const { data, loading, refresh, getRequirement } = useMaterialExplosion()

  // Función para formatear fecha en español
  const formatDateSpanish = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: months[date.getMonth()],
      full: `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`
    }
  }

  // Función para formatear cantidad con unidad
  const formatQuantity = (grams: number, unit: string) => {
    // Convertir gramos a la unidad correspondiente
    if (unit === 'kg' || unit === 'KG' || unit === 'Kg') {
      return `${(grams / 1000).toFixed(2)} kg`
    }
    if (unit === 'g' || unit === 'G' || unit === 'gr') {
      return `${grams.toFixed(0)} g`
    }
    // Para otras unidades, asumir que quantity_grams ya está en la unidad correcta
    return `${grams.toFixed(2)} ${unit}`
  }

  return (
    <RouteGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/compras')}
                className="bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/30 dark:border-white/20 rounded-xl hover:bg-white/30 dark:hover:bg-black/30"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Explosión de Materiales
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Necesidades de materia prima basadas en producción programada
                </p>
              </div>
            </div>

            <Button
              onClick={refresh}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>

          {/* Info Card */}
          <Card className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Importante:</strong> Las fechas mostradas indican cuándo debe llegar la materia prima.
                  Se calculan automáticamente restando 2 días a la fecha de producción programada.
                </p>
              </div>
            </div>
          </Card>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">Calculando explosión de materiales...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && data.materials.length === 0 && (
            <Card className="p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-6">
                  <Package className="w-12 h-12 text-slate-400 mx-auto" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                No hay datos disponibles
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                No hay producción programada o no hay BOMs configurados
              </p>
            </Card>
          )}

          {/* Material Explosion Grid */}
          {!loading && data.materials.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Grid Container with Horizontal Scroll */}
              <div className="overflow-x-auto">
                <div className="min-w-max">
                  {/* Header Row */}
                  <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    {/* Material Column Header - Fixed */}
                    <div className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
                      <div className="w-64 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-500" />
                          <span className="font-semibold text-slate-900 dark:text-white">
                            Materia Prima
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Date Headers */}
                    {data.dates.map(date => {
                      const formatted = formatDateSpanish(date)
                      return (
                        <div
                          key={date}
                          className="min-w-[140px] border-r border-slate-200 dark:border-slate-700 px-3 py-3 text-center"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                              {formatted.day}
                            </div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                              {formatted.date} {formatted.month}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Data Rows */}
                  {data.materials.map((material, idx) => (
                    <div
                      key={material.id}
                      className={`flex ${idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-850'} border-b border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors`}
                    >
                      {/* Material Name - Fixed */}
                      <div className="sticky left-0 z-10 bg-inherit border-r border-slate-200 dark:border-slate-700">
                        <div className="w-64 px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {material.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Unidad: {material.unit}
                          </div>
                        </div>
                      </div>

                      {/* Quantity Cells */}
                      {data.dates.map(date => {
                        const requirement = getRequirement(material.id, date)

                        return (
                          <div
                            key={date}
                            className="min-w-[140px] border-r border-slate-200 dark:border-slate-700 px-3 py-3 text-center"
                          >
                            {requirement ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="cursor-help">
                                      <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                        {formatQuantity(requirement.quantity_needed, material.unit)}
                                      </div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Producción: {formatDateSpanish(requirement.production_date).full}
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <div className="space-y-2">
                                      <div className="font-semibold border-b pb-2">
                                        Detalle de Producción
                                      </div>
                                      {requirement.products.map((prod, i) => (
                                        <div key={i} className="text-xs">
                                          <div className="font-medium">{prod.product_name}</div>
                                          <div className="text-slate-400">
                                            {prod.production_quantity} unidades → {formatQuantity(prod.material_quantity_needed, material.unit)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <div className="text-slate-300 dark:text-slate-700">
                                -
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Footer */}
              <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-slate-600 dark:text-slate-400">
                    {data.materials.length} materiales × {data.dates.length} fechas
                  </div>
                  <div className="text-slate-500 dark:text-slate-500">
                    Tiempo de anticipación: 2 días
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </RouteGuard>
  )
}
