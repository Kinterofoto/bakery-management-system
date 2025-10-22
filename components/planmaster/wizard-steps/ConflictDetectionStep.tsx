"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockConflicts } from "@/lib/mock-data/planmaster-mock"
import { AlertTriangle, Package, Users, Wrench } from "lucide-react"

interface ConflictDetectionStepProps {
  planData: any
  onDataChange: (data: any) => void
}

export function ConflictDetectionStep({ planData, onDataChange }: ConflictDetectionStepProps) {
  const criticalConflicts = mockConflicts.filter(c => c.severity === 'critical')
  const highConflicts = mockConflicts.filter(c => c.severity === 'high')
  const mediumConflicts = mockConflicts.filter(c => c.severity === 'medium')

  const getIcon = (type: string) => {
    switch (type) {
      case 'material':
        return Package
      case 'personnel':
        return Users
      case 'equipment':
      case 'capacity':
        return Wrench
      default:
        return AlertTriangle
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Detección de Conflictos</h3>
        <p className="text-sm text-gray-500 mt-1">
          El sistema identifica automáticamente problemas que podrían generar incumplimientos
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-red-200">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Críticos</p>
            <p className="text-3xl font-bold text-red-700">{criticalConflicts.length}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Alto</p>
            <p className="text-3xl font-bold text-orange-700">{highConflicts.length}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Medio</p>
            <p className="text-3xl font-bold text-yellow-700">{mediumConflicts.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Conflicts List */}
      <Card>
        <CardHeader>
          <CardTitle>Conflictos Detectados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockConflicts.map((conflict) => {
              const Icon = getIcon(conflict.type)
              return (
                <div
                  key={conflict.id}
                  className={`p-4 border-l-4 rounded-lg ${
                    conflict.severity === 'critical' ? 'border-l-red-500 bg-red-50' :
                    conflict.severity === 'high' ? 'border-l-orange-500 bg-orange-50' :
                    'border-l-yellow-500 bg-yellow-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 mt-0.5 ${
                      conflict.severity === 'critical' ? 'text-red-600' :
                      conflict.severity === 'high' ? 'text-orange-600' :
                      'text-yellow-600'
                    }`} />
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
                          {conflict.severity === 'critical' ? 'CRÍTICO' : conflict.severity === 'high' ? 'ALTO' : 'MEDIO'}
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
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
