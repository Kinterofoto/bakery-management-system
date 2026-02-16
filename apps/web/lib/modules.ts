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
  Truck as TruckIcon,
  Calendar,
  FileSpreadsheet,
  ClipboardList,
  ShoppingCart,
  Clipboard,
  Search,
  Navigation,
  Database,
  Boxes,
  FileText,
  Archive,
  Mail
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

// Interfaz simplificada para módulos principales del panel
export interface MainModuleConfig {
  id: string
  title: string
  description: string
  href: string
  icon: typeof Package
  bgColor: string
  hoverColor: string
  textColor: string
  requiredPermission: keyof NonNullable<ExtendedUser['permissions']>
  requiredRoles?: Array<ExtendedUser['role']>
}

// Todos los módulos del sistema (completos con toda la información)
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
    requiredRoles: ['super_admin', 'administrator', 'coordinador_logistico', 'commercial']
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
    requiredRoles: ['super_admin', 'administrator', 'coordinador_logistico', 'reviewer']
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
    requiredRoles: ['super_admin', 'administrator', 'coordinador_logistico', 'reviewer']
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
    requiredRoles: ['super_admin', 'administrator', 'coordinador_logistico', 'dispatcher']
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
    requiredRoles: ['super_admin', 'administrator', 'coordinador_logistico', 'driver']
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
    requiredRoles: ['super_admin', 'administrator', 'coordinador_logistico', 'dispatcher']
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
    requiredRoles: ['super_admin', 'administrator', 'commercial']
  },
  {
    id: 'order-management-inbox',
    title: 'Inbox Órdenes de Compra',
    description: 'Bandeja de entrada de órdenes de compra recibidas por email. Visualiza correos procesados, productos extraídos y estado de clasificación.',
    href: '/order-management/inbox',
    icon: Mail,
    bgColor: 'bg-sky-500',
    hoverColor: 'bg-sky-600',
    borderColor: 'border-sky-500',
    textColor: 'text-sky-600',
    variant: 'default',
    features: [
      { icon: Mail, label: 'Correos recibidos' },
      { icon: Package, label: 'Productos extraídos' },
      { icon: ClipboardCheck, label: 'Estado de clasificación' },
      { icon: FileText, label: 'Link a PDF original' }
    ],
    requiredPermission: 'order_management_orders',
    requiredRoles: ['super_admin', 'administrator', 'coordinador_logistico', 'commercial']
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
    id: 'global-settings',
    title: 'Configuraciones Globales',
    description: 'Administra parámetros globales del sistema, tutoriales de video por módulo y gestión completa de usuarios.',
    href: '/configuracion',
    icon: Settings,
    bgColor: 'bg-gray-500',
    hoverColor: 'bg-gray-600',
    borderColor: 'border-gray-500',
    textColor: 'text-gray-600',
    variant: 'outline',
    features: [
      { icon: Settings, label: 'Parámetros sistema' },
      { icon: Package, label: 'Tutoriales de video' },
      { icon: Users, label: 'Gestión de usuarios' },
      { icon: UserCheck, label: 'Control de permisos' }
    ],
    requiredPermission: 'global_settings',
    requiredRoles: ['super_admin']
  },
  {
    id: 'ecommerce',
    title: 'E-Commerce',
    description: 'Portal de compras para clientes. Catálogo de productos, carrito de compras y gestión de pedidos en línea.',
    href: '/ecommerce',
    icon: ShoppingCart,
    bgColor: 'bg-amber-500',
    hoverColor: 'bg-amber-600',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-600',
    variant: 'default',
    features: [
      { icon: ShoppingCart, label: 'Catálogo de productos' },
      { icon: Package, label: 'Carrito de compras' },
      { icon: Calculator, label: 'Checkout rápido' },
      { icon: Users, label: 'Historial de pedidos' }
    ],
    requiredPermission: 'ecommerce',
    requiredRoles: ['client']
  },
  {
    id: 'planmaster',
    title: 'PlanMaster',
    description: 'Planeación maestra de producción con MRP, optimización de capacidad y seguimiento en tiempo real.',
    href: '/planmaster',
    icon: Calendar,
    bgColor: 'bg-indigo-500',
    hoverColor: 'bg-indigo-600',
    borderColor: 'border-indigo-500',
    textColor: 'text-indigo-600',
    variant: 'default',
    features: [
      { icon: Calendar, label: 'MRP avanzado' },
      { icon: Calculator, label: 'Optimización de capacidad' },
      { icon: Factory, label: 'Seguimiento tiempo real' },
      { icon: Package, label: 'Planificación demanda' }
    ],
    requiredPermission: 'production'
  },
  {
    id: 'store-visits',
    title: 'Visitas a Tiendas',
    description: 'Registro y seguimiento de visitas a puntos de venta con evaluación de productos y análisis fotográfico.',
    href: '/visitas',
    icon: ClipboardList,
    bgColor: 'bg-teal-500',
    hoverColor: 'bg-teal-600',
    borderColor: 'border-teal-500',
    textColor: 'text-teal-600',
    variant: 'outline',
    features: [
      { icon: ClipboardList, label: 'Registro de visitas' },
      { icon: Users, label: 'Evaluación de productos' },
      { icon: Package, label: 'Análisis fotográfico' },
      { icon: Calculator, label: 'Reportes detallados' }
    ],
    requiredPermission: 'store_visits'
  },
  {
    id: 'recepcion-pt',
    title: 'Recepción PT',
    description: 'Recibe productos terminados de producción al inventario con aprobación y seguimiento completo.',
    href: '/recepcion-pt',
    icon: Archive,
    bgColor: 'bg-cyan-500',
    hoverColor: 'bg-cyan-600',
    borderColor: 'border-cyan-500',
    textColor: 'text-cyan-600',
    variant: 'default',
    features: [
      { icon: Archive, label: 'Recepción productos' },
      { icon: Factory, label: 'Control de calidad' },
      { icon: Package, label: 'Actualización inventario' },
      { icon: Calculator, label: 'Seguimiento completo' }
    ],
    requiredPermission: 'recepcion_pt'
  },
  {
    id: 'compras',
    title: 'Compras',
    description: 'Gestión completa de compras, órdenes a proveedores, recepción y control de materias primas.',
    href: '/compras',
    icon: Truck,
    bgColor: 'bg-yellow-500',
    hoverColor: 'bg-yellow-600',
    borderColor: 'border-yellow-500',
    textColor: 'text-yellow-600',
    variant: 'outline',
    features: [
      { icon: Truck, label: 'Órdenes a proveedores' },
      { icon: Package, label: 'Recepción materias primas' },
      { icon: Calculator, label: 'Control de costos' },
      { icon: Users, label: 'Gestión proveedores' }
    ],
    requiredPermission: 'compras'
  },
  {
    id: 'kardex',
    title: 'Kardex',
    description: 'Trazabilidad completa de inventarios con balance por ubicación y movimientos detallados.',
    href: '/kardex',
    icon: ClipboardList,
    bgColor: 'bg-gray-500',
    hoverColor: 'bg-gray-600',
    borderColor: 'border-gray-500',
    textColor: 'text-gray-600',
    variant: 'default',
    features: [
      { icon: ClipboardList, label: 'Movimientos detallados' },
      { icon: Package, label: 'Balance por ubicación' },
      { icon: Calculator, label: 'Trazabilidad completa' },
      { icon: FileText, label: 'Reportes históricos' }
    ],
    requiredPermission: 'kardex'
  },
  {
    id: 'nucleo',
    title: 'Núcleo de Productos',
    description: 'Centro de información completa de productos con especificaciones técnicas, costos y BOM.',
    href: '/nucleo',
    icon: Database,
    bgColor: 'bg-red-500',
    hoverColor: 'bg-red-600',
    borderColor: 'border-red-500',
    textColor: 'text-red-600',
    variant: 'outline',
    features: [
      { icon: Database, label: 'Especificaciones técnicas' },
      { icon: Calculator, label: 'Control de costos' },
      { icon: Boxes, label: 'Bill of Materials' },
      { icon: FileText, label: 'Documentación completa' }
    ],
    requiredPermission: 'nucleo'
  },
  {
    id: 'hr',
    title: 'Recursos Humanos',
    description: 'Gestión de personal con control de asistencia biométrico, registro de breaks y administración de empleados.',
    href: '/hr',
    icon: UserCheck,
    bgColor: 'bg-violet-500',
    hoverColor: 'bg-violet-600',
    borderColor: 'border-violet-500',
    textColor: 'text-violet-600',
    variant: 'default',
    features: [
      { icon: UserCheck, label: 'Control de asistencia' },
      { icon: Users, label: 'Gestión de empleados' },
      { icon: ClipboardCheck, label: 'Registro de breaks' },
      { icon: Calculator, label: 'Reportes y estadísticas' }
    ],
    requiredPermission: 'hr'
  }
]

