# Sistema Integral de Permisos y Autorización

## Descripción General

Este sistema implementa un control de acceso robusto que funciona tanto en el lado del cliente como del servidor, eliminando la posibilidad de que los usuarios eludan las restricciones accediendo directamente a URLs.

## Componentes Principales

### 1. **Matriz de Permisos** (`lib/permissions.ts`)
- Define permisos requeridos para cada ruta del sistema
- Incluye validación por roles y permisos granulares  
- Soporte para rutas exactas y por prefijo
- Mensajes de error personalizados

### 2. **Helpers de Autenticación Server-Side** (`lib/auth-helpers.ts`)
- `getServerUser()`: Obtiene usuario autenticado en servidor
- `checkRoutePermissions()`: Valida acceso a rutas
- `withAuth()`: HOC para proteger API routes
- Sistema de logging de accesos denegados

### 3. **Middleware Inteligente** (`middleware.ts`)
- Intercepta todas las requests antes de llegar a las páginas
- Valida permisos en tiempo real
- Redirecciona automáticamente según el caso:
  - `/login` para usuarios no autenticados
  - `/403` para usuarios sin permisos

### 4. **Página de Error 403** (`app/403/page.tsx`)
- Interfaz amigable para accesos denegados
- Muestra información específica del error
- Opciones de navegación contextual

### 5. **RouteGuard Mejorado** (`components/auth/RouteGuard.tsx`)
- Protección adicional del lado del cliente
- Integrado con el sistema central de permisos
- Compatibilidad con implementación legacy

## Configuración de Permisos

### Estructura de Permisos de Usuario
```typescript
permissions: {
  crm: boolean
  users: boolean  
  orders: boolean
  inventory: boolean
  routes: boolean
  clients: boolean
  returns: boolean
  production: boolean
}
```

### Roles del Sistema
- `admin`: Acceso completo
- `reviewer_area1`: Revisor primera etapa
- `reviewer_area2`: Revisor segunda etapa  
- `dispatcher`: Gestor de despachos
- `driver`: Conductor/repartidor
- `commercial`: Comercial/ventas

## Configuración por Módulos

| Módulo | Ruta | Permiso Requerido | Roles Especiales |
|--------|------|-------------------|------------------|
| Pedidos | `/orders` | `orders` | - |
| CRM | `/crm` | `crm` | - |
| Inventarios | `/inventory` | `inventory` | - |
| Rutas | `/routes` | `routes` | admin, dispatcher, driver |
| Clientes | `/clients` | `clients` | - |
| Devoluciones | `/returns` | `returns` | admin, dispatcher, driver |
| Producción | `/produccion` | `production` | - |
| Administración | `/admin` | `users` | admin únicamente |

## Uso en API Routes

### Proteger un endpoint
```typescript
import { withAuth } from '@/lib/auth-helpers'

export const GET = withAuth(
  async (request: NextRequest, user) => {
    // Lógica del endpoint - usuario ya validado
    return Response.json({ data: 'success' })
  },
  {
    requiredPermissions: ['orders'],
    requiredRoles: ['admin', 'dispatcher']
  }
)
```

### Sin permisos especiales (solo autenticación)
```typescript
export const POST = withAuth(
  async (request: NextRequest, user) => {
    // Solo requiere usuario autenticado
    return Response.json({ user: user.email })
  }
)
```

## Auditoría y Logs

### Tabla de Logs (`access_logs`)
El sistema registra automáticamente:
- Intentos de acceso denegado
- Usuario que intentó acceder
- Ruta solicitada
- Razón del rechazo
- IP y User Agent
- Timestamp del intento

### Consultar Logs (Solo Admins)
```sql
SELECT 
  user_email,
  attempted_path,
  access_denied_reason,
  attempted_at
FROM public.access_logs 
ORDER BY attempted_at DESC
LIMIT 50;
```

### Mantenimiento de Logs
```sql
-- Limpiar logs antiguos (>90 días)
SELECT cleanup_old_access_logs();
```

## Flujo de Validación

1. **Request llega al servidor**
2. **Middleware intercepta** → Valida permisos server-side
3. **Si no autorizado** → Redirecciona según caso:
   - Sin usuario → `/login?redirectTo=original_url`
   - Sin permisos → `/403?message=error_message`
4. **Si autorizado** → Request continúa
5. **RouteGuard (cliente)** → Validación adicional + UX
6. **Componente final** → Se renderiza la página

## Ventajas del Sistema

✅ **Seguridad Real**: Validación server-side imposible de eludir
✅ **Experiencia Unificada**: Mensajes de error consistentes  
✅ **Auditoría Completa**: Log de todos los intentos de acceso
✅ **Mantenimiento Fácil**: Configuración centralizada
✅ **Escalable**: Fácil agregar nuevos módulos/permisos
✅ **Backward Compatible**: Funciona con código existente

## Instalación y Setup

1. **Ejecutar script de base de datos**:
   ```bash
   # En Supabase SQL Editor
   # Ejecutar: scripts/26-create-access-logs-table.sql
   ```

2. **La implementación ya está activa** - No se requiere configuración adicional

3. **Verificar funcionamiento**:
   - Intentar acceder a `/admin` sin ser admin
   - Debería redireccionar a `/403`

## Mantenimiento

### Agregar Nueva Ruta Protegida
En `lib/permissions.ts`:
```typescript
{
  path: '/nueva-ruta',
  requiredPermissions: ['nuevo_permiso'],
  requiredRoles: ['admin'] // opcional
}
```

### Agregar Nuevo Permiso
1. Actualizar tipo en `lib/database.types.ts`
2. Actualizar `AuthContext.tsx` 
3. Agregar a `ROUTE_PERMISSIONS`
4. Migrar datos existentes si necesario

¡El sistema está listo para usar y protege completamente tu aplicación!