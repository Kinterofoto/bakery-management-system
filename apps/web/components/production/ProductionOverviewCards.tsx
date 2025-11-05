"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Clock, Package, TrendingUp } from "lucide-react"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { useProductionShifts } from "@/hooks/use-production-shifts"
import { useShiftProductions } from "@/hooks/use-shift-productions"

export function ProductionOverviewCards() {
  const { workCenters } = useWorkCenters()
  const { shifts } = useProductionShifts()
  const { productions } = useShiftProductions()

  const activeWorkCenters = workCenters.filter(wc => wc.is_active).length
  const activeShifts = shifts.filter(s => s.status === "active").length
  const activeProductions = productions.filter(p => p.status === "active").length
  
  // Calcular unidades producidas hoy
  const today = new Date().toDateString()
  const todayProductions = productions.filter(p => 
    new Date(p.started_at).toDateString() === today
  )
  const todayUnits = todayProductions.reduce((sum, p) => sum + p.total_good_units, 0)

  const cards = [
    {
      title: "Centros Activos",
      value: `${activeShifts}/${activeWorkCenters}`,
      description: "Centros trabajando",
      icon: Play,
      bgColor: activeShifts > 0 ? "bg-green-500" : "bg-gray-400",
      textColor: activeShifts > 0 ? "text-green-600" : "text-gray-600",
    },
    {
      title: "Turnos Activos",
      value: activeShifts.toString(),
      description: "En producción",
      icon: Clock,
      bgColor: activeShifts > 0 ? "bg-blue-500" : "bg-gray-400",
      textColor: activeShifts > 0 ? "text-blue-600" : "text-gray-600",
    },
    {
      title: "Producciones",
      value: activeProductions.toString(),
      description: "Referencias activas",
      icon: Package,
      bgColor: activeProductions > 0 ? "bg-purple-500" : "bg-gray-400",
      textColor: activeProductions > 0 ? "text-purple-600" : "text-gray-600",
    },
    {
      title: "Unidades Hoy",
      value: todayUnits.toString(),
      description: "Unidades buenas",
      icon: TrendingUp,
      bgColor: todayUnits > 0 ? "bg-orange-500" : "bg-gray-400",
      textColor: todayUnits > 0 ? "text-orange-600" : "text-gray-600",
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${card.bgColor} opacity-10`}>
                <Icon className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className={`text-2xl font-bold ${card.textColor}`}>
                    {card.value}
                  </div>
                  <p className="text-xs text-gray-500">
                    {card.description}
                  </p>
                </div>
                <Icon className={`w-8 h-8 ${card.textColor} opacity-20`} />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}