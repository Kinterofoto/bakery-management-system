"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { VideoTutorialButton } from "@/components/shared/VideoTutorialButton"
import {
  Users,
  Calendar,
  BarChart3,
  Target,
  Phone,
  Mail,
  Plus,
  TrendingUp,
  DollarSign,
  Clock,
  Eye
} from "lucide-react"
import Link from "next/link"

export default function CRMDashboard() {
  const [view, setView] = useState<'kanban' | 'calendar'>('kanban')

  const pipelineStats = [
    {
      title: "Prospectos",
      value: "32",
      change: "+8",
      icon: Users,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
      value_amount: "$245,000"
    },
    {
      title: "Calificados",
      value: "18", 
      change: "+3",
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      value_amount: "$432,000"
    },
    {
      title: "Propuestas",
      value: "12",
      change: "+2",
      icon: BarChart3,
      color: "text-yellow-600", 
      bgColor: "bg-yellow-100",
      value_amount: "$680,000"
    },
    {
      title: "Negociación",
      value: "8",
      change: "+1",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100", 
      value_amount: "$890,000"
    },
  ]

  const pipelineStages = [
    {
      id: 'prospects',
      name: 'Prospectos',
      count: 32,
      value: 245000,
      color: 'bg-gray-50 border-gray-200',
      leads: [
        { id: '1', name: 'Supermercado Plaza', contact: 'Ana García', value: 25000, days: 3 },
        { id: '2', name: 'Panadería Central', contact: 'Luis Martín', value: 18000, days: 5 },
        { id: '3', name: 'Distribuidora Norte', contact: 'María López', value: 32000, days: 2 },
      ]
    },
    {
      id: 'qualified',
      name: 'Calificados', 
      count: 18,
      value: 432000,
      color: 'bg-blue-50 border-blue-200',
      leads: [
        { id: '4', name: 'Café Express', contact: 'Pedro Ruiz', value: 45000, days: 7 },
        { id: '5', name: 'Restaurante Bella Vista', contact: 'Carmen Silva', value: 38000, days: 4 },
      ]
    },
    {
      id: 'proposals',
      name: 'Propuestas',
      count: 12, 
      value: 680000,
      color: 'bg-yellow-50 border-yellow-200',
      leads: [
        { id: '6', name: 'Hotel Paradise', contact: 'Roberto Chen', value: 85000, days: 12 },
        { id: '7', name: 'Cadena MiniMarket', contact: 'Sofia Vargas', value: 95000, days: 8 },
      ]
    },
    {
      id: 'negotiation',
      name: 'Negociación',
      count: 8,
      value: 890000, 
      color: 'bg-green-50 border-green-200',
      leads: [
        { id: '8', name: 'Corporativo ABC', contact: 'Diego Morales', value: 150000, days: 18 },
      ]
    }
  ]

  const upcomingActivities = [
    {
      id: '1',
      type: 'call',
      title: 'Llamada de seguimiento - Supermercado Plaza',
      time: '10:00 AM',
      client: 'Ana García',
      priority: 'alta'
    },
    {
      id: '2', 
      type: 'meeting',
      title: 'Presentación de propuesta - Hotel Paradise',
      time: '2:30 PM',
      client: 'Roberto Chen',
      priority: 'alta'
    },
    {
      id: '3',
      type: 'email',
      title: 'Envío de cotización - Café Express', 
      time: '4:00 PM',
      client: 'Pedro Ruiz',
      priority: 'media'
    }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <RouteGuard>
      <div className="min-h-screen bg-gray-50">
      
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">CRM - Ventas</h1>
            <p className="text-gray-600">Gestiona tu pipeline de ventas y actividades</p>
          </div>
          
          <div className="flex items-center gap-4">
            <VideoTutorialButton modulePath="/crm" />

            <div className="flex bg-gray-200 rounded-lg p-1">
              <Button
                variant={view === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('kanban')}
                className="px-6"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Kanban
              </Button>
              <Button
                variant={view === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('calendar')}
                className="px-6"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Calendario
              </Button>
            </div>

            <Button size="lg" className="bg-green-600 hover:bg-green-700 px-8">
              <Plus className="h-5 w-5 mr-2" />
              Nuevo Lead
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Pipeline Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {pipelineStats.map((stat, index) => (
            <Card key={index} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                    <p className="text-lg font-semibold text-gray-700">{stat.value_amount}</p>
                    <p className="text-sm text-green-600">+{stat.change} esta semana</p>
                  </div>
                  <div className={`p-4 rounded-full ${stat.bgColor} ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {view === 'kanban' ? (
          /* Kanban View */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            {pipelineStages.map((stage) => (
              <Card key={stage.id} className={`${stage.color} border-2`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span>{stage.name}</span>
                    <Badge variant="secondary" className="bg-white">
                      {stage.count}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm font-semibold text-gray-700">
                    {formatCurrency(stage.value)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stage.leads.map((lead) => (
                    <Card key={lead.id} className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 text-sm">{lead.name}</h4>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{lead.contact}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-green-600">
                            {formatCurrency(lead.value)}
                          </span>
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="h-3 w-3 mr-1" />
                            {lead.days}d
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button 
                    variant="dashed" 
                    className="w-full border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600 bg-transparent"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Lead
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Calendar View Placeholder */
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Vista de Calendario
              </CardTitle>
            </CardHeader>
            <CardContent className="p-12">
              <div className="text-center text-gray-500">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Vista de Calendario</h3>
                <p>La vista de calendario estará disponible próximamente. Visualiza todas tus actividades y seguimientos programados.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Actividades de Hoy
              </div>
              <Link href="/crm/activities">
                <Button variant="outline" size="sm">
                  Ver Todas
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${
                      activity.type === 'call' ? 'bg-blue-100 text-blue-600' :
                      activity.type === 'meeting' ? 'bg-green-100 text-green-600' : 
                      'bg-yellow-100 text-yellow-600'
                    }`}>
                      {activity.type === 'call' ? <Phone className="h-4 w-4" /> :
                       activity.type === 'meeting' ? <Users className="h-4 w-4" /> :
                       <Mail className="h-4 w-4" />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{activity.title}</h4>
                      <p className="text-sm text-gray-600">{activity.client}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={activity.priority === 'alta' ? 'destructive' : 'secondary'}>
                      {activity.priority}
                    </Badge>
                    <span className="text-sm font-medium text-gray-700">{activity.time}</span>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      Completar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </RouteGuard>
  )
}