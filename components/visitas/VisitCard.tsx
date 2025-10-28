"use client"

import { Calendar, MapPin, Star, User } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { StoreVisit } from "@/hooks/use-store-visits"

interface VisitCardProps {
  visit: StoreVisit
  onClick?: () => void
}

export function VisitCard({ visit, onClick }: VisitCardProps) {
  const branchName = visit.branch?.name || visit.branch_name_custom || "Sin especificar"

  return (
    <Card
      className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-teal-300"
      onClick={onClick}
    >
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-gray-900">
              {visit.client?.name}
            </h3>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{branchName}</span>
            </div>
          </div>
          {visit.average_score && (
            <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-yellow-700">
                {visit.average_score.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{new Date(visit.visit_date).toLocaleDateString('es-ES')}</span>
          </div>
          {visit.operator_name && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{visit.operator_name}</span>
            </div>
          )}
        </div>

        {visit.general_comments && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {visit.general_comments}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
