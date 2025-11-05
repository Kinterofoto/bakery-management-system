import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'

// Ejemplo de API route protegida que requiere permisos específicos
export const GET = withAuth(
  async (request: NextRequest, user) => {
    // Esta función solo se ejecutará si el usuario está autenticado
    // y tiene los permisos requeridos
    
    return Response.json({
      message: 'Acceso autorizado a endpoint protegido',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions
      },
      timestamp: new Date().toISOString()
    })
  },
  {
    // Requiere que el usuario tenga permiso de 'users'
    requiredPermissions: ['users'],
    // Y que tenga rol de admin
    requiredRoles: ['admin']
  }
)

// Ejemplo de POST que requiere solo autenticación básica
export const POST = withAuth(
  async (request: NextRequest, user) => {
    try {
      const body = await request.json()
      
      // Procesar la petición...
      
      return Response.json({
        success: true,
        message: 'Operación completada exitosamente',
        processedBy: user.name || user.email,
        data: body
      })
    } catch (error) {
      return Response.json(
        { error: 'Error procesando la petición' },
        { status: 400 }
      )
    }
  }
  // No se especifican permisos/roles adicionales, solo requiere autenticación
)