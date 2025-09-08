import { 
  Package, 
  Users, 
  Calculator, 
  Truck, 
  UserCheck, 
  RotateCcw, 
  Settings,
  Factory
} from "lucide-react"
import type { ExtendedUser } from "@/contexts/AuthContext"

export interface ModuleConfig {
  id: string
  title: string
  description: string
  href: string
  icon: typeof Package
  bgColor: string
  hoverColor: string
  borderColor: string
  textColor: string
  variant: "default" | "outline"
  features: Array<{
    icon: typeof Package
    label: string
  }>
  requiredPermission: keyof NonNullable<ExtendedUser['permissions']>
  requiredRoles?: Array<ExtendedUser['role']>
}

export const AVAILABLE_MODULES: ModuleConfig[] = [
  {
    id: 'orders',
    title: 'Gestión de Pedidos',
    description: 'Administra todo el ciclo de vida de los pedidos: desde la recepción hasta la entrega, incluyendo revisión, despacho y rutas de distribución.',
    href: '/orders',
    icon: Package,
    bgColor: 'bg-blue-500',
    hoverColor: 'bg-blue-600',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-600',
    variant: 'default',
    features: [
      { icon: Package, label: 'Dashboard completo' },
      { icon: Calculator, label: 'Gestión de rutas' },
      { icon: Package, label: 'Control de inventario' },
      { icon: Users, label: 'Multi-usuario' }
    ],
    requiredPermission: 'orders'
  },
  {
    id: 'crm',
    title: 'CRM Ventas',
    description: 'Gestiona tu pipeline de ventas con una interfaz intuitiva. Visualiza oportunidades en formato Kanban y calendario para maximizar conversiones.',
    href: '/crm',
    icon: Users,
    bgColor: 'bg-green-500',
    hoverColor: 'bg-green-600',
    borderColor: 'border-green-500',
    textColor: 'text-green-600',
    variant: 'outline',
    features: [
      { icon: Package, label: 'Pipeline visual' },
      { icon: Calculator, label: 'Vista calendario' },
      { icon: Package, label: 'Métricas de valor' },
      { icon: Users, label: 'Gestión de leads' }
    ],
    requiredPermission: 'crm'
  },
  {
    id: 'inventory',
    title: 'CountPro Inventarios',
    description: 'Aplicación móvil optimizada para inventarios con interfaz tipo calculadora. Sistema de doble conteo y conciliación automática para máxima precisión.',
    href: '/inventory',
    icon: Calculator,
    bgColor: 'bg-purple-500',
    hoverColor: 'bg-purple-600',
    borderColor: 'border-purple-500',
    textColor: 'text-purple-600',
    variant: 'outline',
    features: [
      { icon: Calculator, label: 'Interfaz calculadora' },
      { icon: Package, label: 'Doble verificación' },
      { icon: Package, label: 'Conciliación automática' },
      { icon: Package, label: 'Búsqueda ultrarrápida' }
    ],
    requiredPermission: 'inventory'
  },
  {
    id: 'routes',
    title: 'Gestión de Rutas',
    description: 'Planifica y gestiona rutas de entrega eficientes. Asigna conductores, vehículos y controla el estado de las entregas en tiempo real.',
    href: '/routes',
    icon: Truck,
    bgColor: 'bg-orange-500',
    hoverColor: 'bg-orange-600',
    borderColor: 'border-orange-500',
    textColor: 'text-orange-600',
    variant: 'outline',
    features: [
      { icon: Truck, label: 'Planificación rutas' },
      { icon: Users, label: 'Asignación conductores' },
      { icon: Package, label: 'Seguimiento GPS' },
      { icon: Calculator, label: 'Optimización automática' }
    ],
    requiredPermission: 'routes',
    requiredRoles: ['admin', 'dispatcher', 'driver']
  },
  {
    id: 'clients',
    title: 'Gestión de Clientes',
    description: 'Administra la información completa de tus clientes, historial de pedidos, datos de contacto y preferencias comerciales.',
    href: '/clients',
    icon: UserCheck,
    bgColor: 'bg-cyan-500',
    hoverColor: 'bg-cyan-600',
    borderColor: 'border-cyan-500',
    textColor: 'text-cyan-600',
    variant: 'outline',
    features: [
      { icon: Users, label: 'Base de datos completa' },
      { icon: Package, label: 'Historial de pedidos' },
      { icon: Calculator, label: 'Análisis de compras' },
      { icon: UserCheck, label: 'Segmentación avanzada' }
    ],
    requiredPermission: 'clients'
  },
  {
    id: 'returns',
    title: 'Gestión de Devoluciones',
    description: 'Procesa devoluciones de productos de manera eficiente. Controla inventarios devueltos y genera reportes detallados.',
    href: '/returns',
    icon: RotateCcw,
    bgColor: 'bg-red-500',
    hoverColor: 'bg-red-600',
    borderColor: 'border-red-500',
    textColor: 'text-red-600',
    variant: 'outline',
    features: [
      { icon: RotateCcw, label: 'Proceso automatizado' },
      { icon: Package, label: 'Control de inventario' },
      { icon: Calculator, label: 'Reportes detallados' },
      { icon: UserCheck, label: 'Historial de devoluciones' }
    ],
    requiredPermission: 'returns',
    requiredRoles: ['admin', 'dispatcher', 'driver']
  },
  {
    id: 'production',
    title: 'Módulo de Producción',
    description: 'Sistema completo de gestión de producción con centros de trabajo, turnos, registro de unidades y análisis de productividad en tiempo real.',
    href: '/produccion',
    icon: Factory,
    bgColor: 'bg-indigo-500',
    hoverColor: 'bg-indigo-600',
    borderColor: 'border-indigo-500',
    textColor: 'text-indigo-600',
    variant: 'default',
    features: [
      { icon: Factory, label: 'Centros de trabajo' },
      { icon: Package, label: 'Control de turnos' },
      { icon: Calculator, label: 'Análisis teórico vs real' },
      { icon: Package, label: 'Bill of materials' }
    ],
    requiredPermission: 'production'
  },
  {
    id: 'users',
    title: 'Administración de Usuarios',
    description: 'Gestiona usuarios del sistema, asigna roles y permisos. Control completo sobre el acceso a módulos y funcionalidades.',
    href: '/admin/users',
    icon: Settings,
    bgColor: 'bg-gray-500',
    hoverColor: 'bg-gray-600',
    borderColor: 'border-gray-500',
    textColor: 'text-gray-600',
    variant: 'outline',
    features: [
      { icon: Users, label: 'Gestión de usuarios' },
      { icon: Settings, label: 'Asignación de roles' },
      { icon: UserCheck, label: 'Control de permisos' },
      { icon: Calculator, label: 'Auditoría de accesos' }
    ],
    requiredPermission: 'users',
    requiredRoles: ['admin']
  }
]

export function getAvailableModules(user: ExtendedUser): ModuleConfig[] {
  return AVAILABLE_MODULES.filter(module => {
    // Check if user has the required permission
    if (!user.permissions?.[module.requiredPermission]) {
      return false
    }

    // Check if user has the required role (if specified)
    if (module.requiredRoles && module.requiredRoles.length > 0) {
      if (!user.role || !module.requiredRoles.includes(user.role)) {
        return false
      }
    }

    return true
  })
}