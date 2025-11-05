"use client"

import { use } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Calendar,
  Package,
  Factory,
  AlertTriangle,
  CheckCircle,
  Clock,
  Lock,
  Edit
} from "lucide-react"
import {
  getPlanById,
  getProductionOrdersByPlanId,
  mockMaterials,
  mockConflicts
} from "@/lib/mock-data/planmaster-mock"
import { ComplianceGauge } from "@/components/planmaster/ComplianceGauge"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const plan = getPlanById(resolvedParams.id)
  const ops = getProductionOrdersByPlanId(resolvedParams.id)

  if (!plan) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Plan no encontrado</p>
          <Button onClick={() => router.push('/planmaster')} className="mt-4">
            Volver al Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const completedOps = ops.filter(op => op.status === 'completed').length
  const inProgressOps = ops.filter(op => op.status === 'in_progress').length
  const conflictOps = ops.filter(op => op.status === 'conflict').length

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/planmaster')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{plan.plan_name}</h1>
              <Badge
                variant={plan.status === 'firme' ? 'default' : 'outline'}
                className={
                  plan.status === 'firme' ? 'bg-green-600' :
                  plan.status === 'completed' ? 'bg-gray-600' :
                  'bg-yellow-600'
                }
              >
                {plan.status === 'firme' ? 'En Firme' :
                 plan.status === 'completed' ? 'Completado' :
                 plan.status === 'in_review' ? 'En Revisión' : 'Borrador'}
              </Badge>
            </div>
            <p className="text-gray-600 mt-1">
              Semana {plan.week_number} - {plan.year}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {plan.status !== 'completed' && (
            <>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              {plan.status !== 'firme' && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <Lock className="w-4 h-4 mr-2" />
                  Dejar en Firme
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-semibold">{plan.start_date}</p>
                <p className="text-xs text-gray-500">al {plan.end_date}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Órdenes de Producción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-purple-700">{plan.total_ops}</p>
              <p className="text-sm text-gray-500">OPs</p>
            </div>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                {completedOps}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {inProgressOps}
              </Badge>
              {conflictOps > 0 && (
                <Badge variant="outline" className="text-xs text-red-600">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {conflictOps}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {plan.status === 'completed' && (
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Cumplimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <ComplianceGauge percentage={plan.compliance_percentage} />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Creado por
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{plan.created_by}</p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(plan.created_at).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </p>
            {plan.locked_at && (
              <Badge variant="outline" className="text-xs mt-2">
                <Lock className="w-3 h-3 mr-1" />
                Locked {new Date(plan.locked_at).toLocaleDateString('es-ES')}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Production Orders List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Órdenes de Producción
          </CardTitle>
          <CardDescription>Lista de OPs programadas en este plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-medium text-gray-600">OP</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Producto</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Centro</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Fecha</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Turno</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-600">Planeado</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-600">Producido</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Estado</th>
                </tr>
              </thead>
              <tbody>
                {ops.map((op) => (
                  <tr key={op.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm font-medium">{op.order_number}</td>
                    <td className="p-3 text-sm">{op.product_name}</td>
                    <td className="p-3 text-sm">{op.work_center_name}</td>
                    <td className="p-3 text-sm">
                      {new Date(op.scheduled_date).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short'
                      })}
                    </td>
                    <td className="p-3 text-sm capitalize">{op.scheduled_shift}</td>
                    <td className="p-3 text-sm text-right">{op.quantity_planned}</td>
                    <td className="p-3 text-sm text-right font-semibold">
                      {op.quantity_produced}
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        variant="outline"
                        className={
                          op.status === 'completed' ? 'bg-green-50 text-green-700 border-green-300' :
                          op.status === 'in_progress' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                          op.status === 'delayed' ? 'bg-orange-50 text-orange-700 border-orange-300' :
                          op.status === 'conflict' ? 'bg-red-50 text-red-700 border-red-300' :
                          'bg-gray-50 text-gray-700 border-gray-300'
                        }
                      >
                        {op.status === 'completed' ? 'Completado' :
                         op.status === 'in_progress' ? 'En Proceso' :
                         op.status === 'delayed' ? 'Retrasado' :
                         op.status === 'conflict' ? 'Conflicto' : 'Pendiente'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Conflicts (if any) */}
      {conflictOps > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Conflictos Detectados
            </CardTitle>
            <CardDescription>Requieren atención inmediata</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockConflicts.slice(0, 3).map((conflict) => (
                <div
                  key={conflict.id}
                  className="p-4 border rounded-lg bg-red-50 border-red-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={
                            conflict.severity === 'critical' ? 'bg-red-100 text-red-800 border-red-300' :
                            conflict.severity === 'high' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                            'bg-yellow-100 text-yellow-800 border-yellow-300'
                          }
                        >
                          {conflict.severity === 'critical' ? 'Crítico' :
                           conflict.severity === 'high' ? 'Alto' :
                           conflict.severity === 'medium' ? 'Medio' : 'Bajo'}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {conflict.type}
                        </Badge>
                      </div>
                      <p className="font-semibold text-sm mb-1">{conflict.resource_name}</p>
                      <p className="text-sm text-gray-700">{conflict.description}</p>
                      <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                        <p className="text-xs font-medium text-blue-800 mb-1">Solución sugerida:</p>
                        <p className="text-sm text-blue-700">{conflict.suggested_solution}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Materials Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="w-5 h-5" />
            Estado de Materiales
          </CardTitle>
          <CardDescription>Materiales requeridos para este plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockMaterials.slice(0, 5).map((material) => (
              <div
                key={material.id}
                className={`p-4 border rounded-lg ${
                  material.status === 'critical' ? 'bg-red-50 border-red-200' :
                  material.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{material.name}</h4>
                      <Badge
                        variant="outline"
                        className={
                          material.status === 'critical' ? 'bg-red-100 text-red-800' :
                          material.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }
                      >
                        {material.status === 'critical' ? 'Crítico' :
                         material.status === 'warning' ? 'Advertencia' : 'OK'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Requerido</p>
                        <p className="font-semibold">{material.total_required_grams}g</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Inventario</p>
                        <p className="font-semibold">{material.current_inventory_grams}g</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Faltante</p>
                        <p className={`font-semibold ${material.net_requirement_grams > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {material.net_requirement_grams}g
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Proveedor</p>
                        <p className="font-semibold truncate">{material.supplier_name}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
