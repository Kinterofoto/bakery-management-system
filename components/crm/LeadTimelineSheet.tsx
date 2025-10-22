"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  MessageCircle,
  Mail,
  Phone,
  Users,
  FileText,
  CheckSquare,
  ArrowRight,
  ArrowLeft,
  Plus,
  Calendar,
  DollarSign,
  Clock
} from "lucide-react"

type CommunicationType = 'whatsapp' | 'email' | 'phone' | 'meeting' | 'note' | 'task'
type Direction = 'inbound' | 'outbound'

interface TimelineActivity {
  id: string
  type: CommunicationType
  direction?: Direction
  title: string
  content?: string
  date: string
  time: string
  status?: 'pending' | 'completed' | 'overdue'
  user?: string
}

interface LeadTimelineSheetProps {
  open: boolean
  onClose: () => void
  leadId?: string
  leadName?: string
}

export function LeadTimelineSheet({
  open,
  onClose,
  leadId,
  leadName = "Supermercado Plaza"
}: LeadTimelineSheetProps) {

  // MOCK DATA - Timeline de actividades
  const mockActivities: TimelineActivity[] = [
    {
      id: '1',
      type: 'task',
      title: 'Enviar propuesta comercial actualizada',
      date: '2025-10-22',
      time: '10:00 AM',
      status: 'pending',
      user: 'Carlos Mendoza'
    },
    {
      id: '2',
      type: 'task',
      title: 'Seguimiento post-reunión',
      date: '2025-10-22',
      time: '3:00 PM',
      status: 'pending',
      user: 'Carlos Mendoza'
    },
    {
      id: '3',
      type: 'whatsapp',
      direction: 'outbound',
      title: 'WhatsApp enviado',
      content: 'Hola Ana, te confirmamos la reunión para mañana a las 2pm. ¿Te parece bien?',
      date: '2025-10-21',
      time: '4:30 PM',
      user: 'Carlos Mendoza'
    },
    {
      id: '4',
      type: 'whatsapp',
      direction: 'inbound',
      title: 'WhatsApp recibido',
      content: 'Perfecto Carlos, nos vemos mañana. Gracias!',
      date: '2025-10-21',
      time: '4:45 PM',
      user: 'Ana García'
    },
    {
      id: '5',
      type: 'meeting',
      title: 'Reunión de presentación de productos',
      content: 'Presentación de línea completa de panadería. Ana mostró interés en croissants y pan artesanal. Solicitó cotización formal.',
      date: '2025-10-20',
      time: '2:00 PM',
      status: 'completed',
      user: 'Carlos Mendoza'
    },
    {
      id: '6',
      type: 'email',
      direction: 'outbound',
      title: 'Email enviado: Cotización productos',
      content: 'Estimada Ana, adjunto cotización de productos solicitados según reunión. Incluye croissants ($2.500 c/u) y pan artesanal ($1.800 c/u).',
      date: '2025-10-20',
      time: '5:15 PM',
      user: 'Carlos Mendoza'
    },
    {
      id: '7',
      type: 'email',
      direction: 'inbound',
      title: 'Email recibido: Re: Cotización productos',
      content: 'Hola Carlos, gracias por la cotización. Los precios están bien. Me gustaría agendar una visita a la planta para conocer el proceso. ¿Cuándo podemos?',
      date: '2025-10-19',
      time: '10:20 AM',
      user: 'Ana García'
    },
    {
      id: '8',
      type: 'phone',
      direction: 'outbound',
      title: 'Llamada telefónica',
      content: 'Llamada de seguimiento inicial. Ana confirma interés en productos de panadería para su cadena de supermercados. Agenda reunión presencial.',
      date: '2025-10-18',
      time: '11:00 AM',
      status: 'completed',
      user: 'Carlos Mendoza'
    },
    {
      id: '9',
      type: 'note',
      title: 'Nota interna',
      content: 'Lead calificado como alta prioridad. Cadena con 5 locales en Bogotá. Potencial de compra mensual: $15M COP. Competidor actual: Panadería Industrial del Norte.',
      date: '2025-10-17',
      time: '9:30 AM',
      user: 'Carlos Mendoza'
    },
    {
      id: '10',
      type: 'whatsapp',
      direction: 'inbound',
      title: 'WhatsApp recibido',
      content: 'Hola, me pasaron tu contacto. Estoy buscando proveedor de panadería para mi cadena de supermercados. ¿Podemos hablar?',
      date: '2025-10-17',
      time: '8:15 AM',
      user: 'Ana García'
    },
  ]

  // Filtrar tareas pendientes
  const pendingTasks = mockActivities.filter(
    a => a.type === 'task' && a.status === 'pending'
  )

  // Función para obtener icono y color según tipo
  const getActivityIcon = (type: CommunicationType) => {
    switch (type) {
      case 'whatsapp':
        return { icon: MessageCircle, color: 'text-green-600', bg: 'bg-green-100' }
      case 'email':
        return { icon: Mail, color: 'text-blue-600', bg: 'bg-blue-100' }
      case 'phone':
        return { icon: Phone, color: 'text-orange-600', bg: 'bg-orange-100' }
      case 'meeting':
        return { icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' }
      case 'note':
        return { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100' }
      case 'task':
        return { icon: CheckSquare, color: 'text-yellow-600', bg: 'bg-yellow-100' }
      default:
        return { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100' }
    }
  }

  const getTypeLabel = (type: CommunicationType) => {
    const labels = {
      whatsapp: 'WhatsApp',
      email: 'Email',
      phone: 'Llamada',
      meeting: 'Reunión',
      note: 'Nota',
      task: 'Tarea'
    }
    return labels[type]
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl">{leadName}</SheetTitle>
          <SheetDescription className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              <span>Ana García • ana.garcia@superplaza.com • +57 310 555 1234</span>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                Calificado
              </Badge>
              <div className="flex items-center gap-1 text-sm text-green-600 font-semibold">
                <DollarSign className="h-4 w-4" />
                $25,000,000 COP
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                3 días en pipeline
              </div>
            </div>
          </SheetDescription>
        </SheetHeader>

        {/* Tareas Pendientes */}
        {pendingTasks.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Tareas Pendientes ({pendingTasks.length})
            </h3>
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <Card key={task.id} className="border-l-4 border-l-yellow-500 bg-yellow-50">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-gray-900">{task.title}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {task.date} • {task.time}
                          </span>
                          <span className="text-xs text-gray-500">{task.user}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        Completar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Botón Agregar Actividad */}
        <div className="mb-6">
          <Button className="w-full bg-green-600 hover:bg-green-700" size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Agregar Actividad
          </Button>
        </div>

        {/* Timeline */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Historial de Actividades
          </h3>

          <div className="relative">
            {/* Línea vertical del timeline */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

            <div className="space-y-6">
              {mockActivities.map((activity, index) => {
                const { icon: Icon, color, bg } = getActivityIcon(activity.type)
                const isTask = activity.type === 'task'
                const hasDirection = activity.direction !== undefined

                return (
                  <div key={activity.id} className="relative flex gap-4">
                    {/* Icono del timeline */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full ${bg} ${color} flex items-center justify-center z-10`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 pb-2">
                      <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {getTypeLabel(activity.type)}
                            </Badge>
                            {hasDirection && (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                {activity.direction === 'outbound' ? (
                                  <>
                                    <ArrowRight className="h-3 w-3" />
                                    Enviado
                                  </>
                                ) : (
                                  <>
                                    <ArrowLeft className="h-3 w-3" />
                                    Recibido
                                  </>
                                )}
                              </div>
                            )}
                            {activity.status === 'completed' && (
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                Completado
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {activity.date} • {activity.time}
                          </span>
                        </div>

                        {/* Título */}
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {activity.title}
                        </h4>

                        {/* Contenido */}
                        {activity.content && (
                          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border-l-2 border-l-gray-300 italic">
                            "{activity.content}"
                          </p>
                        )}

                        {/* Usuario */}
                        {activity.user && (
                          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {activity.user}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
