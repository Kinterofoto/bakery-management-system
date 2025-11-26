"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { ArrowLeft, RefreshCw, CheckCircle2, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMaterialExplosion } from "@/hooks/use-material-explosion"
import { Card } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CreateOrderFromExplosionDialog } from "@/components/compras/CreateOrderFromExplosionDialog"

export default function MaterialExplosionPage() {
  const router = useRouter()
  const { data, loading, refresh, getRequirement, getRequirementStatus, getTracking } = useMaterialExplosion()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{ materialId: string; date: string } | null>(null)

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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => router.push('/compras')}
                className="bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/30 dark:border-white/20 rounded-xl hover:bg-white/30 dark:hover:bg-black/30"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Explosión de Materiales
              </h1>
            </div>

            <Button
              onClick={refresh}
              disabled={loading}
              variant="ghost"
              size="sm"
              className="h-8"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

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
            <Card className="p-8 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
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
                      <div className="w-64 px-3 py-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white uppercase">
                          Materia Prima
                        </span>
                      </div>
                    </div>

                    {/* Date Headers */}
                    {data.dates.map(date => {
                      const formatted = formatDateSpanish(date)
                      return (
                        <div
                          key={date}
                          className="min-w-[110px] border-r border-slate-200 dark:border-slate-700 px-2 py-2 text-center"
                        >
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">
                            {formatted.day} {formatted.date} {formatted.month}
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
                        <div className="w-64 px-3 py-2">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {material.name} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">{material.unit}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quantity Cells */}
                      {data.dates.map(date => {
                        const requirement = getRequirement(material.id, date)
                        const status = getRequirementStatus(material.id, date)
                        const tracking = getTracking(material.id, date)

                        // Determine cell styling based on status
                        let cellBgColor = 'bg-white dark:bg-slate-800' // not_ordered - default
                        let cellBorderColor = 'border-slate-200 dark:border-slate-700'
                        let textColor = 'text-blue-600 dark:text-blue-400'

                        if (status === 'ordered') {
                          cellBgColor = 'bg-blue-100 dark:bg-blue-900/30'
                          cellBorderColor = 'border-blue-300 dark:border-blue-700'
                        } else if (status === 'received') {
                          cellBgColor = 'bg-green-100 dark:bg-green-900/30'
                          cellBorderColor = 'border-green-300 dark:border-green-700'
                          textColor = 'text-green-600 dark:text-green-400'
                        } else if (status === 'partially_received') {
                          cellBgColor = 'bg-yellow-100 dark:bg-yellow-900/30'
                          cellBorderColor = 'border-yellow-300 dark:border-yellow-700'
                          textColor = 'text-yellow-600 dark:text-yellow-400'
                        }

                        return (
                          <div
                            key={date}
                            className={`min-w-[110px] border-r ${cellBorderColor} px-2 py-2 text-center cursor-pointer hover:opacity-80 transition-opacity ${cellBgColor}`}
                            onClick={() => {
                              if (requirement) {
                                setSelectedCell({ materialId: material.id, date })
                                setDialogOpen(true)
                              }
                            }}
                          >
                            {requirement ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="space-y-1">
                                      <div className={`text-sm font-semibold ${textColor}`}>
                                        {formatQuantity(requirement.quantity_needed, material.unit)}
                                      </div>
                                      {/* Status Indicator */}
                                      {status === 'ordered' && (
                                        <div className="flex items-center justify-center gap-1 text-xs text-blue-700 dark:text-blue-300">
                                          <Clock className="w-3 h-3" />
                                          <span>Pedido</span>
                                        </div>
                                      )}
                                      {status === 'received' && (
                                        <div className="flex items-center justify-center gap-1 text-xs text-green-700 dark:text-green-300">
                                          <CheckCircle2 className="w-3 h-3" />
                                          <span>Recibido</span>
                                        </div>
                                      )}
                                      {status === 'partially_received' && (
                                        <div className="flex items-center justify-center gap-1 text-xs text-yellow-700 dark:text-yellow-300">
                                          <Clock className="w-3 h-3" />
                                          <span>Parcial</span>
                                        </div>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <div className="space-y-2">
                                      <div className="font-semibold border-b pb-2 text-xs">
                                        Producción: {formatDateSpanish(requirement.production_date).full}
                                      </div>
                                      {requirement.products.map((prod, i) => (
                                        <div key={i} className="text-xs">
                                          <div className="font-medium">{prod.product_name}</div>
                                          <div className="text-slate-400">
                                            {prod.production_quantity} unidades → {formatQuantity(prod.material_quantity_needed, material.unit)}
                                          </div>
                                        </div>
                                      ))}
                                      {tracking && (
                                        <>
                                          <div className="border-t pt-2 text-xs font-semibold text-slate-400">
                                            Orden: {tracking.status === 'not_ordered' ? 'No pedida' : 'Pedida'}
                                          </div>
                                          {tracking.quantity_ordered > 0 && (
                                            <div className="text-xs">
                                              Cantidad pedida: {formatQuantity(tracking.quantity_ordered, material.unit)}
                                            </div>
                                          )}
                                          {tracking.quantity_received > 0 && (
                                            <div className="text-xs">
                                              Cantidad recibida: {formatQuantity(tracking.quantity_received, material.unit)}
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <div className="text-slate-300 dark:text-slate-700 text-sm">
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
            </div>
          )}
        </div>

        {/* Create Order Dialog */}
        {selectedCell && (
          <CreateOrderFromExplosionDialog
            isOpen={dialogOpen}
            onClose={() => {
              setDialogOpen(false)
              setSelectedCell(null)
            }}
            materialId={selectedCell.materialId}
            materialName={data.materials.find(m => m.id === selectedCell.materialId)?.name || 'Unknown'}
            requirementDate={selectedCell.date}
            quantityNeeded={getRequirement(selectedCell.materialId, selectedCell.date)?.quantity_needed || 0}
            onOrderCreated={() => {
              refresh()
            }}
          />
        )}
      </div>
    </RouteGuard>
  )
}
