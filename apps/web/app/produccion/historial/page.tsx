"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Calendar, Clock, Package, TrendingUp, CheckCircle2, Factory } from "lucide-react"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { useProductionShifts } from "@/hooks/use-production-shifts"
import { useShiftProductions } from "@/hooks/use-shift-productions"
import { useProducts } from "@/hooks/use-products"

export default function HistorialGeneralPage() {
  const router = useRouter()

  const { workCenters, getWorkCenterById } = useWorkCenters()
  const { shifts, loading: shiftsLoading } = useProductionShifts()
  const { productions, loading: productionsLoading } = useShiftProductions()
  const { getProductById } = useProducts()

  const [selectedWorkCenter, setSelectedWorkCenter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<"week" | "month" | "all">("week")

  // Filtrar turnos completados
  const completedShifts = shifts.filter(shift => {
    const matchesWorkCenter = selectedWorkCenter === "all" || shift.work_center_id === selectedWorkCenter
    const isCompleted = shift.status === "completed"
    return matchesWorkCenter && isCompleted
  }).sort((a, b) => {
    const aDate = a.ended_at || a.started_at
    const bDate = b.ended_at || b.started_at
    const aUtc = aDate.endsWith('Z') ? aDate : aDate + 'Z'
    const bUtc = bDate.endsWith('Z') ? bDate : bDate + 'Z'
    return new Date(bUtc).getTime() - new Date(aUtc).getTime()
  })

  // Filtrar por rango de fechas
  const getFilteredShifts = () => {
    const now = new Date()
    const filtered = completedShifts.filter(shift => {
      const utcString = shift.started_at.endsWith('Z') ? shift.started_at : shift.started_at + 'Z'
      const shiftDate = new Date(utcString)

      if (dateRange === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return shiftDate >= weekAgo
      } else if (dateRange === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        return shiftDate >= monthAgo
      }
      return true
    })
    return filtered
  }

  const filteredShifts = getFilteredShifts()

  // Calcular estadísticas
  const totalShifts = filteredShifts.length
  const totalGoodUnits = filteredShifts.reduce((sum, shift) => {
    const shiftProductions = productions.filter(p => p.shift_id === shift.id)
    return sum + shiftProductions.reduce((s, p) => s + p.total_good_units, 0)
  }, 0)
  const totalBadUnits = filteredShifts.reduce((sum, shift) => {
    const shiftProductions = productions.filter(p => p.shift_id === shift.id)
    return sum + shiftProductions.reduce((s, p) => s + p.total_bad_units, 0)
  }, 0)
  const totalUnits = totalGoodUnits + totalBadUnits
  const qualityPercentage = totalUnits > 0 ? ((totalGoodUnits / totalUnits) * 100).toFixed(1) : "0"

  // Calcular tiempo total de producción
  const totalMinutes = filteredShifts.reduce((sum, shift) => {
    if (shift.ended_at) {
      const startedAtUtc = shift.started_at.endsWith('Z') ? shift.started_at : shift.started_at + 'Z'
      const endedAtUtc = shift.ended_at.endsWith('Z') ? shift.ended_at : shift.ended_at + 'Z'
      const duration = new Date(endedAtUtc).getTime() - new Date(startedAtUtc).getTime()
      return sum + Math.floor(duration / (1000 * 60))
    }
    return sum
  }, 0)
  const totalHours = Math.floor(totalMinutes / 60)

  // Estadísticas por centro de trabajo
  const workCenterStats = workCenters.map(wc => {
    const wcShifts = filteredShifts.filter(s => s.work_center_id === wc.id)
    const wcGoodUnits = wcShifts.reduce((sum, shift) => {
      const shiftProductions = productions.filter(p => p.shift_id === shift.id)
      return sum + shiftProductions.reduce((s, p) => s + p.total_good_units, 0)
    }, 0)
    const wcBadUnits = wcShifts.reduce((sum, shift) => {
      const shiftProductions = productions.filter(p => p.shift_id === shift.id)
      return sum + shiftProductions.reduce((s, p) => s + p.total_bad_units, 0)
    }, 0)
    const wcTotalUnits = wcGoodUnits + wcBadUnits

    return {
      workCenter: wc,
      shifts: wcShifts.length,
      totalUnits: wcTotalUnits,
      goodUnits: wcGoodUnits,
      badUnits: wcBadUnits,
      quality: wcTotalUnits > 0 ? ((wcGoodUnits / wcTotalUnits) * 100).toFixed(1) : "0"
    }
  }).filter(stat => stat.shifts > 0)

  const getShiftProductions = (shiftId: string) => {
    return productions.filter(p => p.shift_id === shiftId)
  }

  const formatDuration = (startedAt: string, endedAt: string | null) => {
    if (!endedAt) return "N/A"
    const startedAtUtc = startedAt.endsWith('Z') ? startedAt : startedAt + 'Z'
    const endedAtUtc = endedAt.endsWith('Z') ? endedAt : endedAt + 'Z'
    const duration = new Date(endedAtUtc).getTime() - new Date(startedAtUtc).getTime()
    const minutes = Math.floor(duration / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (minutes < 0) return "Error en duración"

    return `${hours}h ${remainingMinutes}min`
  }

  const formatBogotaDate = (dateString: string) => {
    const utcString = dateString.endsWith('Z') ? dateString : dateString + 'Z'
    const utcDate = new Date(utcString)
    const bogotaTime = new Date(utcDate.getTime() - (5 * 60 * 60 * 1000))

    const day = String(bogotaTime.getUTCDate()).padStart(2, '0')
    const month = String(bogotaTime.getUTCMonth() + 1).padStart(2, '0')
    const year = bogotaTime.getUTCFullYear()
    const hours = String(bogotaTime.getUTCHours()).padStart(2, '0')
    const minutes = String(bogotaTime.getUTCMinutes()).padStart(2, '0')

    return `${day}/${month}/${year}, ${hours}:${minutes}`
  }

  const loading = shiftsLoading || productionsLoading

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/produccion")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Historial General de Producción</h1>
            <p className="text-gray-600">Todos los centros de trabajo</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Centro de Trabajo
              </label>
              <Select value={selectedWorkCenter} onValueChange={setSelectedWorkCenter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Factory className="w-4 h-4" />
                      Todos los centros
                    </div>
                  </SelectItem>
                  {workCenters.map((wc) => (
                    <SelectItem key={wc.id} value={wc.id}>
                      <div className="flex items-center gap-2">
                        <Factory className="w-4 h-4" />
                        {wc.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Período
              </label>
              <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mes</SelectItem>
                  <SelectItem value="all">Todo el historial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Turnos Completados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-blue-700">{totalShifts}</p>
              <CheckCircle2 className="w-5 h-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Unidades Producidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-green-700">{totalUnits.toLocaleString()}</p>
              <Package className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">{totalGoodUnits.toLocaleString()} buenas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Calidad Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-purple-700">{qualityPercentage}%</p>
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Tiempo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-orange-700">{totalHours}h</p>
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas por Centro de Trabajo */}
      {selectedWorkCenter === "all" && workCenterStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen por Centro de Trabajo</CardTitle>
            <CardDescription>
              Estadísticas del período seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workCenterStats.map((stat) => (
                <Card key={stat.workCenter.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Factory className="w-5 h-5 text-blue-600" />
                      <CardTitle className="text-base">{stat.workCenter.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Turnos:</span>
                      <span className="font-semibold">{stat.shifts}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Unidades:</span>
                      <span className="font-semibold">{stat.totalUnits.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Calidad:</span>
                      <Badge variant={parseFloat(stat.quality) >= 95 ? "default" : "secondary"} className={parseFloat(stat.quality) >= 95 ? "bg-green-600" : ""}>
                        {stat.quality}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de Turnos */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Turnos</CardTitle>
          <CardDescription>
            Turnos completados en orden cronológico descendente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredShifts.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay turnos completados</h3>
              <p className="text-gray-600">No se encontraron turnos completados en el período seleccionado.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredShifts.map((shift) => {
                const workCenter = getWorkCenterById(shift.work_center_id)
                const shiftProductions = getShiftProductions(shift.id)
                const shiftGoodUnits = shiftProductions.reduce((sum, p) => sum + p.total_good_units, 0)
                const shiftBadUnits = shiftProductions.reduce((sum, p) => sum + p.total_bad_units, 0)
                const shiftTotalUnits = shiftGoodUnits + shiftBadUnits
                const shiftQuality = shiftTotalUnits > 0
                  ? ((shiftGoodUnits / shiftTotalUnits) * 100).toFixed(1)
                  : "0"

                return (
                  <Card key={shift.id} className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h4 className="font-semibold text-gray-900">{shift.shift_name}</h4>
                            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                              <Factory className="w-3 h-3 mr-1" />
                              {workCenter?.name || "Centro desconocido"}
                            </Badge>
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Completado
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-gray-500 text-xs">Inicio</p>
                              <p className="font-medium text-xs md:text-sm">
                                {formatBogotaDate(shift.started_at)}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-500 text-xs">Fin</p>
                              <p className="font-medium text-xs md:text-sm">
                                {shift.ended_at ? formatBogotaDate(shift.ended_at) : "N/A"}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-500 text-xs">Duración</p>
                              <p className="font-medium">{formatDuration(shift.started_at, shift.ended_at)}</p>
                            </div>

                            <div>
                              <p className="text-gray-500 text-xs">Producciones</p>
                              <p className="font-medium">{shiftProductions.length}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex md:flex-col gap-3 md:items-end">
                          <div className="text-center md:text-right">
                            <p className="text-xs text-gray-500">Unidades Producidas</p>
                            <p className="text-2xl font-bold text-green-600">{shiftTotalUnits}</p>
                          </div>
                          <div className="text-center md:text-right">
                            <p className="text-xs text-gray-500">Calidad</p>
                            <p className="text-2xl font-bold text-purple-600">{shiftQuality}%</p>
                          </div>
                        </div>
                      </div>

                      {/* Productions in this shift */}
                      {shiftProductions.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm font-medium text-gray-700 mb-2">Producciones:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {shiftProductions.map((prod) => {
                              const product = getProductById(prod.product_id)
                              return (
                                <div key={prod.id} className="bg-gray-50 p-2 rounded border">
                                  <p className="font-medium text-sm truncate">{product?.name || "Producto"}</p>
                                  <div className="flex justify-between text-xs mt-1">
                                    <span className="text-green-600">{prod.total_good_units} buenas</span>
                                    <span className="text-red-600">{prod.total_bad_units} malas</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