// Solo los 4 módulos principales para el panel principal
export const MAIN_MODULES: MainModuleConfig[] = [
  {
    id: 'crm',
    title: 'CRM Ventas',
    description: 'Gestión completa de ventas, pipeline de oportunidades y seguimiento de clientes potenciales.',
    href: '/crm',
    icon: Users,
    bgColor: 'bg-gradient-to-br from-blue-500 to-blue-700',
    hoverColor: 'hover:bg-blue-600',
    textColor: 'text-blue-600',
    requiredPermission: 'crm'
  },
  {
    id: 'inventory',
    title: 'CountPro',
    description: 'Sistema de inventarios con interfaz móvil optimizada y doble verificación automática.',
    href: '/inventory',
    icon: Calculator,
    bgColor: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
    hoverColor: 'hover:bg-emerald-600',
    textColor: 'text-emerald-600',
    requiredPermission: 'inventory'
  },
  {
    id: 'order-management',
    title: 'Pedidos',
    description: 'Sistema completo para la gestión de pedidos, desde recepción hasta entrega final.',
    href: '/order-management/dashboard', // Default href, will be overridden by getMainModules
    icon: Package,
    bgColor: 'bg-gradient-to-br from-violet-500 to-purple-700',
    hoverColor: 'hover:bg-purple-600',
    textColor: 'text-purple-600',
    requiredPermission: 'order_management_dashboard' // This will be ignored for order-management
  },
  {
    id: 'production',
    title: 'Producción',
    description: 'Control de producción, turnos, centros de trabajo y análisis de productividad en tiempo real.',
    href: '/produccion',
    icon: Factory,
    bgColor: 'bg-gradient-to-br from-orange-400 to-orange-600',
    hoverColor: 'hover:bg-orange-600',
    textColor: 'text-orange-600',
    requiredPermission: 'production'
  },
  {
    id: 'planmaster',
    title: 'PlanMaster',
    description: 'Planeación maestra de producción con MRP, optimización de capacidad y seguimiento en tiempo real.',
    href: '/planmaster',
    icon: Calendar,
    bgColor: 'bg-gradient-to-br from-indigo-500 to-indigo-700',
    hoverColor: 'hover:bg-indigo-600',
    textColor: 'text-indigo-600',
    requiredPermission: 'production' // Using production permission temporarily for mockup
  },
  {
    id: 'store-visits',
    title: 'Visitas',
    description: 'Registro y seguimiento de visitas a puntos de venta con evaluación de productos y análisis fotográfico.',
    href: '/visitas',
    icon: ClipboardList,
    bgColor: 'bg-gradient-to-br from-teal-400 to-teal-600',
    hoverColor: 'hover:bg-teal-600',
    textColor: 'text-teal-600',
    requiredPermission: 'store_visits'
  },
  {
    id: 'recepcion-pt',
    title: 'Recepción PT',
    description: 'Recibe productos terminados de producción al inventario con aprobación y seguimiento completo.',
    href: '/recepcion-pt',
    icon: Archive,
    bgColor: 'bg-gradient-to-br from-cyan-400 to-cyan-600',
    hoverColor: 'hover:bg-cyan-600',
    textColor: 'text-cyan-600',
    requiredPermission: 'recepcion_pt'
  },
  {
    id: 'compras',
    title: 'Compras',
    description: 'Gestión completa de compras, órdenes a proveedores, recepción y control de materias primas.',
    href: '/compras',
    icon: Truck,
    bgColor: 'bg-gradient-to-br from-amber-400 to-amber-600',
    hoverColor: 'hover:bg-amber-600',
    textColor: 'text-amber-600',
    requiredPermission: 'compras'
  },
  {
    id: 'kardex',
    title: 'Kardex',
    description: 'Trazabilidad completa de inventarios con balance por ubicación y movimientos detallados.',
    href: '/kardex',
    icon: ClipboardList,
    bgColor: 'bg-gradient-to-br from-zinc-500 to-zinc-700',
    hoverColor: 'hover:bg-zinc-600',
    textColor: 'text-zinc-600',
    requiredPermission: 'kardex'
  },
  {
    id: 'nucleo',
    title: 'Núcleo',
    description: 'Centro de información completa de productos con especificaciones técnicas, costos y BOM.',
    href: '/nucleo',
    icon: Database,
    bgColor: 'bg-gradient-to-br from-rose-500 to-rose-700',
    hoverColor: 'hover:bg-rose-600',
    textColor: 'text-rose-600',
    requiredPermission: 'nucleo'
  },
  {
    id: 'hr',
    title: 'RRHH',
    description: 'Control de asistencia biométrico, gestión de personal y registro de breaks en tiempo real.',
    href: '/hr',
    icon: UserCheck,
    bgColor: 'bg-gradient-to-br from-purple-500 to-purple-700',
    hoverColor: 'hover:bg-purple-600',
    textColor: 'text-purple-600',
    requiredPermission: 'hr'
  },
  {
    id: 'global-settings',
    title: 'Configuración',
    description: 'Administra parámetros globales del sistema, tutoriales de video y gestión de usuarios.',
    href: '/configuracion',
    icon: Settings,
    bgColor: 'bg-gradient-to-br from-slate-500 to-slate-700',
    hoverColor: 'hover:bg-slate-600',
    textColor: 'text-slate-600',
    requiredPermission: 'global_settings',
    requiredRoles: ['super_admin']
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

// Función helper para obtener la primera URL disponible para Order Management
function getOrderManagementUrl(user: ExtendedUser): string {
  // Orden de prioridad para redirección
  const priorityMap = [
    { permission: 'order_management_dashboard', url: '/order-management/dashboard' },
    { permission: 'order_management_orders', url: '/order-management/orders' },
    { permission: 'order_management_review_area1', url: '/order-management/review-area1' },
    { permission: 'order_management_review_area2', url: '/order-management/review-area2' },
    { permission: 'order_management_dispatch', url: '/order-management/dispatch' },
    { permission: 'order_management_routes', url: '/order-management/routes' },
    { permission: 'order_management_returns', url: '/order-management/returns' },
    { permission: 'order_management_settings', url: '/order-management/settings' }
  ]

  // Encuentra la primera URL disponible según permisos
  for (const item of priorityMap) {
    if (user.permissions?.[item.permission as keyof NonNullable<typeof user.permissions>]) {
      return item.url
    }
  }

  // Fallback (no debería llegar aquí si se llama correctamente)
  return '/order-management/dashboard'
}

// Nueva función para obtener solo los módulos principales del panel
export function getMainModules(user: ExtendedUser): MainModuleConfig[] {
  return MAIN_MODULES.filter(module => {
    // Lógica especial para Order Management - si el usuario tiene CUALQUIER permiso de order_management, puede acceder
    if (module.id === 'order-management') {
      const orderManagementPermissions = [
        'order_management_dashboard',
        'order_management_orders', 
        'order_management_review_area1',
        'order_management_review_area2',
        'order_management_dispatch',
        'order_management_routes',
        'order_management_returns',
        'order_management_settings'
      ]
      
      // Si tiene algún permiso de order management, puede acceder al módulo
      const hasAnyOrderPermission = orderManagementPermissions.some(permission => 
        user.permissions?.[permission as keyof NonNullable<typeof user.permissions>]
      )
      
      if (hasAnyOrderPermission) {
        return true
      }
      return false
    }

    // Para otros módulos, usar la lógica normal
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
  }).map(module => {
    // Si es order-management, actualizar la URL según permisos del usuario
    if (module.id === 'order-management') {
      return {
        ...module,
        href: getOrderManagementUrl(user)
      }
    }
    return module
  })
}

// Helper function to get navigation items for sidebar based on user role
export function getNavigationItems(user: ExtendedUser): Array<{
  name: string
  href: string
  icon: typeof Package
  requiredPermission: keyof NonNullable<ExtendedUser['permissions']>
  requiredRoles?: ReadonlyArray<ExtendedUser['role']>
}> {
  const baseNavigation = [
    {
      name: "Dashboard",
      href: "/order-management/dashboard",
      icon: LayoutDashboard,
      requiredPermission: 'order_management_dashboard' as const
    },
    {
      name: "Inbox OC",
      href: "/order-management/inbox",
      icon: Mail,
      requiredPermission: 'order_management_orders' as const,
      requiredRoles: ['super_admin', 'administrator', 'coordinador_logistico', 'commercial'] as const
    },
    {
      name: "Pedidos",
      href: "/order-management/orders",
      icon: Package,
      requiredPermission: 'order_management_orders' as const,
      requiredRoles: ['super_admin', 'administrator', 'coordinador_logistico', 'commercial'] as const
    },
    {
      name: "Alistamiento",
      href: "/order-management/review-area1",
      icon: Clipboard,
      requiredPermission: 'order_management_review_area1' as const,
      requiredRoles: ['super_admin', 'administrator', 'coordinador_logistico', 'reviewer'] as const
    },
    {
      name: "Proyección",
      href: "/order-management/review-area2",
      icon: Search,
      requiredPermission: 'order_management_review_area2' as const,
      requiredRoles: ['super_admin', 'administrator', 'coordinador_logistico', 'reviewer'] as const
    },
    {
      name: "Facturación",
      href: "/order-management/billing",
      icon: FileSpreadsheet,
      requiredPermission: 'order_management_dispatch' as const,
      requiredRoles: ['super_admin', 'administrator', 'coordinador_logistico', 'dispatcher'] as const
    },
    {
      name: "Despacho",
      href: "/order-management/dispatch",
      icon: TruckIcon,
      requiredPermission: 'order_management_dispatch' as const,
      requiredRoles: ['super_admin', 'administrator', 'coordinador_logistico', 'dispatcher'] as const
    },
    {
      name: "Rutas",
      href: "/order-management/routes",
      icon: Navigation,
      requiredPermission: 'order_management_routes' as const,
      requiredRoles: ['super_admin', 'administrator', 'coordinador_logistico', 'driver'] as const
    },
    {
      name: "Devoluciones",
      href: "/order-management/returns",
      icon: RotateCcw,
      requiredPermission: 'order_management_returns' as const,
      requiredRoles: ['super_admin', 'administrator', 'coordinador_logistico', 'dispatcher'] as const
    },
    {
      name: "Configuración",
      href: "/order-management/settings",
      icon: Settings,
      requiredPermission: 'order_management_settings' as const,
      requiredRoles: ['super_admin', 'administrator', 'commercial'] as const
    },
  ]

  return baseNavigation.filter(item => {
    // Check if user has the required permission
    if (!user.permissions?.[item.requiredPermission]) {
      return false
    }

    // Check if user has the required role (if specified)
    if (item.requiredRoles && item.requiredRoles.length > 0) {
      if (!user.role || !(item.requiredRoles as ReadonlyArray<string>).includes(user.role)) {
        return false
      }
    }

    return true
  })
}