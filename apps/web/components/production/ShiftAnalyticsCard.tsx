"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Target, Clock, AlertTriangle } from "lucide-react"
import { useProductionAnalytics } from "@/hooks/use-production-analytics"

interface Props {
  shiftId: string
}

export function ShiftAnalyticsCard({ shiftId }: Props) {
  const { analyzeShiftProduction, loading } = useProductionAnalytics()
  const [analytics, setAnalytics] = useState<any[]>([])

  useEffect(() => {
    const loadAnalytics = async () => {
      const data = await analyzeShiftProduction(shiftId)
      setAnalytics(data)
    }
    
    loadAnalytics()
    
    // Actualizar cada 5 minutos
    const interval = setInterval(loadAnalytics, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [shiftId, analyzeShiftProduction])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    )
  }

  if (analytics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Análisis de Productividad
          </CardTitle>
          <CardDescription>
            No hay datos suficientes para el análisis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            Inicia algunas producciones y configura parámetros de productividad para ver el análisis
          </p>
        </CardContent>
      </Card>
    )
  }

  const overallEfficiency = analytics.reduce((sum, item) => {
    const efficiency = item.theoreticalUnits > 0 
      ? (item.actualUnits / item.theoreticalUnits) * 100 
      : 0
    return sum + efficiency
  }, 0) / analytics.length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Análisis de Productividad
        </CardTitle>
        <CardDescription>
          Comparación de producción real vs teórica
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Efficiency */}
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Eficiencia General</h4>
            <Badge 
              variant={overallEfficiency >= 90 ? "default" : overallEfficiency >= 70 ? "secondary" : "destructive"}
              className={
                overallEfficiency >= 90 ? "bg-green-600" : 
                overallEfficiency >= 70 ? "bg-yellow-600" : ""
              }
            >
              {overallEfficiency.toFixed(1)}%
            </Badge>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                overallEfficiency >= 90 ? "bg-green-500" : 
                overallEfficiency >= 70 ? "bg-yellow-500" : "bg-red-500"
              }`}
              style={{ width: `${Math.min(overallEfficiency, 100)}%` }}
            />
          </div>
        </div>

        {/* Individual Productions */}
        <div className="space-y-3">
          <h4 className="font-medium">Análisis por Producto</h4>
          {analytics.map((item, index) => (
            <div key={index} className="border rounded-lg p-3 bg-white">
              <div className="flex justify-between items-start mb-2">
                <h5 className="font-medium text-sm">{item.productName}</h5>
                <div className="flex items-center gap-1">
                  {item.variancePercentage > 10 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : item.variancePercentage < -10 ? (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  ) : (
                    <Target className="w-4 h-4 text-gray-500" />
                  )}
                  <Badge 
                    variant={
                      Math.abs(item.variancePercentage) <= 10 ? "default" : 
                      item.variancePercentage > 0 ? "secondary" : "destructive"
                    }
                    className={
                      Math.abs(item.variancePercentage) <= 10 ? "bg-green-600" :
                      item.variancePercentage > 0 ? "bg-blue-600" : ""
                    }
                  >
                    {item.variancePercentage > 0 ? "+" : ""}{item.variancePercentage.toFixed(1)}%
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="text-center">
                  <div className="font-bold text-green-600">{item.actualUnits}</div>
                  <div className="text-gray-500">Real</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-blue-600">{item.theoreticalUnits.toFixed(0)}</div>
                  <div className="text-gray-500">Teórico</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-gray-600">{item.variance > 0 ? "+" : ""}{item.variance.toFixed(0)}</div>
                  <div className="text-gray-500">Diferencia</div>
                </div>
              </div>
              
              <div className="mt-2 pt-2 border-t">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.hoursWorked.toFixed(1)}h trabajadas
                  </span>
                  <span>{item.unitsPerHour} u/h configurado</span>
                </div>
              </div>

              {Math.abs(item.variancePercentage) > 25 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                  <span className="text-xs text-yellow-700">
                    Desviación significativa detectada. Revisa el proceso de producción.
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800 text-sm mb-1">💡 Consejos</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Verde: Producción dentro del rango esperado (±10%)</li>
            <li>• Azul: Producción por encima de lo esperado (+10%)</li>
            <li>• Rojo: Producción por debajo de lo esperado (-10%)</li>
            <li>• Configura parámetros de productividad para mejorar la precisión</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}