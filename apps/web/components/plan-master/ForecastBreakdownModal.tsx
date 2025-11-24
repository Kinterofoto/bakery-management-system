"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { formatNumber } from "@/lib/format-utils"

interface WeeklyDemand {
  weekStart: string
  demand: number
}

interface ClientDemand {
  clientName: string
  demand: number
  percentage: number
}

interface ForecastBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  productName: string
  emaForecast: number
}

const ALPHA = 0.3 // EMA smoothing factor

function getWeekKey(date: Date): string {
  const d = new Date(date)
  const weekStart = new Date(d)
  weekStart.setDate(d.getDate() - d.getDay())
  return weekStart.toISOString().split('T')[0]
}

function calculateEMA(weeklyDemands: number[], alpha: number = 0.3): number {
  if (weeklyDemands.length === 0) return 0

  let ema = weeklyDemands[0]
  for (let i = 1; i < weeklyDemands.length; i++) {
    ema = (alpha * weeklyDemands[i]) + ((1 - alpha) * ema)
  }
  return ema
}

export function ForecastBreakdownModal({
  isOpen,
  onClose,
  productId,
  productName,
  emaForecast
}: ForecastBreakdownModalProps) {
  const [weeklyData, setWeeklyData] = useState<WeeklyDemand[]>([])
  const [clientData, setClientData] = useState<ClientDemand[]>([])
  const [totalDemand, setTotalDemand] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && productId) {
      fetchForecastData()
    }
  }, [isOpen, productId])

  const fetchForecastData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch ALL order items using pagination to bypass Supabase's 1000 row limit (same as use-product-demand-forecast)
      let orderItems: any[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from("order_items")
          .select("product_id, quantity_requested, quantity_delivered, order_id")
          .eq("product_id", productId)
          .not("order_id", "is", null)
          .range(from, from + pageSize - 1)

        if (error) throw error

        if (data && data.length > 0) {
          orderItems = [...orderItems, ...data]
          from += pageSize
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
      }

      // Get orders - NO status filter to include ALL orders for historical data
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, status, created_at, client_id")
        .not("client_id", "is", null)

      if (ordersError) throw ordersError

      // Get clients
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, name")

      if (clientsError) throw clientsError

      // Get product config for units_per_package (exactly as in hook)
      const { data: productConfig, error: configError } = await supabase
        .from("product_config")
        .select("product_id, units_per_package")
        .eq("product_id", productId)

      if (configError) throw configError

      const unitsPerPackage = (productConfig as any)?.[0]?.units_per_package || 1

      // Create lookup maps
      const orderMap = new Map((orders as any)?.map((o: any) => [o.id, o]) || [])
      const clientMap = new Map((clients as any)?.map((c: any) => [c.id, c.name]) || [])

      // Group demand by week - using exact same logic as use-product-demand-forecast
      const weeklyDemands = new Map<string, number>()
      const clientDemands = new Map<string, number>()

      if (orderItems) {
        orderItems.forEach((item: any) => {
          const order = orderMap.get(item.order_id)
          if (order) {
            const weekKey = getWeekKey(new Date(order.created_at))
            // Convert packages to units (item quantities are in packages)
            const pending = (item.quantity_requested || 0) - (item.quantity_delivered || 0)

            if (pending > 0) {
              // Multiply by units_per_package to get units (exact same as hook)
              const demandUnits = pending * unitsPerPackage
              weeklyDemands.set(weekKey, (weeklyDemands.get(weekKey) || 0) + Math.max(0, demandUnits))

              // Only count for client breakdown if order is pending (not delivered/cancelled)
              if (order.status && ['received', 'review_area1', 'review_area2', 'ready_dispatch', 'dispatched', 'in_delivery'].includes(order.status)) {
                const clientName = clientMap.get(order.client_id) || "Sin nombre"
                clientDemands.set(clientName, (clientDemands.get(clientName) || 0) + demandUnits)
              }
            }
          }
        })
      }

      // Get last 8 weeks of data - exactly as in hook
      const sortedWeeks = Array.from(weeklyDemands.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 8)
        .reverse()

      const demands = sortedWeeks.map(([_, demand]) => demand)

      const weeklyArray: WeeklyDemand[] = sortedWeeks.map(([weekStart, demand]) => ({
        weekStart,
        demand: Math.ceil(demand)
      }))

      // Calculate total demand from current orders (pending only)
      const total = Array.from(clientDemands.values()).reduce((sum, val) => sum + val, 0)
      setTotalDemand(Math.ceil(total))

      // Calculate client percentages
      const clientArray: ClientDemand[] = Array.from(clientDemands.entries())
        .map(([name, demand]) => ({
          clientName: name,
          demand: Math.ceil(demand),
          percentage: total > 0 ? (demand / total) * 100 : 0
        }))
        .sort((a, b) => b.demand - a.demand)

      setWeeklyData(weeklyArray)
      setClientData(clientArray)
    } catch (err) {
      console.error("Error fetching forecast breakdown:", err)
      setError(err instanceof Error ? err.message : "Error fetching data")
    } finally {
      setLoading(false)
    }
  }

  const calculations = useMemo(() => {
    // Get demands from weekly data
    const demands = weeklyData.map(w => w.demand)
    const avgDemand = demands.length > 0 ? demands.reduce((a, b) => a + b, 0) / demands.length : 0
    const maxDemand = demands.length > 0 ? Math.max(...demands) : 0
    const minDemand = demands.length > 0 ? Math.min(...demands) : 0
    
    return {
      weeksOfData: demands.length,
      averageDemand: Math.ceil(avgDemand),
      maxDemand: Math.ceil(maxDemand),
      minDemand: Math.ceil(minDemand),
      alpha: ALPHA,
      eemaForecast: Math.ceil(emaForecast)
    }
  }, [weeklyData, emaForecast])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-[#0A0A0A] border-[#1C1C1E] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">
            Análisis de Demanda Proyectada - {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-[#8E8E93]">Cargando análisis...</div>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-[#FF453A]">{error}</div>
            </div>
          ) : (
            <>
              {/* Formula and Calculation */}
              <div className="p-4 bg-[#1C1C1E] rounded-lg border border-[#2C2C2E] space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-[#8E8E93] mb-2">¿Cómo se calcula la Demanda Proyectada?</div>
                    <div className="text-white font-mono text-sm bg-black p-2 rounded">
                      EMA = α × Demanda_Actual + (1 - α) × EMA_Anterior
                    </div>
                    <div className="text-xs text-[#8E8E93] mt-2">
                      Se aplica Media Móvil Exponencial (EMA) a las últimas {calculations.weeksOfData} semanas de demanda histórica
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 p-3 bg-black rounded">
                    <div>
                      <div className="text-xs text-[#8E8E93] mb-1">Demanda Mínima</div>
                      <div className="text-xl font-bold text-[#FF453A]">{formatNumber(calculations.minDemand)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#8E8E93] mb-1">Demanda Promedio</div>
                      <div className="text-xl font-bold text-[#30D158]">{formatNumber(calculations.averageDemand)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#8E8E93] mb-1">Demanda Máxima</div>
                      <div className="text-xl font-bold text-[#0A84FF]">{formatNumber(calculations.maxDemand)}</div>
                    </div>
                  </div>

                  <div className="border-t border-[#2C2C2E] pt-4">
                    <div className="text-sm text-[#8E8E93] mb-2">Demanda Proyectada (EMA con α = {calculations.alpha})</div>
                    <div className="text-3xl font-bold text-[#FF9500] p-4 bg-[#FF9500]/10 rounded border border-[#FF9500]/30">
                      {formatNumber(calculations.eemaForecast)} und
                    </div>
                    <div className="text-xs text-[#8E8E93] mt-3">
                      Este valor representa la tendencia suavizada de la demanda, ponderando más los datos recientes. 
                      Se usa como estimación de demanda para la siguiente semana.
                    </div>
                  </div>
                </div>
              </div>

              {/* Weekly Demand Breakdown */}
              {weeklyData.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-white">Demanda por Semana (Últimas 8)</div>
                  <div className="space-y-2">
                    {weeklyData.map((week, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-[#1C1C1E] rounded-lg">
                        <div className="w-24 flex-shrink-0">
                          <span className="text-xs text-[#8E8E93]">
                            Semana {format(new Date(week.weekStart), "dd MMM", { locale: es })}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="h-6 bg-[#0A84FF]/20 rounded flex items-center px-2">
                            <div
                              className="h-full bg-[#0A84FF] rounded"
                              style={{
                                width: `${(week.demand / Math.max(...weeklyData.map(w => w.demand))) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                        <div className="w-16 text-right">
                          <span className="text-sm font-semibold text-white">{formatNumber(week.demand)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Client Breakdown */}
              {clientData.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-white">Demanda por Cliente (Actual)</div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {clientData.map((client, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-[#1C1C1E] rounded-lg border border-[#2C2C2E]"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-white text-sm">{client.clientName}</div>
                          <div className="text-xs text-[#8E8E93] mt-1">
                            {formatNumber(client.demand)} und ({client.percentage.toFixed(1)}%)
                          </div>
                        </div>
                        <div className="w-20">
                          <div className="h-2 bg-[#30D158]/20 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#30D158] rounded-full"
                              style={{ width: `${Math.min(client.percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-[#1C1C1E] rounded-lg border border-[#2C2C2E] font-semibold">
                    <div className="flex items-center justify-between">
                      <span className="text-white">Total Demanda Actual (Órdenes Pendientes)</span>
                      <span className="text-[#30D158]">{formatNumber(totalDemand)} und</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="p-4 bg-[#1C1C1E] rounded-lg border border-[#2C2C2E] space-y-2">
                <div className="text-sm text-[#8E8E93] mb-2">Resumen</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[#8E8E93]">Demanda Actual (Órdenes):</span>
                    <span className="ml-2 text-white font-semibold">{formatNumber(totalDemand)} und</span>
                  </div>
                  <div>
                    <span className="text-[#8E8E93]">Promedio Semanal:</span>
                    <span className="ml-2 text-white font-semibold">{formatNumber(calculations.averageDemand)} und</span>
                  </div>
                  <div>
                    <span className="text-[#8E8E93]">Factor α (EMA):</span>
                    <span className="ml-2 text-white font-semibold">{calculations.alpha}</span>
                  </div>
                  <div>
                    <span className="text-[#8E8E93]">Demanda Proyectada:</span>
                    <span className="ml-2 text-[#FF9500] font-semibold">{formatNumber(calculations.eemaForecast)} und</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
