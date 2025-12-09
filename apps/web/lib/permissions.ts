import type { ExtendedUser } from "@/contexts/AuthContext"

// Definición de permisos por ruta
export interface RoutePermission {
  path: string
  requiredPermissions: Array<keyof NonNullable<ExtendedUser['permissions']>>
  requiredRoles?: Array<ExtendedUser['role']>
  exactMatch?: boolean // Si debe ser coincidencia exacta o permitir sub-rutas
}

// Matriz completa de permisos por ruta
export const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Rutas públicas - sin restricciones
  { path: '/login', requiredPermissions: [], exactMatch: true },
  { path: '/signup', requiredPermissions: [], exactMatch: true },
  { path: '/403', requiredPermissions: [], exactMatch: true },
  { path: '/offline', requiredPermissions: [], exactMatch: true },

  // Página principal - acceso para usuarios autenticados
  { path: '/', requiredPermissions: [], exactMatch: true },

  // E-Commerce - Solo para clientes
  {
    path: '/ecommerce',
    requiredPermissions: ['ecommerce'],
    requiredRoles: ['client', 'admin']
  },

  // Módulo CRM
  { path: '/crm', requiredPermissions: ['crm'] },

  // Módulo de Inventarios
  { path: '/inventory', requiredPermissions: ['inventory'] },

  // Módulo de Producción
  { path: '/produccion', requiredPermissions: ['production'] },

  // Módulo Núcleo
  {
    path: '/nucleo',
    requiredPermissions: ['nucleo']
  },

  // Módulo de Compras
  {
    path: '/compras',
    requiredPermissions: ['compras']
  },

  // Módulo Kardex
  {
    path: '/kardex',
    requiredPermissions: ['kardex']
  },

  // Módulo PlanMaster
  {
    path: '/planmaster',
    requiredPermissions: []
  },

  // Módulo de Visitas a Tiendas
  {
    path: '/visitas',
    requiredPermissions: ['store_visits']
  },

  // Order Management - Granular permissions
  {
    path: '/order-management/dashboard',
    requiredPermissions: ['order_management_dashboard']
  },
  {
    path: '/order-management/orders',
    requiredPermissions: ['order_management_orders']
  },
  {
    path: '/order-management/review-area1',
    requiredPermissions: ['order_management_review_area1']
  },
  {
    path: '/order-management/review-area2',
    requiredPermissions: ['order_management_review_area2']
  },
  {
    path: '/order-management/billing',
    requiredPermissions: ['order_management_dispatch']
  },
  {
    path: '/order-management/dispatch',
    requiredPermissions: ['order_management_dispatch']
  },
  {
    path: '/order-management/routes',
    requiredPermissions: ['order_management_routes']
  },
  {
    path: '/order-management/returns',
    requiredPermissions: ['order_management_returns']
  },
  {
    path: '/order-management/settings',
    requiredPermissions: ['order_management_settings']
  },

  // Administración de Usuarios - Solo super admins
  {
    path: '/admin',
    requiredPermissions: ['users'],
    requiredRoles: ['super_admin']
  },

  // APIs - requieren los mismos permisos que sus módulos
  { path: '/api/orders', requiredPermissions: ['orders'] },
  { path: '/api/crm', requiredPermissions: ['crm'] },
  { path: '/api/inventory', requiredPermissions: ['inventory'] },
  { path: '/api/production', requiredPermissions: ['production'] },
  {
    path: '/api/admin',
    requiredPermissions: ['users'],
    requiredRoles: ['super_admin']
  },
]

// Rutas públicas que no requieren autenticación
export const PUBLIC_ROUTES = ['/login', '/signup']

// Función para verificar si una ruta es pública
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname)
}

// Función para obtener los permisos requeridos para una ruta
export function getRoutePermissions(pathname: string): RoutePermission | null {
  // Buscar coincidencia exacta primero
  const exactMatch = ROUTE_PERMISSIONS.find(
    route => route.exactMatch && route.path === pathname
  )

  if (exactMatch) return exactMatch

  // Buscar coincidencia por prefijo (para sub-rutas)
  const prefixMatch = ROUTE_PERMISSIONS.find(
    route => !route.exactMatch && pathname.startsWith(route.path)
  )

  return prefixMatch || null
}

// Función para verificar si un usuario tiene permisos para una ruta
export function hasRouteAccess(user: ExtendedUser | null, pathname: string): boolean {
  // Si la ruta es pública, permitir acceso
  if (isPublicRoute(pathname)) return true

  // Si no hay usuario, denegar acceso (excepto rutas públicas)
  if (!user) return false

  // Obtener permisos requeridos para la ruta
  const routePermissions = getRoutePermissions(pathname)

  // Si no hay reglas específicas, permitir acceso para usuarios autenticados
  if (!routePermissions) return true

  // Verificar permisos requeridos
  if (routePermissions.requiredPermissions.length > 0) {
    const hasPermissions = routePermissions.requiredPermissions.every(
      permission => user.permissions?.[permission] === true
    )

    if (!hasPermissions) return false
  }

  // Verificar roles requeridos
  if (routePermissions.requiredRoles && routePermissions.requiredRoles.length > 0) {
    if (!user.role || !routePermissions.requiredRoles.includes(user.role)) {
      return false
    }
  }

  return true
}

// Función para obtener mensaje de error personalizado
export function getAccessDeniedMessage(pathname: string, user: ExtendedUser | null): string {
  if (!user) {
    return 'Debes iniciar sesión para acceder a esta página'
  }

  const routePermissions = getRoutePermissions(pathname)

  if (!routePermissions) {
    return 'No tienes permisos para acceder a esta página'
  }

  if (routePermissions.requiredRoles && routePermissions.requiredRoles.length > 0) {
    return `Esta página requiere uno de los siguientes roles: ${routePermissions.requiredRoles.join(', ')}`
  }

  if (routePermissions.requiredPermissions.length > 0) {
    const missingPermissions = routePermissions.requiredPermissions.filter(
      permission => !user.permissions?.[permission]
    )

    if (missingPermissions.length > 0) {
      return `Te faltan los siguientes permisos: ${missingPermissions.join(', ')}`
    }
  }

  return 'No tienes los permisos necesarios para acceder a esta página'
}