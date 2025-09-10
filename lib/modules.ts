import { 
  Package, 
  Users, 
  Calculator, 
  Truck, 
  UserCheck, 
  RotateCcw, 
  Settings,
  Factory,
  LayoutDashboard,
  ClipboardCheck,
  Truck as TruckIcon
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
  // Order Management Modules - Granular access
  {
    id: 'order-management-dashboard',
    title: 'Dashboard Order Management',
    description: 'Panel principal del sistema de gestión de pedidos con métricas, resúmenes y accesos rápidos a todas las funcionalidades.',
    href: '/order-management/dashboard',
    icon: LayoutDashboard,
    bgColor: 'bg-blue-500',
    hoverColor: 'bg-blue-600',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-600',
    variant: 'default',
    features: [
      { icon: LayoutDashboard, label: 'Métricas en tiempo real' },
      { icon: Package, label: 'Resúmenes de pedidos' },
      { icon: Calculator, label: 'Análisis de rendimiento' },
      { icon: Users, label: 'Estado del equipo' }
    ],
    requiredPermission: 'order_management_dashboard'
  },
  {
    id: 'order-management-orders',
    title: 'Gestión de Pedidos',
    description: 'Administra pedidos, crea nuevos, revisa estado y maneja todo el flujo comercial de pedidos de clientes.',
    href: '/order-management/orders',
    icon: Package,
    bgColor: 'bg-green-500',
    hoverColor: 'bg-green-600',
    borderColor: 'border-green-500',
    textColor: 'text-green-600',
    variant: 'default',
    features: [
      { icon: Package, label: 'Crear pedidos' },
      { icon: Users, label: 'Gestión de clientes' },
      { icon: Calculator, label: 'Cálculo automático' },
      { icon: Settings, label: 'Estado de pedidos' }
    ],
    requiredPermission: 'order_management_orders',
    requiredRoles: ['administrator', 'coordinador_logistico', 'comercial']
  },
  {
    id: 'order-management-review-area1',
    title: 'Revisión Área 1',
    description: 'Primera etapa de revisión y validación de pedidos. Control de calidad y verificación de disponibilidad de productos.',
    href: '/order-management/review-area1',
    icon: ClipboardCheck,
    bgColor: 'bg-yellow-500',
    hoverColor: 'bg-yellow-600',
    borderColor: 'border-yellow-500',
    textColor: 'text-yellow-600',
    variant: 'outline',
    features: [
      { icon: ClipboardCheck, label: 'Validación de pedidos' },
      { icon: Package, label: 'Control de inventario' },
      { icon: Users, label: 'Comunicación con comercial' },
      { icon: Calculator, label: 'Verificación de precios' }
    ],
    requiredPermission: 'order_management_review_area1',
    requiredRoles: ['administrator', 'coordinador_logistico', 'reviewer']
  },
  {
    id: 'order-management-review-area2',
    title: 'Revisión Área 2',
    description: 'Segunda etapa de revisión final antes del despacho. Confirmación de disponibilidad y preparación para producción.',
    href: '/order-management/review-area2',
    icon: ClipboardCheck,
    bgColor: 'bg-orange-500',
    hoverColor: 'bg-orange-600',
    borderColor: 'border-orange-500',
    textColor: 'text-orange-600',
    variant: 'outline',
    features: [
      { icon: ClipboardCheck, label: 'Revisión final' },
      { icon: Factory, label: 'Coordinación producción' },
      { icon: TruckIcon, label: 'Preparación despacho' },
      { icon: Calculator, label: 'Confirmación cantidades' }
    ],
    requiredPermission: 'order_management_review_area2',
    requiredRoles: ['administrator', 'coordinador_logistico', 'reviewer']
  },
  {
    id: 'order-management-dispatch',
    title: 'Despacho de Pedidos',
    description: 'Gestiona la preparación y envío de pedidos. Asigna rutas, coordina conductores y supervisa entregas.',
    href: '/order-management/dispatch',
    icon: TruckIcon,
    bgColor: 'bg-purple-500',
    hoverColor: 'bg-purple-600',
    borderColor: 'border-purple-500',
    textColor: 'text-purple-600',
    variant: 'default',
    features: [
      { icon: TruckIcon, label: 'Asignación de rutas' },
      { icon: Users, label: 'Gestión conductores' },
      { icon: Package, label: 'Control de carga' },
      { icon: Calculator, label: 'Optimización logística' }
    ],
    requiredPermission: 'order_management_dispatch',
    requiredRoles: ['administrator', 'coordinador_logistico', 'dispatcher']
  },
  {
    id: 'order-management-routes',
    title: 'Rutas de Entrega',
    description: 'Interface específica para conductores. Visualiza rutas asignadas, actualiza estados de entrega y registra novedades.',
    href: '/order-management/routes',
    icon: Truck,
    bgColor: 'bg-indigo-500',
    hoverColor: 'bg-indigo-600',
    borderColor: 'border-indigo-500',
    textColor: 'text-indigo-600',
    variant: 'outline',
    features: [
      { icon: Truck, label: 'Rutas asignadas' },
      { icon: Package, label: 'Estado entregas' },
      { icon: Users, label: 'Contacto clientes' },
      { icon: Settings, label: 'Registro novedades' }
    ],
    requiredPermission: 'order_management_routes',
    requiredRoles: ['administrator', 'coordinador_logistico', 'driver']
  },
  {
    id: 'order-management-returns',
    title: 'Gestión de Devoluciones',
    description: 'Procesa devoluciones de productos, registra motivos, actualiza inventarios y genera reportes de devoluciones.',
    href: '/order-management/returns',
    icon: RotateCcw,
    bgColor: 'bg-red-500',
    hoverColor: 'bg-red-600',
    borderColor: 'border-red-500',
    textColor: 'text-red-600',
    variant: 'outline',
    features: [
      { icon: RotateCcw, label: 'Registro devoluciones' },
      { icon: Package, label: 'Control de inventario' },
      { icon: Calculator, label: 'Reportes detallados' },
      { icon: Users, label: 'Comunicación con clientes' }
    ],
    requiredPermission: 'order_management_returns',
    requiredRoles: ['administrator', 'coordinador_logistico', 'dispatcher']
  },
  {
    id: 'order-management-settings',
    title: 'Configuración Order Management',
    description: 'Configuración avanzada del módulo de gestión de pedidos. Solo para administradores del sistema.',
    href: '/order-management/settings',
    icon: Settings,
    bgColor: 'bg-gray-500',
    hoverColor: 'bg-gray-600',
    borderColor: 'border-gray-500',
    textColor: 'text-gray-600',
    variant: 'outline',
    features: [
      { icon: Settings, label: 'Parámetros sistema' },
      { icon: Users, label: 'Gestión permisos' },
      { icon: Calculator, label: 'Configuración precios' },
      { icon: Package, label: 'Reglas de negocio' }
    ],
    requiredPermission: 'order_management_settings',
    requiredRoles: ['administrator']
  },

  // Other System Modules
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
    requiredRoles: ['administrator']
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

// Helper function to get navigation items for sidebar based on user role
export function getNavigationItems(user: ExtendedUser): Array<{
  name: string
  href: string
  icon: typeof Package
  requiredPermission: keyof NonNullable<ExtendedUser['permissions']>
  requiredRoles?: Array<ExtendedUser['role']>
}> {
  const baseNavigation = [
    { 
      name: "Dashboard", 
      href: "/order-management/dashboard", 
      icon: LayoutDashboard,
      requiredPermission: 'order_management_dashboard' as const
    },
    { 
      name: "Pedidos", 
      href: "/order-management/orders", 
      icon: Package,
      requiredPermission: 'order_management_orders' as const,
      requiredRoles: ['administrator', 'coordinador_logistico', 'comercial'] as const
    },
    { 
      name: "Revisión Área 1", 
      href: "/order-management/review-area1", 
      icon: ClipboardCheck,
      requiredPermission: 'order_management_review_area1' as const,
      requiredRoles: ['administrator', 'coordinador_logistico', 'reviewer'] as const
    },
    { 
      name: "Revisión Área 2", 
      href: "/order-management/review-area2", 
      icon: ClipboardCheck,
      requiredPermission: 'order_management_review_area2' as const,
      requiredRoles: ['administrator', 'coordinador_logistico', 'reviewer'] as const
    },
    { 
      name: "Despacho", 
      href: "/order-management/dispatch", 
      icon: TruckIcon,
      requiredPermission: 'order_management_dispatch' as const,
      requiredRoles: ['administrator', 'coordinador_logistico', 'dispatcher'] as const
    },
    { 
      name: "Rutas", 
      href: "/order-management/routes", 
      icon: Truck,
      requiredPermission: 'order_management_routes' as const,
      requiredRoles: ['administrator', 'coordinador_logistico', 'driver'] as const
    },
    { 
      name: "Devoluciones", 
      href: "/order-management/returns", 
      icon: RotateCcw,
      requiredPermission: 'order_management_returns' as const,
      requiredRoles: ['administrator', 'coordinador_logistico', 'dispatcher'] as const
    },
    { 
      name: "Configuración", 
      href: "/order-management/settings", 
      icon: Settings,
      requiredPermission: 'order_management_settings' as const,
      requiredRoles: ['administrator'] as const
    },
  ]

  return baseNavigation.filter(item => {
    // Check if user has the required permission
    if (!user.permissions?.[item.requiredPermission]) {
      return false
    }

    // Check if user has the required role (if specified)
    if (item.requiredRoles && item.requiredRoles.length > 0) {
      if (!user.role || !item.requiredRoles.includes(user.role)) {
        return false
      }
    }

    return true
  })
}