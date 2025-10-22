"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface WeeklyReviewStepProps {
  planData: any
  onDataChange: (data: any) => void
}

export function WeeklyReviewStep({ planData, onDataChange }: WeeklyReviewStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Revisión Semanal</h3>
        <p className="text-sm text-gray-500 mt-1">
          Verifica el cumplimiento de la semana en curso
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cumplimiento Semana Actual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span>Cumplimiento general</span>
              <span className="font-semibold">87%</span>
            </div>
            <Progress value={87} />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center p-3 bg-green-50 rounded">
              <p className="text-2xl font-bold text-green-700">12</p>
              <p className="text-xs text-gray-600">OPs Completadas</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded">
              <p className="text-2xl font-bold text-yellow-700">2</p>
              <p className="text-xs text-gray-600">En Proceso</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded">
              <p className="text-2xl font-bold text-red-700">1</p>
              <p className="text-xs text-gray-600">Retrasadas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
