"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  PlayCircle,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Clock,
  CheckCircle,
  Activity
} from "lucide-react"
import {
  mockProductionOrders,
  mockPlans,
  mockConflicts
} from "@/lib/mock-data/planmaster-mock"
import Link from "next/link"

export default function ExecutionMonitorPage() {
  // Get active plan
  const activePlan = mockPlans.find(p => p.status === 'firme')

  // Get OPs for active plan
  const activeOps = activePlan
    ? mockProductionOrders.filter(op => op.plan_id === activePlan.id)
    : []

  // Calculate metrics
  const totalPlanned = activeOps.reduce((sum, op) => sum + op.quantity_planned, 0)
  const totalProduced = activeOps.reduce((sum, op) => sum + op.quantity_produced, 0)
  const totalPending = totalPlanned - totalProduced

  const completedOps = activeOps.filter(op => op.status === 'completed').length
  const inProgressOps = activeOps.filter(op => op.status === 'in_progress').length
  const delayedOps = activeOps.filter(op => op.status === 'delayed').length
  const conflictOps = activeOps.filter(op => op.status === 'conflict').length

  const compliancePercentage = totalPlanned > 0 ? Math.round((totalProduced / totalPlanned) * 100) : 0

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/planmaster">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600" />
              Monitor de Ejecución
            </h1>
            <p className="text-gray-600 mt-1">
              {activePlan ? activePlan.plan_name : 'No hay plan activo'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Clock className="w-4 h-4 mr-2" />
            Auto-refresh: ON
          </Button>
        </div>
      </div>

      {!activePlan ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No hay un plan activo en este momento</p>
            <Link href="/planmaster">
              <Button className="mt-4">Ir al Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Real-time Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Cumplimiento en Tiempo Real
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-blue-700">{compliancePercentage}%</p>
                </div>
                <Progress value={compliancePercentage} className="mt-3" />
                <p className="text-xs text-gray-500 mt-2">
                  {totalProduced} / {totalPlanned} unidades
                </p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Completadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-green-700">{completedOps}</p>
                  <p className="text-sm text-gray-500">OPs</p>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {activeOps.length > 0 ? Math.round((completedOps / activeOps.length) * 100) : 0}% del total
                </p>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <PlayCircle className="w-4 h-4" />
                  En Proceso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-yellow-700">{inProgressOps}</p>
                  <p className="text-sm text-gray-500">OPs</p>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Activas en este momento
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Con Problemas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-red-700">{delayedOps + conflictOps}</p>
                  <p className="text-sm text-gray-500">OPs</p>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {delayedOps} retrasadas, {conflictOps} conflictos
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Active Alerts */}
          {mockConflicts.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  Alertas Activas
                </CardTitle>
                <CardDescription>Requieren atención inmediata</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockConflicts.map((conflict) => (
                    <div
                      key={conflict.id}
                      className={`p-4 border rounded-lg ${
                        conflict.severity === 'critical' ? 'bg-red-50 border-red-200' :
                        conflict.severity === 'high' ? 'bg-orange-50 border-orange-200' :
                        'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant="outline"
                              className={
                                conflict.severity === 'critical' ? 'bg-red-100 text-red-800 border-red-300 animate-pulse' :
                                conflict.severity === 'high' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                'bg-yellow-100 text-yellow-800 border-yellow-300'
                              }
                            >
                              {conflict.severity === 'critical' ? 'CRÍTICO' :
                               conflict.severity === 'high' ? 'ALTO' :
                               conflict.severity === 'medium' ? 'MEDIO' : 'BAJO'}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {conflict.type}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Afecta a {conflict.affected_ops.length} OP(s)
                            </span>
                          </div>
                          <p className="font-semibold text-sm mb-1">{conflict.resource_name}</p>
                          <p className="text-sm text-gray-700">{conflict.description}</p>
                          <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                            <p className="text-xs font-medium text-blue-800 mb-1">💡 Solución sugerida:</p>
                            <p className="text-sm text-blue-700">{conflict.suggested_solution}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          Resolver
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Production Status by OP */}
          <Card>
            <CardHeader>
              <CardTitle>Estado de Órdenes de Producción</CardTitle>
              <CardDescription>Vista en tiempo real (actualización automática)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeOps.map((op) => {
                  const completionPercentage = op.quantity_planned > 0
                    ? Math.round((op.quantity_produced / op.quantity_planned) * 100)
                    : 0
                  const variance = op.quantity_produced - op.quantity_planned
                  const isAhead = variance > 0
                  const isBehind = op.status === 'delayed' || (op.status === 'in_progress' && completionPercentage < 50)

                  return (
                    <div
                      key={op.id}
                      className={`p-4 border-l-4 rounded-lg ${
                        op.status === 'completed' ? 'border-l-green-500 bg-green-50' :
                        op.status === 'in_progress' ? 'border-l-yellow-500 bg-yellow-50' :
                        op.status === 'delayed' ? 'border-l-orange-500 bg-orange-50' :
                        op.status === 'conflict' ? 'border-l-red-500 bg-red-50' :
                        'border-l-gray-400 bg-gray-50'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">{op.order_number}</h4>
                            <Badge
                              variant="outline"
                              className={
                                op.status === 'completed' ? 'bg-green-100 text-green-800' :
                                op.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                op.status === 'delayed' ? 'bg-orange-100 text-orange-800' :
                                op.status === 'conflict' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }
                            >
                              {op.status === 'completed' ? 'Completado' :
                               op.status === 'in_progress' ? 'En Proceso' :
                               op.status === 'delayed' ? 'Retrasado' :
                               op.status === 'conflict' ? 'Conflicto' : 'Pendiente'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">
                            {op.product_name} - {op.work_center_name}
                          </p>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                            <div>
                              <p className="text-gray-500 text-xs">Planeado</p>
                              <p className="font-semibold">{op.quantity_planned} und</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Producido</p>
                              <p className="font-semibold text-blue-700">{op.quantity_produced} und</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Varianza</p>
                              <div className="flex items-center gap-1">
                                {isAhead ? (
                                  <TrendingUp className="w-4 h-4 text-green-600" />
                                ) : isBehind ? (
                                  <TrendingDown className="w-4 h-4 text-red-600" />
                                ) : null}
                                <p className={`font-semibold ${
                                  isAhead ? 'text-green-600' :
                                  isBehind ? 'text-red-600' :
                                  'text-gray-600'
                                }`}>
                                  {variance > 0 ? '+' : ''}{variance}
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Progreso</p>
                              <p className="font-semibold">{completionPercentage}%</p>
                            </div>
                          </div>

                          <Progress
                            value={completionPercentage}
                            className={
                              op.status === 'completed' ? '[&>div]:bg-green-500' :
                              op.status === 'in_progress' ? '[&>div]:bg-yellow-500' :
                              op.status === 'delayed' ? '[&>div]:bg-orange-500' :
                              '[&>div]:bg-red-500'
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
