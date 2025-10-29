"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  Plus,
  Settings,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Factory,
  Package
} from "lucide-react"
import {
  mockPlans,
  getOverallCompliance,
  getActiveAlertsCount,
  getCriticalMaterialsCount
} from "@/lib/mock-data/planmaster-mock"
import { ComplianceGauge } from "@/components/planmaster/ComplianceGauge"
import { TimelineVisualization } from "@/components/planmaster/TimelineVisualization"
import { FiltersPanel } from "@/components/planmaster/FiltersPanel"
import { RouteGuard } from "@/components/auth/RouteGuard"
import Link from "next/link"

export default function PlanMasterPage() {
  const [selectedView, setSelectedView] = useState<'product' | 'machine' | 'client' | 'order' | 'material'>('product')
  const [selectedDateRange, setSelectedDateRange] = useState({ from: '2025-10-20', to: '2025-11-02' })

  const overallCompliance = getOverallCompliance()
  const activePlansCount = mockPlans.filter(p => p.status === 'firme' || p.status === 'in_review').length
  const activeOpsCount = mockPlans.reduce((sum, plan) => sum + plan.total_ops, 0)
  const criticalAlertsCount = getActiveAlertsCount()
  const criticalMaterialsCount = getCriticalMaterialsCount()

  return (
    <RouteGuard>
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            PlanMaster
          </h1>
          <p className="text-gray-600 mt-1">Planeación Maestra de Producción</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {}}
            className="flex-1 sm:flex-none"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configuración
          </Button>
          <Button
            size="sm"
            onClick={() => {}}
            className="flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear Plan
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compliance Gauge */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Cumplimiento General
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ComplianceGauge percentage={overallCompliance} />
          </CardContent>
        </Card>

        {/* Active Plans */}
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Factory className="w-4 h-4" />
              Planes Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-green-700">{activePlansCount}</p>
              <p className="text-sm text-gray-500">planes</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {mockPlans.filter(p => p.status === 'firme').length} en firme, {mockPlans.filter(p => p.status === 'in_review').length} en revisión
            </p>
          </CardContent>
        </Card>

        {/* OPs in Process */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Package className="w-4 h-4" />
              OPs Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-purple-700">{activeOpsCount}</p>
              <p className="text-sm text-gray-500">órdenes</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Distribuidas en {activePlansCount} planes activos
            </p>
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Alertas Críticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-red-700">{criticalAlertsCount}</p>
              <p className="text-sm text-gray-500">conflictos</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {criticalMaterialsCount} materiales críticos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Panel */}
      <FiltersPanel
        selectedView={selectedView}
        onViewChange={setSelectedView}
        dateRange={selectedDateRange}
        onDateRangeChange={setSelectedDateRange}
      />

      {/* Main Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Timeline de Producción
          </CardTitle>
          <CardDescription>
            Vista {selectedView === 'product' ? 'por Producto' :
                   selectedView === 'machine' ? 'por Máquina' :
                   selectedView === 'client' ? 'por Cliente' :
                   selectedView === 'order' ? 'por Pedido' : 'por Materiales'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TimelineVisualization
            viewType={selectedView}
            dateRange={selectedDateRange}
          />
        </CardContent>
      </Card>

      {/* Recent Plans List */}
      <Card>
        <CardHeader>
          <CardTitle>Planes Recientes</CardTitle>
          <CardDescription>Historial de planes de producción</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockPlans.map((plan) => (
              <Link key={plan.id} href={`/planmaster/plan/${plan.id}`}>
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-gray-900">{plan.plan_name}</h4>
                      <Badge
                        variant={
                          plan.status === 'firme' ? 'default' :
                          plan.status === 'completed' ? 'secondary' :
                          'outline'
                        }
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
                    <p className="text-sm text-gray-500 mt-1">
                      {plan.start_date} - {plan.end_date} | {plan.total_ops} OPs
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {plan.status === 'completed' && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-600">Cumplimiento</p>
                        <p className={`text-lg font-bold ${
                          plan.compliance_percentage >= 90 ? 'text-green-600' :
                          plan.compliance_percentage >= 70 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {plan.compliance_percentage}%
                        </p>
                      </div>
                    )}
                    {plan.status === 'firme' && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
    </RouteGuard>
  )
}
